import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Package,
  CheckCircle,
  Plus,
  Home,
  Briefcase,
  LogOut,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');

  if (!user) return null;

  const mockAddresses = [
    {
      id: 'addr-1',
      label: 'HOME',
      recipientName: user.name,
      phone: user.phone || '+91 98765 43210',
      address: 'House #402, Green Valley Apartments, 8th Main Road, City Center',
      city: 'Central City',
      postalCode: '560001',
      isDefault: true,
    },
    {
      id: 'addr-2',
      label: 'WORK',
      recipientName: user.name,
      phone: user.phone || '+91 98765 43210',
      address: 'Office #12, IT Park Tower B, Outer Ring Road',
      city: 'Central City',
      postalCode: '560045',
      isDefault: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-brand-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-3xl font-extrabold text-emerald-300 shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-extrabold">{user.name}</h1>
                <span className="bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {user.role}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 flex items-center space-x-1.5 justify-center sm:justify-start">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.email}</span>
              </p>
              <div className="mt-3 flex items-center space-x-2 text-xs font-semibold text-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Verified Customer • Paven Traders City Delivery Member</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-200 border border-white/20 hover:border-rose-400/40 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Profile Overview
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'addresses'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Saved Delivery Addresses
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Order History
          </button>
        </div>

        {/* Tab 1: Profile Overview */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
                <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center space-x-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <span>Account Credentials</span>
                </h2>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <dt className="text-slate-500 font-medium">Full Name</dt>
                    <dd className="font-bold text-slate-800 mt-1">{user.name}</dd>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <dt className="text-slate-500 font-medium">Registered Email</dt>
                    <dd className="font-bold text-slate-800 mt-1">{user.email}</dd>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <dt className="text-slate-500 font-medium">Contact Phone</dt>
                    <dd className="font-bold text-slate-800 mt-1">{user.phone || '+91 98765 43210'}</dd>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <dt className="text-slate-500 font-medium">Customer ID</dt>
                    <dd className="font-mono text-slate-600 mt-1 truncate">{user.id}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100 space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span>Express Dispatch Zone</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your delivery address is verified for priority 30-45 minute dispatch from Paven Traders.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100 space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Security Status</span>
                </h3>
                <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  ✓ Token session protected with rotating JWTs & SHA-256 database authentication.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Saved Addresses Placeholder */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Your Delivery Addresses</h2>
                <p className="text-xs text-slate-500">Manage drop-off locations for rapid grocery delivery</p>
              </div>

              <button
                onClick={() => alert('Add new address modal will be connected to Address model in Phase 3.')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Address</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mockAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-3xl p-5 border relative shadow-xs ${
                    addr.isDefault ? 'border-brand-500 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg">
                      {addr.label === 'HOME' ? <Home className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                      <span>{addr.label}</span>
                    </span>

                    {addr.isDefault && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Default Delivery
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-900">{addr.recipientName}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{addr.address}</p>
                  <p className="text-xs text-slate-500 mt-1">{addr.city} - {addr.postalCode}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{addr.phone}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Order History Placeholder */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Grocery Order History</h2>
              <p className="text-xs text-slate-500">Track current and past deliveries from Paven Traders</p>
            </div>

            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 text-sm">No grocery orders placed yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Order placement, live rider dispatch tracking, and digital receipt generation will be activated in Phase 3.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
