'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { inventoryApi, posApi } from '@/lib/api';
import {
  Boxes,
  Wine,
  UtensilsCrossed,
  Building2,
  Truck,
  PackageCheck,
  Send,
  History,
  BookOpen,
  Building,
  BarChart3,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from 'lucide-react';

// Tabs
import InventoryOverviewTab from './components/InventoryOverviewTab';
import BarInventoryTab from './components/BarInventoryTab';
import KitchenInventoryTab from './components/KitchenInventoryTab';
import OperationalInventoryTab from './components/OperationalInventoryTab';
import PurchaseOrdersTab from './components/PurchaseOrdersTab';
import GoodsReceivedNotesTab from './components/GoodsReceivedNotesTab';
import OperationalIssuanceTab from './components/OperationalIssuanceTab';
import StockMovementsTab from './components/StockMovementsTab';
import RecipeBomTab from './components/RecipeBomTab';
import SuppliersTab from './components/SuppliersTab';
import InventoryReportsTab from './components/InventoryReportsTab';

// Modals
import ItemModal from './components/ItemModal';
import PurchaseOrderModal from './components/PurchaseOrderModal';
import GoodsReceivedNoteModal from './components/GoodsReceivedNoteModal';
import OperationalIssuanceModal from './components/OperationalIssuanceModal';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import SupplierModal from './components/SupplierModal';
import ViewPoModal from './components/ViewPoModal';
import ViewGrnModal from './components/ViewGrnModal';

export type InventoryTabType =
  | 'OVERVIEW'
  | 'BAR'
  | 'KITCHEN'
  | 'OPERATIONAL'
  | 'PURCHASE_ORDERS'
  | 'GRN'
  | 'ISSUANCES'
  | 'MOVEMENTS'
  | 'RECIPES'
  | 'SUPPLIERS'
  | 'REPORTS';

export default function InventoryDashboardPage() {
  const [activeTab, setActiveTab] = useState<InventoryTabType>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const applyUrlTab = (searchStr?: string) => {
      const params = new URLSearchParams(searchStr ?? window.location.search);
      const tab = params.get('tab')?.toUpperCase() as InventoryTabType | undefined;
      const validTabs: InventoryTabType[] = [
        'OVERVIEW',
        'BAR',
        'KITCHEN',
        'OPERATIONAL',
        'PURCHASE_ORDERS',
        'GRN',
        'ISSUANCES',
        'MOVEMENTS',
        'RECIPES',
        'SUPPLIERS',
        'REPORTS',
      ];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    };
    applyUrlTab();
    const handleNavTab = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.href?.includes('?')) {
        applyUrlTab('?' + detail.href.split('?')[1]);
      }
    };
    window.addEventListener('hotel-nav-tab', handleNavTab);
    window.addEventListener('popstate', () => applyUrlTab());
    return () => {
      window.removeEventListener('hotel-nav-tab', handleNavTab);
    };
  }, []);

  // Core Data State
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [issuances, setIssuances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({
    totalItems: 0,
    totalValuation: 0,
    barStockValue: 0,
    kitchenStockValue: 0,
    operationalStockValue: 0,
    lowStockCount: 0,
    pendingPOsCount: 0,
    pendingGRNsCount: 0,
  });

  // Modal Control States
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [defaultCategoryForItem, setDefaultCategoryForItem] = useState<'BAR' | 'KITCHEN' | 'OPERATIONAL'>('KITCHEN');

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [defaultCategoryForPo, setDefaultCategoryForPo] = useState<'ALL' | 'BAR' | 'KITCHEN' | 'OPERATIONAL'>('ALL');

  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [preselectedPoIdForGrn, setPreselectedPoIdForGrn] = useState<string | undefined>(undefined);

  const [issuanceModalOpen, setIssuanceModalOpen] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any | null>(null);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [viewPoModalOpen, setViewPoModalOpen] = useState(false);
  const [selectedPoForView, setSelectedPoForView] = useState<any | null>(null);

  const [viewGrnModalOpen, setViewGrnModalOpen] = useState(false);
  const [selectedGrnForView, setSelectedGrnForView] = useState<any | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        itemsData,
        suppliersData,
        poData,
        grnData,
        issuanceData,
        movementsData,
        productsData,
        statsData,
      ] = await Promise.all([
        inventoryApi.getItems(),
        inventoryApi.getSuppliers(),
        inventoryApi.getPurchaseOrders(),
        inventoryApi.getGRNs(),
        inventoryApi.getIssuances(),
        inventoryApi.getMovements(),
        posApi.getProducts().catch(() => []),
        inventoryApi.getSummaryStats().catch(() => null),
      ]);

      setItems(itemsData || []);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(poData || []);
      setGrns(grnData || []);
      setIssuances(issuanceData || []);
      setMovements(movementsData || []);
      setProducts(productsData || []);

      if (statsData) {
        setSummaryStats(statsData);
      }
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      showNotification('error', err.message || 'Failed to load inventory datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal Open Handlers
  const handleOpenAddItem = (category?: 'BAR' | 'KITCHEN' | 'OPERATIONAL') => {
    setEditingItem(null);
    if (category) {
      setDefaultCategoryForItem(category);
    } else if (activeTab === 'BAR') {
      setDefaultCategoryForItem('BAR');
    } else if (activeTab === 'OPERATIONAL') {
      setDefaultCategoryForItem('OPERATIONAL');
    } else {
      setDefaultCategoryForItem('KITCHEN');
    }
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item: any) => {
    setEditingItem(item);
    setDefaultCategoryForItem(item.mainCategory || 'KITCHEN');
    setItemModalOpen(true);
  };

  const handleOpenAdjustItem = (item: any) => {
    setSelectedItemForAdjust(item);
    setAdjustModalOpen(true);
  };

  const handleOpenCreatePo = (category?: 'ALL' | 'BAR' | 'KITCHEN' | 'OPERATIONAL') => {
    if (category) {
      setDefaultCategoryForPo(category);
    } else if (activeTab === 'BAR') {
      setDefaultCategoryForPo('BAR');
    } else if (activeTab === 'KITCHEN') {
      setDefaultCategoryForPo('KITCHEN');
    } else if (activeTab === 'OPERATIONAL') {
      setDefaultCategoryForPo('OPERATIONAL');
    } else {
      setDefaultCategoryForPo('ALL');
    }
    setPoModalOpen(true);
  };

  const handleOpenCreateGrn = (poId?: string) => {
    setPreselectedPoIdForGrn(poId);
    setGrnModalOpen(true);
  };

  const handleOpenCreateIssuance = () => {
    setIssuanceModalOpen(true);
  };

  const handleViewPo = (po: any) => {
    setSelectedPoForView(po);
    setViewPoModalOpen(true);
  };

  const handleViewGrn = (grn: any) => {
    setSelectedGrnForView(grn);
    setViewGrnModalOpen(true);
  };

  // Actions
  const handleSaveItem = async (itemData: any) => {
    try {
      if (editingItem?.id) {
        await inventoryApi.updateItem(editingItem.id, itemData);
        showNotification('success', `Item "${itemData.name}" updated successfully.`);
      } else {
        await inventoryApi.createItem(itemData);
        showNotification('success', `Item "${itemData.name}" added to ${itemData.mainCategory} inventory.`);
      }
      setItemModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save item');
      throw err;
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate or remove this inventory item?')) {
      return;
    }
    try {
      await inventoryApi.deleteItem(id);
      showNotification('success', 'Inventory item deactivated successfully.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete item');
    }
  };

  const handleSavePo = async (poData: any) => {
    try {
      const res = await inventoryApi.createPurchaseOrder(poData);
      showNotification('success', `Purchase order created successfully with status ${res.status}.`);
      setPoModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create purchase order');
      throw err;
    }
  };

  const handleApprovePo = async (poId: string) => {
    try {
      await inventoryApi.approvePurchaseOrder(poId);
      showNotification(
        'success',
        'Purchase Order approved successfully. Note: Stock will only increase upon Goods Receipt Note (GRN) verification.',
      );
      setViewPoModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to approve purchase order');
    }
  };

  const handleCancelPo = async (poId: string) => {
    const reason = window.prompt('Please enter cancellation reason:', 'Order cancelled by management');
    if (reason === null) return;
    try {
      await inventoryApi.cancelPurchaseOrder(poId, reason);
      showNotification('success', 'Purchase Order cancelled.');
      setViewPoModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to cancel purchase order');
    }
  };

  const handleSaveGrn = async (grnData: any) => {
    try {
      const res = await inventoryApi.createGRN(grnData);
      showNotification(
        'success',
        `GRN "${res.grnNumber}" generated successfully! Inventory stocks have been atomically updated for accepted quantities.`,
      );
      setGrnModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to receive goods');
      throw err;
    }
  };

  const handleSaveIssuance = async (issuanceData: any) => {
    try {
      const res = await inventoryApi.createIssuance(issuanceData);
      showNotification(
        'success',
        `Issuance "${res.issuanceNumber}" completed. Operational stock has been deducted and issued to ${res.department}.`,
      );
      setIssuanceModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to issue operational stock');
      throw err;
    }
  };

  const handleSaveAdjustment = async (itemId: string, adjustData: any) => {
    try {
      await inventoryApi.adjustStock(itemId, adjustData);
      showNotification('success', 'Stock adjustment recorded in audit ledger.');
      setAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to adjust stock');
      throw err;
    }
  };

  const handleSaveSupplier = async (supplierData: any) => {
    try {
      await inventoryApi.createSupplier(supplierData);
      showNotification('success', `Supplier "${supplierData.name}" registered successfully.`);
      setSupplierModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to register supplier');
      throw err;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-xs">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Inventory & Procurement Management
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Multi-Category Stock Control (Bar, Kitchen, Operational), PO Approval, GRN Receiving & Department Issuances
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-xs flex items-center justify-center disabled:opacity-50"
              title="Refresh Inventory Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenAddItem()}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-teal-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>

            <button
              onClick={() => handleOpenCreatePo()}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-slate-900/20 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Create PO</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all shadow-md ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold">{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modern Tab Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-2 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('BAR')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'BAR'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Wine className="w-4 h-4" />
              <span>Bar Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('KITCHEN')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'KITCHEN'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Kitchen Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('OPERATIONAL')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'OPERATIONAL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Operational Supplies</span>
            </button>

            <button
              onClick={() => setActiveTab('PURCHASE_ORDERS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'PURCHASE_ORDERS'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Purchase Orders</span>
              {purchaseOrders.filter((p) => p.status === 'PENDING_APPROVAL').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-mono">
                  {purchaseOrders.filter((p) => p.status === 'PENDING_APPROVAL').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('GRN')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'GRN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Goods Receipt (GRN)</span>
            </button>

            <button
              onClick={() => setActiveTab('ISSUANCES')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'ISSUANCES'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Dept Issuances</span>
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Stock Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('RECIPES')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'RECIPES'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Recipe (BOM)</span>
            </button>

            <button
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'SUPPLIERS'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Suppliers</span>
            </button>

            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'REPORTS'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        {loading && items.length === 0 ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading inventory datasets...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'OVERVIEW' && (
              <InventoryOverviewTab
                stats={summaryStats}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenAddItem={() => handleOpenAddItem()}
                onOpenCreatePo={() => handleOpenCreatePo()}
                onOpenCreateGrn={() => handleOpenCreateGrn()}
                onOpenCreateIssuance={() => handleOpenCreateIssuance()}
                recentMovements={movements.slice(0, 8)}
              />
            )}

            {activeTab === 'BAR' && (
              <BarInventoryTab
                items={items}
                onOpenAddItem={() => handleOpenAddItem('BAR')}
                onEditItem={handleOpenEditItem}
                onAdjustItem={handleOpenAdjustItem}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeTab === 'KITCHEN' && (
              <KitchenInventoryTab
                items={items}
                onOpenAddItem={() => handleOpenAddItem('KITCHEN')}
                onEditItem={handleOpenEditItem}
                onAdjustItem={handleOpenAdjustItem}
                onDeleteItem={handleDeleteItem}
                onOpenCreatePo={() => handleOpenCreatePo('KITCHEN')}
              />
            )}

            {activeTab === 'OPERATIONAL' && (
              <OperationalInventoryTab
                items={items}
                onOpenAddItem={() => handleOpenAddItem('OPERATIONAL')}
                onEditItem={handleOpenEditItem}
                onAdjustItem={handleOpenAdjustItem}
                onDeleteItem={handleDeleteItem}
                onOpenCreateIssuance={handleOpenCreateIssuance}
              />
            )}

            {activeTab === 'PURCHASE_ORDERS' && (
              <PurchaseOrdersTab
                purchaseOrders={purchaseOrders}
                suppliers={suppliers}
                onOpenCreatePo={() => handleOpenCreatePo()}
                onViewPo={handleViewPo}
                onApprovePo={handleApprovePo}
                onCancelPo={handleCancelPo}
                onOpenGrnModal={handleOpenCreateGrn}
              />
            )}

            {activeTab === 'GRN' && (
              <GoodsReceivedNotesTab
                grns={grns}
                suppliers={suppliers}
                onOpenCreateGrn={() => handleOpenCreateGrn()}
                onViewGrn={handleViewGrn}
                onViewPo={(po) => handleViewPo(po)}
              />
            )}

            {activeTab === 'ISSUANCES' && (
              <OperationalIssuanceTab
                issuances={issuances}
                onOpenCreateIssuance={handleOpenCreateIssuance}
              />
            )}

            {activeTab === 'MOVEMENTS' && <StockMovementsTab movements={movements} />}

            {activeTab === 'RECIPES' && (
              <RecipeBomTab items={items} products={products} onNotify={showNotification} />
            )}

            {activeTab === 'SUPPLIERS' && (
              <SuppliersTab suppliers={suppliers} onOpenAddSupplier={() => setSupplierModalOpen(true)} />
            )}

            {activeTab === 'REPORTS' && <InventoryReportsTab />}
          </div>
        )}

        {/* Global Modals */}
        <ItemModal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
          item={editingItem}
          suppliers={suppliers}
          defaultCategory={defaultCategoryForItem}
        />

        <PurchaseOrderModal
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          onSave={handleSavePo}
          suppliers={suppliers}
          inventoryItems={items}
          defaultCategory={defaultCategoryForPo}
        />

        <GoodsReceivedNoteModal
          isOpen={grnModalOpen}
          onClose={() => setGrnModalOpen(false)}
          onSave={handleSaveGrn}
          purchaseOrders={purchaseOrders}
          preselectedPoId={preselectedPoIdForGrn}
        />

        <OperationalIssuanceModal
          isOpen={issuanceModalOpen}
          onClose={() => setIssuanceModalOpen(false)}
          onSave={handleSaveIssuance}
          inventoryItems={items}
        />

        <StockAdjustmentModal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          onSave={handleSaveAdjustment}
          item={selectedItemForAdjust}
        />

        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onSave={handleSaveSupplier}
        />

        <ViewPoModal
          isOpen={viewPoModalOpen}
          onClose={() => setViewPoModalOpen(false)}
          po={selectedPoForView}
          onApprove={handleApprovePo}
          onCancelPo={handleCancelPo}
          onOpenGrnModal={handleOpenCreateGrn}
        />

        <ViewGrnModal
          isOpen={viewGrnModalOpen}
          onClose={() => setViewGrnModalOpen(false)}
          grn={selectedGrnForView}
        />
      </div>
    </DashboardLayout>
  );
}
