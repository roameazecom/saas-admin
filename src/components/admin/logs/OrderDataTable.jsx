import { useState } from 'react';
import { Eye, Printer, Edit2, DownloadCloud, FileText } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';
import OrderDetailsModal from './OrderDetailsModal';

export default function OrderDataTable() {
  const { orderHistory, orders } = usePosStore();
  const allOrders = [...(orders || []).filter(o => o.status === 'open'), ...(orderHistory || [])];
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  // Search States
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterCustomerPhone, setFilterCustomerPhone] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterOrderType, setFilterOrderType] = useState('All');
  const [filterPaymentType, setFilterPaymentType] = useState('All');
  const [filterOrderStatus, setFilterOrderStatus] = useState('All');
  const [filterGrandTotalOp, setFilterGrandTotalOp] = useState('=');
  const [filterGrandTotalVal, setFilterGrandTotalVal] = useState('');

  // Filtered Data
  const filteredOrders = allOrders.filter(order => {
    if (filterOrderId && !order.id.toString().includes(filterOrderId)) return false;
    if (filterCustomerName && order.customer_name && !order.customer_name.toLowerCase().includes(filterCustomerName.toLowerCase())) return false;
    if (filterCustomerPhone && order.customer_phone && !order.customer_phone.includes(filterCustomerPhone)) return false;
    
    if (filterStartDate) {
      const orderDate = new Date(order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30');
      if (orderDate < new Date(filterStartDate)) return false;
    }
    if (filterEndDate) {
      const orderDate = new Date(order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30');
      if (orderDate > new Date(filterEndDate)) return false;
    }
    
    if (filterOrderType !== 'All') {
       if (filterOrderType === 'Dine In' && order.order_type !== 'dine_in') return false;
       if (filterOrderType === 'Delivery' && order.order_type !== 'delivery') return false;
       if (filterOrderType === 'Takeaway' && order.order_type !== 'takeaway') return false;
    }
    
    if (filterPaymentType !== 'All' && order.payment_type !== filterPaymentType) return false;
    if (filterOrderStatus !== 'All' && order.status !== filterOrderStatus.toLowerCase()) return false;
    
    if (filterGrandTotalVal) {
      const total = (order.subtotal || 0) + (order.tax_amount || 0);
      const val = parseFloat(filterGrandTotalVal);
      if (!isNaN(val)) {
         if (filterGrandTotalOp === '=' && total !== val) return false;
         if (filterGrandTotalOp === '>' && total <= val) return false;
         if (filterGrandTotalOp === '<' && total >= val) return false;
      }
    }
    
    return true;
  });

  const clearFilters = () => {
    setFilterOrderId('');
    setFilterCustomerName('');
    setFilterCustomerPhone('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterOrderType('All');
    setFilterPaymentType('All');
    setFilterOrderStatus('All');
    setFilterGrandTotalOp('=');
    setFilterGrandTotalVal('');
  };

  const handlePrint = (id) => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/invoice/${id}`, '_blank');
  };

  const handleBulkInvoice = () => {
    selectedRowIds.forEach(id => handlePrint(id));
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/excel`, '_blank');
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleRowSelect = (id) => {
    setSelectedRowIds(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return '';
    const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + '+05:30';
    return new Date(isoStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  };

  const totalFilteredAmount = filteredOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0).toFixed(2);
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl shadow-soft border border-surface-700/50 overflow-hidden">
      {/* Header Tools */}
      <div className="p-4 lg:p-5 border-b border-surface-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800">
        <div className="flex items-center space-x-2 bg-brand-100 text-brand-700 px-3.5 py-2 rounded-xl font-bold text-xs border border-brand-200 shadow-sm shrink-0">
          <TrendingUpIcon /> <span>Last 15 Days Active Orders Summary</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
           <button 
             onClick={handleBulkInvoice} 
             disabled={selectedRowIds.length === 0} 
             className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
           >
             <FileText className="w-3.5 h-3.5" /> Generate Invoices ({selectedRowIds.length})
           </button>
           <div className="px-4 py-2.5 font-black text-slate-800 text-xs border border-surface-700 rounded-xl bg-white shadow-sm">
             Grand Total : <span className="text-brand-600 ml-1">₹{Number(totalFilteredAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
           </div>
           <button 
             onClick={handleExport} 
             className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-700 hover:border-slate-300 rounded-xl text-xs font-black text-slate-700 hover:text-slate-900 transition-all shadow-sm"
           >
             <DownloadCloud className="w-4 h-4 text-slate-500" /> Export Excel
           </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-4 border-b border-surface-700/60 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Search & Filter Panel
          </div>
          <div className="flex items-center gap-2">
            {filteredOrders.length > 0 && (
              <span className="text-xs text-slate-500 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                Found {filteredOrders.length} records
              </span>
            )}
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="text-xs font-black text-brand-600 hover:text-brand-700 bg-white border border-slate-250 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
            >
              {isFiltersExpanded ? 'Hide Filters ▲' : 'Show Filters ▼'}
            </button>
          </div>
        </div>

        {isFiltersExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Start Date</label>
              <input type="datetime-local" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">End Date</label>
              <input type="datetime-local" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Order ID</label>
              <input type="text" placeholder="Search ID" value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Customer Name</label>
              <input type="text" placeholder="Name" value={filterCustomerName} onChange={e => setFilterCustomerName(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Customer Phone</label>
              <input type="text" placeholder="Phone" value={filterCustomerPhone} onChange={e => setFilterCustomerPhone(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Order Type</label>
               <select value={filterOrderType} onChange={e => setFilterOrderType(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800">
                 <option value="All">All</option>
                 <option value="Dine In">Dine In</option>
                 <option value="Delivery">Delivery</option>
                 <option value="Takeaway">Takeaway</option>
               </select>
            </div>
            
            {/* Row 2 */}
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Payment Type</label>
               <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800">
                 <option value="All">All</option>
                 <option value="Cash">Cash</option>
                 <option value="UPI">UPI</option>
                 <option value="Card">Card</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Order Status</label>
               <select value={filterOrderStatus} onChange={e => setFilterOrderStatus(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800">
                 <option value="All">All</option>
                 <option value="Paid">Paid</option>
                 <option value="Cancelled">Cancelled</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Other Status</label>
               <select className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800"><option value="All">All</option></select>
            </div>
            <div className="flex space-x-2">
              <div className="w-1/3">
                <label className="text-[10px] font-black text-transparent mb-1.5 block">-</label>
                 <select value={filterGrandTotalOp} onChange={e => setFilterGrandTotalOp(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800">
                   <option value="=">=</option>
                   <option value=">">&gt;</option>
                   <option value="<">&lt;</option>
                 </select>
              </div>
              <div className="w-2/3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Grand Total</label>
                <input type="number" placeholder="₹ Amount" value={filterGrandTotalVal} onChange={e => setFilterGrandTotalVal(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800" />
              </div>
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">GSTIN Filter</label>
               <select className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-brand-500 bg-white text-slate-800"><option>All</option></select>
            </div>
            <div className="flex items-end">
               <button onClick={clearFilters} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all w-full border border-slate-200">Reset Filters</button>
            </div>
          </div>
        )}
      </div>

      {/* Table Data */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 sticky top-0 border-b border-surface-700 shadow-sm z-10">
            <tr>
              <th className="p-4 font-black text-center w-12"><input type="checkbox" className="rounded border-slate-350 accent-orange-600 w-3.5 h-3.5" checked={selectedRowIds.length === filteredOrders.length && filteredOrders.length > 0} onChange={toggleSelectAll} /></th>
              <th className="p-4 font-black">Bill No.</th>
              <th className="p-4 font-black">Order Type</th>
              <th className="p-4 font-black">Customer Details</th>
              <th className="p-4 font-black">Billed By</th>
              <th className="p-4 font-black max-w-xs truncate">Ordered Items</th>
              <th className="p-4 font-black text-right">Subtotal (₹)</th>
              <th className="p-4 font-black text-right">Tax (₹)</th>
              <th className="p-4 font-black text-right">Discount (₹)</th>
              <th className="p-4 font-black text-right">Grand Total (₹)</th>
              <th className="p-4 font-black text-center">Payment</th>
              <th className="p-4 font-black text-center">Status</th>
              <th className="p-4 font-black">Date & Time</th>
              <th className="p-4 font-black text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredOrders.length === 0 && (
              <tr><td colSpan="14" className="p-12 text-center text-slate-400 font-medium">No orders matched the search filters.</td></tr>
            )}
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                <td className="p-4 text-center"><input type="checkbox" className="rounded border-slate-350 accent-orange-600 w-3.5 h-3.5" checked={selectedRowIds.includes(order.id)} onChange={() => toggleRowSelect(order.id)} /></td>
                <td className="p-4 font-extrabold text-slate-900">#{order.id}</td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">
                    {order.order_type === 'dine_in' ? `Dine In` : 
                     order.order_type === 'takeaway' ? `Takeaway` : 
                     order.order_type === 'delivery' ? `Delivery` : 'Dine In'}
                  </div>
                  {order.order_type === 'dine_in' && (
                    <div className="text-[10px] text-orange-600 font-extrabold uppercase mt-0.5">Table {order.table_number}</div>
                  )}
                  {order.location_name && <div className="text-[10px] font-bold text-slate-400">({order.location_name})</div>}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{order.customer_name || '-'}</div>
                  {order.customer_phone && <div className="text-[10px] text-slate-400 font-semibold">{order.customer_phone}</div>}
                </td>
                <td className="p-4 text-indigo-700 font-bold">{order.waiter_name || '-'}</td>
                <td className="p-4 text-slate-600 max-w-xs truncate font-medium" title={order.items?.map(i => i.name).join(', ')}>
                  {order.items?.map(i => i.name).join(', ')}
                </td>
                <td className="p-4 text-right font-semibold text-slate-800">₹{parseFloat(order.subtotal || 0).toFixed(0)}</td>
                <td className="p-4 text-right font-semibold text-slate-400">₹{parseFloat(order.tax_amount || 0).toFixed(0)}</td>
                <td className="p-4 text-right font-semibold text-rose-500">{parseFloat(order.discount_amount || 0) > 0 ? `₹${parseFloat(order.discount_amount).toFixed(0)}` : '-'}</td>
                <td className="p-4 text-right font-black text-slate-900 text-sm">₹{parseFloat(order.total_amount || 0).toFixed(0)}</td>
                <td className="p-4 text-center">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-[10px] font-black rounded-lg border border-slate-200">
                    {order.payment_type || 'Cash'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                    order.status === 'paid' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500 font-medium text-[11px] leading-snug">{formatOrderDate(order.created_at)}</td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button onClick={() => handlePrint(order.id)} title="Print Receipt" className="p-2 text-slate-500 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100"><Printer className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setSelectedOrder(order)} title="View Details" className="p-2 text-slate-500 hover:text-brand-600 rounded-xl hover:bg-brand-50 transition-all border border-transparent hover:border-brand-100"><Eye className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-surface-700/60 flex items-center justify-between text-xs text-slate-500 bg-surface-800/80 rounded-b-2xl">
        <div className="font-bold">Showing {filteredOrders.length} orders</div>
        <div className="flex space-x-1">
          <button className="px-3 py-1.5 bg-brand-600 text-white rounded-lg font-black text-xs shadow-sm">1</button>
        </div>
      </div>
      <OrderDetailsModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} />
    </div>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
  );
}
