import React from 'react';
import { ListingPriceWindow } from '../../types/marketplace';
import { formatPrice } from '../../utils/pricing';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PriceScheduleTimelineProps {
  windows: ListingPriceWindow[];
  activeWindowId?: string | null;
  compact?: boolean;
}

export const PriceScheduleTimeline: React.FC<PriceScheduleTimelineProps> = ({
  windows,
  activeWindowId,
  compact = false,
}) => {
  if (!windows || windows.length === 0) {
    return (
      <div className="text-xs text-neutral-400 py-2">
        Flat pricing until pickup deadline.
      </div>
    );
  }

  const sorted = [...windows].sort((a, b) => a.sequence - b.sequence);
  const now = Date.now();

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        <span>Urgency Price Schedule</span>
        <span className="text-[11px] font-normal text-amber-400/90 lowercase">
          claims lock current price
        </span>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'}`}>
        {sorted.map((w, index) => {
          const startsAt = new Date(w.starts_at).getTime();
          const endsAt = new Date(w.ends_at).getTime();
          const isPassed = now >= endsAt;
          const isActive = activeWindowId ? w.id === activeWindowId : (now >= startsAt && now < endsAt);
          const isUpcoming = now < startsAt;

          const durationMins = Math.round((endsAt - startsAt) / (1000 * 60));
          const durationLabel = durationMins >= 60 
            ? `${(durationMins / 60).toFixed(durationMins % 60 === 0 ? 0 : 1)}h`
            : `${durationMins}m`;

          const startTimeStr = new Date(w.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const endTimeStr = new Date(w.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={w.id || index}
              id={`price-window-card-${index}`}
              className={`relative p-3 rounded-xl border transition-all ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : isPassed
                  ? 'bg-neutral-900/40 border-neutral-800/80 opacity-50'
                  : 'bg-neutral-900/80 border-neutral-800'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-neutral-950 uppercase tracking-wider shadow-sm">
                  Active Now
                </div>
              )}

              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-mono text-neutral-400">
                  Stage {index + 1}
                </span>
                <span className="text-[11px] text-neutral-400 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {durationLabel}
                </span>
              </div>

              <div className="flex items-baseline gap-1 my-1">
                <span className={`text-xl font-bold font-mono ${
                  w.price === 0 ? 'text-emerald-400' : isActive ? 'text-amber-300' : 'text-neutral-200'
                }`}>
                  {formatPrice(w.price)}
                </span>
              </div>

              <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                <span>{startTimeStr}</span>
                <ArrowRight className="w-2.5 h-2.5 text-neutral-500" />
                <span>{endTimeStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
