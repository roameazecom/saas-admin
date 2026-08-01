import { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Clock, CheckCircle2, ChefHat, History, Flame, Check, Search, ShoppingBag, Bike, Package, X } from 'lucide-react';
import NotificationPanel from '../components/common/NotificationPanel';
import { formatIST } from '../utils/formatIST';
import ServerConfigModal from '../components/common/ServerConfigModal';

export default function KDS() {
  const { orders, orderHistory, updateItemStatus, updateKotStatus, tables, locations, inventoryItems, logInventoryUsage, socketConnected, audioUnlocked, unlockAudio } = usePosStore();
  const [activeTab, setActiveTab] = useState('active');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [historySearch, setHistorySearch] = useState('');
  const [kitchenSearch, setKitchenSearch] = useState('');
  const [loggingItemId, setLoggingItemId] = useState(null);
  const [useQty, setUseQty] = useState('');
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const count = prev + 1;
      if (count >= 3) {
        setIsServerModalOpen(true);
        return 0;
      }
      return count;
    });
    if (window.logoClickTimeout) clearTimeout(window.logoClickTimeout);
    window.logoClickTimeout = setTimeout(() => {
      setLogoClicks(0);
    }, 4000);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeTickets = [];
  const historyTickets = [];
  const allOrdersForKDS = [...orders, ...(orderHistory || [])];

  allOrdersForKDS.forEach(order => {
    const table = tables.find(t => t.id === order.table_id);
    const location = table ? locations.find(l => l.id === table.location_id) : null;
    const kots = {};
    order.items.forEach(item => {
      const kotId = item.kot_id || `Legacy-${order.id}`;
      const isoStr = order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30';
      const orderTimestamp = new Date(isoStr).getTime();
      if (!kots[kotId]) kots[kotId] = { items: [], timestamp: orderTimestamp };
      kots[kotId].items.push(item);
    });

    Object.entries(kots).forEach(([kotId, data]) => {
      const isHistory = data.items.every(i => i.status === 'ready' || i.status === 'served');
      const orderTypeDisplay = order.order_type === 'takeaway' ? 'Takeaway' :
        order.order_type === 'delivery' ? 'Delivery' : `Table ${table?.table_number || '?'}`;
      const ticket = {
        orderId: order.id, orderType: order.order_type, tableNumber: orderTypeDisplay,
        areaName: location ? location.name : '',
        kotId, items: data.items, timestamp: data.timestamp,
        waiterName: order.waiter_name || 'Admin', customerName: order.customer_name
      };
      if (order.status !== 'cancelled' && !isHistory) activeTickets.push(ticket);
      else if (isHistory && data.items.length > 0) historyTickets.push(ticket);
    });
  });

  activeTickets.sort((a, b) => a.timestamp - b.timestamp);
  historyTickets.sort((a, b) => b.timestamp - a.timestamp);

  const filteredHistory = historyTickets.filter(t => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return t.orderId.toString().includes(q) || t.tableNumber.toLowerCase().includes(q) ||
      t.waiterName.toLowerCase().includes(q) || (t.customerName && t.customerName.toLowerCase().includes(q));
  });

  const getElapsedTime = (ts) => {
    const d = Math.floor((currentTime - ts) / 60000);
    if (isNaN(d) || d <= 0) return 'Just now';
    return `${d}m ago`;
  };

  const isWarning = (ts) => Math.floor((currentTime - ts) / 60000) > 15;

  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col overflow-hidden relative font-sans"
         style={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* Ambient glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full pointer-events-none animate-blob"
           style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="fixed bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full pointer-events-none animate-blob animation-delay-4000"
           style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Header */}
      <header className="mb-4 lg:mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 p-5 rounded-2xl"
              style={panelStyle}>
        <div className="flex items-center gap-4">
          <NotificationPanel align="left" />
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-surface-100 flex items-center gap-2 cursor-pointer select-none" onClick={handleLogoClick}>
              Kitchen Display
              <ChefHat className="w-6 h-6" style={{ color: '#f43f5e', filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.3))' }} />
            </h1>
            <div className="flex items-center flex-wrap gap-3 mt-0.5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(15, 23, 42, 0.5)' }}>
                {activeTickets.length} Active KOTs
              </p>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(15, 23, 42, 0.2)' }} />
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                socketConnected 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
                {socketConnected ? 'Live Connection' : 'Offline - Reconnecting'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(15, 23, 42, 0.2)' }} />
              {!audioUnlocked ? (
                <button
                  onClick={unlockAudio}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-amber-500 hover:bg-amber-600 text-white border-amber-600 hover:shadow active:scale-95 transition-all cursor-pointer animate-pulse"
                  title="Web browsers block sounds until you click on the page. Click here to enable kitchen notification sound alerts."
                >
                  🔇 Tap to Enable Sound
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-blue-500/10 text-blue-600 border-blue-500/20">
                  🔊 Sound Active
                </span>
              )}
              <ServerConfigModal 
                isOpen={isServerModalOpen} 
                onClose={() => setIsServerModalOpen(false)} 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tab switcher */}
          <div className="flex p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setActiveTab('active')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm transition-all duration-300"
              style={activeTab === 'active' ? {
                background: 'rgba(244,63,94,0.15)',
                border: '1px solid rgba(244,63,94,0.3)',
                color: '#dc2626'
              } : { color: 'rgba(15, 23, 42, 0.5)', border: '1px solid transparent' }}
            >
              <Flame className="w-4 h-4" /> Active
            </button>
             <button
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm transition-all duration-300"
              style={activeTab === 'history' ? {
                background: 'rgba(5, 150, 105, 0.12)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                color: '#047857'
              } : { color: 'rgba(15, 23, 42, 0.5)', border: '1px solid transparent' }}
            >
              <History className="w-4 h-4" /> History
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm transition-all duration-300"
              style={activeTab === 'inventory' ? {
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.3)',
                color: '#1d4ed8'
              } : { color: 'rgba(15, 23, 42, 0.5)', border: '1px solid transparent' }}
            >
              <Package className="w-4 h-4" /> Stock Usage
            </button>
          </div>

          {/* Legend */}
          {activeTab === 'active' && (
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.5)' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(15, 23, 42, 0.55)' }}>Cooking</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* History Search */}
      {activeTab === 'history' && (
        <div className="mb-4 shrink-0 p-3 rounded-2xl" style={panelStyle}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(15,23,42,0.35)' }} />
            <input
              type="text"
              placeholder="Search by Order ID, Table, Customer, or Waiter..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
            />
          </div>
        </div>
      )}

      {/* KOT Cards Grid */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
        {activeTab === 'active' && !audioUnlocked && (
          <div 
            onClick={unlockAudio}
            className="bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white font-black text-xs px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer animate-pulse shrink-0 shadow-lg"
          >
            <span className="flex items-center gap-2">
              🔇 <strong>TAP TO UNLOCK SOUND:</strong> Web browser blocked audio. Click this banner to enable buzzer notifications for new orders!
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px] uppercase font-black border border-white/20">Click here</span>
          </div>
        )}
        {activeTab === 'active' ? (
          <div className="flex gap-4 lg:gap-5 h-full overflow-hidden flex-1">
            {/* Sidebar with pending/cooking orders checklist */}
            <aside className="w-64 xl:w-80 shrink-0 hidden md:flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-500" /> KOT Checklist
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-600">
                  {activeTickets.length} Active
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50/30">
                {activeTickets.map(ticket => {
                  const warn = isWarning(ticket.timestamp);
                  
                  // Calculate statuses of items
                  const totalItems = ticket.items.length;
                  const cookingItems = ticket.items.filter(i => i.status === 'cooking').length;
                  const readyItems = ticket.items.filter(i => i.status === 'ready').length;
                  const pendingItems = ticket.items.filter(i => i.status === 'pending').length;
                  
                  let kotStatusLabel = 'Pending';
                  let statusBg = 'bg-amber-100 text-amber-700 border-amber-200';
                  if (readyItems === totalItems) {
                    kotStatusLabel = 'Ready';
                    statusBg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                  } else if (cookingItems > 0 || readyItems > 0) {
                    kotStatusLabel = 'Cooking';
                    statusBg = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                  }

                  return (
                    <div
                      key={`sidebar-${ticket.orderId}-${ticket.kotId}`}
                      onClick={() => {
                        const element = document.getElementById(`kot-card-${ticket.orderId}-${ticket.kotId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.style.outline = '3px dashed #f43f5e';
                          element.style.outlineOffset = '4px';
                          element.style.transition = 'outline 0.15s ease';
                          setTimeout(() => {
                            element.style.outline = 'none';
                          }, 1500);
                        }
                      }}
                      className="p-3 rounded-xl border border-slate-100 hover:border-rose-200 bg-white hover:bg-rose-50/10 cursor-pointer transition-all duration-200 flex flex-col gap-1.5 shadow-sm hover:shadow"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-extrabold text-sm text-slate-800 truncate">{ticket.tableNumber}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusBg}`}>
                          {kotStatusLabel}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span className="font-semibold tracking-wide text-slate-500">{ticket.kotId}</span>
                        <span className={`flex items-center gap-1 ${warn ? 'text-red-500 font-extrabold animate-pulse' : 'text-slate-500'}`}>
                          <Clock className="w-3 h-3" /> {getElapsedTime(ticket.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-[11px] font-bold text-slate-500 bg-slate-50/50 p-1.5 rounded-lg flex items-center justify-between border border-slate-100">
                        <span>Items: {totalItems}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {pendingItems > 0 && `${pendingItems} Pnd `}
                          {cookingItems > 0 && `${cookingItems} Ck `}
                          {readyItems > 0 && `${readyItems} Rdy`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {activeTickets.length === 0 && (
                  <div className="text-center py-8 text-xs font-bold text-slate-400">
                    No active KOTs
                  </div>
                )}
              </div>
            </aside>

            {/* Main Cards Grid */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-4 lg:gap-5 items-start">
                {activeTickets.map(ticket => {
                  const warn = isWarning(ticket.timestamp);
                  const isTakeaway = ticket.orderType === 'takeaway';
                  const isDelivery = ticket.orderType === 'delivery';

                  return (
                    <div
                      id={`kot-card-${ticket.orderId}-${ticket.kotId}`}
                      key={`${ticket.orderId}-${ticket.kotId}`}
                      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover-lift"
                      style={{
                        background: warn ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.9)',
                        border: warn ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(0,0,0,0.07)',
                        boxShadow: warn ? '0 0 30px rgba(239,68,68,0.06)' : '0 4px 20px rgba(15,23,42,0.04)',
                      }}
                    >
                      {/* Ticket top accent */}
                      <div className="h-1 w-full"
                           style={{ background: warn ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #f97316, #ea580c)' }} />

                      {/* Ticket Header */}
                      <div className="p-4 flex justify-between items-start"
                           style={{ borderBottom: `1px solid ${warn ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.08)'}` }}>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">
                            {ticket.kotId}
                          </span>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            {isTakeaway && <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0" />}
                            {isDelivery && <Bike className="w-4 h-4 text-emerald-600 shrink-0" />}
                            <span className="text-xl font-black text-surface-100 truncate">{ticket.tableNumber}</span>
                            {ticket.areaName && (
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                {ticket.areaName}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col mt-1 gap-0.5">
                            <p className="text-[11px] font-bold text-orange-600">
                              Waiter: <span className="font-extrabold">{ticket.waiterName}</span>
                            </p>
                            {ticket.customerName && (
                              <p className="text-xs font-bold text-surface-400 truncate">
                                {ticket.customerName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0"
                             style={warn
                               ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626' }
                               : { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(15, 23, 42, 0.6)' }}>
                          <Clock className="w-3.5 h-3.5" />
                          {getElapsedTime(ticket.timestamp)}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="p-4 space-y-2.5 flex-1 min-h-0">
                        {ticket.items.map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (item.status === 'pending') updateItemStatus(ticket.orderId, item.id, 'cooking');
                              else if (item.status === 'cooking') updateItemStatus(ticket.orderId, item.id, 'ready');
                              else if (item.status === 'ready') updateItemStatus(ticket.orderId, item.id, 'cooking');
                            }}
                            className="p-3 rounded-xl cursor-pointer select-none transition-all duration-300"
                            style={item.status === 'pending' ? {
                              background: 'rgba(251,191,36,0.08)',
                              border: '1px solid rgba(251,191,36,0.25)',
                            } : item.status === 'cooking' ? {
                              background: 'rgba(99,102,241,0.08)',
                              border: '1px solid rgba(99,102,241,0.25)',
                              transform: 'scale(1.01)'
                            } : {
                              background: 'rgba(52,211,153,0.08)',
                              border: '1px solid rgba(52,211,153,0.25)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                  style={item.status === 'ready' ? { background: '#059669', color: 'white' }
                                       : item.status === 'cooking' ? { background: '#4f46e5', color: 'white' }
                                       : { background: 'rgba(217,119,6,0.15)', color: '#b45309' }}>
                                  {item.quantity}
                                </span>
                                <span className={`font-bold text-sm break-words leading-tight flex-1 min-w-0 ${item.status === 'ready' ? 'line-through' : ''}`}
                                  style={{ color: item.status === 'pending' ? 'rgba(15,23,42,0.8)'
                                               : item.status === 'cooking' ? '#4338ca' : '#047857' }}>
                                  {item.name}
                                </span>
                              </div>
                              {item.status === 'ready' && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#059669' }} />}
                              {item.status === 'cooking' && (
                                <Flame className="w-4 h-4 shrink-0 animate-pulse" style={{ color: '#4f46e5' }} />
                              )}
                            </div>
                            {item.notes && (
                              <div className="mt-2 text-[11px] font-black text-red-650 bg-rose-50 border border-rose-200/50 px-2.5 py-1 rounded-lg flex items-center gap-1 w-fit">
                                <span className="animate-bounce">⚠️</span>
                                <span className="italic uppercase tracking-wide">{item.notes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Mark Ready */}
                      <div className="p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <button
                          onClick={() => updateKotStatus(ticket.orderId, ticket.kotId, 'ready')}
                          className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            boxShadow: '0 4px 15px rgba(16,185,129,0.2)'
                          }}
                        >
                          <Check className="w-4 h-4" /> Mark KOT Ready
                        </button>
                      </div>
                    </div>
                  );
                })}

                {activeTickets.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center"
                         style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <ChefHat className="w-12 h-12" style={{ color: 'rgba(15, 23, 42, 0.3)' }} />
                    </div>
                    <h2 className="text-2xl font-black text-surface-100">Kitchen is clear!</h2>
                    <p className="text-sm font-bold uppercase tracking-wide text-surface-400">
                      Waiting for new KOTs...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          /* Kitchen Inventory Usage Logs */
          <div className="flex-1 flex flex-col min-h-0 gap-4 h-full">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 p-3 rounded-2xl" style={panelStyle}>
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(15,23,42,0.35)' }} />
                <input
                  type="text"
                  placeholder="Search raw material to record usage (e.g. Paneer, Gajar, Doodh)..."
                  value={kitchenSearch}
                  onChange={(e) => setKitchenSearch(e.target.value)}
                  className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
                {inventoryItems
                  .filter(item => item.name.toLowerCase().includes(kitchenSearch.toLowerCase()))
                  .map(item => {
                    const qty = parseFloat(item.quantity);
                    const min = parseFloat(item.min_threshold);
                    const red = parseFloat(item.red_threshold);
                    
                    let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                    let dotColor = 'bg-emerald-500';
                    if (qty <= red) {
                      badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                      dotColor = 'bg-red-500 animate-pulse';
                    } else if (qty <= min) {
                      badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                      dotColor = 'bg-amber-500';
                    }

                    return (
                      <div 
                        key={item.id}
                        className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between hover-lift transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {item.category}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                              {qty <= red ? 'Critical' : qty <= min ? 'Low' : 'Healthy'}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 mb-1">{item.name}</h4>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-black text-slate-900">{qty.toFixed(2)}</span>
                            <span className="text-xs font-bold text-slate-400">{item.unit}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                          {loggingItemId === item.id ? (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!useQty) return;
                                logInventoryUsage(item.id, {
                                  type: 'consumption',
                                  quantity: parseFloat(useQty),
                                  logged_by: 'Kitchen KDS',
                                  notes: 'Used in kitchen cooking'
                                });
                                setLoggingItemId(null);
                                setUseQty('');
                              }}
                              className="flex gap-2"
                            >
                              <input
                                type="number"
                                step="0.01"
                                required
                                autoFocus
                                placeholder={`Qty (${item.unit})`}
                                value={useQty}
                                onChange={(e) => setUseQty(e.target.value)}
                                className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-rose-500"
                              />
                              <button 
                                type="submit" 
                                className="bg-rose-500 hover:bg-rose-600 text-white font-black px-3 py-1 rounded-lg text-xs"
                              >
                                Log
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setLoggingItemId(null);
                                  setUseQty('');
                                }}
                                className="border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold px-2 py-1 rounded-lg text-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => {
                                setLoggingItemId(item.id);
                                setUseQty('');
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 text-rose-500" /> Log Kitchen Usage
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          /* History Table */
          <div className="h-full overflow-y-auto custom-scrollbar rounded-2xl" style={{
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0" style={{
                background: 'rgba(255,255,255,0.95)',
                borderBottom: '1px solid rgba(0,0,0,0.07)'
              }}>
                <tr>
                  {['KOT ID', 'Order ID', 'Table/Type', 'Waiter', 'Time Completed'].map((h, i) => (
                    <th key={h} className={`p-4 font-black uppercase tracking-wider text-xs ${i === 4 ? 'text-right' : ''}`}
                        style={{ color: 'rgba(15,23,42,0.5)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((ticket, i) => (
                  <tr key={`${ticket.kotId}-${i}`} className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="p-4 font-black text-xs tracking-widest uppercase"
                        style={{ color: '#ea580c' }}>{ticket.kotId}</td>
                    <td className="p-4 font-bold text-surface-300">#{ticket.orderId}</td>
                    <td className="p-4 font-black text-surface-100">{ticket.tableNumber}</td>
                    <td className="p-4 font-bold" style={{ color: '#ea580c' }}>{ticket.waiterName}</td>
                    <td className="p-4 text-right font-bold text-xs text-surface-400">
                      {formatIST(ticket.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <History className="w-12 h-12" style={{ color: 'rgba(15, 23, 42, 0.2)' }} />
                <p className="font-bold text-surface-400">No history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

