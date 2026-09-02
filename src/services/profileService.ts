import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';
import { Profile } from '../types/marketplace';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseLive()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        } else {
          console.warn('Profile fetch notice:', error.message);
        }
        return null;
      }

      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (!isSupabaseLive()) {
      return {
        id: userId,
        display_name: updates.display_name || 'User',
        first_name: updates.first_name || null,
        last_name: updates.last_name || null,
        phone: updates.phone || null,
        avatar_url: updates.avatar_url || null,
        account_type: updates.account_type || 'consumer',
        business_name: updates.business_name || null,
        business_type: updates.business_type || null,
        bio: updates.bio || null,
        home_latitude: updates.home_latitude || 37.7749,
        home_longitude: updates.home_longitude || -122.4194,
        default_search_radius_miles: updates.default_search_radius_miles || 20,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates,
      };
    }

    try {
      const { data, error } = await (supabase.from('profiles') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
          return this.updateProfile(userId, updates);
        }
        throw error;
      }

      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
        return this.updateProfile(userId, updates);
      }
      throw err;
    }
  },

  async getPublicProfile(userId: string): Promise<Partial<Profile> | null> {
    if (!isSupabaseLive()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, account_type, business_name, business_type, bio, is_verified, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        return null;
      }

      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return null;
    }
  },
};

