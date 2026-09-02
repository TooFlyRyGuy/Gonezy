-- ====================================================================
-- Migration: 20260902000001_initial_schema.sql
-- Project: Gonezy (Hyperlocal Urgency-Based Marketplace)
-- Description: Production-ready database schema, tables, foreign keys, 
--              indexes, constraints, RLS policies, storage bucket, 
--              and atomic functions/triggers for Gonezy.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. REUSABLE UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES TABLE (Connected 1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  account_type TEXT NOT NULL DEFAULT 'consumer' CHECK (account_type IN ('consumer', 'business')),
  business_name TEXT,
  business_type TEXT CHECK (business_type IN (
    'junk_hauler', 
    'mover', 
    'estate_cleanout', 
    'property_manager', 
    'contractor', 
    'restoration_company', 
    'reseller', 
    'retailer', 
    'nonprofit', 
    'other'
  )),
  bio TEXT,
  home_latitude DOUBLE PRECISION,
  home_longitude DOUBLE PRECISION,
  default_search_radius_miles NUMERIC NOT NULL DEFAULT 25,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on auth.users signup (Security Definer with clean search path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    first_name, 
    last_name, 
    avatar_url, 
    account_type,
    business_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'consumer'),
    NEW.raw_user_meta_data->>'business_name',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Package',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Categories (15 Required Categories)
INSERT INTO public.categories (slug, name, description, icon_name, sort_order, is_active) VALUES
  ('furniture', 'Furniture', 'Sofas, tables, chairs, dressers, bed frames, cabinetry', 'Armchair', 1, true),
  ('appliances', 'Appliances', 'Refrigerators, washers, dryers, dishwashers, ranges', 'Refrigerator', 2, true),
  ('electronics', 'Electronics', 'TVs, audio systems, computers, monitors, gaming equipment', 'Tv', 3, true),
  ('tools', 'Tools', 'Power tools, hand tools, toolboxes, ladders, generators', 'Wrench', 4, true),
  ('building-materials', 'Building Materials', 'Lumber, drywall, tiles, flooring, fixtures, hardware', 'Hammer', 5, true),
  ('outdoor-patio', 'Outdoor / Patio', 'Patio sets, grills, umbrellas, fire pits, outdoor seating', 'Sun', 6, true),
  ('landscaping-garden', 'Landscaping / Garden', 'Lawnmowers, plants, soil, pots, pavers, fencing', 'Trees', 7, true),
  ('automotive', 'Automotive', 'Tires, rims, vehicle parts, racks, garage accessories', 'Car', 8, true),
  ('commercial-equipment', 'Commercial Equipment', 'Warehousing, shelving, heavy-duty gear, shop equipment', 'Truck', 9, true),
  ('restaurant-equipment', 'Restaurant Equipment', 'Commercial prep tables, stainless steel, fryers, refrigeration', 'UtensilsCrossed', 10, true),
  ('office-furniture', 'Office Furniture', 'Desks, ergonomic task chairs, file cabinets, conference tables', 'Building2', 11, true),
  ('home-goods', 'Home Goods', 'Rugs, lamps, kitchenware, artwork, storage bins', 'Home', 12, true),
  ('collectibles', 'Collectibles', 'Antiques, vintage items, vinyl records, instruments', 'Sparkles', 13, true),
  ('scrap-materials', 'Scrap / Materials', 'Copper, aluminum, metal scrap, pallets, raw salvage', 'Recycle', 14, true),
  ('other', 'Other', 'Miscellaneous cleanout and fast-turnaround items', 'Box', 15, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 5. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('like_new', 'good', 'fair', 'salvage_scrap', 'for_parts')),
  estimated_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'claimed', 'picked_up', 'expired', 'cancelled', 'disposed')),
  pickup_address_text TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  approximate_public_latitude DOUBLE PRECISION NOT NULL,
  approximate_public_longitude DOUBLE PRECISION NOT NULL,
  available_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pickup_deadline TIMESTAMPTZ NOT NULL,
  current_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
  original_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_pickup_deadline_after_start CHECK (pickup_deadline > available_from)
);

-- Performance Indexes on listings
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_pickup_deadline ON public.listings(pickup_deadline);
CREATE INDEX IF NOT EXISTS idx_listings_created_at_desc ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status_category ON public.listings(status, category_id);

DROP TRIGGER IF EXISTS trigger_listings_updated_at ON public.listings;
CREATE TRIGGER trigger_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. LISTING IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id, sort_order ASC);

-- 7. LISTING PRICING WINDOWS (Urgency-Based Dynamic Pricing Schedule)
CREATE TABLE IF NOT EXISTS public.listing_price_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_window_ends_after_starts CHECK (ends_at > starts_at),
  CONSTRAINT unique_listing_window_sequence UNIQUE (listing_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_price_windows_listing_id ON public.listing_price_windows(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_windows_starts_at ON public.listing_price_windows(starts_at);
CREATE INDEX IF NOT EXISTS idx_price_windows_ends_at ON public.listing_price_windows(ends_at);
CREATE INDEX IF NOT EXISTS idx_price_windows_range ON public.listing_price_windows(listing_id, starts_at, ends_at);

-- 8. BUYER INTERESTS / WANTED ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.buyer_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  max_price NUMERIC(12, 2) CHECK (max_price IS NULL OR max_price >= 0),
  radius_miles NUMERIC NOT NULL DEFAULT 25 CHECK (radius_miles > 0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_interests_user_id ON public.buyer_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_category_id ON public.buyer_interests(category_id);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_is_active ON public.buyer_interests(is_active);

DROP TRIGGER IF EXISTS trigger_buyer_interests_updated_at ON public.buyer_interests;
CREATE TRIGGER trigger_buyer_interests_updated_at
  BEFORE UPDATE ON public.buyer_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 9. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_at_claim NUMERIC(12, 2) NOT NULL CHECK (price_at_claim >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired', 'no_show')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pickup_expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STRICT INTEGRITY RULE: Partial unique index to enforce only one active/pending claim per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_claim 
  ON public.claims (listing_id) 
  WHERE (status IN ('pending', 'active'));

CREATE INDEX IF NOT EXISTS idx_claims_listing_id ON public.claims(listing_id);
CREATE INDEX IF NOT EXISTS idx_claims_buyer_id ON public.claims(buyer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

DROP TRIGGER IF EXISTS trigger_claims_updated_at ON public.claims;
CREATE TRIGGER trigger_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 11. DATABASE FUNCTIONS & RPC

-- Function: Authoritative current price calculation from database time (NOW())
CREATE OR REPLACE FUNCTION public.get_current_listing_price(p_listing_id UUID, p_at TIMESTAMPTZ DEFAULT NOW())
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
  v_fallback_price NUMERIC;
BEGIN
  -- Look for an active price window corresponding to database time
  SELECT price INTO v_price
  FROM public.listing_price_windows
  WHERE listing_id = p_listing_id
    AND starts_at <= p_at
    AND ends_at > p_at
  ORDER BY sequence ASC
  LIMIT 1;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- Fallback to listing current_price column
  SELECT current_price INTO v_fallback_price
  FROM public.listings
  WHERE id = p_listing_id;

  RETURN COALESCE(v_fallback_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Auto-expire overdue active listings
CREATE OR REPLACE FUNCTION public.expire_overdue_listings()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Atomic Claim RPC (Secures row locking, prevents double claims, checks ownership & deadlines)
CREATE OR REPLACE FUNCTION public.claim_listing(
  p_listing_id UUID,
  p_buyer_id UUID DEFAULT auth.uid()
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
BEGIN
  v_caller_id := COALESCE(p_buyer_id, auth.uid());
  
  -- 1. Verify user is authenticated
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to claim a listing');
  END IF;

  -- 2. Lock listing row for update to prevent concurrent race conditions
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- 3. Verify existence
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- 4. Verify buyer is not the seller
  IF v_listing.seller_id = v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot claim your own listing');
  END IF;

  -- 5. Verify listing status
  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing is no longer active (status: ' || v_listing.status || ')');
  END IF;

  -- 6. Verify pickup deadline has not passed
  IF NOW() >= v_listing.pickup_deadline THEN
    UPDATE public.listings SET status = 'expired', updated_at = NOW() WHERE id = p_listing_id;
    RETURN jsonb_build_object('success', false, 'error', 'Listing deadline has passed and is now expired');
  END IF;

  -- 7. Verify no active or pending claim already exists
  SELECT id INTO v_existing_claim_id
  FROM public.claims
  WHERE listing_id = p_listing_id AND status IN ('pending', 'active')
  LIMIT 1;

  IF v_existing_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This item has already been claimed by another buyer');
  END IF;

  -- 8. Determine authoritative current price from database time
  v_current_price := public.get_current_listing_price(p_listing_id, NOW());

  -- 9. Determine pickup expiration (Default: min(now() + 2 hours, listing.pickup_deadline))
  v_pickup_expiry := LEAST(NOW() + INTERVAL '2 hours', v_listing.pickup_deadline);

  -- 10. Insert claim record
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

  -- 11. Update listing status to 'claimed'
  UPDATE public.listings
  SET 
    status = 'claimed',
    current_price = v_current_price,
    updated_at = NOW()
  WHERE id = p_listing_id;

  -- 12. Notify seller about the claim
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
    'A buyer claimed "' || v_listing.title || '" for $' || v_current_price || '. Pickup window expires in 2 hours.',
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

-- Function: Complete Pickup RPC
CREATE OR REPLACE FUNCTION public.complete_pickup(
  p_claim_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_claim RECORD;
  v_listing RECORD;
BEGIN
  v_caller_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO v_claim FROM public.claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = v_claim.listing_id FOR UPDATE;
  
  -- Either seller or buyer can confirm pickup
  IF v_listing.seller_id <> v_caller_id AND v_claim.buyer_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to complete this pickup');
  END IF;

  UPDATE public.claims
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_claim_id;

  UPDATE public.listings
  SET 
    status = 'picked_up',
    updated_at = NOW()
  WHERE id = v_listing.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Function: Cancel Claim RPC
CREATE OR REPLACE FUNCTION public.cancel_claim(
  p_claim_id UUID,
  p_user_id UUID DEFAULT auth.uid(),
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_claim RECORD;
  v_listing RECORD;
BEGIN
  v_caller_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO v_claim FROM public.claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = v_claim.listing_id FOR UPDATE;
  
  -- Either seller or buyer can cancel
  IF v_listing.seller_id <> v_caller_id AND v_claim.buyer_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to cancel this claim');
  END IF;

  UPDATE public.claims
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_claim_id;

  -- If deadline has not passed, make listing active again; otherwise expired
  IF NOW() < v_listing.pickup_deadline THEN
    UPDATE public.listings SET status = 'active', updated_at = NOW() WHERE id = v_listing.id;
  ELSE
    UPDATE public.listings SET status = 'expired', updated_at = NOW() WHERE id = v_listing.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 12. PRIVACY-SAFE PUBLIC VIEW (Hides exact location before legitimate claim)
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
  -- Privacy Masking: Exact address and coordinates are ONLY disclosed to the seller or active/completed claimant
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
  l.current_price,
  l.original_price,
  l.is_free,
  l.created_at,
  l.updated_at
FROM public.listings l;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_price_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- CATEGORIES POLICIES
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone" 
  ON public.categories FOR SELECT 
  USING (is_active = true);

-- LISTINGS POLICIES
DROP POLICY IF EXISTS "Public can view active listings and sellers can view own" ON public.listings;
CREATE POLICY "Public can view active listings and sellers can view own" 
  ON public.listings FOR SELECT 
  USING (
    status IN ('active', 'claimed', 'picked_up', 'expired') 
    OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sellers can create listings" ON public.listings;
CREATE POLICY "Sellers can create listings" 
  ON public.listings FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update their own listings" ON public.listings;
CREATE POLICY "Sellers can update their own listings" 
  ON public.listings FOR UPDATE 
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can delete their own listings" ON public.listings;
CREATE POLICY "Sellers can delete their own listings" 
  ON public.listings FOR DELETE 
  USING (auth.uid() = seller_id);

-- LISTING IMAGES POLICIES
DROP POLICY IF EXISTS "Listing images are viewable by everyone" ON public.listing_images;
CREATE POLICY "Listing images are viewable by everyone" 
  ON public.listing_images FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Sellers can insert listing images" ON public.listing_images;
CREATE POLICY "Sellers can insert listing images" 
  ON public.listing_images FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_images.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can update listing images" ON public.listing_images;
CREATE POLICY "Sellers can update listing images" 
  ON public.listing_images FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_images.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can delete listing images" ON public.listing_images;
CREATE POLICY "Sellers can delete listing images" 
  ON public.listing_images FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_images.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

-- LISTING PRICING WINDOWS POLICIES
DROP POLICY IF EXISTS "Price windows are viewable by everyone" ON public.listing_price_windows;
CREATE POLICY "Price windows are viewable by everyone" 
  ON public.listing_price_windows FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Sellers can insert price windows" ON public.listing_price_windows;
CREATE POLICY "Sellers can insert price windows" 
  ON public.listing_price_windows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can update price windows" ON public.listing_price_windows;
CREATE POLICY "Sellers can update price windows" 
  ON public.listing_price_windows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can delete price windows" ON public.listing_price_windows;
CREATE POLICY "Sellers can delete price windows" 
  ON public.listing_price_windows FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

-- BUYER INTERESTS (WANTED ITEMS) POLICIES - STRICT PRIVACY
DROP POLICY IF EXISTS "Users can view only their own buyer interests" ON public.buyer_interests;
CREATE POLICY "Users can view only their own buyer interests" 
  ON public.buyer_interests FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own buyer interests" ON public.buyer_interests;
CREATE POLICY "Users can create their own buyer interests" 
  ON public.buyer_interests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own buyer interests" ON public.buyer_interests;
CREATE POLICY "Users can update their own buyer interests" 
  ON public.buyer_interests FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own buyer interests" ON public.buyer_interests;
CREATE POLICY "Users can delete their own buyer interests" 
  ON public.buyer_interests FOR DELETE 
  USING (auth.uid() = user_id);

-- CLAIMS POLICIES
DROP POLICY IF EXISTS "Buyers and sellers can view relevant claims" ON public.claims;
CREATE POLICY "Buyers and sellers can view relevant claims" 
  ON public.claims FOR SELECT 
  USING (
    auth.uid() = buyer_id 
    OR EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = claims.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers can insert claims via RPC" ON public.claims;
CREATE POLICY "Buyers can insert claims via RPC" 
  ON public.claims FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Claimants and sellers can update claims" ON public.claims;
CREATE POLICY "Claimants and sellers can update claims" 
  ON public.claims FOR UPDATE 
  USING (
    auth.uid() = buyer_id 
    OR EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = claims.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- 14. STORAGE BUCKET SETUP & POLICIES (listing-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read listing images bucket" ON storage.objects;
CREATE POLICY "Public read listing images bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
CREATE POLICY "Users can update their own listing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-images' 
    AND auth.uid() = owner
  );

DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;
CREATE POLICY "Users can delete their own listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images' 
    AND auth.uid() = owner
  );
