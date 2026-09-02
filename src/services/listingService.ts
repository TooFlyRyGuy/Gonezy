import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CreateListingFormValues, ListingWithDetails, PricingWindowInput } from '../types/marketplace';
import { calculateDistanceMiles, fuzzLocation } from '../utils/geo';
import { storageService } from './storageService';

export interface ListingFilterParams {
  categoryId?: string;
  searchTerm?: string;
  maxPrice?: number;
  userLat?: number;
  userLng?: number;
  radiusMiles?: number;
  status?: string;
  sellerId?: string;
}

export const listingService = {
  /**
   * Fetch active listings with joined relations
   */
  async getListings(filters: ListingFilterParams = {}): Promise<ListingWithDetails[]> {
    if (!isSupabaseConfigured) {
      return getDemoListings(filters);
    }

    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          category:categories(*),
          images:listing_images(*),
          price_windows:listing_price_windows(*),
          seller:profiles(id, display_name, avatar_url, business_name, business_type, is_verified)
        `);

      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.in('status', ['active', 'claimed']);
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      if (filters.searchTerm && filters.searchTerm.trim()) {
        query = query.ilike('title', `%${filters.searchTerm.trim()}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.warn('Listing fetch query error, falling back to demo set:', error.message);
        return getDemoListings(filters);
      }

      let results: ListingWithDetails[] = (data || []).map((item: any) => {
        let distance: number | null = null;
        if (filters.userLat && filters.userLng && item.approximate_public_latitude && item.approximate_public_longitude) {
          distance = calculateDistanceMiles(
            filters.userLat,
            filters.userLng,
            item.approximate_public_latitude,
            item.approximate_public_longitude
          );
        }

        return {
          ...item,
          images: item.images || [],
          price_windows: (item.price_windows || []).sort((a: any, b: any) => a.sequence - b.sequence),
          calculated_distance_miles: distance,
        };
      });

      // Filter by radius in client if requested
      if (filters.radiusMiles && filters.userLat && filters.userLng) {
        results = results.filter((r) => r.calculated_distance_miles === null || r.calculated_distance_miles <= (filters.radiusMiles || 25));
      }

      // Filter by max price
      if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
        results = results.filter((r) => r.current_price <= filters.maxPrice!);
      }

      return results;
    } catch (err) {
      console.error('Failed to query listings:', err);
      return getDemoListings(filters);
    }
  },

  /**
   * Fetch single listing with full details and claim state
   */
  async getListingById(id: string, currentUserId?: string): Promise<ListingWithDetails | null> {
    if (!isSupabaseConfigured) {
      const demo = getDemoListings().find((l) => l.id === id);
      return demo || null;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          category:categories(*),
          images:listing_images(*),
          price_windows:listing_price_windows(*),
          seller:profiles(id, display_name, avatar_url, business_name, business_type, is_verified, phone)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching listing by ID:', error);
        return null;
      }

      // Fetch active claim if exists
      const { data: claimData }: any = await (supabase.from('claims') as any)
        .select('*')
        .eq('listing_id', id)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      const listingData: any = data;
      const isSeller = currentUserId && listingData.seller_id === currentUserId;
      const isBuyerClaimant = currentUserId && claimData && claimData.buyer_id === currentUserId;

      // Mask exact pickup address text if the viewer is not the seller or confirmed claimant
      const showExactAddress = isSeller || isBuyerClaimant;
      const pickupAddress = showExactAddress 
        ? listingData.pickup_address_text 
        : `Approx. location near ${listingData.pickup_address_text.split(',').slice(1).join(',').trim() || 'area'}`;

      return {
        ...listingData,
        pickup_address_text: pickupAddress,
        images: listingData.images || [],
        price_windows: (listingData.price_windows || []).sort((a: any, b: any) => a.sequence - b.sequence),
        active_claim: claimData || null,
      };
    } catch (err) {
      console.error('Error fetching listing:', err);
      return null;
    }
  },

  /**
   * Create a new listing with images and escalating pricing windows
   */
  async createListing(
    sellerId: string,
    values: CreateListingFormValues
  ): Promise<string> {
    if (!isSupabaseConfigured) {
      // Return simulated generated ID for preview
      return 'demo-' + Date.now();
    }

    // 1. Calculate approximate fuzzed location for public discovery
    const approximateLocation = fuzzLocation(values.pickup_latitude, values.pickup_longitude);

    // 2. Calculate deadlines based on pricing windows
    const startTime = new Date(values.available_from || new Date());
    let totalDurationMinutes = 0;
    values.pricing_windows.forEach((w) => {
      totalDurationMinutes += w.durationMinutes;
    });

    const deadlineTime = new Date(startTime.getTime() + totalDurationMinutes * 60 * 1000);
    const initialPrice = values.pricing_windows[0]?.price ?? 0;
    const finalPrice = values.pricing_windows[values.pricing_windows.length - 1]?.price ?? initialPrice;

    // 3. Insert primary listing record
    const { data: listingData, error: listingError } = await (supabase.from('listings') as any)
      .insert({
        seller_id: sellerId,
        title: values.title,
        description: values.description,
        category_id: values.category_id || null,
        condition: values.condition,
        estimated_value: values.estimated_value || 0,
        status: 'active',
        pickup_address_text: values.pickup_address_text,
        pickup_latitude: values.pickup_latitude,
        pickup_longitude: values.pickup_longitude,
        approximate_public_latitude: approximateLocation.lat,
        approximate_public_longitude: approximateLocation.lng,
        available_from: startTime.toISOString(),
        pickup_deadline: deadlineTime.toISOString(),
        current_price: initialPrice,
        original_price: finalPrice,
        is_free: initialPrice === 0,
        claim_status: 'unclaimed',
      })
      .select('id')
      .single();

    if (listingError || !listingData) {
      console.error('Failed to create listing:', listingError);
      throw listingError;
    }

    const listingId = (listingData as any).id;

    // 4. Upload and record images
    if (values.images && values.images.length > 0) {
      for (let i = 0; i < values.images.length; i++) {
        const file = values.images[i];
        try {
          const publicUrl = await storageService.uploadListingImage(file, listingId);
          await (supabase.from('listing_images') as any).insert({
            listing_id: listingId,
            storage_path: publicUrl,
            sort_order: i,
          });
        } catch (imgErr) {
          console.warn('Image upload failed, skipping single image:', imgErr);
        }
      }
    }

    // 5. Insert price windows
    let currentWindowStart = startTime.getTime();
    const priceWindowsPayload = values.pricing_windows.map((w, index) => {
      const windowEnd = currentWindowStart + w.durationMinutes * 60 * 1000;
      const windowRecord = {
        listing_id: listingId,
        starts_at: new Date(currentWindowStart).toISOString(),
        ends_at: new Date(windowEnd).toISOString(),
        price: w.price,
        sequence: index + 1,
      };
      currentWindowStart = windowEnd;
      return windowRecord;
    });

    if (priceWindowsPayload.length > 0) {
      const { error: windowError } = await (supabase.from('listing_price_windows') as any)
        .insert(priceWindowsPayload);

      if (windowError) {
        console.error('Failed to insert price windows:', windowError);
      }
    }

    return listingId;
  },

  /**
   * Update listing status (e.g. cancelled, draft, expired)
   */
  async updateStatus(listingId: string, status: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await (supabase.from('listings') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', listingId);

    if (error) throw error;
  },
};

/**
 * Built-in initial sample data for high-fidelity interactive preview
 */
function getDemoListings(filters: ListingFilterParams = {}): ListingWithDetails[] {
  const now = Date.now();
  const demoData: ListingWithDetails[] = [
    {
      id: 'demo-1',
      seller_id: 'seller-demo-1',
      title: 'Solid Oak Executive Desk & Matching Credenza',
      description: 'Clearing out an entire office suite today. Heavy solid oak desk in excellent condition with brass hardware. Must be removed by 4:00 PM today before our crew locks up.',
      category_id: '11',
      condition: 'good',
      estimated_value: 850,
      status: 'active',
      pickup_address_text: '450 Commercial Ave, Suite 300, Downtown Metro',
      pickup_latitude: 37.7749,
      pickup_longitude: -122.4194,
      approximate_public_latitude: 37.7780,
      approximate_public_longitude: -122.4150,
      available_from: new Date(now - 10 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      current_price: 0,
      original_price: 250,
      is_free: true,
      claim_status: 'unclaimed',
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
      calculated_distance_miles: 1.4,
      images: [
        { id: 'img-1', listing_id: 'demo-1', storage_path: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80', sort_order: 0, created_at: new Date().toISOString() },
        { id: 'img-2', listing_id: 'demo-1', storage_path: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80', sort_order: 1, created_at: new Date().toISOString() }
      ],
      price_windows: [
        { id: 'pw-1', listing_id: 'demo-1', starts_at: new Date(now - 10 * 60 * 1000).toISOString(), ends_at: new Date(now + 20 * 60 * 1000).toISOString(), price: 0, sequence: 1, created_at: new Date().toISOString() },
        { id: 'pw-2', listing_id: 'demo-1', starts_at: new Date(now + 20 * 60 * 1000).toISOString(), ends_at: new Date(now + 110 * 60 * 1000).toISOString(), price: 40, sequence: 2, created_at: new Date().toISOString() },
        { id: 'pw-3', listing_id: 'demo-1', starts_at: new Date(now + 110 * 60 * 1000).toISOString(), ends_at: new Date(now + 230 * 60 * 1000).toISOString(), price: 120, sequence: 3, created_at: new Date().toISOString() },
        { id: 'pw-4', listing_id: 'demo-1', starts_at: new Date(now + 230 * 60 * 1000).toISOString(), ends_at: new Date(now + 240 * 60 * 1000).toISOString(), price: 250, sequence: 4, created_at: new Date().toISOString() }
      ],
      seller: {
        id: 'seller-demo-1',
        display_name: 'Apex Commercial Movers',
        business_name: 'Apex Commercial Relocation & Cleanouts',
        business_type: 'mover',
        is_verified: true,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
      }
    },
    {
      id: 'demo-2',
      seller_id: 'seller-demo-2',
      title: 'Commercial Stainless Steel 2-Door Reach-In Refrigerator',
      description: 'Working True 2-door stainless cooler from restaurant renovation. Cools fast down to 36°F. On rolling casters. Bring a trailer or liftgate truck.',
      category_id: '10',
      condition: 'good',
      estimated_value: 1400,
      status: 'active',
      pickup_address_text: '820 Market St, Old Bistro, City Center',
      pickup_latitude: 37.7833,
      pickup_longitude: -122.4167,
      approximate_public_latitude: 37.7850,
      approximate_public_longitude: -122.4120,
      available_from: new Date(now - 45 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      current_price: 50,
      original_price: 350,
      is_free: false,
      claim_status: 'unclaimed',
      created_at: new Date(now - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 45 * 60 * 1000).toISOString(),
      calculated_distance_miles: 2.8,
      images: [
        { id: 'img-3', listing_id: 'demo-2', storage_path: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=1000&q=80', sort_order: 0, created_at: new Date().toISOString() }
      ],
      price_windows: [
        { id: 'pw-5', listing_id: 'demo-2', starts_at: new Date(now - 45 * 60 * 1000).toISOString(), ends_at: new Date(now - 15 * 60 * 1000).toISOString(), price: 0, sequence: 1, created_at: new Date().toISOString() },
        { id: 'pw-6', listing_id: 'demo-2', starts_at: new Date(now - 15 * 60 * 1000).toISOString(), ends_at: new Date(now + 75 * 60 * 1000).toISOString(), price: 50, sequence: 2, created_at: new Date().toISOString() },
        { id: 'pw-7', listing_id: 'demo-2', starts_at: new Date(now + 75 * 60 * 1000).toISOString(), ends_at: new Date(now + 180 * 60 * 1000).toISOString(), price: 175, sequence: 3, created_at: new Date().toISOString() }
      ],
      seller: {
        id: 'seller-demo-2',
        display_name: 'Metro Cleanout Pros',
        business_name: 'Metro Cleanout & Demolition LLC',
        business_type: 'estate_cleanout',
        is_verified: true,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'
      }
    },
    {
      id: 'demo-3',
      seller_id: 'seller-demo-3',
      title: 'Dewalt 12" Sliding Compound Miter Saw + Heavy Stand',
      description: 'Jobsite cleanout leftover. Dual bevel 12-inch miter saw with laser guide and foldable rolling stand. Tested and spins smoothly.',
      category_id: '4',
      condition: 'good',
      estimated_value: 450,
      status: 'active',
      pickup_address_text: '1420 Builder Way, Contractor Storage Bay B',
      pickup_latitude: 37.7600,
      pickup_longitude: -122.4300,
      approximate_public_latitude: 37.7620,
      approximate_public_longitude: -122.4280,
      available_from: new Date(now - 5 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      current_price: 0,
      original_price: 150,
      is_free: true,
      claim_status: 'unclaimed',
      created_at: new Date(now - 5 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 5 * 60 * 1000).toISOString(),
      calculated_distance_miles: 0.9,
      images: [
        { id: 'img-4', listing_id: 'demo-3', storage_path: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1000&q=80', sort_order: 0, created_at: new Date().toISOString() }
      ],
      price_windows: [
        { id: 'pw-8', listing_id: 'demo-3', starts_at: new Date(now - 5 * 60 * 1000).toISOString(), ends_at: new Date(now + 25 * 60 * 1000).toISOString(), price: 0, sequence: 1, created_at: new Date().toISOString() },
        { id: 'pw-9', listing_id: 'demo-3', starts_at: new Date(now + 25 * 60 * 1000).toISOString(), ends_at: new Date(now + 85 * 60 * 1000).toISOString(), price: 60, sequence: 2, created_at: new Date().toISOString() },
        { id: 'pw-10', listing_id: 'demo-3', starts_at: new Date(now + 85 * 60 * 1000).toISOString(), ends_at: new Date(now + 120 * 60 * 1000).toISOString(), price: 150, sequence: 3, created_at: new Date().toISOString() }
      ],
      seller: {
        id: 'seller-demo-3',
        display_name: 'Rapid Junk Rescue',
        business_name: 'Rapid Junk Rescue Haulers',
        business_type: 'junk_hauler',
        is_verified: true,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
      }
    },
    {
      id: 'demo-4',
      seller_id: 'seller-demo-1',
      title: 'Teak 7-Piece Outdoor Patio Dining Set with Cushions',
      description: 'Estate cleanout item. Solid weathered teak table with 6 armchairs and all-weather navy cushions. Sturdy, will clean up like new with teak oil.',
      category_id: '6',
      condition: 'good',
      estimated_value: 1100,
      status: 'active',
      pickup_address_text: '310 Hillside Terrace, Residential Driveway',
      pickup_latitude: 37.7500,
      pickup_longitude: -122.4400,
      approximate_public_latitude: 37.7530,
      approximate_public_longitude: -122.4380,
      available_from: new Date(now - 20 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 5 * 60 * 60 * 1000).toISOString(),
      current_price: 0,
      original_price: 200,
      is_free: true,
      claim_status: 'unclaimed',
      created_at: new Date(now - 20 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 20 * 60 * 1000).toISOString(),
      calculated_distance_miles: 3.5,
      images: [
        { id: 'img-5', listing_id: 'demo-4', storage_path: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', sort_order: 0, created_at: new Date().toISOString() }
      ],
      price_windows: [
        { id: 'pw-11', listing_id: 'demo-4', starts_at: new Date(now - 20 * 60 * 1000).toISOString(), ends_at: new Date(now + 10 * 60 * 1000).toISOString(), price: 0, sequence: 1, created_at: new Date().toISOString() },
        { id: 'pw-12', listing_id: 'demo-4', starts_at: new Date(now + 10 * 60 * 1000).toISOString(), ends_at: new Date(now + 130 * 60 * 1000).toISOString(), price: 50, sequence: 2, created_at: new Date().toISOString() },
        { id: 'pw-13', listing_id: 'demo-4', starts_at: new Date(now + 130 * 60 * 1000).toISOString(), ends_at: new Date(now + 300 * 60 * 1000).toISOString(), price: 180, sequence: 3, created_at: new Date().toISOString() }
      ],
      seller: {
        id: 'seller-demo-1',
        display_name: 'Apex Commercial Movers',
        business_name: 'Apex Commercial Relocation & Cleanouts',
        business_type: 'mover',
        is_verified: true,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
      }
    }
  ];

  let filtered = [...demoData];
  if (filters.categoryId) {
    filtered = filtered.filter((d) => d.category_id === filters.categoryId);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter((d) => d.title.toLowerCase().includes(term) || d.description?.toLowerCase().includes(term));
  }
  if (filters.sellerId) {
    filtered = filtered.filter((d) => d.seller_id === filters.sellerId);
  }
  return filtered;
}
