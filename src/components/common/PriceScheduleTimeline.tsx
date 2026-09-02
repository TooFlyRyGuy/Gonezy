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
      <div className="text-xs text-slate-400 py-2">
        Flat pricing until pickup deadline.
      </div>
    );
  }

  const sorted = [...windows].sort((a, b) => a.sequence - b.sequence);
  const now = Date.now();

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
        <span>Urgency Price Schedule</span>
        <span className="text-[11px] font-medium text-orange-400 lowercase">
          claims lock current price
        </span>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'}`}>
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
              className={`relative p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                  : isPassed
                  ? 'bg-white/2 border-white/5 opacity-40'
                  : 'bg-[#0A0C14] border-white/5 hover:border-white/10'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-500 text-white uppercase tracking-widest shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                  Active Now
                </div>
              )}

              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  Stage {index + 1}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {durationLabel}
                </span>
              </div>

              <div className="flex items-baseline gap-1 my-1.5">
                <span className={`text-2xl font-black font-mono tracking-tight ${
                  w.price === 0 ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-white'
                }`}>
                  {formatPrice(w.price)}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-1 border-t border-white/5">
                <span>{startTimeStr}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span>{endTimeStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
