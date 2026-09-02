import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, SignUpParams } from '../services/authService';
import { profileService } from '../services/profileService';
import { Profile } from '../types/marketplace';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setDemoUser: (role: 'buyer' | 'seller') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured) {
        // Provide a default active demo user profile for smooth local exploration
        const demoProfile: Profile = {
          id: 'demo-buyer-user',
          display_name: 'Alex Rivera',
          first_name: 'Alex',
          last_name: 'Rivera',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
          phone: '(415) 890-1234',
          account_type: 'business',
          business_name: 'Bay Area Cleanouts & Salvage',
          business_type: 'estate_cleanout',
          bio: 'Hyperlocal estate cleanout & rapid salvage professional. Always searching for high quality tools & furniture.',
          home_latitude: 37.7749,
          home_longitude: -122.4194,
          default_search_radius_miles: 20,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser({ id: demoProfile.id, email: 'alex@bayareacleanouts.com' });
        setProfile(demoProfile);
        setIsLoading(false);
        return;
      }

      try {
        const session = await authService.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          const prof = await profileService.getProfile(session.user.id);
          if (mounted) setProfile(prof);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data: authListener } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        try {
          const prof = await profileService.getProfile(session.user.id);
          if (mounted) setProfile(prof);
        } catch (e) {
          console.error('Error fetching profile on auth change:', e);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    if (!isSupabaseConfigured) return;
    try {
      const prof = await profileService.getProfile(user.id);
      setProfile(prof);
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Not authenticated');
    if (!isSupabaseConfigured) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return;
    }
    const updated = await profileService.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.signIn(email, password);
      if (data?.user) {
        setUser(data.user);
        const prof = await profileService.getProfile(data.user.id);
        setProfile(prof);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (params: SignUpParams) => {
    setIsLoading(true);
    try {
      const data = await authService.signUp(params);
      if (data?.user) {
        setUser(data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoUser = (role: 'buyer' | 'seller') => {
    if (role === 'seller') {
      const sellerProfile: Profile = {
        id: 'seller-demo-1',
        display_name: 'Apex Commercial Movers',
        first_name: 'Marcus',
        last_name: 'Vance',
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
        phone: '(415) 555-0199',
        account_type: 'business',
        business_name: 'Apex Commercial Relocation & Cleanouts',
        business_type: 'mover',
        bio: 'Professional commercial relocation crew with daily surplus office and restaurant items.',
        home_latitude: 37.7749,
        home_longitude: -122.4194,
        default_search_radius_miles: 30,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser({ id: sellerProfile.id, email: 'marcus@apexmovers.com' });
      setProfile(sellerProfile);
    } else {
      const buyerProfile: Profile = {
        id: 'demo-buyer-user',
        display_name: 'Alex Rivera',
        first_name: 'Alex',
        last_name: 'Rivera',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        phone: '(415) 890-1234',
        account_type: 'consumer',
        business_name: null,
        business_type: null,
        bio: 'Hyperlocal reseller and bargain hunter. Rapid responder with pickup truck.',
        home_latitude: 37.7749,
        home_longitude: -122.4194,
        default_search_radius_miles: 15,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser({ id: buyerProfile.id, email: 'alex@bayareacleanouts.com' });
      setProfile(buyerProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
