import { Listing, ListingPriceWindow, PricingState, PricingWindowInput } from '../types/marketplace';

/**
 * Formats a numeric price into a display string (e.g., "FREE" or "$50")
 */
export function formatPrice(price: number): string {
  if (price <= 0) return 'FREE';
  return `$${Math.round(price).toLocaleString()}`;
}

/**
 * Formats milliseconds remaining into a compact, urgent countdown format (e.g. "24m 12s" or "1h 45m" or "EXPIRED")
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'EXPIRED';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  }
  return `${seconds}s left`;
}

/**
 * Calculates current price, active window, next window, time remaining, and progress
 */
export function calculatePricingState(
  listing: Listing,
  windows: ListingPriceWindow[] = [],
  atDate: Date = new Date()
): PricingState {
  const now = atDate.getTime();
  const deadline = new Date(listing.pickup_deadline).getTime();
  const isExpired = now >= deadline || listing.status === 'expired' || listing.status === 'disposed';

  if (isExpired) {
    return {
      currentPrice: listing.current_price,
      isFree: listing.current_price === 0,
      activeWindow: null,
      nextWindow: null,
      timeRemainingMs: 0,
      timeRemainingFormatted: 'EXPIRED',
      isExpired: true,
      progressPercent: 100,
    };
  }

  // Sort windows by sequence
  const sortedWindows = [...windows].sort((a, b) => a.sequence - b.sequence);

  let activeWindow: ListingPriceWindow | null = null;
  let nextWindow: ListingPriceWindow | null = null;

  for (let i = 0; i < sortedWindows.length; i++) {
    const w = sortedWindows[i];
    const startsAt = new Date(w.starts_at).getTime();
    const endsAt = new Date(w.ends_at).getTime();

    if (now >= startsAt && now < endsAt) {
      activeWindow = w;
      nextWindow = sortedWindows[i + 1] || null;
      break;
    }
  }

  // If no specific window matched, check if before first window or after last
  if (!activeWindow && sortedWindows.length > 0) {
    const firstStart = new Date(sortedWindows[0].starts_at).getTime();
    if (now < firstStart) {
      activeWindow = sortedWindows[0];
      nextWindow = sortedWindows[1] || null;
    } else {
      activeWindow = sortedWindows[sortedWindows.length - 1];
      nextWindow = null;
    }
  }

  const currentPrice = activeWindow ? activeWindow.price : listing.current_price;
  const isFree = currentPrice === 0;

  // Calculate time remaining in CURRENT active window before price increases
  let targetEndMs = deadline;
  let targetStartMs = new Date(listing.available_from).getTime();

  if (activeWindow && nextWindow) {
    targetEndMs = new Date(activeWindow.ends_at).getTime();
    targetStartMs = new Date(activeWindow.starts_at).getTime();
  }

  const timeRemainingMs = Math.max(0, targetEndMs - now);
  const totalWindowDuration = Math.max(1, targetEndMs - targetStartMs);
  const elapsed = Math.max(0, now - targetStartMs);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalWindowDuration) * 100));

  return {
    currentPrice,
    isFree,
    activeWindow,
    nextWindow,
    timeRemainingMs,
    timeRemainingFormatted: formatTimeRemaining(timeRemainingMs),
    isExpired: false,
    progressPercent,
  };
}

/**
 * Standard preset schedules for fast listing
 */
export function getPresetPricingSchedule(
  type: 'free_escalation' | 'quick_removal' | 'flat_urgent',
  totalHours: number = 6
): PricingWindowInput[] {
  switch (type) {
    case 'free_escalation':
      // 30 min FREE -> $30 for 2h -> $75 for 2h -> $150 until deadline
      return [
        { durationMinutes: 30, price: 0, label: 'First 30 Mins: FREE' },
        { durationMinutes: 120, price: 30, label: 'Next 2 Hours: $30' },
        { durationMinutes: 120, price: 75, label: 'Next 2 Hours: $75' },
        { durationMinutes: Math.max(60, (totalHours * 60) - 270), price: 150, label: 'Final Window: $150' },
      ];
    case 'quick_removal':
      // $20 first hour -> $50 next 2h -> $100 final
      return [
        { durationMinutes: 60, price: 20, label: 'First Hour: $20' },
        { durationMinutes: 120, price: 50, label: 'Next 2 Hours: $50' },
        { durationMinutes: Math.max(60, (totalHours * 60) - 180), price: 100, label: 'Final Window: $100' },
      ];
    case 'flat_urgent':
      // Flat price with urgency deadline
      return [
        { durationMinutes: totalHours * 60, price: 0, label: `FREE for all ${totalHours} hours` },
      ];
    default:
      return [
        { durationMinutes: 30, price: 0, label: 'First 30 Mins: FREE' },
        { durationMinutes: 120, price: 50, label: 'Next 2 Hours: $50' },
        { durationMinutes: 180, price: 100, label: 'Final Window: $100' },
      ];
  }
}
