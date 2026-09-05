const LISTING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_LISTING_RE = /^preview-[a-z0-9-]+$/i;

export function isListingDeepLinkId(value: string | null | undefined): value is string {
  if (!value) return false;
  return LISTING_ID_RE.test(value) || PREVIEW_LISTING_RE.test(value);
}

export function parseListingDeepLink(location: {
  pathname?: string;
  search?: string;
} | null | undefined): string | null {
  if (!location) return null;
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  const match = path.match(/^\/listing\/([^/]+)$/i);
  if (match && isListingDeepLinkId(match[1])) {
    return match[1];
  }
  const params = new URLSearchParams(location.search || '');
  const fromQuery = params.get('listing');
  if (isListingDeepLinkId(fromQuery)) {
    return fromQuery;
  }
  return null;
}

export function listingPath(listingId: string): string {
  return `/listing/${listingId}`;
}
