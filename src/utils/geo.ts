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
