import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  X,
  Building,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ISupplier {
  _id: string;
  id?: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  };
  notes?: string;
  isActive: boolean;
  purchaseCount?: number;
  totalPurchasedRupees?: number;
}

export const SuppliersManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ISupplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    notes: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;

      const res = await adminApi.get('/admin/suppliers', { params });
      if (res.data?.data?.suppliers) {
        setSuppliers(res.data.data.suppliers);
      }
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load suppliers',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      accountNumber: '',
      ifsc: '',
      bankName: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sup: ISupplier) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone,
      email: sup.email || '',
      address: sup.address || '',
      gstin: sup.gstin || '',
      accountNumber: sup.bankDetails?.accountNumber || '',
      ifsc: sup.bankDetails?.ifsc || '',
      bankName: sup.bankDetails?.bankName || '',
      notes: sup.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        name: form.name,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        address: form.address,
        gstin: form.gstin,
        bankDetails: {
          accountNumber: form.accountNumber,
          ifsc: form.ifsc,
          bankName: form.bankName,
        },
        notes: form.notes,
      };

      if (editingSupplier) {
        const supId = editingSupplier._id || editingSupplier.id;
        await adminApi.put(`/admin/suppliers/${supId}`, payload);
        setStatusMessage({ text: 'Supplier updated successfully!', isError: false });
      } else {
        await adminApi.post('/admin/suppliers', payload);
        setStatusMessage({ text: 'Supplier created successfully!', isError: false });
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to save supplier',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sup: ISupplier) => {
    if (!confirm(`Are you sure you want to deactivate supplier "${sup.name}"?`)) return;
    const supId = sup._id || sup.id;
    try {
      await adminApi.delete(`/admin/suppliers/${supId}`);
      fetchSuppliers();
      setStatusMessage({ text: `Supplier "${sup.name}" deactivated.`, isError: false });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-400" />
            Supplier Directory & Vendor Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage wholesale distributors, produce farmers, FMCG millers, and contact details.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchSuppliers();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
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

      {/* Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search suppliers by company, contact person, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Loading supplier profiles...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No supplier profiles registered. Click "Add Supplier" to register wholesale vendors.
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup._id || sup.id}
              className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-colors shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-white text-base truncate">{sup.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Attn: {sup.contactPerson || 'Vendor Executive'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      sup.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {sup.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-400 line-clamp-2">{sup.address}</span>
                    </div>
                  )}
                  {sup.gstin && (
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                      <span className="font-bold text-slate-300">GSTIN:</span>
                      <span>{sup.gstin}</span>
                    </div>
                  )}
                </div>

                {/* Purchase Stats */}
                <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Purchase Orders</span>
                    <span className="font-bold text-white font-mono">{sup.purchaseCount || 0} POs</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Procured Value</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      ₹{(sup.totalPurchasedRupees || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEditModal(sup)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => handleDelete(sup)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingSupplier ? 'Edit Supplier Profile' : 'Register New Vendor'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supplier trade contact details and banking information.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Telangana Agro Wholesale Distributors"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Venkat Rao"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9848012345"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    placeholder="36ABCDE1234F1Z5"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Warehouse / Trade Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Market yard, building name, city, state..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
