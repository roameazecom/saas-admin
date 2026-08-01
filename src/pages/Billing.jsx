import { useState, useMemo, useEffect } from 'react';
import { usePosStore, socket } from '../store/posStore';
import { useAuthStore } from '../store/authStore';
import {
  Printer, CreditCard, Banknote, User, Phone, X, History,
  Search, Receipt, ShoppingBag, Bike, Coffee, CheckCircle2,
  Filter, Trash2
} from 'lucide-react';
import ManagerAuthModal from '../components/common/ManagerAuthModal';
import { formatIST, formatDateKeyIST, todayIST } from '../utils/formatIST';

export default function Billing() {
  const { orders, orderHistory, tables, checkoutOrder, restaurantDetails, deleteActiveOrderItem, updateOrderItemDiscount, cancelEntireOrder, updateHistoryOrderDiscount } = usePosStore();
  const { user } = useAuthStore();
  const [viewTab, setViewTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentType, setPaymentType] = useState('Cash');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutDiscountType, setCheckoutDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [checkoutDiscountValue, setCheckoutDiscountValue] = useState(0);
  const [showHistoryDiscountModal, setShowHistoryDiscountModal] = useState(false);
  const [historyDiscountOrder, setHistoryDiscountOrder] = useState(null);
  const [historyDiscountType, setHistoryDiscountType] = useState('flat');
  const [historyDiscountValue, setHistoryDiscountValue] = useState(0);
  const [historyApplyGst, setHistoryApplyGst] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateRange: 'all', paymentType: 'all', orderType: 'all' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState(null);
  const [showOrderCancelModal, setShowOrderCancelModal] = useState(false);
  const [applyGst, setApplyGst] = useState(true);
  const [customDate, setCustomDate] = useState('');

  const activeOrders = orders.filter(o => o.status === 'open');
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
  const subtotal = selectedOrder ? selectedOrder.subtotal : 0;
  const discountAmount = checkoutDiscountType === 'percent' 
    ? Number(((subtotal * checkoutDiscountValue) / 100).toFixed(2)) 
    : Number(checkoutDiscountValue || 0);
  const taxRate = applyGst && restaurantDetails?.tax_percent ? (restaurantDetails.tax_percent / 100) : 0;
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  const calculatedTax = selectedOrder ? netSubtotal * taxRate : 0;
  const total = selectedOrder ? netSubtotal + calculatedTax : 0;

  // Write order data to localStorage for instant iframe reading on same device
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

  useEffect(() => {
    const handleRemotePrint = (data) => {
      if (data && data.orderId && data.orderObj) {
        console.log('[Remote Print] Triggering print for order:', data.orderId);
        printReceiptSilently(data.orderId, data.orderObj);
      }
    };

    socket.on('trigger_remote_print', handleRemotePrint);
    return () => {
      socket.off('trigger_remote_print', handleRemotePrint);
    };
  }, [restaurantDetails]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try { return formatIST(dateStr); } catch { return 'Invalid Date'; }
  };

  const isToday = (d) => formatDateKeyIST(d) === todayIST();
  const isYesterday = (d) => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return formatDateKeyIST(d) === yest.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };
  const isThisWeek = (d) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(d) >= weekAgo;
  };

  const filteredHistory = useMemo(() => {
    return orderHistory.filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (o.customer_phone && o.customer_phone.includes(q)) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.id && o.id.toString().includes(q));
        if (!match) return false;
      }
      if (customDate) {
        if (formatDateKeyIST(o.created_at) !== customDate) return false;
      } else if (filters.dateRange !== 'all') {
        if (filters.dateRange === 'today' && !isToday(o.created_at)) return false;
        if (filters.dateRange === 'yesterday' && !isYesterday(o.created_at)) return false;
        if (filters.dateRange === 'this_week' && !isThisWeek(o.created_at)) return false;
      }
      if (filters.paymentType !== 'all' && o.payment_type !== filters.paymentType) return false;
      if (filters.orderType !== 'all' && o.order_type !== filters.orderType) return false;
      return true;
    });
  }, [orderHistory, searchQuery, filters, customDate]);

  const stats = useMemo(() => {
    let totalRev = 0, cash = 0, upi = 0, card = 0;
    filteredHistory.forEach(o => {
      const t = Number(o.total_amount || 0);
      totalRev += t;
      if (o.payment_type === 'Cash') cash += t;
      else if (o.payment_type === 'UPI') upi += t;
      else if (o.payment_type === 'Card') card += t;
    });
    return { totalOrders: filteredHistory.length, totalRev, cash, upi, card };
  }, [filteredHistory]);

  const handleCheckoutClick = (type) => { setPaymentType(type); setCheckoutDiscountValue(0); setCheckoutDiscountType('flat'); setShowModal(true); };
  const handleConfirmPayment = async () => {
    if (selectedOrderId) {
      await checkoutOrder(selectedOrderId, paymentType, checkoutName || selectedOrder?.customer_name || '', checkoutPhone || selectedOrder?.customer_phone || '', user?.id, discountAmount, applyGst);
      
      const printOrderObj = {
        ...selectedOrder,
        discount_amount: discountAmount,
        tax_amount: applyGst ? calculatedTax : 0,
        total_amount: applyGst ? (netSubtotal + calculatedTax) : netSubtotal,
        payment_type: paymentType,
        customer_name: checkoutName || selectedOrder?.customer_name,
        customer_phone: checkoutPhone || selectedOrder?.customer_phone
      };

      // Auto-print thermal POS receipt silently
      printReceiptSilently(selectedOrderId, printOrderObj);
      
      setSelectedOrderId(null); setShowModal(false); setCheckoutName(''); setCheckoutPhone(''); setCheckoutDiscountValue(0); setCheckoutDiscountType('flat'); setApplyGst(true);
    }
  };
  const handlePrintUnpaidBill = () => {
    if (selectedOrderId && selectedOrder) {
      const printOrderObj = {
        ...selectedOrder,
        discount_amount: discountAmount,
        tax_amount: applyGst ? calculatedTax : 0,
        total_amount: applyGst ? (netSubtotal + calculatedTax) : netSubtotal,
        payment_type: 'ESTIMATE / UNPAID',
        customer_name: checkoutName || selectedOrder?.customer_name,
        customer_phone: checkoutPhone || selectedOrder?.customer_phone,
        is_estimate: true
      };
      printReceiptSilently(selectedOrderId, printOrderObj);
      toast.success('Unpaid estimate bill sent to print!');
    }
  };
  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  const getOrderIcon = (type) => {
    if (type === 'takeaway') return <ShoppingBag className="w-4 h-4" style={{ color: '#6d28d9' }} />;
    if (type === 'delivery') return <Bike className="w-4 h-4" style={{ color: '#047857' }} />;
    return <Coffee className="w-4 h-4" style={{ color: '#ea580c' }} />;
  };

  const getTypeColor = (type) => ({
    dine_in: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', color: '#ea580c' },
    takeaway: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', color: '#6d28d9' },
    delivery: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', color: '#047857' },
  }[type] || { bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.06)', color: 'rgba(15, 23, 42, 0.5)' });

  const panelStyle = {
    background: 'rgba(255,255,255,0.85)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen overflow-hidden relative font-sans"
         style={{ background: '#f8fafc', height: '100vh' }}>

      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-[40%] h-[40%] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="w-full lg:w-[310px] flex flex-col shrink-0 lg:h-full max-h-[45vh] lg:max-h-full z-10"
           style={panelStyle}>

        {/* Tab switcher */}
        <div className="p-4 shrink-0" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex p-1 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
            <button
              onClick={() => { setViewTab('active'); setSelectedOrderId(null); }}
              className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300"
              style={viewTab === 'active' ? {
                background: 'rgba(249,115,22,0.12)', color: '#ea580c',
                border: '1px solid rgba(249,115,22,0.25)'
              } : { color: 'rgba(15, 23, 42, 0.5)', border: '1px solid transparent' }}
            >
              Active Bills
              <span className="ml-2 px-1.5 py-0.5 rounded-md text-xs"
                style={{ background: viewTab === 'active' ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.05)', color: viewTab === 'active' ? '#ea580c' : 'rgba(15, 23, 42, 0.5)' }}>
                {activeOrders.length}
              </span>
            </button>
            <button
              onClick={() => { setViewTab('history'); setSelectedOrderId(null); }}
              className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              style={viewTab === 'history' ? {
                background: 'rgba(5, 150, 105, 0.1)', color: '#047857',
                border: '1px solid rgba(5, 150, 105, 0.2)'
              } : { color: 'rgba(15, 23, 42, 0.5)', border: '1px solid transparent' }}
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>
        </div>

        {viewTab === 'active' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeOrders.map(order => {
              const isDineIn = order.order_type === 'dine_in';
              const table = tables.find(t => t.id === order.table_id);
              const isSelected = selectedOrderId === order.id;
              const tc = getTypeColor(order.order_type);
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-300 animate-fade-in hover-lift"
                  style={isSelected ? {
                    background: 'rgba(249,115,22,0.12)',
                    border: '1px solid rgba(249,115,22,0.4)',
                    boxShadow: '0 0 15px rgba(249,115,22,0.04)'
                  } : {
                    background: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                      {getOrderIcon(order.order_type)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-800 truncate block">
                        {isDineIn ? `Table ${table?.table_number}` : (order.customer_name || 'Takeaway')}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                          {order.order_type.replace('_', '-')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">#{order.id}</span>
                      </div>
                      <div className="text-[9px] font-bold mt-0.5 text-slate-400">
                        {formatDateTime(order.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-slate-800">₹{order.subtotal}</span>
                    <div className="text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-md border"
                      style={{ background: 'rgba(249,115,22,0.06)', color: '#ea580c', borderColor: 'rgba(249,115,22,0.15)' }}>
                      {order.items.length} items
                    </div>
                  </div>
                </button>
              );
            })}
            {activeOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                  <Receipt className="w-8 h-8" style={{ color: 'rgba(15, 23, 42, 0.35)' }} />
                </div>
                <p className="font-bold text-sm text-surface-500">No active orders</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + Filter */}
            <div className="px-4 py-3 shrink-0 space-y-3" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(15, 23, 42, 0.35)' }} />
                  <input
                    type="text" placeholder="Phone, name or Bill #"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative"
                  style={showFilters || activeFiltersCount > 0 ? {
                    background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#ea580c'
                  } : { background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0, 0, 0, 0.08)', color: 'rgba(15, 23, 42, 0.5)' }}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#f97316' }} />
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="p-3 rounded-xl space-y-3 animate-fade-in" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {[
                    { key: 'dateRange', label: 'Period', opts: ['all', 'today', 'yesterday', 'this_week'], color: '#fb923c' },
                    { key: 'paymentType', label: 'Payment', opts: ['all', 'Cash', 'UPI', 'Card'], color: '#a78bfa' },
                    { key: 'orderType', label: 'Type', opts: ['all', 'dine_in', 'takeaway', 'delivery'], color: '#34d399' },
                  ].map(({ key, label, opts, color }) => (
                    <div key={key}>
                      <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>{label}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {opts.map(o => (
                          <button
                            key={o} onClick={() => handleFilterChange(key, o)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                            style={filters[key] === o ? { background: `${color}15`, border: `1px solid ${color}40`, color: `${color === '#fb923c' ? '#ea580c' : color === '#34d399' ? '#047857' : '#6d28d9'}` }
                              : { background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0, 0, 0, 0.08)', color: 'rgba(15, 23, 42, 0.5)' }}
                          >
                            {o.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Custom Date Input */}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>
                      Search Calendar Date
                    </label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="glass-input px-3 py-1.5 rounded-lg text-xs font-bold w-full"
                        style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0, 0, 0, 0.08)' }}
                      />
                      {customDate && (
                        <button 
                          onClick={() => setCustomDate('')}
                          className="px-2 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-lg text-[10px] uppercase hover:bg-rose-100"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="flex gap-2 overflow-x-auto custom-scrollbar">
                {[
                  { icon: Receipt, val: `₹${stats.totalRev.toFixed(0)}`, label: 'Revenue', color: '#fb923c' },
                  { icon: Banknote, val: `₹${stats.cash.toFixed(0)}`, label: 'Cash', color: '#34d399' },
                  { icon: CreditCard, val: `₹${(stats.upi + stats.card).toFixed(0)}`, label: 'Digital', color: '#a78bfa' },
                ].map(({ icon: Icon, val, label, color }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
                       style={{ background: `${color}0f`, border: `1px solid ${color}25` }}>
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: color === '#fb923c' ? '#ea580c' : color === '#34d399' ? '#047857' : '#6d28d9' }} />
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-black" style={{ color: color === '#fb923c' ? '#ea580c' : color === '#34d399' ? '#047857' : '#6d28d9' }}>{label}</div>
                      <div className="font-black text-sm leading-none text-surface-100">{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredHistory.slice(0, 50).map(order => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-300 animate-fade-in hover-lift"
                    style={isSelected ? {
                      background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.35)'
                    } : {
                      background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        {getOrderIcon(order.order_type || 'dine_in')}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                          <span>Bill #{order.id}</span>
                          {order.order_type === 'dine_in' && order.table_number && (
                            <span className="text-[9px] font-black text-orange-655 bg-orange-50/50 border border-orange-100/60 px-1.5 py-0.5 rounded-md shrink-0">
                              T-{order.table_number} ({order.location_name})
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] font-bold mt-0.5 text-slate-400">
                          {formatDateTime(order.created_at)} ·{' '}
                          <span style={{ color: '#ea580c' }}>{order.payment_type}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-sm text-slate-800">₹{(order.total_amount || 0).toFixed(0)}</div>
                      <div className="text-[8px] font-black uppercase mt-0.5 px-1.5 py-0.5 rounded-md inline-block border"
                           style={{ background: 'rgba(5, 150, 105, 0.06)', color: '#047857', borderColor: 'rgba(5, 150, 105, 0.15)' }}>Paid</div>
                    </div>
                  </button>
                );
              })}
              {filteredHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <History className="w-12 h-12" style={{ color: 'rgba(15, 23, 42, 0.2)' }} />
                  <p className="font-bold text-sm text-surface-500">No billing history found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-1 flex flex-col p-4 lg:p-8 items-center justify-center overflow-hidden h-full z-10">
        {selectedOrderId && viewTab === 'active' && selectedOrder ? (
          <div className="w-full max-w-lg flex flex-col h-full lg:max-h-full animate-slide-up rounded-3xl overflow-hidden"
               style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(30px)' }}>

            {/* Orange gradient top */}
            <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #f97316, #ea580c, #f97316)' }} />

            {/* Bill Header */}
            <div className="p-4 shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {selectedOrder.order_type === 'dine_in'
                    ? `Dine-In: Table ${tables.find(t => t.id === selectedOrder.table_id)?.table_number}`
                    : selectedOrder.order_type === 'takeaway' ? 'Takeaway Order' : 'Delivery Order'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order ID: #{selectedOrder.id}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shrink-0">
                {formatDateTime(selectedOrder.created_at)}
              </span>
            </div>

            {selectedOrder.order_type !== 'dine_in' && (selectedOrder.customer_name || selectedOrder.customer_phone) && (
              <div className="mx-6 mt-3 p-3 rounded-xl text-left flex items-center gap-3 bg-slate-50 border border-slate-100">
                <User className="w-4 h-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-black text-slate-800 text-sm">{selectedOrder.customer_name || 'Customer'}</p>
                  {selectedOrder.customer_phone && <p className="text-xs font-bold text-slate-400 mt-0.5">{selectedOrder.customer_phone}</p>}
                </div>
              </div>
            )}

            {/* Bill Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pb-2"
                   style={{ color: 'rgba(15, 23, 42, 0.45)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <span>Item</span><span>Total</span>
              </div>
              {selectedOrder.items.map(item => {
                const itemTotal = (item.quantity * Number(item.price)) - Number(item.discount_amount || 0);
                return (
                  <div key={item.id} className="flex justify-between items-center group gap-3 border-b border-slate-50 pb-2">
                    <div className="flex-1">
                      <p className="font-black text-surface-100 text-sm group-hover:text-orange-600 transition-colors">{item.name}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>{item.quantity} × ₹{item.price}</p>
                      {item.notes && (
                        <p className="text-[10px] font-bold text-orange-600 mt-1 bg-orange-50/50 border border-orange-100/55 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                          <span>✍️</span><span className="italic">{item.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Food wise discount input */}
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Disc:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.price * item.quantity}
                          placeholder="₹0"
                          value={item.discount_amount || ''}
                          onChange={(e) => {
                            const discVal = Number(e.target.value);
                            updateOrderItemDiscount(selectedOrder.id, item.id, discVal);
                          }}
                          className="w-14 bg-transparent text-xs font-black text-slate-800 focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="font-black text-surface-100 px-2 py-1 rounded-lg text-sm bg-slate-100">
                        ₹{itemTotal.toFixed(0)}
                      </span>
                      <button
                        onClick={() => {
                          if (item.status === 'ready' || item.status === 'served') {
                            setItemToCancel({ orderId: selectedOrder.id, itemId: item.id, name: item.name });
                            setIsAuthModalOpen(true);
                          } else {
                            deleteActiveOrderItem(selectedOrder.id, item.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals + Payment */}
            <div className="shrink-0 p-4 font-sans text-left" style={{ borderTop: '1px dashed rgba(0, 0, 0, 0.1)' }}>
              {/* GST Toggle Checkbox */}
              <div className="flex justify-between items-center p-2.5 rounded-2xl mb-2 text-left shadow-sm"
                   style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Apply GST ({restaurantDetails?.tax_percent || 5}%)</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Turn off if customer asks for tax-free bill</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={applyGst} 
                  onChange={(e) => setApplyGst(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 cursor-pointer border-slate-350"
                  style={{ accentColor: '#ea580c' }}
                />
              </div>

              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-sm font-bold" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>
                  <span>Subtotal</span><span className="text-surface-100">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>
                  <span>Tax ({applyGst ? (restaurantDetails?.tax_percent || 5) : 0}%)</span><span>₹{calculatedTax.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 mb-2.5" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <span className="text-lg font-black text-surface-100 uppercase tracking-wide">Total</span>
                <span className="text-4xl font-black gradient-text">₹{total.toFixed(2)}</span>
              </div>
              {/* 1. Print Unpaid Bill (Estimate) Button */}
              <button
                onClick={handlePrintUnpaidBill}
                className="w-full flex items-center justify-center gap-2 py-2.5 mb-2.5 rounded-xl font-bold text-xs transition-all border border-orange-200 text-orange-600 bg-orange-50/50 hover:bg-orange-100/60 active:scale-95 shadow-sm"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Print Customer Bill (Unpaid)</span>
              </button>

              {/* Label for checkout options */}
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Checkout & Close Bill (Select Payment)
              </label>

              {/* 2. Compact payment modes selection */}
              <div className="flex gap-2 mb-3">
                {[
                  { label: 'Cash', type: 'Cash', color: '#047857', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.18)' },
                  { label: 'UPI', type: 'UPI', color: '#6d28d9', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.18)' },
                  { label: 'Card', type: 'Card', color: '#1d4ed8', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.18)' },
                ].map(({ label, type, color, bg, border }) => (
                  <button
                    key={type}
                    onClick={() => handleCheckoutClick(type)}
                    className="flex-1 flex items-center justify-center py-2 rounded-xl font-black text-xs transition-all hover-lift active:scale-95"
                    style={{ background: bg, border: `1px solid ${border}`, color }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {/* 3. Cancel Entire Order (Manager Authorization Required) */}
              <button
                onClick={() => setShowOrderCancelModal(true)}
                className="w-full py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-rose-100 text-rose-500 hover:bg-rose-50/50 transition-all active:scale-95"
              >
                Cancel Entire Order
              </button>
            </div>
          </div>

        ) : selectedOrderId && viewTab === 'history' ? (() => {
          const histOrder = orderHistory.find(o => o.id === selectedOrderId);
          if (!histOrder) return null;
          const histTotal = histOrder.total_amount || 0;
          const isDineIn = histOrder.order_type === 'dine_in';
          return (
            <div className="w-full h-full rounded-3xl overflow-hidden flex flex-col max-w-4xl animate-slide-up"
                 style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(30px)' }}>
              <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #059669, #10b981)' }} />

              <div className="p-6 flex justify-between items-start shrink-0" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-black text-surface-100">Invoice #{histOrder.id}</h2>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                      style={getTypeColor(histOrder.order_type) ? { background: getTypeColor(histOrder.order_type).bg, color: getTypeColor(histOrder.order_type).color, border: `1px solid ${getTypeColor(histOrder.order_type).border}` } : {}}>
                      {histOrder.order_type?.replace('_', '-')}
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>
                    {isDineIn ? `Table ${histOrder.table_number || '-'}` : (histOrder.customer_name || 'Takeaway')} · Settled by {histOrder.waiter_name || 'System'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black"
                     style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.2)', color: '#047857' }}>
                  <CheckCircle2 className="w-4 h-4" /> PAID · {histOrder.payment_type}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
                {(histOrder.customer_name || histOrder.customer_phone) && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl"
                       style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <User className="w-6 h-6" style={{ color: '#ea580c' }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Customer</p>
                      {histOrder.customer_name && <p className="font-black text-surface-100 text-lg">{histOrder.customer_name}</p>}
                      {histOrder.customer_phone && <p className="text-sm font-bold text-surface-550">{histOrder.customer_phone}</p>}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Order Items</p>
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                    <table className="w-full text-left">
                      <thead style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <tr>
                          {['Item', 'Qty', 'Price', 'Total'].map((h, i) => (
                            <th key={h} className={`p-4 font-black text-xs uppercase tracking-wider ${i > 1 ? 'text-right' : ''}`}
                                style={{ color: 'rgba(15, 23, 42, 0.5)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(histOrder.items || []).map((item, idx) => (
                          <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                             <td className="p-4 font-black text-surface-100">
                               <div>{item.name}</div>
                               {item.notes && (
                                 <div className="text-[10px] font-bold text-orange-600 mt-1 bg-orange-50/50 border border-orange-100/40 px-2 py-0.5 rounded-md w-fit inline-flex items-center gap-1">
                                   <span>✍️</span><span className="italic">{item.notes}</span>
                                 </div>
                               )}
                             </td>
                            <td className="p-4 text-center font-bold text-surface-550">{item.quantity}</td>
                            <td className="p-4 text-right font-bold text-surface-550">₹{item.price}</td>
                            <td className="p-4 text-right font-black text-surface-100">₹{item.quantity * item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-full md:w-1/2 p-5 rounded-2xl space-y-3"
                       style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex justify-between font-bold text-sm" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>
                      <span>Subtotal</span><span className="text-surface-100">₹{(histOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-emerald-600 items-center">
                      <span>Discount</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">-₹{(histOrder.discount_amount || 0).toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setHistoryDiscountOrder(histOrder);
                            setHistoryDiscountValue(histOrder.discount_amount || 0);
                            setHistoryDiscountType('flat');
                            setHistoryApplyGst(histOrder.tax_amount > 0);
                            setShowHistoryDiscountModal(true);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/70 transition-all shrink-0 cursor-pointer"
                        >
                          {histOrder.discount_amount > 0 ? 'Edit' : 'Apply'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-sm pb-3"
                         style={{ color: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px dashed rgba(0,0,0,0.08)' }}>
                      <span>Taxes</span><span>₹{(histOrder.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black">
                      <span className="text-surface-100">Grand Total</span>
                      <span style={{ color: '#ea580c' }}>₹{parseFloat(histTotal).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex justify-end gap-3.5" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <button
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/invoice/${histOrder.id}`, '_blank')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4 text-slate-500" /> A4 Invoice
                </button>
                <button
                  onClick={() => printReceiptSilently(histOrder.id, histOrder)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs btn-orange shadow-md transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 text-white" /> Print Thermal (80mm)
                </button>
              </div>
            </div>
          );
        })() : (
          <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.08)' }}>
              <Printer className="w-10 h-10" style={{ color: 'rgba(15, 23, 42, 0.35)' }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-surface-100">Select a bill</h2>
              <p className="text-sm font-medium mt-1 max-w-xs" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>
                Click on an active order or history item to view details and process payment.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => setShowModal(false)} />
          <div className="w-full max-w-md rounded-3xl overflow-hidden animate-slide-up relative z-10"
               style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(30px)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <h3 className="font-black text-xl text-surface-100">Pay via {paymentType}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.5)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl flex justify-between items-center"
                   style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <span className="font-bold text-sm" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Total Due</span>
                <span className="text-3xl font-black gradient-text">₹{total.toFixed(2)}</span>
              </div>

              {/* Discount */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Discount <span style={{ color: 'rgba(15, 23, 42, 0.35)' }}>(Optional)</span>
                  </label>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setCheckoutDiscountType('flat'); setCheckoutDiscountValue(0); }}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${checkoutDiscountType === 'flat' ? 'bg-white text-orange-650 shadow-sm' : 'text-slate-500'}`}
                    >
                      Flat (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCheckoutDiscountType('percent'); setCheckoutDiscountValue(0); }}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${checkoutDiscountType === 'percent' ? 'bg-white text-orange-655 shadow-sm' : 'text-slate-500'}`}
                    >
                      Percent (%)
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-450">
                    {checkoutDiscountType === 'flat' ? '₹' : '%'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={checkoutDiscountType === 'flat' ? subtotal : 100}
                    value={checkoutDiscountValue || ''}
                    onChange={(e) => setCheckoutDiscountValue(Number(e.target.value))}
                    className="glass-input w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium"
                    placeholder={checkoutDiscountType === 'flat' ? 'Enter rupees discount' : 'Enter percentage e.g. 10'}
                  />
                </div>
                {checkoutDiscountType === 'percent' && checkoutDiscountValue > 0 && (
                  <p className="text-[10px] font-black text-emerald-600 mt-1">
                    Equivalent Discount: -₹{discountAmount.toFixed(2)}
                  </p>
                )}
              </div>

              {[
                { label: 'Customer Name', type: 'text', icon: User, val: checkoutName, set: setCheckoutName, placeholder: 'Rahul Sharma' },
                { label: 'Mobile Number', type: 'tel', icon: Phone, val: checkoutPhone, set: setCheckoutPhone, placeholder: '9876543210' },
              ].map(({ label, type, icon: Icon, val, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>
                    {label} <span style={{ color: 'rgba(15, 23, 42, 0.35)' }}>(Optional)</span>
                  </label>
                  <div className="relative">
                    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(15, 23, 42, 0.35)' }} />
                    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                      className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.55)' }}>Cancel</button>
              <button onClick={handleConfirmPayment} className="btn-orange flex-1 py-3 rounded-xl text-sm">
                <span className="relative z-10">Confirm Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isAuthModalOpen && (
        <ManagerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          itemName={itemToCancel?.name || ''}
          role={user?.role}
          requirePin={false} // Food item deletion does NOT require PIN
          onConfirm={(reason) => {
            deleteActiveOrderItem(itemToCancel.orderId, itemToCancel.itemId, reason, user?.name || 'Cashier');
          }}
        />
      )}
      {showOrderCancelModal && (
        <ManagerAuthModal
          isOpen={showOrderCancelModal}
          onClose={() => setShowOrderCancelModal(false)}
          itemName={`Order #${selectedOrderId} (All Items)`}
          role={user?.role}
          requirePin={true} // Entire order cancel REQUIRES PIN
          onConfirm={(reason) => {
            cancelEntireOrder(selectedOrderId, reason, user?.name || 'Cashier');
            setSelectedOrderId(null);
          }}
        />
      )}

      {/* History Discount Edit Modal */}
      {showHistoryDiscountModal && historyDiscountOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => setShowHistoryDiscountModal(false)} />
          <div className="w-full max-w-md rounded-3xl overflow-hidden animate-slide-up relative z-10"
               style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(30px)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }} />
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <h3 className="font-black text-xl text-surface-100">Update Bill Discount</h3>
              <button onClick={() => setShowHistoryDiscountModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.5)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="p-4 rounded-2xl flex justify-between items-center"
                   style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                <span className="font-bold text-sm text-slate-700">Subtotal</span>
                <span className="text-xl font-black text-slate-800">₹{historyDiscountOrder.subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Discount Amount
                  </label>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setHistoryDiscountType('flat'); setHistoryDiscountValue(0); }}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${historyDiscountType === 'flat' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      Flat (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHistoryDiscountType('percent'); setHistoryDiscountValue(0); }}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${historyDiscountType === 'percent' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      Percent (%)
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    {historyDiscountType === 'flat' ? '₹' : '%'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={historyDiscountType === 'flat' ? historyDiscountOrder.subtotal : 100}
                    value={historyDiscountValue || ''}
                    onChange={(e) => setHistoryDiscountValue(Number(e.target.value))}
                    className="glass-input w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium"
                    placeholder={historyDiscountType === 'flat' ? 'Enter rupees discount' : 'Enter percentage e.g. 10'}
                  />
                </div>
                {historyDiscountType === 'percent' && historyDiscountValue > 0 && (
                  <p className="text-[10px] font-black text-emerald-600 mt-1">
                    Equivalent Discount: -₹{((historyDiscountOrder.subtotal * historyDiscountValue) / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {/* GST Checkbox */}
              <div className="flex justify-between items-center p-3 rounded-2xl text-left"
                   style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Apply GST ({restaurantDetails?.tax_percent || 5}%)</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Recalculate tax with new discount</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={historyApplyGst} 
                  onChange={(e) => setHistoryApplyGst(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  style={{ accentColor: '#10b981' }}
                />
              </div>
            </div>

            <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <button onClick={() => setShowHistoryDiscountModal(false)} className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.55)' }}>Cancel</button>
              <button 
                onClick={async () => {
                  const finalDiscount = historyDiscountType === 'percent' 
                    ? Number(((historyDiscountOrder.subtotal * historyDiscountValue) / 100).toFixed(2)) 
                    : Number(historyDiscountValue || 0);
                  await updateHistoryOrderDiscount(historyDiscountOrder.id, finalDiscount, historyApplyGst);
                  setShowHistoryDiscountModal(false);
                  
                  // Automatically trigger silent print update
                  const updatedOrderObj = {
                    ...historyDiscountOrder,
                    discount_amount: finalDiscount,
                    tax_amount: historyApplyGst ? (historyDiscountOrder.subtotal - finalDiscount) * ((restaurantDetails?.tax_percent || 5) / 100) : 0,
                    total_amount: (historyDiscountOrder.subtotal - finalDiscount) + (historyApplyGst ? (historyDiscountOrder.subtotal - finalDiscount) * ((restaurantDetails?.tax_percent || 5) / 100) : 0),
                  };
                  printReceiptSilently(historyDiscountOrder.id, updatedOrderObj);
                }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 shadow-md cursor-pointer"
              >
                Save & Print Updated Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
