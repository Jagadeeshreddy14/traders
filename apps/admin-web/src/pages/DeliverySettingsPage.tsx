import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ISupportedPincode {
  pincode: string;
  areaName: string;
  deliveryWindow: string;
  isServiceable: boolean;
  deliveryChargeOverride?: number;
}

interface IDeliveryConfig {
  deliveryCharge: number; // in paise
  freeDeliveryThreshold: number; // in paise
  packagingCharge: number; // in paise
  minOrderAmount: number; // in paise
  defaultDeliveryWindow: string;
  supportedPincodes: ISupportedPincode[];
}

export const DeliverySettingsPage: React.FC = () => {
  const [config, setConfig] = useState<IDeliveryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Charges form state (in Rupees for easy admin editing)
  const [chargesForm, setChargesForm] = useState({
    deliveryChargeRupees: '40',
    freeDeliveryThresholdRupees: '499',
    packagingChargeRupees: '15',
    minOrderAmountRupees: '199',
    defaultDeliveryWindow: '30-45 mins',
  });

  // Add PIN Code Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [areaNameInput, setAreaNameInput] = useState('');
  const [windowInput, setWindowInput] = useState('30-45 mins');
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/delivery/admin/config');
      if (res.data?.data) {
        const c: IDeliveryConfig = res.data.data;
        setConfig(c);
        setChargesForm({
          deliveryChargeRupees: (c.deliveryCharge / 100).toString(),
          freeDeliveryThresholdRupees: (c.freeDeliveryThreshold / 100).toString(),
          packagingChargeRupees: (c.packagingCharge / 100).toString(),
          minOrderAmountRupees: (c.minOrderAmount / 100).toString(),
          defaultDeliveryWindow: c.defaultDeliveryWindow || '30-45 mins',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load delivery configuration.',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        deliveryCharge: Math.round(Number(chargesForm.deliveryChargeRupees) * 100),
        freeDeliveryThreshold: Math.round(Number(chargesForm.freeDeliveryThresholdRupees) * 100),
        packagingCharge: Math.round(Number(chargesForm.packagingChargeRupees) * 100),
        minOrderAmount: Math.round(Number(chargesForm.minOrderAmountRupees) * 100),
        defaultDeliveryWindow: chargesForm.defaultDeliveryWindow.trim(),
      };

      const res = await adminApi.put('/delivery/admin/config', payload);
      setConfig(res.data.data);
      setStatusMessage({ text: 'Delivery charges and thresholds saved successfully!', isError: false });
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to update charges.',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPincodeError(null);

    const pin = pincodeInput.trim();
    const area = areaNameInput.trim();

    if (!pin || !area) {
      setPincodeError('PIN code and Area name are required.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPincodeError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    try {
      const res = await adminApi.post('/delivery/admin/pincodes', {
        pincode: pin,
        areaName: area,
        deliveryWindow: windowInput.trim() || '30-45 mins',
        isServiceable: true,
      });

      setConfig(res.data.data);
      setIsAddModalOpen(false);
      setPincodeInput('');
      setAreaNameInput('');
      setWindowInput('30-45 mins');
      setStatusMessage({ text: `PIN code ${pin} (${area}) added successfully!`, isError: false });
    } catch (err: any) {
      setPincodeError(err.response?.data?.message || 'Failed to add PIN code.');
    }
  };

  const handleTogglePincodeStatus = async (item: ISupportedPincode) => {
    try {
      const res = await adminApi.post('/delivery/admin/pincodes', {
        pincode: item.pincode,
        areaName: item.areaName,
        deliveryWindow: item.deliveryWindow,
        isServiceable: !item.isServiceable,
      });
      setConfig(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDeletePincode = async (pin: string) => {
    if (!confirm(`Remove PIN code ${pin} from delivery coverage?`)) return;

    try {
      const res = await adminApi.delete(`/delivery/admin/pincodes/${pin}`);
      setConfig(res.data.data);
      setStatusMessage({ text: `PIN code ${pin} removed.`, isError: false });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete PIN code.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        <p className="text-sm">Loading delivery serviceability settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-emerald-400" />
            Delivery Serviceability & Fees
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure city-wide delivery coverage PIN codes, order thresholds, and estimated delivery windows.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Serviceable PIN Code
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
            statusMessage.isError
              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Charges & Thresholds Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Store Delivery Pricing & Windows
        </h2>

        <form onSubmit={handleSaveCharges} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Standard Delivery Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              value={chargesForm.deliveryChargeRupees}
              onChange={(e) => setChargesForm({ ...chargesForm, deliveryChargeRupees: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              FREE Delivery Threshold (₹)
            </label>
            <input
              type="number"
              min="0"
              value={chargesForm.freeDeliveryThresholdRupees}
              onChange={(e) => setChargesForm({ ...chargesForm, freeDeliveryThresholdRupees: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Min Order Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={chargesForm.minOrderAmountRupees}
              onChange={(e) => setChargesForm({ ...chargesForm, minOrderAmountRupees: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Eco Packaging Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              value={chargesForm.packagingChargeRupees}
              onChange={(e) => setChargesForm({ ...chargesForm, packagingChargeRupees: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Default Delivery Window
            </label>
            <input
              type="text"
              value={chargesForm.defaultDeliveryWindow}
              onChange={(e) => setChargesForm({ ...chargesForm, defaultDeliveryWindow: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-5 flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Supported PIN codes table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Serviceable PIN Codes Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {config?.supportedPincodes.filter((p) => p.isServiceable).length} active delivery zones configured
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">PIN Code</th>
                <th className="px-6 py-3.5">Neighborhood / Hub Zone</th>
                <th className="px-6 py-3.5">Delivery Window</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {config?.supportedPincodes.map((item) => (
                <tr key={item.pincode} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-extrabold text-white font-mono text-sm">
                    {item.pincode}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {item.areaName}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {item.deliveryWindow || '30-45 mins'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTogglePincodeStatus(item)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        item.isServiceable
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isServiceable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {item.isServiceable ? 'Serviceable' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeletePincode(item.pincode)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remove PIN code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Serviceable PIN Code Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add Serviceable PIN Code</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the 6-digit Indian postal code and coverage area name.
            </p>

            {pincodeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{pincodeError}</span>
              </div>
            )}

            <form onSubmit={handleAddPincode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Digit PIN Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="500001"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Neighborhood / Area Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banjara Hills Sector 1-14"
                  value={areaNameInput}
                  onChange={(e) => setAreaNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estimated Delivery Window
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25-40 mins"
                  value={windowInput}
                  onChange={(e) => setWindowInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
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
