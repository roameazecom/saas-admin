import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';

export default function FinancialCharts({ date }) {
  const { orderHistory, expenses, fetchExpensesData } = usePosStore();
  const [localDate, setLocalDate] = useState(date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  useEffect(() => {
    if (date) setLocalDate(date);
  }, [date]);

  const targetDate = localDate;
  const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
        return dateInput.substring(0, 10);
      }
    }
    try {
      return new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch (err) {
      return '';
    }
  };

  const todayOrders = orderHistory.filter(o => {
    if (o.status !== 'paid') return false;
    const isoStr = o.created_at.includes('T') ? o.created_at : o.created_at.replace(' ', 'T') + '+05:30';
    return getLocalDateString(isoStr) === targetDate;
  });

  const todayExpenses = expenses.filter(e => {
    return getLocalDateString(e.date) === targetDate;
  });

  const paymentTotals = todayOrders.reduce((acc, order) => {
    const total = order.total_amount || 0;
    const type = order.payment_type || 'Cash';
    acc[type] = (acc[type] || 0) + total;
    acc.total += total;
    return acc;
  }, { Cash: 0, Card: 0, UPI: 0, total: 0 });

  const cashPct = paymentTotals.total > 0 ? (paymentTotals.Cash / paymentTotals.total) * 100 : 0;
  const cardPct = paymentTotals.total > 0 ? (paymentTotals.Card / paymentTotals.total) * 100 : 0;
  const upiPct = paymentTotals.total > 0 ? (paymentTotals.UPI / paymentTotals.total) * 100 : 0;

  // Group today's expenses by hour intervals in Kolkata timezone
  const getHourInterval = (exp) => {
    let hour = 12; // default
    if (exp.created_at) {
      const isoStr = exp.created_at.includes('T') ? exp.created_at : exp.created_at.replace(' ', 'T') + '+05:30';
      hour = new Date(isoStr).getHours();
    } else if (exp.date) {
      hour = new Date(exp.date).getHours();
    }
    if (hour < 11) return '10 AM';
    if (hour < 13) return '12 PM';
    if (hour < 15) return '2 PM';
    if (hour < 17) return '4 PM';
    if (hour < 19) return '6 PM';
    return '8 PM';
  };

  const expenseData = [
    { name: '10 AM', value: 0 },
    { name: '12 PM', value: 0 },
    { name: '2 PM', value: 0 },
    { name: '4 PM', value: 0 },
    { name: '6 PM', value: 0 },
    { name: '8 PM', value: 0 },
  ];

  todayExpenses.forEach(exp => {
    const amt = parseFloat(exp.amount) || 0;
    const interval = getHourInterval(exp);
    const item = expenseData.find(d => d.name === interval);
    if (item) {
      item.value += amt;
    }
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
      {/* Payment Bifurcation */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h3 className="font-semibold text-surface-100">Payment Bifurcation</h3>
          <div className="flex items-center space-x-2">
            <input 
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="border border-slate-300 rounded-md text-sm p-1.5 focus:outline-none" 
            />
            <button 
              onClick={() => usePosStore.getState().fetchOrderHistory()} 
              className="p-1.5 border border-slate-300 rounded-md text-surface-400 hover:bg-surface-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Stacked Bar graphic */}
          <div className="w-full h-8 flex rounded-sm overflow-hidden mb-8 bg-slate-100">
            {cashPct > 0 && <div className="bg-amber-400 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${cashPct}%` }}>{cashPct.toFixed(1)}%</div>}
            {cardPct > 0 && <div className="bg-cyan-400 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${cardPct}%` }}>{cardPct.toFixed(1)}%</div>}
            {upiPct > 0 && <div className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${upiPct}%` }}>{upiPct.toFixed(1)}%</div>}
            {paymentTotals.total === 0 && <div className="bg-slate-300 h-full w-full flex items-center justify-center text-surface-400 text-xs font-bold">No Payments Yet</div>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-slate-700">
                <span className="w-3 h-3 rounded bg-amber-400 mr-2"></span> Cash
              </div>
              <span className="font-semibold">₹ {paymentTotals.Cash.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-slate-700">
                <span className="w-3 h-3 rounded bg-cyan-400 mr-2"></span> Card
              </div>
              <span className="font-semibold">₹ {paymentTotals.Card.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-slate-700">
                <span className="w-3 h-3 rounded bg-blue-500 mr-2"></span> UPI (Online)
              </div>
              <span className="font-semibold">₹ {paymentTotals.UPI.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-surface-700 pt-3">
              <div className="flex items-center text-slate-700">
                <span className="w-3 h-3 rounded bg-green-500 mr-2"></span> Total Collection
              </div>
              <div className="flex items-center font-semibold text-surface-100">
                ₹ {paymentTotals.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses & Withdrawal */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h3 className="font-semibold text-surface-100">Expenses & Withdrawal</h3>
          <div className="flex items-center space-x-2">
             <input 
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="border border-slate-300 rounded-md text-sm p-1.5 focus:outline-none" 
            />
            <button 
              onClick={() => fetchExpensesData()} 
              className="p-1.5 border border-slate-300 rounded-md text-surface-400 hover:bg-surface-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-end">
           <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Expenses']} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}
