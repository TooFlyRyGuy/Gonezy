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
      <div className="flex items-center justify-between p-2 bg-[#0A0C14] rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-2 w-full">
          <button
            id="tab-buyer-activity"
            onClick={() => setRoleTab('buyer')}
            className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'buyer'
                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Buyer Activity ({buyerClaims.length})</span>
          </button>

          <button
            id="tab-seller-activity"
            onClick={() => setRoleTab('seller')}
            className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'seller'
                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Seller Activity ({sellerListings.length})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading activity...</div>
      ) : roleTab === 'buyer' ? (
        /* BUYER CLAIMS VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Your Item Reservations & Pickups
            </h3>
            <span className="text-xs text-slate-500">
              Address unlocked on active reservations
            </span>
          </div>

          {buyerClaims.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No active claims</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                    className="p-5 rounded-3xl bg-[#0A0C14] border border-white/10 space-y-3.5 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {c.listing?.images?.[0]?.storage_path ? (
                          <img
                            src={c.listing.images[0].storage_path}
                            alt="Item"
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[#05060B] border border-white/5 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-slate-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate">
                            {c.listing?.title || 'Claimed Item'}
                          </h4>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Seller: {c.listing?.seller?.business_name || c.listing?.seller?.display_name || 'Hauler'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Locked Price</span>
                          <span className="text-lg font-black font-mono text-orange-400">
                            {formatPrice(c.price_at_claim)}
                          </span>
                        </div>

                        <span className={`px-3 py-1 rounded-xl text-xs font-black capitalize ${
                          isActive
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                            : isCompleted
                            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                            : 'bg-white/5 text-slate-400 border border-white/5'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    {/* Unlocked Pickup Details */}
                    {isActive && c.listing && (
                      <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Pickup Location (Private & Confirmed)</span>
                          </span>
                          <span className="text-slate-400 font-mono">
                            Arrive by: {new Date(c.pickup_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-white font-semibold font-mono text-sm">
                          {c.listing.pickup_address_text}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {isActive && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleCancelClaim(c.id, c.listing_id)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          Release / Cancel Claim
                        </button>

                        <button
                          onClick={() => handleCompletePickup(c.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-green-500 hover:bg-green-400 text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.3)] hover:scale-[1.02]"
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
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Your Posted Items & Removal Progress
            </h3>
          </div>

          {sellerListings.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No listings posted yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Post usable furniture, tools, or appliances to have local buyers pick them up fast.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellerListings.map((listing) => (
                <div
                  key={listing.id}
                  id={`seller-listing-row-${listing.id}`}
                  className="p-5 rounded-3xl bg-[#0A0C14] border border-white/10 space-y-3.5 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {listing.images?.[0]?.storage_path ? (
                        <img
                          src={listing.images[0].storage_path}
                          alt="Item"
                          className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#05060B] border border-white/5 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">
                          {listing.title}
                        </h4>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Deadline: {new Date(listing.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Current Price</span>
                        <span className="text-lg font-black font-mono text-orange-400">
                          {formatPrice(listing.current_price)}
                        </span>
                      </div>

                      <span className={`px-3 py-1 rounded-xl text-xs font-black capitalize ${
                        listing.status === 'active'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                          : listing.status === 'claimed'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                          : 'bg-white/5 text-slate-400 border border-white/5'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
                    <span className="text-slate-400">
                      {listing.claim_status === 'claimed' ? '⚡ A buyer has locked this claim!' : 'Awaiting local claims'}
                    </span>

                    <button
                      onClick={() => onSelectListing(listing)}
                      className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
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
