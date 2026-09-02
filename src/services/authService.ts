import { isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
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

function requireConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Gonezy is in preview mode. Add Supabase credentials to sign in.');
  }
}

export const authService = {
  async signUp({
    email,
    password,
    displayName,
    accountType = 'consumer',
    firstName,
    lastName,
    businessName,
  }: SignUpParams) {
    requireConfigured();

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

    if (error) throwLiveError(error, 'Could not create account');
    return data;
  },

  async signIn(email: string, password: string) {
    requireConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throwLiveError(error, 'Could not sign in');
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throwLiveError(error, 'Could not sign out');
  },

  async resetPassword(email: string) {
    requireConfigured();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throwLiveError(error, 'Could not send reset email');
    return data;
  },

  async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throwLiveError(error, 'Could not restore session');
    return data.session;
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) throwLiveError(error, 'Could not load user');
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
