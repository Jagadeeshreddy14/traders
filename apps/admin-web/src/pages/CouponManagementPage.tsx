import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Percent,
  IndianRupee,
  Calendar,
  Users,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ICoupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usedCount: number;
  userUsageLimit: number;
  isActive: boolean;
  createdAt: string;
}

export const CouponManagementPage: React.FC = () => {
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State (amounts in Rupees for easy admin entry)
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: '20', // % or ₹
    minOrderAmountRupees: '499',
    maxDiscountRupees: '200',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: '1000',
    userUsageLimit: '1',
    isActive: true,
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/coupons/admin');
      if (res.data?.data?.coupons) {
        setCoupons(res.data.data.coupons);
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to fetch coupons',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggleStatus = async (coupon: ICoupon) => {
    try {
      const res = await adminApi.patch(`/coupons/admin/${coupon._id}/status`);
      if (res.data?.data?.coupon) {
        setCoupons((prev) =>
          prev.map((c) => (c._id === coupon._id ? res.data.data.coupon : c))
        );
        setStatusMessage({
          text: `Coupon ${coupon.code} is now ${res.data.data.coupon.isActive ? 'Active' : 'Inactive'}`,
          isError: false,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteCoupon = async (coupon: ICoupon) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${coupon.code}"?`)) return;

    try {
      await adminApi.delete(`/coupons/admin/${coupon._id}`);
      setCoupons((prev) => prev.filter((c) => c._id !== coupon._id));
      setStatusMessage({
        text: `Coupon "${coupon.code}" deleted successfully`,
        isError: false,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Coupon code is required.');
      return;
    }

    const dValue = Number(form.discountValue);
    if (isNaN(dValue) || dValue <= 0) {
      setFormError('Please enter a valid discount value.');
      return;
    }

    if (form.discountType === 'PERCENTAGE' && dValue > 99) {
      setFormError('Percentage discount cannot exceed 99%.');
      return;
    }

    try {
      setSubmitting(true);
      // Backend expects integer paise for currency fields
      const payload = {
        code: cleanCode,
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: form.discountType === 'PERCENTAGE' ? dValue : Math.round(dValue * 100),
        minOrderValue: Math.round(Number(form.minOrderAmountRupees || 0) * 100),
        maxDiscountAmount:
          form.discountType === 'PERCENTAGE' && form.maxDiscountRupees
            ? Math.round(Number(form.maxDiscountRupees) * 100)
            : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:59.999Z`).toISOString(),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        userUsageLimit: Number(form.userUsageLimit) || 1,
        isActive: form.isActive,
      };

      const res = await adminApi.post('/coupons/admin', payload);
      if (res.data?.data?.coupon) {
        setCoupons((prev) => [res.data.data.coupon, ...prev]);
        setIsModalOpen(false);
        setStatusMessage({
          text: `Coupon "${cleanCode}" created successfully!`,
          isError: false,
        });
        // reset form
        setForm({
          code: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '20',
          minOrderAmountRupees: '499',
          maxDiscountRupees: '200',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          usageLimit: '1000',
          userUsageLimit: '1',
          isActive: true,
        });
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        <p className="text-sm">Loading coupons and promotional campaigns...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-emerald-400" />
            Coupons & Promotions Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create and monitor grocery discount codes, minimum order criteria, usage limits, and validity.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Coupon
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

      {/* Coupons List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Configured Promotional Coupons</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {coupons.filter((c) => c.isActive).length} active coupons live for customer checkout
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Benefit</th>
                <th className="px-6 py-3.5">Criteria & Cap</th>
                <th className="px-6 py-3.5">Validity Range</th>
                <th className="px-6 py-3.5">Redemptions</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No coupons found. Click "Create New Coupon" to set up your first promo.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = new Date(coupon.endDate) < new Date();
                  return (
                    <tr key={coupon._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-white font-mono text-sm flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-400">
                            {coupon.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {coupon.description || 'Promotional grocery discount'}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-100">
                        {coupon.discountType === 'PERCENTAGE' ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Percent className="w-3.5 h-3.5" />
                            {coupon.discountValue}% OFF
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <IndianRupee className="w-3.5 h-3.5" />
                            ₹{(coupon.discountValue / 100).toFixed(0)} FLAT OFF
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="text-[11px]">
                          Min Order: <span className="font-bold">₹{(coupon.minOrderValue / 100).toFixed(0)}</span>
                        </div>
                        {coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0 && (
                          <div className="text-[11px] text-slate-400">
                            Max Cap: ₹{(coupon.maxDiscountAmount / 100).toFixed(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(coupon.startDate).toLocaleDateString()} –{' '}
                            {new Date(coupon.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-rose-400 font-bold block mt-0.5">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex items-center gap-1 font-mono text-xs">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{coupon.usedCount}</span>
                          <span className="text-slate-500">
                            / {coupon.usageLimit ? coupon.usageLimit : '∞'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Max {coupon.userUsageLimit || 1} per user
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            coupon.isActive && !isExpired
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              coupon.isActive && !isExpired ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {coupon.isActive && !isExpired ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-1">Create Discount Coupon</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure code, discount percentage or flat amount, validity dates, and usage limits.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAVEMORE15"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Get 20% off up to ₹200 on all orders above ₹499"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {form.discountType === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmountRupees}
                    onChange={(e) => setForm({ ...form, minOrderAmountRupees: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={form.discountType === 'FLAT'}
                    placeholder={form.discountType === 'FLAT' ? 'N/A' : 'Cap (₹)'}
                    value={form.maxDiscountRupees}
                    onChange={(e) => setForm({ ...form, maxDiscountRupees: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Total Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Per-Customer Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.userUsageLimit}
                    onChange={(e) => setForm({ ...form, userUsageLimit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
