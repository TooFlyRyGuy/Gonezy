import React, { useState } from 'react';

interface GonezyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  showBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const GonezyLogo: React.FC<GonezyLogoProps> = ({
  size = 'md',
  showTagline = true,
  showBadge = true,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: {
      icon: 'w-8 h-8 rounded-lg',
      text: 'text-lg',
      tagline: 'text-[9px]',
      badge: 'text-[8px] px-1.5 py-0.2',
    },
    md: {
      icon: 'w-10 h-10 rounded-xl',
      text: 'text-2xl',
      tagline: 'text-[10px]',
      badge: 'text-[9px] px-2 py-0.5',
    },
    lg: {
      icon: 'w-13 h-13 rounded-2xl',
      text: 'text-3xl',
      tagline: 'text-xs',
      badge: 'text-[10px] px-2.5 py-0.5',
    },
    xl: {
      icon: 'w-16 h-16 rounded-3xl',
      text: 'text-4xl',
      tagline: 'text-sm',
      badge: 'text-xs px-3 py-1',
    },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Visual Logo Mark */}
      <div
        className={`relative ${sizeClasses.icon} bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.35)] group-hover:shadow-[0_0_28px_rgba(249,115,22,0.55)] transition-all shrink-0 border border-orange-400/40`}
      >
        {!imageError ? (
          <img
            src="/gonezy-logo.jpg"
            alt="Gonezy Logo"
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
            <span className="font-black text-white italic tracking-tighter text-xl">G</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className={`${sizeClasses.text} font-black tracking-tight text-white leading-none font-sans`}>
            Gone<span className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]">zy</span>
          </h1>
          {showBadge && (
            <span
              className={`${sizeClasses.badge} rounded-full font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(249,115,22,0.2)]`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        {showTagline && (
          <span className={`${sizeClasses.tagline} text-slate-400 tracking-wide block font-medium mt-0.5`}>
            Urgency Marketplace
          </span>
        )}
      </div>
    </div>
  );
};
