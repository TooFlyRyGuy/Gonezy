import { DropEmailMode } from '../types/marketplace';

export interface PickupInterestState {
  categoryIds: string[];
  lookingFor: string;
  dropEmailMode: DropEmailMode;
}

export const DEFAULT_PICKUP_INTERESTS: PickupInterestState = {
  categoryIds: [],
  lookingFor: '',
  dropEmailMode: 'all',
};

export function normalizePickupInterests(state: PickupInterestState): PickupInterestState {
  const categoryIds = [...new Set(state.categoryIds.filter(Boolean))];
  const lookingFor = state.lookingFor.replace(/\s+/g, ' ').trim().slice(0, 280);
  const dropEmailMode: DropEmailMode =
    state.dropEmailMode === 'matching' && categoryIds.length > 0 ? 'matching' : 'all';
  return { categoryIds, lookingFor, dropEmailMode };
}
