import React, { useEffect, useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { CategoryPills } from './components/common/CategoryPills';
import { ListingCard } from './components/marketplace/ListingCard';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { ClaimModal } from './components/marketplace/ClaimModal';
import { CreateListingWizard } from './components/seller/CreateListingWizard';
import { WantedItemsView } from './components/wanted/WantedItemsView';
import { ActivityView } from './components/activity/ActivityView';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';
import { SupabaseStatusModal } from './components/common/SupabaseStatusModal';
import { listingService } from './services/listingService';
import { categoryService } from './services/categoryService';
import { Category, ListingWithDetails } from './types/marketplace';
import {
  Zap,
  Flame,
  SlidersHorizontal,
  RefreshCw,
  Search,
  Plus,
  Radio,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

function MarketplaceApp() {
  const { user, profile } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'explore' | 'wanted' | 'sell' | 'activity' | 'profile'>('explore');

  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // Filters & Search State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [sortBy, setSortBy] = useState<'urgent' | 'distance' | 'price_low'>('urgent');

  // Modals
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [claimListingTarget, setClaimListingTarget] = useState<ListingWithDetails | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Load Categories & Listings
  const loadData = async () => {
    setIsLoadingListings(true);
    try {
      const [cats, items] = await Promise.all([
        categoryService.getCategories(),
        listingService.getListings({
          userLat: profile?.home_latitude || 37.7749,
          userLng: profile?.home_longitude || -122.4194,
        }),
      ]);
      setCategories(cats);
      setListings(items);
    } catch (err) {
      console.error('Failed to load marketplace items:', err);
    } finally {
      setIsLoadingListings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.home_latitude, profile?.home_longitude]);

  // Filtered and Sorted Listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (selectedCategoryId && item.category_id !== selectedCategoryId) {
          return false;
        }
        if (onlyFree && item.current_price > 0) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCat = item.category?.name.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return (a.calculated_distance_miles || 99) - (b.calculated_distance_miles || 99);
        }
        if (sortBy === 'price_low') {
          return a.current_price - b.current_price;
        }
        // Default: 'urgent' by pickup deadline
        return new Date(a.pickup_deadline).getTime() - new Date(b.pickup_deadline).getTime();
      });
  }, [listings, selectedCategoryId, onlyFree, searchQuery, sortBy]);

  const handleQuickClaim = (listing: ListingWithDetails) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setClaimListingTarget(listing);
  };

  const handleClaimSuccess = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#05060B] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white pb-20 lg:pb-8 font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as any)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* EXPLORE FEED TAB */}
        {currentTab === 'explore' && (
          <div className="space-y-6">
            {/* Live Urgency Ticker Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-radial from-orange-500/15 via-[#0A0C14] to-[#0A0C14] border border-orange-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">
                    Hyperlocal Live Urgency Feed
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Items must be picked up before deadlines. Prices escalate over time!
                </h2>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  id="filter-free-only-btn"
                  onClick={() => setOnlyFree(!onlyFree)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    onlyFree
                      ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(74,222,128,0.4)]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Free Right Now ({listings.filter((l) => l.current_price === 0).length})</span>
                </button>

                <button
                  id="refresh-feed-btn"
                  onClick={loadData}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors cursor-pointer"
                  title="Refresh listings"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingListings ? 'animate-spin text-orange-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mobile Search input */}
            <div className="md:hidden">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools, furniture, scrap..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0A0C14] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 shadow-inner"
                />
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="space-y-2">
              <CategoryPills
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />
            </div>

            {/* Sort & Count Header */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="font-medium">
                Showing <strong className="text-white font-bold">{filteredListings.length}</strong> urgent item{filteredListings.length === 1 ? '' : 's'} nearby
              </span>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#0A0C14] border border-white/10 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="urgent">Most Urgent (Time Left)</option>
                  <option value="distance">Nearest Distance</option>
                  <option value="price_low">Lowest Price First</option>
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            {isLoadingListings ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="aspect-4/3 rounded-3xl bg-[#0A0C14] animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="p-16 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-4">
                <Zap className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No matching items right now</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try clearing your filters, expanding your category search, or set an alert in the Wanted tab.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setOnlyFree(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer border border-white/10 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onSelect={(item) => setSelectedListing(item)}
                    onQuickClaim={(item) => handleQuickClaim(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* WANTED ALERTS TAB */}
        {currentTab === 'wanted' && (
          <WantedItemsView
            userId={user?.id || 'demo-buyer-user'}
            categories={categories}
          />
        )}

        {/* SELL / POST ITEM TAB */}
        {currentTab === 'sell' && (
          <CreateListingWizard
            categories={categories}
            sellerId={user?.id || 'seller-demo-1'}
            onSuccess={(newId) => {
              loadData();
              setCurrentTab('explore');
            }}
            onCancel={() => setCurrentTab('explore')}
          />
        )}

        {/* ACTIVITY TAB */}
        {currentTab === 'activity' && (
          <ActivityView
            userId={user?.id || 'demo-buyer-user'}
            onSelectListing={(listing) => setSelectedListing(listing)}
          />
        )}

        {/* PROFILE TAB */}
        {currentTab === 'profile' && (
          <ProfileView onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as any)}
      />

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listing={selectedListing}
        currentUserId={user?.id}
        onClose={() => setSelectedListing(null)}
        onClaim={(item) => {
          setSelectedListing(null);
          handleQuickClaim(item);
        }}
      />

      {/* Claim Modal */}
      <ClaimModal
        listing={claimListingTarget}
        buyerId={user?.id || 'demo-buyer-user'}
        onClose={() => setClaimListingTarget(null)}
        onSuccess={handleClaimSuccess}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Supabase Migration & Architecture Status Modal */}
      <SupabaseStatusModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceApp />
    </AuthProvider>
  );
}
