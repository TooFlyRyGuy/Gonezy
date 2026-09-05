# New-drop buyer emails

When a listing is published (`status = 'active'`), Gonezy emails every other account that has an email so they can claim during the FREE / urgency window.

This is v1 for a ~15-person neighborhood test. It does **not** do Wanted matching, category interests, push, SMS, waitlists, or backup-claim mail. `buyer_interests` stays in the database unused.

## How it fires

1. **Primary:** a Postgres trigger (`private.notify_new_listing_drop`) POSTs to this Edge Function via `pg_net` on listing insert, or when status becomes `active`.
2. **Backup:** `listingService.createListing` invokes the same function after a successful publish (photos + price windows). The function no-ops if mail already went out.

The function re-reads the listing with the service role, **excludes the seller**, and never puts the exact pickup address in the email. Title, rough distance or “Nearby”, current price / FREE hint, and a deep link only.

Deep links: `https://gonezy.com/listing/<id>` (override with `GONEZY_APP_URL`; fallback origin is `https://gonezy.vercel.app`).

## Secrets Fun must set

Set these on the **Supabase** project `evtgtzgrnvzjnrkmnwcx`, not as Vercel `VITE_*` vars. The Vite app cannot send mail; Auth SMTP is a different credential and must not be reused here.

Dashboard: [Edge Functions → Secrets](https://supabase.com/dashboard/project/evtgtzgrnvzjnrkmnwcx/functions)

| Name | Required | What to paste |
| --- | --- | --- |
| `RESEND_API_KEY` | **Yes** | API key from [Resend → API Keys](https://resend.com/api-keys). Starts with `re_`. Domain `gonezy.com` is already Verified. This is **not** the Supabase Auth SMTP password. |
| `GONEZY_APP_URL` | No | Deep-link origin. Defaults to `https://gonezy.com`. Use `https://gonezy.vercel.app` only if the custom domain is down. |

CLI (from this repo, after `npx supabase login`):

```bash
npx supabase secrets set RESEND_API_KEY=re_your_real_key --project-ref evtgtzgrnvzjnrkmnwcx
# optional
npx supabase secrets set GONEZY_APP_URL=https://gonezy.com --project-ref evtgtzgrnvzjnrkmnwcx
```

Do **not** put `RESEND_API_KEY` in Vercel. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` stay as they are.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into Edge Functions. Do not add them by hand.

## Deploy

The migration (`notify_new_drop`) and Edge Function are already applied on live project `evtgtzgrnvzjnrkmnwcx`. New publishes will hit the function immediately; without `RESEND_API_KEY` they no-op. Deep links (`/listing/<id>`) ship with this PR’s Vercel deploy.

To redeploy after a code change:

```bash
npx supabase db push --project-ref evtgtzgrnvzjnrkmnwcx
npx supabase functions deploy notify-new-drop --project-ref evtgtzgrnvzjnrkmnwcx --no-verify-jwt
```

`verify_jwt` is off because `pg_net` does not send a user JWT. Safety is: the listing must exist and be `active`, and `listings.drop_email_sent_at` allows only one send. Existing listings are backfilled so they cannot be blasted.

From address is hard-coded: **Gonezy \<noreply@gonezy.com\>**.

## How to test

1. Set `RESEND_API_KEY` and deploy the function + migration.
2. Sign in as **user A** (seller) on https://gonezy.com (or https://gonezy.vercel.app).
3. Post a new listing (photo, title, pickup, Publish).
4. Open **user B**’s inbox (any other confirmed Gonezy account). You should get a branded email within about a minute:
   - Subject like `FREE nearby: Oak desk, must go today`
   - No street address
   - Orange **Claim this drop** button → `/listing/<id>`
5. User A must **not** receive mail about their own listing.
6. Publishing the same listing again is impossible; invoking the function twice with the same id returns `{ skipped: true, reason: "already notified" }`.

If mail does not arrive:

- Confirm the secret is on the **Supabase** project, then redeploy is not required for secret changes — just retry a **new** listing (the first send claims the lock).
- Dashboard logs: [notify-new-drop logs](https://supabase.com/dashboard/project/evtgtzgrnvzjnrkmnwcx/functions)
- Resend: [logs](https://resend.com/emails) for `noreply@gonezy.com`
- If `RESEND_API_KEY` is missing, publish still succeeds and the function returns `{ skipped: true, reason: "RESEND_API_KEY missing" }`.
