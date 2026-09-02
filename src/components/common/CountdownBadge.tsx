import React, { useEffect, useState } from 'react';
import { calculatePricingState, formatPrice } from '../../utils/pricing';
import { Listing, ListingPriceWindow } from '../../types/marketplace';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

interface CountdownBadgeProps {
  listing: Listing;
  priceWindows: ListingPriceWindow[];
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  listing,
  priceWindows,
  size = 'md',
}) => {
  const [state, setState] = useState(() =>
    calculatePricingState(listing, priceWindows, new Date())
  );

  useEffect(() => {
    // Tick every second for precise real-time countdown
    const interval = setInterval(() => {
      setState(calculatePricingState(listing, priceWindows, new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, [listing, priceWindows]);

  if (state.isExpired) {
    return (
      <span
        id={`countdown-expired-${listing.id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700"
      >
        <AlertTriangle className="w-3 h-3 text-neutral-400" />
        Disposed / Expired
      </span>
    );
  }

  // Color scheme based on urgency & whether price increases or listing expires
  const isFreeNow = state.isFree;
  const isLastWindow = !state.nextWindow;

  let bgClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  let dotClass = 'bg-amber-400';

  if (isFreeNow) {
    bgClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 animate-pulse';
    dotClass = 'bg-emerald-400';
  } else if (isLastWindow) {
    bgClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    dotClass = 'bg-rose-400';
  }

  const nextPriceText = state.nextWindow
    ? `then ${formatPrice(state.nextWindow.price)}`
    : 'then gone';

  return (
    <div
      id={`countdown-badge-${listing.id}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium backdrop-blur-md ${bgClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-ping`} />
      <Clock className="w-3 h-3 shrink-0" />
      <span className="font-mono font-bold tracking-tight">
        {state.timeRemainingFormatted}
      </span>
      <span className="text-[10px] opacity-75 font-normal">
        ({nextPriceText})
      </span>
    </div>
  );
};
