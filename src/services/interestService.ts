import { isPreviewMode, isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
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
      localStorage.getItem(`${LOCAL_INTERESTS_KEY}_${userId}`);
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
    if (isPreviewMode() || !isSupabaseConfigured) {
      return getLocalStoredInterests(userId);
    }

    const { data, error } = await supabase
      .from('buyer_interests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throwLiveError(error, 'Could not load saved searches');
    }

    return data || [];
  },

  async createInterest(userId: string, input: CreateInterestInput): Promise<BuyerInterest> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      const demo: BuyerInterest = {
        id: 'interest-' + Date.now(),
        user_id: userId,
        search_text: input.search_text,
        category_id: input.category_id || null,
        max_price: input.max_price || null,
        radius_miles: input.radius_miles || 25,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const existing = getLocalStoredInterests(userId);
      saveLocalStoredInterests(userId, [demo, ...existing]);
      return demo;
    }

    const { data, error } = await supabase
      .from('buyer_interests')
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
      throwLiveError(error, 'Could not save search');
    }

    return data;
  },

  async toggleActive(interestId: string, isActive: boolean, userId?: string): Promise<void> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      if (userId) {
        const existing = getLocalStoredInterests(userId);
        saveLocalStoredInterests(
          userId,
          existing.map((item) => (item.id === interestId ? { ...item, is_active: isActive } : item))
        );
      }
      return;
    }
    const { error } = await supabase
      .from('buyer_interests')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', interestId);

    if (error) {
      throwLiveError(error, 'Could not update search');
    }
  },

  async deleteInterest(interestId: string, userId?: string): Promise<void> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      if (userId) {
        const existing = getLocalStoredInterests(userId);
        saveLocalStoredInterests(
          userId,
          existing.filter((item) => item.id !== interestId)
        );
      }
      return;
    }
    const { error } = await supabase.from('buyer_interests').delete().eq('id', interestId);

    if (error) {
      throwLiveError(error, 'Could not delete search');
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
      latitude: null,
      longitude: null,
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
      latitude: null,
      longitude: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

