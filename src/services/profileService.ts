import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types/marketplace';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await (supabase.from('profiles') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  },

  async getPublicProfile(userId: string): Promise<Partial<Profile> | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, account_type, business_name, business_type, bio, is_verified, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }

    return data;
  },
};
