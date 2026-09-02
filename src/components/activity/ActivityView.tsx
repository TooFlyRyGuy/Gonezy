import React, { useEffect, useState } from 'react';
import { ClaimWithListing, claimService } from '../../services/claimService';
import { listingService } from '../../services/listingService';
import { ListingWithDetails } from '../../types/marketplace';
import { formatPrice } from '../../utils/pricing';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  ArrowRight,
  Package,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface ActivityViewProps {
  userId: string;
  onSelectListing: (listing: ListingWithDetails) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  userId,
  onSelectListing,
}) => {
  const [roleTab, setRoleTab] = useState<'buyer' | 'seller'>('buyer');
  const [buyerClaims, setBuyerClaims] = useState<ClaimWithListing[]>([]);
  const [sellerClaims, setSellerClaims] = useState<ClaimWithListing[]>([]);
  const [sellerListings, setSellerListings] = useState<ListingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bClaims, sClaims, sListings] = await Promise.all([
        claimService.getBuyerClaims(userId),
        claimService.getSellerReceivedClaims(userId),
        listingService.getListings({ sellerId: userId }),
      ]);

      setBuyerClaims(bClaims);
      setSellerClaims(sClaims);
      setSellerListings(sListings);
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleCompletePickup = async (claimId: string) => {
    try {
      await claimService.completePickup(claimId, userId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelClaim = async (claimId: string, listingId: string) => {
    try {
      await claimService.cancelClaim(claimId, listingId, 'Cancelled by user');
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Role View Toggle */}
      <div className="flex items-center justify-between p-2 bg-neutral-900 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-1.5 w-full">
          <button
            id="tab-buyer-activity"
            onClick={() => setRoleTab('buyer')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'buyer'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Buyer Activity ({buyerClaims.length})</span>
          </button>

          <button
            id="tab-seller-activity"
            onClick={() => setRoleTab('seller')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'seller'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Seller Activity ({sellerListings.length})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-400">Loading activity...</div>
      ) : roleTab === 'buyer' ? (
        /* BUYER CLAIMS VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Your Item Reservations & Pickups
            </h3>
            <span className="text-xs text-neutral-500">
              Address unlocked on active reservations
            </span>
          </div>

          {buyerClaims.length === 0 ? (
            <div className="p-10 rounded-3xl bg-neutral-900/50 border border-neutral-800 text-center space-y-3">
              <Truck className="w-10 h-10 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-200">No active claims</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Explore the marketplace and lock in early urgency pricing to claim items for pickup.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {buyerClaims.map((c) => {
                const isActive = c.status === 'active' || c.status === 'pending';
                const isCompleted = c.status === 'completed';

                return (
                  <div
                    key={c.id}
                    id={`claim-row-${c.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {c.listing?.images?.[0]?.storage_path ? (
                          <img
                            src={c.listing.images[0].storage_path}
                            alt="Item"
                            className="w-14 h-14 rounded-xl object-cover border border-neutral-700 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-neutral-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-neutral-100 truncate">
                            {c.listing?.title || 'Claimed Item'}
                          </h4>
                          <span className="text-xs text-neutral-400 block">
                            Seller: {c.listing?.seller?.business_name || c.listing?.seller?.display_name || 'Hauler'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block">Locked Price</span>
                          <span className="text-base font-bold font-mono text-amber-400">
                            {formatPrice(c.price_at_claim)}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          isActive
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isCompleted
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    {/* Unlocked Pickup Details */}
                    {isActive && c.listing && (
                      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Pickup Location (Private & Confirmed)</span>
                          </span>
                          <span className="text-neutral-400 font-mono">
                            Arrive by: {new Date(c.pickup_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-200 font-medium font-mono text-sm">
                          {c.listing.pickup_address_text}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {isActive && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/60">
                        <button
                          onClick={() => handleCancelClaim(c.id, c.listing_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          Release / Cancel Claim
                        </button>

                        <button
                          onClick={() => handleCompletePickup(c.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Pickup Complete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SELLER LISTINGS & CLAIMS VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Your Posted Items & Removal Progress
            </h3>
          </div>

          {sellerListings.length === 0 ? (
            <div className="p-10 rounded-3xl bg-neutral-900/50 border border-neutral-800 text-center space-y-3">
              <Package className="w-10 h-10 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-200">No listings posted yet</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Post usable furniture, tools, or appliances to have local buyers pick them up fast.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellerListings.map((listing) => (
                <div
                  key={listing.id}
                  id={`seller-listing-row-${listing.id}`}
                  className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {listing.images?.[0]?.storage_path ? (
                        <img
                          src={listing.images[0].storage_path}
                          alt="Item"
                          className="w-14 h-14 rounded-xl object-cover border border-neutral-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-neutral-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-neutral-100 truncate">
                          {listing.title}
                        </h4>
                        <span className="text-xs text-neutral-400 block">
                          Deadline: {new Date(listing.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block">Current Price</span>
                        <span className="text-base font-bold font-mono text-amber-400">
                          {formatPrice(listing.current_price)}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        listing.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : listing.status === 'claimed'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs">
                    <span className="text-neutral-400">
                      {listing.claim_status === 'claimed' ? '⚡ A buyer has locked this claim!' : 'Awaiting local claims'}
                    </span>

                    <button
                      onClick={() => onSelectListing(listing)}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
