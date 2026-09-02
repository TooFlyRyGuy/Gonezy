import React, { useEffect, useState } from 'react';
import { BuyerInterest, Category } from '../../types/marketplace';
import { interestService } from '../../services/interestService';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Tag,
  DollarSign,
  Radio,
  X,
} from 'lucide-react';

interface WantedItemsViewProps {
  userId: string;
  categories: Category[];
}

export const WantedItemsView: React.FC<WantedItemsViewProps> = ({
  userId,
  categories,
}) => {
  const [interests, setInterests] = useState<BuyerInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Alert Form
  const [searchText, setSearchText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [radiusMiles, setRadiusMiles] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInterests = async () => {
    setIsLoading(true);
    try {
      const data = await interestService.getUserInterests(userId);
      setInterests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterests();
  }, [userId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    setIsSubmitting(true);
    try {
      await interestService.createInterest(userId, {
        search_text: searchText.trim(),
        category_id: categoryId || null,
        max_price: maxPrice === '' ? null : Number(maxPrice),
        radius_miles: radiusMiles,
      });

      setSearchText('');
      setCategoryId('');
      setMaxPrice('');
      setIsModalOpen(false);
      await loadInterests();
    } catch (err) {
      console.error('Error creating interest:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await interestService.toggleActive(id, !current);
      setInterests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_active: !current } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await interestService.deleteInterest(id);
      setInterests((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-gradient-to-r from-neutral-900 to-neutral-900/60 rounded-3xl border border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-neutral-100">
              Wanted Items & Urgency Alerts
            </h1>
          </div>
          <p className="text-xs text-neutral-400">
            Get instantly notified when haulers or cleanout crews post items matching your interests nearby.
          </p>
        </div>

        <button
          id="create-alert-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert</span>
        </button>
      </div>

      {/* List of Interests */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-400">Loading your alerts...</div>
      ) : interests.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900/50 border border-neutral-800 text-center space-y-3">
          <Bell className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-200">No active wanted alerts</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Set up alerts for tools, patio sets, scrap metal, or commercial gear to grab them first when posted.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-neutral-950 cursor-pointer"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {interests.map((item) => {
            const categoryObj = categories.find((c) => c.id === item.category_id);

            return (
              <div
                key={item.id}
                id={`interest-card-${item.id}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  item.is_active
                    ? 'bg-neutral-900 border-neutral-800'
                    : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                      <h4 className="text-sm font-bold text-neutral-100">
                        "{item.search_text}"
                      </h4>
                    </div>
                    {categoryObj && (
                      <span className="text-[11px] text-amber-400/90 font-medium block mt-1">
                        Category: {categoryObj.name}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs text-neutral-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      {item.radius_miles} mi radius
                    </span>
                    <span>•</span>
                    <span>
                      {item.max_price ? `Max $${item.max_price}` : 'Any Price / Free'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      item.is_active
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-neutral-100"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-100">
                Create Wanted Item Alert
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Item Description or Keywords *
                </label>
                <input
                  type="text"
                  required
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., Commercial refrigerator, DeWalt tools, teak furniture"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Category (Optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Leave empty for any"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Radius (Miles)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Activate Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
