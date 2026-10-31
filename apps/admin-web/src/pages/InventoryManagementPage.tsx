import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  History,
  RefreshCw,
  Search,
  Calendar,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IInventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unit: string;
  price: number;
  purchasePrice: number;
  image?: string;
  isAvailable: boolean;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minThreshold: number;
  batchNumber?: string;
  expiryDate?: string;
  supplierName?: string;
  isLowStock: boolean;
  lastRestockedAt?: string;
}

interface IStockMovement {
  _id: string;
  product: string;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  referenceId?: string;
  performedByName: string;
  createdAt: string;
}

export const InventoryManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);
  const [movements, setMovements] = useState<IStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State for Stock In / Out / Adjustment
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IInventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustBatch, setAdjustBatch] = useState('');
  const [adjustExpiry, setAdjustExpiry] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (onlyLowStock) params.isLowStock = 'true';

      const res = await adminApi.get('/admin/inventory', { params });
      if (res.data?.data?.inventory) {
        setInventory(res.data.data.inventory);
      }
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load inventory',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/inventory/movements');
      if (res.data?.data?.movements) {
        setMovements(res.data.data.movements);
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STOCK') {
      fetchInventory();
    } else {
      fetchMovements();
    }
  }, [activeTab, search, onlyLowStock]);

  const handleOpenAdjustModal = (item: IInventoryItem, defaultType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' = 'STOCK_IN') => {
    setSelectedProduct(item);
    setAdjustType(defaultType);
    setAdjustQty('');
    setAdjustBatch(item.batchNumber || '');
    setAdjustExpiry(item.expiryDate ? item.expiryDate.split('T')[0] : '');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    // Client-side guard for negative stock
    if (adjustType === 'STOCK_OUT' && selectedProduct.currentStock - qty < 0) {
      alert(
        `Negative inventory prevented: Cannot remove ${qty} units. Current stock is only ${selectedProduct.currentStock} units.`
      );
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await adminApi.post('/admin/inventory/adjust', {
        productId: selectedProduct.productId,
        type: adjustType,
        quantity: qty,
        batchNumber: adjustBatch || undefined,
        expiryDate: adjustExpiry || undefined,
        reason: adjustReason || undefined,
      });

      setStatusMessage({
        text: res.data?.message || 'Stock updated successfully!',
        isError: false,
      });
      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to adjust stock',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockCount = inventory.filter((i) => i.isLowStock).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            Inventory & Stock Auditing
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time shelf stock, reservation holds, batch tracking, expiry dates, and movement logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              if (activeTab === 'STOCK') fetchInventory();
              else fetchMovements();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
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

      {/* Tabs and Low Stock Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'STOCK'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Shelf Stock ({inventory.length})
          </button>
          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'MOVEMENTS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Movement Audit History</span>
          </button>
        </div>

        {lowStockCount > 0 && (
          <div
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-colors ${
              onlyLowStock
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{lowStockCount} Products Below Minimum Threshold</span>
            <span className="underline ml-1">{onlyLowStock ? 'Show All' : 'Filter Low Stock'}</span>
          </div>
        )}
      </div>

      {activeTab === 'STOCK' ? (
        <>
          {/* Search bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Batch & Expiry</th>
                    <th className="py-3 px-4 text-center">Physical Stock</th>
                    <th className="py-3 px-4 text-center">Reserved (Checkout)</th>
                    <th className="py-3 px-4 text-center">Available to Sell</th>
                    <th className="py-3 px-4 text-center">Alert Status</th>
                    <th className="py-3 px-4 text-right">Quick Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading live store inventory...
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No products match your inventory filter.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.sku || 'N/A'} • {item.unit}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[11px] font-mono">
                          <div className="text-slate-300">{item.batchNumber || 'No Batch #'}</div>
                          {item.expiryDate ? (
                            <div className="text-amber-400/90 text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Exp: {item.expiryDate.split('T')[0]}</span>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-[10px]">No expiry recorded</div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                          {item.currentStock} units
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                          {item.reservedStock} units
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-400 text-sm">
                          {item.availableStock}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              item.availableStock <= 0
                                ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                : item.isLowStock
                                ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            }`}
                          >
                            {item.availableStock <= 0
                              ? 'OUT OF STOCK'
                              : item.isLowStock
                              ? 'LOW STOCK'
                              : 'HEALTHY'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenAdjustModal(item, 'STOCK_IN')}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
                            >
                              + In
                            </button>
                            <button
                              onClick={() => handleOpenAdjustModal(item, 'STOCK_OUT')}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
                            >
                              - Out
                            </button>
                            <button
                              onClick={() => handleOpenAdjustModal(item, 'ADJUSTMENT')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                            >
                              Set
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
        </>
      ) : (
        /* Stock Movement Audit Log */
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Inventory Movement History</h3>
            <span className="text-xs text-slate-400">Total Movements: {movements.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Change Qty</th>
                  <th className="py-3 px-4 text-center">Stock Before → After</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock movement audit records yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{m.productName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'STOCK_IN' || m.type === 'PURCHASE_RECEIPT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : m.type === 'STOCK_OUT'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-extrabold">
                        <span className={m.quantity >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {m.previousStock} → <strong className="text-white">{m.newStock}</strong>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-[11px]">
                        {m.reason || m.referenceId || 'Manual adjustment'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-400">
                        {m.performedByName || 'Staff Member'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Adjust Product Stock</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.productName}</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {/* Current Stock Banner */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Shelf Stock:</span>
                <span className="text-base font-black text-white font-mono">
                  {selectedProduct.currentStock} units
                </span>
              </div>

              {/* Adjustment Type Radio Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Action Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('STOCK_IN')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      adjustType === 'STOCK_IN'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    + Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('STOCK_OUT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      adjustType === 'STOCK_OUT'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    - Stock Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      adjustType === 'ADJUSTMENT'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Exact Set
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {adjustType === 'ADJUSTMENT' ? 'New Exact Stock Level *' : 'Quantity Units *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 25"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Batch Number & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="BATCH-2026-01"
                    value={adjustBatch}
                    onChange={(e) => setAdjustBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={adjustExpiry}
                    onChange={(e) => setAdjustExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inbound shipment arrival, Spoilage, Physical audit match"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
