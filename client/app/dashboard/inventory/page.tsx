'use client';

// Phase 3: Inventory, Recipe (BOM) Management & Procurement Hub
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { inventoryApi, posApi, authStorage } from '@/lib/api';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Truck,
  BookOpen,
  DollarSign,
  Package,
  X,
  ArrowRight,
  ClipboardList,
  Sparkles,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

export default function InventoryDashboardPage() {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECIPES' | 'PROCUREMENT' | 'MOVEMENTS'>('STOCK');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stock Items State
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Recipes (BOM) State
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Suppliers & Purchase Orders State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // Movements Audit Log State
  const [movements, setMovements] = useState<any[]>([]);

  // Modals State
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any>(null);
  const [newPoModalOpen, setNewPoModalOpen] = useState(false);
  const [addSupplierModalOpen, setAddSupplierModalOpen] = useState(false);

  // Forms
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    sku: '',
    category: 'DRY_GOODS',
    unit: 'KG',
    currentStock: 10,
    minStockLevel: 5,
    costPerUnit: 5.0,
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    movementType: 'MANUAL_ADJUSTMENT',
    reason: 'Routine stock-take correction',
  });

  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });

  const [newPoForm, setNewPoForm] = useState({
    supplierId: '',
    notes: '',
    expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ inventoryItemId: '', quantityOrdered: 10, unitCost: 5.0 }],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, prodsData, suppliersData, poData, movesData] = await Promise.all([
        inventoryApi.getItems(categoryFilter || undefined, search || undefined, lowStockFilter || undefined),
        posApi.getProducts(),
        inventoryApi.getSuppliers(),
        inventoryApi.getPurchaseOrders(),
        inventoryApi.getMovements(),
      ]);

      setItems(itemsData || []);
      setProducts(prodsData || []);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(poData || []);
      setMovements(movesData || []);

      if (prodsData && prodsData.length > 0 && !selectedProductId) {
        setSelectedProductId(prodsData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, lowStockFilter]);

  // Load Recipe when selected product changes
  useEffect(() => {
    if (!selectedProductId) return;
    loadRecipe(selectedProductId);
  }, [selectedProductId]);

  const loadRecipe = async (prodId: string) => {
    setLoadingRecipe(true);
    try {
      const data = await inventoryApi.getRecipe(prodId);
      setRecipeItems(
        data.map((r: any) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: Number(r.quantityRequired),
          inventoryItem: r.inventoryItem,
        })),
      );
    } catch (err) {
      console.error('Failed to load recipe:', err);
    } finally {
      setLoadingRecipe(false);
    }
  };

  // Recipe Handlers
  const handleAddRecipeIngredient = () => {
    if (items.length === 0) return;
    setRecipeItems((prev) => [
      ...prev,
      {
        inventoryItemId: items[0].id,
        quantityRequired: 1,
        inventoryItem: items[0],
      },
    ]);
  };

  const handleUpdateRecipeRow = (index: number, field: string, value: any) => {
    setRecipeItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        if (field === 'inventoryItemId') {
          const matched = items.find((i) => i.id === value);
          return { ...row, inventoryItemId: value, inventoryItem: matched };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const handleRemoveRecipeRow = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedProductId) return;
    setSavingRecipe(true);
    try {
      await inventoryApi.saveRecipe(
        selectedProductId,
        recipeItems.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: Number(r.quantityRequired),
        })),
      );
      setFeedback({ type: 'success', text: 'Recipe Bill of Materials (BOM) saved successfully!' });
      loadRecipe(selectedProductId);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save recipe' });
    } finally {
      setSavingRecipe(false);
    }
  };

  // Create Inventory Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createItem(newItemForm);
      setAddItemModalOpen(false);
      setNewItemForm({
        name: '',
        sku: '',
        category: 'DRY_GOODS',
        unit: 'KG',
        currentStock: 10,
        minStockLevel: 5,
        costPerUnit: 5.0,
      });
      setFeedback({ type: 'success', text: 'New inventory item added successfully!' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    }
  };

  // Adjust Stock
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;
    try {
      await inventoryApi.adjustStock(selectedItemForAdjust.id, {
        quantity: Number(adjustForm.quantity),
        movementType: adjustForm.movementType,
        reason: adjustForm.reason,
      });
      setAdjustModalOpen(false);
      setFeedback({ type: 'success', text: `Stock adjusted for ${selectedItemForAdjust.name}` });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  // Create Purchase Order
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createPurchaseOrder({
        supplierId: newPoForm.supplierId,
        notes: newPoForm.notes,
        expectedDate: newPoForm.expectedDate,
        items: newPoForm.items.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          quantityOrdered: Number(i.quantityOrdered),
          unitCost: Number(i.unitCost),
        })),
      });
      setNewPoModalOpen(false);
      setFeedback({ type: 'success', text: 'Purchase order placed successfully!' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to place purchase order');
    }
  };

  // Receive Purchase Order
  const handleReceivePo = async (poId: string) => {
    try {
      await inventoryApi.receivePurchaseOrder(poId);
      setFeedback({ type: 'success', text: 'Shipment received! Inventory stock balances updated.' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to receive shipment');
    }
  };

  // Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createSupplier(newSupplierForm);
      setAddSupplierModalOpen(false);
      setNewSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      setFeedback({ type: 'success', text: 'Supplier registered successfully!' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register supplier');
    }
  };

  // Computed Metrics
  const totalValuation = items.reduce(
    (sum, i) => sum + Number(i.currentStock) * Number(i.costPerUnit),
    0,
  );
  const lowStockCount = items.filter(
    (i) => Number(i.currentStock) <= Number(i.minStockLevel),
  ).length;

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const calculatedFoodCost = recipeItems.reduce((sum, r) => {
    const cost = r.inventoryItem ? Number(r.inventoryItem.costPerUnit) : 0;
    return sum + cost * Number(r.quantityRequired);
  }, 0);
  const sellingPrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const grossProfit = sellingPrice - calculatedFoodCost;
  const marginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#0F172A] via-[#1E293B] to-[#0D9488] p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-300 mb-3 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phase 3: Inventory &amp; Bill of Materials (BOM)</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Kitchen Inventory &amp; Supply Chain
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Real-time ingredient tracking, dish recipe costing, automated POS stock deductions, and purchase orders.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
              <button
                onClick={() => setAddItemModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Item</span>
              </button>
              <button
                onClick={() => setNewPoModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Order Stock (PO)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fade-scale ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Total Stock Valuation
            </span>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#0F172A]">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">Across all active ingredients</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Tracked Items
            </span>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#0284C7]">
              {items.length} SKUs
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">Produce, Dairy, Meats &amp; Packaging</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Low Stock Warnings
            </span>
            <div className="mt-2 text-2xl font-extrabold font-mono text-amber-600 flex items-center gap-2">
              <span>{lowStockCount} Items</span>
              {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">Below safety threshold</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Pending Purchase Orders
            </span>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#7C3AED]">
              {purchaseOrders.filter((p) => p.status === 'ORDERED').length} Open
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">Awaiting supplier delivery</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] gap-8 text-sm font-bold">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'STOCK'
                ? 'border-b-2 border-[#00C48C] text-[#00C48C]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stock on Hand ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RECIPES')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'RECIPES'
                ? 'border-b-2 border-[#00C48C] text-[#00C48C]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Recipe Builder (BOM)</span>
          </button>

          <button
            onClick={() => setActiveTab('PROCUREMENT')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'PROCUREMENT'
                ? 'border-b-2 border-[#00C48C] text-[#00C48C]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Suppliers &amp; Purchase Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'MOVEMENTS'
                ? 'border-b-2 border-[#00C48C] text-[#00C48C]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Movement Audit Trail</span>
          </button>
        </div>

        {/* ================= TAB 1: STOCK ON HAND ================= */}
        {activeTab === 'STOCK' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search item name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] outline-none bg-white"
                >
                  <option value="">All Categories</option>
                  <option value="PRODUCE">Produce</option>
                  <option value="DAIRY">Dairy</option>
                  <option value="MEAT">Meat &amp; Seafood</option>
                  <option value="DRY_GOODS">Dry Goods</option>
                  <option value="BEVERAGES">Beverages</option>
                  <option value="PACKAGING">Packaging</option>
                </select>

                <label className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lowStockFilter}
                    onChange={(e) => setLowStockFilter(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Low Stock Only</span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] text-[10.5px] uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-3 text-left">Item Name / SKU</th>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-left">Stock Level vs Threshold</th>
                    <th className="px-5 py-3 text-right">Unit Cost</th>
                    <th className="px-5 py-3 text-right">Stock Valuation</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#94A3B8]">
                        No inventory items matching your search.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isLow = Number(item.currentStock) <= Number(item.minStockLevel);
                      const ratio = Math.min(
                        100,
                        Math.round((Number(item.currentStock) / (Number(item.minStockLevel) * 2)) * 100),
                      );

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-[#0F172A]">{item.name}</div>
                            <div className="font-mono text-[10px] text-[#64748B]">{item.sku}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#64748B]">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 w-60">
                            <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                              <span className={isLow ? 'text-amber-600' : 'text-[#0F172A]'}>
                                {Number(item.currentStock).toFixed(2)} {item.unit}
                              </span>
                              <span className="text-[#94A3B8] font-normal">
                                Min: {Number(item.minStockLevel).toFixed(2)} {item.unit}
                              </span>
                            </div>
                            <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLow ? 'bg-amber-500' : 'bg-[#00C48C]'
                                }`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-[#0F172A]">
                            ${Number(item.costPerUnit).toFixed(2)} / {item.unit}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-[#0F172A]">
                            ${(Number(item.currentStock) * Number(item.costPerUnit)).toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isLow
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isLow ? 'LOW STOCK' : 'HEALTHY'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedItemForAdjust(item);
                                setAdjustModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-[11px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
                            >
                              Adjust / Waste
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
        )}

        {/* ================= TAB 2: RECIPE BUILDER (BOM) ================= */}
        {activeTab === 'RECIPES' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Product Selector & Costing Summary */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-5 lg:col-span-1">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] uppercase mb-1">
                  Select Menu Dish / Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${Number(p.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="space-y-4 pt-4 border-t border-[#F1F5F9]">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Menu Selling Price:</span>
                      <span className="font-mono font-bold text-[#0F172A]">
                        ${sellingPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Calculated Food Cost:</span>
                      <span className="font-mono font-bold text-[#0284C7]">
                        ${calculatedFoodCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-[#E2E8F0]">
                      <span className="text-[#64748B] font-bold">Gross Margin:</span>
                      <span className="font-mono font-extrabold text-[#00C48C]">
                        ${grossProfit.toFixed(2)} ({marginPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    marginPercent >= 65
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {marginPercent >= 65 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {marginPercent >= 65
                        ? 'Healthy Food Cost Margin (>65%)'
                        : 'Low Profit Margin (<65%). Consider ingredient adjustments.'}
                    </span>
                  </div>

                  <button
                    onClick={handleSaveRecipe}
                    disabled={savingRecipe}
                    className="w-full py-3 rounded-2xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{savingRecipe ? 'Saving BOM...' : 'Save Recipe BOM'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Recipe Ingredients Matrix */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Ingredients Bill of Materials (BOM)
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Quantities deducted automatically per dish served
                  </p>
                </div>
                <button
                  onClick={handleAddRecipeIngredient}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-[#00C48C] hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ingredient</span>
                </button>
              </div>

              {loadingRecipe ? (
                <div className="py-16 text-center text-xs text-[#64748B]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00C48C]" />
                  Loading recipe ingredients...
                </div>
              ) : recipeItems.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#CBD5E1] rounded-2xl text-xs text-[#94A3B8]">
                  No ingredients configured for this dish yet. Click &quot;Add Ingredient&quot; above to create the recipe.
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8FAFC] text-[10.5px] uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3 text-left">Ingredient Item</th>
                        <th className="px-4 py-3 text-left">Quantity Per Portion</th>
                        <th className="px-4 py-3 text-right">Unit Cost</th>
                        <th className="px-4 py-3 text-right">Portion Cost</th>
                        <th className="px-4 py-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {recipeItems.map((row, idx) => {
                        const inv = row.inventoryItem || items.find((i) => i.id === row.inventoryItemId);
                        const cost = inv ? Number(inv.costPerUnit) : 0;
                        const lineCost = cost * Number(row.quantityRequired);

                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <select
                                value={row.inventoryItemId}
                                onChange={(e) => handleUpdateRecipeRow(idx, 'inventoryItemId', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-bold text-[#0F172A] bg-white outline-none"
                              >
                                {items.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name} ({i.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  value={row.quantityRequired}
                                  onChange={(e) =>
                                    handleUpdateRecipeRow(idx, 'quantityRequired', Number(e.target.value))
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-mono font-bold text-[#0F172A] outline-none"
                                />
                                <span className="text-[11px] text-[#64748B] font-bold">
                                  {inv?.unit || 'PCS'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-[#64748B]">
                              ${cost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-[#0F172A]">
                              ${lineCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRemoveRecipeRow(idx)}
                                className="text-[#94A3B8] hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: SUPPLIERS & PURCHASE ORDERS ================= */}
        {activeTab === 'PROCUREMENT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Suppliers List */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0F172A]">Suppliers Directory</h3>
                <button
                  onClick={() => setAddSupplierModalOpen(true)}
                  className="text-xs font-bold text-[#00C48C] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Vendor</span>
                </button>
              </div>

              <div className="space-y-3">
                {suppliers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#94A3B8]">
                    No suppliers registered.
                  </div>
                ) : (
                  suppliers.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1"
                    >
                      <div className="font-bold text-xs text-[#0F172A]">{s.name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Contact: {s.contactPerson || 'N/A'}
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center justify-between pt-1 border-t border-[#E2E8F0]">
                        <span>{s.phone || 'No phone'}</span>
                        <span className="text-[#0284C7]">{s.email || ''}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Purchase Orders (PO)</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Order stock from vendors &amp; receive deliveries into inventory
                  </p>
                </div>
                <button
                  onClick={() => setNewPoModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#0284C7] text-white hover:bg-[#0369A1] text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Purchase Order</span>
                </button>
              </div>

              <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#F8FAFC] text-[10.5px] uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3 text-left">PO Number</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#94A3B8]">
                          No purchase orders on record.
                        </td>
                      </tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">
                            {po.poNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#0F172A]">{po.supplier?.name}</div>
                            <div className="text-[10px] text-[#64748B]">
                              Expected: {po.expectedDate?.split('T')[0] || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#0F172A]">
                            ${Number(po.totalAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                po.status === 'RECEIVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {po.status === 'ORDERED' ? (
                              <button
                                onClick={() => handleReceivePo(po.id)}
                                className="px-3 py-1.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-[11px] font-bold transition-all shadow-xs"
                              >
                                Receive &amp; Stock
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#94A3B8]">Stocked</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: MOVEMENTS AUDIT TRAIL ================= */}
        {activeTab === 'MOVEMENTS' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Stock Movements Ledger</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Complete transactional audit of recipe deductions, purchase orders, spillage, and corrections
              </p>
            </div>

            <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] text-[10.5px] uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left">Date &amp; Time</th>
                    <th className="px-4 py-3 text-left">Item Name</th>
                    <th className="px-4 py-3 text-left">Movement Type</th>
                    <th className="px-4 py-3 text-right">Quantity Changed</th>
                    <th className="px-4 py-3 text-left">Reason / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-[#94A3B8]">
                        No stock movements logged yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isPositive = Number(m.quantity) > 0;
                      return (
                        <tr key={m.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3 font-mono text-[#64748B]">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#0F172A]">
                            {m.inventoryItem?.name || 'Item'}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] ${
                                m.movementType === 'RECIPE_DEDUCTION'
                                  ? 'bg-purple-50 text-purple-700'
                                  : m.movementType === 'PURCHASE_RECEIPT'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {m.movementType}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${
                              isPositive ? 'text-[#00C48C]' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? `+${Number(m.quantity).toFixed(2)}` : Number(m.quantity).toFixed(2)}{' '}
                            {m.inventoryItem?.unit}
                          </td>
                          <td className="px-4 py-3 text-[#64748B]">{m.reason}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD INVENTORY ITEM ================= */}
        {addItemModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-base font-bold text-[#0F172A]">Add New Inventory Item</h3>
                <button onClick={() => setAddItemModalOpen(false)}>
                  <X className="w-4 h-4 text-[#94A3B8]" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4 pt-4 text-xs font-semibold">
                <div>
                  <label className="block text-[#0F172A] mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Mozzarella Cheese"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0F172A] mb-1">Category</label>
                    <select
                      value={newItemForm.category}
                      onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none bg-white"
                    >
                      <option value="PRODUCE">Produce</option>
                      <option value="DAIRY">Dairy</option>
                      <option value="MEAT">Meat &amp; Seafood</option>
                      <option value="DRY_GOODS">Dry Goods</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="AMENITIES">Amenities</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#0F172A] mb-1">Unit of Measure</label>
                    <select
                      value={newItemForm.unit}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none bg-white"
                    >
                      <option value="KG">Kilogram (KG)</option>
                      <option value="G">Gram (G)</option>
                      <option value="L">Liter (L)</option>
                      <option value="ML">Milliliter (ML)</option>
                      <option value="PCS">Pieces (PCS)</option>
                      <option value="PACK">Packs</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#0F172A] mb-1">Current Stock</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newItemForm.currentStock}
                      onChange={(e) =>
                        setNewItemForm({ ...newItemForm, currentStock: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#0F172A] mb-1">Safety Min</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newItemForm.minStockLevel}
                      onChange={(e) =>
                        setNewItemForm({ ...newItemForm, minStockLevel: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#0F172A] mb-1">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newItemForm.costPerUnit}
                      onChange={(e) =>
                        setNewItemForm({ ...newItemForm, costPerUnit: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddItemModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-md"
                  >
                    Create Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADJUST / SPOILAGE ================= */}
        {adjustModalOpen && selectedItemForAdjust && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Stock Adjustment</h3>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {selectedItemForAdjust.name} (Current: {Number(selectedItemForAdjust.currentStock).toFixed(2)} {selectedItemForAdjust.unit})
                  </div>
                </div>
                <button onClick={() => setAdjustModalOpen(false)}>
                  <X className="w-4 h-4 text-[#94A3B8]" />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4 pt-4 text-xs font-semibold">
                <div>
                  <label className="block text-[#0F172A] mb-1">Adjustment Type</label>
                  <select
                    value={adjustForm.movementType}
                    onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none bg-white"
                  >
                    <option value="MANUAL_ADJUSTMENT">Stock Take Correction</option>
                    <option value="WASTE_SPOILAGE">Wastage / Spoilage / Damage</option>
                    <option value="RETURN">Return to Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#0F172A] mb-1">
                    Quantity Adjustment (use negative to reduce, positive to add)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="-2.5"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#0F172A] mb-1">Reason / Note</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Expired batch or spillage during prep"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-md"
                  >
                    Confirm Adjust
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: CREATE PURCHASE ORDER ================= */}
        {newPoModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-base font-bold text-[#0F172A]">Create Purchase Order</h3>
                <button onClick={() => setNewPoModalOpen(false)}>
                  <X className="w-4 h-4 text-[#94A3B8]" />
                </button>
              </div>

              <form onSubmit={handleCreatePo} className="space-y-4 pt-4 text-xs font-semibold">
                <div>
                  <label className="block text-[#0F172A] mb-1">Select Supplier</label>
                  <select
                    required
                    value={newPoForm.supplierId}
                    onChange={(e) => setNewPoForm({ ...newPoForm, supplierId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none bg-white"
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0F172A] mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      required
                      value={newPoForm.expectedDate}
                      onChange={(e) => setNewPoForm({ ...newPoForm, expectedDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] mb-1">PO Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard weekly stock"
                      value={newPoForm.notes}
                      onChange={(e) => setNewPoForm({ ...newPoForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>
                </div>

                {/* Items to Order */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[#0F172A] uppercase text-[10.5px]">
                      Order Line Items
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewPoForm({
                          ...newPoForm,
                          items: [
                            ...newPoForm.items,
                            { inventoryItemId: items[0]?.id || '', quantityOrdered: 10, unitCost: 5 },
                          ],
                        })
                      }
                      className="text-[11px] font-bold text-[#0284C7] hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-2 border border-[#E2E8F0] p-3 rounded-2xl bg-[#F8FAFC]">
                    {newPoForm.items.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          required
                          value={line.inventoryItemId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = items.find((i) => i.id === val);
                            const updated = [...newPoForm.items];
                            updated[idx].inventoryItemId = val;
                            if (matched) updated[idx].unitCost = Number(matched.costPerUnit);
                            setNewPoForm({ ...newPoForm, items: updated });
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-bold text-[#0F172A] bg-white outline-none"
                        >
                          <option value="">Select Item...</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="Qty"
                          value={line.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...newPoForm.items];
                            updated[idx].quantityOrdered = Number(e.target.value);
                            setNewPoForm({ ...newPoForm, items: updated });
                          }}
                          className="w-16 px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-mono font-bold text-[#0F172A] outline-none"
                        />

                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Cost"
                          value={line.unitCost}
                          onChange={(e) => {
                            const updated = [...newPoForm.items];
                            updated[idx].unitCost = Number(e.target.value);
                            setNewPoForm({ ...newPoForm, items: updated });
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-mono font-bold text-[#0F172A] outline-none"
                        />

                        {newPoForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newPoForm.items.filter((_, i) => i !== idx);
                              setNewPoForm({ ...newPoForm, items: updated });
                            }}
                            className="text-[#94A3B8] hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setNewPoModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-md"
                  >
                    Submit Purchase Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD SUPPLIER ================= */}
        {addSupplierModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-base font-bold text-[#0F172A]">Register Vendor / Supplier</h3>
                <button onClick={() => setAddSupplierModalOpen(false)}>
                  <X className="w-4 h-4 text-[#94A3B8]" />
                </button>
              </div>

              <form onSubmit={handleCreateSupplier} className="space-y-3.5 pt-4 text-xs font-semibold">
                <div>
                  <label className="block text-[#0F172A] mb-1">Company / Supplier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Seafood Wholesale"
                    value={newSupplierForm.name}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#0F172A] mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newSupplierForm.contactPerson}
                    onChange={(e) =>
                      setNewSupplierForm({ ...newSupplierForm, contactPerson: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0F172A] mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="orders@vendor.com"
                      value={newSupplierForm.email}
                      onChange={(e) =>
                        setNewSupplierForm({ ...newSupplierForm, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={newSupplierForm.phone}
                      onChange={(e) =>
                        setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#0F172A] mb-1">Warehouse Address</label>
                  <input
                    type="text"
                    placeholder="123 Industrial Way"
                    value={newSupplierForm.address}
                    onChange={(e) =>
                      setNewSupplierForm({ ...newSupplierForm, address: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddSupplierModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-md"
                  >
                    Save Supplier
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
