import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  filterDropRecipients,
  normalizeDropEmailMode,
  shouldSendDropEmail,
} from '../supabase/functions/notify-new-drop/recipients.ts';
import { normalizePickupInterests } from '../src/utils/pickupInterests.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const furniture = 'cat-furniture';
const scrap = 'cat-scrap';
const sellerId = 'seller-1';

const consumerAll = {
  id: 'consumer-all',
  accountType: 'consumer',
  dropEmailMode: 'all',
  categoryIds: [furniture],
};
const consumerMatchingFurniture = {
  id: 'consumer-furniture',
  accountType: 'consumer',
  dropEmailMode: 'matching',
  categoryIds: [furniture],
};
const consumerMatchingScrap = {
  id: 'consumer-scrap',
  accountType: 'consumer',
  dropEmailMode: 'matching',
  categoryIds: [scrap],
};
const consumerMatchingEmpty = {
  id: 'consumer-empty-matching',
  accountType: 'consumer',
  dropEmailMode: 'matching',
  categoryIds: [] as string[],
};
const consumerNoPrefs = {
  id: 'consumer-none',
  accountType: 'consumer',
  dropEmailMode: null,
  categoryIds: [] as string[],
};
const businessHauler = {
  id: 'biz-1',
  accountType: 'business',
  dropEmailMode: 'matching',
  categoryIds: [scrap],
};
const seller = {
  id: sellerId,
  accountType: 'consumer',
  dropEmailMode: 'all',
  categoryIds: [furniture],
};

assert.equal(normalizeDropEmailMode(undefined), 'all');
assert.equal(normalizeDropEmailMode('matching'), 'matching');

assert.equal(
  shouldSendDropEmail({ recipient: seller, sellerId, listingCategoryId: furniture }),
  false,
  'seller never gets the drop email'
);
assert.equal(
  shouldSendDropEmail({ recipient: consumerMatchingFurniture, sellerId, listingCategoryId: furniture }),
  true,
  'Furniture tap + matching gets a Furniture drop'
);
assert.equal(
  shouldSendDropEmail({ recipient: consumerMatchingScrap, sellerId, listingCategoryId: furniture }),
  false,
  'Scrap-only tap does not get a Furniture drop'
);
assert.equal(
  shouldSendDropEmail({ recipient: consumerAll, sellerId, listingCategoryId: scrap }),
  true,
  'All-mail consumer still gets a Scrap drop even after tapping Furniture'
);
assert.equal(
  shouldSendDropEmail({ recipient: consumerNoPrefs, sellerId, listingCategoryId: furniture }),
  true,
  'consumer who tapped nothing still gets mail'
);
assert.equal(
  shouldSendDropEmail({ recipient: consumerMatchingEmpty, sellerId, listingCategoryId: scrap }),
  true,
  'matching + zero taps cannot strand them — keep all-mail'
);
assert.equal(
  shouldSendDropEmail({ recipient: businessHauler, sellerId, listingCategoryId: furniture }),
  true,
  'business accounts keep today’s mail (no interest filter)'
);
assert.equal(
  shouldSendDropEmail({
    recipient: consumerMatchingFurniture,
    sellerId,
    listingCategoryId: null,
  }),
  false,
  'matching consumer is not emailed when the listing has no category'
);

const emailed = filterDropRecipients({
  recipients: [
    seller,
    consumerAll,
    consumerMatchingFurniture,
    consumerMatchingScrap,
    consumerNoPrefs,
    businessHauler,
  ],
  sellerId,
  listingCategoryId: furniture,
}).map((r) => r.id);

assert.deepEqual(emailed, ['consumer-all', 'consumer-furniture', 'consumer-none', 'biz-1']);

const savedMatchingEmpty = normalizePickupInterests({
  categoryIds: [],
  lookingFor: '  oak dresser  ',
  dropEmailMode: 'matching',
});
assert.equal(savedMatchingEmpty.dropEmailMode, 'all');
assert.equal(savedMatchingEmpty.lookingFor, 'oak dresser');

const savedMatching = normalizePickupInterests({
  categoryIds: [furniture, furniture, ''],
  lookingFor: 'working fridge',
  dropEmailMode: 'matching',
});
assert.deepEqual(savedMatching.categoryIds, [furniture]);
assert.equal(savedMatching.dropEmailMode, 'matching');

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const bottomNav = readFileSync(join(root, 'src/components/layout/BottomNav.tsx'), 'utf8');
const header = readFileSync(join(root, 'src/components/layout/Header.tsx'), 'utf8');
const tabs = readFileSync(join(root, 'src/types/marketplace.ts'), 'utf8');
assert.doesNotMatch(app, /WantedItemsView/);
assert.doesNotMatch(bottomNav, /Wanted/i);
assert.doesNotMatch(header, /Wanted/i);
assert.match(tabs, /export type NavigationTab = 'explore' \| 'sell' \| 'activity' \| 'profile'/);

const profile = readFileSync(join(root, 'src/components/profile/ProfileView.tsx'), 'utf8');
assert.match(profile, /accountType === 'consumer' && \(user \|\| isPreviewMode\(\)\)/);
assert.match(profile, /PickupInterestsCard/);
assert.doesNotMatch(profile, /Wanted/);

const auth = readFileSync(join(root, 'src/components/auth/AuthModal.tsx'), 'utf8');
assert.match(auth, /onSignedUp\?\.\(\{ accountType \}\)/);

const migration = readFileSync(
  join(root, 'supabase/migrations/20260911185836_pickup_profile_interests.sql'),
  'utf8'
);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.profile_pickup_prefs/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.profile_interest_categories/);
assert.match(migration, /buyer_interests stays unused/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /auth\.uid\(\) = user_id/);
assert.doesNotMatch(migration, /ON public\.profile_pickup_prefs FOR SELECT[\s\S]*USING \(true\)/);
assert.doesNotMatch(migration, /ON public\.profile_interest_categories FOR SELECT[\s\S]*USING \(true\)/);
assert.match(migration, /REVOKE ALL ON TABLE public\.profile_pickup_prefs FROM anon/);
assert.match(migration, /REVOKE ALL ON TABLE public\.profile_interest_categories FROM anon/);
assert.match(migration, /looking_for TEXT NOT NULL DEFAULT ''/);
assert.doesNotMatch(migration, /ALTER TABLE public\.profiles/);

const edge = readFileSync(join(root, 'supabase/functions/notify-new-drop/index.ts'), 'utf8');
assert.match(edge, /filterDropRecipients/);
assert.match(edge, /profile_pickup_prefs/);
assert.match(edge, /profile_interest_categories/);
assert.match(edge, /category_id/);
assert.doesNotMatch(edge, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(edge, /VITE_RESEND/);

const clientLib = readFileSync(join(root, 'src/lib/supabase.ts'), 'utf8');
assert.doesNotMatch(clientLib, /SERVICE_ROLE/);

console.log('pickup interest checks passed');
