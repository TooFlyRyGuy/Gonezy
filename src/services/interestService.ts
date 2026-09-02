import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BuyerInterest } from '../types/marketplace';

export interface CreateInterestInput {
  search_text: string;
  category_id?: string | null;
  max_price?: number | null;
  radius_miles?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export const interestService = {
  async getUserInterests(userId: string): Promise<BuyerInterest[]> {
    if (!isSupabaseConfigured) {
      return getDemoInterests(userId);
    }

    try {
      const { data, error } = await supabase
        .from('buyer_interests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching buyer interests:', error);
        return getDemoInterests(userId);
      }

      return data || [];
    } catch (err) {
      console.error('Interests query error:', err);
      return getDemoInterests(userId);
    }
  },

  async createInterest(userId: string, input: CreateInterestInput): Promise<BuyerInterest> {
    if (!isSupabaseConfigured) {
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
      return demo;
    }

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
      console.error('Error creating interest:', error);
      throw error;
    }

    return data;
  },

  async toggleActive(interestId: string, isActive: boolean): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await (supabase.from('buyer_interests') as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', interestId);

    if (error) throw error;
  },

  async deleteInterest(interestId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('buyer_interests')
      .delete()
      .eq('id', interestId);

    if (error) throw error;
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
