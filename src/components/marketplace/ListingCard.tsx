import React from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { CountdownBadge } from '../common/CountdownBadge';
import { formatPrice } from '../../utils/pricing';
import { formatDistance } from '../../utils/geo';
import { MapPin, ShieldCheck, Tag, Eye } from 'lucide-react';

interface ListingCardProps {
  listing: ListingWithDetails;
  onSelect: (listing: ListingWithDetails) => void;
  onQuickClaim: (listing: ListingWithDetails) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSelect,
  onQuickClaim,
}) => {
  const primaryImage =
    listing.images && listing.images.length > 0
      ? listing.images[0].storage_path
      : 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80';

  const isClaimed = listing.claim_status === 'claimed' || listing.status === 'claimed';
  const isPickedUp = listing.status === 'picked_up';

  return (
    <div
      id={`listing-card-${listing.id}`}
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col bg-[#0A0C14] rounded-3xl border border-white/5 hover:border-orange-500/50 transition-all duration-300 overflow-hidden shadow-xl hover:shadow-[0_0_25px_rgba(249,115,22,0.15)] cursor-pointer"
    >
      {/* Image & Badges */}
      <div className="relative aspect-4/3 w-full bg-[#05060B] overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C14] via-transparent to-black/40" />

        {/* Top Urgency Header */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <CountdownBadge
            listing={listing}
            priceWindows={listing.price_windows || []}
            size="sm"
          />

          {listing.category && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-slate-300 backdrop-blur-md border border-white/10">
              {listing.category.name}
            </span>
          )}
        </div>

        {/* Claimed / Picked Up Overlay */}
        {isClaimed && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              Pending Pickup
            </span>
          </div>
        )}
        {isPickedUp && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-green-500 text-white shadow-[0_0_15px_rgba(74,222,128,0.5)]">
              Picked Up
            </span>
          </div>
        )}

        {/* Bottom Image Stats */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 drop-shadow-md">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{formatDistance(listing.calculated_distance_miles)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[11px] text-slate-400 line-through opacity-80 drop-shadow">
              est. ${listing.estimated_value || listing.original_price || 100}
            </span>
            <div className={`px-3 py-1 rounded-xl text-lg font-black font-mono shadow-lg ${
              listing.current_price === 0 
                ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(74,222,128,0.4)]' 
                : 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
            }`}>
              {formatPrice(listing.current_price)}
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {listing.description || 'Quick removal item. Available for immediate pickup.'}
          </p>
        </div>

        {/* Footer & Actions */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          {/* Seller Snapshot */}
          <div className="flex items-center gap-2 min-w-0">
            {listing.seller?.avatar_url ? (
              <img
                src={listing.seller.avatar_url}
                alt="Seller"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                {(listing.seller?.display_name || 'S').charAt(0)}
              </div>
            )}
            <span className="text-xs text-slate-300 font-medium truncate">
              {listing.seller?.business_name || listing.seller?.display_name || 'Verified Seller'}
            </span>
            {listing.seller?.is_verified && (
              <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
            )}
          </div>

          {/* Quick Action Button */}
          {!isClaimed && !isPickedUp && (
            <button
              id={`quick-claim-btn-${listing.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickClaim(listing);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(249,115,22,0.3)] hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] cursor-pointer"
            >
              <span>Claim</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
