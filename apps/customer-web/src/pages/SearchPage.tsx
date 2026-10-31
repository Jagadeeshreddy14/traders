import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, PackageX, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { IProduct } from '../types/catalog';
import { ProductCard } from '../components/ProductCard';

const POPULAR_SEARCH_TERMS = [
  'Tomatoes',
  'Basmati Rice',
  'Sharbati Atta',
  'Amul Milk',
  'Pure Ghee',
  'Toor Dal',
  'Bananas',
  'Surf Excel',
  'Britannia Cookies',
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchTerm(q);
    if (!q.trim()) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    const executeSearch = async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(q.trim())}&limit=40`);
        if (res.data?.data?.products) {
          setProducts(res.data.data.products);
        }
      } catch (err) {
        console.error('Search query failed', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    executeSearch();
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearchParams({ q: searchTerm.trim() });
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchParams({});
    setProducts([]);
    setHasSearched(false);
  };

  const handlePillClick = (term: string) => {
    setSearchTerm(term);
    setSearchParams({ q: term });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Input Hero Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search groceries, brands, vegetables, rice..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-sm sm:text-base text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 shadow-inner"
            autoFocus
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Popular Trending Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
            <Sparkles className="w-3 h-3 text-brand-600" />
            <span>Popular:</span>
          </span>
          {POPULAR_SEARCH_TERMS.map((term) => (
            <button
              key={term}
              onClick={() => handlePillClick(term)}
              className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Search Results for <span className="text-brand-600">"{searchParams.get('q')}"</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Found {products.length} {products.length === 1 ? 'item' : 'items'} in store catalog
            </p>
          </div>

          <button
            onClick={handleClear}
            className="text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Results Grid / Loading / Empty States */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse space-y-3">
              <div className="aspect-square bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-6 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : hasSearched && products.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <PackageX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-base">No matches found</h3>
          <p className="text-xs text-slate-500 mt-1">
            We couldn't find any products matching "{searchParams.get('q')}". Check spelling or try a broader category keyword.
          </p>
          <div className="mt-6">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((prod) => (
            <ProductCard key={prod.id || prod._id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
