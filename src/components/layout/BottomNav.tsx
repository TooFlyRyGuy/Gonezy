import React from 'react';
import { Compass, PlusCircle, Clock, User } from 'lucide-react';
import { NavigationTab } from '../../types/marketplace';

interface BottomNavProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0C14] border-t border-white/5 px-4 py-2 flex items-center justify-around">
      <button
        onClick={() => onNavigate('explore')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          currentTab === 'explore' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${
            currentTab === 'explore' ? 'bg-orange-500 text-white' : 'text-slate-300'
          }`}
        >
          <Compass className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Nearby</span>
      </button>

      <button
        onClick={() => onNavigate('sell')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          currentTab === 'sell' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${
            currentTab === 'sell' ? 'bg-orange-500 text-white' : 'text-slate-300'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Post</span>
      </button>

      <button
        onClick={() => onNavigate('activity')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          currentTab === 'activity' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${
            currentTab === 'activity' ? 'bg-orange-500 text-white' : 'text-slate-300'
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Activity</span>
      </button>

      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          currentTab === 'profile' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${
            currentTab === 'profile' ? 'bg-orange-500 text-white' : 'text-slate-300'
          }`}
        >
          <User className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Account</span>
      </button>
    </nav>
  );
};
