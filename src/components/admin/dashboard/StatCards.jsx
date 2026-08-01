import { TrendingUp, Utensils, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';

export default function StatCards({ date }) {
  const { orderHistory, expenses } = usePosStore();

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

  const paidOrders = orderHistory.filter(o => {
    if (o.status !== 'paid') return false;
    const isoStr = o.created_at.includes('T') ? o.created_at : o.created_at.replace(' ', 'T') + '+05:30';
    return getLocalDateString(isoStr) === date;
  });

  const todayExpenses = expenses.filter(e => {
    return getLocalDateString(e.date) === date;
  });
  
  let totalSales = 0;
  let totalDineIn = 0; let countDineIn = 0;
  let totalTakeaway = 0; let countTakeaway = 0;
  let totalDelivery = 0; let countDelivery = 0;

  paidOrders.forEach(o => {
    const amount = o.total_amount || 0;
    totalSales += amount;
    if (o.order_type === 'takeaway') {
       totalTakeaway += amount; countTakeaway++;
    } else if (o.order_type === 'delivery') {
       totalDelivery += amount; countDelivery++;
    } else {
       totalDineIn += amount; countDineIn++;
    }
  });

  const totalExpenseAmt = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const stats = [
    {
      label: 'Total Sales',
      amount: `₹ ${totalSales.toFixed(2)}`,
      orders: `${paidOrders.length} Orders`,
      icon: <TrendingUp className="w-5 h-5 text-rose-500" />,
      iconBg: 'bg-rose-500/30',
    },
    {
      label: 'Day Expenses',
      amount: `₹ ${totalExpenseAmt.toFixed(2)}`,
      orders: `${todayExpenses.length} Logs`,
      icon: <Wallet className="w-5 h-5 text-emerald-500" />,
      iconBg: 'bg-emerald-500/20',
    },
    {
      label: 'Dine In',
      amount: `₹ ${totalDineIn.toFixed(2)}`,
      orders: `${countDineIn} Orders`,
      icon: <Utensils className="w-5 h-5 text-cyan-600" />,
      iconBg: 'bg-cyan-100',
    },
    {
      label: 'Takeaway',
      amount: `₹ ${totalTakeaway.toFixed(2)}`,
      orders: `${countTakeaway} Orders`,
      icon: <ShoppingBag className="w-5 h-5 text-indigo-500" />,
      iconBg: 'bg-indigo-100',
    },
    {
      label: 'Delivery',
      amount: `₹ ${totalDelivery.toFixed(2)}`,
      orders: `${countDelivery} Orders`,
      icon: <Truck className="w-5 h-5 text-amber-500" />,
      iconBg: 'bg-amber-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-surface-900/80 backdrop-blur-md border border-surface-700 rounded-3xl p-6 shadow-sm hover:shadow-glass hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-2xl ${stat.iconBg} group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <button className="text-surface-400 hover:text-brand-500 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-surface-100 tracking-tight">{stat.amount}</h3>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-semibold text-surface-500">{stat.label}</p>
              <span className="text-xs font-bold text-surface-400 bg-surface-900 px-2 py-0.5 rounded-full">{stat.orders}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
