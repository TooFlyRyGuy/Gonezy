import { isSupabaseConfigured, supabase } from '../lib/supabase';

let offsetMs = 0;

export function getAuthoritativeNow(): Date {
  return new Date(Date.now() + offsetMs);
}

export function getServerOffsetMs(): number {
  return offsetMs;
}

/**
 * Aligns the client clock to database NOW() so price windows and
 * countdowns do not depend only on the browser clock.
 */
export async function syncServerTime(): Promise<void> {
  if (!isSupabaseConfigured) {
    offsetMs = 0;
    return;
  }

  const clientBefore = Date.now();
  const { data, error } = await supabase.rpc('get_server_now');
  const clientAfter = Date.now();

  if (error || !data) {
    offsetMs = 0;
    return;
  }

  const serverMs = new Date(data as string).getTime();
  if (Number.isNaN(serverMs)) {
    offsetMs = 0;
    return;
  }

  const approxClientAtReceipt = (clientBefore + clientAfter) / 2;
  offsetMs = serverMs - approxClientAtReceipt;
}
