export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType = 'consumer' | 'business';

export type BusinessType =
  | 'junk_hauler'
  | 'mover'
  | 'estate_cleanout'
  | 'property_manager'
  | 'contractor'
  | 'restoration_company'
  | 'reseller'
  | 'retailer'
  | 'nonprofit'
  | 'other';

export type ItemCondition = 'like_new' | 'good' | 'fair' | 'salvage_scrap' | 'for_parts';

export type ListingStatus =
  | 'draft'
  | 'active'
  | 'claimed'
  | 'picked_up'
  | 'expired'
  | 'cancelled'
  | 'disposed';

export type ClaimState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show';

export type NotificationType =
  | 'matching_item_posted'
  | 'price_escalation_imminent'
  | 'item_claimed'
  | 'claim_accepted'
  | 'pickup_deadline_approaching'
  | 'claim_expired'
  | 'item_available_again'
  | string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          account_type: AccountType;
          business_name: string | null;
          business_type: BusinessType | null;
          bio: string | null;
          home_latitude: number | null;
          home_longitude: number | null;
          default_search_radius_miles: number;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          account_type?: AccountType;
          business_name?: string | null;
          business_type?: BusinessType | null;
          bio?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          default_search_radius_miles?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon_name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon_name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          category_id: string | null;
          condition: ItemCondition;
          estimated_value: number;
          status: ListingStatus;
          pickup_address_text: string;
          pickup_latitude: number;
          pickup_longitude: number;
          approximate_public_latitude: number;
          approximate_public_longitude: number;
          available_from: string;
          pickup_deadline: string;
          current_price: number;
          original_price: number;
          is_free: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          category_id?: string | null;
          condition?: ItemCondition;
          estimated_value?: number;
          status?: ListingStatus;
          pickup_address_text: string;
          pickup_latitude: number;
          pickup_longitude: number;
          approximate_public_latitude: number;
          approximate_public_longitude: number;
          available_from?: string;
          pickup_deadline: string;
          current_price?: number;
          original_price?: number;
          is_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listings']['Insert']>;
        Relationships: [];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listing_images']['Insert']>;
        Relationships: [];
      };
      listing_price_windows: {
        Row: {
          id: string;
          listing_id: string;
          starts_at: string;
          ends_at: string;
          price: number;
          sequence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          starts_at: string;
          ends_at: string;
          price: number;
          sequence: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listing_price_windows']['Insert']>;
        Relationships: [];
      };
      buyer_interests: {
        Row: {
          id: string;
          user_id: string;
          search_text: string;
          category_id: string | null;
          max_price: number | null;
          radius_miles: number;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          search_text: string;
          category_id?: string | null;
          max_price?: number | null;
          radius_miles?: number;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['buyer_interests']['Insert']>;
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          price_at_claim: number;
          status: ClaimState;
          claimed_at: string;
          pickup_expires_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          price_at_claim: number;
          status?: ClaimState;
          claimed_at?: string;
          pickup_expires_at?: string;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['claims']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          listing_id: string | null;
          claim_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          listing_id?: string | null;
          claim_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      public_listings: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          category_id: string | null;
          condition: ItemCondition;
          estimated_value: number;
          status: ListingStatus;
          pickup_address_text: string | null;
          pickup_latitude: number | null;
          pickup_longitude: number | null;
          approximate_public_latitude: number;
          approximate_public_longitude: number;
          available_from: string;
          pickup_deadline: string;
          current_price: number;
          original_price: number;
          is_free: boolean;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_current_listing_price: {
        Args: { p_listing_id: string; p_at?: string };
        Returns: number;
      };
      claim_listing: {
        Args: { p_listing_id: string; p_buyer_id?: string };
        Returns: {
          success: boolean;
          error?: string;
          claim_id?: string;
          price_at_claim?: number;
          pickup_expires_at?: string;
        };
      };
      complete_pickup: {
        Args: { p_claim_id: string; p_user_id?: string };
        Returns: { success: boolean; error?: string };
      };
      cancel_claim: {
        Args: { p_claim_id: string; p_user_id?: string; p_reason?: string };
        Returns: { success: boolean; error?: string };
      };
      expire_overdue_listings: {
        Args: Record<string, never>;
        Returns: number;
      };
      expire_overdue_claims: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_server_now: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type ListingImage = Database['public']['Tables']['listing_images']['Row'];
export type ListingPriceWindow = Database['public']['Tables']['listing_price_windows']['Row'];
export type BuyerInterest = Database['public']['Tables']['buyer_interests']['Row'];
export type Claim = Database['public']['Tables']['claims']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
