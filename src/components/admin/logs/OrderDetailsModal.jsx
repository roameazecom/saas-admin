import { X } from 'lucide-react';

export default function OrderDetailsModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return '';
    const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + '+05:30';
    return new Date(isoStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl shadow-lg w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-900">
          <div>
            <h2 className="text-lg font-bold text-surface-100">Order Details - #{order.id}</h2>
            <p className="text-sm text-surface-400">
              {formatOrderDate(order.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-surface-300 rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-surface-900">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-900 p-3 rounded-lg border border-surface-700">
              <span className="block text-xs font-semibold text-surface-400 mb-1">Customer Info</span>
              <div className="font-medium text-surface-100">{order.customer_name || 'N/A'}</div>
              <div className="text-sm text-surface-300">{order.customer_phone || 'N/A'}</div>
            </div>
            <div className="bg-surface-900 p-3 rounded-lg border border-surface-700">
              <span className="block text-xs font-semibold text-surface-400 mb-1">Order Info</span>
              <div className="font-medium text-surface-100">
                {order.order_type === 'dine_in' ? `Dine In (Table ${order.table_number})` : 
                 order.order_type === 'takeaway' ? `Takeaway (Pickup #${order.id})` : 
                 order.order_type === 'delivery' ? `Delivery (#${order.id})` : `Dine In (Table ${order.table_number})`}
              </div>
              <div className="text-sm text-surface-300">Status: <span className="font-bold">{order.status.toUpperCase()}</span></div>
            </div>
          </div>

          <h3 className="font-bold text-surface-100 mb-3 border-b border-surface-700 pb-2">Order Items</h3>
          <div className="overflow-x-auto border border-surface-700 rounded-lg">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-900 text-surface-300 border-b border-surface-700">
                <tr>
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 font-semibold text-center">Qty</th>
                  <th className="p-3 font-semibold text-right">Price</th>
                  <th className="p-3 font-semibold text-right">Total</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-900">
                    <td className="p-3 text-surface-100 font-medium">{item.name}</td>
                    <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-700">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="p-3 text-right text-surface-100 font-medium">₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        item.status === 'served' ? 'bg-emerald-500/30 text-emerald-700' :
                        item.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'preparing' ? 'bg-amber-500/30 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <tr><td colSpan="5" className="p-3 text-center text-surface-400">No items found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700 bg-surface-900 flex flex-col items-end">
          <div className="flex justify-between w-64 mb-1 text-sm">
            <span className="text-surface-300">Subtotal:</span>
            <span className="font-medium text-surface-100">₹{(order.subtotal || 0).toFixed(2)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between w-64 mb-1 text-sm text-emerald-600">
              <span>Discount:</span>
              <span className="font-medium">-₹{(order.discount_amount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 mb-2 text-sm">
            <span className="text-surface-300">Tax:</span>
            <span className="font-medium text-surface-100">₹{(order.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-64 text-base border-t border-surface-700 pt-2">
            <span className="font-bold text-surface-100">Grand Total:</span>
            <span className="font-bold text-rose-600">₹{(order.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
