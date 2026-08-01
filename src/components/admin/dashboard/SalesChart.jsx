import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, PieChart } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';

export default function SalesChart({ date }) {
  const { orderHistory } = usePosStore();

  // Group selected date's sales by hour
  const dateOrders = orderHistory.filter(o => o.status === 'paid' && new Date(o.created_at.includes('T') ? o.created_at : o.created_at.replace(' ', 'T') + '+05:30').toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === date);
  
  const hourlyData = [
    { name: '10 AM', DineIn: 0, PickUp: 0, Delivery: 0 },
    { name: '12 PM', DineIn: 0, PickUp: 0, Delivery: 0 },
    { name: '2 PM', DineIn: 0, PickUp: 0, Delivery: 0 },
    { name: '4 PM', DineIn: 0, PickUp: 0, Delivery: 0 },
    { name: '6 PM', DineIn: 0, PickUp: 0, Delivery: 0 },
    { name: '8 PM', DineIn: 0, PickUp: 0, Delivery: 0 },
  ];
  dateOrders.forEach(order => {
    const dateObj = new Date(order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30');
    let hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(dateObj));
    if (hour === 24) hour = 0;
    const amount = order.total_amount || 0;
    
    // Simple bucketing
    if (hour >= 10 && hour < 12) hourlyData[0].DineIn += amount;
    else if (hour >= 12 && hour < 14) hourlyData[1].DineIn += amount;
    else if (hour >= 14 && hour < 16) hourlyData[2].DineIn += amount;
    else if (hour >= 16 && hour < 18) hourlyData[3].DineIn += amount;
    else if (hour >= 18 && hour < 20) hourlyData[4].DineIn += amount;
    else if (hour >= 20) hourlyData[5].DineIn += amount;
  });
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-sm pt-4 pb-6">
      <div className="px-6 flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-surface-100">Sales</h2>
        <div className="flex items-center space-x-3">
          <div className="flex border border-surface-700 rounded-md overflow-hidden">
            <button className="flex items-center px-3 py-1.5 bg-surface-900 text-slate-700 text-sm font-medium hover:bg-surface-900 border-r border-surface-700">
              <BarChart2 className="w-4 h-4 mr-1.5" /> Bar Chart
            </button>
            <button className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              <PieChart className="w-4 h-4 mr-1.5" /> Pi
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end px-12 mb-2 space-x-6">
        <div className="flex items-center text-sm text-surface-300"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Dine In</div>
        <div className="flex items-center text-sm text-surface-300"><span className="w-3 h-3 rounded-full bg-cyan-400 mr-2"></span>Pick Up</div>
        <div className="flex items-center text-sm text-surface-300"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Delivery</div>
      </div>

      <div className="w-full h-80 pe-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={hourlyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} tickFormatter={(value) => value === 0 ? '0' : `₹${value}`} />
            <Tooltip
              cursor={{fill: 'transparent'}}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="DineIn" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="PickUp" fill="#22D3EE" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Delivery" fill="#22C55E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
