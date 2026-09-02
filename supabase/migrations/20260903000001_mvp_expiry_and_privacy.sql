-- ====================================================================
-- Migration: 20260903000001_mvp_expiry_and_privacy.sql
-- Project: Gonezy MVP
-- Correctness fixes:
--   1. Live price on public_listings via get_current_listing_price(NOW())
--   2. Hide exact pickup location from the listings table for non-parties
--   3. Scheduled + callable expiry for listings and pickup no-shows
--   4. Authoritative server time helper
-- Does not disable RLS.
-- ====================================================================

-- 1. Authoritative clock for clients
CREATE OR REPLACE FUNCTION public.get_server_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT NOW();
$$;

GRANT EXECUTE ON FUNCTION public.get_server_now() TO anon, authenticated;

-- 2. Listing expiry (security definer so feed clients can run it)
CREATE OR REPLACE FUNCTION public.expire_overdue_listings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.listings
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND pickup_deadline <= NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_overdue_listings() TO anon, authenticated;

-- 3. Claim pickup-window expiry → no_show, then reopen or expire the listing
CREATE OR REPLACE FUNCTION public.expire_overdue_claims()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.id AS claim_id, c.listing_id, l.pickup_deadline
    FROM public.claims c
    JOIN public.listings l ON l.id = c.listing_id
    WHERE c.status IN ('pending', 'active')
      AND c.pickup_expires_at <= NOW()
    FOR UPDATE OF c
  LOOP
    UPDATE public.claims
    SET
      status = 'no_show',
      updated_at = NOW()
    WHERE id = r.claim_id;

    IF r.pickup_deadline <= NOW() THEN
      UPDATE public.listings
      SET status = 'expired', updated_at = NOW()
      WHERE id = r.listing_id AND status = 'claimed';
    ELSE
      UPDATE public.listings
      SET status = 'active', updated_at = NOW()
      WHERE id = r.listing_id AND status = 'claimed';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_overdue_claims() TO anon, authenticated;

-- 4. Recreate public_listings with live price and the same address mask
CREATE OR REPLACE VIEW public.public_listings AS
SELECT
  l.id,
  l.seller_id,
  l.title,
  l.description,
  l.category_id,
  l.condition,
  l.estimated_value,
  l.status,
  CASE
    WHEN auth.uid() IS NOT NULL AND (
      l.seller_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.listing_id = l.id
          AND c.buyer_id = auth.uid()
          AND c.status IN ('active', 'completed')
      )
    ) THEN l.pickup_address_text
    ELSE 'Approximate pickup area (exact address revealed upon claim)'
  END AS pickup_address_text,
  CASE
    WHEN auth.uid() IS NOT NULL AND (
      l.seller_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.listing_id = l.id
          AND c.buyer_id = auth.uid()
          AND c.status IN ('active', 'completed')
      )
    ) THEN l.pickup_latitude
    ELSE NULL
  END AS pickup_latitude,
  CASE
    WHEN auth.uid() IS NOT NULL AND (
      l.seller_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.listing_id = l.id
          AND c.buyer_id = auth.uid()
          AND c.status IN ('active', 'completed')
      )
    ) THEN l.pickup_longitude
    ELSE NULL
  END AS pickup_longitude,
  l.approximate_public_latitude,
  l.approximate_public_longitude,
  l.available_from,
  l.pickup_deadline,
  public.get_current_listing_price(l.id, NOW()) AS current_price,
  l.original_price,
  (public.get_current_listing_price(l.id, NOW()) = 0) AS is_free,
  l.created_at,
  l.updated_at
FROM public.listings l;

-- Prefer owner rights so the view can read listings and still mask columns
DO $$
BEGIN
  ALTER VIEW public.public_listings SET (security_invoker = false);
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'security_invoker not supported: %', SQLERRM;
END $$;

GRANT SELECT ON public.public_listings TO anon, authenticated;

-- 5. Full listing rows (exact address / lat / lng) only for seller or claimant
DROP POLICY IF EXISTS "Public can view active listings and sellers can view own" ON public.listings;
DROP POLICY IF EXISTS "Sellers and claimants can view full listing rows" ON public.listings;
CREATE POLICY "Sellers and claimants can view full listing rows"
  ON public.listings FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND seller_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.listing_id = listings.id
        AND c.buyer_id = auth.uid()
        AND c.status IN ('pending', 'active', 'completed')
    )
  );

-- 6. Best-effort minute schedule. Safe if pg_cron is missing.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('gonezy-expire-listings', 'gonezy-expire-claims');

    PERFORM cron.schedule(
      'gonezy-expire-listings',
      '* * * * *',
      'SELECT public.expire_overdue_listings();'
    );
    PERFORM cron.schedule(
      'gonezy-expire-claims',
      '* * * * *',
      'SELECT public.expire_overdue_claims();'
    );
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not schedule expiry jobs: %', SQLERRM;
END $$;
