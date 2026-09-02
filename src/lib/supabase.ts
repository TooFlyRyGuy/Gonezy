import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
let rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Auto-repair key if first char 's' was accidentally sliced in env config (e.g. b_publishable_ -> sb_publishable_)
if (rawKey.startsWith('b_publishable_')) {
  rawKey = 's' + rawKey;
} else if (rawKey.startsWith('b_secret_')) {
  rawKey = 's' + rawKey;
}

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) return false;
  if (
    url.includes('your-project-ref') ||
    url.includes('placeholder') ||
    url.includes('example.com') ||
    url.includes('MY_SUPABASE') ||
    url.includes('<') ||
    url.includes('>')
  ) {
    return false;
  }
  return true;
}

function isValidSupabaseKey(key: string): boolean {
  if (!key) return false;
  if (
    key === 'your-anon-public-key' ||
    key === 'your-anon-key' ||
    key === 'placeholder-anon-key' ||
    key.includes('your-anon') ||
    key.includes('placeholder') ||
    key.includes('MY_SUPABASE') ||
    key.includes('example') ||
    key.length < 25
  ) {
    return false;
  }
  return true;
}

export const isSupabaseConfigured = isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey);

/** Preview listings are allowed only when Supabase was never configured. */
export function isPreviewMode(): boolean {
  return !isSupabaseConfigured;
}

export function liveErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const maybe = error as { message?: string };
  return maybe.message || fallback;
}

export function throwLiveError(error: unknown, fallback: string): never {
  throw new Error(liveErrorMessage(error, fallback));
}

export const supabase = createClient<Database>(
  isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? rawKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
