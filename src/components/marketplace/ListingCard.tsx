import React, { useEffect, useState } from 'react';
import { ListingWithDetails } from '../../types/marketplace';
import { calculatePricingState, formatCompactDuration, formatPrice } from '../../utils/pricing';
import { formatDistanceWithDrive } from '../../utils/geo';
import { getAuthoritativeNow } from '../../utils/serverTime';

interface ListingCardProps {
  listing: ListingWithDetails;
  onSelect: (listing: ListingWithDetails) => void;
  onQuickClaim: (listing: ListingWithDetails) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onSelect, onQuickClaim }) => {
  const [now, setNow] = useState(() => getAuthoritativeNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(getAuthoritativeNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pricing = calculatePricingState(listing as any, listing.price_windows || [], now);
  const primaryImage =
    listing.images && listing.images.length > 0
      ? listing.images[0].storage_path
      : 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80';

  const isClaimed = listing.status === 'claimed';
  const isPickedUp = listing.status === 'picked_up';
  const distanceWithDrive = formatDistanceWithDrive(listing.calculated_distance_miles);
  const headline = pricing.isExpired
    ? 'EXPIRED'
    : `${formatPrice(pricing.currentPrice)} for ${formatCompactDuration(pricing.timeRemainingMs)}`;

  return (
    <div
      id={`listing-card-${listing.id}`}
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col bg-[#0A0C14] rounded-3xl border border-white/5 hover:border-orange-500/50 transition-all overflow-hidden shadow-xl cursor-pointer"
    >
      <div className="relative aspect-4/3 w-full bg-[#05060B] overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C14] via-black/20 to-black/30" />

        <div className="absolute inset-x-3 bottom-3 top-3 flex flex-col justify-between">
          <div
            className={`px-3 py-2 rounded-2xl text-lg sm:text-xl font-black font-mono leading-tight shadow-lg ${
              pricing.isExpired
                ? 'bg-black/70 text-slate-200'
                : pricing.isFree
                  ? 'bg-green-500 text-white shadow-[0_0_18px_rgba(74,222,128,0.45)]'
                  : 'bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.45)]'
            }`}
          >
            <div>{headline}</div>
            {!pricing.isExpired && distanceWithDrive ? (
              <div className="mt-0.5 text-[11px] sm:text-xs font-bold font-sans tracking-normal opacity-90">
                {distanceWithDrive}
              </div>
            ) : null}
          </div>
        </div>

        {isClaimed && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span className="px-4 py-2 rounded-full text-xs font-black uppercase bg-orange-500 text-white">
              Pending pickup
            </span>
          </div>
        )}
        {isPickedUp && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span className="px-4 py-2 rounded-full text-xs font-black uppercase bg-green-500 text-white">
              Picked up
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-orange-400">
            {listing.title}
          </h3>
          {listing.description?.trim() ? (
            <p className="text-xs text-slate-400 line-clamp-1">{listing.description.trim()}</p>
          ) : null}
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <span className="text-xs text-slate-400 truncate min-w-0">
            {listing.seller?.business_name || listing.seller?.display_name || 'Seller'}
          </span>
          {!isClaimed && !isPickedUp && !pricing.isExpired && (
            <button
              id={`quick-claim-btn-${listing.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickClaim(listing);
              }}
              className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white cursor-pointer shrink-0"
            >
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
