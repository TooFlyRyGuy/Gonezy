import React, { useState } from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { PriceScheduleTimeline } from '../common/PriceScheduleTimeline';
import { CountdownBadge } from '../common/CountdownBadge';
import { formatPrice } from '../../utils/pricing';
import { formatDistance } from '../../utils/geo';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  Package,
  AlertCircle,
  Truck,
  Phone,
  Calendar,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

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
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  if (!listing) return null;

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : [{ id: 'default', listing_id: listing.id, storage_path: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80', sort_order: 0, created_at: '' }];

  const isSeller = currentUserId && listing.seller_id === currentUserId;
  const isClaimedByMe = currentUserId && listing.active_claim && listing.active_claim.buyer_id === currentUserId;
  const isClaimedByOther = listing.claim_status === 'claimed' && !isClaimedByMe;
  const isExpired = listing.status === 'expired' || new Date(listing.pickup_deadline).getTime() <= Date.now();

  const deadlineFormatted = new Date(listing.pickup_deadline).toLocaleTimeString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

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
        {/* Header Action Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0A0C14]/95 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <CountdownBadge
              listing={listing}
              priceWindows={listing.price_windows || []}
            />
            {listing.category && (
              <span className="text-xs text-slate-400 truncate">
                in {listing.category.name}
              </span>
            )}
          </div>

          <button
            id="close-listing-detail-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Photo Gallery */}
          <div className="relative aspect-16/10 rounded-3xl overflow-hidden bg-[#05060B] border border-white/5 group">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        activeImageIndex === i ? 'bg-orange-500 w-5 shadow-[0_0_8px_#f97316]' : 'bg-white/30 w-2'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {listing.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-200 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  {formatDistance(listing.calculated_distance_miles)}
                </span>
                <span>•</span>
                <span className="capitalize">Condition: {listing.condition.replace('_', ' ')}</span>
                <span>•</span>
                <span>Disposal Deadline: {deadlineFormatted}</span>
              </div>
            </div>

            <div className="flex items-baseline sm:flex-col sm:items-end gap-2 shrink-0">
              <div className="text-xs text-slate-400">Current Urgency Price</div>
              <div className={`px-4 py-1.5 rounded-2xl text-2xl sm:text-3xl font-black font-mono shadow-xl ${
                listing.current_price === 0 
                  ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(74,222,128,0.4)]' 
                  : 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
              }`}>
                {formatPrice(listing.current_price)}
              </div>
            </div>
          </div>

          {/* Escalating Price Window Schedule */}
          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5">
            <PriceScheduleTimeline
              windows={listing.price_windows || []}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description & Removal Notes
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#05060B] p-4 rounded-2xl border border-white/5">
              {listing.description || 'No additional description provided.'}
            </p>
          </div>

          {/* Location & Pickup Privacy Box */}
          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5 flex flex-col sm:flex-row gap-4 items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Pickup Location</span>
              </div>
              <p className="text-sm text-slate-200 font-semibold">
                {listing.pickup_address_text}
              </p>
              {!isSeller && !isClaimedByMe && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  Exact street address & door number is revealed immediately upon claim confirmation.
                </p>
              )}
              {isClaimedByMe && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>Item reserved by you! Please pick up before deadline.</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Estimated Retail Value</span>
              <span className="text-base font-bold font-mono text-slate-200">
                ${listing.estimated_value || 100}
              </span>
            </div>
          </div>

          {/* Seller Information Box */}
          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {listing.seller?.avatar_url ? (
                <img
                  src={listing.seller.avatar_url}
                  alt="Seller"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-slate-300">
                  {(listing.seller?.display_name || 'S').charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {listing.seller?.business_name || listing.seller?.display_name || 'Local Seller'}
                  </span>
                  {listing.seller?.is_verified && (
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <div className="text-xs text-slate-400 capitalize">
                  {listing.seller?.business_type?.replace('_', ' ') || listing.seller?.account_type || 'Marketplace Member'}
                </div>
              </div>
            </div>

            {(isClaimedByMe || isSeller) && listing.seller?.phone && (
              <a
                href={`tel:${listing.seller.phone}`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span>Call Seller</span>
              </a>
            )}
          </div>
        </div>

        {/* Fixed Bottom CTA Bar */}
        <div className="p-4 sm:p-5 border-t border-white/5 bg-[#0A0C14]/95 backdrop-blur-md sticky bottom-0 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400">Lock In Price At</span>
            <span className="text-xl font-mono font-black text-orange-400">
              {formatPrice(listing.current_price)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSeller ? (
              <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold border border-white/5">
                You are the seller of this listing
              </div>
            ) : isClaimedByMe ? (
              <div className="px-4 py-2.5 rounded-xl bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/40">
                Claimed by you - Ready for pickup
              </div>
            ) : isClaimedByOther ? (
              <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-bold border border-white/5">
                Currently Reserved by Another Buyer
              </div>
            ) : isExpired ? (
              <div className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-bold border border-white/5">
                Listing Expired / Disposed
              </div>
            ) : (
              <button
                id="claim-listing-modal-btn"
                onClick={() => onClaim(listing)}
                className="px-6 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Claim & Reserve Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
