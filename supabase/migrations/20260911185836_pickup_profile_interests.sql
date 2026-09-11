-- ====================================================================
-- Migration: 20260911185836_pickup_profile_interests.sql
-- Pickup-customer (consumer) Profile interests.
--
-- buyer_interests stays unused. Its NOT NULL search_text + radius_miles
-- are a poor fit for tap-categories + one private note. We do not
-- invent max-price / radius / semantic matching.
--
-- looking_for is NOT on public.profiles: that table is publicly
-- selectable. Private note + email choice live here with owner-only RLS.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.profile_pickup_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  looking_for TEXT NOT NULL DEFAULT '',
  drop_email_mode TEXT NOT NULL DEFAULT 'all'
    CHECK (drop_email_mode IN ('all', 'matching')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profile_pickup_prefs IS
  'Private pickup-customer note and new-drop email choice. Owner-only. Default drop_email_mode=all.';

COMMENT ON COLUMN public.profile_pickup_prefs.looking_for IS
  'Private “what I’m looking for” note. Never exposed on public profiles.';

COMMENT ON COLUMN public.profile_pickup_prefs.drop_email_mode IS
  'all = every new drop (default). matching = only listing categories the user tapped.';

CREATE TABLE IF NOT EXISTS public.profile_interest_categories (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_id)
);

COMMENT ON TABLE public.profile_interest_categories IS
  'Pickup-customer taps on listing categories. Owner-only. Reuses public.categories.';

CREATE INDEX IF NOT EXISTS idx_profile_interest_categories_category_id
  ON public.profile_interest_categories (category_id);

CREATE INDEX IF NOT EXISTS idx_profile_interest_categories_user_id
  ON public.profile_interest_categories (user_id);

DROP TRIGGER IF EXISTS trigger_profile_pickup_prefs_updated_at ON public.profile_pickup_prefs;
CREATE TRIGGER trigger_profile_pickup_prefs_updated_at
  BEFORE UPDATE ON public.profile_pickup_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profile_pickup_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interest_categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profile_pickup_prefs FROM PUBLIC;
REVOKE ALL ON TABLE public.profile_pickup_prefs FROM anon;
REVOKE ALL ON TABLE public.profile_interest_categories FROM PUBLIC;
REVOKE ALL ON TABLE public.profile_interest_categories FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_pickup_prefs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_interest_categories TO authenticated;

DROP POLICY IF EXISTS "Owners can view their pickup prefs" ON public.profile_pickup_prefs;
CREATE POLICY "Owners can view their pickup prefs"
  ON public.profile_pickup_prefs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert their pickup prefs" ON public.profile_pickup_prefs;
CREATE POLICY "Owners can insert their pickup prefs"
  ON public.profile_pickup_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their pickup prefs" ON public.profile_pickup_prefs;
CREATE POLICY "Owners can update their pickup prefs"
  ON public.profile_pickup_prefs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their pickup prefs" ON public.profile_pickup_prefs;
CREATE POLICY "Owners can delete their pickup prefs"
  ON public.profile_pickup_prefs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view their interest categories" ON public.profile_interest_categories;
CREATE POLICY "Owners can view their interest categories"
  ON public.profile_interest_categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert their interest categories" ON public.profile_interest_categories;
CREATE POLICY "Owners can insert their interest categories"
  ON public.profile_interest_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their interest categories" ON public.profile_interest_categories;
CREATE POLICY "Owners can update their interest categories"
  ON public.profile_interest_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their interest categories" ON public.profile_interest_categories;
CREATE POLICY "Owners can delete their interest categories"
  ON public.profile_interest_categories FOR DELETE
  USING (auth.uid() = user_id);
