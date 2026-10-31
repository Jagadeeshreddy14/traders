import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  X,
  Receipt,
  Boxes,
  Eye,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IPurchaseItem {
  product?: any;
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface IPurchase {
  _id: string;
  id?: string;
  purchaseNumber: string;
  supplierName: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  status: 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  items: IPurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paidAmount: number;
  notes?: string;
  receivedAt?: string;
  receivedByName?: string;
}

interface IProductOption {
  _id: string;
  id?: string;
  name: string;
  unit: string;
  purchasePrice: number;
}

interface ISupplierOption {
  _id: string;
  id?: string;
  name: string;
}

export const PurchasesManagementPage: React.FC = () => {
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplierOption[]>([]);
  const [products, setProducts] = useState<IProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Purchase Order Detail Drawer
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);

  // Modal State for New Purchase Order
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [receiveImmediately, setReceiveImmediately] = useState(false);
  const [items, setItems] = useState<
    Array<{ productId: string; quantity: string; purchasePrice: string; batchNumber: string }>
  >([{ productId: '', quantity: '10', purchasePrice: '100', batchNumber: '' }]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;

      const res = await adminApi.get('/admin/purchases', { params });
      if (res.data?.data?.purchases) {
        setPurchases(res.data.data.purchases);
      }
    } catch (err: any) {
      console.error('Failed to load purchases:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load purchase orders',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        adminApi.get('/admin/suppliers'),
        adminApi.get('/admin/products?limit=200'),
      ]);

      if (supRes.data?.data?.suppliers) {
        setSuppliers(supRes.data.data.suppliers);
        if (supRes.data.data.suppliers.length > 0 && !supplierId) {
          setSupplierId(supRes.data.data.suppliers[0]._id || supRes.data.data.suppliers[0].id);
        }
      }

      if (prodRes.data?.data?.products) {
        setProducts(prodRes.data.data.products);
        if (prodRes.data.data.products.length > 0 && !items[0].productId) {
          setItems([{
            productId: prodRes.data.data.products[0]._id || prodRes.data.data.products[0].id,
            quantity: '10',
            purchasePrice: String(prodRes.data.data.products[0].purchasePrice || 100),
            batchNumber: '',
          }]);
        }
      }
    } catch (err) {
      console.error('Failed to load PO dependencies:', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchDependencies();
  }, [statusFilter, search]);

  const handleAddItemRow = () => {
    const defaultProd = products[0];
    const defaultId: string = (defaultProd ? (defaultProd._id || defaultProd.id) : '') || '';
    setItems([
      ...items,
      {
        productId: defaultId,
        quantity: '10',
        purchasePrice: defaultProd ? String(defaultProd.purchasePrice || 100) : '100',
        batchNumber: '',
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;

    if (field === 'productId') {
      const prod = products.find((p) => (p._id || p.id) === value);
      if (prod && prod.purchasePrice) {
        updated[idx].purchasePrice = String(prod.purchasePrice);
      }
    }

    setItems(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier.');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber || undefined,
        purchaseDate: new Date().toISOString(),
        taxAmount: Number(taxAmount) || 0,
        notes: notes || undefined,
        receiveImmediately,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity) || 1,
          purchasePrice: Number(it.purchasePrice) || 0,
          batchNumber: it.batchNumber || undefined,
        })),
      };

      const res = await adminApi.post('/admin/purchases', payload);
      setStatusMessage({
        text: `Purchase order #${res.data?.data?.purchase?.purchaseNumber} created ${
          receiveImmediately ? 'and stock received immediately!' : 'successfully!'
        }`,
        isError: false,
      });

      setIsModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to create purchase order',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceive = async (purchase: IPurchase) => {
    if (!confirm(`Confirm physical stock receipt for PO #${purchase.purchaseNumber}? This will automatically increment inventory levels.`)) {
      return;
    }

    const pId = purchase._id || purchase.id;
    try {
      const res = await adminApi.patch(`/admin/purchases/${pId}/receive`);
      setStatusMessage({
        text: res.data?.message || 'Stock confirmed and received into inventory!',
        isError: false,
      });
      fetchPurchases();
      if (selectedPurchase && (selectedPurchase._id === pId || selectedPurchase.id === pId)) {
        setSelectedPurchase({ ...selectedPurchase, status: 'RECEIVED' });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to receive purchase stock');
    }
  };

  const handleCancelPO = async (purchase: IPurchase) => {
    if (!confirm(`Are you sure you want to cancel PO #${purchase.purchaseNumber}?`)) return;
    const pId = purchase._id || purchase.id;
    try {
      await adminApi.patch(`/admin/purchases/${pId}/cancel`);
      setStatusMessage({ text: `PO #${purchase.purchaseNumber} cancelled.`, isError: false });
      fetchPurchases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel purchase order');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            Purchases & Inbound Stock Orders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create purchase orders, track supplier invoices, and update inventory strictly upon confirmed delivery.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchPurchases();
            }}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
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
            placeholder="Search PO number, invoice, or supplier..."
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
          <option value="ALL">All PO Statuses</option>
          <option value="ORDERED">ORDERED (Inbound Expected)</option>
          <option value="RECEIVED">RECEIVED (Stock Added)</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Purchases Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Supplier Invoice #</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4 text-center">Items Count</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Stock Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No purchase orders recorded yet. Click "Create Purchase Order" to log supplier inbound stock.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po._id || po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {po.purchaseNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {po.supplierName}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {po.supplierInvoiceNumber || 'Pending Invoice'}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(po.purchaseDate).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                      {po.items?.length || 0} items
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          po.status === 'RECEIVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : po.status === 'CANCELLED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {po.status === 'RECEIVED'
                          ? 'RECEIVED & STOCKED'
                          : po.status === 'CANCELLED'
                          ? 'CANCELLED'
                          : 'ORDERED (PENDING RECEIPT)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedPurchase(po)}
                          title="View PO Details"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {po.status === 'ORDERED' && (
                          <>
                            <button
                              onClick={() => handleConfirmReceive(po)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              Receive Stock
                            </button>
                            <button
                              onClick={() => handleCancelPO(po)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Detail Drawer */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/75 flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  Purchase Order #{selectedPurchase.purchaseNumber}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vendor: {selectedPurchase.supplierName} • Invoice: {selectedPurchase.supplierInvoiceNumber || 'N/A'}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Status Header Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block">Receipt Progression</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mt-1 ${
                      selectedPurchase.status === 'RECEIVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : selectedPurchase.status === 'CANCELLED'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                    }`}
                  >
                    {selectedPurchase.status}
                  </span>
                  {selectedPurchase.receivedAt && (
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                      Received at {new Date(selectedPurchase.receivedAt).toLocaleString()} by {selectedPurchase.receivedByName || 'Staff'}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Total Payable</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{selectedPurchase.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-400" />
                  Procured Grocery Items ({selectedPurchase.items?.length || 0})
                </h4>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedPurchase.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white block">{it.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {it.unit} {it.batchNumber ? `• Batch: ${it.batchNumber}` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{it.purchasePrice}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{it.totalPrice}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedPurchase.notes && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Purchase Notes:</span>
                  <p className="text-slate-300 mt-0.5">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              {selectedPurchase.status === 'ORDERED' ? (
                <button
                  onClick={() => handleConfirmReceive(selectedPurchase)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                >
                  Confirm Physical Stock Receipt
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">Inventory updated for this PO.</span>
              )}

              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create Purchase Order (PO)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record vendor procurement orders. Stock is strictly credited only after confirmed receipt.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Supplier / Distributor *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supplier Invoice Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-TELANGANA-9001"
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    GST / Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Procured Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((row, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Product</label>
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="">Select Item</option>
                          {products.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Quantity</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Unit Cost (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={row.purchasePrice}
                          onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Batch #</label>
                        <input
                          type="text"
                          placeholder="BATCH-1"
                          value={row.batchNumber}
                          onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immediate Stock Receipt Toggle */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                <label className="flex items-center space-x-2 text-xs font-bold text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiveImmediately}
                    onChange={(e) => setReceiveImmediately(e.target.checked)}
                    className="rounded bg-slate-950 border-emerald-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark as Already Received & Increment Inventory Immediately</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 pl-5">
                  If left unchecked, status will be ORDERED and stock will only update after confirmed delivery.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Shipment Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Transport vehicle number, delivery remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? 'Generating PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
