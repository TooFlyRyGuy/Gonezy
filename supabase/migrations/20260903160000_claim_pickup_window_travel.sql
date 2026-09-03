-- ====================================================================
-- Migration: 20260903160000_claim_pickup_window_travel.sql
-- Pickup hold = max(2 hours, estimated drive + 45 min), capped at
-- listings.pickup_deadline. Distance uses approximate public coords
-- so claiming does not leak the exact pin. Optional buyer lat/lng;
-- missing coords degrade to the existing 2-hour floor.
-- Does not disable RLS. Does not change listings/claims RLS policies.
-- ====================================================================

DROP FUNCTION IF EXISTS public.claim_listing(uuid, uuid);
DROP FUNCTION IF EXISTS public.claim_listing(uuid, uuid, double precision, double precision);

CREATE FUNCTION public.claim_listing(
  p_listing_id UUID,
  p_buyer_id UUID DEFAULT auth.uid(),
  p_buyer_lat DOUBLE PRECISION DEFAULT NULL,
  p_buyer_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_listing RECORD;
  v_claim_id UUID;
  v_current_price NUMERIC;
  v_pickup_expiry TIMESTAMPTZ;
  v_existing_claim_id UUID;
  v_distance_miles DOUBLE PRECISION;
  v_drive_minutes INTEGER;
  v_window_minutes INTEGER;
  v_remain_mins INTEGER;
  v_hours INTEGER;
  v_mins INTEGER;
  v_window_copy TEXT;
BEGIN
  v_caller_id := COALESCE(p_buyer_id, auth.uid());

  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to claim a listing');
  END IF;

  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.seller_id = v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot claim your own listing');
  END IF;

  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing is no longer active (status: ' || v_listing.status || ')');
  END IF;

  IF NOW() >= v_listing.pickup_deadline THEN
    UPDATE public.listings SET status = 'expired', updated_at = NOW() WHERE id = p_listing_id;
    RETURN jsonb_build_object('success', false, 'error', 'Listing deadline has passed and is now expired');
  END IF;

  SELECT id INTO v_existing_claim_id
  FROM public.claims
  WHERE listing_id = p_listing_id AND status IN ('pending', 'active')
  LIMIT 1;

  IF v_existing_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This item has already been claimed by another buyer');
  END IF;

  v_current_price := public.get_current_listing_price(p_listing_id, NOW());

  -- Default: 2-hour floor, still never past the seller's Gone-by.
  v_window_minutes := 120;

  -- Optional buyer coords + approximate public pin (never the exact pickup point).
  -- 28 mph effective local average matches src/utils/geo.ts. Not live traffic.
  IF p_buyer_lat IS NOT NULL
     AND p_buyer_lng IS NOT NULL
     AND v_listing.approximate_public_latitude IS NOT NULL
     AND v_listing.approximate_public_longitude IS NOT NULL
     AND p_buyer_lat BETWEEN -90 AND 90
     AND p_buyer_lng BETWEEN -180 AND 180
  THEN
    v_distance_miles := 3958.8 * 2 * asin(sqrt(
      power(sin(radians(v_listing.approximate_public_latitude - p_buyer_lat) / 2), 2) +
      cos(radians(p_buyer_lat)) * cos(radians(v_listing.approximate_public_latitude)) *
      power(sin(radians(v_listing.approximate_public_longitude - p_buyer_lng) / 2), 2)
    ));
    v_drive_minutes := GREATEST(1, ROUND(v_distance_miles / 28.0 * 60.0)::integer);
    v_window_minutes := GREATEST(120, v_drive_minutes + 45);
  END IF;

  v_pickup_expiry := LEAST(NOW() + make_interval(mins => v_window_minutes), v_listing.pickup_deadline);

  INSERT INTO public.claims (
    listing_id,
    buyer_id,
    price_at_claim,
    status,
    claimed_at,
    pickup_expires_at
  )
  VALUES (
    p_listing_id,
    v_caller_id,
    v_current_price,
    'active',
    NOW(),
    v_pickup_expiry
  )
  RETURNING id INTO v_claim_id;

  UPDATE public.listings
  SET
    status = 'claimed',
    current_price = v_current_price,
    updated_at = NOW()
  WHERE id = p_listing_id;

  v_remain_mins := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_pickup_expiry - NOW())) / 60.0)::integer);
  v_hours := v_remain_mins / 60;
  v_mins := v_remain_mins % 60;
  IF v_hours > 0 AND v_mins = 0 THEN
    v_window_copy := v_hours::text || CASE WHEN v_hours = 1 THEN ' hour' ELSE ' hours' END;
  ELSIF v_hours > 0 THEN
    v_window_copy := v_hours::text || CASE WHEN v_hours = 1 THEN ' hour ' ELSE ' hours ' END
      || v_mins::text || CASE WHEN v_mins = 1 THEN ' minute' ELSE ' minutes' END;
  ELSE
    v_window_copy := v_remain_mins::text || CASE WHEN v_remain_mins = 1 THEN ' minute' ELSE ' minutes' END;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    listing_id,
    claim_id
  )
  VALUES (
    v_listing.seller_id,
    'item_claimed',
    'Your item was claimed!',
    'A buyer claimed "' || v_listing.title || '" for $' || v_current_price
      || '. Pickup window expires in ' || v_window_copy || '.',
    p_listing_id,
    v_claim_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'price_at_claim', v_current_price,
    'pickup_expires_at', v_pickup_expiry
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.claim_listing(uuid, uuid, double precision, double precision)
  TO anon, authenticated;
