/** Pure helpers for new-drop buyer emails. No Deno / Resend imports. */

export const DEFAULT_APP_URL = 'https://gonezy.com';
export const FALLBACK_APP_URL = 'https://gonezy.vercel.app';
export const FROM_ADDRESS = 'Gonezy <noreply@gonezy.com>';

export interface DropEmailListing {
  id: string;
  title: string;
  current_price: number | string | null;
  is_free: boolean | null;
}

export function listingDeepLink(listingId: string, appUrl = DEFAULT_APP_URL): string {
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/+$/, '') || DEFAULT_APP_URL;
  return `${base}/listing/${listingId}`;
}

export function formatPriceLabel(price: number | string | null | undefined): string {
  const n = typeof price === 'string' ? Number(price) : price;
  if (n == null || Number.isNaN(n) || n <= 0) return 'FREE';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function formatDistanceLabel(miles: number | null | undefined): string {
  if (miles == null || Number.isNaN(miles)) return 'Nearby';
  if (miles < 0.2) return '< 0.2 mi away';
  return `${miles.toFixed(1)} mi away`;
}

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8;
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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function truncateTitle(title: string, max = 72): string {
  const trimmed = title.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function isFreeNow(listing: DropEmailListing): boolean {
  if (listing.is_free) return true;
  const n = typeof listing.current_price === 'string' ? Number(listing.current_price) : listing.current_price;
  return n == null || Number.isNaN(n) || n <= 0;
}

export function priceHint(listing: DropEmailListing): string {
  if (isFreeNow(listing)) {
    return 'It is FREE right now. Claim before the price steps up.';
  }
  return `Currently ${formatPriceLabel(listing.current_price)}. The free window may already be gone — grab it while it is nearby.`;
}

export function emailSubject(listing: DropEmailListing): string {
  const title = truncateTitle(listing.title || 'New listing');
  return isFreeNow(listing) ? `FREE nearby: ${title}` : `New drop nearby: ${title}`;
}

export function emailText(input: {
  listing: DropEmailListing;
  distanceLabel: string;
  listingUrl: string;
}): string {
  const { listing, distanceLabel, listingUrl } = input;
  const title = truncateTitle(listing.title || 'New listing');
  return [
    'Gonezy — Make it gone. Easy.',
    '',
    title,
    distanceLabel,
    priceHint(listing),
    '',
    `Claim it: ${listingUrl}`,
    '',
    'Exact pickup address stays hidden until you claim.',
  ].join('\n');
}

export function emailHtml(input: {
  listing: DropEmailListing;
  distanceLabel: string;
  listingUrl: string;
}): string {
  const { listing, distanceLabel, listingUrl } = input;
  const title = escapeHtml(truncateTitle(listing.title || 'New listing'));
  const hint = escapeHtml(priceHint(listing));
  const distance = escapeHtml(distanceLabel);
  const href = escapeHtml(listingUrl);
  const price = escapeHtml(formatPriceLabel(listing.current_price));
  const isFree = isFreeNow(listing);
  const badgeBg = isFree ? '#22C55E' : '#F97316';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#05060B;color:#E2E8F0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05060B;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0A0C14;border:1px solid #1E2433;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;border-bottom:1px solid #1E2433;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.4px;">
                  Gone<span style="color:#F97316;">zy</span>
                </p>
                <p style="margin:6px 0 0;font-size:12px;color:#94A3B8;">Make it gone. Easy.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;">
                  <span style="display:inline-block;background:${badgeBg};color:#FFFFFF;font-weight:800;font-size:13px;padding:6px 12px;border-radius:999px;">
                    ${price} · ${distance}
                  </span>
                </p>
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#FFFFFF;">${title}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#CBD5E1;">
                  ${hint}
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${href}" style="display:inline-block;background:#F97316;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:15px;padding:14px 22px;border-radius:14px;">
                    Claim this drop
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#64748B;">
                  Nearby deals move fast. Exact pickup address stays hidden until you claim.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
