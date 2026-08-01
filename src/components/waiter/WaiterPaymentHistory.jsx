import { useState } from 'react';
import { usePosStore } from '../../store/posStore';
import { useAuthStore } from '../../store/authStore';
import { X, Receipt, Banknote, CreditCard, IndianRupee } from 'lucide-react';

export default function WaiterPaymentHistory({ onClose }) {
  const { orderHistory } = usePosStore();
  const { user } = useAuthStore();

  const myOrders = orderHistory.filter(o => o.user_id === user?.id);
  
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const todayOrders = myOrders.filter(o => {
     const isoStr = o.created_at.includes('T') ? o.created_at : o.created_at.replace(' ', 'T') + '+05:30';
     return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today;
  });

  const stats = todayOrders.reduce((acc, order) => {
    const total = (order.subtotal || 0) + (order.tax_amount || 0);
    const type = order.payment_type || 'Cash';
    acc[type] = (acc[type] || 0) + total;
    acc.total += total;
    return acc;
  }, { Cash: 0, Card: 0, UPI: 0, total: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-surface-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-900">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-100">My Collections (Today)</h2>
              <p className="text-xs text-surface-400">View your payment history</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-surface-300 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-surface-900 border-b border-surface-700">
          <div className="bg-surface-900 p-4 rounded-xl border border-surface-700 shadow-sm text-center">
            <div className="text-xs text-surface-400 font-semibold mb-1 uppercase tracking-wider">Total Collected</div>
            <div className="text-xl font-bold text-indigo-600">₹{stats.total.toFixed(2)}</div>
          </div>
          <div className="bg-surface-900 p-4 rounded-xl border border-surface-700 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-1 text-xs text-surface-400 font-semibold mb-1 uppercase tracking-wider">
              <Banknote className="w-3 h-3" /> <span>Cash</span>
            </div>
            <div className="text-xl font-bold text-surface-100">₹{stats.Cash.toFixed(2)}</div>
          </div>
          <div className="bg-surface-900 p-4 rounded-xl border border-surface-700 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-1 text-xs text-surface-400 font-semibold mb-1 uppercase tracking-wider">
              <IndianRupee className="w-3 h-3" /> <span>UPI</span>
            </div>
            <div className="text-xl font-bold text-surface-100">₹{stats.UPI.toFixed(2)}</div>
          </div>
          <div className="bg-surface-900 p-4 rounded-xl border border-surface-700 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-1 text-xs text-surface-400 font-semibold mb-1 uppercase tracking-wider">
              <CreditCard className="w-3 h-3" /> <span>Card</span>
            </div>
            <div className="text-xl font-bold text-surface-100">₹{stats.Card.toFixed(2)}</div>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-900">
          {todayOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Receipt className="w-12 h-12 opacity-20" />
              <p>No payments collected today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-surface-700 hover:border-indigo-100 hover:shadow-sm transition-all group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2.5 rounded-lg ${
                      order.payment_type === 'UPI' ? 'bg-blue-500/20 text-blue-600' :
                      order.payment_type === 'Card' ? 'bg-purple-50 text-purple-600' :
                      'bg-emerald-500/20 text-emerald-600'
                    }`}>
                      {order.payment_type === 'UPI' ? <IndianRupee className="w-5 h-5" /> : 
                       order.payment_type === 'Card' ? <CreditCard className="w-5 h-5" /> : 
                       <Banknote className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-surface-100">
                        {order.order_type === 'dine_in' ? `Table ${order.table_number || '-'}` : order.order_type === 'takeaway' ? `Pickup #${order.id}` : `Delivery #${order.id}`}
                      </h4>
                      <div className="text-xs text-surface-400 mt-0.5">
                        {new Date(order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T') + '+05:30').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} • {order.payment_type}
                        {order.customer_name ? ` • ${order.customer_name}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-surface-100">₹{((order.subtotal || 0) + (order.tax_amount || 0)).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Order #{order.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
