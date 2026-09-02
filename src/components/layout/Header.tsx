import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GonezyLogo } from '../common/GonezyLogo';
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
    <header className="sticky top-0 z-40 bg-[#0A0C14] border-b border-white/5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div id="brand-logo">
          <GonezyLogo
            size="md"
            onClick={() => onNavigate('explore')}
          />
        </div>

        {/* Global Search Bar (Explore Tab) */}
        {currentTab === 'explore' && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 w-full focus-within:border-orange-500/60 focus-within:bg-white/10 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search items near Austin, TX..."
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('explore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            Explore
          </button>

          <button
            onClick={() => onNavigate('wanted')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'wanted'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            Wanted
          </button>

          <button
            onClick={() => onNavigate('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'activity'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            Activity
          </button>
        </div>

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-3">
          {/* Post Item Button (CTA) */}
          <button
            id="post-item-header-btn"
            onClick={() => onNavigate('sell')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_10px_20px_rgba(249,115,22,0.3)] cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Post Urgent Item</span>
            <span className="sm:hidden">Post</span>
          </button>

          {/* Alert Notification Pill Indicator */}
          <button
            id="header-notification-btn"
            onClick={() => onNavigate('wanted')}
            className="relative p-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 transition-colors cursor-pointer"
            title="Urgency Alerts"
          >
            <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_#f97316]"></div>
            <Bell className="w-4 h-4" />
          </button>

          {/* Supabase Status Pill Button */}
          <button
            id="db-status-btn"
            onClick={onOpenSupabaseModal}
            className={`p-2.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
              isSupabaseConfigured
                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 shadow-[0_0_8px_rgba(74,222,128,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
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
              className="flex items-center gap-2.5 p-1 pl-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-100 block leading-tight">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {profile?.business_type?.replace('_', ' ') || profile?.account_type || 'Buyer'}
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
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-100 border border-white/10 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
