import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface ResetPasswordViewProps {
  onDone: () => void;
}

export function isResetPasswordLocation(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/reset-password') return true;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(window.location.search);
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery';
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Gonezy is in preview mode. Add Supabase credentials to reset a password.');
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setIsReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsReady(true);
        setErrorMessage(null);
      }
    });

    const timeout = window.setTimeout(() => {
      if (!mounted) return;
      setIsReady((ready) => {
        if (!ready) {
          setErrorMessage('This reset link is invalid or expired. Request a new one from Sign in → Forgot?');
        }
        return ready;
      });
    }, 4000);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Those passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      setSuccessMessage('Password updated. You are signed in.');
      window.setTimeout(onDone, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060B] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#0A0C14] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-xl font-black text-white">Set a new password</h1>
          <p className="text-xs text-slate-400 mt-0.5">Make it gone. Easy. Then get back to nearby pickups.</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={!isReady || isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500 font-mono disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={!isReady || isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500 font-mono disabled:opacity-50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!isReady || isLoading}
            className="w-full min-h-[44px] py-3.5 rounded-2xl font-black text-sm bg-orange-500 hover:bg-orange-400 text-white cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
};
