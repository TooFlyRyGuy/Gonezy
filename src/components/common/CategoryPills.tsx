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
    <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
      <button
        id="category-pill-all"
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
          selectedCategoryId === null
            ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20'
            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
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
