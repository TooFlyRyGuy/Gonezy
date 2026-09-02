import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AccountType } from '../types/database.types';

export interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
  accountType?: AccountType;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

export const authService = {
  async signUp({ email, password, displayName, accountType = 'consumer', firstName, lastName, businessName }: SignUpParams) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          first_name: firstName || '',
          last_name: lastName || '',
          account_type: accountType,
          business_name: businessName || '',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  },

  async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
