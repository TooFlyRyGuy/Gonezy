import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';
import { Claim, ListingWithDetails } from '../types/marketplace';
import { listingService } from './listingService';

export interface ClaimResult {
  success: boolean;
  error?: string;
  claimId?: string;
  priceAtClaim?: number;
  pickupExpiresAt?: string;
}

export interface ClaimWithListing extends Claim {
  listing?: ListingWithDetails;
  buyer?: {
    id: string;
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

const LOCAL_CLAIMS_KEY = 'gonezy_local_claims';

function getLocalClaims(): ClaimWithListing[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLAIMS_KEY) || localStorage.getItem('nabgo_local_claims');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveLocalClaim(claim: ClaimWithListing): void {
  try {
    const existing = getLocalClaims();
    localStorage.setItem(LOCAL_CLAIMS_KEY, JSON.stringify([claim, ...existing.filter((c) => c.id !== claim.id)]));
  } catch (e) {}
}

function updateLocalClaimStatus(claimId: string, status: string): void {
  try {
    const existing = getLocalClaims();
    const updated = existing.map((c) => (c.id === claimId ? { ...c, status: status as any } : c));
    localStorage.setItem(LOCAL_CLAIMS_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export const claimService = {
  /**
   * Atomic claim creation
   */
  async claimListing(listingId: string, buyerId: string): Promise<ClaimResult> {
    if (!isSupabaseLive()) {
      // Demo simulated claim
      const listing = await listingService.getListingById(listingId);
      if (!listing) return { success: false, error: 'Listing not found' };
      if (listing.seller_id === buyerId) return { success: false, error: 'You cannot claim your own listing' };
      
      const now = new Date();
      const pickupExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const claimId = 'claim-demo-' + Date.now();

      const newClaim: ClaimWithListing = {
        id: claimId,
        listing_id: listingId,
        buyer_id: buyerId,
        price_at_claim: listing.current_price,
        status: 'active',
        claimed_at: now.toISOString(),
        pickup_expires_at: pickupExpiresAt,
        completed_at: null,
        cancellation_reason: null,
        cancelled_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        listing: listing,
        buyer: {
          id: buyerId,
          display_name: 'Alex Rivera',
          phone: '(415) 890-1234',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        },
      };

      saveLocalClaim(newClaim);

      return {
        success: true,
        claimId,
        priceAtClaim: listing.current_price,
        pickupExpiresAt,
      };
    }

    try {
      // Try calling atomic RPC function in PostgreSQL
      const { data, error } = await (supabase.rpc as any)('claim_listing', {
        p_listing_id: listingId,
        p_buyer_id: buyerId,
      });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          return this.claimListing(listingId, buyerId);
        }
        // If RPC function not loaded yet, execute client transaction fallback
        console.warn('RPC claim_listing failed, executing fallback insert:', error.message);
        return await fallbackClaim(listingId, buyerId);
      }

      if (data && !data.success) {
        return { success: false, error: data.error || 'Failed to claim item' };
      }

      return {
        success: true,
        claimId: data.claim_id,
        priceAtClaim: data.price_at_claim,
        pickupExpiresAt: data.pickup_expires_at,
      };
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
        return this.claimListing(listingId, buyerId);
      }
      console.warn('Claim notice:', err.message || err);
      return { success: false, error: err.message || 'Error processing claim' };
    }
  },

  /**
   * Fetch buyer's claims
   */
  async getBuyerClaims(buyerId: string): Promise<ClaimWithListing[]> {
    if (!isSupabaseLive()) {
      const local = getLocalClaims().filter((c) => c.buyer_id === buyerId);
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          listing:listings(
            *,
            category:categories(*),
            images:listing_images(*),
            seller:profiles(id, display_name, phone, avatar_url, business_name)
          )
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          return getLocalClaims().filter((c) => c.buyer_id === buyerId);
        }
        console.warn('Notice fetching buyer claims:', error.message);
        return getLocalClaims().filter((c) => c.buyer_id === buyerId);
      }

      return (data || []).map((c: any) => ({
        ...c,
        listing: {
          ...c.listing,
          images: c.listing?.images || [],
        },
      }));
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return getLocalClaims().filter((c) => c.buyer_id === buyerId);
    }
  },

  /**
   * Fetch seller's received claims
   */
  async getSellerReceivedClaims(sellerId: string): Promise<ClaimWithListing[]> {
    if (!isSupabaseLive()) {
      const local = getLocalClaims().filter((c) => c.listing?.seller_id === sellerId);
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          buyer:profiles(id, display_name, phone, avatar_url),
          listing:listings!inner(
            *,
            category:categories(*),
            images:listing_images(*)
          )
        `)
        .eq('listing.seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          return getLocalClaims().filter((c) => c.listing?.seller_id === sellerId);
        }
        return getLocalClaims().filter((c) => c.listing?.seller_id === sellerId);
      }

      return (data || []).map((c: any) => ({
        ...c,
        listing: {
          ...c.listing,
          images: c.listing?.images || [],
        },
      }));
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return getLocalClaims().filter((c) => c.listing?.seller_id === sellerId);
    }
  },

  /**
   * Complete pickup
   */
  async completePickup(claimId: string, userId: string): Promise<boolean> {
    if (!isSupabaseLive()) {
      updateLocalClaimStatus(claimId, 'completed');
      return true;
    }

    try {
      const { data, error } = await (supabase.rpc as any)('complete_pickup', {
        p_claim_id: claimId,
        p_user_id: userId,
      });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          updateLocalClaimStatus(claimId, 'completed');
          return true;
        }
        // Fallback update
        await (supabase.from('claims') as any)
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', claimId);
        return true;
      }

      return Boolean(data?.success);
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
        updateLocalClaimStatus(claimId, 'completed');
        return true;
      }
      return false;
    }
  },

  /**
   * Cancel claim
   */
  async cancelClaim(claimId: string, listingId: string, reason?: string): Promise<boolean> {
    if (!isSupabaseLive()) {
      updateLocalClaimStatus(claimId, 'cancelled');
      return true;
    }

    try {
      await (supabase.from('claims') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancelled by user',
        })
        .eq('id', claimId);

      await (supabase.from('listings') as any)
        .update({
          status: 'active',
          claim_status: 'unclaimed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      return true;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
        updateLocalClaimStatus(claimId, 'cancelled');
        return true;
      }
      return false;
    }
  },
};

/**
 * Fallback claim function when RPC migration has not yet executed
 */
async function fallbackClaim(listingId: string, buyerId: string): Promise<ClaimResult> {
  const { data: listing, error: listErr } = await (supabase.from('listings') as any)
    .select('*')
    .eq('id', listingId)
    .single();

  if (listErr || !listing) return { success: false, error: 'Listing not found' };
  if (listing.seller_id === buyerId) return { success: false, error: 'Cannot claim your own listing' };
  if (listing.status !== 'active') return { success: false, error: 'Listing is no longer active' };

  const now = new Date();
  const pickupExpiresAt = new Date(
    Math.min(now.getTime() + 2 * 60 * 60 * 1000, new Date(listing.pickup_deadline).getTime())
  ).toISOString();

  const { data: claimData, error: claimErr } = await (supabase.from('claims') as any)
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      price_at_claim: listing.current_price,
      status: 'active',
      claimed_at: now.toISOString(),
      pickup_expires_at: pickupExpiresAt,
    })
    .select('id')
    .single();

  if (claimErr) {
    if (claimErr.code === '23505') {
      return { success: false, error: 'This item was just claimed by someone else!' };
    }
    return { success: false, error: claimErr.message };
  }

  await (supabase.from('listings') as any)
    .update({ status: 'claimed', claim_status: 'claimed', updated_at: now.toISOString() })
    .eq('id', listingId);

  return {
    success: true,
    claimId: claimData?.id || '',
    priceAtClaim: listing.current_price,
    pickupExpiresAt,
  };
}

