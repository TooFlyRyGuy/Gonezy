import { isPreviewMode, isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
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

function requireLive(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Sign in with a configured Gonezy backend to manage claims.');
  }
}

export const claimService = {
  async claimListing(
    listingId: string,
    buyerId: string,
    buyerCoords?: { lat: number; lng: number } | null
  ): Promise<ClaimResult> {
    if (isPreviewMode()) {
      return { success: false, error: 'Preview mode — sign in on a live backend to claim items.' };
    }

    const baseArgs = {
      p_listing_id: listingId,
      p_buyer_id: buyerId,
    };
    const withCoords =
      buyerCoords != null
        ? { ...baseArgs, p_buyer_lat: buyerCoords.lat, p_buyer_lng: buyerCoords.lng }
        : baseArgs;

    let { data, error } = await supabase.rpc('claim_listing', withCoords);

    // Old claim_listing(p_listing_id, p_buyer_id) still works if the travel-window
    // migration has not been applied yet — retry without coords.
    if (
      error &&
      buyerCoords != null &&
      /could not find the function|schema cache|does not exist/i.test(error.message || '')
    ) {
      ({ data, error } = await supabase.rpc('claim_listing', baseArgs));
    }

    if (error) {
      return { success: false, error: error.message || 'Could not claim this item' };
    }

    const payload = data as any;
    if (payload && payload.success === false) {
      return { success: false, error: payload.error || 'Could not claim this item' };
    }

    return {
      success: true,
      claimId: payload?.claim_id,
      priceAtClaim: payload?.price_at_claim,
      pickupExpiresAt: payload?.pickup_expires_at,
    };
  },

  async getBuyerClaims(buyerId: string): Promise<ClaimWithListing[]> {
    requireLive();

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      throwLiveError(error, 'Could not load your claims');
    }

    return hydrateClaims(data || []);
  },

  async getSellerReceivedClaims(sellerId: string): Promise<ClaimWithListing[]> {
    requireLive();

    const { data, error } = await supabase
      .from('claims')
      .select('*, buyer:profiles(id, display_name, phone, avatar_url)')
      .order('created_at', { ascending: false });

    if (error) {
      throwLiveError(error, 'Could not load received claims');
    }

    const hydrated = await hydrateClaims(data || []);
    return hydrated.filter((c) => c.listing?.seller_id === sellerId);
  },

  async completePickup(claimId: string, userId: string): Promise<void> {
    requireLive();

    const { data, error } = await supabase.rpc('complete_pickup', {
      p_claim_id: claimId,
      p_user_id: userId,
    });

    if (error) {
      throwLiveError(error, 'Could not mark pickup complete');
    }

    const payload = data as any;
    if (payload && payload.success === false) {
      throw new Error(payload.error || 'Could not mark pickup complete');
    }
  },

  async cancelClaim(claimId: string, _listingId: string, reason?: string): Promise<void> {
    requireLive();

    const { data, error } = await supabase.rpc('cancel_claim', {
      p_claim_id: claimId,
      p_reason: reason || 'Cancelled by user',
    });

    if (error) {
      throwLiveError(error, 'Could not cancel claim');
    }

    const payload = data as any;
    if (payload && payload.success === false) {
      throw new Error(payload.error || 'Could not cancel claim');
    }
  },
};

async function hydrateClaims(rows: any[]): Promise<ClaimWithListing[]> {
  if (!rows.length) return [];

  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))];
  const listings = await Promise.all(
    listingIds.map(async (id) => {
      try {
        return await listingService.getListingById(id);
      } catch {
        return null;
      }
    })
  );

  const listingById = new Map(listings.filter(Boolean).map((l) => [l!.id, l!]));

  return rows.map((c) => ({
    ...c,
    listing: listingById.get(c.listing_id) || c.listing,
    buyer: c.buyer,
  }));
}
