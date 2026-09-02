import { ItemCondition } from '../types/database.types';

/**
 * Interface definition for future Gemini AI Listing Assistant & Vision recognition
 * Designed to plug in cleanly without tight coupling to the UI.
 */
export interface AIItemAnalysisResult {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedCategorySlug: string;
  suggestedCondition: ItemCondition;
  estimatedResaleValue: number;
  pickupDifficulty: 'easy_1_person' | 'moderate_2_person' | 'heavy_equipment_required';
  recommendedVehicle: 'car_suv' | 'pickup_van' | 'box_truck_trailer';
  suggestedTags: string[];
}

export const aiItemAnalysisService = {
  /**
   * Analyzes an uploaded photo or draft item.
   * In future phases, this can call server-side Gemini 2.5 Flash with Multimodal inputs.
   */
  async analyzeItemPhoto(imageFileOrUrl: File | string): Promise<AIItemAnalysisResult> {
    // Clean mock delay simulating server-side AI processing
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      suggestedTitle: 'Solid Wood Commercial Office Desk',
      suggestedDescription: 'Clean executive desk with sturdy laminate top and integrated cable grommets.',
      suggestedCategorySlug: 'office-furniture',
      suggestedCondition: 'good',
      estimatedResaleValue: 350,
      pickupDifficulty: 'moderate_2_person',
      recommendedVehicle: 'pickup_van',
      suggestedTags: ['desk', 'office', 'furniture', 'wood', 'executive'],
    };
  },
};
