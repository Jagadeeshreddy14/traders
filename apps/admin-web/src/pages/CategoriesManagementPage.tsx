import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ICategory {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  subcategories?: string[];
  productCount?: number;
}

export const CategoriesManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: '🛒',
    displayOrder: '0',
    subcategoriesText: '',
    isActive: true,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/categories');
      if (res.data?.data?.categories) {
        setCategories(res.data.data.categories);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to load categories',
        isError: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      image: '',
      icon: '🛒',
      displayOrder: String(categories.length + 1),
      subcategoriesText: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: ICategory) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      icon: cat.icon || '🛒',
      displayOrder: String(cat.displayOrder ?? 0),
      subcategoriesText: cat.subcategories?.join(', ') || '',
      isActive: cat.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const subcategories = form.subcategoriesText
        ? form.subcategoriesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        image: form.image,
        icon: form.icon,
        displayOrder: Number(form.displayOrder) || 0,
        subcategories,
        isActive: form.isActive,
      };

      if (editingCategory) {
        const catId = editingCategory._id || editingCategory.id;
        await adminApi.put(`/admin/categories/${catId}`, payload);
        setStatusMessage({ text: 'Category updated successfully!', isError: false });
      } else {
        await adminApi.post('/admin/categories', payload);
        setStatusMessage({ text: 'Category created successfully!', isError: false });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to save category',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: ICategory) => {
    const catId = cat._id || cat.id;
    try {
      await adminApi.patch(`/admin/categories/${catId}/status`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (cat: ICategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    const catId = cat._id || cat.id;
    try {
      const res = await adminApi.delete(`/admin/categories/${catId}`);
      fetchCategories();
      setStatusMessage({
        text: res.data?.message || `Category "${cat.name}" deleted.`,
        isError: false,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            Categories & Grocery Taxonomy
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize departments, aisle categories, subcategories, and homepage display hierarchy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchCategories();
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
            <span>Add Category</span>
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Loading grocery categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No categories defined. Click "Add Category" to initialize your catalog.
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat._id || cat.id}
              className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Image Header */}
                <div className="h-32 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">{cat.icon || '🛒'}</div>
                  )}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{cat.icon || '🛒'}</span>
                    <span>Order #{cat.displayOrder}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        cat.isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base truncate">{cat.name}</h3>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0">
                      {cat.productCount ?? 0} Products
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {cat.description || 'No department description provided.'}
                  </p>

                  {/* Subcategories Chips */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cat.subcategories.map((sub, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60 font-medium"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-850/40 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEditModal(cat)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingCategory ? 'Edit Category' : 'Create Grocery Category'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set department name, icon, banner image URL, and subcategories.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dairy Products, Fruits, Snacks"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Order (Rank)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Icon Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🥛, 🌾, 🍎"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Banner Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or Cloudinary URL"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subcategories (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milk, Paneer, Curd, Butter, Cheese"
                  value={form.subcategoriesText}
                  onChange={(e) => setForm({ ...form, subcategoriesText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Category overview displayed on department page..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Category is Active on Customer Store</span>
                </label>
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
                  {submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
