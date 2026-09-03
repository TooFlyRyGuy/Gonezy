import { isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
import { AccountType } from '../types/database.types';
import { Profile } from '../types/marketplace';

export interface EnsureProfileDetails {
  displayName: string;
  accountType?: AccountType;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error) {
      throwLiveError(error, 'Could not load profile');
    }

    return data;
  },

  async ensureProfile(userId: string, details: EnsureProfileDetails): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;

    const typedName = details.displayName.trim();
    const existing = await this.getProfile(userId);
    const existingName = existing?.display_name?.trim();

    if (existing && existingName) {
      return existing;
    }

    if (!typedName) {
      return existing;
    }

    if (existing) {
      return this.updateProfile(userId, { display_name: typedName });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          display_name: typedName,
          first_name: details.firstName || '',
          last_name: details.lastName || '',
          account_type: details.accountType || 'consumer',
          business_name: details.businessName || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      throwLiveError(error, 'Could not save profile');
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
