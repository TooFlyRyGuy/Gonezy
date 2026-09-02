import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';
import { BuyerInterest } from '../types/marketplace';

export interface CreateInterestInput {
  search_text: string;
  category_id?: string | null;
  max_price?: number | null;
  radius_miles?: number;
  latitude?: number | null;
  longitude?: number | null;
}

const LOCAL_INTERESTS_KEY = 'gonezy_user_interests';

function getLocalStoredInterests(userId: string): BuyerInterest[] {
  try {
    const raw =
      localStorage.getItem(`${LOCAL_INTERESTS_KEY}_${userId}`) ||
      localStorage.getItem(`nabgo_user_interests_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore localStorage parse error
  }
  return getDemoInterests(userId);
}

function saveLocalStoredInterests(userId: string, items: BuyerInterest[]): void {
  try {
    localStorage.setItem(`${LOCAL_INTERESTS_KEY}_${userId}`, JSON.stringify(items));
  } catch (e) {
    // Ignore quota errors
  }
}

export const interestService = {
  async getUserInterests(userId: string): Promise<BuyerInterest[]> {
    if (!isSupabaseLive()) {
      return getLocalStoredInterests(userId);
    }

    try {
      const { data, error } = await supabase
        .from('buyer_interests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        } else {
          console.warn('Buyer interests fetch issue:', error.message);
        }
        return getLocalStoredInterests(userId);
      }

      return data || [];
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return getLocalStoredInterests(userId);
    }
  },

  async createInterest(userId: string, input: CreateInterestInput): Promise<BuyerInterest> {
    if (!isSupabaseLive()) {
      const demo: BuyerInterest = {
        id: 'interest-' + Date.now(),
        user_id: userId,
        search_text: input.search_text,
        category_id: input.category_id || null,
        max_price: input.max_price || null,
        radius_miles: input.radius_miles || 25,
        latitude: input.latitude || 37.7749,
        longitude: input.longitude || -122.4194,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const existing = getLocalStoredInterests(userId);
      saveLocalStoredInterests(userId, [demo, ...existing]);
      return demo;
    }

    try {
      const { data, error } = await (supabase.from('buyer_interests') as any)
        .insert({
          user_id: userId,
          search_text: input.search_text,
          category_id: input.category_id || null,
          max_price: input.max_price || null,
          radius_miles: input.radius_miles || 25,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          return this.createInterest(userId, input);
        }
        throw error;
      }

      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
        return this.createInterest(userId, input);
      }
      throw err;
    }
  },

  async toggleActive(interestId: string, isActive: boolean, userId?: string): Promise<void> {
    if (!isSupabaseLive()) {
      if (userId) {
        const existing = getLocalStoredInterests(userId);
        saveLocalStoredInterests(
          userId,
          existing.map((item) => (item.id === interestId ? { ...item, is_active: isActive } : item))
        );
      }
      return;
    }
    try {
      const { error } = await (supabase.from('buyer_interests') as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', interestId);

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      } else {
        throw err;
      }
    }
  },

  async deleteInterest(interestId: string, userId?: string): Promise<void> {
    if (!isSupabaseLive()) {
      if (userId) {
        const existing = getLocalStoredInterests(userId);
        saveLocalStoredInterests(
          userId,
          existing.filter((item) => item.id !== interestId)
        );
      }
      return;
    }
    try {
      const { error } = await supabase
        .from('buyer_interests')
        .delete()
        .eq('id', interestId);

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      } else {
        throw err;
      }
    }
  },
};

function getDemoInterests(userId: string): BuyerInterest[] {
  return [
    {
      id: 'demo-int-1',
      user_id: userId,
      search_text: 'Commercial refrigeration or stainless prep tables',
      category_id: '10',
      max_price: 150,
      radius_miles: 15,
      latitude: 37.7749,
      longitude: -122.4194,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'demo-int-2',
      user_id: userId,
      search_text: 'DeWalt or Milwaukee power tools',
      category_id: '4',
      max_price: 50,
      radius_miles: 25,
      latitude: 37.7749,
      longitude: -122.4194,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

