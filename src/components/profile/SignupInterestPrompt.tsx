import React from 'react';
import { X } from 'lucide-react';
import { PickupInterestsCard } from './PickupInterestsCard';

interface SignupInterestPromptProps {
  userId: string;
  onClose: () => void;
}

export const SignupInterestPrompt: React.FC<SignupInterestPromptProps> = ({ userId, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0A0C14] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-slate-100">
        <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-black text-white">Want a ping when something drops?</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tap a few categories. Skip anytime — posting and claiming stay open.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Skip pickup interests"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <PickupInterestsCard userId={userId} variant="signup" onSaved={onClose} onSkip={onClose} />
      </div>
    </div>
  );
};
