import { useState } from 'react';
import { X, Lock, MessageSquare } from 'lucide-react';
import { usePosStore } from '../../store/posStore';
import toast from 'react-hot-toast';

export default function ManagerAuthModal({ isOpen, onClose, onConfirm, itemName, role, requirePin = false }) {
  const { restaurantDetails } = usePosStore();
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('Changed Mind');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const isManagerOrAdmin = role === 'manager' || role === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();

    // Verify PIN against restaurant daily PIN if required and not manager/admin
    if (requirePin && !isManagerOrAdmin) {
      const validPin = restaurantDetails?.daily_pin || '1234';
      if (pin !== validPin) {
        toast.error('Invalid Manager Daily PIN!');
        return;
      }
    }

    const finalReason = reason === 'Other' ? customReason || 'Other reason' : reason;
    if (!finalReason.trim()) {
      toast.error('Please specify a reason!');
      return;
    }

    onConfirm(finalReason);
    setPin('');
    setCustomReason('');
    onClose();
  };

  const REASONS = [
    'Changed Mind',
    'Too Spicy',
    'Overcooked / Burnt',
    'Customer Complained / Disliked',
    'Wrong Order Taken',
    'Long Waiting Delay',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl animate-scale-in">
        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />
        
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              {requirePin ? 'Manager Approval Required' : 'Cancel/Delete Item'}
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Authorizing deletion of: <span className="text-red-500">{itemName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* PIN Input */}
          {requirePin && !isManagerOrAdmin && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Manager Daily PIN
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-extrabold border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-red-500 bg-slate-50"
              />
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
              Cancellation Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:border-red-500 bg-white text-slate-800"
            >
              {REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Custom text reason */}
          {reason === 'Other' && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Explain Reason
              </label>
              <textarea
                rows={2}
                required
                placeholder="Enter customer feedback or cancel explanation..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-red-500 bg-slate-50"
              />
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-650 hover:to-rose-650 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              Confirm Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
