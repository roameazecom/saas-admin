import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePosStore } from '../store/posStore';
import {
  Plus, Minus, Trash2, Send, Clock, Flame, CheckCircle2,
  Coffee, Receipt, ShoppingBag, ArrowLeft, LogOut, PhoneCall,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIST } from '../utils/formatIST';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const {
    categories, menuItems, orders,
    activeTableId, setActiveTableId,
    cart, addToCart, removeFromCart, updateCartQuantity, clearCart, placeOrder,
    callWaiter, restaurantDetails, fetchData
  } = usePosStore();

  const [customer, setCustomer] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState(null);
  const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'cart' | 'bill'
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [billTab, setBillTab] = useState('active'); // 'active' | 'history'

  const fetchCustomerHistory = async (phoneNum) => {
    const phone = phoneNum || customer?.phone;
    if (!phone) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/orders/customer/history?phone=${phone}`);
      setHistoryOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  useEffect(() => {
    fetchData();
    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/customer/login');
      return;
    }
    const parsed = JSON.parse(session);
    setCustomer(parsed);
    setActiveTableId(parsed.table_id);
    fetchCustomerHistory(parsed.phone);
  }, [fetchData, navigate, setActiveTableId]);

  useEffect(() => {
    if (mobileView === 'bill' && billTab === 'history') {
      fetchCustomerHistory();
    }
  }, [mobileView, billTab]);

  // Set default category tab if not set
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryTab) {
      setActiveCategoryTab(categories[0].id);
    }
  }, [categories, activeCategoryTab]);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  // Filter menu
  const filteredMenu = menuItems.filter(m => {
    const query = menuSearch.trim();
    if (query !== '') {
      return m.name.toLowerCase().includes(query.toLowerCase()) && m.is_available;
    }
    return m.category_id === activeCategoryTab && m.is_available;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const activeOrder = orders.find(o => o.table_id === customer.table_id && o.status === 'open');

  const handleCallWaiter = () => {
    if (callingWaiter) return;
    setCallingWaiter(true);
    callWaiter(customer.table_id, customer.table_number, customer.location_id);
    toast.success('🛎️ Waiter has been called to your table!', { duration: 5000 });
    setTimeout(() => setCallingWaiter(false), 10000); // rate limit 10s
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    placeOrder(null, 'dine_in', customer.name, customer.phone);
    setMobileView('bill');
  };

  const handleLogout = () => {
    if (window.confirm("Do you want to log out from this table session?")) {
      localStorage.removeItem('customer_session');
      navigate('/customer/login');
    }
  };

  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:overflow-hidden relative font-sans"
         style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '70px' }}>

      {/* Header Bar */}
      <div className="sticky top-0 z-30 w-full glass-panel border-x-0 border-t-0 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-orange-500 text-white font-black shadow-md shadow-orange-500/20">
            {customer.table_number}
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800">Table {customer.table_number}</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Hello, {customer.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Call Waiter Button */}
          <button
            onClick={handleCallWaiter}
            disabled={callingWaiter}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-sm transition-all duration-300 ${
              callingWaiter 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 animate-pulse'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Waiter</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Switcher (Menu vs Cart vs Active Bill) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface-900 border border-surface-700/80 shadow-lg rounded-2xl p-1.5 flex gap-2">
        <button
          onClick={() => setMobileView('menu')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mobileView === 'menu' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            mobileView === 'cart' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Cart
          {cart.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileView('bill')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            mobileView === 'bill' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          My Bill
          {activeOrder && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* ══════════ MENU VIEW ══════════ */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'menu' ? 'flex' : 'hidden'}`}>
        
        {/* Search and Categories */}
        <div className="sticky top-[60px] z-20 p-4 space-y-3 bg-white/95 backdrop-blur-md border-b border-slate-100">
          {/* Search bar */}
          <div className="relative w-full group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search dishes..."
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

          {/* Categories select slider */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryTab(cat.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 shrink-0"
                style={activeCategoryTab === cat.id ? {
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: 'white',
                  boxShadow: '0 3px 12px rgba(249,115,22,0.3)'
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
        </div>

        {/* Menu items list */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                onClick={() => { addToCart(item); toast.success(`Added ${item.name}`); }}
                className="menu-item-card flex flex-col text-left p-4 rounded-2xl group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg"
                    style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}>
                    ₹{item.price}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                    <Plus className="w-4 h-4 text-orange-500" />
                  </div>
                </div>
                <span className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight block w-full group-hover:text-orange-600 transition-colors">
                  {item.name}
                </span>
                <span className="text-xs mt-1 line-clamp-2 leading-snug text-slate-400">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Floating Add-to-Cart summary if cart has items */}
        {cart.length > 0 && (
          <div className="fixed bottom-20 right-4 z-40">
            <button
              onClick={() => setMobileView('cart')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full text-white font-black text-xs shadow-lg animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
              }}
            >
              <Send className="w-4 h-4" />
              <span>Review & Place Order ({cart.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ══════════ CART VIEW ══════════ */}
      <div className={`flex-1 flex flex-col p-4 ${mobileView === 'cart' ? 'flex' : 'hidden'}`}>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex-1 flex flex-col min-h-[450px]">
          
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black text-slate-800">Your Cart</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-500">Your cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Explore our delicious menu items!</p>
                <button
                  onClick={() => setMobileView('menu')}
                  className="mt-4 px-5 py-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-xl"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="p-3.5 rounded-2xl flex items-center justify-between gap-3 bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight break-words">{item.name}</h4>
                    <span className="text-xs font-black text-orange-600">₹{item.price}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 p-1">
                    <button
                      onClick={() => item.quantity > 1 ? updateCartQuantity(item.menu_item_id, item.quantity - 1) : removeFromCart(item.menu_item_id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <span className="font-black text-slate-800 text-sm min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-600" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.menu_item_id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Amount</span>
                <span className="text-xl font-black text-slate-800">₹{cartTotal}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="px-4 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handlePlaceOrder}
                  className="flex-1 btn-orange flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black shadow-md"
                >
                  <span>Send order to Kitchen</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ BILL & KOT VIEW ══════════ */}
      <div className={`flex-1 flex flex-col p-4 ${mobileView === 'bill' ? 'flex' : 'hidden'}`}>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex-1 flex flex-col min-h-[450px]">
          
          <div className="flex px-2 gap-4 border-b border-slate-100 mb-4 shrink-0">
            <button
              onClick={() => setBillTab('active')}
              className={`pb-2.5 text-sm font-black transition-all ${billTab === 'active' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}
            >
              Active Bill
            </button>
            <button
              onClick={() => setBillTab('history')}
              className={`pb-2.5 text-sm font-black transition-all ${billTab === 'history' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}
            >
              Order History
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 animate-fade-in">
            {billTab === 'active' ? (
              !activeOrder || activeOrder.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No active bill for this table</p>
                  <p className="text-xs text-slate-400 mt-1">Orders you send to the kitchen will appear here.</p>
                  <button
                    onClick={() => setMobileView('menu')}
                    className="mt-4 px-5 py-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-xl"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* Active items status */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kitchen Status</p>
                    {activeOrder.items.map((item, index) => (
                      <div key={item.id || index} className="p-3 rounded-2xl flex items-center justify-between bg-slate-50 border border-slate-100">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            Qty: {item.quantity} × ₹{item.price}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-slate-850 text-sm">₹{item.quantity * item.price}</span>
                          <span className={`flex items-center gap-1 text-[9px] uppercase font-black px-1.5 py-0.5 rounded
                            ${item.status === 'pending' ? 'badge-pending' : item.status === 'cooking' ? 'badge-cooking' : 'badge-ready'}`}>
                            {item.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                            {item.status === 'cooking' && <Flame className="w-2.5 h-2.5" />}
                            {item.status === 'ready' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal summary */}
                  <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-400">Items Subtotal</span>
                      <span className="text-sm font-bold text-slate-800">₹{activeOrder.subtotal}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-400">CGST & SGST</span>
                      <span className="text-sm font-bold text-slate-850">₹{activeOrder.tax_amount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-sm font-black text-slate-800">Total Amount Due</span>
                      <span className="text-xl font-black text-orange-600">₹{activeOrder.total_amount || activeOrder.subtotal}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                        window.open(`${API_URL}/reports/invoice/${activeOrder.id}`, '_blank');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-all shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Print Current Bill Estimate</span>
                    </button>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center mt-4">
                    <p className="text-[11px] text-amber-800 font-bold">
                      Please call your waiter or visit the reception to close the bill and complete the payment.
                    </p>
                  </div>
                </>
              )
            ) : (
              /* History Tab */
              historyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No past orders found</p>
                  <p className="text-xs text-slate-400 mt-1">Your settled orders will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-12">
                  {historyOrders.map(order => (
                    <div key={order.id} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Order #{order.id}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatIST(order.created_at)}
                          </p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1.5">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-semibold text-slate-600">
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</span>
                          <p className="text-sm font-black text-slate-800">₹{order.total_amount || order.subtotal}</p>
                        </div>
                        <button
                          onClick={() => {
                            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                            window.open(`${API_URL}/reports/invoice/${order.id}`, '_blank');
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
