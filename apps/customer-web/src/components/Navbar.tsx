import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  MapPin,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { IProduct } from '../types/catalog';
import { DeliveryLocationModal } from './DeliveryLocationModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { totalItems, totalPrice, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => {
    return localStorage.getItem('pt_location') || 'City Center / Main Road';
  });

  // Search State & Debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<IProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=5`);
        if (response.data?.data?.products) {
          setSuggestions(response.data.data.products);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Autocomplete search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectLocation = (loc: string) => {
    setCurrentLocation(loc);
    localStorage.setItem('pt_location', loc);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        {/* City-Wide Announcement Strip */}
        <div className="bg-brand-900 text-brand-100 text-xs py-1.5 px-4 font-medium flex items-center justify-between sm:justify-center space-x-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate">
              ⚡ <strong>Paven Traders</strong> City-Wide Express Grocery Delivery • Free Delivery on orders over ₹499!
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-[11px] text-emerald-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Store Open: 6:00 AM - 10:00 PM</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-3">
            {/* Logo & Store Identity */}
            <div className="flex items-center space-x-3 shrink-0">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-11 h-11 bg-gradient-to-tr from-brand-700 to-brand-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none group-hover:text-brand-600 transition-colors">
                    Paven Traders
                  </span>
                  <span className="text-[10px] font-semibold text-brand-600 tracking-wider uppercase mt-1">
                    Single Store Quality
                  </span>
                </div>
              </Link>

              {/* Delivery Location Selector Button */}
              <button
                onClick={() => setLocationModalOpen(true)}
                className="hidden lg:flex items-center space-x-2 pl-4 ml-4 border-l border-gray-200 text-left hover:bg-slate-50 py-1.5 px-2.5 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <p className="font-extrabold text-xs text-slate-800">Delivering To</p>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{currentLocation}</p>
                </div>
              </button>
            </div>

            {/* Live Search Bar with Suggestions */}
            <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-2 sm:mx-4">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search fresh vegetables, fruits, dairy, basmati rice, atta..."
                  className="w-full bg-slate-100/90 border border-slate-200/80 rounded-full py-2.5 pl-11 pr-10 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition-all shadow-inner"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin absolute right-3.5 top-3.5" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </form>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Products Found</span>
                    <Sparkles className="w-3 h-3 text-brand-600" />
                  </div>

                  {suggestions.map((p) => {
                    const id = p.id || p._id || '';
                    const image = p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=80';
                    const price = p.discountedPrice ?? p.price;

                    return (
                      <Link
                        key={id}
                        to={`/product/${p.slug || id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <img src={image} alt={p.name} className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-brand-600 font-bold uppercase">{p.brand || 'Paven'}</p>
                          <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{p.unit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-extrabold text-slate-900">₹{price}</p>
                        </div>
                      </Link>
                    );
                  })}

                  <div className="mt-1 pt-1 border-t border-gray-100 px-3">
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full text-center py-2 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      View all matching results for "{searchQuery}" →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User & Cart Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Profile / Login */}
              {user ? (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    to="/orders"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                  >
                    <span>My Orders</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-extrabold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-slate-800 truncate max-w-[90px]">{user.name.split(' ')[0]}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Log out"
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-1.5">
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-brand-600 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs hover:shadow transition-all"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Cart Drawer Toggle Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/25 transition-all"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">₹{totalPrice}</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setLocationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
            >
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span>Deliver To: {currentLocation}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 text-center"
              >
                All Products
              </Link>
              <Link
                to="/category/fruits"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 text-center"
              >
                Fresh Produce
              </Link>
            </div>

            {user ? (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-sm font-semibold text-slate-800"
                >
                  <ShoppingBag className="w-4 h-4 text-brand-600" />
                  <span>My Orders</span>
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-sm font-semibold text-slate-800"
                >
                  <User className="w-4 h-4 text-brand-600" />
                  <span>My Profile ({user.name})</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-sm font-medium text-rose-600"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-bold text-white bg-brand-600 rounded-xl"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Location Modal */}
      <DeliveryLocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
};
