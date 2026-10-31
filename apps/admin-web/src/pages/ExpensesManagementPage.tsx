import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Building,
  Zap,
  Truck,
  Users,
  Package,
  Wrench,
  HelpCircle,
  TrendingDown,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IExpense {
  _id: string;
  id?: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  receiptUrl?: string;
  referenceNumber?: string;
  notes?: string;
  recordedByName?: string;
}

const CATEGORIES = [
  { key: 'RENT', label: 'Rent', icon: Building, color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
  { key: 'SALARIES', label: 'Salaries & Wages', icon: Users, color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
  { key: 'ELECTRICITY', label: 'Electricity & Utilities', icon: Zap, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
  { key: 'TRANSPORT', label: 'Transport & Logistics', icon: Truck, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
  { key: 'PACKAGING', label: 'Packaging Materials', icon: Package, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' },
  { key: 'MARKETING', label: 'Marketing & Promos', icon: Wallet, color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' },
  { key: 'MAINTENANCE', label: 'Store Maintenance', icon: Wrench, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60' },
  { key: 'OTHER', label: 'Other Operational Expenses', icon: HelpCircle, color: 'text-slate-400 bg-slate-800/60 border-slate-700/60' },
];

export const ExpensesManagementPage: React.FC = () => {
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [totalExpenseRupees, setTotalExpenseRupees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'RENT',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    referenceNumber: '',
    receiptUrl: '',
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const res = await adminApi.get('/admin/expenses', { params });
      if (res.data?.data) {
        setExpenses(res.data.data.expenses || []);
        setTotalExpenseRupees(res.data.data.totalExpenseRupees || 0);
      }
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load expenses',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await adminApi.post('/admin/expenses', {
        ...form,
        amount: amountNum,
      });

      setStatusMessage({ text: 'Expense recorded successfully!', isError: false });
      setIsModalOpen(false);
      setForm({
        title: '',
        category: 'RENT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
        referenceNumber: '',
        receiptUrl: '',
        notes: '',
      });
      fetchExpenses();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to record expense',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exp: IExpense) => {
    if (!confirm(`Are you sure you want to delete expense "${exp.title}"?`)) return;
    const expId = exp._id || exp.id;
    try {
      await adminApi.delete(`/admin/expenses/${expId}`);
      setStatusMessage({ text: `Expense "${exp.title}" deleted.`, isError: false });
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-rose-400" />
            Store Operational Expenses
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log store rent, employee salaries, electricity, transport, and maintenance costs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchExpenses();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
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

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:col-span-2 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Recorded Operating Expenses
            </span>
            <h3 className="text-3xl font-black text-rose-400 mt-1 font-mono">
              ₹{totalExpenseRupees.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Reflected across {expenses.length} transaction vouchers
            </p>
          </div>
          <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-2xl text-rose-400">
            <TrendingDown className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-center">
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
            Filter by Department / Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading expenses records...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records found. Click "Record Expense" to track store operational costs.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id || exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{exp.title}</span>
                      {exp.notes && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                          {exp.notes}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {exp.paymentMethod}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {exp.referenceNumber || 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-rose-400 text-sm">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(exp)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Record Operating Store Expense</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accurately logged against store monthly P&L statement.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expense Title / Memo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Store Rent - October 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">Cash Voucher</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reference / Transaction UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-99882211 or Voucher #042"
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Voucher details, recipient name..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Save Expense Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
