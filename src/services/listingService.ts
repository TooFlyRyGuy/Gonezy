import { isPreviewMode, isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
import { CreateListingFormValues, ListingWithDetails } from '../types/marketplace';
import { calculateDistanceMiles, fuzzLocation } from '../utils/geo';
import { calculatePricingState } from '../utils/pricing';
import { getAuthoritativeNow, syncServerTime } from '../utils/serverTime';
import { storageService } from './storageService';

export interface CreateListingProgress {
  label: string;
  currentStep: number;
  totalSteps: number;
}

export interface ListingFilterParams {
  categoryId?: string;
  searchTerm?: string;
  maxPrice?: number;
  userLat?: number;
  userLng?: number;
  radiusMiles?: number;
  status?: ListingWithDetails['status'];
  sellerId?: string;
}

const SELLER_PUBLIC_FIELDS = 'id, display_name, avatar_url, business_name, business_type, is_verified';

async function runScheduledExpiry(): Promise<void> {
  await Promise.allSettled([
    supabase.rpc('expire_overdue_listings'),
    supabase.rpc('expire_overdue_claims'),
  ]);
}

function withDistance(
  item: ListingWithDetails,
  userLat?: number,
  userLng?: number
): ListingWithDetails {
  let distance: number | null = null;
  if (
    userLat != null &&
    userLng != null &&
    item.approximate_public_latitude != null &&
    item.approximate_public_longitude != null
  ) {
    distance = calculateDistanceMiles(
      userLat,
      userLng,
      item.approximate_public_latitude,
      item.approximate_public_longitude
    );
  }
  return { ...item, calculated_distance_miles: distance };
}

function applyLivePrice(item: ListingWithDetails): ListingWithDetails {
  const state = calculatePricingState(item as any, item.price_windows || [], getAuthoritativeNow());
  return {
    ...item,
    current_price: state.currentPrice,
    is_free: state.isFree,
  };
}

async function hydratePublicListings(rows: any[]): Promise<ListingWithDetails[]> {
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const sellerIds = [...new Set(rows.map((r) => r.seller_id).filter(Boolean))];
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))];

  const [imagesRes, windowsRes, sellersRes, catsRes] = await Promise.all([
    supabase.from('listing_images').select('*').in('listing_id', ids),
    supabase.from('listing_price_windows').select('*').in('listing_id', ids),
    sellerIds.length
      ? supabase.from('profiles').select(SELLER_PUBLIC_FIELDS).in('id', sellerIds)
      : Promise.resolve({ data: [], error: null } as any),
    categoryIds.length
      ? supabase.from('categories').select('*').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (imagesRes.error) throwLiveError(imagesRes.error, 'Could not load listing photos');
  if (windowsRes.error) throwLiveError(windowsRes.error, 'Could not load price schedules');
  if (sellersRes.error) throwLiveError(sellersRes.error, 'Could not load sellers');
  if (catsRes.error) throwLiveError(catsRes.error, 'Could not load categories');

  const imagesByListing = new Map<string, any[]>();
  for (const img of imagesRes.data || []) {
    const list = imagesByListing.get(img.listing_id) || [];
    list.push(img);
    imagesByListing.set(img.listing_id, list);
  }

  const windowsByListing = new Map<string, any[]>();
  for (const win of windowsRes.data || []) {
    const list = windowsByListing.get(win.listing_id) || [];
    list.push(win);
    windowsByListing.set(win.listing_id, list);
  }

  const sellersById = new Map((sellersRes.data || []).map((s: any) => [s.id, s]));
  const catsById = new Map((catsRes.data || []).map((c: any) => [c.id, c]));

  return rows.map((item) =>
    applyLivePrice({
      ...item,
      pickup_address_text: item.pickup_address_text ?? null,
      pickup_latitude: item.pickup_latitude ?? null,
      pickup_longitude: item.pickup_longitude ?? null,
      images: (imagesByListing.get(item.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      price_windows: (windowsByListing.get(item.id) || []).sort((a, b) => a.sequence - b.sequence),
      seller: sellersById.get(item.seller_id) || null,
      category: item.category_id ? catsById.get(item.category_id) || null : null,
    })
  );
}

export const listingService = {
  async getListings(filters: ListingFilterParams = {}): Promise<ListingWithDetails[]> {
    if (isPreviewMode()) {
      return getPreviewListings(filters);
    }

    await Promise.all([syncServerTime(), runScheduledExpiry()]);

    let query = supabase.from('public_listings').select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else if (filters.sellerId) {
      query = query.in('status', ['active', 'claimed', 'picked_up', 'expired', 'cancelled']);
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
      throwLiveError(error, 'Could not load listings');
    }

    let results = await hydratePublicListings(data || []);
    results = results.map((item) => withDistance(item, filters.userLat, filters.userLng));

    if (filters.radiusMiles && filters.userLat != null && filters.userLng != null) {
      results = results.filter(
        (r) => r.calculated_distance_miles == null || r.calculated_distance_miles <= (filters.radiusMiles || 25)
      );
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      results = results.filter((r) => r.current_price <= filters.maxPrice!);
    }

    return results;
  },

  async getListingById(id: string, _currentUserId?: string): Promise<ListingWithDetails | null> {
    if (isPreviewMode()) {
      return getPreviewListings().find((l) => l.id === id) || null;
    }

    await syncServerTime();

    const { data, error } = await supabase.from('public_listings').select('*').eq('id', id).maybeSingle();

    if (error) {
      throwLiveError(error, 'Could not load this listing');
    }
    if (!data) return null;

    const [hydrated] = await hydratePublicListings([data]);

    const { data: claimData, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('listing_id', id)
      .in('status', ['pending', 'active'])
      .maybeSingle();

    if (claimError && claimError.code !== 'PGRST116') {
      // Claim rows are hidden from strangers by RLS; ignore "no rows" and permission misses
      const msg = (claimError.message || '').toLowerCase();
      if (!msg.includes('permission') && !msg.includes('row-level') && claimError.code !== '42501') {
        throwLiveError(claimError, 'Could not load claim state');
      }
    }

    return {
      ...hydrated,
      active_claim: claimData || null,
    };
  },

  async createListing(
    sellerId: string,
    values: CreateListingFormValues,
    onProgress?: (progress: CreateListingProgress) => void
  ): Promise<string> {
    if (!isSupabaseConfigured) {
      throw new Error('Sign in with a configured Gonezy backend to post an item.');
    }

    const photoCount = values.images?.length ?? 0;
    const hasPriceSchedule = values.pricing_windows.length > 0;
    const totalSteps = 1 + photoCount + (hasPriceSchedule ? 1 : 0);
    let currentStep = 0;
    const report = (label: string) => {
      currentStep += 1;
      onProgress?.({ label, currentStep, totalSteps });
    };

    report('Saving listing');

    const approximateLocation = fuzzLocation(values.pickup_latitude, values.pickup_longitude);
    const startTime = new Date(values.available_from || new Date());
    let totalDurationMinutes = 0;
    values.pricing_windows.forEach((w) => {
      totalDurationMinutes += w.durationMinutes;
    });

    const deadlineTime = new Date(startTime.getTime() + totalDurationMinutes * 60 * 1000);
    const initialPrice = values.pricing_windows[0]?.price ?? 0;
    const finalPrice = values.pricing_windows[values.pricing_windows.length - 1]?.price ?? initialPrice;

    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .insert({
        seller_id: sellerId,
        title: values.title,
        description: values.description || null,
        category_id: values.category_id || null,
        condition: values.condition || 'good',
        estimated_value: 0,
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
      })
      .select('id')
      .single();

    if (listingError || !listingData) {
      throwLiveError(listingError, 'Could not publish listing');
    }

    const listingId = listingData.id;

    if (photoCount > 0) {
      for (let i = 0; i < photoCount; i++) {
        report(`Uploading photo ${i + 1} of ${photoCount}`);
        const file = values.images[i];
        const publicUrl = await storageService.uploadListingImage(file, listingId);
        const { error: imageError } = await supabase.from('listing_images').insert({
          listing_id: listingId,
          storage_path: publicUrl,
          sort_order: i,
        });
        if (imageError) {
          throwLiveError(imageError, 'Listing was created but a photo failed to save');
        }
      }
    }

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

    if (hasPriceSchedule) {
      report('Saving price schedule');
      const { error: windowError } = await supabase.from('listing_price_windows').insert(priceWindowsPayload);
      if (windowError) {
        throwLiveError(windowError, 'Listing was created but the price schedule failed to save');
      }
    }

    // Backup if the DB trigger/pg_net call is missing. The Edge Function
    // no-ops when drop_email_sent_at is already set, so this cannot double-send.
    void supabase.functions
      .invoke('notify-new-drop', { body: { listing_id: listingId } })
      .then(({ error }) => {
        if (error) console.warn('New-drop email notify failed', error.message);
      })
      .catch((err: unknown) => {
        console.warn('New-drop email notify failed', err);
      });

    return listingId;
  },

  async updateStatus(listingId: string, status: ListingWithDetails['status']): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Backend is not configured.');
    }

    const { error } = await supabase
      .from('listings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', listingId);

    if (error) {
      throwLiveError(error, 'Could not update listing');
    }
  },
};

/**
 * Labeled preview items used only when Supabase env vars are missing.
 * Never returned after a live backend error.
 */
function getPreviewListings(filters: ListingFilterParams = {}): ListingWithDetails[] {
  const now = Date.now();
  const demoData: ListingWithDetails[] = [
    {
      id: 'preview-1',
      seller_id: 'preview-seller-1',
      title: 'Solid oak desk from an office cleanout',
      description: 'Preview listing. Must be gone today. Heavy — bring help.',
      category_id: '11',
      condition: 'good',
      estimated_value: 0,
      status: 'active',
      pickup_address_text: 'Approximate pickup area (exact address revealed upon claim)',
      pickup_latitude: null,
      pickup_longitude: null,
      approximate_public_latitude: 30.2672,
      approximate_public_longitude: -97.7431,
      available_from: new Date(now - 10 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      current_price: 0,
      original_price: 75,
      is_free: true,
      drop_email_sent_at: null,
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
      calculated_distance_miles: 1.4,
      images: [
        {
          id: 'img-1',
          listing_id: 'preview-1',
          storage_path: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80',
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ],
      price_windows: [
        {
          id: 'pw-1',
          listing_id: 'preview-1',
          starts_at: new Date(now - 10 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 20 * 60 * 1000).toISOString(),
          price: 0,
          sequence: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pw-2',
          listing_id: 'preview-1',
          starts_at: new Date(now + 20 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 140 * 60 * 1000).toISOString(),
          price: 25,
          sequence: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pw-3',
          listing_id: 'preview-1',
          starts_at: new Date(now + 140 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 240 * 60 * 1000).toISOString(),
          price: 75,
          sequence: 3,
          created_at: new Date().toISOString(),
        },
      ],
      seller: {
        id: 'preview-seller-1',
        display_name: 'Preview Hauler',
        business_name: 'Sample Cleanouts',
        business_type: 'junk_hauler',
        is_verified: false,
      },
    },
    {
      id: 'preview-2',
      seller_id: 'preview-seller-2',
      title: 'Working fridge from a restaurant remodel',
      description: 'Preview listing. Bring a truck with a liftgate.',
      category_id: '10',
      condition: 'good',
      estimated_value: 0,
      status: 'active',
      pickup_address_text: 'Approximate pickup area (exact address revealed upon claim)',
      pickup_latitude: null,
      pickup_longitude: null,
      approximate_public_latitude: 30.2849,
      approximate_public_longitude: -97.7341,
      available_from: new Date(now - 45 * 60 * 1000).toISOString(),
      pickup_deadline: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      current_price: 25,
      original_price: 75,
      is_free: false,
      drop_email_sent_at: null,
      created_at: new Date(now - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 45 * 60 * 1000).toISOString(),
      calculated_distance_miles: 2.8,
      images: [
        {
          id: 'img-3',
          listing_id: 'preview-2',
          storage_path: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=1000&q=80',
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ],
      price_windows: [
        {
          id: 'pw-5',
          listing_id: 'preview-2',
          starts_at: new Date(now - 45 * 60 * 1000).toISOString(),
          ends_at: new Date(now - 15 * 60 * 1000).toISOString(),
          price: 0,
          sequence: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pw-6',
          listing_id: 'preview-2',
          starts_at: new Date(now - 15 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 75 * 60 * 1000).toISOString(),
          price: 25,
          sequence: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pw-7',
          listing_id: 'preview-2',
          starts_at: new Date(now + 75 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 180 * 60 * 1000).toISOString(),
          price: 75,
          sequence: 3,
          created_at: new Date().toISOString(),
        },
      ],
      seller: {
        id: 'preview-seller-2',
        display_name: 'Preview Kitchen Co',
        business_name: 'Sample Kitchen Co',
        business_type: 'contractor',
        is_verified: false,
      },
    },
  ];

  let filtered = demoData.map(applyLivePrice);
  if (filters.categoryId) {
    filtered = filtered.filter((d) => d.category_id === filters.categoryId);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (d) => d.title.toLowerCase().includes(term) || d.description?.toLowerCase().includes(term)
    );
  }
  if (filters.sellerId) {
    filtered = filtered.filter((d) => d.seller_id === filters.sellerId);
  }
  return filtered.map((item) => withDistance(item, filters.userLat, filters.userLng));
}
