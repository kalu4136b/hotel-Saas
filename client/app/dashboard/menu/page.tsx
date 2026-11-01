'use client';

// Menu catalog & product management
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi } from '@/lib/api';
import {
  MenuSquare,
  Search,
  Tag,
  DollarSign,
  Utensils,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

export default function MenuCatalogPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Product Modal
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    categoryId: '',
    price: 15.0,
    taxRate: 10.0,
    description: '',
  });

  // Add Category Modal
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCat, setNewCat] = useState({
    name: '',
    description: '',
  });

  const loadMenu = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        posApi.getCategories(),
        posApi.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0 && !newProduct.categoryId) {
        setNewProduct((prev) => ({ ...prev, categoryId: cats[0].id }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to load menu catalog: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.categoryId) {
      setFeedback({ type: 'error', text: 'Please create or select a menu category first.' });
      return;
    }
    setCreatingProduct(true);
    setFeedback(null);
    try {
      await posApi.createProduct({
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim() || undefined,
        categoryId: newProduct.categoryId,
        price: Number(newProduct.price) || 0,
        taxRate: Number(newProduct.taxRate) || 10.0,
        description: newProduct.description.trim() || undefined,
      });

      setAddProductOpen(false);
      setNewProduct({
        name: '',
        sku: '',
        categoryId: categories[0]?.id || '',
        price: 15.0,
        taxRate: 10.0,
        description: '',
      });
      setFeedback({ type: 'success', text: `Dish "${newProduct.name}" added to menu catalog!` });
      await loadMenu();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add dish' });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCat(true);
    setFeedback(null);
    try {
      await posApi.createCategory({
        name: newCat.name.trim(),
        description: newCat.description.trim() || undefined,
      });
      setAddCatOpen(false);
      setNewCat({ name: '', description: '' });
      setFeedback({ type: 'success', text: `Category "${newCat.name}" created!` });
      await loadMenu();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create category' });
    } finally {
      setCreatingCat(false);
    }
  };

  const handleToggleProductStatus = async (product: any) => {
    try {
      await posApi.updateProduct(product.id, { isActive: !product.isActive });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (err: any) {
      alert('Failed to update product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!confirm(`Are you sure you want to remove "${product.name}" from the active menu?`)) {
      return;
    }
    try {
      await posApi.deleteProduct(product.id);
      setFeedback({ type: 'success', text: `Dish "${product.name}" removed.` });
      await loadMenu();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete dish' });
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = !selectedCat || p.categoryId === selectedCat;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse"></span>
              Live Product Catalog &amp; Pricing
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
              Menu Catalog &amp; Dish Pricing
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Add new food and beverage items, categorize dishes, and manage kitchen availability.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAddCatOpen(true)}
              className="py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#334155] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>Add Category</span>
            </button>
            <button
              onClick={() => setAddProductOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Menu Dish</span>
            </button>
            <a
              href="/dashboard/pos"
              className="py-2 px-3.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              Open POS Terminal
            </a>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00C48C]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span className="flex-1">{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Categories & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search dishes by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-[#0F172A] focus:bg-white focus:border-[#00C48C] outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedCat('')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCat === ''
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCat === c.id
                      ? 'bg-[#00C48C] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#64748B]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00C48C]" />
            Loading menu items from database...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center mx-auto mb-4 border border-[#A7F3D0]">
              <Utensils className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] mb-1">No Menu Items Configured Yet</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mb-6">
              Your restaurant menu is completely empty and dynamic. Start by defining your menu categories (e.g. Appetizers, Mains, Drinks) and adding dishes.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setAddCatOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] font-bold text-xs transition shadow-2xs flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-[#00C48C]" />
                <span>1. Add Category</span>
              </button>
              <button
                onClick={() => {
                  if (categories.length === 0) {
                    setAddCatOpen(true);
                  } else {
                    setAddProductOpen(true);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white font-bold text-xs transition shadow-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>2. Add Menu Item</span>
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-[#94A3B8]">
            <Utensils className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No dishes found matching criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                      {p.category?.name || 'Dish'}
                    </span>
                    <span className="text-[10.5px] font-mono text-[#94A3B8]">
                      #{p.sku || 'DSH'}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <div className="text-base font-extrabold font-mono text-[#00C48C]">
                      Rs. {Number(p.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      +{Number(p.taxRate)}% Tax
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleProductStatus(p)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition ${
                        p.isActive
                          ? 'bg-[#ECFDF5] text-[#065F46] hover:bg-[#D1FAE5]'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      title="Delete Dish"
                      className="p-1 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Menu Dish */}
        {addProductOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Add Menu Dish</h3>
                    <p className="text-[11px] text-[#64748B]">Create a sellable food or beverage item.</p>
                  </div>
                </div>
                <button onClick={() => setAddProductOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Pad Thai with Tiger Prawns"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                {categories.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    <p className="font-bold mb-1">No Categories Defined</p>
                    <p className="text-[11px] mb-3">You must create at least one category (e.g. Appetizers, Mains, Drinks) before adding dishes.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddProductOpen(false);
                        setAddCatOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs"
                    >
                      + Create Category First
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">Menu Category</label>
                      <select
                        required
                        value={newProduct.categoryId}
                        onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">SKU / Code (Optional)</label>
                      <input
                        type="text"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        placeholder="e.g. DSH-201"
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Price (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold text-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={newProduct.taxRate}
                      onChange={(e) => setNewProduct({ ...newProduct, taxRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="e.g. Served with fresh lime, crushed peanuts, and tamarind glaze"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddProductOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProduct || categories.length === 0}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {creatingProduct ? 'Saving...' : 'Add Dish to Menu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Menu Category */}
        {addCatOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Add Menu Category</h3>
                    <p className="text-[11px] text-[#64748B]">Classify dishes into a new section.</p>
                  </div>
                </div>
                <button onClick={() => setAddCatOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    placeholder="e.g. Mocktails &amp; Wine"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newCat.description}
                    onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                    placeholder="e.g. Refreshing virgin cocktails and craft sodas"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddCatOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCat}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {creatingCat ? 'Saving...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
