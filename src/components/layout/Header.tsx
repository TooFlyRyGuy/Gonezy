import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GonezyLogo } from '../common/GonezyLogo';
import { Plus, Search } from 'lucide-react';
import { NavigationTab } from '../../types/marketplace';

interface HeaderProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onOpenAuthModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onOpenAuthModal,
  searchQuery,
  onSearchChange,
}) => {
  const { user, profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0A0C14] border-b border-white/5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        <div id="brand-logo">
          <GonezyLogo size="md" onClick={() => onNavigate('explore')} />
        </div>

        {currentTab === 'explore' && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 w-full focus-within:border-orange-500/60">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search nearby items"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('explore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            Nearby
          </button>
          <button
            onClick={() => onNavigate('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer ${
              currentTab === 'activity'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            Activity
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="post-item-header-btn"
            onClick={() => onNavigate('sell')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-400 text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Post item</span>
            <span className="sm:hidden">Post</span>
          </button>

          {user ? (
            <button
              id="profile-header-btn"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2.5 p-1 pl-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-100 block leading-tight">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-orange-500/50 p-0.5 shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {(profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </button>
          ) : (
            <button
              id="auth-header-btn"
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-100 border border-white/10 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
