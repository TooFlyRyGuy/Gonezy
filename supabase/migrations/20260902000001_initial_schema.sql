-- ====================================================================
-- Migration: 20260902000001_initial_schema.sql
-- Project: NabGo (Hyperlocal Urgency-Based Marketplace)
-- Description: Core schema, tables, indexes, constraints, RLS policies, 
--              and atomic functions for profiles, categories, listings, 
--              price windows, buyer interests, claims, and storage.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES TABLE (Linked to auth.users)
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
  home_latitude NUMERIC(10, 7),
  home_longitude NUMERIC(10, 7),
  default_search_radius_miles INTEGER NOT NULL DEFAULT 25,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    first_name, 
    last_name, 
    avatar_url, 
    account_type,
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
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Package',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial Category Seed
INSERT INTO public.categories (slug, name, description, icon_name, sort_order) VALUES
  ('furniture', 'Furniture', 'Sofas, tables, chairs, dressers, bed frames, and cabinetry', 'Armchair', 1),
  ('appliances', 'Appliances', 'Refrigerators, washers, dryers, microwaves, dishwashers', 'Refrigerator', 2),
  ('electronics', 'Electronics', 'TVs, audio systems, computers, monitors, gaming gear', 'Tv', 3),
  ('tools', 'Tools & Hardware', 'Power tools, hand tools, toolboxes, ladders, generators', 'Wrench', 4),
  ('building-materials', 'Building Materials', 'Lumber, drywall, tiles, flooring, fixtures, paint', 'Hammer', 5),
  ('outdoor-patio', 'Outdoor / Patio', 'Patio sets, grills, umbrellas, fire pits, heaters', 'Sun', 6),
  ('landscaping-garden', 'Landscaping / Garden', 'Lawnmowers, plants, soil, pots, pavers, fencing', 'Trees', 7),
  ('automotive', 'Automotive', 'Tires, rims, vehicle parts, racks, garage equipment', 'Car', 8),
  ('commercial-equipment', 'Commercial Equipment', 'Warehousing, shelving, heavy duty gear, machinery', 'Truck', 9),
  ('restaurant-equipment', 'Restaurant Equipment', 'Commercial prep tables, stainless steel, fryers, refrigeration', 'UtensilsCrossed', 10),
  ('office-furniture', 'Office Furniture', 'Desks, ergonomic chairs, file cabinets, conference tables', 'Building2', 11),
  ('home-goods', 'Home Goods & Decor', 'Rugs, lamps, kitchenware, artwork, storage bins', 'Home', 12),
  ('collectibles', 'Collectibles & Vintage', 'Antiques, vintage items, records, musical instruments', 'Sparkles', 13),
  ('scrap-materials', 'Scrap / Raw Materials', 'Copper, aluminum, metal scrap, clean fill, pallets', 'Recycle', 14),
  ('other', 'Other Rapid Removal', 'Miscellaneous cleanout and fast-turnaround items', 'Box', 15)
ON CONFLICT (slug) DO NOTHING;

-- 5. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('like_new', 'good', 'fair', 'salvage_scrap', 'for_parts')),
  estimated_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'claimed', 'picked_up', 'expired', 'cancelled', 'disposed')),
  pickup_address_text TEXT NOT NULL, -- Private until claimed or seller view
  pickup_latitude NUMERIC(10, 7) NOT NULL,
  pickup_longitude NUMERIC(10, 7) NOT NULL,
  approximate_public_latitude NUMERIC(10, 7) NOT NULL,
  approximate_public_longitude NUMERIC(10, 7) NOT NULL,
  available_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pickup_deadline TIMESTAMPTZ NOT NULL,
  current_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  claim_status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed', 'claimed', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_pickup_deadline_after_start CHECK (pickup_deadline > available_from)
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_pickup_deadline ON public.listings(pickup_deadline);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

DROP TRIGGER IF EXISTS trigger_listings_updated_at ON public.listings;
CREATE TRIGGER trigger_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 6. LISTING IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id, sort_order ASC);

-- 7. LISTING PRICING WINDOWS (Escalating Urgency Schedule)
CREATE TABLE IF NOT EXISTS public.listing_price_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_window_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_price_windows_listing_seq ON public.listing_price_windows(listing_id, sequence ASC);
CREATE INDEX IF NOT EXISTS idx_price_windows_time ON public.listing_price_windows(listing_id, starts_at, ends_at);

-- 8. BUYER INTERESTS / WANTED ITEMS (Demand-Side Alerting)
CREATE TABLE IF NOT EXISTS public.buyer_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  max_price NUMERIC(10, 2),
  radius_miles INTEGER NOT NULL DEFAULT 25 CHECK (radius_miles > 0),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_interests_user ON public.buyer_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_category ON public.buyer_interests(category_id);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_active ON public.buyer_interests(is_active);

DROP TRIGGER IF EXISTS trigger_buyer_interests_updated_at ON public.buyer_interests;
CREATE TRIGGER trigger_buyer_interests_updated_at
  BEFORE UPDATE ON public.buyer_interests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 9. CLAIMS TABLE (Buyer Reservation & Pickup Commitment)
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_at_claim NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired', 'no_show')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pickup_expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRITICAL INTEGRITY CONSTRAINT: Only one pending/active claim allowed per listing
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
  EXECUTE FUNCTION set_updated_at();

-- 10. DATABASE FUNCTIONS

-- Calculate current authoritative price for a listing at any given timestamp
CREATE OR REPLACE FUNCTION public.get_current_listing_price(p_listing_id UUID, p_at TIMESTAMPTZ DEFAULT NOW())
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
  v_fallback_price NUMERIC;
BEGIN
  -- Look for active price window
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

-- Atomic Claim Function (Prevents race conditions, enforces owner check and expiration checks)
CREATE OR REPLACE FUNCTION public.claim_listing(
  p_listing_id UUID,
  p_buyer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_claim_id UUID;
  v_current_price NUMERIC;
  v_pickup_expiry TIMESTAMPTZ;
BEGIN
  -- 1. Lock listing row for update to prevent simultaneous race conditions
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- 2. Validate existence
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- 3. Validate seller cannot claim own listing
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot claim your own listing');
  END IF;

  -- 4. Validate listing status
  IF v_listing.status <> 'active' OR v_listing.claim_status <> 'unclaimed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing is no longer available');
  END IF;

  -- 5. Validate not expired
  IF NOW() >= v_listing.pickup_deadline THEN
    UPDATE public.listings SET status = 'expired' WHERE id = p_listing_id;
    RETURN jsonb_build_object('success', false, 'error', 'Listing deadline has passed');
  END IF;

  -- 6. Determine authoritative active price
  v_current_price := public.get_current_listing_price(p_listing_id, NOW());

  -- 7. Determine pickup expiration (Default: min(now() + 2 hours, listing.pickup_deadline))
  v_pickup_expiry := LEAST(NOW() + INTERVAL '2 hours', v_listing.pickup_deadline);

  -- 8. Insert claim
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
    p_buyer_id,
    v_current_price,
    'active',
    NOW(),
    v_pickup_expiry
  )
  RETURNING id INTO v_claim_id;

  -- 9. Update listing claim_status and status
  UPDATE public.listings
  SET 
    status = 'claimed',
    claim_status = 'claimed',
    current_price = v_current_price,
    updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'price_at_claim', v_current_price,
    'pickup_expires_at', v_pickup_expiry
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete Pickup Function
CREATE OR REPLACE FUNCTION public.complete_pickup(
  p_claim_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_claim RECORD;
  v_listing RECORD;
BEGIN
  SELECT * INTO v_claim FROM public.claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = v_claim.listing_id FOR UPDATE;
  
  -- Either seller or buyer can mark completed
  IF v_listing.seller_id <> p_user_id AND v_claim.buyer_id <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to complete pickup');
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
    claim_status = 'completed',
    updated_at = NOW()
  WHERE id = v_listing.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_price_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Anyone can view public profile details (display_name, avatar, business info)
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- CATEGORIES POLICIES
-- Categories are readable by all authenticated and anonymous users
CREATE POLICY "Categories are readable by everyone" 
  ON public.categories FOR SELECT 
  USING (is_active = true);

-- LISTINGS POLICIES
-- Active listings are browseable by anyone; sellers can also view their own drafts/expired listings
CREATE POLICY "Public can view active listings and sellers can view own" 
  ON public.listings FOR SELECT 
  USING (
    status IN ('active', 'claimed', 'picked_up') 
    OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
  );

-- Authenticated sellers can create listings
CREATE POLICY "Sellers can create listings" 
  ON public.listings FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings" 
  ON public.listings FOR UPDATE 
  USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete their own listings" 
  ON public.listings FOR DELETE 
  USING (auth.uid() = seller_id);

-- LISTING IMAGES POLICIES
CREATE POLICY "Listing images are viewable by everyone" 
  ON public.listing_images FOR SELECT 
  USING (true);

CREATE POLICY "Sellers can insert listing images" 
  ON public.listing_images FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_images.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update listing images" 
  ON public.listing_images FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_images.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

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
CREATE POLICY "Price windows are viewable by everyone" 
  ON public.listing_price_windows FOR SELECT 
  USING (true);

CREATE POLICY "Sellers can insert price windows" 
  ON public.listing_price_windows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update price windows" 
  ON public.listing_price_windows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete price windows" 
  ON public.listing_price_windows FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_price_windows.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

-- BUYER INTERESTS POLICIES
CREATE POLICY "Users can view only their own buyer interests" 
  ON public.buyer_interests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own buyer interests" 
  ON public.buyer_interests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buyer interests" 
  ON public.buyer_interests FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buyer interests" 
  ON public.buyer_interests FOR DELETE 
  USING (auth.uid() = user_id);

-- CLAIMS POLICIES
-- Buyers can view their own claims; sellers can view claims on their listings
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

CREATE POLICY "Buyers can insert claims for available listings" 
  ON public.claims FOR INSERT 
  WITH CHECK (
    auth.uid() = buyer_id
    AND NOT EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = claims.listing_id 
        AND listings.seller_id = auth.uid()
    )
  );

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

-- 12. STORAGE SETUP & POLICIES (Supabase Storage: bucket 'listing-images')
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images
CREATE POLICY "Public read listing images bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Authenticated users can upload listing images
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

-- Users can update/delete their own uploaded images
CREATE POLICY "Users can delete their own listing images in storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.uid() = owner);
