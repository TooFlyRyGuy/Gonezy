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
  if (miles === null || miles === undefined || isNaN(miles)) {
    return 'Nearby';
  }
  if (miles < 0.2) {
    return '< 0.2 mi away';
  }
  return `${miles.toFixed(1)} mi away`;
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
