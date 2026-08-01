import { useEffect, useState } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Trash2, Search, Filter } from 'lucide-react';

export default function CancellationLogsTab() {
  const { cancellationLogs, fetchCancellationLogs } = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  useEffect(() => {
    fetchCancellationLogs();
  }, [fetchCancellationLogs]);

  // Helper date matching functions
  const isToday = (d) => {
    const dt = new Date(d.includes('T') ? d : d.replace(' ', 'T') + '+05:30');
    const t = new Date();
    return dt.getDate() === t.getDate() && dt.getMonth() === t.getMonth() && dt.getFullYear() === t.getFullYear();
  };

  const isYesterday = (d) => {
    const dt = new Date(d.includes('T') ? d : d.replace(' ', 'T') + '+05:30');
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return dt.getDate() === y.getDate() && dt.getMonth() === y.getMonth() && dt.getFullYear() === y.getFullYear();
  };

  const isThisWeek = (d) => {
    const dt = new Date(d.includes('T') ? d : d.replace(' ', 'T') + '+05:30');
    const t = new Date();
    const f = new Date(t.setDate(t.getDate() - t.getDay()));
    return dt >= f;
  };

  // Dynamic filter values
  const uniqueStaff = Array.from(new Set((cancellationLogs || []).map(log => log.cancelled_by_name).filter(Boolean)));
  const uniqueReasons = Array.from(new Set((cancellationLogs || []).map(log => log.reason).filter(Boolean)));

  const filteredLogs = (cancellationLogs || []).filter(log => {
    // 1. Search term match
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = log.item_name.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q) ||
        log.cancelled_by_name.toLowerCase().includes(q) ||
        log.order_id.toString().includes(q);
      if (!match) return false;
    }

    // 2. Date match
    if (dateFilter !== 'all') {
      if (dateFilter === 'today' && !isToday(log.created_at)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(log.created_at)) return false;
      if (dateFilter === 'this_week' && !isThisWeek(log.created_at)) return false;
    }

    // 3. Reason match
    if (reasonFilter !== 'all' && log.reason !== reasonFilter) return false;

    // 4. Staff match
    if (staffFilter !== 'all' && log.cancelled_by_name !== staffFilter) return false;

    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl shadow-soft border border-surface-700/50 overflow-hidden">
      {/* Header Panel */}
      <div className="p-5 border-b border-surface-700/60 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Food Deletion & Cancellation Logs</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Manager Audit Records</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Item, Reason, Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500 bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-black uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>

        {/* Date Filter */}
        <div className="flex flex-col">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-red-550"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
          </select>
        </div>

        {/* Reason Filter */}
        <div className="flex flex-col">
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-red-550 max-w-[180px] truncate"
          >
            <option value="all">All Reasons</option>
            {uniqueReasons.map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </div>

        {/* Staff Filter */}
        <div className="flex flex-col">
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-red-550 max-w-[150px] truncate"
          >
            <option value="all">All Staff</option>
            {uniqueStaff.map(staff => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(dateFilter !== 'all' || reasonFilter !== 'all' || staffFilter !== 'all' || searchTerm !== '') && (
          <button
            onClick={() => {
              setDateFilter('all');
              setReasonFilter('all');
              setStaffFilter('all');
              setSearchTerm('');
            }}
            className="text-xs font-extrabold text-red-500 hover:text-red-650 transition-colors ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid view / table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 sticky top-0 border-b border-surface-700 shadow-sm z-10">
            <tr>
              <th className="p-4 font-black">Date/Time</th>
              <th className="p-4 font-black">Order ID</th>
              <th className="p-4 font-black">Item Name</th>
              <th className="p-4 font-black">Quantity</th>
              <th className="p-4 font-black">Amount (₹)</th>
              <th className="p-4 font-black">Cancelled By</th>
              <th className="p-4 font-black">Cancellation Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-600">
                  {new Date(log.created_at.includes('T') ? log.created_at : log.created_at.replace(' ', 'T') + '+05:30').toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </td>
                <td className="p-4 font-bold text-red-600">#{log.order_id}</td>
                <td className="p-4 font-black text-slate-800">{log.item_name}</td>
                <td className="p-4 text-slate-700 font-bold">{log.quantity}</td>
                <td className="p-4 font-black text-slate-800">₹{(log.price * log.quantity).toFixed(2)}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-600 font-bold rounded-lg border border-rose-100 text-[10px] uppercase">
                    {log.cancelled_by_name}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-800 font-black rounded-lg text-[10px] uppercase">
                    {log.reason}
                  </span>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 font-black">
                  No cancellation log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
