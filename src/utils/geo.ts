/**
 * Geolocation privacy and calculation helpers for Gonezy
 */

/**
 * Perturbs coordinates deterministically or with slight random noise
 * to prevent leaking exact seller street addresses on public listings.
 * Offset is roughly 0.5 to 1.0 miles.
 */
export function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  // ~0.01 degrees is roughly 0.7 miles / 1.1 km
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.007 + Math.random() * 0.006;
  
  const fuzzedLat = Number((lat + Math.cos(angle) * distance).toFixed(6));
  const fuzzedLng = Number((lng + Math.sin(angle) * (distance / Math.cos((lat * Math.PI) / 180))).toFixed(6));
  
  return { lat: fuzzedLat, lng: fuzzedLng };
}

/**
 * Haversine formula to compute great-circle distance between two points in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Formats distance in a clean human-readable badge (e.g., "1.2 mi away")
 */
export function formatDistance(miles: number | null | undefined): string {
  if (!hasMeasuredDistance(miles)) {
    return 'Nearby';
  }
  if (miles < 0.2) {
    return '< 0.2 mi away';
  }
  return `${miles.toFixed(1)} mi away`;
}

/**
 * Effective local driving average used for pickup-window and travel-time estimates.
 * Straight-line miles / this speed — not a maps API, not live traffic.
 */
export const EFFECTIVE_LOCAL_DRIVE_MPH = 28;

/** Slack added on top of estimated drive so buyers can park and load. */
export const PICKUP_SLACK_MINUTES = 45;

/** Nearby buyers always get at least this long, unless the listing deadline is sooner. */
export const MIN_PICKUP_WINDOW_MINUTES = 120;

export function hasMeasuredDistance(miles: number | null | undefined): miles is number {
  return miles !== null && miles !== undefined && !Number.isNaN(miles);
}

/**
 * Estimated one-way drive minutes from straight-line miles at EFFECTIVE_LOCAL_DRIVE_MPH.
 * Returns null when distance is unknown so we never fabricate a time.
 */
export function estimateDriveMinutes(miles: number | null | undefined): number | null {
  if (!hasMeasuredDistance(miles) || miles < 0) return null;
  return Math.max(1, Math.round((miles / EFFECTIVE_LOCAL_DRIVE_MPH) * 60));
}

/** Compact travel label, e.g. "~12 min drive". Null when distance is unknown. */
export function formatDriveTime(miles: number | null | undefined): string | null {
  const minutes = estimateDriveMinutes(miles);
  if (minutes == null) return null;
  if (minutes < 60) return `~${minutes} min drive`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `~${hours}h drive`;
  return `~${hours}h ${rem}m drive`;
}

/**
 * Distance plus drive time for cards/detail/claim.
 * Returns null when the user has not shared location (do not invent a time).
 */
export function formatDistanceWithDrive(miles: number | null | undefined): string | null {
  if (!hasMeasuredDistance(miles)) return null;
  const distance = formatDistance(miles).replace(' away', '');
  const drive = formatDriveTime(miles);
  return drive ? `${distance} · ${drive}` : distance;
}

/**
 * Pickup hold length in minutes: max(2 hours, drive + 45 min).
 * Without a measured distance this degrades to the 2-hour floor.
 */
export function estimatePickupWindowMinutes(miles: number | null | undefined): number {
  const drive = estimateDriveMinutes(miles);
  if (drive == null) return MIN_PICKUP_WINDOW_MINUTES;
  return Math.max(MIN_PICKUP_WINDOW_MINUTES, drive + PICKUP_SLACK_MINUTES);
}

/** Arrive-by instant: the pickup window, never past the listing deadline. */
export function estimatePickupExpiry(
  miles: number | null | undefined,
  listingDeadlineIso: string,
  now: Date = new Date()
): Date {
  const uncapped = now.getTime() + estimatePickupWindowMinutes(miles) * 60_000;
  const deadline = new Date(listingDeadlineIso).getTime();
  return new Date(Math.min(uncapped, deadline));
}

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const BIGDATACLOUD_REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

function isUsefulAddress(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  // Country-only or coordinate dumps are not enough to publish a pickup spot.
  if (trimmed.length < 5) return false;
  return true;
}

function joinAddressParts(parts: Array<string | null | undefined>): string | null {
  const seen = new Set<string>();
  const unique = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const joined = unique.join(', ');
  return isUsefulAddress(joined) ? joined : null;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
  const url = `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=jsonv2&addressdetails=1`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimReverseResponse;
  const street = joinAddressParts([data.address?.house_number, data.address?.road || data.address?.pedestrian]);
  const locality = data.address?.neighbourhood || data.address?.suburb || data.address?.city || data.address?.town || data.address?.village || data.address?.hamlet;
  const composed = joinAddressParts([
    street,
    locality,
    data.address?.county,
    data.address?.state,
    data.address?.postcode,
  ]);
  if (composed) return composed;
  return isUsefulAddress(data.display_name) ? data.display_name.trim() : null;
}

interface BigDataCloudReverseResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  postcode?: string;
  countryName?: string;
  localityInfo?: {
    informative?: Array<{ name?: string; description?: string }>;
    administrative?: Array<{ name?: string; description?: string }>;
  };
}

function streetFromBigDataCloud(data: BigDataCloudReverseResponse): string | null {
  const hints = [...(data.localityInfo?.informative || []), ...(data.localityInfo?.administrative || [])];
  const streetHint = hints.find((item) => {
    const description = item.description?.toLowerCase() || '';
    return description.includes('street') || description.includes('road') || description.includes('avenue');
  });
  return streetHint?.name?.trim() || null;
}

async function reverseGeocodeBigDataCloud(lat: number, lng: number): Promise<string | null> {
  const url = `${BIGDATACLOUD_REVERSE_URL}?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&localityLanguage=en`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as BigDataCloudReverseResponse;
  const composed = joinAddressParts([
    streetFromBigDataCloud(data),
    data.locality,
    data.city,
    data.principalSubdivision,
    data.postcode,
  ]);
  return composed;
}

/**
 * Browser-callable reverse geocode. Prefers Nominatim for street-level results,
 * then BigDataCloud's keyless client endpoint if Nominatim is CORS-blocked.
 * Returns null when nothing useful enough to prefill a pickup address.
 */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const nominatim = await reverseGeocodeNominatim(lat, lng);
    if (nominatim) return nominatim;
  } catch {
    // Nominatim often blocks browser CORS; fall through to the client endpoint.
  }

  try {
    return await reverseGeocodeBigDataCloud(lat, lng);
  } catch {
    return null;
  }
}
