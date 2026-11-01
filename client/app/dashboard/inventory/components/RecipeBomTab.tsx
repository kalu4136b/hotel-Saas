'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  DollarSign,
  UtensilsCrossed,
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';

interface RecipeBomTabProps {
  items: any[];
  products: any[];
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export default function RecipeBomTab({ items, products, onNotify }: RecipeBomTabProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products]);

  useEffect(() => {
    if (!selectedProductId) return;
    loadRecipe(selectedProductId);
  }, [selectedProductId]);

  const loadRecipe = async (prodId: string) => {
    setLoadingRecipe(true);
    try {
      const data = await inventoryApi.getRecipe(prodId);
      setRecipeItems(
        (data || []).map((r: any) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: Number(r.quantityRequired),
          inventoryItem: r.inventoryItem,
        })),
      );
    } catch (err: any) {
      console.error('Failed to load recipe:', err);
      onNotify('error', err.message || 'Failed to load recipe BOM');
    } finally {
      setLoadingRecipe(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const calculatedFoodCost = recipeItems.reduce((acc, row) => {
    const matchedItem = items.find((i) => i.id === row.inventoryItemId) || row.inventoryItem;
    const cost = Number(matchedItem?.costPerUnit || 0);
    return acc + cost * Number(row.quantityRequired || 0);
  }, 0);

  const sellingPrice = Number(selectedProduct?.price || 0);
  const grossProfit = sellingPrice - calculatedFoodCost;
  const marginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;

  const handleAddIngredient = () => {
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

  const handleUpdateRow = (index: number, field: string, value: any) => {
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

  const handleRemoveRow = (index: number) => {
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
      onNotify('success', 'Recipe Bill of Materials (BOM) saved successfully!');
      loadRecipe(selectedProductId);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to save recipe BOM');
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Product Selector & Margin Analytics */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6 lg:col-span-1">
        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Select Menu Dish / Product
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 outline-hidden bg-white focus:ring-2 focus:ring-teal-500 transition"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Rs. {Number(p.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Menu Selling Price:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  Rs. {sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Calculated Food Cost:</span>
                <span className="font-mono font-black text-sky-600 text-sm">
                  Rs. {calculatedFoodCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Gross Margin:</span>
                <span
                  className={`font-mono font-black text-sm ${
                    marginPercent >= 65 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  ${grossProfit.toFixed(2)} ({marginPercent}%)
                </span>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                marginPercent >= 65
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {marginPercent >= 65 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {marginPercent >= 65
                  ? 'Healthy Cost Margin (>=65%)'
                  : 'Low Margin (<65%). Consider ingredient adjustments.'}
              </span>
            </div>

            <button
              onClick={handleSaveRecipe}
              disabled={savingRecipe}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <BookOpen className="w-4 h-4" />
              <span>{savingRecipe ? 'Saving BOM...' : 'Save Recipe BOM'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Recipe Ingredients Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
              <span>Ingredients Bill of Materials (BOM)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These quantities are deducted automatically from stock when this dish is ordered at the POS terminal.
            </p>
          </div>
          <button
            onClick={handleAddIngredient}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-black transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </button>
        </div>

        {loadingRecipe ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading recipe ingredients...
          </div>
        ) : recipeItems.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl text-xs text-slate-400">
            No ingredients configured for this dish yet. Click &quot;Add Ingredient&quot; above to specify ingredient usage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10.5px] uppercase font-black text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Inventory Ingredient</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left w-36">Quantity Required</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Row Cost</th>
                  <th className="px-4 py-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recipeItems.map((row, index) => {
                  const matched = items.find((i) => i.id === row.inventoryItemId) || row.inventoryItem;
                  const unitCost = Number(matched?.costPerUnit || 0);
                  const rowCost = unitCost * Number(row.quantityRequired || 0);

                  return (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <select
                          value={row.inventoryItemId}
                          onChange={(e) => handleUpdateRow(index, 'inventoryItemId', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-teal-500"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.sku}) - {i.mainCategory}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                          {matched?.mainCategory || 'KITCHEN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={row.quantityRequired}
                            onChange={(e) =>
                              handleUpdateRow(index, 'quantityRequired', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 text-right focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="text-[11px] font-bold text-slate-400">
                            {matched?.unit || 'Units'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-600">
                        Rs. {unitCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                        Rs. {rowCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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
  );
}
