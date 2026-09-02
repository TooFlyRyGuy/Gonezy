import { supabase, isSupabaseLive, disableSupabaseLiveMode, isSupabaseAuthOrKeyError } from '../lib/supabase';
import { Category } from '../types/marketplace';

// Default categories fallback if database seed hasn't been applied yet
export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', slug: 'furniture', name: 'Furniture', description: 'Sofas, tables, chairs, dressers, bed frames', icon_name: 'Armchair', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: '2', slug: 'appliances', name: 'Appliances', description: 'Refrigerators, washers, dryers, microwaves', icon_name: 'Refrigerator', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: '3', slug: 'electronics', name: 'Electronics', description: 'TVs, audio systems, computers, monitors', icon_name: 'Tv', sort_order: 3, is_active: true, created_at: new Date().toISOString() },
  { id: '4', slug: 'tools', name: 'Tools & Hardware', description: 'Power tools, hand tools, toolboxes, ladders', icon_name: 'Wrench', sort_order: 4, is_active: true, created_at: new Date().toISOString() },
  { id: '5', slug: 'building-materials', name: 'Building Materials', description: 'Lumber, drywall, tiles, flooring, fixtures', icon_name: 'Hammer', sort_order: 5, is_active: true, created_at: new Date().toISOString() },
  { id: '6', slug: 'outdoor-patio', name: 'Outdoor / Patio', description: 'Patio sets, grills, umbrellas, fire pits', icon_name: 'Sun', sort_order: 6, is_active: true, created_at: new Date().toISOString() },
  { id: '7', slug: 'landscaping-garden', name: 'Landscaping / Garden', description: 'Lawnmowers, plants, soil, pots, pavers', icon_name: 'Trees', sort_order: 7, is_active: true, created_at: new Date().toISOString() },
  { id: '8', slug: 'automotive', name: 'Automotive', description: 'Tires, rims, vehicle parts, racks', icon_name: 'Car', sort_order: 8, is_active: true, created_at: new Date().toISOString() },
  { id: '9', slug: 'commercial-equipment', name: 'Commercial Equipment', description: 'Warehousing, shelving, machinery', icon_name: 'Truck', sort_order: 9, is_active: true, created_at: new Date().toISOString() },
  { id: '10', slug: 'restaurant-equipment', name: 'Restaurant Equipment', description: 'Commercial prep tables, stainless steel', icon_name: 'UtensilsCrossed', sort_order: 10, is_active: true, created_at: new Date().toISOString() },
  { id: '11', slug: 'office-furniture', name: 'Office Furniture', description: 'Desks, chairs, file cabinets', icon_name: 'Building2', sort_order: 11, is_active: true, created_at: new Date().toISOString() },
  { id: '12', slug: 'home-goods', name: 'Home Goods & Decor', description: 'Rugs, lamps, kitchenware, artwork', icon_name: 'Home', sort_order: 12, is_active: true, created_at: new Date().toISOString() },
  { id: '13', slug: 'collectibles', name: 'Collectibles & Vintage', description: 'Antiques, vintage items, records', icon_name: 'Sparkles', sort_order: 13, is_active: true, created_at: new Date().toISOString() },
  { id: '14', slug: 'scrap-materials', name: 'Scrap / Raw Materials', description: 'Copper, aluminum, metal scrap, pallets', icon_name: 'Recycle', sort_order: 14, is_active: true, created_at: new Date().toISOString() },
  { id: '15', slug: 'other', name: 'Other Rapid Removal', description: 'Miscellaneous cleanout items', icon_name: 'Box', sort_order: 15, is_active: true, created_at: new Date().toISOString() },
];

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseLive()) {
      return DEFAULT_CATEGORIES;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        if (isSupabaseAuthOrKeyError(error)) {
          disableSupabaseLiveMode('Authentication required');
        }
        return DEFAULT_CATEGORIES;
      }

      return data && data.length > 0 ? data : DEFAULT_CATEGORIES;
    } catch (err: any) {
      if (isSupabaseAuthOrKeyError(err)) {
        disableSupabaseLiveMode('Authentication required');
      }
      return DEFAULT_CATEGORIES;
    }
  },
};

