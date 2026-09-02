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

  const sqlMigrationSummary = `-- NabGo Schema Migration (All Tables, Functions, RLS)
-- 1. Profiles & Categories
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  account_type TEXT DEFAULT 'consumer',
  business_name TEXT,
  business_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Listings with escalating price windows & location privacy
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  pickup_deadline TIMESTAMPTZ NOT NULL,
  pickup_address_text TEXT NOT NULL,
  pickup_latitude NUMERIC NOT NULL,
  pickup_longitude NUMERIC NOT NULL,
  approximate_public_latitude NUMERIC NOT NULL,
  approximate_public_longitude NUMERIC NOT NULL,
  status TEXT DEFAULT 'active'
);

-- 3. Atomic Function for Locking Claims
CREATE OR REPLACE FUNCTION public.claim_listing(
  p_listing_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
  -- Enforces atomic lock with SELECT FOR UPDATE
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlMigrationSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-neutral-100 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${isSupabaseConfigured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                Supabase Architecture & Database Status
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                {isSupabaseConfigured ? 'Connected to live Supabase backend' : 'Running in Zero-Latency Demo Mode'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <span className="font-bold block">
                {isSupabaseConfigured ? 'Supabase Credentials Detected' : 'Full Local Service Layer Active'}
              </span>
              <p className="text-neutral-300 leading-relaxed">
                {isSupabaseConfigured
                  ? 'All listings, escalating price schedules, and user claims are synchronized directly with your PostgreSQL database.'
                  : 'To link your personal Supabase project, supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, then run the SQL migration.'}
              </p>
            </div>
          </div>

          {/* Migration file info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Migration Script: /supabase/migrations/20260902000001_initial_schema.sql</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-neutral-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
              {sqlMigrationSummary}
            </pre>
          </div>

          {/* Feature Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
              <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Row Level Security (RLS)</span>
              </span>
              <p className="text-neutral-400 text-[11px]">
                Protects exact seller coordinates until a buyer locks a claim.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
              <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Atomic Concurrency</span>
              </span>
              <p className="text-neutral-400 text-[11px]">
                PostgreSQL row locking prevents duplicate claims on urgent free/discounted items.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
