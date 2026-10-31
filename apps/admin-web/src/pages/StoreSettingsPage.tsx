import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Store,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Power,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IStorePincode {
  pincode: string;
  areaName: string;
  deliveryWindow: string;
  isServiceable: boolean;
  deliveryChargeOverride?: number;
}

interface IStoreSettings {
  storeName: string;
  storeLogo?: string;
  contactEmail: string;
  contactPhone: string;
  storeAddress: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  deliveryChargeRupees: number;
  freeDeliveryThresholdRupees: number;
  packagingChargeRupees: number;
  minOrderAmountRupees: number;
  defaultDeliveryWindow: string;
  supportedPincodes: IStorePincode[];
  currency: string;
  taxGstin?: string;
}

export const StoreSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Form State
  const [form, setForm] = useState({
    storeName: 'Paven Traders',
    storeLogo: '',
    contactEmail: 'support@paventraders.com',
    contactPhone: '+91 98765 43210',
    storeAddress: 'Shop 12, Paven Commercial Complex, Hyderabad, Telangana 500001',
    isOpen: true,
    openingTime: '07:00 AM',
    closingTime: '10:00 PM',
    deliveryChargeRupees: '40',
    freeDeliveryThresholdRupees: '499',
    packagingChargeRupees: '15',
    minOrderAmountRupees: '199',
    defaultDeliveryWindow: '30-45 mins',
    taxGstin: '36AAAAA0000A1Z5',
  });

  const [pincodes, setPincodes] = useState<IStorePincode[]>([]);

  // Add PIN code sub-modal
  const [isAddPinModalOpen, setIsAddPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newWindow, setNewWindow] = useState('30-45 mins');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/settings');
      if (res.data?.data?.settings) {
        const s: IStoreSettings = res.data.data.settings;
        setForm({
          storeName: s.storeName,
          storeLogo: s.storeLogo || '',
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,
          storeAddress: s.storeAddress,
          isOpen: s.isOpen,
          openingTime: s.openingTime || '07:00 AM',
          closingTime: s.closingTime || '10:00 PM',
          deliveryChargeRupees: String(s.deliveryChargeRupees),
          freeDeliveryThresholdRupees: String(s.freeDeliveryThresholdRupees),
          packagingChargeRupees: String(s.packagingChargeRupees),
          minOrderAmountRupees: String(s.minOrderAmountRupees),
          defaultDeliveryWindow: s.defaultDeliveryWindow,
          taxGstin: s.taxGstin || '36AAAAA0000A1Z5',
        });
        setPincodes(s.supportedPincodes || []);
      }
    } catch (err: any) {
      console.error('Failed to load store settings:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load store settings',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleOperatingStatus = async () => {
    try {
      const res = await adminApi.patch('/admin/settings/operating-status');
      if (res.data?.data) {
        setForm((prev) => ({ ...prev, isOpen: res.data.data.isOpen }));
        setStatusMessage({
          text: `Store is now ${res.data.data.isOpen ? 'OPEN for customer orders' : 'CLOSED'}!`,
          isError: false,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle store operating status');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        storeName: form.storeName,
        storeLogo: form.storeLogo || undefined,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        storeAddress: form.storeAddress,
        isOpen: form.isOpen,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        deliveryChargeRupees: Number(form.deliveryChargeRupees) || 40,
        freeDeliveryThresholdRupees: Number(form.freeDeliveryThresholdRupees) || 499,
        packagingChargeRupees: Number(form.packagingChargeRupees) || 15,
        minOrderAmountRupees: Number(form.minOrderAmountRupees) || 199,
        defaultDeliveryWindow: form.defaultDeliveryWindow,
        supportedPincodes: pincodes,
        taxGstin: form.taxGstin,
      };

      await adminApi.put('/admin/settings', payload);
      setStatusMessage({ text: 'Store settings saved and synchronized successfully!', isError: false });
      fetchSettings();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to update store settings',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePinService = (pincode: string) => {
    setPincodes((prev) =>
      prev.map((p) => (p.pincode === pincode ? { ...p, isServiceable: !p.isServiceable } : p))
    );
  };

  const handleRemovePin = (pincode: string) => {
    setPincodes((prev) => prev.filter((p) => p.pincode !== pincode));
  };

  const handleAddPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(newPin.trim())) {
      alert('Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    if (pincodes.some((p) => p.pincode === newPin.trim())) {
      alert(`PIN code ${newPin} is already configured.`);
      return;
    }

    setPincodes([
      ...pincodes,
      {
        pincode: newPin.trim(),
        areaName: newArea.trim() || 'Service Hub Area',
        deliveryWindow: newWindow.trim() || '30-45 mins',
        isServiceable: true,
      },
    ]);

    setNewPin('');
    setNewArea('');
    setIsAddPinModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            Store Settings & Operations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Store identity, live operating status toggle, delivery fee structure, and serviceable PIN codes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            statusMessage.isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Store Status Switcher Banner */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                form.isOpen
                  ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400 shadow-emerald-500/10'
                  : 'bg-rose-950/80 border-rose-800/80 text-rose-400 shadow-rose-500/10'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    form.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                ></span>
                <h3 className="font-bold text-white text-base">
                  Store Status:{' '}
                  <span className={form.isOpen ? 'text-emerald-400' : 'text-rose-400'}>
                    {form.isOpen ? 'OPEN FOR ORDERS' : 'STORE CURRENTLY CLOSED'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {form.isOpen
                  ? 'Customers can browse fresh groceries and place city-wide delivery orders.'
                  : 'Checkout is disabled on customer web and mobile app with a closed notice.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleOperatingStatus}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              form.isOpen
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {form.isOpen ? 'Close Store Temporarily' : 'Open Store Now'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Store Profile & Contact Details */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Store className="w-4 h-4 text-emerald-400" />
            Store Profile & Trade Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store Logo URL (or Cloudinary image)
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={form.storeLogo}
                onChange={(e) => setForm({ ...form, storeLogo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Support Email *
              </label>
              <input
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Customer Support Phone *
              </label>
              <input
                type="text"
                required
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store GSTIN
              </label>
              <input
                type="text"
                value={form.taxGstin}
                onChange={(e) => setForm({ ...form, taxGstin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Physical Store & Dispatch Address *
              </label>
              <textarea
                rows={2}
                required
                value={form.storeAddress}
                onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Daily Opening Time
                </label>
                <input
                  type="text"
                  placeholder="07:00 AM"
                  value={form.openingTime}
                  onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Daily Closing Time
                </label>
                <input
                  type="text"
                  placeholder="10:00 PM"
                  value={form.closingTime}
                  onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Charges & Minimum Order Rules */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            Delivery Charges & Cart Checkout Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Standard Delivery Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.deliveryChargeRupees}
                onChange={(e) => setForm({ ...form, deliveryChargeRupees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Free Delivery Above (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.freeDeliveryThresholdRupees}
                onChange={(e) => setForm({ ...form, freeDeliveryThresholdRupees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Eco-Packaging Charge (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.packagingChargeRupees}
                onChange={(e) => setForm({ ...form, packagingChargeRupees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.minOrderAmountRupees}
                onChange={(e) => setForm({ ...form, minOrderAmountRupees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Serviceable PIN Codes */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Serviceable City Delivery PIN Codes ({pincodes.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsAddPinModalOpen(true)}
              className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add PIN Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pincodes.map((pin) => (
              <div
                key={pin.pincode}
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  pin.isServiceable
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white text-xs">{pin.pincode}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        pin.isServiceable
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pin.isServiceable ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                    {pin.areaName}
                  </p>
                  <p className="text-[10px] text-slate-400">{pin.deliveryWindow}</p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePinService(pin.pincode)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {pin.isServiceable ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePin(pin.pincode)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Submit Footer */}
        <div className="flex items-center justify-end space-x-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Configurations...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* Add PIN Code Sub-modal */}
      {isAddPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Add Serviceable PIN Code</h3>
              <button onClick={() => setIsAddPinModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Digit Postal PIN Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="500001"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Area / Zone Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banjara Hills Sector 1-14"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estimated Delivery Window
                </label>
                <input
                  type="text"
                  placeholder="30-45 mins"
                  value={newWindow}
                  onChange={(e) => setNewWindow(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPinModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Add PIN Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
