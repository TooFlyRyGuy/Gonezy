import { isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
import { Profile } from '../types/marketplace';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error) {
      throwLiveError(error, 'Could not load profile');
    }

    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (!isSupabaseConfigured) {
      throw new Error('Gonezy is in preview mode. Add Supabase credentials to save a profile.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throwLiveError(error, 'Could not update profile');
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
      throwLiveError(error, 'Could not load profile');
    }

    return data;
  },
};
