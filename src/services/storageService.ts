import { isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';

export const storageService = {
  async uploadListingImage(file: File, listingId: string): Promise<string> {
    if (!isSupabaseConfigured) {
      throw new Error('Cannot upload photos while Gonezy is in preview mode.');
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      throwLiveError(uploadError, 'Could not upload photo');
    }

    const { data } = supabase.storage.from('listing-images').getPublicUrl(fileName);
    return data.publicUrl;
  },

  getPublicUrl(storagePath: string): string {
    if (
      storagePath.startsWith('http://') ||
      storagePath.startsWith('https://') ||
      storagePath.startsWith('blob:') ||
      storagePath.startsWith('data:')
    ) {
      return storagePath;
    }
    if (!isSupabaseConfigured) return storagePath;

    const { data } = supabase.storage.from('listing-images').getPublicUrl(storagePath);
    return data.publicUrl;
  },
};
