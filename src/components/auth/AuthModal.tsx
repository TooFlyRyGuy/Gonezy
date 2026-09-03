import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { AccountType } from '../../types/database.types';
import { X, Lock, Mail, User, Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSignedUp?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSignedUp,
}) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('consumer');
  const [businessName, setBusinessName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (!displayName.trim()) throw new Error('Please enter a display name');
        await signUp({
          email,
          password,
          displayName: displayName.trim(),
          accountType,
          businessName: accountType === 'business' ? businessName : undefined,
        });
        onSignedUp?.();
        onClose();
      } else if (mode === 'forgot') {
        try {
          await authService.resetPassword(email);
        } catch (err: any) {
          const msg = String(err?.message || '').toLowerCase();
          // Do not reveal whether an account exists.
          if (
            msg.includes('user not found') ||
            msg.includes('unable to find') ||
            msg.includes('no user') ||
            msg.includes('signups not allowed')
          ) {
            // Treat as success — generic copy below.
          } else {
            throw err;
          }
        }
        setSuccessMessage('Password reset link sent to ' + email);
        setTimeout(() => setMode('signin'), 2500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0A0C14] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-black text-white">
              {mode === 'signin' && 'Welcome to Gonezy'}
              {mode === 'signup' && 'Create Your Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'signin' && 'Sign in to claim urgent items or post listings'}
              {mode === 'signup' && 'Post items or claim nearby pickups'}
              {mode === 'forgot' && 'We will send a reset link to your email'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name / Display Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('consumer')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'consumer'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                        : 'bg-[#05060B] border-white/5 text-slate-400'
                    }`}
                  >
                    Buyer / Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('business')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'business'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                        : 'bg-[#05060B] border-white/5 text-slate-400'
                    }`}
                  >
                    Business / Hauler
                  </button>
                </div>
              </div>

              {accountType === 'business' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Apex Relocation & Hauling"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password *
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-orange-400 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#05060B] border border-white/10 text-sm text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-black text-sm bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2 mt-2 hover:scale-[1.02]"
          >
            {isLoading ? (
              <span>Please wait...</span>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>Send Reset Email</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/5 text-xs text-slate-400">
          {mode === 'signin' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-bold text-orange-400 hover:underline cursor-pointer"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-bold text-orange-400 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
