import React, { useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  Database,
  X,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Code2,
} from 'lucide-react';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlMigrationSummary = `-- Gonezy Complete Schema Migration
-- Applied via /supabase/migrations/20260902000001_initial_schema.sql
-- Run in Supabase SQL Editor or via supabase db push

-- 1. Profiles & Automatic User Trigger
-- 2. Categories (15 Seeded Categories)
-- 3. Listings (Privacy-Safe Geo, Urgency Deadlines)
-- 4. Listing Images & Storage Bucket ('listing-images')
-- 5. Listing Price Windows (Dynamic Urgency Pricing)
-- 6. Buyer Interests / Wanted List (Strict Private RLS)
-- 7. Claims (Partial Unique Index for Concurrency)
-- 8. Notifications (In-app, Price & Claim alerts)
-- 9. Atomic Functions:
--    - claim_listing(p_listing_id, p_buyer_id)
--    - complete_pickup(p_claim_id, p_user_id)
--    - cancel_claim(p_claim_id, p_user_id, p_reason)
--    - get_current_listing_price(p_listing_id, p_at)
--    - expire_overdue_listings()
-- 10. Privacy View: public.public_listings
-- 11. Row Level Security on ALL tables`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlMigrationSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0A0C14] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isSupabaseConfigured ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Supabase Architecture & Database Status
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {isSupabaseConfigured ? 'Connected to live Supabase backend' : 'Running in Zero-Latency Demo Mode'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
          }`}>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <span className="font-bold block">
                {isSupabaseConfigured ? 'Supabase Credentials Detected' : 'Full Local Service Layer Active'}
              </span>
              <p className="text-slate-300 leading-relaxed">
                {isSupabaseConfigured
                  ? 'All listings, escalating price schedules, and user claims are synchronized directly with your PostgreSQL database.'
                  : 'To link your personal Supabase project, supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, then run the SQL migration.'}
              </p>
            </div>
          </div>

          {/* Migration file info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-orange-400" />
                <span>Migration Script: /supabase/migrations/20260902000001_initial_schema.sql</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-[#05060B] border border-white/5 text-[11px] font-mono text-slate-300 overflow-x-auto">
              {sqlMigrationSummary}
            </pre>
          </div>

          {/* Feature Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 text-xs space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>Row Level Security (RLS)</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                Protects exact seller coordinates until a buyer locks a claim.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05060B] border border-white/5 text-xs space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-orange-400" />
                <span>Atomic Concurrency</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                PostgreSQL row locking prevents duplicate claims on urgent free/discounted items.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl text-xs font-black bg-orange-500 hover:bg-orange-400 text-white cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.4)]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
