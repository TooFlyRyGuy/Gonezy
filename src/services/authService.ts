import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';
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
    if (!isSupabaseLive()) {
      throw new Error('Supabase live auth requires active database credentials.');
    }

    try {
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

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      throw err;
    }
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseLive()) {
      throw new Error('Supabase live auth requires active database credentials.');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      throw err;
    }
  },

  async signOut() {
    if (!isSupabaseLive()) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !isSupabaseAuthOrKeyError(error)) throw error;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
    }
  },

  async resetPassword(email: string) {
    if (!isSupabaseLive()) {
      throw new Error('Supabase live auth requires active database credentials.');
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  },

  async getSession() {
    if (!isSupabaseLive()) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        return null;
      }
      return data.session;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return null;
    }
  },

  async getCurrentUser() {
    if (!isSupabaseLive()) return null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        return null;
      }
      return data.user;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return null;
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseLive()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    try {
      return supabase.auth.onAuthStateChange(callback);
    } catch {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
};

