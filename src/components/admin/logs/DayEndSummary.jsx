import { FileText } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';

export default function DayEndSummary() {
  const { orderHistory } = usePosStore();

  const dailyMap = new Map();
  orderHistory.forEach(order => {
    if (order.status !== 'paid') return;
    const isoStr = order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30';
    const dateStr = new Date(isoStr).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { date: dateStr, orders: 0, total: 0 });
    }
    const d = dailyMap.get(dateStr);
    d.orders += 1;
    d.total += (order.total_amount || 0);
  });

  const dailyList = Array.from(dailyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex flex-col h-full bg-surface-900 rounded-xl shadow-sm border border-surface-700">
      <div className="p-4 border-b border-surface-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-surface-100">Day End Summary</h2>
        <select className="px-3 py-2 border border-slate-300 rounded text-sm bg-surface-900">
          <option>Action</option>
        </select>
      </div>

      <div className="p-4 border-b border-surface-700 bg-surface-900 space-y-4">
        <div className="text-sm font-bold flex items-center text-surface-300 mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Search
        </div>
        <div className="flex items-end space-x-3 max-w-2xl">
          <div className="flex-1">
            <label className="text-xs font-semibold text-surface-300 mb-1 block">Start Date</label>
            <input type="date" defaultValue="2026-03-20" className="w-full border border-slate-300 rounded p-1.5 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-surface-300 mb-1 block">End Date</label>
            <input type="date" defaultValue="2026-04-19" className="w-full border border-slate-300 rounded p-1.5 text-sm" />
          </div>
           <button className="bg-rose-600 text-white font-medium text-sm px-6 py-2 rounded hover:bg-rose-700">Search</button>
           <button className="bg-surface-900 border border-slate-300 text-slate-700 font-medium text-sm px-6 py-2 rounded hover:bg-surface-900">Show All</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-[#f1f5f9] text-surface-300 sticky top-0 border-b border-surface-700">
            <tr>
              <th className="p-3 w-10 text-center"><input type="checkbox" /></th>
              <th className="p-3 font-semibold">Created Date</th>
              <th className="p-3 font-semibold text-center">No. Of Orders</th>
              <th className="p-3 font-semibold">Total (₹)</th>
              <th className="p-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dailyList.map((summary, i) => (
              <tr key={i} className="hover:bg-surface-900 transition-colors">
                <td className="p-3 text-center"><input type="checkbox" /></td>
                <td className="p-3 font-medium text-surface-100">{summary.date}</td>
                <td className="p-3 text-center font-bold text-surface-100">{summary.orders}</td>
                <td className="p-3 text-surface-100 font-medium">{summary.total.toFixed(2)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-center">
                    <button className="p-1.5 border border-surface-700 text-surface-400 rounded hover:bg-slate-100"><FileText className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {dailyList.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-surface-400">No day end summaries available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
