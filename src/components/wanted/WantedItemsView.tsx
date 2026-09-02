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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-[#0A0C14] rounded-3xl border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-white">
              Wanted Items & Urgency Alerts
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Get instantly notified when haulers or cleanout crews post items matching your interests nearby.
          </p>
        </div>

        <button
          id="create-alert-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs bg-orange-500 hover:bg-orange-400 text-white transition-all shrink-0 cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert</span>
        </button>
      </div>

      {/* List of Interests */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading your alerts...</div>
      ) : interests.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-3">
          <Bell className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No active wanted alerts</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Set up alerts for tools, patio sets, scrap metal, or commercial gear to grab them first when posted.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl text-xs font-black bg-orange-500 text-white cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:scale-[1.02]"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interests.map((item) => {
            const categoryObj = categories.find((c) => c.id === item.category_id);

            return (
              <div
                key={item.id}
                id={`interest-card-${item.id}`}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  item.is_active
                    ? 'bg-[#0A0C14] border-white/10 shadow-lg'
                    : 'bg-[#0A0C14]/40 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.is_active ? 'bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]' : 'bg-slate-600'}`} />
                      <h4 className="text-sm font-black text-white">
                        "{item.search_text}"
                      </h4>
                    </div>
                    {categoryObj && (
                      <span className="text-[11px] text-orange-400 font-bold block mt-1">
                        Category: {categoryObj.name}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl transition-colors cursor-pointer hover:bg-white/5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center gap-3 font-medium">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      {item.radius_miles} mi radius
                    </span>
                    <span>•</span>
                    <span className="text-slate-200">
                      {item.max_price ? `Max $${item.max_price}` : 'Any Price / Free'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                      item.is_active
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                        : 'bg-white/5 text-slate-400 border border-white/5'
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0A0C14] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-white">
                Create Wanted Item Alert
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Item Description or Keywords *
                </label>
                <input
                  type="text"
                  required
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., Commercial refrigerator, DeWalt tools, teak furniture"
                  className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category (Optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500 cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Leave empty for any"
                    className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Radius (Miles)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
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
