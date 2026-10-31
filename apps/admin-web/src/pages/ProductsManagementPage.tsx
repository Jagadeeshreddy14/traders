import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Barcode,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface IProduct {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  brand: string;
  description?: string;
  category: { _id?: string; id?: string; name: string } | string;
  sku?: string;
  barcode?: string;
  purchasePrice?: number;
  price: number;
  discountedPrice?: number;
  taxRate?: number;
  unit: string;
  stockQuantity: number;
  variants?: Array<{ name: string; sku?: string; barcode?: string; price: number; stockQuantity: number }>;
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  tags: string[];
  inventory?: {
    currentStock: number;
    reservedStock: number;
    minThreshold: number;
    isLowStock: boolean;
    batchNumber?: string;
    expiryDate?: string;
  };
}

interface ICategoryOption {
  _id: string;
  id?: string;
  name: string;
}

export const ProductsManagementPage: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    slug: '',
    brand: 'Paven Choice',
    category: '',
    description: '',
    sku: '',
    barcode: '',
    purchasePrice: '0',
    price: '',
    discountedPrice: '',
    taxRate: '5',
    unit: '1 kg',
    stockQuantity: '50',
    minThreshold: '10',
    batchNumber: '',
    expiryDate: '',
    imagesText: '',
    isAvailable: true,
    isFeatured: false,
    tagsText: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await adminApi.get('/admin/products', { params });
      if (res.data?.data?.products) {
        setProducts(res.data.data.products);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load products',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await adminApi.get('/admin/categories');
      if (res.data?.data?.categories) {
        setCategories(res.data.data.categories);
        if (res.data.data.categories.length > 0 && !form.category) {
          setForm((prev) => ({ ...prev, category: res.data.data.categories[0]._id || res.data.data.categories[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, selectedCategory, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      slug: '',
      brand: 'Paven Choice',
      category: categories[0]?._id || categories[0]?.id || '',
      description: '',
      sku: '',
      barcode: '',
      purchasePrice: '0',
      price: '',
      discountedPrice: '',
      taxRate: '5',
      unit: '1 kg',
      stockQuantity: '50',
      minThreshold: '10',
      batchNumber: '',
      expiryDate: '',
      imagesText: '',
      isAvailable: true,
      isFeatured: false,
      tagsText: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: IProduct) => {
    setEditingProduct(prod);
    const catId = typeof prod.category === 'object' ? (prod.category._id || prod.category.id) : prod.category;
    setForm({
      name: prod.name,
      slug: prod.slug,
      brand: prod.brand || 'Paven Choice',
      category: catId || '',
      description: prod.description || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      purchasePrice: String(prod.purchasePrice ?? 0),
      price: String(prod.price),
      discountedPrice: prod.discountedPrice !== undefined ? String(prod.discountedPrice) : '',
      taxRate: String(prod.taxRate ?? 0),
      unit: prod.unit,
      stockQuantity: String(prod.stockQuantity),
      minThreshold: String(prod.inventory?.minThreshold ?? 10),
      batchNumber: prod.inventory?.batchNumber || '',
      expiryDate: prod.inventory?.expiryDate ? prod.inventory.expiryDate.split('T')[0] : '',
      imagesText: prod.images?.join(', ') || '',
      isAvailable: prod.isAvailable,
      isFeatured: prod.isFeatured,
      tagsText: prod.tags?.join(', ') || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const images = form.imagesText
        ? form.imagesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const tags = form.tagsText
        ? form.tagsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        brand: form.brand,
        category: form.category,
        description: form.description,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        purchasePrice: Number(form.purchasePrice) || 0,
        price: Number(form.price),
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined,
        taxRate: Number(form.taxRate) || 0,
        unit: form.unit,
        stockQuantity: Number(form.stockQuantity) || 0,
        minThreshold: Number(form.minThreshold) || 10,
        batchNumber: form.batchNumber || undefined,
        expiryDate: form.expiryDate || undefined,
        images,
        tags,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
      };

      if (editingProduct) {
        const prodId = editingProduct._id || editingProduct.id;
        await adminApi.put(`/admin/products/${prodId}`, payload);
        setStatusMessage({ text: 'Product updated successfully!', isError: false });
      } else {
        await adminApi.post('/admin/products', payload);
        setStatusMessage({ text: 'New product added successfully!', isError: false });
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Operation failed. Please review form.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (prod: IProduct) => {
    const prodId = prod._id || prod.id;
    try {
      await adminApi.patch(`/admin/products/${prodId}/status`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (prod: IProduct) => {
    if (!confirm(`Are you sure you want to deactivate "${prod.name}"?`)) return;
    const prodId = prod._id || prod.id;
    try {
      await adminApi.delete(`/admin/products/${prodId}`);
      fetchProducts();
      setStatusMessage({ text: `Product "${prod.name}" deactivated.`, isError: false });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate product');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            Products Catalog & Pricing
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage SKU codes, barcodes, purchase costs, retail margins, variants, and stock.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchProducts();
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
            <span>Add New Product</span>
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
            placeholder="Search by name, brand, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Purchase (Cost)</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading products catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products matched your criteria. Click "Add New Product" to populate your store.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const catName =
                    typeof prod.category === 'object' ? prod.category?.name : 'Category';
                  const availableStock = prod.inventory
                    ? prod.inventory.currentStock - prod.inventory.reservedStock
                    : prod.stockQuantity;
                  const isLow = prod.inventory?.isLowStock || availableStock <= 10;

                  return (
                    <tr key={prod._id || prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {prod.images?.[0] ? (
                            <img
                              src={prod.images[0]}
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-700 bg-slate-950 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-white truncate">{prod.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {prod.brand} • {prod.unit}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div>{prod.sku || 'No SKU'}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span>{prod.barcode || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-medium">{catName}</td>

                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ₹{prod.purchasePrice ?? 0}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        ₹{prod.discountedPrice ?? prod.price}
                        {prod.discountedPrice && prod.discountedPrice < prod.price && (
                          <span className="text-[10px] text-slate-400 line-through block">
                            ₹{prod.price}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            availableStock <= 0
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : isLow
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {availableStock} units
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            prod.isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {prod.isAvailable ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            title="Edit Product"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod)}
                            title="Deactivate Product"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingProduct ? 'Edit Grocery Product' : 'Add New Grocery Product'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure retail catalog item, purchase cost, barcode, and inventory threshold.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aashirvaad Sharbati Whole Wheat Atta"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Brand and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aashirvaad / Paven Choice"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ASH-ATTA-5KG"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Barcode (EAN-13 / UPC)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8901030381029"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Pricing & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 210"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Price (MRP ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 295"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Discounted Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 265"
                    value={form.discountedPrice}
                    onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Applicable Tax (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Unit, Stock Quantity, Min Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit Specification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 kg Pack, 1 L Bottle"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 50"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={form.minThreshold}
                    onChange={(e) => setForm({ ...form, minThreshold: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Batch Number & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-OCT-01"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Image URLs (Cloudinary / CDN) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Image URLs (Comma-separated or Cloudinary link)
                </label>
                <input
                  type="text"
                  placeholder="https://res.cloudinary.com/..., https://images.unsplash.com/..."
                  value={form.imagesText}
                  onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Nutritional details, origin, and customer benefits..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              {/* Checkboxes: Active & Featured */}
              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Active in Customer Catalog</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Feature on Homepage Banners</span>
                </label>
              </div>

              {/* Submit Buttons */}
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
                  {submitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
