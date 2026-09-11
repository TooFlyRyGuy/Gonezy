import React, { useEffect, useState } from 'react';
import {
  Armchair,
  Box,
  Building2,
  Car,
  CheckCircle2,
  Hammer,
  Home,
  Recycle,
  Refrigerator,
  Sparkles,
  Sun,
  Trees,
  Truck,
  Tv,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { Category, DropEmailMode } from '../../types/marketplace';
import { categoryService } from '../../services/categoryService';
import { pickupInterestService, PickupInterestState } from '../../services/pickupInterestService';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Armchair,
  Refrigerator,
  Tv,
  Wrench,
  Hammer,
  Sun,
  Trees,
  Car,
  Truck,
  UtensilsCrossed,
  Building2,
  Home,
  Sparkles,
  Recycle,
  Box,
};

interface PickupInterestsCardProps {
  userId: string;
  variant?: 'profile' | 'signup';
  onSaved?: (state: PickupInterestState) => void;
  onSkip?: () => void;
}

export const PickupInterestsCard: React.FC<PickupInterestsCardProps> = ({
  userId,
  variant = 'profile',
  onSaved,
  onSkip,
}) => {
  const isSignup = variant === 'signup';
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');
  const [dropEmailMode, setDropEmailMode] = useState<DropEmailMode>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const [cats, saved] = await Promise.all([
          categoryService.getCategories(),
          pickupInterestService.getPickupInterests(userId),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setCategoryIds(saved.categoryIds);
        setLookingFor(saved.lookingFor);
        setDropEmailMode(saved.dropEmailMode);
      } catch (err: any) {
        if (mounted) setErrorMessage(err.message || 'Could not load pickup interests');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dropEmailMode === 'matching' && categoryIds.length === 0) {
      setErrorMessage('Tap a category first — otherwise we keep sending every new drop.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      const saved = await pickupInterestService.savePickupInterests(userId, {
        categoryIds,
        lookingFor,
        dropEmailMode,
      });
      setCategoryIds(saved.categoryIds);
      setLookingFor(saved.lookingFor);
      setDropEmailMode(saved.dropEmailMode);
      setSaveSuccess(true);
      onSaved?.(saved);
      if (!isSignup) {
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save pickup interests');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className={
        isSignup
          ? 'space-y-4'
          : 'p-6 rounded-3xl bg-[#0A0C14] border border-white/5 space-y-5'
      }
    >
      {!isSignup && (
        <div className="border-b border-white/5 pb-3 space-y-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">What I pick up</h3>
          <p className="text-xs text-slate-500">Tap what you want. Private — nobody else sees this.</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-slate-400">Loading categories…</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon_name] || Box;
            const selected = categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                id={`pickup-interest-${cat.slug}`}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selected
                    ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          What I&apos;m looking for{' '}
          <span className="normal-case font-medium text-slate-500">(private)</span>
        </label>
        <textarea
          id="pickup-looking-for"
          value={lookingFor}
          onChange={(e) => {
            setLookingFor(e.target.value.slice(0, 280));
            setSaveSuccess(false);
          }}
          rows={isSignup ? 2 : 3}
          placeholder="oak dresser, working fridge"
          className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 resize-none"
        />
      </div>

      {!isSignup && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">New-drop emails</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              id="drop-email-mode-all"
              onClick={() => {
                setDropEmailMode('all');
                setErrorMessage(null);
              }}
              className={`p-4 rounded-2xl border text-left cursor-pointer ${
                dropEmailMode === 'all' ? 'bg-orange-500/15 border-orange-500' : 'bg-[#05060B] border-white/5'
              }`}
            >
              <div className="font-bold text-xs text-white">All new drops</div>
              <p className="text-[11px] text-slate-400 mt-1">Every listing. Same as today.</p>
            </button>
            <button
              type="button"
              id="drop-email-mode-matching"
              onClick={() => {
                setDropEmailMode('matching');
                setErrorMessage(null);
              }}
              className={`p-4 rounded-2xl border text-left cursor-pointer ${
                dropEmailMode === 'matching' ? 'bg-orange-500/15 border-orange-500' : 'bg-[#05060B] border-white/5'
              }`}
            >
              <div className="font-bold text-xs text-white">Only my categories</div>
              <p className="text-[11px] text-slate-400 mt-1">Needs at least one tap.</p>
            </button>
          </div>
        </div>
      )}

      {isSignup && (
        <p className="text-[11px] text-slate-500">
          We&apos;ll email every new drop for now. Change that anytime on Profile.
        </p>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Saved
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {errorMessage}
        </div>
      )}

      <div className={`flex ${isSignup ? 'justify-between' : 'justify-end'} gap-2`}>
        {isSignup && (
          <button
            type="button"
            id="skip-pickup-interests"
            onClick={onSkip}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            Skip
          </button>
        )}
        <button
          type="submit"
          id="save-pickup-interests"
          disabled={isSaving || isLoading}
          className="px-6 py-3 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : isSignup ? 'Save' : 'Save interests'}
        </button>
      </div>
    </form>
  );
};
