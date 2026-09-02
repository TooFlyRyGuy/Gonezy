import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AccountType, BusinessType } from '../../types/database.types';
import {
  User,
  Building2,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Sparkles,
  Sliders,
  Database,
} from 'lucide-react';

interface ProfileViewProps {
  onOpenSupabaseModal: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenSupabaseModal }) => {
  const { user, profile, updateProfile, signOut, setDemoUser, isSupabaseConfigured } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [accountType, setAccountType] = useState<AccountType>(profile?.account_type || 'consumer');
  const [businessName, setBusinessName] = useState(profile?.business_name || '');
  const [businessType, setBusinessType] = useState<BusinessType | ''>(profile?.business_type || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [searchRadius, setSearchRadius] = useState(profile?.default_search_radius_miles || 25);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfile({
        display_name: displayName,
        phone,
        account_type: accountType,
        business_name: accountType === 'business' ? businessName : null,
        business_type: accountType === 'business' ? (businessType as BusinessType) : null,
        bio,
        default_search_radius_miles: searchRadius,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-neutral-700 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg font-bold">
                {(profile?.display_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-neutral-100">
                  {profile?.display_name || user?.email?.split('@')[0] || 'Member Profile'}
                </h2>
                {profile?.is_verified && (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {user?.email || 'Authenticated User'}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Demo Switcher Pill */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2">
          <div className="text-xs text-neutral-400">
            <span className="font-bold text-neutral-300">Quick Testing Persona:</span>
            <span className="ml-1">Simulate either Buyer or Commercial Seller flow</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDemoUser('buyer')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Buyer Persona
            </button>
            <button
              onClick={() => setDemoUser('seller')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              Seller (Mover)
            </button>
          </div>
        </div>
      </div>

      {/* Database Setup Callout */}
      <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isSupabaseConfigured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-200">
              Supabase Backend Status: {isSupabaseConfigured ? 'Connected' : 'Setup Ready'}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {isSupabaseConfigured 
                ? 'Production PostgreSQL database and RLS policies active.'
                : 'Configure your environment variables and execute SQL migrations in 1 click.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSupabaseModal}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 shrink-0 cursor-pointer border border-neutral-700"
        >
          View Migrations
        </button>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-3">
          Edit Profile Information
        </h3>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Phone Number (For Pickups)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-100 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Account Type Toggle */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('consumer')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                accountType === 'consumer'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              <User className="w-4 h-4 mb-1" />
              <div className="font-bold text-xs">Individual Consumer</div>
              <div className="text-[10px] text-neutral-400">Buying or occasional selling</div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                accountType === 'business'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              <Building2 className="w-4 h-4 mb-1" />
              <div className="font-bold text-xs">Business / Pro Hauler</div>
              <div className="text-[10px] text-neutral-400">Junk haulers, movers, contractors</div>
            </button>
          </div>
        </div>

        {accountType === 'business' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Hauling & Demolition"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Business Category
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
              >
                <option value="junk_hauler">Junk Hauler</option>
                <option value="mover">Mover / Relocation</option>
                <option value="estate_cleanout">Estate Cleanout</option>
                <option value="property_manager">Property Manager</option>
                <option value="contractor">General Contractor</option>
                <option value="restoration_company">Restoration Company</option>
                <option value="reseller">Reseller / Salvage Specialist</option>
                <option value="retailer">Retailer / Surplus</option>
                <option value="nonprofit">Nonprofit / Donation Center</option>
                <option value="other">Other Business</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Bio / Public Notes
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce your business or pickup truck capabilities..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Default Search Radius: {searchRadius} Miles
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
