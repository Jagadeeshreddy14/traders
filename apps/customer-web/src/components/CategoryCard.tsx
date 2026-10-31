import React from 'react';
import { Link } from 'react-router-dom';
import { ICategory } from '../types/catalog';

interface CategoryCardProps {
  category: ICategory;
  variant?: 'grid' | 'compact' | 'pill';
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, variant = 'grid' }) => {
  if (variant === 'pill') {
    return (
      <Link
        to={`/category/${category.slug}`}
        className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 hover:border-brand-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all shadow-xs shrink-0"
      >
        <span className="text-base">{category.icon || '🛒'}</span>
        <span>{category.name}</span>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/category/${category.slug}`}
        className="group flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-slate-200/70 hover:border-brand-500/50 hover:shadow-card-hover transition-all duration-200"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform overflow-hidden">
          {category.image ? (
            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            category.icon || '🛒'
          )}
        </div>
        <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {category.name}
        </h4>
      </Link>
    );
  }

  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 hover:border-brand-500/50 hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-emerald-50">
            {category.icon || '🛒'}
          </div>
        )}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-base shadow-xs">
          {category.icon || '🛒'}
        </div>
      </div>

      <div>
        <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-1">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{category.description}</p>
        )}
      </div>
    </Link>
  );
};
