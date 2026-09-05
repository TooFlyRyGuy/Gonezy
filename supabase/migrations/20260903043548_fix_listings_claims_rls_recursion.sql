-- ====================================================================
-- Migration: 20260903043548_fix_listings_claims_rls_recursion.sql
-- Project: Gonezy
-- Already applied live on evtgtzgrnvzjnrkmnwcx.
-- Breaks listings <-> claims RLS recursion that caused
-- "infinite recursion detected in policy for relation 'listings'"
-- on INSERT ... RETURNING. Does not disable RLS.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.user_owns_listing(_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = _listing_id
      AND l.seller_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_listing_claimant(_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.claims c
    WHERE c.listing_id = _listing_id
      AND c.buyer_id = auth.uid()
      AND c.status IN ('pending', 'active', 'completed')
  );
$$;

REVOKE ALL ON FUNCTION public.user_owns_listing(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_is_listing_claimant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_listing(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_listing_claimant(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Sellers and claimants can view full listing rows" ON public.listings;
CREATE POLICY "Sellers and claimants can view full listing rows"
  ON public.listings FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND seller_id = auth.uid())
    OR public.user_is_listing_claimant(id)
  );

DROP POLICY IF EXISTS "Buyers and sellers can view relevant claims" ON public.claims;
CREATE POLICY "Buyers and sellers can view relevant claims"
  ON public.claims FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR public.user_owns_listing(listing_id)
  );

DROP POLICY IF EXISTS "Claimants and sellers can update claims" ON public.claims;
CREATE POLICY "Claimants and sellers can update claims"
  ON public.claims FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR public.user_owns_listing(listing_id)
  );
