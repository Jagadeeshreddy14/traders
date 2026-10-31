import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  MapPin,
  ShoppingBag,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ICustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpentRupees: number;
  lastOrderDate?: string;
}

interface ICustomerDetails {
  customer: any;
  addresses: any[];
  orders: any[];
}

export const CustomersManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<ICustomerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await adminApi.get('/admin/customers', { params });
      if (res.data?.data?.customers) {
        setCustomers(res.data.data.customers);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load customers',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter]);

  const handleOpenDetails = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingDetails(true);
    try {
      const res = await adminApi.get(`/admin/customers/${customerId}`);
      if (res.data?.data) {
        setCustomerDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer profile details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleStatus = async (customer: ICustomer) => {
    try {
      await adminApi.patch(`/admin/customers/${customer.id}/status`);
      fetchCustomers();
      if (customerDetails && customerDetails.customer?.id === customer.id) {
        setCustomerDetails({
          ...customerDetails,
          customer: { ...customerDetails.customer, isActive: !customerDetails.customer.isActive },
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle customer status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Customer Accounts & Profiles
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer directory, verified addresses, order histories, and account status control.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchCustomers();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
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

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Account Status</option>
          <option value="ACTIVE">Active Accounts</option>
          <option value="INACTIVE">Deactivated Accounts</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4 text-center">Total Orders</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4">Registered On</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                          {c.name.charAt(0) || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{c.phone}</td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      {c.totalOrders}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ₹{c.totalSpentRupees.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenDetails(c.id)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            c.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile & Order History Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Customer Profile & Purchase Records
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified delivery addresses and complete order progression history.
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Loading customer details...
                </div>
              ) : customerDetails ? (
                <>
                  {/* Profile Card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-base">
                          {customerDetails.customer?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">
                            {customerDetails.customer?.name}
                          </h4>
                          <p className="text-xs text-slate-400">{customerDetails.customer?.email}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          customerDetails.customer?.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {customerDetails.customer?.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                        <span className="font-mono text-slate-200">
                          {customerDetails.customer?.phone || 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Joined Store</span>
                        <span className="text-slate-200">
                          {new Date(customerDetails.customer?.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Addresses */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Saved Delivery Addresses ({customerDetails.addresses?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {customerDetails.addresses?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No saved addresses on file.</p>
                      ) : (
                        customerDetails.addresses?.map((addr: any) => (
                          <div
                            key={addr._id || addr.id}
                            className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {addr.recipientName || addr.fullName}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                PIN: {addr.postalCode || addr.pincode}
                              </span>
                            </div>
                            <p className="text-slate-400">
                              {addr.streetAddress || addr.addressLine1},{' '}
                              {addr.landmark ? `Near ${addr.landmark}, ` : ''}
                              {addr.city}, {addr.state}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Phone: {addr.recipientPhone || addr.phone}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      Order History ({customerDetails.orders?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {customerDetails.orders?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No orders placed yet.</p>
                      ) : (
                        customerDetails.orders?.map((ord: any) => (
                          <div
                            key={ord.id}
                            className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-mono font-bold text-white">{ord.orderNumber}</div>
                              <p className="text-[10px] text-slate-400">
                                {new Date(ord.createdAt).toLocaleString()} • {ord.paymentMethod}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-emerald-400">
                                ₹{ord.totalRupees}
                              </div>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  ord.orderStatus === 'DELIVERED'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : ord.orderStatus === 'CANCELLED'
                                    ? 'bg-rose-950 text-rose-300'
                                    : 'bg-amber-950 text-amber-300'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
