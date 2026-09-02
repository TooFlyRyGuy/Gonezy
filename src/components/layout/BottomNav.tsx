import React from 'react';
import {
  Compass,
  Radio,
  PlusCircle,
  Clock,
  User,
  Package,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onNavigate,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around">
      <button
        onClick={() => onNavigate('explore')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
          currentTab === 'explore' ? 'text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px]">Explore</span>
      </button>

      <button
        onClick={() => onNavigate('wanted')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
          currentTab === 'wanted' ? 'text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Radio className="w-5 h-5" />
        <span className="text-[10px]">Wanted</span>
      </button>

      {/* Primary Center Action */}
      <button
        onClick={() => onNavigate('sell')}
        className="flex flex-col items-center gap-0.5 -mt-4 py-1 px-3 rounded-2xl bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30 cursor-pointer"
      >
        <PlusCircle className="w-6 h-6" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider">Post</span>
      </button>

      <button
        onClick={() => onNavigate('activity')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
          currentTab === 'activity' ? 'text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-[10px]">Activity</span>
      </button>

      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
          currentTab === 'profile' ? 'text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px]">Profile</span>
      </button>
    </nav>
  );
};
