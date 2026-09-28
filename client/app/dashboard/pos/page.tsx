'use client';

// Point of Sale (POS) active terminal
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi, pmsApi, authStorage } from '@/lib/api';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Receipt,
  CreditCard,
  Banknote,
  Hotel,
  Key,
  CheckCircle2,
  AlertCircle,
  Printer,
  X,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function POSTerminalPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Cart State
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');

  // Active / Settled Order State
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeBill, setActiveBill] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [settledPayment, setSettledPayment] = useState<any>(null);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ROOM_CHARGE'>('CASH');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [cardLast4, setCardLast4] = useState('');
  const [occupiedRooms, setOccupiedRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTerminalData = async () => {
    try {
      setLoading(true);
      const [cats, prods, tbls] = await Promise.all([
        posApi.getCategories(),
        posApi.getProducts(),
        posApi.getTables(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setTables(tbls);
    } catch (err) {
      console.error('Failed to load POS data from MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerminalData();
  }, []);

  // Cart operations
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setActiveOrder(null);
    setActiveBill(null);
    setSettledPayment(null);
    setCustomerName('');
    setSelectedTableId('');
    setOrderNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  // 1. Create Order
  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to place an order.');
      return;
    }

    if (orderType === 'DINE_IN' && !selectedTableId) {
      alert('Please select a dining table for dine-in orders.');
      return;
    }

    setProcessing(true);
    setFeedbackMsg(null);
    try {
      const order = await posApi.createOrder({
        orderType,
        tableId: orderType === 'DINE_IN' ? selectedTableId : undefined,
        customerName: customerName || undefined,
        notes: orderNotes || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      setActiveOrder(order);
      setFeedbackMsg({
        type: 'success',
        text: `Order ${order.orderNumber} created successfully!`,
      });
      // Refresh tables to reflect occupancy
      posApi.getTables().then(setTables);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to create order',
      });
    } finally {
      setProcessing(false);
    }
  };

  // 2. Dispatch KOT
  const handleSendToKitchen = async () => {
    if (!activeOrder) {
      alert('Please save the order first before dispatching to kitchen.');
      return;
    }

    setProcessing(true);
    setFeedbackMsg(null);
    try {
      const kot = await posApi.sendToKitchen(activeOrder.id);
      setActiveOrder((prev: any) => ({ ...prev, status: 'KOT_SENT' }));
      setFeedbackMsg({
        type: 'success',
        text: `KOT ticket ${kot.kotNumber} dispatched to kitchen display!`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to dispatch KOT',
      });
    } finally {
      setProcessing(false);
    }
  };

  // 3. Generate Bill
  const handleGenerateBill = async () => {
    if (!activeOrder) return;
    setProcessing(true);
    setFeedbackMsg(null);
    try {
      const bill = await posApi.generateBill(activeOrder.id);
      setActiveBill(bill);
      setActiveOrder((prev: any) => ({ ...prev, status: 'BILLED' }));
      setAmountTendered(bill.grandTotal.toString());
      setFeedbackMsg({
        type: 'success',
        text: `Bill ${bill.billNumber} generated ($${bill.grandTotal}). Ready for payment.`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to generate bill',
      });
    } finally {
      setProcessing(false);
    }
  };

  // 4. Open Payment Modal with In-House Guests
  const openPaymentModal = async () => {
    setPaymentModalOpen(true);
    setLoadingRooms(true);
    try {
      const inHouseReservations = await pmsApi.getReservations('CHECKED_IN');
      const valid = inHouseReservations || [];
      setOccupiedRooms(valid);
      if (valid.length > 0 && valid[0].roomId) {
        setSelectedRoomId(valid[0].roomId);
      }
    } catch (err) {
      console.error('Failed to load in-house guests for room charge:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // 5. Settle Payment
  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    setProcessing(true);
    setFeedbackMsg(null);
    try {
      const result = await posApi.settlePayment(activeOrder.id, {
        paymentMethod,
        amountPaid: Number(amountTendered) || total,
        cardLast4: paymentMethod === 'CARD' ? cardLast4 || '4242' : undefined,
        roomId: paymentMethod === 'ROOM_CHARGE' ? selectedRoomId : undefined,
      });

      setSettledPayment(result.payment);
      setActiveOrder(result.order);
      setPaymentModalOpen(false);
      setReceiptModalOpen(true);
      setFeedbackMsg({
        type: 'success',
        text:
          paymentMethod === 'ROOM_CHARGE'
            ? `Order billed directly to guest room folio! Receipt ${result.payment.receiptNumber} generated.`
            : `Payment settled successfully! Receipt ${result.payment.receiptNumber} generated.`,
      });
      // Refresh tables to show freed table
      posApi.getTables().then(setTables);
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <DashboardLayout>
      {/* Top Banner & Feedback */}
      {feedbackMsg && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fade-scale ${
            feedbackMsg.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00C48C]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Terminal Grid: Catalog (Left) + Cart & Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT: PRODUCT CATALOG ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search dish by name, ingredients, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:bg-white focus:border-[#00C48C] outline-none"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === ''
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                All Menu
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#00C48C] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs hover:border-[#00C48C] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group min-h-[140px]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      {prod.category?.name || 'Dish'}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono">
                      {prod.sku}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#00C48C] transition-colors line-clamp-1">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-snug">
                    {prod.description || 'Chef special prepared fresh.'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F1F5F9]">
                  <span className="text-sm font-bold text-[#0F172A] mono">
                    ${Number(prod.price).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg bg-[#00C48C] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT: ACTIVE CART & ACTIONS ================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs sticky top-20">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Current Cart</h3>
                <span className="text-[10px] text-[#64748B]">
                  {activeOrder ? activeOrder.orderNumber : 'New Sale'}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-semibold text-red-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dine-In / Takeaway Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F1F5F9] mb-4 text-xs font-bold">
            <button
              onClick={() => setOrderType('DINE_IN')}
              className={`py-1.5 rounded-lg transition-all ${
                orderType === 'DINE_IN'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType('TAKEAWAY')}
              className={`py-1.5 rounded-lg transition-all ${
                orderType === 'TAKEAWAY'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Takeaway
            </button>
          </div>

          {/* Table Selector (if Dine-In) */}
          {orderType === 'DINE_IN' && (
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Select Table
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
              >
                <option value="">-- Choose Dining Table --</option>
                {tables.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.status === 'OCCUPIED' && t.id !== activeOrder?.tableId}
                  >
                    {t.tableNumber} ({t.status} - {t.capacity} seats)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cart Line Items */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 mb-4">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8] text-xs">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Click any dish from the catalog to add.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[#0F172A] truncate">
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-[#64748B] mono">
                      ${item.price.toFixed(2)} each
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-6 h-6 flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#0F172A] mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-[#0F172A] mono w-14 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-[#94A3B8] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Financial Summary */}
          <div className="space-y-1.5 pt-3 border-t border-[#E2E8F0] text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Tax (10% VAT)</span>
              <span className="mono">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-[#0F172A] pt-1.5 border-t border-[#E2E8F0]">
              <span>Total Payable</span>
              <span className="mono text-[#00C48C]">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="space-y-2 mt-5">
            {!activeOrder ? (
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={processing || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>Create &amp; Save Order</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={processing || activeOrder.status === 'PAID'}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Send KOT to Kitchen</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateBill}
                    disabled={processing || activeOrder.status === 'PAID'}
                    className="py-2.5 px-3 rounded-xl border border-[#0284C7] bg-[#F0F9FF] text-[#0284C7] text-xs font-bold hover:bg-[#0284C7] hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Generate Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!activeBill) handleGenerateBill();
                      openPaymentModal();
                    }}
                    disabled={processing || activeOrder.status === 'PAID'}
                    className="py-2.5 px-3 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Settle Pay</span>
                  </button>
                </div>
              </>
            )}

            {settledPayment && (
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] flex items-center justify-center gap-2 mt-2"
              >
                <Printer className="w-4 h-4" />
                <span>View / Print Receipt</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= PAYMENT MODAL ================= */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Settle Payment
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] mb-4 text-center">
              <div className="text-xs text-[#64748B]">Total Amount Due</div>
              <div className="text-2xl font-bold text-[#00C48C] mono">
                ${total.toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-4">
              {/* Tender Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-[#00C48C] bg-[#ECFDF5] text-[#065F46] font-bold'
                      : 'border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-[#00C48C] bg-[#ECFDF5] text-[#065F46] font-bold'
                      : 'border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ROOM_CHARGE')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'ROOM_CHARGE'
                      ? 'border-[#0284C7] bg-[#F0F9FF] text-[#0369A1] font-bold shadow-xs'
                      : 'border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <Hotel className="w-5 h-5" />
                  <span className="text-xs">Room Folio</span>
                </button>
              </div>

              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Amount Tendered ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-bold text-[#0F172A] outline-none"
                  />
                  {Number(amountTendered) >= total && (
                    <div className="mt-2 text-xs font-bold text-[#00C48C]">
                      Change to give: ${(Number(amountTendered) - total).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Card Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4242"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                  />
                </div>
              )}

              {paymentMethod === 'ROOM_CHARGE' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Select Occupied Guest Room
                  </label>
                  {loadingRooms ? (
                    <div className="p-3 text-xs text-[#64748B] text-center">Loading in-house rooms...</div>
                  ) : occupiedRooms.length > 0 ? (
                    <div>
                      <select
                        required
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] outline-none"
                      >
                        {occupiedRooms.map((res: any) => (
                          <option key={res.id} value={res.roomId}>
                            Room {res.room?.roomNumber || 'N/A'} — {res.guest?.fullName} ({res.roomType?.name || 'Standard'})
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                        <Key className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                        <div>
                          <strong>Folio Charge Routing:</strong> ${total.toFixed(2)} will be posted directly to this guest folio and billed at checkout.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      No active checked-in guests found. Please check in a guest via the PMS Front Desk first.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE RECEIPT MODAL ================= */}
      {receiptModalOpen && settledPayment && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale text-center">
            {/* Printable Receipt Area */}
            <div id="thermalReceipt" className="p-4 bg-white text-[#0F172A] font-mono text-xs">
              <div className="font-extrabold text-base mb-1 uppercase tracking-wider">
                {authStorage.getProperty()?.name || 'GRAND HORIZON RESORT & SPA'}
              </div>
              <div className="text-[10px] text-[#64748B] mb-3">
                TAX INVOICE / RECEIPT
              </div>
              <div className="text-[11px] border-b border-dashed border-[#E2E8F0] pb-2 text-left space-y-0.5">
                <div>Receipt: {settledPayment.receiptNumber}</div>
                <div>Order: {activeOrder?.orderNumber}</div>
                <div>
                  Table / Area:{' '}
                  {activeOrder?.tableNumber || activeOrder?.orderType}
                </div>
                <div>Date: {new Date().toLocaleString()}</div>
              </div>

              <div className="divide-y divide-dashed divide-[#E2E8F0] my-2 text-left">
                {cart.map((i) => (
                  <div key={i.productId} className="py-1 flex justify-between">
                    <span>
                      {i.quantity}x {i.productName}
                    </span>
                    <span>${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-[#E2E8F0] pt-2 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (10%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>TOTAL PAID:</span>
                  <span>${settledPayment.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#64748B]">
                  <span>Method:</span>
                  <span className="font-bold">
                    {settledPayment.paymentMethod === 'ROOM_CHARGE'
                      ? 'CHARGED TO ROOM FOLIO'
                      : settledPayment.paymentMethod}
                  </span>
                </div>
                {settledPayment.transactionRef && (
                  <div className="text-[10px] text-[#0284C7] pt-1 border-t border-dashed border-[#E2E8F0]">
                    <span>Routing: {settledPayment.transactionRef}</span>
                  </div>
                )}
                {settledPayment.changeGiven > 0 && (
                  <div className="flex justify-between text-[11px] text-[#00C48C]">
                    <span>Change Given:</span>
                    <span>${settledPayment.changeGiven.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-[#E2E8F0] text-[10px] text-[#64748B]">
                Thank you for dining with us!
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => {
                  setReceiptModalOpen(false);
                  clearCart();
                }}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
