import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Zap,
  Plus,
  Bell,
  Search,
  Database,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onOpenAuthModal,
  onOpenSupabaseModal,
  searchQuery,
  onSearchChange,
}) => {
  const { user, profile, isSupabaseConfigured } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div
          id="brand-logo"
          onClick={() => onNavigate('explore')}
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold">
            <Zap className="w-5 h-5 fill-neutral-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-neutral-100">
                Nab<span className="text-amber-400">Go</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Hyperlocal
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 hidden sm:block">
              Urgency Marketplace
            </span>
          </div>
        </div>

        {/* Global Search Bar (Explore Tab) */}
        {currentTab === 'explore' && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tools, furniture, appliances, scrap..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => onNavigate('explore')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Explore Feed
          </button>

          <button
            onClick={() => onNavigate('wanted')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              currentTab === 'wanted'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Wanted Alerts
          </button>

          <button
            onClick={() => onNavigate('activity')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              currentTab === 'activity'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Activity & Claims
          </button>
        </div>

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Post Item Button (CTA) */}
          <button
            id="post-item-header-btn"
            onClick={() => onNavigate('sell')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Post Urgent Item</span>
            <span className="sm:hidden">Post</span>
          </button>

          {/* Supabase Status Pill Button */}
          <button
            id="db-status-btn"
            onClick={onOpenSupabaseModal}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSupabaseConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Database Status & Migrations"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Button */}
          {user ? (
            <button
              id="profile-header-btn"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-neutral-200 block leading-tight">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-neutral-400 capitalize">
                  {profile?.business_type?.replace('_', ' ') || profile?.account_type || 'Buyer'}
                </span>
              </div>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border border-neutral-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                  {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              id="auth-header-btn"
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
