import { useState, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import {
  Plus, Minus, Trash2, Banknote, CreditCard, User, Phone,
  ShoppingBag, Bike, Percent, Receipt, Zap, Search, ChevronRight,
  CheckCircle2, Loader2, Tag, X
} from 'lucide-react';

export default function QuickBill() {
  const { user } = useAuthStore();
  const { restaurantDetails, categories, menuItems, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, quickBillOrder } = usePosStore();

  const { activeCategoryTab, setActiveCategoryTab } = useUiStore();

  const [orderType, setOrderType] = useState('takeaway');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');

  const filteredMenu = useMemo(() => {
    let items = menuItems.filter(m => m.category_id === activeCategoryTab && m.is_available);
    if (menuSearch.trim()) {
      items = items.filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()));
    }
    return items;
  }, [menuItems, activeCategoryTab, menuSearch]);

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = restaurantDetails?.tax_percent ? (restaurantDetails.tax_percent / 100) : 0.05;

  const computedDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.min(cartSubtotal, (cartSubtotal * (discountAmount || 0)) / 100);
    }
    return Math.min(cartSubtotal, discountAmount || 0);
  }, [cartSubtotal, discountAmount, discountType]);

  const netSubtotal = Math.max(0, cartSubtotal - computedDiscount);
  const calculatedTax = netSubtotal * taxRate;
  const total = netSubtotal + calculatedTax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cachePrintData = (orderId, orderObj) => {
    try {
      localStorage.setItem('print_order_' + orderId, JSON.stringify(orderObj));
      if (restaurantDetails) localStorage.setItem('print_restaurant', JSON.stringify(restaurantDetails));
    } catch (e) {}
  };

  const printReceiptSilently = (orderId, orderObj) => {
    cachePrintData(orderId, orderObj);
    const url = `/print/receipt/${orderId}`;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    if (isMobile) {
      window.open(url, '_blank');
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      // The iframe itself calls window.print() when data is fully ready.
      // We just clean up the iframe node from the DOM after 15 seconds.
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 15000);
    }
  };

  const handleSettleBill = async (paymentType) => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setSuccessOrderId(null);

    const orderId = await quickBillOrder(
      orderType, paymentType,
      customerName || '', customerPhone || '',
      computedDiscount, user?.id
    );

    if (orderId) {
      setSuccessOrderId(orderId);
      
      // Construct and cache order details in localStorage for instant printer load
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const mockOrderObj = {
        id: orderId,
        created_at: new Date().toISOString(),
        order_type: orderType,
        payment_type: paymentType,
        customer_name: customerName,
        customer_phone: customerPhone,
        discount_amount: computedDiscount,
        subtotal: cartSubtotal,
        tax_amount: (cartSubtotal - computedDiscount) * 0.05,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          discount_amount: 0
        }))
      };

      setCustomerName('');
      setCustomerPhone('');
      setDiscountAmount(0);
      setTimeout(() => {
        printReceiptSilently(orderId, mockOrderObj);
        setSuccessOrderId(null);
      }, 1200);
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen bg-surface-950 overflow-hidden relative font-sans"
         style={{ height: '100vh', minHeight: '100vh' }}>

      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[70%] bg-rose-400 rounded-full mix-blend-multiply filter blur-[140px] opacity-[0.03] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-brand-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.04] animate-blob animation-delay-4000" />
      </div>

      {/* ─── LEFT PANEL: Menu ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-surface-700/60 lg:h-full z-10 bg-transparent overflow-hidden">

        {/* Top Bar */}
        <div className="glass-panel border-x-0 border-t-0 px-4 lg:px-6 pt-4 pb-3 z-20 shrink-0 sticky top-0 space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-surface-100 leading-none">Quick Bill</h1>
                <p className="text-[11px] text-surface-400 font-medium mt-0.5">Instant takeaway & delivery</p>
              </div>
            </div>
            {/* Order-type toggle */}
            <div className="flex bg-surface-800 p-1 rounded-2xl shadow-inner border border-surface-700/50">
              <button
                onClick={() => setOrderType('takeaway')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all duration-300 ${orderType === 'takeaway' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'text-surface-400 hover:text-surface-200'}`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all duration-300 ${orderType === 'delivery' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'text-surface-400 hover:text-surface-200'}`}
              >
                <Bike className="w-3.5 h-3.5" /> Delivery
              </button>
            </div>
          </div>

          {/* Search + Category chips row */}
          <div className="flex gap-3">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search menu…"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs font-medium bg-surface-900/80 border border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 w-36 transition-all"
              />
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-0.5 custom-scrollbar flex-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategoryTab(cat.id); setMenuSearch(''); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                    activeCategoryTab === cat.id
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25'
                      : 'bg-surface-900/70 border border-surface-700/70 text-surface-300 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar">
          {filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-surface-400">
              <Search className="w-10 h-10 opacity-30 mb-3" />
              <p className="font-bold text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredMenu.map(item => {
                const inCart = cart.find(c => c.menu_item_id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative flex flex-col text-left p-4 rounded-2xl border-2 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl ${
                      inCart
                        ? 'border-brand-400 bg-brand-50/80 shadow-brand-500/10 shadow-lg'
                        : 'border-surface-700/60 bg-surface-900/80 backdrop-blur-sm hover:border-brand-300 shadow-soft'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white">
                        {inCart.quantity}
                      </div>
                    )}
                    <span className={`font-extrabold text-sm truncate block w-full transition-colors ${inCart ? 'text-brand-700' : 'text-surface-200 group-hover:text-brand-600'}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-surface-400 line-clamp-2 mt-1 min-h-[2rem] font-medium leading-snug">
                      {item.description || 'Tap to add'}
                    </span>
                    <div className="mt-auto pt-3 flex justify-between items-center w-full">
                      <span className={`font-black text-base ${inCart ? 'text-brand-600' : 'text-surface-100'}`}>
                        ₹{item.price}
                      </span>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                        inCart
                          ? 'bg-brand-500 text-white rotate-45'
                          : 'bg-brand-500/15 text-brand-600 group-hover:bg-brand-500 group-hover:text-white'
                      }`}>
                        <Plus className={`w-4 h-4 transition-transform ${inCart ? '-rotate-45' : ''}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: Cart + Checkout ─────────────────────────── */}
      <div className="w-full lg:w-[460px] glass-panel border-y-0 border-r-0 flex flex-col z-20 shrink-0 lg:h-full overflow-hidden shadow-[-12px_0_40px_-15px_rgba(0,0,0,0.08)]"
           style={{ height: '100vh' }}>

        {/* Cart Header */}
        <div className="px-5 pt-5 pb-3 border-b border-surface-700/50 bg-surface-900 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-black text-surface-100">Order Summary</h2>
              {totalItems > 0 && (
                <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-black rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Mini stats strip */}
          {cart.length > 0 && (
            <div className="flex gap-2 mt-3">
              <div className="flex-1 bg-surface-800 rounded-xl px-3 py-2 border border-surface-700/50">
                <div className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Items</div>
                <div className="font-black text-sm text-surface-200">{cart.length} types</div>
              </div>
              <div className="flex-1 bg-brand-50/80 rounded-xl px-3 py-2 border border-brand-100">
                <div className="text-[9px] font-black text-brand-400 uppercase tracking-wider">Subtotal</div>
                <div className="font-black text-sm text-brand-700">₹{cartSubtotal.toFixed(0)}</div>
              </div>
              {computedDiscount > 0 && (
                <div className="flex-1 bg-rose-50/80 rounded-xl px-3 py-2 border border-rose-100">
                  <div className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Saved</div>
                  <div className="font-black text-sm text-rose-600">₹{computedDiscount.toFixed(0)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-400 px-6 animate-fade-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-surface-850 to-surface-800/50 flex items-center justify-center mb-5 border-2 border-dashed border-surface-700/60 shadow-inner">
                <ShoppingBag className="w-10 h-10 text-surface-400" />
              </div>
              <p className="font-black text-lg text-surface-300">Cart is empty</p>
              <p className="text-sm text-surface-400 mt-1 text-center">Tap items on the left menu to add them here</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">

              {/* Cart Items */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest px-1">Order Items</p>
                {cart.map(item => (
                  <div key={item.id} className="bg-white border border-surface-700/60 rounded-xl p-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-all group">
                    {/* Item color dot */}
                    <div className="w-2 h-10 rounded-full bg-gradient-to-b from-brand-400 to-indigo-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-surface-100 truncate">{item.name}</p>
                      <p className="text-xs text-surface-400 font-bold mt-0.5">
                        ₹{item.price} × {item.quantity} =
                        <span className="text-brand-600 ml-1">₹{(item.price * item.quantity).toFixed(0)}</span>
                      </p>
                    </div>
                    <div className="flex items-center bg-surface-800 rounded-xl border border-surface-700 p-0.5 gap-0.5">
                      <button
                        onClick={() => item.quantity > 1 ? updateCartQuantity(item.menu_item_id, item.quantity - 1) : removeFromCart(item.menu_item_id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-300 hover:bg-surface-700 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black text-sm text-surface-100 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.menu_item_id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.menu_item_id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-surface-400 hover:text-white hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-surface-700" />

              {/* Customer Details */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest px-1">Customer Info</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-surface-900/70 border border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-surface-550"
                      placeholder="Customer Name"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-surface-900/70 border border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-surface-550"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest px-1">Discount</p>
                <div className="bg-surface-800 border border-surface-700 rounded-2xl p-3 space-y-2">
                  {/* Type toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscountType('flat')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all ${discountType === 'flat' ? 'bg-rose-500 text-white shadow-md' : 'bg-surface-700/60 text-surface-400 hover:bg-surface-700'}`}
                    >
                      <Tag className="w-3.5 h-3.5" /> Flat (₹)
                    </button>
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all ${discountType === 'percent' ? 'bg-rose-500 text-white shadow-md' : 'bg-surface-700/60 text-surface-400 hover:bg-surface-700'}`}
                    >
                      <Percent className="w-3.5 h-3.5" /> Percent (%)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : cartSubtotal}
                      value={discountAmount || ''}
                      onChange={e => setDiscountAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 text-sm font-bold bg-white border border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder:text-surface-500 placeholder:font-medium"
                      placeholder={discountType === 'flat' ? 'Enter discount in ₹' : 'Enter discount %'}
                    />
                    {computedDiscount > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                        -₹{computedDiscount.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ─── Footer: Totals + Payment ─── */}
        <div className="shrink-0 border-t border-surface-700/60 bg-white/60 backdrop-blur-xl p-3 space-y-3">

          {/* Bill Breakdown */}
          {cart.length > 0 && (
            <div className="bg-surface-800/80 rounded-xl p-3 border border-surface-700/50 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-surface-400">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              {computedDiscount > 0 && (
                <div className="flex justify-between text-xs font-bold text-rose-500">
                  <span>Discount {discountType === 'percent' ? `(${discountAmount}%)` : ''}</span>
                  <span>− ₹{computedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold text-surface-400">
                <span>Tax ({restaurantDetails?.tax_percent || 5}%)</span>
                <span>₹{calculatedTax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-surface-300 to-transparent" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-surface-200 uppercase tracking-wide">Grand Total</span>
                <span className="text-2xl font-black bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Buttons */}
          {cart.length > 0 ? (
            successOrderId ? (
              <div className="flex flex-col items-center justify-center py-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <p className="font-black text-emerald-600 text-base">Bill Generated!</p>
                <p className="text-xs text-surface-400 mt-1">Opening PDF for printing…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettleBill('Cash')}
                  disabled={isProcessing}
                  className="relative flex flex-col items-center justify-center gap-1 py-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-60 hover:shadow-emerald-500/40 hover:shadow-xl overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5 relative z-10" />}
                  <span className="text-xs relative z-10">Cash</span>
                </button>
                <button
                  onClick={() => handleSettleBill('UPI')}
                  disabled={isProcessing}
                  className="relative flex flex-col items-center justify-center gap-1 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition-all disabled:opacity-60 hover:shadow-indigo-500/40 hover:shadow-xl overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 relative z-10" />}
                  <span className="text-xs relative z-10">UPI</span>
                </button>
                <button
                  onClick={() => handleSettleBill('Card')}
                  disabled={isProcessing}
                  className="relative col-span-2 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-surface-300 to-surface-400 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all disabled:opacity-60 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 relative z-10" />}
                  <span className="relative z-10">Card Payment</span>
                  <ChevronRight className="w-4 h-4 relative z-10 opacity-60" />
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 bg-surface-800/80 text-surface-400 rounded-2xl border-2 border-dashed border-surface-700">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm font-bold">Add items to generate bill</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
