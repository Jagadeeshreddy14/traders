import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Printer,
  Clock,
  XCircle,
  Truck,
  Package,
  Check,
  DollarSign,
  MapPin,
  ShieldCheck,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IOrderItem {
  product: {
    _id?: string;
    id?: string;
    name: string;
    images?: string[];
    unit?: string;
  };
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface IOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  invoiceNumber?: string;
  customer: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    phone: string;
  };
  items: IOrderItem[];
  deliveryAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  pricing: {
    itemsSubtotalPaise: number;
    couponDiscountPaise: number;
    deliveryFeePaise: number;
    packagingFeePaise: number;
    totalPayablePaise: number;
  };
  couponCode?: string;
  orderStatus: string;
  paymentMethod: 'ONLINE' | 'CASH_ON_DELIVERY';
  paymentStatus: string;
  paymentDetails?: {
    _id?: string;
    provider: string;
    status: string;
    merchantTransactionId?: string;
    phonepeTransactionId?: string;
    codCollectedBy?: string;
    codCollectedAt?: string;
    codCollectionNotes?: string;
    createdAt?: string;
  };
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const OrdersManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);

  // Selected Order Drawer / Modal
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [codNotes, setCodNotes] = useState('');
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (paymentFilter !== 'ALL') params.paymentStatus = paymentFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await adminApi.get('/orders/admin', { params });
      if (res.data?.data) {
        setOrders(res.data.data.orders || []);
        setTotalOrders(res.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, paymentFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!orderId || !newStatus) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/orders/admin/${orderId}/status`, {
        status: newStatus,
        note: statusUpdateNote || `Status updated to ${newStatus} by admin`,
      });
      setStatusUpdateNote('');
      await fetchOrders();

      // Refresh drawer if active
      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
        const updated = await adminApi.get(`/orders/${orderId}`);
        if (updated.data?.data?.order) {
          setSelectedOrder(updated.data.data.order);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectCod = async (orderId: string) => {
    if (!orderId) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/orders/admin/${orderId}/collect-cod`, {
        notes: codNotes || 'Cash on Delivery payment collected in cash upon arrival.',
      });
      setCodNotes('');
      await fetchOrders();

      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
        const updated = await adminApi.get(`/orders/${orderId}`);
        if (updated.data?.data?.order) {
          setSelectedOrder(updated.data.data.order);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record COD collection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPhonePeStatus = async (orderId: string) => {
    setActionLoading(true);
    setVerifyStatusMessage(null);
    try {
      const res = await adminApi.get(`/payments/${orderId}/status`);
      const payment = res.data?.data?.payment;
      setVerifyStatusMessage(
        `PhonePe Server Status: ${payment?.status || 'UNKNOWN'}. Verified with gateway.`
      );
      await fetchOrders();
      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
        const updated = await adminApi.get(`/orders/${orderId}`);
        if (updated.data?.data?.order) {
          setSelectedOrder(updated.data.data.order);
        }
      }
    } catch (err: any) {
      setVerifyStatusMessage(
        `Verification note: ${err.response?.data?.message || 'Unable to sync with PhonePe'}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openInvoice = (orderId: string) => {
    const token = localStorage.getItem('pt_admin_access_token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    window.open(`${apiBase}/orders/${orderId}/invoice/html?token=${token}`, '_blank');
  };

  const handleRefundOrder = async (orderId: string) => {
    const reason = prompt('Please enter refund reason / memo:');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/orders/admin/${orderId}/refund`, {
        reason: reason || 'Customer refund granted by store admin',
      });
      await fetchOrders();
      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
        const updated = await adminApi.get(`/orders/${orderId}`);
        if (updated.data?.data?.order) {
          setSelectedOrder(updated.data.data.order);
        }
      }
      alert('Order status and payment have been marked as REFUNDED.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics computation
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'CONFIRMED' || o.orderStatus === 'PROCESSING').length;
  const codPendingCount = orders.filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY' && o.paymentStatus === 'PENDING').length;
  const totalRevenuePaise = orders
    .filter((o) => o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.pricing?.totalPayablePaise || 0), 0);

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80">Confirmed</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-950 text-blue-400 border border-blue-800/80">Processing</span>;
      case 'PACKED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/80">Packed</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-950 text-amber-400 border border-amber-800/80">Out for Delivery</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-950 text-green-300 border border-green-700">Delivered</span>;
      case 'PAYMENT_PENDING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-yellow-950 text-yellow-400 border border-yellow-800/80">Payment Pending</span>;
      case 'PAYMENT_FAILED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-950 text-rose-400 border border-rose-800/80">Payment Failed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-400 border border-slate-700">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string, method: string) => {
    if (status === 'SUCCESS' || status === 'PAID') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700/60">
          <Check className="w-3 h-3" />
          <span>{method === 'CASH_ON_DELIVERY' ? 'COD Collected' : 'Paid Online'}</span>
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/60">
          <Clock className="w-3 h-3" />
          <span>{method === 'CASH_ON_DELIVERY' ? 'COD Pending' : 'Awaiting Gateway'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-900/40 text-rose-300 border border-rose-700/60">
        <XCircle className="w-3 h-3" />
        <span>Failed</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-7 h-7 text-emerald-400" />
            <span>Orders & Dispatch Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time grocery orders, PhonePe gateway reconciliation, and COD collection tracking.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalOrders}</p>
          <p className="text-[11px] text-slate-500 mt-1">Single Store Fulfillment</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pending Dispatch</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{pendingOrdersCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed / In Processing</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>COD Cash Due</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{codPendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting delivery collection</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Collected Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            ₹{(totalRevenuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Online + verified cash</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, invoice #, customer name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Payment Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Payment:</span>
            </span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Payments</option>
              <option value="SUCCESS">Success / Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Order Status Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'PROCESSING', label: 'Processing' },
            { id: 'PACKED', label: 'Packed' },
            { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'PAYMENT_PENDING', label: 'Payment Pending' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Order / Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading grocery orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-400">No orders found</p>
                    <p className="text-[11px] mt-1">Try switching status filters or search term.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const orderId = o.id || o._id;
                  const totalFormatted = `₹${((o.pricing?.totalPayablePaise || 0) / 100).toFixed(2)}`;
                  const itemsCount = o.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;

                  return (
                    <tr key={orderId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-white block">{o.orderNumber}</span>
                        {o.invoiceNumber && (
                          <span className="text-[10px] text-slate-500 block">{o.invoiceNumber}</span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200 block">{o.customer?.name || o.deliveryAddress?.fullName}</span>
                        <span className="text-[11px] text-slate-400 block">{o.customer?.phone || o.deliveryAddress?.phone}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                          {o.deliveryAddress?.city} - {o.deliveryAddress?.pincode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200 block">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                          {o.items?.map((it) => it.productName).join(', ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-100 text-sm">
                        {totalFormatted}
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          {o.paymentMethod === 'ONLINE' ? (
                            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-[11px] font-semibold text-slate-300">
                            {o.paymentMethod === 'ONLINE' ? 'PhonePe Online' : 'Cash on Delivery'}
                          </span>
                        </div>
                        <div>{getPaymentStatusBadge(o.paymentStatus, o.paymentMethod)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getOrderStatusBadge(o.orderStatus)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View order details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openInvoice(orderId)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Print / View Tax Invoice"
                        >
                          <Printer className="w-4 h-4" />
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

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                  Order Details
                </span>
                <h2 className="text-xl font-black text-white">{selectedOrder.orderNumber}</h2>
                {selectedOrder.invoiceNumber && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Tax Invoice: {selectedOrder.invoiceNumber}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setVerifyStatusMessage(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Status Notification */}
            {verifyStatusMessage && (
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                <span>{verifyStatusMessage}</span>
                <button
                  onClick={() => setVerifyStatusMessage(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Status & Security Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Current Order Status</p>
                <div className="mt-1">{getOrderStatusBadge(selectedOrder.orderStatus)}</div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Payment Status</p>
                <div className="mt-1">
                  {getPaymentStatusBadge(selectedOrder.paymentStatus, selectedOrder.paymentMethod)}
                </div>
              </div>
            </div>

            {/* Progress Order Status Controls */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Update Fulfillment Status</span>
              </p>

              <div className="flex flex-wrap gap-2">
                {['CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder._id, st)}
                    disabled={actionLoading || selectedOrder.orderStatus === st}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.orderStatus === st
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
                {selectedOrder.orderStatus !== 'REFUNDED' && (
                  <button
                    onClick={() => handleRefundOrder(selectedOrder.id || selectedOrder._id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60 transition-colors"
                  >
                    Process Refund
                  </button>
                )}
              </div>
            </div>

            {/* COD Payment Collection (Authorized Staff Action) */}
            {selectedOrder.paymentMethod === 'CASH_ON_DELIVERY' && selectedOrder.paymentStatus === 'PENDING' && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
                <div className="flex items-center space-x-2 text-amber-300">
                  <Banknote className="w-5 h-5" />
                  <span className="font-bold text-xs">Record Cash on Delivery Collection</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Total payable: <strong>₹{((selectedOrder.pricing?.totalPayablePaise || 0) / 100).toFixed(2)}</strong>.
                  Marking cash as collected marks payment status as PAID and records the staff collection audit event.
                </p>
                <input
                  type="text"
                  value={codNotes}
                  onChange={(e) => setCodNotes(e.target.value)}
                  placeholder="Notes (e.g. Received full cash at doorstep)"
                  className="w-full bg-slate-950 border border-amber-800/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => handleCollectCod(selectedOrder.id || selectedOrder._id)}
                  disabled={actionLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm Cash Collected (₹{((selectedOrder.pricing?.totalPayablePaise || 0) / 100).toFixed(2)})</span>
                </button>
              </div>
            )}

            {/* PhonePe Online Security & Reconciliation Policy */}
            {selectedOrder.paymentMethod === 'ONLINE' && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold">PhonePe Payment Security Rule</span>
                  </div>
                  <button
                    onClick={() => handleVerifyPhonePeStatus(selectedOrder.id || selectedOrder._id)}
                    disabled={actionLoading}
                    className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Re-verify Gateway</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  As required by Phase 4 security standards, administrators cannot manually mark online payments as successful.
                  Status is verified strictly via PhonePe Webhook and server-to-server OAuth reconciliation.
                </p>
                {selectedOrder.paymentDetails?.merchantTransactionId && (
                  <p className="text-[10px] font-mono text-slate-400">
                    Merchant Txn ID: <strong className="text-slate-200">{selectedOrder.paymentDetails.merchantTransactionId}</strong>
                  </p>
                )}
                {selectedOrder.paymentDetails?.phonepeTransactionId && (
                  <p className="text-[10px] font-mono text-slate-400">
                    PhonePe Txn ID: <strong className="text-slate-200">{selectedOrder.paymentDetails.phonepeTransactionId}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Ordered Products</p>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-white">₹{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal</span>
                <span>₹{((selectedOrder.pricing?.itemsSubtotalPaise || 0) / 100).toFixed(2)}</span>
              </div>
              {selectedOrder.pricing?.couponDiscountPaise > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Coupon Discount ({selectedOrder.couponCode})</span>
                  <span>-₹{((selectedOrder.pricing.couponDiscountPaise) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Delivery Fee</span>
                <span>₹{((selectedOrder.pricing?.deliveryFeePaise || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Packaging Fee</span>
                <span>₹{((selectedOrder.pricing?.packagingFeePaise || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-extrabold text-white text-sm">
                <span>Total Payable</span>
                <span className="text-emerald-400">
                  ₹{((selectedOrder.pricing?.totalPayablePaise || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <p className="font-bold text-white flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Delivery Address</span>
              </p>
              <p className="font-semibold text-slate-200">{selectedOrder.deliveryAddress?.fullName}</p>
              <p className="text-slate-400">{selectedOrder.deliveryAddress?.phone}</p>
              <p className="text-slate-400">
                {selectedOrder.deliveryAddress?.addressLine1}
                {selectedOrder.deliveryAddress?.addressLine2 ? `, ${selectedOrder.deliveryAddress.addressLine2}` : ''}
              </p>
              <p className="text-slate-400">
                {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state} - {selectedOrder.deliveryAddress?.pincode}
              </p>
              {selectedOrder.deliveryAddress?.landmark && (
                <p className="text-slate-500 text-[11px]">Landmark: {selectedOrder.deliveryAddress.landmark}</p>
              )}
            </div>

            {/* Status History Timeline */}
            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Status History</p>
                <div className="space-y-2 border-l-2 border-slate-800 pl-4 py-1">
                  {selectedOrder.statusHistory.map((h, i) => (
                    <div key={i} className="text-xs relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="font-bold text-slate-200">{h.status}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString('en-IN')}
                      </p>
                      {h.note && <p className="text-[11px] text-slate-400 italic mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoice Print Action */}
            <div className="pt-2 mt-auto">
              <button
                onClick={() => openInvoice(selectedOrder.id || selectedOrder._id)}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>View & Print Official Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagementPage;
