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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id="claim-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0A0C14] border border-white/10 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {claimSuccessData ? 'Item Reserved!' : 'Confirm Item Claim'}
              </h2>
              <p className="text-xs text-slate-400">
                {claimSuccessData ? 'Pickup details unlocked' : 'Immediate removal commitment'}
              </p>
            </div>
          </div>

          <button
            id="close-claim-modal-btn"
            onClick={claimSuccessData ? () => { onSuccess(); onClose(); } : onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {claimSuccessData ? (
          /* Success Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 space-y-2.5 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Claim Locked at {formatPrice(claimSuccessData.priceAtClaim)}!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The seller has been notified. The listing is now reserved for you until the pickup window expires.
              </p>
            </div>

            {/* Revealed Pickup Location */}
            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                <MapPin className="w-4 h-4" />
                <span>Exact Pickup Address (Unlocked)</span>
              </div>
              <p className="text-sm font-bold text-white font-mono">
                {listing.pickup_address_text}
              </p>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Must arrive before: {new Date(claimSuccessData.pickupExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <button
              id="view-active-claims-btn"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to My Activity & Navigation
            </button>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {listing.title}
                </h4>
                <span className="text-xs text-slate-400">
                  Seller: {listing.seller?.business_name || listing.seller?.display_name || 'Local Hauler'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Locked Price</span>
                <span className="text-xl font-mono font-black text-orange-400">
                  {formatPrice(listing.current_price)}
                </span>
              </div>
            </div>

            {/* Commitment Rules */}
            <div className="space-y-2.5 text-xs text-slate-300 bg-[#05060B] p-4 rounded-2xl border border-white/5">
              <div className="font-bold text-orange-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Pickup Commitment Guidelines</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span>You are committing to arrive before the disposal deadline ({deadlineFormatted}).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span>Please ensure you have adequate vehicle space and assistance to load this item.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span>Payment (if applicable) is settled directly upon handoff.</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="confirm-claim-button"
                onClick={handleConfirmClaim}
                disabled={isSubmitting}
                className="px-6 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98]"
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
