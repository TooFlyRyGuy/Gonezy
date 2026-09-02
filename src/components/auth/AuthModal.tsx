import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AccountType } from '../../types/database.types';
import { X, Lock, Mail, User, Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
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
          displayName,
          accountType,
          businessName: accountType === 'business' ? businessName : undefined,
        });
        setSuccessMessage('Account registered! Please check your email or log in.');
        setTimeout(() => onClose(), 1500);
      } else if (mode === 'forgot') {
        setSuccessMessage('Password reset link sent to ' + email);
        setTimeout(() => setMode('signin'), 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-neutral-100"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-100">
              {mode === 'signin' && 'Welcome to NabGo'}
              {mode === 'signup' && 'Create Your Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {mode === 'signin' && 'Sign in to claim urgent items or post listings'}
              {mode === 'signup' && 'Join the hyperlocal urgency marketplace'}
              {mode === 'forgot' && 'We will send a reset link to your email'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Full Name / Display Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('consumer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'consumer'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Buyer / Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('business')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'business'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Business / Hauler
                  </button>
                </div>
              </div>

              {accountType === 'business' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Apex Relocation & Hauling"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Password *
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
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

        <div className="text-center pt-2 border-t border-neutral-800 text-xs text-neutral-400">
          {mode === 'signin' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-bold text-amber-400 hover:underline cursor-pointer"
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
                className="font-bold text-amber-400 hover:underline cursor-pointer"
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
