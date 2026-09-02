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
      className="group relative flex flex-col bg-neutral-900/90 rounded-2xl border border-neutral-800/90 hover:border-amber-500/40 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer"
    >
      {/* Image & Badges */}
      <div className="relative aspect-4/3 w-full bg-neutral-950 overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-black/20" />

        {/* Top Urgency Header */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <CountdownBadge
            listing={listing}
            priceWindows={listing.price_windows || []}
            size="sm"
          />

          {listing.category && (
            <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-950/70 text-neutral-300 backdrop-blur-md border border-neutral-800">
              {listing.category.name}
            </span>
          )}
        </div>

        {/* Claimed / Picked Up Overlay */}
        {isClaimed && (
          <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-neutral-950 shadow-md">
              Pending Pickup
            </span>
          </div>
        )}
        {isPickedUp && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-neutral-950 shadow-md">
              Picked Up
            </span>
          </div>
        )}

        {/* Bottom Image Stats */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-300 flex items-center gap-1 drop-shadow">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>{formatDistance(listing.calculated_distance_miles)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-neutral-300 line-through opacity-70 drop-shadow">
              est. ${listing.estimated_value || listing.original_price || 100}
            </span>
            <div className={`px-2.5 py-0.5 rounded-lg text-lg font-extrabold font-mono shadow-md ${
              listing.current_price === 0 
                ? 'bg-emerald-500 text-neutral-950' 
                : 'bg-amber-500 text-neutral-950'
            }`}>
              {formatPrice(listing.current_price)}
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-base font-bold text-neutral-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {listing.description || 'Quick removal item. Available for immediate pickup.'}
          </p>
        </div>

        {/* Footer & Actions */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
          {/* Seller Snapshot */}
          <div className="flex items-center gap-2 min-w-0">
            {listing.seller?.avatar_url ? (
              <img
                src={listing.seller.avatar_url}
                alt="Seller"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 shrink-0">
                {(listing.seller?.display_name || 'S').charAt(0)}
              </div>
            )}
            <span className="text-xs text-neutral-300 font-medium truncate">
              {listing.seller?.business_name || listing.seller?.display_name || 'Verified Seller'}
            </span>
            {listing.seller?.is_verified && (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <span>Claim</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
