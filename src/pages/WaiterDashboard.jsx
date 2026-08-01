import { useState, useEffect, useRef } from 'react';
import { usePosStore, socket } from '../store/posStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import {
  Plus, Minus, Trash2, Send, Clock, Flame, CheckCircle2,
  History, Banknote, CreditCard, User, Phone, X, Coffee,
  Receipt, ShoppingBag, Bike, ChevronDown, ArrowLeft, IndianRupee
} from 'lucide-react';
import WaiterPaymentHistory from '../components/waiter/WaiterPaymentHistory';
import NotificationPanel from '../components/common/NotificationPanel';
import ManagerAuthModal from '../components/common/ManagerAuthModal';
import { formatTimeIST, formatDateKeyIST, todayIST } from '../utils/formatIST';

export default function WaiterDashboard() {
  const { user } = useAuthStore();
  const {
    tables, locations, categories, menuItems, orders, orderHistory,
    activeTableId, setActiveTableId,
    cart, addToCart, removeFromCart, updateCartQuantity, clearCart, placeOrder, checkoutOrder,
    deleteActiveOrderItem, updateActiveOrderItemQuantity, cancelEntireOrder, transferTable, updateCartItemNotes
  } = usePosStore();

  const { activeLocationTab, setActiveLocationTab, activeCategoryTab, setActiveCategoryTab, mobileView, setMobileView } = useUiStore();

  useEffect(() => {
    if (locations.length > 0) {
      const saved = localStorage.getItem('selectedLocationId');
      if (!saved) {
        setActiveLocationTab(locations[0].id);
      } else {
        const savedId = parseInt(saved, 10);
        if (!locations.some(l => l.id === savedId)) {
          setActiveLocationTab(locations[0].id);
        }
      }
    }
  }, [locations, setActiveLocationTab]);

  const [rightTab, setRightTab] = useState('new');
  const [showTablesMobile, setShowTablesMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [orderType, setOrderType] = useState('dine_in');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const getTableRunningTime = (tableId) => {
    const order = orders.find(o => o.table_id === tableId && o.status === 'open');
    if (!order) return null;
    
    const start = new Date(order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30').getTime();
    const diffMs = currentTime - start;
    if (diffMs < 0) return '0m';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };
  const [takeawayName, setTakeawayName] = useState('');
  const [takeawayPhone, setTakeawayPhone] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentType, setPaymentType] = useState('Cash');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState(null);
  const [showOrderCancelModal, setShowOrderCancelModal] = useState(false);

  const [menuSearch, setMenuSearch] = useState('');

  // Table transfer modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const longPressTimerRef = useRef(null);

  const handleTableLongPressStart = (table) => {
    if (table.status !== 'occupied') return;
    longPressTimerRef.current = setTimeout(() => {
      setTransferSourceTable(table);
      setShowTransferModal(true);
    }, 650);
  };

  const handleTableLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmTransfer = async (targetTable) => {
    const sourceOrder = orders.find(o => o.table_id === transferSourceTable.id && o.status === 'open');
    if (!sourceOrder) {
      toast.error('No active order found on this table');
      return;
    }

    setIsTransferring(true);
    try {
      await transferTable(transferSourceTable.id, targetTable.id, sourceOrder.id, user?.name || 'Waiter');
      setActiveTableId(targetTable.id);
      setRightTab('active');
      setShowTransferModal(false);
    } catch (err) {
      toast.error('Failed to transfer table');
    } finally {
      setIsTransferring(false);
    }
  };

  const filteredTables = tables.filter(t => t.location_id === activeLocationTab);
  const activeTable = tables.find(t => t.id === activeTableId);
  
  // Filter menu: search globally across all categories if query exists, else filter by active category tab
  const filteredMenu = menuItems.filter(m => {
    const query = menuSearch.trim();
    if (query !== '') {
      return m.name.toLowerCase().includes(query.toLowerCase()) && m.is_available;
    }
    return m.category_id === activeCategoryTab && m.is_available;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const activeOrder = orderType === 'dine_in' ? orders.find(o => o.table_id === activeTableId && o.status === 'open') : null;
  const canOrder = orderType === 'dine_in' ? !!activeTableId : true;

  const handleCheckoutClick = (type) => { setPaymentType(type); setShowCheckoutModal(true); };
  const handleConfirmPayment = () => {
    if (activeOrder) {
      checkoutOrder(activeOrder.id, paymentType, checkoutName, checkoutPhone, user?.id);
      setShowCheckoutModal(false);
      setCheckoutName(''); setCheckoutPhone(''); setRightTab('new');
    }
  };
  const handlePlaceOrder = () => {
    placeOrder(user?.id, orderType, takeawayName, takeawayPhone);
    if (orderType === 'dine_in') setRightTab('active');
    else { setTakeawayName(''); setTakeawayPhone(''); }
  };

  const ORDER_TYPES = [
    { id: 'dine_in', label: 'Dine-In', icon: Coffee, color: '#fb923c' },
    { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag, color: '#a78bfa' },
    { id: 'delivery', label: 'Delivery', icon: Bike, color: '#34d399' },
  ];

  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:overflow-hidden relative font-sans"
         style={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* Mobile Floating "Send to Kitchen" shortcut */}
      {cart.length > 0 && mobileView === 'menu' && (
        <button
          onClick={() => { setMobileView('cart'); setRightTab('new'); }}
          className="fixed bottom-36 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full text-white font-black text-xs shadow-lg animate-pulse-glow lg:hidden"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
          }}
        >
          <Send className="w-4 h-4" />
          <span>Send to Kitchen ({cart.length})</span>
        </button>
      )}



      {/* ══════════ LEFT PANEL ══════════ */}
      <div className={`flex-1 flex flex-col min-w-0 lg:h-full z-10 ${mobileView === 'menu' ? 'flex' : 'hidden lg:flex'}`}>

        {/* Header: Locations + Tables */}
        <div className="sticky top-0 z-20 shrink-0 p-4 lg:p-5 space-y-4"
             style={panelStyle}>

          {/* Mobile Selected Table Banner (Collapsible) */}
          {activeTableId && !showTablesMobile && (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-100/70 p-3 rounded-2xl animate-fade-in lg:hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-orange-600 block leading-none">Active Table</span>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>Table {tables.find(t => t.id === activeTableId)?.table_number || '?'} {locations.find(l => l.id === tables.find(t => t.id === activeTableId)?.location_id)?.name ? `(${locations.find(l => l.id === tables.find(t => t.id === activeTableId)?.location_id)?.name})` : ''}</span>
                    {tables.find(t => t.id === activeTableId)?.status === 'occupied' && getTableRunningTime(activeTableId) && (
                      <span className="text-xs font-black text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md shrink-0">
                        ⏱️ {getTableRunningTime(activeTableId)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowTablesMobile(true)}
                className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-xl text-[10px] uppercase transition-colors active:scale-95 shrink-0"
              >
                Change Table
              </button>
            </div>
          )}

          {/* Full Grid Container (hidden on mobile when table is selected and collapsed) */}
          <div className={`${(activeTableId && !showTablesMobile) ? 'hidden lg:block' : 'block'} space-y-4 max-h-[190px] overflow-y-auto pr-1.5 custom-scrollbar`}>
            {locations.map(loc => {
              const locTables = tables.filter(t => t.location_id === loc.id);
              if (locTables.length === 0) return null;
              return (
                <div key={loc.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-1 h-3.5 rounded bg-orange-500 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">{loc.name}</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10 gap-2.5">
                    {locTables.map(t => {
                      const isSelected = activeTableId === t.id;
                      const isOccupied = t.status === 'occupied';

                      const handleStart = () => handleTableLongPressStart(t);
                      const handleEnd = () => handleTableLongPressEnd();

                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setActiveTableId(t.id);
                            setShowTablesMobile(false); // Collapse grid on mobile
                            if (t.status === 'occupied') setRightTab('active');
                            else setRightTab('new');
                          }}
                          onMouseDown={handleStart}
                          onMouseUp={handleEnd}
                          onMouseLeave={handleEnd}
                          onTouchStart={handleStart}
                          onTouchEnd={handleEnd}
                          className="relative p-3 rounded-xl text-center transition-all duration-300 hover-lift select-none"
                          style={isSelected ? {
                            background: 'rgba(249,115,22,0.12)',
                            border: '2px solid rgba(249,115,22,0.55)',
                            boxShadow: '0 0 20px rgba(249,115,22,0.12)'
                          } : isOccupied ? {
                            background: 'rgba(251,191,36,0.08)',
                            border: '1px solid rgba(251,191,36,0.25)'
                          } : {
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(0,0,0,0.06)'
                          }}
                        >
                          <span className="block text-lg font-black"
                            style={{ color: isSelected ? '#ea580c' : isOccupied ? '#b45309' : 'rgba(15,23,42,0.8)' }}>
                            {t.table_number}
                          </span>
                          
                          {isOccupied ? (
                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                              <span className="text-[9px] uppercase tracking-wider font-black text-amber-600 block">
                                ● Busy
                              </span>
                              {getTableRunningTime(t.id) && (
                                <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 mt-0.5">
                                  ⏱️ {getTableRunningTime(t.id)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mt-0.5">
                              ○ Free
                            </span>
                          )}

                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center animate-pulse-glow"
                                 style={{ background: '#f97316' }}>
                               <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Section */}
        <div className={`flex-1 flex flex-col min-h-[400px] lg:min-h-0 transition-all duration-300 ${!canOrder ? 'opacity-30 pointer-events-none' : ''}`}>

          {/* Category bar + Search Input */}
          <div className="sticky top-0 z-10 px-4 lg:px-5 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 flex-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryTab(cat.id)}
                  className="px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 shrink-0"
                  style={activeCategoryTab === cat.id ? {
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: 'white',
                    boxShadow: '0 3px 12px rgba(249,115,22,0.4)'
                  } : {
                    background: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    color: 'rgba(15, 23, 42, 0.5)'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            
            {/* Real-time search bar */}
            <div className="relative w-full sm:w-72 group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="glass-input w-full pl-9 pr-9 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/80 transition-all shadow-sm"
              />
              {menuSearch && (
                <button 
                  onClick={() => setMenuSearch('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200/60 hover:bg-slate-200 text-[10px] text-slate-500 font-bold hover:scale-105 active:scale-95 transition-all"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-4 pb-28 lg:p-5 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredMenu.map(item => (
                <button
                  key={item.id}
                  onClick={() => { addToCart(item); setRightTab('new'); }}
                  className="menu-item-card flex flex-col text-left p-4 rounded-2xl group"
                >
                  {/* Price badge */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}>
                      ₹{item.price}
                    </span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0, 0, 0, 0.08)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(249,115,22,0.2)';
                        e.currentTarget.style.border = '1px solid rgba(249,115,22,0.4)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                        e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      <Plus className="w-4 h-4" style={{ color: '#ea580c' }} />
                    </div>
                  </div>
                  <span className="font-bold text-sm text-surface-100 line-clamp-2 leading-tight block w-full group-hover:text-orange-600 transition-colors">
                    {item.name}
                  </span>
                  <span className="text-xs mt-1 line-clamp-2 leading-snug text-surface-400">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL: Cart ══════════ */}
      <div className={`w-full lg:w-[380px] flex flex-col shrink-0 lg:h-full z-20 ${mobileView === 'cart' ? 'flex h-[calc(100vh-60px)] pb-20' : 'hidden lg:flex'}`}
           style={{ ...panelStyle, borderLeft: '1px solid rgba(0,0,0,0.08)' }}>

        {/* Cart Header */}
        <div className="shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-surface-100 flex items-center gap-2">
              {mobileView === 'cart' && (
                <button
                  onClick={() => setMobileView('menu')}
                  className="mr-1 p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 lg:hidden transition-colors flex items-center justify-center"
                  aria-label="Back to menu"
                >
                  <ArrowLeft className="w-5 h-5 text-orange-600" />
                </button>
              )}
              Order
              {orderType === 'dine_in' && activeTable && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-bold"
                  style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}>
                  T-{activeTable.table_number}
                </span>
              )}
              {orderType !== 'dine_in' && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-bold"
                  style={orderType === 'takeaway' ? { background: 'rgba(167,139,250,0.1)', color: '#6d28d9', border: '1px solid rgba(167,139,250,0.2)' }
                                                  : { background: 'rgba(52,211,153,0.1)', color: '#047857', border: '1px solid rgba(52,211,153,0.2)' }}>
                  {orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                </span>
              )}
            </h2>
            <NotificationPanel />
          </div>

          {/* Tabs */}
          <div className="flex px-5 gap-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <button
              onClick={() => setRightTab('new')}
              className={`pb-3 text-xs font-black transition-all ${rightTab === 'new' ? 'tab-active' : 'tab-inactive'}`}
            >
              Selected Food{' '}
              {cart.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px]"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab('active')}
              className={`pb-3 text-xs font-black transition-all ${rightTab === 'active' ? 'tab-active' : 'tab-inactive'}`}
            >
              Active Billing
            </button>
            <button
              onClick={() => setRightTab('history')}
              className={`pb-3 text-xs font-black transition-all ${rightTab === 'history' ? 'tab-active' : 'tab-inactive'}`}
            >
              History
            </button>
          </div>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
          {!canOrder && rightTab !== 'history' ? (
            <div className="p-4 space-y-4">
              <p className="text-sm font-bold text-center text-slate-500">Select a Table to View/Active Billing</p>
              
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                {locations.map(loc => {
                  const locTables = tables.filter(t => t.location_id === loc.id);
                  if (locTables.length === 0) return null;
                  return (
                    <div key={loc.id} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="w-1 h-3.5 rounded bg-orange-500 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{loc.name}</h4>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {locTables.map(t => {
                          const isOccupied = t.status === 'occupied';
                          
                          const handleStart = () => handleTableLongPressStart(t);
                          const handleEnd = () => handleTableLongPressEnd();

                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                setActiveTableId(t.id);
                                if (t.status === 'occupied') setRightTab('active');
                                else setRightTab('new');
                              }}
                              onMouseDown={handleStart}
                              onMouseUp={handleEnd}
                              onMouseLeave={handleEnd}
                              onTouchStart={handleStart}
                              onTouchEnd={handleEnd}
                              className="p-3 rounded-xl text-center border border-slate-200 bg-white transition-all active:scale-95 shadow-sm select-none"
                            >
                              <span className="block text-base font-black text-slate-800">
                                {t.table_number}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {isOccupied ? '● Busy' : '○ Free'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : rightTab === 'new' ? (
            cart.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                  <Receipt className="w-8 h-8" style={{ color: 'rgba(15, 23, 42, 0.3)' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Cart is empty</p>
                <p className="text-xs" style={{ color: 'rgba(15, 23, 42, 0.4)' }}>Add items from the menu</p>
              </div>
            ) : (
              <div className="space-y-2.5 pb-4">
                {cart.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl flex flex-col gap-3 animate-fade-in transition-all"
                       style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-surface-100 text-sm line-clamp-2 leading-tight break-words">{item.name}</h4>
                        <span className="text-xs font-black mt-1 inline-block px-2 py-0.5 rounded-md"
                           style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>
                          ₹{item.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl p-1"
                           style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <button
                          onClick={() => item.quantity > 1 ? updateCartQuantity(item.menu_item_id, item.quantity - 1) : removeFromCart(item.menu_item_id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(15, 23, 42, 0.6)' }}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-surface-100 text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.menu_item_id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.menu_item_id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{ color: 'rgba(15, 23, 42, 0.4)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(15, 23, 42, 0.4)'; }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Instruction Comment Input */}
                    <div className="relative group/input">
                      <input 
                        type="text"
                        placeholder="Add special instructions (e.g. extra spicy)"
                        value={item.notes || ''}
                        onChange={(e) => updateCartItemNotes(item.menu_item_id, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 text-[11px] font-medium outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-slate-400">✍️</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : rightTab === 'active' ? (
            /* Active Bill Tab */
            !activeOrder || activeOrder.items.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                  <Receipt className="w-8 h-8" style={{ color: 'rgba(15, 23, 42, 0.3)' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>No active items</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in pb-4">
                {activeOrder.items.map((item, index) => (
                  <div key={item.id || index} className="p-4 rounded-2xl flex flex-col gap-3 transition-all"
                       style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-bold text-surface-100 text-sm break-words leading-tight">{item.name}</h4>
                        <span className="text-xs font-black mt-1 inline-block px-2 py-0.5 rounded-md"
                           style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>
                          ₹{item.price}
                        </span>
                        {item.notes && (
                          <div className="text-[10px] font-bold text-orange-600 mt-1.5 bg-orange-50/50 border border-orange-100/60 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                            <span>✍️</span>
                            <span className="italic">{item.notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-black text-surface-100 text-base">₹{item.quantity * item.price}</span>
                        <span className={`flex items-center gap-1 text-[9px] uppercase font-black px-2 py-0.5 rounded-md mt-1.5
                          ${item.status === 'pending' ? 'badge-pending' : item.status === 'cooking' ? 'badge-cooking' : 'badge-ready'}`}>
                          {item.status === 'pending' && <Clock className="w-2 h-2" />}
                          {item.status === 'cooking' && <Flame className="w-2 h-2" />}
                          {item.status === 'ready' && <CheckCircle2 className="w-2 h-2" />}
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Waiter Edit/Delete Controls for Sent KOT item */}
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/80">
                      <div className="flex items-center gap-2 rounded-xl p-1 bg-white border border-slate-200">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateActiveOrderItemQuantity(activeOrder.id, item.id, item.quantity - 1);
                            } else {
                              if (item.status === 'ready' || item.status === 'served') {
                                setItemToCancel({ orderId: activeOrder.id, itemId: item.id, name: item.name });
                                setIsAuthModalOpen(true);
                              } else {
                                deleteActiveOrderItem(activeOrder.id, item.id);
                              }
                            }
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-slate-50 hover:bg-slate-100 text-slate-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-surface-100 text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateActiveOrderItemQuantity(activeOrder.id, item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-orange-50 hover:bg-orange-100 text-orange-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (item.status === 'ready' || item.status === 'served') {
                            setItemToCancel({ orderId: activeOrder.id, itemId: item.id, name: item.name });
                            setIsAuthModalOpen(true);
                          } else {
                            deleteActiveOrderItem(activeOrder.id, item.id);
                          }
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* History Tab (Waiter Payment / Table History) */
            (() => {
              const myOrders = orderHistory.filter(o => o.user_id === user?.id);
              const today = todayIST();
              const todayOrders = myOrders.filter(o => formatDateKeyIST(o.created_at) === today);

              return todayOrders.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                       style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                    <Receipt className="w-8 h-8" style={{ color: 'rgba(15, 23, 42, 0.3)' }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>No history today</p>
                </div>
              ) : (
                <div className="space-y-2.5 animate-fade-in pb-4">
                  {todayOrders.map(order => (
                    <div key={order.id} className="p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 bg-white shadow-sm transition-all hover:border-orange-200">
                      <div>
                        <h4 className="font-bold text-surface-100 text-sm">
                          {order.order_type === 'dine_in' ? `Table ${order.table_number || '-'}` : 'Walk-In'}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatTimeIST(order.created_at)} • {order.payment_type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-surface-100 text-sm">₹{((order.subtotal || 0) + (order.tax_amount || 0)).toFixed(0)}</div>
                        <div className="text-[9px] text-slate-400">#{order.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* Cart Footer */}
        <div className="shrink-0 p-4 lg:p-5 z-30"
             style={{ borderTop: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
          {rightTab === 'new' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Subtotal</span>
                <span className="text-2xl font-black text-surface-100">₹{cartTotal}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(15, 23, 42, 0.55)' }}
                >
                  Clear
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0}
                  className="btn-orange flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-40"
                >
                  <span className="relative z-10">Send to Kitchen</span>
                  <Send className="w-4 h-4 relative z-10" />
                </button>
              </div>
            </>
          ) : rightTab === 'active' ? (
            <>
              {activeOrder && (
                <button
                  onClick={() => {
                    socket.emit('request_remote_print', {
                      orderId: activeOrder.id,
                      orderObj: {
                        ...activeOrder,
                        payment_type: 'ESTIMATE / UNPAID',
                        is_estimate: true
                      }
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl font-black text-xs transition-all border border-orange-200 text-orange-600 bg-orange-50/50 hover:bg-orange-100/60 active:scale-95 shadow-sm"
                >
                  <Receipt className="w-4 h-4 shrink-0" />
                  <span>Print Customer Bill (Unpaid)</span>
                </button>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Total Due</span>
                <span className="text-2xl font-black" style={{ color: '#ea580c' }}>₹{activeOrder?.subtotal || 0}</span>
              </div>
              {activeOrder && activeOrder.items.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Cash', type: 'Cash', icon: Banknote, color: '#047857', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
                    { label: 'UPI', type: 'UPI', icon: CreditCard, color: '#6d28d9', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
                  ].map(({ label, type, icon: Icon, color, bg, border }) => (
                    <button
                      key={type}
                      onClick={() => handleCheckoutClick(type)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl font-black text-sm transition-all hover-lift active:scale-95"
                      style={{ background: bg, border: `1px solid ${border}`, color }}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCheckoutClick('Card')}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl font-black text-sm transition-all hover-lift active:scale-95"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#1d4ed8' }}
                  >
                    <CreditCard className="w-4 h-4" /> Card Payment
                  </button>

                  {/* Cancel Entire Order (Manager Authorization Required) */}
                  <button
                    onClick={() => setShowOrderCancelModal(true)}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 mt-1.5 rounded-xl font-black text-xs border border-red-200 text-red-650 hover:bg-red-50 transition-all active:scale-95"
                  >
                    Cancel Entire Order
                  </button>
                </div>
              )}
            </>
          ) : (
            /* History Tab Footer */
            (() => {
              const myOrders = orderHistory.filter(o => o.user_id === user?.id);
              const today = todayIST();
              const todayOrders = myOrders.filter(o => formatDateKeyIST(o.created_at) === today);
              const totalToday = todayOrders.reduce((sum, o) => sum + (Number(o.subtotal || 0) + Number(o.tax_amount || 0)), 0);

              return (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>Today's Collection</span>
                    <span className="text-xl font-black text-orange-600">₹{totalToday.toFixed(0)}</span>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 transition-all hover:bg-slate-800"
                  >
                    <History className="w-4 h-4" /> Detailed Stats Summary
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && <WaiterPaymentHistory onClose={() => setShowHistoryModal(false)} />}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => setShowCheckoutModal(false)} />
          <div className="w-full max-w-md rounded-3xl overflow-hidden animate-slide-up relative z-10"
               style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(30px)' }}>

            {/* Orange top bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />

            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <h3 className="font-black text-xl text-surface-100">Pay via {paymentType}</h3>
              <button onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.5)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl flex justify-between items-center" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <span className="font-bold text-sm" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Total Amount</span>
                <span className="text-3xl font-black" style={{ color: '#ea580c' }}>₹{activeOrder?.subtotal}</span>
              </div>

              {[
                { label: 'Customer Name', placeholder: 'Rahul Sharma', type: 'text', icon: User, val: checkoutName, set: setCheckoutName },
                { label: 'Mobile Number', placeholder: '9876543210', type: 'tel', icon: Phone, val: checkoutPhone, set: setCheckoutPhone },
              ].map(({ label, placeholder, type, icon: Icon, val, set }) => (
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
              <button onClick={() => setShowCheckoutModal(false)}
                className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(15, 23, 42, 0.55)' }}>
                Cancel
              </button>
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
            deleteActiveOrderItem(itemToCancel.orderId, itemToCancel.itemId, reason, user?.name || 'Waiter');
          }}
        />
      )}
      {showOrderCancelModal && (
        <ManagerAuthModal
          isOpen={showOrderCancelModal}
          onClose={() => setShowOrderCancelModal(false)}
          itemName={`Order #${activeOrder?.id} (All Items)`}
          role={user?.role}
          requirePin={true} // Entire order cancel REQUIRES PIN
          onConfirm={(reason) => {
            cancelEntireOrder(activeOrder?.id, reason, user?.name || 'Waiter');
            setActiveTableId(null);
          }}
        />
      )}
      {/* Table Transfer Modal */}
      {showTransferModal && transferSourceTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => { if (!isTransferring) setShowTransferModal(false); }} />
          <div className="w-full max-w-md rounded-3xl overflow-hidden animate-slide-up relative z-10"
               style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(30px)' }}>

            {/* Top border */}
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-500" />

            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <div>
                <h3 className="font-black text-lg text-slate-800">Transfer Table</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Move orders from Table {transferSourceTable.table_number}</p>
              </div>
              <button 
                disabled={isTransferring}
                onClick={() => setShowTransferModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Destination Table
              </label>

              {/* Free tables selection grid */}
              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                {locations.map(loc => {
                  const freeTables = tables.filter(t => t.location_id === loc.id && t.status === 'available');
                  if (freeTables.length === 0) return null;
                  return (
                    <div key={loc.id} className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 px-1">{loc.name}</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {freeTables.map(t => (
                          <button
                            key={t.id}
                            disabled={isTransferring}
                            onClick={() => handleConfirmTransfer(t)}
                            className="p-3 rounded-xl text-center border border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50/30 transition-all font-black text-sm text-slate-700 active:scale-95"
                          >
                            {t.table_number}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {tables.filter(t => t.status === 'available').length === 0 && (
                  <p className="text-xs font-bold text-center text-slate-500 py-4">No available free tables to transfer to.</p>
                )}
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3 bg-slate-50" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <button 
                disabled={isTransferring}
                onClick={() => setShowTransferModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
