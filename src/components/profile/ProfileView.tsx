import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AccountType, BusinessType } from '../../types/database.types';
import { Building2, CheckCircle2, LogOut, User } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, profile, updateProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [accountType, setAccountType] = useState<AccountType>(profile?.account_type || 'consumer');
  const [businessName, setBusinessName] = useState(profile?.business_name || '');
  const [businessType, setBusinessType] = useState<BusinessType | ''>(profile?.business_type || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name?.trim() || user?.user_metadata?.display_name || '');
    setPhone(profile.phone || '');
    setAccountType(profile.account_type || 'consumer');
    setBusinessName(profile.business_name || '');
    setBusinessType(profile.business_type || '');
  }, [profile, user?.user_metadata?.display_name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      await updateProfile({
        display_name: displayName,
        phone,
        account_type: accountType,
        business_name: accountType === 'business' ? businessName : null,
        business_type: accountType === 'business' ? (businessType as BusinessType) : null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 rounded-3xl bg-[#0A0C14] border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">
              {profile?.display_name || user?.email?.split('@')[0] || 'Account'}
            </h2>
            <span className="text-xs text-slate-400">{user?.email}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-[#0A0C14] border border-white/5 space-y-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-3">
          Profile
        </h3>

        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Saved
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">{errorMessage}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="For pickup coordination"
              className="w-full px-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('consumer')}
            className={`p-4 rounded-2xl border text-left cursor-pointer ${
              accountType === 'consumer' ? 'bg-orange-500/15 border-orange-500' : 'bg-[#05060B] border-white/5'
            }`}
          >
            <User className="w-4 h-4 mb-1.5 text-orange-400" />
            <div className="font-bold text-xs text-white">Buyer / individual</div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`p-4 rounded-2xl border text-left cursor-pointer ${
              accountType === 'business' ? 'bg-orange-500/15 border-orange-500' : 'bg-[#05060B] border-white/5'
            }`}
          >
            <Building2 className="w-4 h-4 mb-1.5 text-orange-400" />
            <div className="font-bold text-xs text-white">Pro seller / hauler</div>
          </button>
        </div>

        {accountType === 'business' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#05060B] border border-white/10 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#05060B] border border-white/10 text-sm text-white"
              >
                <option value="junk_hauler">Junk hauler</option>
                <option value="mover">Mover</option>
                <option value="estate_cleanout">Estate cleanout</option>
                <option value="property_manager">Property manager</option>
                <option value="contractor">Contractor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
