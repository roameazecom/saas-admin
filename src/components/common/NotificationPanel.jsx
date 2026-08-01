import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, Info, X } from 'lucide-react';
import { usePosStore } from '../../store/posStore';

export default function NotificationPanel({ align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const { notifications, unreadNotificationsCount, markNotificationsRead } = usePosStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadNotificationsCount > 0) {
      // Mark as read when opening the panel
      markNotificationsRead();
    }
  };

  const formatTime = (time) => {
    const diffMins = Math.floor((Date.now() - time) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6 text-surface-300" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full animate-bounce">
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 bg-surface-900 rounded-2xl shadow-xl border border-surface-700 overflow-hidden z-[100] animate-fade-in`}>
          <div className="p-4 border-b border-surface-700 bg-surface-900 flex justify-between items-center">
            <h3 className="font-bold text-surface-100">Notifications</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-full text-surface-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-surface-900 transition-colors flex gap-3 ${!notif.read ? 'bg-indigo-500/20/50' : ''}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {notif.type === 'success' ? (
                      <div className="p-2 bg-emerald-500/30 text-emerald-600 rounded-full">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-100">{notif.message}</p>
                    <p className="text-xs font-medium text-surface-400 mt-1">{formatTime(notif.time)}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 ml-auto mt-2 shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 bg-surface-900 border-t border-surface-700 text-center">
              <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">End of notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
