import React, { useEffect, useState } from 'react';
import { ClaimWithListing, claimService } from '../../services/claimService';
import { listingService } from '../../services/listingService';
import { ListingWithDetails } from '../../types/marketplace';
import { formatPrice } from '../../utils/pricing';
import { AlertTriangle, CheckCircle2, MapPin, Package, Truck } from 'lucide-react';

interface ActivityViewProps {
  userId: string;
  onSelectListing: (listing: ListingWithDetails) => void;
}

function nextStepCopy(status: string, role: 'buyer' | 'seller'): string {
  if (status === 'active' || status === 'pending') {
    return role === 'buyer'
      ? 'Go pick it up, then mark it complete.'
      : 'A buyer is coming. Mark complete when they take it.';
  }
  if (status === 'completed') return 'Pickup finished.';
  if (status === 'no_show') {
    return role === 'buyer' ? 'Pickup window ended. This is a no-show.' : 'Buyer missed the window. Item can go live again.';
  }
  if (status === 'expired') return 'This claim expired.';
  if (status === 'cancelled') return 'Claim was released.';
  return status;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ userId, onSelectListing }) => {
  const [roleTab, setRoleTab] = useState<'buyer' | 'seller'>('buyer');
  const [buyerClaims, setBuyerClaims] = useState<ClaimWithListing[]>([]);
  const [sellerClaims, setSellerClaims] = useState<ClaimWithListing[]>([]);
  const [sellerListings, setSellerListings] = useState<ListingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [bClaims, sClaims, sListings] = await Promise.all([
        claimService.getBuyerClaims(userId),
        claimService.getSellerReceivedClaims(userId),
        listingService.getListings({ sellerId: userId }),
      ]);
      setBuyerClaims(bClaims);
      setSellerClaims(sClaims);
      setSellerListings(sListings);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load activity');
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
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not mark pickup complete');
    }
  };

  const handleCancelClaim = async (claimId: string, listingId: string) => {
    try {
      await claimService.cancelClaim(claimId, listingId, 'Cancelled by user');
      await loadData();
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not cancel claim');
    }
  };

  const claimForListing = (listingId: string) =>
    sellerClaims.find((c) => c.listing_id === listingId && (c.status === 'active' || c.status === 'pending' || c.status === 'completed' || c.status === 'no_show'));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between p-2 bg-[#0A0C14] rounded-3xl border border-white/5">
        <div className="flex items-center gap-2 w-full">
          <button
            id="tab-buyer-activity"
            onClick={() => setRoleTab('buyer')}
            className={`flex-1 py-3 rounded-2xl text-xs font-black cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'buyer' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-4 h-4" />
            Buying ({buyerClaims.length})
          </button>
          <button
            id="tab-seller-activity"
            onClick={() => setRoleTab('seller')}
            className={`flex-1 py-3 rounded-2xl text-xs font-black cursor-pointer flex items-center justify-center gap-2 ${
              roleTab === 'seller' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            Selling ({sellerListings.length})
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading activity…</div>
      ) : roleTab === 'buyer' ? (
        <div className="space-y-3">
          {buyerClaims.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No claims yet</h4>
              <p className="text-xs text-slate-400">Claim a nearby item to lock the price and get the address.</p>
            </div>
          ) : (
            buyerClaims.map((c) => {
              const isActive = c.status === 'active' || c.status === 'pending';
              return (
                <div key={c.id} id={`claim-row-${c.id}`} className="p-5 rounded-3xl bg-[#0A0C14] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white">{c.listing?.title || 'Claimed item'}</h4>
                      <p className="text-xs text-slate-400 mt-1">{nextStepCopy(c.status, 'buyer')}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black font-mono text-orange-400">{formatPrice(c.price_at_claim)}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{c.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {isActive && c.listing && (
                    <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 text-xs space-y-1">
                      <div className="font-black text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5" />
                        Pickup address
                      </div>
                      <p className="text-white font-semibold">{c.listing.pickup_address_text}</p>
                      <p className="text-slate-400">
                        Arrive by {new Date(c.pickup_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {isActive && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleCancelClaim(c.id, c.listing_id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        Release claim
                      </button>
                      <button
                        onClick={() => handleCompletePickup(c.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-green-500 hover:bg-green-400 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark picked up
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sellerListings.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Nothing posted yet</h4>
              <p className="text-xs text-slate-400">Post an item with a photo and a deadline. Buyers nearby can claim it.</p>
            </div>
          ) : (
            sellerListings.map((listing) => {
              const claim = claimForListing(listing.id);
              return (
                <div key={listing.id} id={`seller-listing-row-${listing.id}`} className="p-5 rounded-3xl bg-[#0A0C14] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white">{listing.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {claim ? nextStepCopy(claim.status, 'seller') : listing.status === 'active' ? 'Waiting for a claim.' : listing.status.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="text-xs font-black capitalize text-slate-300">{listing.status.replace('_', ' ')}</span>
                  </div>

                  {claim && (
                    <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 text-xs space-y-1">
                      <p className="text-slate-300">
                        Buyer: {claim.buyer?.display_name || 'Claimed buyer'} · locked {formatPrice(claim.price_at_claim)}
                      </p>
                      {(claim.status === 'active' || claim.status === 'pending') && (
                        <p className="text-slate-400">
                          Pickup window ends {new Date(claim.pickup_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => onSelectListing(listing)}
                      className="text-orange-400 hover:text-orange-300 text-xs font-bold cursor-pointer"
                    >
                      View
                    </button>
                    {claim && (claim.status === 'active' || claim.status === 'pending') && (
                      <button
                        onClick={() => handleCompletePickup(claim.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-green-500 hover:bg-green-400 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark picked up
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
