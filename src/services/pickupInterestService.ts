import { isPreviewMode, isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';
import {
  DEFAULT_PICKUP_INTERESTS,
  normalizePickupInterests,
  type PickupInterestState,
} from '../utils/pickupInterests';

export { DEFAULT_PICKUP_INTERESTS, normalizePickupInterests };
export type { PickupInterestState };

const LOCAL_PREFS_KEY = 'gonezy_pickup_interests';

function storageKey(userId: string): string {
  return `${LOCAL_PREFS_KEY}_${userId}`;
}

function readLocal(userId: string): PickupInterestState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PICKUP_INTERESTS };
    const parsed = JSON.parse(raw) as Partial<PickupInterestState>;
    return {
      categoryIds: Array.isArray(parsed.categoryIds) ? parsed.categoryIds.filter(Boolean) : [],
      lookingFor: typeof parsed.lookingFor === 'string' ? parsed.lookingFor : '',
      dropEmailMode: parsed.dropEmailMode === 'matching' ? 'matching' : 'all',
    };
  } catch {
    return { ...DEFAULT_PICKUP_INTERESTS };
  }
}

function writeLocal(userId: string, state: PickupInterestState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export const pickupInterestService = {
  async getPickupInterests(userId: string): Promise<PickupInterestState> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      return readLocal(userId);
    }

    const [prefsRes, catsRes] = await Promise.all([
      supabase.from('profile_pickup_prefs').select('looking_for, drop_email_mode').eq('user_id', userId).maybeSingle(),
      supabase.from('profile_interest_categories').select('category_id').eq('user_id', userId),
    ]);

    if (prefsRes.error) {
      throwLiveError(prefsRes.error, 'Could not load pickup interests');
    }
    if (catsRes.error) {
      throwLiveError(catsRes.error, 'Could not load pickup interests');
    }

    return {
      categoryIds: (catsRes.data || []).map((row) => row.category_id).filter(Boolean),
      lookingFor: prefsRes.data?.looking_for || '',
      dropEmailMode: prefsRes.data?.drop_email_mode === 'matching' ? 'matching' : 'all',
    };
  },

  async savePickupInterests(userId: string, raw: PickupInterestState): Promise<PickupInterestState> {
    const state = normalizePickupInterests(raw);

    if (isPreviewMode() || !isSupabaseConfigured) {
      writeLocal(userId, state);
      return state;
    }

    const { error: prefsError } = await supabase.from('profile_pickup_prefs').upsert(
      {
        user_id: userId,
        looking_for: state.lookingFor,
        drop_email_mode: state.dropEmailMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (prefsError) {
      throwLiveError(prefsError, 'Could not save pickup interests');
    }

    const { error: deleteError } = await supabase
      .from('profile_interest_categories')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throwLiveError(deleteError, 'Could not save pickup interests');
    }

    if (state.categoryIds.length > 0) {
      const { error: insertError } = await supabase.from('profile_interest_categories').insert(
        state.categoryIds.map((category_id) => ({
          user_id: userId,
          category_id,
        }))
      );
      if (insertError) {
        throwLiveError(insertError, 'Could not save pickup interests');
      }
    }

    return state;
  },
};
