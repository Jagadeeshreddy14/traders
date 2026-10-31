import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Truck,
  Percent,
  Flame,
  ChevronRight,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { ICategory, IProduct } from '../types/catalog';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';

const HERO_SLIDES = [
  {
    tag: 'Single Store City-Wide Guarantee',
    title: 'Daily Harvest Freshness, Straight to Your Doorstep.',
    description: 'Farm-picked vegetables, crisp fruits, and wholesome pantry essentials delivered across the entire city within 30-45 minutes.',
    ctaText: 'Shop Daily Harvest',
    ctaLink: '/category/vegetables',
    bgColor: 'from-emerald-800 via-emerald-700 to-teal-900',
    badge: 'Express 30 Mins',
  },
  {
    tag: 'Pantry Savings Week',
    title: 'Save up to 25% on Basmati Rice, Atta & Pure Ghee.',
    description: 'Top Indian grocery brands like Fortune, Aashirvaad, India Gate, and Tata Sampann stocked fresh at wholesale single-store rates.',
    ctaText: 'Explore Staples',
    ctaLink: '/category/rice-and-atta',
    bgColor: 'from-brand-900 via-brand-800 to-emerald-950',
    badge: 'Special Offers',
  },
];

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?limit=50'),
        ]);

        if (catRes.data?.data?.categories) {
          setCategories(catRes.data.data.categories);
        }
        if (prodRes.data?.data?.products) {
          setProducts(prodRes.data.data.products);
        }
      } catch (err) {
        console.warn('Catalog API load error, using fallback preview data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter sections by category slug or tags
  const bestsellers = products.filter((p) => p.isFeatured || p.tags?.includes('bestseller')).slice(0, 8);
  const dailyEssentials = products.filter((p) => {
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';
    return catSlug === 'dairy-products' || catSlug === 'rice-and-atta' || catSlug === 'cooking-oils';
  }).slice(0, 8);
  const freshProduce = products.filter((p) => {
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';
    return catSlug === 'fruits' || catSlug === 'vegetables';
  }).slice(0, 8);
  const ricePulses = products.filter((p) => {
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';
    return catSlug === 'rice-and-atta' || catSlug === 'dals-and-pulses';
  }).slice(0, 8);
  const snacksBeverages = products.filter((p) => {
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';
    return catSlug === 'snacks' || catSlug === 'beverages' || catSlug === 'biscuits';
  }).slice(0, 8);
  const householdCleaners = products.filter((p) => {
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';
    return catSlug === 'household-cleaning' || catSlug === 'personal-care';
  }).slice(0, 8);
  const specialOffers = products.filter((p) => (p.discountedPrice && p.price > p.discountedPrice)).slice(0, 8);

  const currentHero = HERO_SLIDES[activeSlide];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 mt-3">Connecting to Paven Traders Store...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-12 pb-16">
      {/* 1. Promotional Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentHero.bgColor} text-white p-8 sm:p-12 lg:p-14 shadow-2xl transition-all duration-500`}>
          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur border border-white/20 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>{currentHero.tag}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15]">
              {currentHero.title}
            </h1>

            <p className="text-sm sm:text-base text-emerald-100 max-w-xl leading-relaxed">
              {currentHero.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={currentHero.ctaLink}
                className="inline-flex items-center space-x-2 bg-white hover:bg-emerald-50 text-slate-900 font-extrabold px-6 py-3 rounded-2xl shadow-lg transition-all text-xs sm:text-sm"
              >
                <span>{currentHero.ctaText}</span>
                <ArrowRight className="w-4 h-4 text-brand-600" />
              </Link>

              <div className="flex items-center space-x-2 px-4 py-2.5 bg-black/25 backdrop-blur rounded-2xl border border-white/10 text-xs text-white">
                <Clock className="w-4 h-4 text-emerald-300" />
                <span>City Dispatch Hub: <strong>Open Now</strong></span>
              </div>
            </div>
          </div>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 flex items-center space-x-2 z-10">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === idx ? 'w-8 bg-white' : 'w-2.5 bg-white/40'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">City-Wide Delivery</p>
              <p className="text-[11px] text-slate-500">Every sector & zone</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">Single Store Fresh</p>
              <p className="text-[11px] text-slate-500">Hand-checked quality</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">30-45 Min Express</p>
              <p className="text-[11px] text-slate-500">Direct courier dispatch</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">Wholesale Prices</p>
              <p className="text-[11px] text-slate-500">Daily store discounts</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Categories (13 Categories) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-extrabold text-brand-700 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded">
              Grocery Departments
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Shop by Categories
            </h2>
          </div>

          <Link
            to="/products"
            className="flex items-center space-x-1 text-xs font-bold text-brand-600 hover:text-brand-700"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id || cat._id || cat.slug} category={cat} variant="compact" />
          ))}
        </div>
      </section>

      {/* 3. Best-Selling Products */}
      {bestsellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Best-Selling Products</h2>
                <p className="text-xs text-slate-500">Popular items ordered by your city neighbors today</p>
              </div>
            </div>

            <Link to="/products" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              See More →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestsellers.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Daily Essentials */}
      {dailyEssentials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Daily Essentials</h2>
                <p className="text-xs text-slate-500">Fresh milk, pure ghee, and morning grocery needs</p>
              </div>
            </div>

            <Link to="/category/dairy-products" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              Explore Essentials →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {dailyEssentials.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Fresh Fruits & Vegetables */}
      {freshProduce.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Farm Harvest
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Fresh Fruits & Crisp Vegetables
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">Checked individually for sweetness, firmness, and natural flavor</p>
              </div>

              <Link to="/category/fruits" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                View All Fresh →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {freshProduce.map((prod) => (
                <ProductCard key={prod.id || prod._id} product={prod} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Rice, Pulses and Grains */}
      {ricePulses.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Rice, Pulses & Whole Grains</h2>
              <p className="text-xs text-slate-500">Unpolished lentils, fragrant basmati, and superior whole wheat</p>
            </div>

            <Link to="/category/rice-and-atta" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              View All Grains →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {ricePulses.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Snacks & Beverages */}
      {snacksBeverages.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Snacks, Biscuits & Beverages</h2>
              <p className="text-xs text-slate-500">Crunchy namkeen, premium tea, filter coffee, and treats</p>
            </div>

            <Link to="/category/snacks" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              Browse Snacks →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {snacksBeverages.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 8. Household Essentials */}
      {householdCleaners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Household & Personal Care</h2>
              <p className="text-xs text-slate-500">Detergents, cleaners, soaps, and hygiene essentials</p>
            </div>

            <Link to="/category/household-cleaning" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              View Household →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {householdCleaners.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 9. Special Offers */}
      {specialOffers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border border-brand-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Special Deals & Discounts</h2>
                  <p className="text-xs text-slate-500">Top grocery value deals valid for today only</p>
                </div>
              </div>

              <span className="text-xs font-extrabold text-brand-700 bg-white px-3 py-1 rounded-xl border border-brand-200">
                Limited Time Deals
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {specialOffers.map((prod) => (
                <ProductCard key={prod.id || prod._id} product={prod} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
