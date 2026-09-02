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

// Initial static validity check
const initialConfigured = isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey);

// Dynamic live availability state (can be disabled if live backend returns 401/Invalid API key)
let liveBackendAvailable = initialConfigured;

export const isSupabaseConfigured = initialConfigured;

export function isSupabaseLive(): boolean {
  return liveBackendAvailable;
}

export function disableSupabaseLiveMode(reason?: string): void {
  if (liveBackendAvailable) {
    liveBackendAvailable = false;
    console.info(`[Supabase] Switched to local demo mode.${reason ? ` (${reason})` : ''}`);
  }
}

export function isSupabaseAuthOrKeyError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
  const lower = msg.toLowerCase();
  return (
    lower.includes('invalid api key') ||
    lower.includes('jwt') ||
    lower.includes('unauthorized') ||
    lower.includes('api key not found') ||
    lower.includes('bearer token') ||
    lower.includes('apikey') ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  );
}

// Create the Supabase client
export const supabase = createClient<Database>(
  initialConfigured ? rawUrl : 'https://placeholder.supabase.co',
  initialConfigured ? rawKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

