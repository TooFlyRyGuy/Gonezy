import React, { useState } from 'react';
import { Category, CreateListingFormValues, PricingWindowInput } from '../../types/marketplace';
import { ItemCondition } from '../../types/database.types';
import { getPresetPricingSchedule, formatPrice } from '../../utils/pricing';
import { listingService } from '../../services/listingService';
import { aiItemAnalysisService } from '../../services/aiStubService';
import {
  Upload,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Package,
  Layers,
  Info,
} from 'lucide-react';

interface CreateListingWizardProps {
  categories: Category[];
  sellerId: string;
  onSuccess: (newListingId: string) => void;
  onCancel: () => void;
}

export const CreateListingWizard: React.FC<CreateListingWizardProps> = ({
  categories,
  sellerId,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [estimatedValue, setEstimatedValue] = useState<number>(100);

  const [pickupAddress, setPickupAddress] = useState('742 Evergreen Terrace, Springfield');
  const [pickupLat, setPickupLat] = useState<number>(37.7749);
  const [pickupLng, setPickupLng] = useState<number>(-122.4194);
  const [availableFrom, setAvailableFrom] = useState<string>(new Date().toISOString().slice(0, 16));

  // Pricing Windows
  const [presetType, setPresetType] = useState<'free_escalation' | 'quick_removal' | 'flat_urgent' | 'custom'>('free_escalation');
  const [pricingWindows, setPricingWindows] = useState<PricingWindowInput[]>(
    getPresetPricingSchedule('free_escalation', 6)
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setPhotos((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file as Blob));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePresetSelect = (type: 'free_escalation' | 'quick_removal' | 'flat_urgent') => {
    setPresetType(type);
    setPricingWindows(getPresetPricingSchedule(type, 6));
  };

  const updatePricingWindow = (index: number, field: 'durationMinutes' | 'price', value: number) => {
    setPresetType('custom');
    setPricingWindows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addPricingWindow = () => {
    setPresetType('custom');
    setPricingWindows((prev) => [
      ...prev,
      { durationMinutes: 60, price: (prev[prev.length - 1]?.price || 0) + 50, label: `Stage ${prev.length + 1}` },
    ]);
  };

  const removePricingWindow = (index: number) => {
    if (pricingWindows.length <= 1) return;
    setPresetType('custom');
    setPricingWindows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAIAssist = async () => {
    if (photos.length === 0 && photoPreviews.length === 0) return;
    setIsAnalyzingAI(true);
    try {
      const result = await aiItemAnalysisService.analyzeItemPhoto(photos[0] || 'photo');
      if (result.suggestedTitle && !title) setTitle(result.suggestedTitle);
      if (result.suggestedDescription && !description) setDescription(result.suggestedDescription);
      if (result.estimatedResaleValue) setEstimatedValue(result.estimatedResaleValue);
      const matchedCat = categories.find((c) => c.slug === result.suggestedCategorySlug);
      if (matchedCat) setCategoryId(matchedCat.id);
      if (result.suggestedCondition) setCondition(result.suggestedCondition);
    } catch (e) {
      console.warn('AI analysis notice:', e);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!title.trim()) {
        throw new Error('Please enter an item title');
      }
      if (pricingWindows.length === 0) {
        throw new Error('Please configure at least one pricing window');
      }

      const formValues: CreateListingFormValues = {
        title,
        description,
        category_id: categoryId,
        condition,
        estimated_value: estimatedValue,
        pickup_address_text: pickupAddress,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        available_from: new Date(availableFrom).toISOString(),
        pricing_windows: pricingWindows,
        images: photos,
      };

      const newId = await listingService.createListing(sellerId, formValues);
      setIsSubmitting(false);
      onSuccess(newId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create listing');
      setIsSubmitting(false);
    }
  };

  // Calculate total schedule hours
  const totalScheduleMins = pricingWindows.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);
  const totalScheduleHours = (totalScheduleMins / 60).toFixed(1);

  return (
    <div id="create-listing-wizard" className="w-full max-w-2xl mx-auto bg-[#0A0C14] border border-white/5 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Wizard Step Progress */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <span className="text-xs font-mono font-black text-orange-400 uppercase tracking-wider">
            Step {step} of 5
          </span>
          <h2 className="text-xl font-black text-white">
            {step === 1 && 'Upload Photos'}
            {step === 2 && 'Item Information'}
            {step === 3 && 'Pickup & Location'}
            {step === 4 && 'Urgency Pricing Schedule'}
            {step === 5 && 'Review & Publish'}
          </h2>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-bold text-slate-400 hover:text-white px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: PHOTOS */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/10 hover:border-orange-500/60 rounded-3xl p-6 text-center transition-colors bg-[#05060B]">
            <input
              type="file"
              id="photo-upload-input"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <label
              htmlFor="photo-upload-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-2"
            >
              <div className="p-3.5 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-white">
                Click or drag & drop item photos
              </span>
              <span className="text-xs text-slate-400">
                High clarity pictures increase quick claim rates by 80%
              </span>
            </label>
          </div>

          {/* Previews */}
          {photoPreviews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {photoPreviews.length} photo{photoPreviews.length > 1 ? 's' : ''} uploaded
                </span>

                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={isAnalyzingAI}
                  className="flex items-center gap-1.5 text-xs font-black text-orange-300 hover:text-orange-200 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 px-3.5 py-1.5 rounded-2xl transition-colors cursor-pointer disabled:opacity-50 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzingAI ? 'Analyzing item...' : 'AI Auto-Fill Details'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#05060B] group shadow-md">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-xl bg-black/80 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer border border-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: ITEM INFO */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Item Title *
            </label>
            <input
              id="listing-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Solid Oak Office Desk & Swivel Chair"
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                id="listing-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white focus:outline-hidden focus:border-orange-500 text-sm cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Condition
              </label>
              <select
                id="listing-condition-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white focus:outline-hidden focus:border-orange-500 text-sm cursor-pointer"
              >
                <option value="like_new">Like New (Mint / Unused)</option>
                <option value="good">Good (Normal wear, fully functional)</option>
                <option value="fair">Fair (Visible scuffs / needs clean)</option>
                <option value="salvage_scrap">Salvage / Scrap Materials</option>
                <option value="for_parts">For Parts / Repair</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Estimated Value ($)
            </label>
            <input
              id="listing-est-value-input"
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(Number(e.target.value))}
              placeholder="100"
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white focus:outline-hidden focus:border-orange-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description & Special Instructions
            </label>
            <textarea
              id="listing-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include size dimensions, disassembly status, stairs/loading dock details..."
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* STEP 3: PICKUP LOCATION & AVAILABILITY */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Exact Pickup Address *
            </label>
            <input
              id="listing-pickup-address-input"
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="123 Market St, Loading Dock B, City, State"
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white focus:outline-hidden focus:border-orange-500 text-sm"
            />
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Exact address is kept strictly private and only revealed to a confirmed buyer upon claim.</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Available From
            </label>
            <input
              id="listing-available-from-input"
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white focus:outline-hidden focus:border-orange-500 text-sm font-mono"
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">
                Disposal Deadline Auto-Calculated
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Your total deadline ({totalScheduleHours} hours) is automatically linked to the pricing schedule set in the next step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: ESCALATING PRICING SCHEDULE */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Quick Schedule Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handlePresetSelect('free_escalation')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  presetType === 'free_escalation'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                    : 'bg-[#05060B] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="font-black text-xs text-white">Free-to-Paid Escalation</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  FREE 30m → $30 (2h) → $75 (2h) → $150
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('quick_removal')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  presetType === 'quick_removal'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                    : 'bg-[#05060B] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="font-black text-xs text-white">Quick Removal Step-Up</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  $20 (1h) → $50 (2h) → $100 final
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('flat_urgent')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  presetType === 'flat_urgent'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                    : 'bg-[#05060B] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="font-black text-xs text-white">100% Free Quick Grab</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  FREE for all 6 hours until deadline
                </div>
              </button>
            </div>
          </div>

          {/* Windows Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Custom Stage Windows
              </span>
              <button
                type="button"
                onClick={addPricingWindow}
                className="flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Window</span>
              </button>
            </div>

            <div className="space-y-2">
              {pricingWindows.map((w, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#05060B] border border-white/5"
                >
                  <span className="text-xs font-mono font-bold text-orange-400 w-16">
                    Stage {index + 1}
                  </span>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400">For</span>
                    <input
                      type="number"
                      min={10}
                      step={15}
                      value={w.durationMinutes}
                      onChange={(e) => updatePricingWindow(index, 'durationMinutes', Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-xl bg-[#0A0C14] border border-white/10 text-xs font-mono text-white"
                    />
                    <span className="text-xs text-slate-400">mins @</span>

                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={w.price}
                      onChange={(e) => updatePricingWindow(index, 'price', Number(e.target.value))}
                      className="w-24 px-3 py-1.5 rounded-xl bg-[#0A0C14] border border-white/10 text-xs font-mono text-white font-bold"
                    />
                  </div>

                  {pricingWindows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePricingWindow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer rounded-xl hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & PUBLISH */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#05060B] border border-white/5 space-y-3 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">
                  Ready to Publish
                </span>
                <h3 className="text-lg font-black text-white">{title || 'Untitled Item'}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{description}</p>
              </div>

              <div className="px-3.5 py-1.5 rounded-2xl text-lg font-mono font-black bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] shrink-0">
                {formatPrice(pricingWindows[0]?.price || 0)}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Condition</span>
                <span className="capitalize font-medium text-white">{condition.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Windows</span>
                <span className="font-medium text-white">{pricingWindows.length} stages ({totalScheduleHours}h total)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Initial Price</span>
                <span className="font-bold text-green-400">{formatPrice(pricingWindows[0]?.price || 0)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400 mt-0.5" />
            <div>
              <span className="font-bold block">Nearby Matching Alert</span>
              <p className="mt-0.5 text-slate-300 leading-relaxed">
                Upon publishing, buyers who have registered interest alerts for this category within your radius will be matched.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer border border-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02]"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            id="publish-listing-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer shadow-[0_0_25px_rgba(249,115,22,0.5)] hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Publishing...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Listing Now</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
