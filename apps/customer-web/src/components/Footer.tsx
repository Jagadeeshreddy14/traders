import React from 'react';
import { ShoppingBag, ShieldCheck, Clock, Truck, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Proposition Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/60 border border-brand-700/50 flex items-center justify-center text-brand-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">City-Wide Delivery</h4>
              <p className="text-xs text-slate-400 mt-0.5">Reliable daily delivery straight to your doorstep across the entire city.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/60 border border-brand-700/50 flex items-center justify-center text-brand-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">100% Quality Checked</h4>
              <p className="text-xs text-slate-400 mt-0.5">Handpicked farm-fresh produce and genuine packaged grocery brands.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/60 border border-brand-700/50 flex items-center justify-center text-brand-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Express 45-Min Slots</h4>
              <p className="text-xs text-slate-400 mt-0.5">Quick order fulfillment from our centralized single store hub.</p>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Paven Traders</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your premier single-store online grocery delivery destination. Fresh fruits, crisp vegetables, wholesome grains, and household essentials.
            </p>
            <div className="flex items-center space-x-2 text-xs text-brand-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Open Daily: 6:00 AM – 10:00 PM</span>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-white text-sm mb-4">Grocery Departments</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-white transition-colors cursor-pointer">Fresh Fruits & Vegetables</li>
              <li className="hover:text-white transition-colors cursor-pointer">Dairy, Bread & Eggs</li>
              <li className="hover:text-white transition-colors cursor-pointer">Atta, Rice & Pulses</li>
              <li className="hover:text-white transition-colors cursor-pointer">Oils, Ghee & Spices</li>
              <li className="hover:text-white transition-colors cursor-pointer">Beverages & Snack Food</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-sm mb-4">Store Platforms</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-white transition-colors cursor-pointer">Customer Web Portal</li>
              <li className="hover:text-white transition-colors cursor-pointer">Android Mobile Application</li>
              <li className="hover:text-white transition-colors cursor-pointer">Admin Store Dashboard</li>
              <li className="hover:text-white transition-colors cursor-pointer">Delivery Partner Network</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-sm mb-4">Contact & Support</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Paven Traders Store, Main Road, City Central</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                <span>support@paventraders.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Paven Traders. All rights reserved. Phase 1 Architecture.</p>
          <p className="mt-2 md:mt-0">Single Store Grocery Delivery Platform • Powered by MERN Stack</p>
        </div>
      </div>
    </footer>
  );
};
