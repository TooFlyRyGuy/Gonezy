import { Database, AccountType, BusinessType, ItemCondition, ListingStatus, ClaimState } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type ListingImage = Database['public']['Tables']['listing_images']['Row'];
export type ListingPriceWindow = Database['public']['Tables']['listing_price_windows']['Row'];
export type BuyerInterest = Database['public']['Tables']['buyer_interests']['Row'];
export type Claim = Database['public']['Tables']['claims']['Row'];

export interface ListingWithDetails extends Listing {
  category?: Category | null;
  images: ListingImage[];
  price_windows: ListingPriceWindow[];
  seller?: Partial<Profile> | null;
  active_claim?: Claim | null;
  calculated_distance_miles?: number | null;
}

export interface PricingWindowInput {
  durationMinutes: number; // e.g. 30 (30m), 120 (2h)
  price: number;
  label?: string;
}

export interface CreateListingFormValues {
  title: string;
  description: string;
  category_id: string;
  condition: ItemCondition;
  estimated_value: number;
  pickup_address_text: string;
  pickup_latitude: number;
  pickup_longitude: number;
  available_from: string;
  pricing_windows: PricingWindowInput[];
  images: File[];
  image_urls?: string[]; // for preview or pre-uploaded
}

export interface UserAuthSession {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
      first_name?: string;
      last_name?: string;
      account_type?: AccountType;
    };
  } | null;
  profile: Profile | null;
  isLoading: boolean;
}

export interface PricingState {
  currentPrice: number;
  isFree: boolean;
  activeWindow: ListingPriceWindow | null;
  nextWindow: ListingPriceWindow | null;
  timeRemainingMs: number;
  timeRemainingFormatted: string;
  isExpired: boolean;
  progressPercent: number; // 0-100 progress within current window
}

export type NavigationTab = 'explore' | 'wanted' | 'sell' | 'activity' | 'profile';
