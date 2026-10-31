import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface IDashboardKPI {
  todaySales: number;
  todayOrders: number;
  weeklySales: number;
  monthlySales: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  activeProducts: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface IFinancialSummary {
  paidOnlineRevenue: number;
  codCollected: number;
  codOutstanding: number;
  totalRevenueReceived: number;
  totalSalesValue: number;
  refunds: number;
  cancelledOrdersCount: number;
  cancelledOrdersValue: number;
  purchaseCosts: number;
  expenses: number;
  basicEstimatedProfit: number;
}

interface ISalesChartPoint {
  date: string;
  day: string;
  salesRupees: number;
  orders: number;
}

interface IRecentOrder {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  itemsDescription: string;
  totalRupees: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryPartnerName: string;
  createdAt: string;
}

interface ILowStockItem {
  id: string;
  name: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minThreshold: number;
  status: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpi, setKpi] = useState<IDashboardKPI | null>(null);
  const [financials, setFinancials] = useState<IFinancialSummary | null>(null);
  const [salesChart, setSalesChart] = useState<ISalesChartPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<IRecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ILowStockItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const res = await adminApi.get('/admin/analytics/dashboard');
      if (res.data?.data) {
        const { kpi, financialSummary, salesChart, recentOrders, lowStockItems } =
          res.data.data;
        setKpi(kpi);
        setFinancials(financialSummary);
        setSalesChart(salesChart || []);
        setRecentOrders(recentOrders || []);
        setLowStockItems(lowStockItems || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(
        err.response?.data?.message || 'Unable to connect to live analytics API.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const maxChartSales = Math.max(...salesChart.map((s) => s.salesRupees), 100);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading store analytics and metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Store Command Center
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
              Live DB
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{adminUser?.name}</strong> • Role:{' '}
            <span className="text-emerald-400 font-mono font-semibold">{adminUser?.role}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>
          <button
            onClick={() => navigate('/products')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Products</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-bold underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Sales</span>
            <div className="p-2 rounded-xl border text-emerald-400 bg-emerald-950/60 border-emerald-800/60">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white tracking-tight">
              ₹{(kpi?.todaySales || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <span className="text-emerald-400 font-semibold">{kpi?.todayOrders || 0} Orders placed</span>
              <span>today</span>
            </p>
          </div>
        </div>

        {/* Weekly & Monthly Sales */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Monthly Sales (MTD)</span>
            <div className="p-2 rounded-xl border text-blue-400 bg-blue-950/60 border-blue-800/60">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white tracking-tight">
              ₹{(kpi?.monthlySales || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Last 7 days: <strong className="text-slate-200">₹{(kpi?.weeklySales || 0).toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </div>

        {/* Pending vs Completed Orders */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Order Queue</span>
            <div className="p-2 rounded-xl border text-amber-400 bg-amber-950/60 border-amber-800/60">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {kpi?.pendingOrders || 0} Pending
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{kpi?.completedOrders || 0} Completed</span>
              <span>to date</span>
            </p>
          </div>
        </div>

        {/* Catalog & Stock Status */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Catalog Health</span>
            <div className="p-2 rounded-xl border text-rose-400 bg-rose-950/60 border-rose-800/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {kpi?.lowStockCount || 0} Low Stock
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              <span className="text-rose-400 font-semibold">{kpi?.outOfStockCount || 0} Out of Stock</span> •{' '}
              <span className="text-slate-300">{kpi?.activeProducts || 0} Active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Section (Strict Mathematical Accuracy) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Store Financial Health & Revenue Realization
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict accounting: Uncollected COD and failed transactions are completely excluded from received revenue.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-semibold tracking-wider">
              Net Estimated Profit
            </span>
            <span
              className={`text-xl font-black ${
                (financials?.basicEstimatedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(financials?.basicEstimatedProfit || 0) >= 0 ? '+' : ''}₹
              {(financials?.basicEstimatedProfit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Paid Online Revenue</span>
            <span className="text-base font-black text-emerald-400 mt-1 block">
              ₹{(financials?.paidOnlineRevenue || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400">PhonePe / UPI Verified</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">COD Collected</span>
            <span className="text-base font-black text-emerald-400 mt-1 block">
              ₹{(financials?.codCollected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400">Cash in Hand / Deposited</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">COD Outstanding</span>
            <span className="text-base font-black text-amber-400 mt-1 block">
              ₹{(financials?.codOutstanding || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-amber-400/80">Dispatched / Uncollected</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Purchase Costs</span>
            <span className="text-base font-black text-blue-400 mt-1 block">
              ₹{(financials?.purchaseCosts || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400">Stock Inbound Invoices</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Operating Expenses</span>
            <span className="text-base font-black text-rose-400 mt-1 block">
              ₹{(financials?.expenses || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400">Rent, Salaries, Utilities</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Refunds & Cancelled</span>
            <span className="text-base font-black text-slate-300 mt-1 block">
              ₹{(financials?.refunds || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-rose-400/80">
              {financials?.cancelledOrdersCount || 0} Cancelled Orders
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Live Sales Trend Chart */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white">7-Day Sales Progression</h2>
            <p className="text-xs text-slate-400 mt-0.5">Daily gross revenue and order frequency</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Total 7 Days: ₹{(kpi?.weeklySales || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 items-end h-44 pt-6 pb-2 border-b border-slate-800">
          {salesChart.map((point) => {
            const heightPercent = Math.max(
              8,
              Math.min(100, Math.round((point.salesRupees / maxChartSales) * 100))
            );
            return (
              <div key={point.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
                  ₹{point.salesRupees > 0 ? `${(point.salesRupees / 1000).toFixed(1)}k` : '0'}
                </div>
                <div className="w-full bg-slate-800 rounded-t-lg relative overflow-hidden flex items-end justify-center h-28">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-500 group-hover:to-emerald-300"
                  ></div>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-bold text-slate-300 block">{point.day}</span>
                  <span className="text-[9px] text-slate-400">{point.orders} ord</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Low Stock Alerts & Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Warnings */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Low Stock Threshold Alerts
              </h3>
              <Link to="/inventory" className="text-xs text-emerald-400 hover:underline font-semibold">
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60 mt-3">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
                  All inventory stocks are healthy above minimum thresholds.
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Min threshold: {item.minThreshold} units
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                        item.availableStock <= 0
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {item.availableStock} in stock
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/inventory"
            className="mt-4 block text-center py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Replenish Stock / Stock In →
          </Link>
        </div>

        {/* Live Orders Progression */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Recent City Orders
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Live order pipeline synced with customer checkout</p>
            </div>
            <Link to="/orders" className="text-xs text-emerald-400 font-semibold hover:underline">
              Manage All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4">Partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No customer orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{ord.orderNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{ord.customerName}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">₹{ord.totalRupees}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-mono text-slate-300">
                          {ord.paymentMethod} •{' '}
                          <span
                            className={
                              ord.paymentStatus === 'PAID' || ord.paymentStatus === 'SUCCESS'
                                ? 'text-emerald-400 font-bold'
                                : 'text-amber-400'
                            }
                          >
                            {ord.paymentStatus}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.orderStatus === 'DELIVERED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : ord.orderStatus === 'CANCELLED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : ord.orderStatus === 'OUT_FOR_DELIVERY'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{ord.deliveryPartnerName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
