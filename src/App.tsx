import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { CategoryPills } from './components/common/CategoryPills';
import { ListingCard } from './components/marketplace/ListingCard';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { ClaimModal } from './components/marketplace/ClaimModal';
import { CreateListingForm } from './components/seller/CreateListingForm';
import { ActivityView } from './components/activity/ActivityView';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';
import { isResetPasswordLocation, ResetPasswordView } from './components/auth/ResetPasswordView';
import { listingService } from './services/listingService';
import { categoryService } from './services/categoryService';
import { Category, ListingWithDetails, NavigationTab } from './types/marketplace';
import { isPreviewMode, supabase } from './lib/supabase';
import { useUserLocation } from './hooks/useUserLocation';
import { AlertTriangle, MapPin, RefreshCw, Search } from 'lucide-react';

function SignInGate({
  title,
  body,
  onSignIn,
}: {
  title: string;
  body: string;
  onSignIn: () => void;
}) {
  return (
    <div className="max-w-md mx-auto p-10 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-4">
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="text-xs text-slate-400">{body}</p>
      <button
        onClick={onSignIn}
        className="px-5 py-3 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer"
      >
        Sign in
      </button>
    </div>
  );
}

function MarketplaceApp() {
  const { user, profile, isSupabaseConfigured, authError } = useAuth();
  const { coords, status: locationStatus, error: locationError, requestLocation } = useUserLocation({
    lat: profile?.home_latitude ?? null,
    lng: profile?.home_longitude ?? null,
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>('explore');
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [sortBy, setSortBy] = useState<'urgent' | 'distance' | 'price_low'>('urgent');
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [claimListingTarget, setClaimListingTarget] = useState<ListingWithDetails | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoadingListings(true);
    setFeedError(null);
    try {
      const [cats, items] = await Promise.all([
        categoryService.getCategories(),
        listingService.getListings({
          userLat: coords?.lat,
          userLng: coords?.lng,
        }),
      ]);
      setCategories(cats);
      setListings(items);
    } catch (err: any) {
      setFeedError(err.message || 'Could not load listings');
      setListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [coords?.lat, coords?.lng]);

  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (selectedCategoryId && item.category_id !== selectedCategoryId) return false;
        if (onlyFree && item.current_price > 0) return false;
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
        return new Date(a.pickup_deadline).getTime() - new Date(b.pickup_deadline).getTime();
      });
  }, [listings, selectedCategoryId, onlyFree, searchQuery, sortBy]);

  const requireAuth = (next: () => void) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    next();
  };

  const handleNavigate = (tab: NavigationTab) => {
    if ((tab === 'sell' || tab === 'activity' || tab === 'profile') && !user) {
      setIsAuthModalOpen(true);
      setCurrentTab(tab);
      return;
    }
    setCurrentTab(tab);
  };

  const handleQuickClaim = (listing: ListingWithDetails) => {
    requireAuth(() => setClaimListingTarget(listing));
  };

  const handleClaimSuccess = () => {
    loadData();
    setCurrentTab('activity');
  };

  return (
    <div className="min-h-screen bg-[#05060B] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white pb-20 lg:pb-8 font-sans">
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'explore' && (
          <div className="space-y-6">
            {isPreviewMode() && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100">
                Preview only — Supabase is not configured. These sample items are labeled so you can see the feed.
                Posting and claiming stay off until live credentials are set.
              </div>
            )}

            {authError && isSupabaseConfigured && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            {feedError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Could not load listings</p>
                    <p className="mt-1">{feedError}</p>
                  </div>
                </div>
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="p-5 rounded-3xl bg-[#0A0C14] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">Nearby items. Sooner is cheaper.</h2>
                <p className="text-xs text-slate-400 mt-1">Current price and time left sit on every card.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setOnlyFree(!onlyFree)}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-2xl text-xs font-black cursor-pointer ${
                    onlyFree ? 'bg-green-500 text-white' : 'bg-white/5 text-slate-300 border border-white/5'
                  }`}
                >
                  Free now ({listings.filter((l) => l.current_price === 0).length})
                </button>
                <button
                  id="refresh-feed-btn"
                  onClick={loadData}
                  className="p-2.5 rounded-2xl bg-white/5 text-slate-300 border border-white/5 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingListings ? 'animate-spin text-orange-400' : ''}`} />
                </button>
              </div>
            </div>

            {locationStatus !== 'granted' && (
              <div className="p-4 rounded-2xl bg-[#0A0C14] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Share your location to see distance</p>
                    <p className="mt-1 text-slate-400">
                      We do not assume a city. Exact listing addresses stay hidden until you claim.
                    </p>
                    {locationError && <p className="mt-1 text-red-300">{locationError}</p>}
                  </div>
                </div>
                <button
                  onClick={requestLocation}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer shrink-0"
                >
                  {locationStatus === 'requesting' ? 'Checking…' : 'Use my location'}
                </button>
              </div>
            )}

            <div className="md:hidden">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0A0C14] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            <CategoryPills
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                <strong className="text-white">{filteredListings.length}</strong> nearby
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 rounded-xl bg-[#0A0C14] border border-white/10 text-xs text-slate-200 cursor-pointer"
              >
                <option value="urgent">Time left</option>
                <option value="distance">Nearest</option>
                <option value="price_low">Lowest price</option>
              </select>
            </div>

            {isLoadingListings ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="aspect-4/3 rounded-3xl bg-[#0A0C14] animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredListings.length === 0 && !feedError ? (
              <div className="p-16 rounded-3xl bg-[#0A0C14] border border-white/5 text-center space-y-4">
                <h3 className="text-base font-bold text-white">Nothing nearby right now</h3>
                <p className="text-xs text-slate-400">Clear filters or post an item that needs to go today.</p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setOnlyFree(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/10 text-white cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onSelect={setSelectedListing}
                    onQuickClaim={handleQuickClaim}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'sell' &&
          (user ? (
            <CreateListingForm
              categories={categories}
              sellerId={user.id}
              onSuccess={() => {
                loadData();
                setCurrentTab('explore');
              }}
              onCancel={() => setCurrentTab('explore')}
            />
          ) : (
            <SignInGate
              title="Sign in to post"
              body="Posting requires a real account. Demo seller ids are gone."
              onSignIn={() => setIsAuthModalOpen(true)}
            />
          ))}

        {currentTab === 'activity' &&
          (user ? (
            <ActivityView userId={user.id} onSelectListing={setSelectedListing} />
          ) : (
            <SignInGate
              title="Sign in to see activity"
              body="Claims, pickup windows, and outcomes live here."
              onSignIn={() => setIsAuthModalOpen(true)}
            />
          ))}

        {currentTab === 'profile' &&
          (user ? (
            <ProfileView />
          ) : (
            <SignInGate
              title="Sign in"
              body="Browse without an account. Posting and claiming need sign-in."
              onSignIn={() => setIsAuthModalOpen(true)}
            />
          ))}
      </main>

      <BottomNav currentTab={currentTab} onNavigate={handleNavigate} />

      <ListingDetailModal
        listing={selectedListing}
        currentUserId={user?.id}
        onClose={() => setSelectedListing(null)}
        onClaim={(item) => {
          setSelectedListing(null);
          handleQuickClaim(item);
        }}
      />

      <ClaimModal
        listing={claimListingTarget}
        buyerId={user?.id || null}
        buyerCoords={coords}
        onClose={() => setClaimListingTarget(null)}
        onSuccess={handleClaimSuccess}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignedUp={() => {
          setIsAuthModalOpen(false);
          setCurrentTab('profile');
        }}
      />
    </div>
  );
}

function RootApp() {
  const [showResetPassword, setShowResetPassword] = useState(() => isResetPasswordLocation());

  useEffect(() => {
    if (isResetPasswordLocation()) {
      setShowResetPassword(true);
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (showResetPassword) {
    return (
      <ResetPasswordView
        onDone={() => {
          window.history.replaceState({}, '', '/');
          setShowResetPassword(false);
        }}
      />
    );
  }

  return <MarketplaceApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
