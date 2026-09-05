import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  DEFAULT_APP_URL,
  FALLBACK_APP_URL,
  FROM_ADDRESS,
  emailHtml,
  emailSubject,
  emailText,
  formatDistanceLabel,
  haversineMiles,
  listingDeepLink,
  type DropEmailListing,
} from './email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthUserLike {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  deleted_at?: string | null;
}

interface ProfileCoords {
  id: string;
  home_latitude: number | null;
  home_longitude: number | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractListingId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  if (typeof body.listing_id === 'string' && body.listing_id.trim()) {
    return body.listing_id.trim();
  }
  const record = body.record;
  if (record && typeof record === 'object') {
    const id = (record as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

function appUrl(): string {
  const configured = (Deno.env.get('GONEZY_APP_URL') || '').trim().replace(/\/+$/, '');
  return configured || DEFAULT_APP_URL;
}

function isSendableUser(user: AuthUserLike, sellerId: string): user is AuthUserLike & { email: string } {
  if (!user.email || !user.email.includes('@')) return false;
  if (user.id === sellerId) return false;
  if (user.deleted_at) return false;
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return false;
  return true;
}

async function listAuthUsers(
  admin: ReturnType<typeof createClient>
): Promise<AuthUserLike[]> {
  const users: AuthUserLike[] = [];
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }
  return users;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

  const resendKey = (Deno.env.get('RESEND_API_KEY') || '').trim();
  if (!resendKey) {
    console.error('notify-new-drop: RESEND_API_KEY is not set');
    return json({ ok: true, skipped: true, reason: 'RESEND_API_KEY missing' });
  }

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const listingId = extractListingId(payload);
  if (!listingId) {
    return json({ error: 'listing_id required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Supabase service credentials missing' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listing, error: listingError } = await admin
    .from('listings')
    .select(
      'id, seller_id, title, status, current_price, is_free, approximate_public_latitude, approximate_public_longitude, drop_email_sent_at'
    )
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) {
    console.error('notify-new-drop: listing load failed', listingError);
    return json({ error: 'Could not load listing' }, 500);
  }
  if (!listing) {
    return json({ ok: true, skipped: true, reason: 'listing not found' });
  }
  if (listing.status !== 'active') {
    return json({ ok: true, skipped: true, reason: 'listing not active' });
  }

  // Never use pickup_address_text / exact pickup coords in the email.
  const emailListing: DropEmailListing = {
    id: listing.id,
    title: listing.title,
    current_price: listing.current_price,
    is_free: listing.is_free,
  };

  const { data: claimed, error: claimError } = await admin
    .from('listings')
    .update({ drop_email_sent_at: new Date().toISOString() })
    .eq('id', listingId)
    .is('drop_email_sent_at', null)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (claimError) {
    console.error('notify-new-drop: claim lock failed', claimError);
    return json({ error: 'Could not claim send lock' }, 500);
  }
  if (!claimed) {
    return json({ ok: true, skipped: true, reason: 'already notified' });
  }

  try {
    const [authUsers, profilesRes] = await Promise.all([
      listAuthUsers(admin),
      admin.from('profiles').select('id, home_latitude, home_longitude'),
    ]);

    if (profilesRes.error) {
      throw profilesRes.error;
    }

    const coordsById = new Map<string, ProfileCoords>(
      ((profilesRes.data || []) as ProfileCoords[]).map((p) => [p.id, p])
    );

    const listingLat = listing.approximate_public_latitude;
    const listingLng = listing.approximate_public_longitude;
    const listingUrl = listingDeepLink(listing.id, appUrl()) || listingDeepLink(listing.id, FALLBACK_APP_URL);
    const recipients = authUsers.filter((user) => isSendableUser(user, listing.seller_id));

    const emails = recipients.map((user) => {
      const home = coordsById.get(user.id);
      let miles: number | null = null;
      if (
        home?.home_latitude != null &&
        home?.home_longitude != null &&
        listingLat != null &&
        listingLng != null
      ) {
        miles = haversineMiles(home.home_latitude, home.home_longitude, listingLat, listingLng);
      }
      const distanceLabel = formatDistanceLabel(miles);
      return {
        from: FROM_ADDRESS,
        to: [user.email as string],
        subject: emailSubject(emailListing),
        html: emailHtml({ listing: emailListing, distanceLabel, listingUrl }),
        text: emailText({ listing: emailListing, distanceLabel, listingUrl }),
      };
    });

    if (emails.length === 0) {
      return json({ ok: true, emailed: 0, skipped_seller: true });
    }

    const resendRes = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `listing-drop-${listing.id}`,
      },
      body: JSON.stringify(emails),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      throw new Error(
        typeof resendBody?.message === 'string'
          ? resendBody.message
          : `Resend ${resendRes.status}`
      );
    }

    return json({
      ok: true,
      emailed: emails.length,
      skipped_seller: true,
    });
  } catch (error) {
    console.error('notify-new-drop: send failed', error);
    const { error: unlockError } = await admin
      .from('listings')
      .update({ drop_email_sent_at: null })
      .eq('id', listingId);
    if (unlockError) {
      console.error('notify-new-drop: unlock failed', unlockError);
    }
    return json({ error: 'Could not send drop emails' }, 502);
  }
});

