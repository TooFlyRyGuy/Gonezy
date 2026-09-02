import React from 'react';
import { Category } from '../../types/marketplace';
import {
  Armchair,
  Refrigerator,
  Tv,
  Wrench,
  Hammer,
  Sun,
  Trees,
  Car,
  Truck,
  UtensilsCrossed,
  Building2,
  Home,
  Sparkles,
  Recycle,
  Box,
  Layers,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Armchair,
  Refrigerator,
  Tv,
  Wrench,
  Hammer,
  Sun,
  Trees,
  Car,
  Truck,
  UtensilsCrossed,
  Building2,
  Home,
  Sparkles,
  Recycle,
  Box,
};

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth">
      <button
        id="category-pill-all"
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer ${
          selectedCategoryId === null
            ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Items</span>
      </button>

      {categories.map((cat) => {
        const IconComponent = ICON_MAP[cat.icon_name] || Box;
        const isSelected = selectedCategoryId === cat.id;

        return (
          <button
            key={cat.id}
            id={`category-pill-${cat.slug}`}
            onClick={() => onSelectCategory(isSelected ? null : cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconComponent className="w-3.5 h-3.5" />
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
