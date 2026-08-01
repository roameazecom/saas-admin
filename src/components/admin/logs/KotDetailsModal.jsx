import { X } from 'lucide-react';

export default function KotDetailsModal({ isOpen, onClose, kot }) {
  if (!isOpen || !kot) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl shadow-lg w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-900">
          <div>
            <h2 className="text-lg font-bold text-surface-100">KOT Details - {kot.id}</h2>
            <p className="text-sm text-surface-400">
              Generated: {kot.created}
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
              <div className="font-medium text-surface-100">{kot.name || 'N/A'}</div>
              <div className="text-sm text-surface-300">{kot.phone || 'N/A'}</div>
            </div>
            <div className="bg-surface-900 p-3 rounded-lg border border-surface-700">
              <span className="block text-xs font-semibold text-surface-400 mb-1">KOT Info</span>
              <div className="font-medium text-surface-100">{kot.type}</div>
              <div className="text-sm text-surface-300">Status: <span className="font-bold">{kot.status.toUpperCase()}</span></div>
            </div>
          </div>

          <h3 className="font-bold text-surface-100 mb-3 border-b border-surface-700 pb-2">KOT Items</h3>
          <div className="overflow-x-auto border border-surface-700 rounded-lg">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-900 text-surface-300 border-b border-surface-700">
                <tr>
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 font-semibold text-center">Qty</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kot.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-900">
                    <td className="p-3 text-surface-100 font-medium">{item.name}</td>
                    <td className="p-3 text-center text-slate-700 font-bold">{item.quantity}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        item.status === 'ready' ? 'bg-emerald-500/30 text-emerald-700' :
                        item.status === 'preparing' ? 'bg-amber-500/30 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!kot.items || kot.items.length === 0) && (
                  <tr><td colSpan="3" className="p-3 text-center text-surface-400">No items found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700 bg-surface-900 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 bg-surface-900 text-slate-700 rounded-lg font-medium hover:bg-surface-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
