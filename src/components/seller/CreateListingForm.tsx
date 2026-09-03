import React, { useMemo, useState } from 'react';
import { Category, CreateListingFormValues } from '../../types/marketplace';
import { formatPrice, getStepUpPreset } from '../../utils/pricing';
import { listingService } from '../../services/listingService';
import { AlertCircle, CheckCircle2, Clock, MapPin, Trash2, Upload } from 'lucide-react';

interface CreateListingFormProps {
  categories: Category[];
  sellerId: string;
  onSuccess: (newListingId: string) => void;
  onCancel: () => void;
}

const DEADLINE_HOURS = [2, 4, 6, 12] as const;

export const CreateListingForm: React.FC<CreateListingFormProps> = ({
  categories,
  sellerId,
  onSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [deadlineHours, setDeadlineHours] = useState<(typeof DEADLINE_HOURS)[number]>(4);
  const [categoryId, setCategoryId] = useState('');

  const pricingWindows = useMemo(() => getStepUpPreset(deadlineHours), [deadlineHours]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, 4);
    setPhotos((prev) => [...prev, ...newFiles].slice(0, 4));
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file as Blob));
    setPhotoPreviews((prev) => [...prev, ...newPreviews].slice(0, 4));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('This browser cannot share location.');
      return;
    }
    setLocationStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupLat(pos.coords.latitude);
        setPickupLng(pos.coords.longitude);
        setLocationStatus('Location set. Buyers see distance only — not this pin.');
      },
      () => {
        setLocationStatus('Could not read location. Allow location access and try again.');
      },
      { enableHighAccuracy: false, timeout: 12000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!title.trim()) throw new Error('Add a short title');
      if (!pickupAddress.trim()) throw new Error('Add the pickup address');
      if (pickupLat == null || pickupLng == null) {
        throw new Error('Use your current location so buyers can see distance');
      }

      const formValues: CreateListingFormValues = {
        title: title.trim(),
        pickup_address_text: pickupAddress.trim(),
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        category_id: categoryId || undefined,
        condition: 'good',
        pricing_windows: pricingWindows,
        images: photos,
      };

      const newId = await listingService.createListing(sellerId, formValues);
      onSuccess(newId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not publish listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="create-listing-form"
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto bg-[#0A0C14] border border-white/5 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5"
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Post an item</h2>
          <p className="text-xs text-slate-400 mt-1">Photo, title, pickup, deadline. Under a minute.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-400 hover:text-white px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Photo</label>
        <div className="border-2 border-dashed border-white/10 hover:border-orange-500/60 rounded-3xl p-5 text-center bg-[#05060B]">
          <input type="file" id="photo-upload-input" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          <label htmlFor="photo-upload-input" className="flex flex-col items-center cursor-pointer space-y-2">
            <div className="p-3 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-white">Take or upload a photo</span>
          </label>
        </div>
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-black/80 text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Title</label>
        <input
          id="listing-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Oak desk, must go today"
          className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pickup address</label>
        <input
          id="listing-pickup-address-input"
          type="text"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          placeholder="123 Market St, loading dock B"
          className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 text-sm"
        />
        <p className="mt-2 text-xs text-slate-400">Exact address stays hidden until someone claims it.</p>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-orange-400" />
          Use my current location
        </button>
        {locationStatus && <p className="mt-2 text-xs text-slate-300">{locationStatus}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Gone by</label>
        <div className="grid grid-cols-4 gap-2">
          {DEADLINE_HOURS.map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => setDeadlineHours(hours)}
              className={`py-2.5 rounded-xl text-xs font-black cursor-pointer border ${
                deadlineHours === hours
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-[#05060B] text-slate-300 border-white/10'
              }`}
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-400">
          <Clock className="w-4 h-4" />
          Price preset
        </div>
        <p className="text-sm font-bold text-white">Free now, then step-up</p>
        <p className="text-xs text-slate-400">
          {pricingWindows.map((w, i) => `${i === 0 ? '' : ' → '}${formatPrice(w.price)} for ${w.durationMinutes}m`).join('')}
        </p>
      </div>

      {categories.length > 0 && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Category <span className="normal-case font-medium text-slate-500">(optional)</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-white text-sm cursor-pointer"
          >
            <option value="">Skip</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        id="publish-listing-btn"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          'Publishing…'
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Publish
          </>
        )}
      </button>
    </form>
  );
};
