import React, { useState } from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { formatPrice } from '../../utils/pricing';
import { claimService } from '../../services/claimService';
import { listingService } from '../../services/listingService';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Truck, X } from 'lucide-react';

interface ClaimModalProps {
  listing: ListingWithDetails | null;
  buyerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ listing, buyerId, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimSuccessData, setClaimSuccessData] = useState<{
    priceAtClaim?: number;
    pickupExpiresAt?: string;
    address?: string | null;
  } | null>(null);

  if (!listing) return null;

  const handleConfirmClaim = async () => {
    if (!buyerId) {
      setErrorMessage('Sign in to claim this item.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await claimService.claimListing(listing.id, buyerId);
      if (!result.success) {
        setErrorMessage(result.error || 'Could not complete claim.');
        setIsSubmitting(false);
        return;
      }

      let address = listing.pickup_address_text;
      try {
        const fresh = await listingService.getListingById(listing.id, buyerId);
        address = fresh?.pickup_address_text || address;
      } catch {
        // Address reveal is best-effort after a successful lock
      }

      setClaimSuccessData({
        priceAtClaim: result.priceAtClaim,
        pickupExpiresAt: result.pickupExpiresAt,
        address,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not complete claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="claim-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id="claim-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0A0C14] border border-white/10 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-black text-white">{claimSuccessData ? 'Claim locked' : 'Claim this item'}</h2>
            <p className="text-xs text-slate-400">
              {claimSuccessData ? 'Pickup address is now yours' : 'Locks the current price for you only'}
            </p>
          </div>
          <button
            id="close-claim-modal-btn"
            onClick={
              claimSuccessData
                ? () => {
                    onSuccess();
                    onClose();
                  }
                : onClose
            }
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {claimSuccessData ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Locked at {formatPrice(claimSuccessData.priceAtClaim || 0)}
              </div>
              <p className="text-xs text-slate-300">The seller was notified. Only you hold this claim.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                <MapPin className="w-4 h-4" />
                Pickup address
              </div>
              <p className="text-sm font-bold text-white">{claimSuccessData.address || 'Check Activity for the address'}</p>
              {claimSuccessData.pickupExpiresAt && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  Arrive by {new Date(claimSuccessData.pickupExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            <button
              id="view-active-claims-btn"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-orange-500 hover:bg-orange-400 text-white cursor-pointer"
            >
              Go to Activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{listing.title}</h4>
                <span className="text-xs text-slate-400">
                  {listing.seller?.business_name || listing.seller?.display_name || 'Seller'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Price to lock</span>
                <span className="text-xl font-mono font-black text-orange-400">{formatPrice(listing.current_price)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              You are committing to pick this up in the window. The locked price comes from the server clock, not your phone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-claim-button"
                onClick={handleConfirmClaim}
                disabled={isSubmitting}
                className="px-6 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                {isSubmitting ? 'Locking…' : `Confirm ${formatPrice(listing.current_price)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
