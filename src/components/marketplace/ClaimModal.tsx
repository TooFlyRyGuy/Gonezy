import React, { useState } from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { formatPrice } from '../../utils/pricing';
import { claimService } from '../../services/claimService';
import {
  X,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface ClaimModalProps {
  listing: ListingWithDetails | null;
  buyerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  listing,
  buyerId,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimSuccessData, setClaimSuccessData] = useState<any | null>(null);

  if (!listing) return null;

  const handleConfirmClaim = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await claimService.claimListing(listing.id, buyerId);
      if (!result.success) {
        setErrorMessage(result.error || 'Could not complete claim.');
        setIsSubmitting(false);
        return;
      }

      setClaimSuccessData(result);
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const deadlineFormatted = new Date(listing.pickup_deadline).toLocaleTimeString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="claim-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id="claim-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                {claimSuccessData ? 'Item Reserved!' : 'Confirm Item Claim'}
              </h2>
              <p className="text-xs text-neutral-400">
                {claimSuccessData ? 'Pickup details unlocked' : 'Immediate removal commitment'}
              </p>
            </div>
          </div>

          <button
            id="close-claim-modal-btn"
            onClick={claimSuccessData ? () => { onSuccess(); onClose(); } : onClose}
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {claimSuccessData ? (
          /* Success Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Claim Locked at {formatPrice(claimSuccessData.priceAtClaim)}!</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                The seller has been notified. The listing is now reserved for you until the pickup window expires.
              </p>
            </div>

            {/* Revealed Pickup Location */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <MapPin className="w-4 h-4" />
                <span>Exact Pickup Address (Unlocked)</span>
              </div>
              <p className="text-sm font-semibold text-neutral-100 font-mono">
                {listing.pickup_address_text}
              </p>
              <div className="text-xs text-neutral-400 flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Must arrive before: {new Date(claimSuccessData.pickupExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <button
              id="view-active-claims-btn"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Go to My Activity & Navigation
            </button>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-neutral-200 truncate">
                  {listing.title}
                </h4>
                <span className="text-xs text-neutral-400">
                  Seller: {listing.seller?.business_name || listing.seller?.display_name || 'Local Hauler'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-neutral-400 block">Locked Price</span>
                <span className="text-lg font-mono font-extrabold text-amber-400">
                  {formatPrice(listing.current_price)}
                </span>
              </div>
            </div>

            {/* Commitment Rules */}
            <div className="space-y-2.5 text-xs text-neutral-300 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800">
              <div className="font-bold text-neutral-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Pickup Commitment Guidelines</span>
              </div>
              <ul className="space-y-2 text-neutral-300">
                <li className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>You are committing to arrive before the disposal deadline ({deadlineFormatted}).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Please ensure you have adequate vehicle space and assistance to load this item.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Payment (if applicable) is settled directly or upon handoff. No deposit charged right now.</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="confirm-claim-button"
                onClick={handleConfirmClaim}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {isSubmitting ? (
                  <span>Locking Claim...</span>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Confirm & Lock Price ({formatPrice(listing.current_price)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
