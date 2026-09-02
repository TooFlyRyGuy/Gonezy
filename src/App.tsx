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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-neutral-950 pb-20 lg:pb-8">
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
            <div className="p-4 sm:p-5 rounded-3xl bg-radial from-amber-500/15 via-neutral-900 to-neutral-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                    Hyperlocal Live Urgency Feed
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-100">
                  Items must be picked up before deadlines. Prices escalate over time!
                </h2>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  id="filter-free-only-btn"
                  onClick={() => setOnlyFree(!onlyFree)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    onlyFree
                      ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Free Right Now ({listings.filter((l) => l.current_price === 0).length})</span>
                </button>

                <button
                  id="refresh-feed-btn"
                  onClick={loadData}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
                  title="Refresh listings"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingListings ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mobile Search input */}
            <div className="md:hidden">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools, furniture, scrap..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500"
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
            <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
              <span className="font-medium">
                Showing <strong className="text-neutral-200">{filteredListings.length}</strong> urgent item{filteredListings.length === 1 ? '' : 's'} nearby
              </span>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-hidden cursor-pointer"
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
                  <div key={n} className="aspect-4/3 rounded-2xl bg-neutral-900 animate-pulse border border-neutral-800" />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="p-16 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center space-y-4">
                <Zap className="w-12 h-12 text-neutral-600 mx-auto" />
                <h3 className="text-base font-bold text-neutral-200">No matching items right now</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Try clearing your filters, expanding your category search, or set an alert in the Wanted tab.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setOnlyFree(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
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
