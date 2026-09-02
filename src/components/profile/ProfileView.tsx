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
      <div className="p-6 rounded-3xl bg-[#0A0C14] border border-white/5 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center text-lg font-black shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                {(profile?.display_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {profile?.display_name || user?.email?.split('@')[0] || 'Member Profile'}
                </h2>
                {profile?.is_verified && (
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {user?.email || 'Authenticated User'}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Demo Switcher Pill */}
        <div className="p-3.5 rounded-2xl bg-[#05060B] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span className="font-black text-slate-200">Quick Testing Persona:</span>
            <span className="ml-1">Switch between Buyer or Commercial Seller</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDemoUser('buyer')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 transition-colors cursor-pointer"
            >
              Buyer Persona
            </button>
            <button
              onClick={() => setDemoUser('seller')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 transition-colors cursor-pointer shadow-[0_0_10px_rgba(249,115,22,0.2)]"
            >
              Seller (Mover)
            </button>
          </div>
        </div>
      </div>

      {/* Database Setup Callout */}
      <div className="p-6 rounded-3xl bg-[#0A0C14] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${isSupabaseConfigured ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">
              Supabase Backend Status: {isSupabaseConfigured ? 'Connected' : 'Setup Ready'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSupabaseConfigured 
                ? 'Production PostgreSQL database and RLS policies active.'
                : 'Configure your environment variables and execute SQL migrations.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSupabaseModal}
          className="px-4 py-2.5 rounded-2xl text-xs font-black bg-white/5 hover:bg-white/10 text-white shrink-0 cursor-pointer border border-white/10 transition-colors"
        >
          View Migrations
        </button>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-[#0A0C14] border border-white/5 space-y-5 shadow-xl">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-3">
          Edit Profile Information
        </h3>

        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Phone Number (For Pickups)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500"
            />
          </div>
        </div>

        {/* Account Type Toggle */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('consumer')}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                accountType === 'consumer'
                  ? 'bg-orange-500/15 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                  : 'bg-[#05060B] border-white/5 text-slate-400'
              }`}
            >
              <User className="w-4 h-4 mb-1.5 text-orange-400" />
              <div className="font-bold text-xs text-white">Individual Consumer</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Buying or occasional selling</div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                accountType === 'business'
                  ? 'bg-orange-500/15 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                  : 'bg-[#05060B] border-white/5 text-slate-400'
              }`}
            >
              <Building2 className="w-4 h-4 mb-1.5 text-orange-400" />
              <div className="font-bold text-xs text-white">Business / Pro Hauler</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Junk haulers, movers, contractors</div>
            </button>
          </div>
        </div>

        {accountType === 'business' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#05060B] border border-white/5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Hauling & Demolition"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A0C14] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Business Category
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A0C14] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500 cursor-pointer"
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Bio / Public Notes
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce your business or pickup truck capabilities..."
            className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Default Search Radius
            </label>
            <span className="text-xs font-mono font-bold text-orange-400">{searchRadius} Miles</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02]"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
