import React, { useEffect, useState } from 'react';
import { calculatePricingState, formatPrice } from '../../utils/pricing';
import { getAuthoritativeNow } from '../../utils/serverTime';
import { Listing, ListingPriceWindow } from '../../types/marketplace';
import { AlertTriangle, Clock } from 'lucide-react';

interface CountdownBadgeProps {
  listing: Listing;
  priceWindows: ListingPriceWindow[];
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({ listing, priceWindows }) => {
  const [state, setState] = useState(() => calculatePricingState(listing, priceWindows, getAuthoritativeNow()));

  useEffect(() => {
    const interval = setInterval(() => {
      setState(calculatePricingState(listing, priceWindows, getAuthoritativeNow()));
    }, 1000);
    return () => clearInterval(interval);
  }, [listing, priceWindows]);

  if (state.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/10">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    );
  }

  const isFreeNow = state.isFree;
  const isLastWindow = !state.nextWindow;
  let bgClass = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  if (isFreeNow) bgClass = 'bg-green-500/15 text-green-400 border-green-500/30';
  else if (isLastWindow) bgClass = 'bg-red-500/15 text-red-400 border-red-500/30';

  const nextPriceText = state.nextWindow ? `then ${formatPrice(state.nextWindow.price)}` : 'then gone';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${bgClass}`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span className="font-mono font-bold tracking-tight text-white">{state.timeRemainingFormatted}</span>
      <span className="text-[10px] opacity-80">{nextPriceText}</span>
    </div>
  );
};
