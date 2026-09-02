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
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 backdrop-blur-md"
      >
        <AlertTriangle className="w-3 h-3 text-slate-400" />
        Disposed / Expired
      </span>
    );
  }

  // Color scheme based on urgency & whether price increases or listing expires
  const isFreeNow = state.isFree;
  const isLastWindow = !state.nextWindow;

  let bgClass = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  let dotClass = 'bg-orange-500 shadow-[0_0_8px_#f97316]';

  if (isFreeNow) {
    bgClass = 'bg-green-500/15 text-green-400 border-green-500/30';
    dotClass = 'bg-green-400 shadow-[0_0_8px_#4ade80]';
  } else if (isLastWindow) {
    bgClass = 'bg-red-500/15 text-red-400 border-red-500/30';
    dotClass = 'bg-red-500 shadow-[0_0_8px_#ef4444]';
  }

  const nextPriceText = state.nextWindow
    ? `then ${formatPrice(state.nextWindow.price)}`
    : 'then gone';

  return (
    <div
      id={`countdown-badge-${listing.id}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium backdrop-blur-md ${bgClass}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`} />
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span className="font-mono font-bold tracking-tight text-white">
        {state.timeRemainingFormatted}
      </span>
      <span className="text-[10px] opacity-80 font-normal">
        ({nextPriceText})
      </span>
    </div>
  );
};
