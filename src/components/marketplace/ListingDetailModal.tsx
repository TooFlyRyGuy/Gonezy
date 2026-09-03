import React, { useEffect, useState } from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { PriceScheduleTimeline } from '../common/PriceScheduleTimeline';
import { calculatePricingState, formatCompactDuration, formatPrice } from '../../utils/pricing';
import { formatDistance, formatDistanceWithDrive } from '../../utils/geo';
import { getAuthoritativeNow } from '../../utils/serverTime';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Truck, X } from 'lucide-react';

interface ListingDetailModalProps {
  listing: ListingWithDetails | null;
  currentUserId?: string;
  onClose: () => void;
  onClaim: (listing: ListingWithDetails) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  currentUserId,
  onClose,
  onClaim,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [now, setNow] = useState(() => getAuthoritativeNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(getAuthoritativeNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!listing) return null;

  const pricing = calculatePricingState(listing as any, listing.price_windows || [], now);
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [
          {
            id: 'default',
            listing_id: listing.id,
            storage_path:
              'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
            sort_order: 0,
            created_at: '',
          },
        ];

  const isSeller = Boolean(currentUserId && listing.seller_id === currentUserId);
  const isClaimedByMe = Boolean(currentUserId && listing.active_claim && listing.active_claim.buyer_id === currentUserId);
  const isClaimedByOther = listing.status === 'claimed' && !isClaimedByMe;
  const isExpired = pricing.isExpired || listing.status === 'expired';
  const showExactAddress = isSeller || isClaimedByMe;
  const distanceWithDrive = formatDistanceWithDrive(listing.calculated_distance_miles);

  return (
    <div
      id="listing-detail-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="listing-detail-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#0A0C14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div
            className={`px-3 py-1.5 rounded-2xl text-sm font-black font-mono ${
              pricing.isFree && !isExpired ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
            }`}
          >
            <div>
              {isExpired
                ? 'EXPIRED'
                : `${formatPrice(pricing.currentPrice)} for ${formatCompactDuration(pricing.timeRemainingMs)}`}
            </div>
            {!isExpired && distanceWithDrive ? (
              <div className="mt-0.5 text-[11px] font-bold font-sans tracking-normal opacity-90">
                {distanceWithDrive}
              </div>
            ) : null}
          </div>
          <button
            id="close-listing-detail-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="relative aspect-16/10 rounded-3xl overflow-hidden bg-[#05060B] border border-white/5">
            <img
              src={images[activeImageIndex]?.storage_path}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{listing.title}</h1>
            {listing.description?.trim() ? (
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{listing.description.trim()}</p>
            ) : null}
          </div>

          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5">
            <PriceScheduleTimeline windows={listing.price_windows || []} />
          </div>

          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MapPin className="w-4 h-4 text-orange-400" />
              Pickup
            </div>
            <p className="text-sm text-slate-200 font-semibold">
              {showExactAddress
                ? listing.pickup_address_text
                : `${distanceWithDrive || formatDistance(listing.calculated_distance_miles)} — exact address unlocks after you claim`}
            </p>
            {!showExactAddress && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                Street address is hidden until the claim is yours.
              </p>
            )}
            {isClaimedByMe && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Reserved for you. Pick it up before the window ends.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400">Lock this price</span>
            <div className="text-xl font-mono font-black text-orange-400">{formatPrice(pricing.currentPrice)}</div>
          </div>
          {isSeller ? (
            <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold text-center">Your listing</div>
          ) : isClaimedByMe ? (
            <div className="px-4 py-2.5 rounded-xl bg-green-500/20 text-green-300 text-xs font-bold text-center">Claimed by you</div>
          ) : isClaimedByOther ? (
            <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-bold text-center">Already claimed</div>
          ) : isExpired ? (
            <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-bold text-center">Expired</div>
          ) : (
            <button
              id="claim-listing-modal-btn"
              onClick={() => onClaim(listing)}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
