-- ====================================================================
-- Migration: 20260905155155_notify_new_drop.sql
-- Email other buyers when a listing is published (active).
-- pg_net POSTs to the notify-new-drop Edge Function. Client invoke
-- is a backup if the HTTP call is missing. Idempotency lives on
-- listings.drop_email_sent_at (claimed by the function, not here).
-- Does not email the seller. Does not expose pickup address.
-- Does not drop buyer_interests or other unused tables.
-- ====================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS drop_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.drop_email_sent_at IS
  'Set by notify-new-drop after buyer emails are sent (or skipped). Existing rows are backfilled so old listings cannot be blasted.';

-- Existing listings must not trigger a neighborhood-wide email if the
-- public Edge Function is invoked with their id after deploy.
UPDATE public.listings
SET drop_email_sent_at = COALESCE(drop_email_sent_at, created_at)
WHERE drop_email_sent_at IS NULL;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'pg_net not available: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION private.notify_new_listing_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_body JSONB;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Never put pickup_address_text / exact coords in this payload.
  v_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'listing_id', NEW.id,
    'record', jsonb_build_object(
      'id', NEW.id,
      'seller_id', NEW.seller_id,
      'title', NEW.title,
      'status', NEW.status,
      'current_price', NEW.current_price,
      'is_free', NEW.is_free
    )
  );

  v_url := 'https://evtgtzgrnvzjnrkmnwcx.supabase.co/functions/v1/notify-new-drop';

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := v_body,
      timeout_milliseconds := 8000
    );
  ELSE
    RAISE NOTICE 'pg_net missing; notify-new-drop trigger skipped for listing %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_new_listing_drop() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.notify_new_listing_drop() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_listings_notify_new_drop ON public.listings;
CREATE TRIGGER trg_listings_notify_new_drop
  AFTER INSERT OR UPDATE OF status
  ON public.listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION private.notify_new_listing_drop();
