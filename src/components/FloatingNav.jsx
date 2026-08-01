import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Coffee, Receipt, Settings, LogOut, ShoppingBag, User, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

import toast from 'react-hot-toast';

export default function FloatingNav() {
  const { user, logout } = useAuthStore();
  const { mobileView, setMobileView } = useUiStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentUrl = localStorage.getItem('POS_SERVER_URL') || '';
  const isCloud = !currentUrl || currentUrl.includes('happypiecafe.in');

  const toggleServer = async () => {
    const targetMode = isCloud ? 'Local Server (http://localhost:5000)' : 'Cloud Server (https://apn.happypiecafe.in)';
    const confirmSwitch = window.confirm(`Are you sure you want to switch the application to ${targetMode}?`);
    if (!confirmSwitch) return;

    if (isCloud) {
      localStorage.setItem('POS_SERVER_URL', 'http://localhost:5000');
      toast.success('Switched to Local Server Mode (http://localhost:5000)');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const syncToast = toast.loading('Syncing offline data to cloud database...');
      try {
        await axios.post('/api/config/sync-now');
        toast.success('Offline data successfully synced to Cloud!', { id: syncToast });
      } catch (err) {
        toast.error('Sync failed (offline or connection issue), switching anyway...', { id: syncToast });
      }
      localStorage.setItem('POS_SERVER_URL', 'https://apn.happypiecafe.in');
      toast.success('Switched to Cloud Server Mode (https://apn.happypiecafe.in)');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavigation = [
    { name: 'Menu', href: '/waiter', icon: Coffee, roles: ['waiter', 'admin', 'manager'], color: '#fb923c', onClickView: 'menu' },
    { name: 'Cart', href: '/waiter', icon: ShoppingCart, roles: ['waiter', 'admin', 'manager'], color: '#fb923c', onClickView: 'cart' },
    { name: 'Kitchen', href: '/kds', icon: ChefHat, roles: ['kitchen_manager', 'admin', 'manager'], color: '#f43f5e' },
    { name: 'Takeaway', href: '/takeaway', icon: ShoppingBag, roles: ['admin', 'manager', 'waiter'], color: '#a78bfa' },
    { name: 'Billing', href: '/billing', icon: Receipt, roles: ['admin', 'manager'], color: '#34d399' },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin', 'manager'], color: '#60a5fa' },
  ];

  const navigation = allNavigation.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className="fixed bottom-5 xl:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className="relative">
        {/* Glow behind nav */}
        <div className="absolute inset-0 rounded-full blur-xl opacity-60"
             style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />

        <div className="relative flex items-center gap-1 px-3 py-2.5 rounded-full"
             style={{
               background: 'rgba(255, 255, 255, 0.9)',
               backdropFilter: 'blur(30px)',
               WebkitBackdropFilter: 'blur(30px)',
               border: '1px solid rgba(0, 0, 0, 0.08)',
               boxShadow: '0 8px 40px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
             }}>
          
          {navigation.map((item) => {
            const Icon = item.icon;
            const isLinkActive = item.onClickView
              ? pathname === '/waiter' && mobileView === item.onClickView
              : pathname === item.href;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                title={item.name}
                onClick={() => {
                  if (item.onClickView) {
                    setMobileView(item.onClickView);
                  }
                }}
                className={() =>
                  `relative flex flex-col items-center justify-center w-12 h-12 xl:w-14 xl:h-14 rounded-full transition-all duration-300 group ${
                    isLinkActive ? 'nav-active' : 'text-surface-400 hover:text-surface-200'
                  }`
                }
              >
                {() => (
                  <>
                    {isLinkActive && (
                      <div className="absolute inset-0 rounded-full animate-pulse-glow" />
                    )}
                    <Icon
                      className={`w-5 h-5 xl:w-6 xl:h-6 transition-all duration-300 relative z-10 ${
                        isLinkActive ? '' : 'group-hover:scale-110'
                      }`}
                      style={isLinkActive ? { color: item.color, filter: `drop-shadow(0 0 8px ${item.color}80)` } : {}}
                    />
                    <span className={`text-[9px] font-bold mt-0.5 transition-all ${
                      isLinkActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                    }`}
                    style={isLinkActive ? { color: item.color } : {}}>
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Divider */}
          <div className="w-px h-8 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />

          {/* User Avatar */}
          {user && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black cursor-default relative"
              title={`${user.name} (${user.role})`}
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))',
                border: '1px solid rgba(249,115,22,0.25)',
                color: '#ea580c',
              }}
            >
              {user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
          )}

          {/* Server Switch Toggle (Visible to everyone, but only interactive for Admin & Manager) */}
          {user && (
            <button
              onClick={(user.role === 'admin' || user.role === 'manager') ? toggleServer : undefined}
              title={
                (user.role === 'admin' || user.role === 'manager')
                  ? (isCloud ? "Switch to Local Server" : "Switch to Cloud Server")
                  : `Server Mode: ${isCloud ? 'Cloud' : 'Local'}`
              }
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: isCloud 
                  ? 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(59,130,246,0.08))' 
                  : 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))',
                border: isCloud 
                  ? '1px solid rgba(96,165,250,0.25)' 
                  : '1px solid rgba(52,211,153,0.25)',
                color: isCloud ? '#3b82f6' : '#10b981',
                cursor: (user.role === 'admin' || user.role === 'manager') ? 'pointer' : 'default',
                opacity: (user.role === 'admin' || user.role === 'manager') ? 1 : 0.85
              }}
            >
              <span className="text-sm">{isCloud ? '☁️' : '💻'}</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group"
            style={{ color: 'rgba(15,23,42,0.4)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.border = '1px solid rgba(239,68,68,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(15,23,42,0.4)';
              e.currentTarget.style.border = '1px solid transparent';
            }}
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
