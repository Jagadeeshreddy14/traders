import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'STAFF' | 'DELIVERY_PARTNER';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

interface IAuditLog {
  id?: string;
  _id?: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'PRODUCTS', label: 'Manage Products & Prices' },
  { key: 'CATEGORIES', label: 'Manage Categories & Taxonomy' },
  { key: 'INVENTORY', label: 'Stock In/Out & Adjustments' },
  { key: 'ORDERS', label: 'Dispatch Orders & Update Status' },
  { key: 'SUPPLIERS', label: 'Manage Suppliers & Inbound POs' },
  { key: 'EXPENSES', label: 'Record & View Store Expenses' },
  { key: 'COUPONS', label: 'Configure Promos & Discounts' },
  { key: 'SETTINGS', label: 'Edit Store Operating Rules' },
];

export const StaffManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'AUDIT'>('STAFF');
  const [staff, setStaff] = useState<IStaffMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State for New Staff
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF' | 'DELIVERY_PARTNER',
    permissions: ['ORDERS', 'INVENTORY'] as string[],
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;

      const res = await adminApi.get('/admin/staff', { params });
      if (res.data?.data?.staff) {
        setStaff(res.data.data.staff);
      }
    } catch (err: any) {
      console.error('Failed to load staff:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load staff members',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/staff/audit-logs');
      if (res.data?.data?.logs) {
        setAuditLogs(res.data.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STAFF') fetchStaff();
    else fetchAuditLogs();
  }, [activeTab, roleFilter]);

  const handleTogglePermission = (permKey: string) => {
    if (form.permissions.includes(permKey)) {
      setForm({ ...form, permissions: form.permissions.filter((p) => p !== permKey) });
    } else {
      setForm({ ...form, permissions: [...form.permissions, permKey] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await adminApi.post('/admin/staff', form);
      setStatusMessage({ text: 'Staff account provisioned securely!', isError: false });
      setIsAddModalOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'STAFF',
        permissions: ['ORDERS', 'INVENTORY'],
      });
      fetchStaff();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to create staff account',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (s: IStaffMember) => {
    try {
      await adminApi.patch(`/admin/staff/${s.id}/status`);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle staff status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            Staff & Access Control Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ADMIN, STAFF, and DELIVERY_PARTNER roles with granular permissions and immutable activity logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              if (activeTab === 'STAFF') fetchStaff();
              else fetchAuditLogs();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Staff Account</span>
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

      {/* Tabs & Role Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'STAFF'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Personnel ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Staff Activity Logs</span>
          </button>
        </div>

        {activeTab === 'STAFF' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="STAFF">Staff Only</option>
              <option value="DELIVERY_PARTNER">Delivery Partners</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'STAFF' ? (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-center">Assigned Role</th>
                  <th className="py-3 px-4">Granted Permissions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading personnel directory...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No staff accounts found.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                            {s.name.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{s.name}</p>
                            <p className="text-[10px] text-slate-400">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">{s.phone || 'N/A'}</td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${
                            s.role === 'ADMIN'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : s.role === 'STAFF'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {s.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {s.role === 'ADMIN' ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                            UNRESTRICTED ACCESS
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.permissions && s.permissions.length > 0 ? (
                              s.permissions.map((p, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">No extra permissions</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            s.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit Logs */
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id || log._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.userRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-mono text-[11px]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate text-[11px]">
                        {JSON.stringify(log.details) || 'None'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400 text-[10px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Staff Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create Staff Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secure administrator, store staff, or delivery fleet account creation.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="anand@paventraders.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password (Min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Role Assignment *
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as 'ADMIN' | 'STAFF' | 'DELIVERY_PARTNER' })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="STAFF">STORE STAFF (Controlled permissions)</option>
                  <option value="DELIVERY_PARTNER">DELIVERY FLEET PARTNER (Driver / Rider)</option>
                  <option value="ADMIN">ADMINISTRATOR (Full unrestricted access)</option>
                </select>
              </div>

              {form.role === 'STAFF' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Permission Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(perm.key)}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
