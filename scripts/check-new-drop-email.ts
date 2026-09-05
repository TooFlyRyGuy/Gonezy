import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import {
  emailHtml,
  emailSubject,
  emailText,
  formatDistanceLabel,
  formatPriceLabel,
  listingDeepLink,
} from '../supabase/functions/notify-new-drop/email.ts';
import { parseListingDeepLink } from '../src/utils/listingDeepLink.ts';

const listing = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Oak desk, must go today',
  current_price: 0,
  is_free: true,
};

const html = emailHtml({
  listing,
  distanceLabel: formatDistanceLabel(1.4),
  listingUrl: listingDeepLink(listing.id),
});
const text = emailText({
  listing,
  distanceLabel: formatDistanceLabel(null),
  listingUrl: listingDeepLink(listing.id, 'https://gonezy.vercel.app'),
});

assert.equal(emailSubject(listing), 'FREE nearby: Oak desk, must go today');
assert.equal(formatPriceLabel(25), '$25');
assert.equal(formatDistanceLabel(null), 'Nearby');
assert.match(html, /gonezy\.com\/listing\/11111111-1111-4111-8111-111111111111/);
assert.doesNotMatch(html, /123 Market|pickup_address|30\.2672/);
assert.doesNotMatch(text, /123 Market|pickup_address/);
assert.match(text, /Nearby/);
assert.match(html, /Make it gone\. Easy\./);
assert.equal(
  parseListingDeepLink({ pathname: `/listing/${listing.id}`, search: '' }),
  listing.id
);
assert.equal(parseListingDeepLink({ pathname: '/reset-password', search: '' }), null);

writeFileSync('/tmp/gonezy-drop-email-preview.html', html);
console.log('new-drop email checks passed');
