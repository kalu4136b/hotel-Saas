'use client';

// Bar & Beverage Operations UI
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { barApi, authStorage } from '@/lib/api';
import {
  Wine,
  GlassWater,
  Flame,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Droplets,
  PackagePlus,
  TrendingUp,
  SlidersHorizontal,
  DollarSign,
  Layers,
  Sparkles,
  BarChart3,
  Clock,
  History,
  Trash2,
  Beer,
  Tag,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  Pencil,
  ClipboardCheck,
} from 'lucide-react';
import BarStockReportsTab from './components/BarStockReportsTab';
import BarAdjustmentsTab from './components/BarAdjustmentsTab';
import BarLedgerTab from './components/BarLedgerTab';

export interface BarItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  bottleSizeMl: number;
  fullBottlesStock: number;
  currentBottleRemainingMl: number;
  totalRemainingMl: number;
  totalLiters: number;
  estimatedTotalShots: number;
  standardPourMl: number;
  costPerBottle: number;
  pricePerPour: number;
  pricePerBottle: number;
  parLevelBottles: number;
  isLowStock: boolean;
  isActive: boolean;
}

interface PourLog {
  id: string;
  barItemName: string;
  category: string;
  pourType: 'SALE' | 'COMPLIMENTARY' | 'WASTAGE' | 'TASTING';
  millilitersPoured: number;
  servingsCount: number;
  unitPrice: number;
  totalSaleAmount: number;
  costAmount: number;
  bartenderName?: string;
  notes?: string;
  createdAt: string;
}

const CATEGORIES = [
  'ALL',
  'WHISKEY',
  'VODKA',
  'GIN',
  'RUM',
  'TEQUILA',
  'BRANDY',
  'WINE',
  'BEER',
  'LIQUEUR',
  'COCKTAIL',
  'MIXER',
  'OTHER',
];

const STARTER_BAR_ITEMS = [
  {
    name: 'Macallan 12 Double Cask',
    category: 'WHISKEY',
    brand: 'The Macallan',
    bottleSizeMl: 750,
    fullBottlesStock: 4,
    currentBottleRemainingMl: 520,
    standardPourMl: 30,
    costPerBottle: 58.0,
    pricePerPour: 16.0,
    pricePerBottle: 220.0,
    parLevelBottles: 2,
  },
  {
    name: 'Grey Goose Premium Vodka',
    category: 'VODKA',
    brand: 'Grey Goose',
    bottleSizeMl: 1000,
    fullBottlesStock: 5,
    currentBottleRemainingMl: 650,
    standardPourMl: 30,
    costPerBottle: 32.0,
    pricePerPour: 12.0,
    pricePerBottle: 160.0,
    parLevelBottles: 3,
  },
  {
    name: "Hendrick's Gin",
    category: 'GIN',
    brand: "Hendrick's",
    bottleSizeMl: 750,
    fullBottlesStock: 3,
    currentBottleRemainingMl: 340,
    standardPourMl: 30,
    costPerBottle: 35.0,
    pricePerPour: 13.0,
    pricePerBottle: 175.0,
    parLevelBottles: 2,
  },
  {
    name: 'Don Julio Reposado Tequila',
    category: 'TEQUILA',
    brand: 'Don Julio',
    bottleSizeMl: 750,
    fullBottlesStock: 2,
    currentBottleRemainingMl: 180,
    standardPourMl: 30,
    costPerBottle: 48.0,
    pricePerPour: 15.0,
    pricePerBottle: 195.0,
    parLevelBottles: 2,
  },
  {
    name: 'Ron Zacapa 23 Centenario Rum',
    category: 'RUM',
    brand: 'Ron Zacapa',
    bottleSizeMl: 750,
    fullBottlesStock: 3,
    currentBottleRemainingMl: 480,
    standardPourMl: 30,
    costPerBottle: 45.0,
    pricePerPour: 14.0,
    pricePerBottle: 180.0,
    parLevelBottles: 2,
  },
  {
    name: 'Veuve Clicquot Brut Champagne',
    category: 'WINE',
    brand: 'Veuve Clicquot',
    bottleSizeMl: 750,
    fullBottlesStock: 8,
    currentBottleRemainingMl: 750,
    standardPourMl: 150,
    costPerBottle: 52.0,
    pricePerPour: 22.0,
    pricePerBottle: 140.0,
    parLevelBottles: 4,
  },
];

export default function BarPage() {
  const [activeTab, setActiveTab] = useState<
    'RACK' | 'POURS' | 'STOCK_REPORTS' | 'ADJUSTMENTS' | 'LEDGER' | 'ANALYTICS'
  >('RACK');

  useEffect(() => {
    const applyUrlTab = (searchStr?: string) => {
      const params = new URLSearchParams(searchStr ?? window.location.search);
      const tab = params.get('tab')?.toUpperCase() as any;
      const validTabs = ['RACK', 'POURS', 'STOCK_REPORTS', 'ADJUSTMENTS', 'LEDGER', 'ANALYTICS'];
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
  const [items, setItems] = useState<BarItem[]>([]);
  const [logs, setLogs] = useState<PourLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [newBottleModalOpen, setNewBottleModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Bottle Modal
  const [editModalItem, setEditModalItem] = useState<BarItem | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pourModalItem, setPourModalItem] = useState<BarItem | null>(null);
  const [pourVolume, setPourVolume] = useState<number>(30);
  const [pourType, setPourType] = useState<'SALE' | 'COMPLIMENTARY' | 'TASTING'>('SALE');
  const [servingsCount, setServingsCount] = useState<number>(1);
  const [pourNotes, setPourNotes] = useState('');
  const [submittingPour, setSubmittingPour] = useState(false);

  // Wastage / Spillage Modal
  const [wastageModalItem, setWastageModalItem] = useState<BarItem | null>(null);
  const [wastageMl, setWastageMl] = useState<number>(60);
  const [wastageReason, setWastageReason] = useState('Spilled on speed rail during rush');
  const [submittingWastage, setSubmittingWastage] = useState(false);

  // Restock Modal
  const [restockModalItem, setRestockModalItem] = useState<BarItem | null>(null);
  const [restockBottlesCount, setRestockBottlesCount] = useState<number>(6);
  const [restockCost, setRestockCost] = useState<string>('');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // New Item Form
  const defaultNewItemState = {
    name: '',
    category: 'WHISKEY',
    brand: '',
    bottleSizeMl: 750,
    fullBottlesStock: 3,
    currentBottleRemainingMl: 750,
    standardPourMl: 30,
    costPerBottle: 30.0,
    pricePerPour: 12.0,
    pricePerBottle: 150.0,
    parLevelBottles: 2,
  };
  const [newItem, setNewItem] = useState(defaultNewItemState);
  const [creatingItem, setCreatingItem] = useState(false);
  const [seedingRail, setSeedingRail] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [selectedCategory, showLowStockOnly]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [itemsData, logsData, analyticsData] = await Promise.all([
        barApi.getItems({
          category: selectedCategory,
          lowStock: showLowStockOnly,
        }),
        barApi.getLogs({ limit: 50 }),
        barApi.getAnalytics(),
      ]);
      setItems(itemsData);
      setLogs(logsData.logs || logsData || []);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Error loading bar telemetry: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  // Overall Inventory Stats
  const rackStats = useMemo(() => {
    const totalBottles = items.reduce((acc, i) => acc + (Number(i.fullBottlesStock) || 0), 0);
    const totalLiters = items.reduce((acc, i) => acc + (Number(i.totalLiters) || 0), 0);
    const totalShots = items.reduce((acc, i) => acc + (Number(i.estimatedTotalShots) || 0), 0);
    const lowStockCount = items.filter((i) => i.isLowStock).length;
    return { totalBottles, totalLiters: Math.round(totalLiters * 10) / 10, totalShots, lowStockCount };
  }, [items]);

  // Handle Quick Pour Execution
  const handleExecutePour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pourModalItem) return;
    setSubmittingPour(true);
    try {
      const currentUser = authStorage.getUser();
      await barApi.quickPour({
        barItemId: pourModalItem.id,
        millilitersPoured: Number(pourVolume) * Number(servingsCount),
        servingsCount: Number(servingsCount),
        pourType,
        bartenderName: currentUser?.fullName || currentUser?.username || 'Bartender',
        notes: pourNotes || undefined,
      });

      setFeedback({
        type: 'success',
        text: `Poured ${pourVolume * servingsCount}ml of ${pourModalItem.name} logged successfully!`,
      });
      setPourModalItem(null);
      setPourNotes('');
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to execute pour: ' + err.message);
    } finally {
      setSubmittingPour(false);
    }
  };

  // Handle Open New Bottle
  const handleOpenBottle = async (item: BarItem) => {
    if (item.fullBottlesStock <= 0) {
      alert(`No sealed bottles of ${item.name} in stock to unseal. Please restock first.`);
      return;
    }
    if (
      !confirm(
        `Unseal 1 fresh ${item.bottleSizeMl}ml bottle of ${item.name}? This will add ${item.bottleSizeMl}ml to the open bottle and decrement sealed stock by 1.`,
      )
    )
      return;

    try {
      await barApi.openBottle(item.id);
      setFeedback({ type: 'success', text: `Unsealed fresh bottle of ${item.name}.` });
      await loadAllData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to unseal bottle: ' + err.message);
    }
  };

  // Handle Spillage / Wastage
  const handleExecuteWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageModalItem) return;
    setSubmittingWastage(true);
    try {
      const currentUser = authStorage.getUser();
      await barApi.logWastage({
        barItemId: wastageModalItem.id,
        millilitersWasted: Number(wastageMl),
        bartenderName: currentUser?.fullName || currentUser?.username || 'Bartender',
        reason: wastageReason,
      });
      setFeedback({
        type: 'success',
        text: `Recorded ${wastageMl}ml wastage for ${wastageModalItem.name}.`,
      });
      setWastageModalItem(null);
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to log wastage: ' + err.message);
    } finally {
      setSubmittingWastage(false);
    }
  };

  // Handle Restock
  const handleExecuteRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    setSubmittingRestock(true);
    try {
      await barApi.restockBottles(restockModalItem.id, {
        bottlesCount: Number(restockBottlesCount),
        costPerBottle: restockCost ? Number(restockCost) : undefined,
      });
      setFeedback({
        type: 'success',
        text: `Restocked +${restockBottlesCount} bottles of ${restockModalItem.name}.`,
      });
      setRestockModalItem(null);
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to restock: ' + err.message);
    } finally {
      setSubmittingRestock(false);
    }
  };

  // Create New Bar Item
  const handleCreateBarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      setCreateError('Liquor name is required');
      return;
    }
    setCreatingItem(true);
    setCreateError(null);
    try {
      const payload = {
        name: newItem.name.trim(),
        category: newItem.category,
        brand: newItem.brand?.trim() || undefined,
        bottleSizeMl: Number(newItem.bottleSizeMl) || 750,
        fullBottlesStock: Number(newItem.fullBottlesStock) || 0,
        currentBottleRemainingMl: Math.min(
          Number(newItem.currentBottleRemainingMl) || 0,
          Number(newItem.bottleSizeMl) || 750,
        ),
        standardPourMl: Number(newItem.standardPourMl) || 30,
        costPerBottle: Number(newItem.costPerBottle) || 0,
        pricePerPour: Number(newItem.pricePerPour) || 0,
        pricePerBottle: Number(newItem.pricePerBottle) || 0,
        parLevelBottles: Number(newItem.parLevelBottles) || 2,
      };

      await barApi.createItem(payload);
      setFeedback({ type: 'success', text: `Added "${payload.name}" to bar speed rail!` });
      setNewBottleModalOpen(false);
      setNewItem(defaultNewItemState);
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create item');
    } finally {
      setCreatingItem(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: BarItem) => {
    setEditModalItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      bottleSizeMl: item.bottleSizeMl || 750,
      fullBottlesStock: item.fullBottlesStock ?? 0,
      currentBottleRemainingMl: item.currentBottleRemainingMl ?? 0,
      standardPourMl: item.standardPourMl || 30,
      costPerBottle: item.costPerBottle ?? 0,
      pricePerPour: item.pricePerPour ?? 0,
      pricePerBottle: item.pricePerBottle ?? 0,
      parLevelBottles: item.parLevelBottles || 2,
    });
    setEditError(null);
  };

  // Update Bar Item
  const handleUpdateBarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem || !editForm) return;
    if (!editForm.name.trim()) {
      setEditError('Liquor name is required');
      return;
    }
    setSubmittingEdit(true);
    setEditError(null);
    try {
      await barApi.updateItem(editModalItem.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        brand: editForm.brand?.trim() || undefined,
        bottleSizeMl: Number(editForm.bottleSizeMl) || 750,
        fullBottlesStock: Number(editForm.fullBottlesStock) || 0,
        currentBottleRemainingMl: Math.min(
          Number(editForm.currentBottleRemainingMl) || 0,
          Number(editForm.bottleSizeMl) || 750,
        ),
        standardPourMl: Number(editForm.standardPourMl) || 30,
        costPerBottle: Number(editForm.costPerBottle) || 0,
        pricePerPour: Number(editForm.pricePerPour) || 0,
        pricePerBottle: Number(editForm.pricePerBottle) || 0,
        parLevelBottles: Number(editForm.parLevelBottles) || 2,
      });

      setFeedback({ type: 'success', text: `Updated "${editForm.name}" details successfully.` });
      setEditModalItem(null);
      setEditForm(null);
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update item');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete Bar Item
  const handleDeleteItem = async (item: BarItem) => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from your active bar inventory?`)) {
      return;
    }
    try {
      await barApi.deleteItem(item.id);
      setFeedback({ type: 'success', text: `Removed "${item.name}" from bar inventory.` });
      await loadAllData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to remove item: ' + err.message);
    }
  };

  // One-click Seed Starter Speed Rail
  const handleSeedSpeedRail = async () => {
    setSeedingRail(true);
    try {
      for (const item of STARTER_BAR_ITEMS) {
        await barApi.createItem(item);
      }
      setFeedback({
        type: 'success',
        text: 'Standard Hotel Bar Speed Rail seeded with 6 premium liquors!',
      });
      await loadAllData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert('Failed to seed speed rail: ' + err.message);
    } finally {
      setSeedingRail(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] uppercase tracking-wider">
              Lounge & F&B Operations
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              Live Milliliter Precision Tracking
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Wine className="w-6 h-6 text-[#D97706]" />
            Bar, Spirits & Beverage Rail
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor real-time bottle fluid levels, record shot pours in milliliters, track bar spillage, and restock warehouse crates.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            title="Refresh Bar Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setNewBottleModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Liquor</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= TELEMETRY STAT CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        {/* Total Stock */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Sealed Bottles</span>
            <Layers className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{rackStats.totalBottles}</div>
          <div className="text-[10px] text-[#64748B] mt-1">{items.length} unique labels stocked</div>
        </div>

        {/* Total Fluid Liters */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Total Fluid Volume</span>
            <Droplets className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#1D4ED8]">{rackStats.totalLiters} L</div>
          <div className="text-[10px] text-[#64748B] mt-1">~{rackStats.totalShots} total pours ready</div>
        </div>

        {/* Total Liquor Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#059669]">Recorded Pour Sales</span>
            <DollarSign className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#047857]">
            Rs. {analytics?.summary?.totalSales ? Number(analytics.summary.totalSales).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-[#065F46] mt-1">
            {analytics?.summary?.totalServings || 0} drinks served
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            showLowStockOnly
              ? 'bg-[#FFFBEB] border-[#FDE68A] ring-2 ring-[#F59E0B]'
              : 'bg-white border-[#E2E8F0] hover:border-[#FDE68A]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#D97706] flex items-center gap-1">
              {rackStats.lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              )}
              Low Stock Warnings
            </span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#B45309]">{rackStats.lowStockCount}</div>
          <div className="text-[10px] text-[#92400E] mt-1">Below par level reorder</div>
        </div>
      </div>

      {/* ================= TAB NAVIGATION ================= */}
      <div className="flex border-b border-[#E2E8F0] gap-2 mb-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('RACK')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'RACK'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Wine className="w-4 h-4" />
          <span>Bottle Rack & Speed Rail</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('POURS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'POURS'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Pour History ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STOCK_REPORTS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'STOCK_REPORTS'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Stock Valuation & Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ADJUSTMENTS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'ADJUSTMENTS'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Adjustments & Audit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'LEDGER'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Unified Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANALYTICS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'ANALYTICS'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </div>

      {/* ================= TAB 1: BOTTLE RACK ================= */}
      {activeTab === 'RACK' && (
        <div className="space-y-6">
          {/* Category & Search Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#D97706] text-white shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brand or liquor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-[#D97706] w-48 sm:w-56 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Empty State with Quick Seed button */}
          {loading ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0]">
              <RefreshCw className="w-8 h-8 text-[#D97706] animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#0F172A]">Loading bar speed rail...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-xs max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
                <Wine className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                No Liquors Found in Speed Rail
              </h3>
              <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
                Your hotel bar inventory has no bottles configured in this category yet. You can initialize the standard hotel speed rail or add your first custom bottle.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={seedingRail}
                  onClick={handleSeedSpeedRail}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{seedingRail ? 'Stocking Speed Rail...' : 'Stock Standard Hotel Speed Rail'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBottleModalOpen(true)}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] transition"
                >
                  Add Custom Bottle
                </button>
              </div>
            </div>
          ) : (
            /* ================= BOTTLE CARDS GRID ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const bottlePercent = Math.min(
                  100,
                  Math.round(
                    ((Number(item.currentBottleRemainingMl) || 0) / (Number(item.bottleSizeMl) || 750)) *
                      100,
                  ),
                );

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      item.isLowStock
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {/* Top Amber Accent Stripe */}
                    <div
                      className={`h-1.5 w-full ${
                        item.isLowStock ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-500 to-amber-700'
                      }`}
                    />

                    <div className="p-4 space-y-3">
                      {/* Name & Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <h3 className="text-base font-bold text-[#0F172A] mt-1 leading-snug">
                            {item.name}
                          </h3>
                          {item.brand && (
                            <p className="text-[11px] text-[#64748B]">{item.brand}</p>
                          )}
                        </div>

                        {/* Low stock badge & quick actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.isLowStock && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              LOW STOCK
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
                            title="Edit Bottle Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove Bottle from Bar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Visual Liquid Gauge */}
                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Droplets className="w-3.5 h-3.5 text-blue-500" />
                            Open Bottle
                          </span>
                          <span className="font-mono text-[#0F172A]">
                            {item.currentBottleRemainingMl} / {item.bottleSizeMl} ml ({bottlePercent}%)
                          </span>
                        </div>

                        {/* Progress Gauge */}
                        <div className="w-full h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            style={{ width: `${bottlePercent}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              bottlePercent < 20
                                ? 'bg-rose-500'
                                : bottlePercent < 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
                          <span>
                            Sealed Stock:{' '}
                            <strong className="text-[#0F172A]">{item.fullBottlesStock}</strong> bottles
                          </span>
                          <span>
                            Par Level: <strong className="text-[#0F172A]">{item.parLevelBottles}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Pricing & Shot Estimates */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                          <div className="text-[10px] text-[#64748B]">Price / Shot ({item.standardPourMl}ml)</div>
                          <div className="font-bold text-[#059669] mono">
                            Rs. {Number(item.pricePerPour).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                          <div className="text-[10px] text-[#64748B]">Total Est. Shots</div>
                          <div className="font-bold text-[#0F172A] mono">
                            {item.estimatedTotalShots} pours
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-[#F8FAFC] border-t border-[#F1F5F9] space-y-2">
                      {/* Primary Quick Pour Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setPourModalItem(item);
                          setPourVolume(item.standardPourMl || 30);
                          setServingsCount(1);
                          setPourType('SALE');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <GlassWater className="w-3.5 h-3.5" />
                        <span>Quick Pour Shot</span>
                      </button>

                      {/* Secondary Operations */}
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        {/* Open Fresh Bottle */}
                        <button
                          type="button"
                          onClick={() => handleOpenBottle(item)}
                          disabled={item.fullBottlesStock <= 0}
                          className="py-1.5 px-2 rounded-lg border border-[#E2E8F0] hover:bg-white text-[10.5px] font-semibold text-[#475569] flex items-center justify-center gap-1 transition disabled:opacity-40"
                          title="Unseal next bottle"
                        >
                          <PackagePlus className="w-3 h-3 text-[#64748B]" />
                          <span>Unseal</span>
                        </button>

                        {/* Restock Bottles */}
                        <button
                          type="button"
                          onClick={() => {
                            setRestockModalItem(item);
                            setRestockBottlesCount(6);
                            setRestockCost(String(item.costPerBottle || ''));
                          }}
                          className="py-1.5 px-2 rounded-lg border border-[#E2E8F0] hover:bg-white text-[10.5px] font-semibold text-[#475569] flex items-center justify-center gap-1 transition"
                          title="Restock crates of bottles"
                        >
                          <Plus className="w-3 h-3 text-[#059669]" />
                          <span>Restock</span>
                        </button>

                        {/* Spillage / Wastage */}
                        <button
                          type="button"
                          onClick={() => {
                            setWastageModalItem(item);
                            setWastageMl(item.standardPourMl || 60);
                          }}
                          className="py-1.5 px-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[10.5px] font-semibold text-rose-700 flex items-center justify-center gap-1 transition"
                          title="Log spilled liquor"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Wastage</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: POUR & SPILLAGE LOGS ================= */}
      {activeTab === 'POURS' && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <History className="w-4 h-4 text-[#D97706]" />
                Audit Trail of Liquor Pours & Spillage
              </h2>
              <p className="text-xs text-[#64748B]">Real-time bartender register logs and bottle deductions.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Beverage</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Volume Poured</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Bartender</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                      No pour transactions recorded yet. Pours executed on the speed rail will appear here in real-time.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        <div className="text-[10px] text-[#94A3B8]">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-[#0F172A]">
                        {log.barItemName}
                        <div className="text-[10px] text-[#64748B] font-normal">{log.category}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.pourType === 'SALE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.pourType === 'WASTAGE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.pourType}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                        {log.millilitersPoured} ml
                        <span className="text-[10px] text-[#64748B] font-normal ml-1">
                          ({log.servingsCount || 1} serv)
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-[#059669]">
                        Rs. {Number(log.totalSaleAmount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-[#475569] font-medium">
                        {log.bartenderName || 'Bartender'}
                      </td>

                      <td className="py-3 px-4 text-[#64748B] italic max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CONSUMPTION ANALYTICS ================= */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Consumed Spirits */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00C48C]" />
                Top Selling Liquors & Cocktails
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Ranked by poured volume in milliliters.</p>

              {(!analytics.topBeverages || analytics.topBeverages.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#94A3B8]">
                  No pour history available yet to compute rankings.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.topBeverages.slice(0, 6).map((item: any, idx: number) => (
                    <div key={item.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[#0F172A]">{item.name}</div>
                          <div className="text-[10px] text-[#64748B]">{item.category}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-[#0F172A]">
                          {item.volumeMl} ml poured
                        </div>
                        <div className="text-[10px] font-bold text-[#059669]">
                          Rs. {Number(item.sales || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} sales
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Distribution */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D97706]" />
                Sales & Volume by Spirit Family
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Revenue share across bar categories.</p>

              {(!analytics.categoryBreakdown || analytics.categoryBreakdown.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#94A3B8]">
                  No category data recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.categoryBreakdown.map((cat: any) => (
                    <div key={cat.category} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">{cat.category}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">{cat.volumeMl} ml total</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-[#059669] font-mono">
                          Rs. {Number(cat.sales || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-[#64748B]">{cat.servings || 0} drinks</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: STOCK VALUATION & REPORTS ================= */}
      {activeTab === 'STOCK_REPORTS' && (
        <BarStockReportsTab categories={CATEGORIES} />
      )}

      {/* ================= TAB 5: ADJUSTMENTS & AUDIT ================= */}
      {activeTab === 'ADJUSTMENTS' && (
        <BarAdjustmentsTab
          items={items}
          onReloadAll={loadAllData}
          onShowFeedback={(type, text) => {
            setFeedback({ type, text });
            setTimeout(() => setFeedback(null), 4000);
          }}
        />
      )}

      {/* ================= TAB 6: UNIFIED LEDGER ================= */}
      {activeTab === 'LEDGER' && (
        <BarLedgerTab items={items} />
      )}

      {/* ================= MODAL: QUICK POUR SHOT ================= */}
      {pourModalItem && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                  <GlassWater className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Pour {pourModalItem.name}</h3>
                  <p className="text-xs text-[#64748B]">
                    Bottle level: {pourModalItem.currentBottleRemainingMl} ml remaining
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPourModalItem(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePour} className="space-y-4">
              {/* Shot Preset Buttons */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Select Pour Volume
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Single Shot', ml: pourModalItem.standardPourMl || 30 },
                    { label: 'Double', ml: (pourModalItem.standardPourMl || 30) * 2 },
                    { label: 'Cocktail (45ml)', ml: 45 },
                    { label: 'Glass (150ml)', ml: 150 },
                  ].map((preset) => (
                    <button
                      key={preset.ml}
                      type="button"
                      onClick={() => setPourVolume(preset.ml)}
                      className={`p-2 rounded-xl border text-center transition ${
                        pourVolume === preset.ml
                          ? 'border-[#D97706] bg-amber-50 text-amber-900 font-bold'
                          : 'border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B]'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.ml} ml</div>
                      <div className="text-[9.5px] opacity-75">{preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Servings Count & Custom ML */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Custom ML Volume
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={pourVolume}
                    onChange={(e) => setPourVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Number of Drinks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={servingsCount}
                    onChange={(e) => setServingsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>
              </div>

              {/* Pour Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Pour Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SALE', 'COMPLIMENTARY', 'TASTING'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPourType(t)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        pourType === t
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Bartender Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table 4 Old Fashioned, On the rocks..."
                  value={pourNotes}
                  onChange={(e) => setPourNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPourModalItem(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPour}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <GlassWater className="w-4 h-4" />
                  <span>{submittingPour ? 'Pouring...' : `Confirm ${pourVolume * servingsCount}ml Pour`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD WASTAGE / SPILLAGE ================= */}
      {wastageModalItem && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Log Spillage / Wastage</h3>
                  <p className="text-xs text-[#64748B]">{wastageModalItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setWastageModalItem(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteWastage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Milliliters Spilled / Wasted
                </label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  required
                  value={wastageMl}
                  onChange={(e) => setWastageMl(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Reason for Spillage
                </label>
                <select
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
                >
                  <option value="Spilled on speed rail during rush">Spilled on speed rail during rush</option>
                  <option value="Customer knocked over cocktail glass">Customer knocked over cocktail glass</option>
                  <option value="Bottle shattered behind bar">Bottle shattered behind bar</option>
                  <option value="Corked / oxidized wine bottle">Corked / oxidized wine bottle</option>
                  <option value="New staff cocktail training">New staff cocktail training</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWastageModalItem(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWastage}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {submittingWastage ? 'Logging...' : 'Confirm Wastage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTOCK BOTTLES ================= */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Restock {restockModalItem.name}
                  </h3>
                  <p className="text-xs text-[#64748B]">Add sealed bottles from central storeroom</p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalItem(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Number of Full Bottles Received
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockBottlesCount}
                  onChange={(e) => setRestockBottlesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Cost per Bottle (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Optional cost update"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {submittingRestock ? 'Updating...' : `Add +${restockBottlesCount} Bottles`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW LIQUOR ================= */}
      {newBottleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00C48C] font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Add Liquor / Beverage</h3>
                  <p className="text-xs text-[#64748B]">Register new bottle in lounge speed rail</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewBottleModalOpen(false);
                  setCreateError(null);
                }}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateError(null)}
                  className="text-rose-500 hover:text-rose-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleCreateBarItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Liquor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Glenfiddich 15"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none focus:bg-white focus:border-[#00C48C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Brand / Distillery</label>
                  <input
                    type="text"
                    placeholder="e.g. Glenfiddich"
                    value={newItem.brand}
                    onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-[#00C48C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Bottle Size</label>
                  <select
                    value={newItem.bottleSizeMl}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setNewItem((prev) => ({
                        ...prev,
                        bottleSizeMl: newSize,
                        currentBottleRemainingMl:
                          prev.currentBottleRemainingMl === prev.bottleSizeMl ||
                          prev.currentBottleRemainingMl > newSize
                            ? newSize
                            : prev.currentBottleRemainingMl,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
                  >
                    <option value={750}>750 ml (Standard Liquor)</option>
                    <option value={1000}>1000 ml (1 Liter Speed Rail)</option>
                    <option value={700}>700 ml (European Std)</option>
                    <option value={500}>500 ml (Medium Bottle)</option>
                    <option value={375}>375 ml (Split / Half Bottle)</option>
                    <option value={330}>330 ml (Beer / Cider)</option>
                    <option value={50}>50 ml (Minibar Miniature)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Sealed Bottles</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.fullBottlesStock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, fullBottlesStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">In storeroom</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Open Bottle (ml)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={newItem.bottleSizeMl}
                    value={newItem.currentBottleRemainingMl}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        currentBottleRemainingMl: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Max {newItem.bottleSizeMl}ml</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Par Level</label>
                  <input
                    type="number"
                    min={1}
                    value={newItem.parLevelBottles}
                    onChange={(e) =>
                      setNewItem({ ...newItem, parLevelBottles: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Low stock alert</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Cost / Bottle (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newItem.costPerBottle}
                    onChange={(e) =>
                      setNewItem({ ...newItem, costPerBottle: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Price / Shot (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newItem.pricePerPour}
                    onChange={(e) =>
                      setNewItem({ ...newItem, pricePerPour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#059669] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Price / Bottle (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newItem.pricePerBottle}
                    onChange={(e) =>
                      setNewItem({ ...newItem, pricePerBottle: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Shot Size (ml)</label>
                  <input
                    type="number"
                    min={10}
                    max={250}
                    value={newItem.standardPourMl}
                    onChange={(e) =>
                      setNewItem({ ...newItem, standardPourMl: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewBottleModalOpen(false);
                    setCreateError(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingItem}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  {creatingItem ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save to Speed Rail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT LIQUOR ITEM ================= */}
      {editModalItem && editForm && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706] font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Edit {editModalItem.name}</h3>
                  <p className="text-xs text-[#64748B]">Update liquor pricing, stock and specs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalItem(null);
                  setEditForm(null);
                  setEditError(null);
                }}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditError(null)}
                  className="text-rose-500 hover:text-rose-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateBarItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Liquor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none focus:bg-white focus:border-[#D97706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Brand / Distillery</label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-[#D97706]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Bottle Size</label>
                  <select
                    value={editForm.bottleSizeMl}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setEditForm((prev: any) => ({
                        ...prev,
                        bottleSizeMl: newSize,
                        currentBottleRemainingMl:
                          prev.currentBottleRemainingMl === prev.bottleSizeMl ||
                          prev.currentBottleRemainingMl > newSize
                            ? newSize
                            : prev.currentBottleRemainingMl,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
                  >
                    <option value={750}>750 ml (Standard Liquor)</option>
                    <option value={1000}>1000 ml (1 Liter Speed Rail)</option>
                    <option value={700}>700 ml (European Std)</option>
                    <option value={500}>500 ml (Medium Bottle)</option>
                    <option value={375}>375 ml (Split / Half Bottle)</option>
                    <option value={330}>330 ml (Beer / Cider)</option>
                    <option value={50}>50 ml (Minibar Miniature)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Sealed Bottles</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.fullBottlesStock}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullBottlesStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">In storeroom</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Open Bottle (ml)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editForm.bottleSizeMl}
                    value={editForm.currentBottleRemainingMl}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        currentBottleRemainingMl: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Max {editForm.bottleSizeMl}ml</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Par Level</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.parLevelBottles}
                    onChange={(e) =>
                      setEditForm({ ...editForm, parLevelBottles: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Low stock alert</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Cost / Bottle (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.costPerBottle}
                    onChange={(e) =>
                      setEditForm({ ...editForm, costPerBottle: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Price / Shot (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.pricePerPour}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pricePerPour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#059669] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Price / Bottle (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.pricePerBottle}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pricePerBottle: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Shot Size (ml)</label>
                  <input
                    type="number"
                    min={10}
                    max={250}
                    value={editForm.standardPourMl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, standardPourMl: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalItem(null);
                    setEditForm(null);
                    setEditError(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  {submittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Bottle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
