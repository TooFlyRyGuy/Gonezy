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
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured) {
        setUser(null);
        setProfile(null);
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
      } catch (err: any) {
        if (mounted) {
          setAuthError(err.message || 'Could not restore session');
          setUser(null);
          setProfile(null);
        }
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
        } catch (e: any) {
          if (mounted) setAuthError(e.message || 'Could not load profile');
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
    if (!user || !isSupabaseConfigured) return;
    const prof = await profileService.getProfile(user.id);
    setProfile(prof);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Sign in to update your profile');
    const updated = await profileService.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authService.signIn(email, password);
      if (data?.user) {
        setUser(data.user);
        const prof = await profileService.getProfile(data.user.id);
        setProfile(prof);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (params: SignUpParams) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authService.signUp(params);
      if (data?.user) {
        setUser(data.user);
        const prof = await profileService.ensureProfile(data.user.id, {
          displayName: params.displayName.trim(),
          accountType: params.accountType,
          firstName: params.firstName,
          lastName: params.lastName,
          businessName: params.businessName,
        });
        setProfile(prof);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Sign up failed');
      throw err;
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isSupabaseConfigured,
        authError,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
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
