import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const storageService = {
  /**
   * Uploads a photo to the listing-images bucket and returns the public URL
   */
  async uploadListingImage(file: File, listingId: string): Promise<string> {
    if (!isSupabaseConfigured) {
      // In local preview without configured credentials, create local object URL
      return URL.createObjectURL(file);
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Generates public URL for a storage path
   */
  getPublicUrl(storagePath: string): string {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:') || storagePath.startsWith('data:')) {
      return storagePath;
    }
    if (!isSupabaseConfigured) return storagePath;

    const { data } = supabase.storage
      .from('listing-images')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  },
};
