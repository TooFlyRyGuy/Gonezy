import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';

export const storageService = {
  /**
   * Uploads a photo to the listing-images bucket and returns the public URL
   */
  async uploadListingImage(file: File, listingId: string): Promise<string> {
    if (!isSupabaseLive()) {
      // In local preview without configured credentials, create local object URL
      return URL.createObjectURL(file);
    }

    try {
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
        if (isSupabaseAuthOrKeyError(uploadError)) {
          disableSupabaseLiveMode('Authentication required');
        }
        return URL.createObjectURL(file);
      }

      const { data } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return URL.createObjectURL(file);
    }
  },

  /**
   * Generates public URL for a storage path
   */
  getPublicUrl(storagePath: string): string {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:') || storagePath.startsWith('data:')) {
      return storagePath;
    }
    if (!isSupabaseLive()) return storagePath;

    try {
      const { data } = supabase.storage
        .from('listing-images')
        .getPublicUrl(storagePath);

      return data.publicUrl;
    } catch {
      return storagePath;
    }
  },
};

