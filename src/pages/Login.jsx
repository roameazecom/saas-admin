import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePosStore } from '../store/posStore';
import { KeyRound, Mail, Lock, Store, Coffee, ChefHat, ShoppingBag } from 'lucide-react';
import ServerConfigModal from '../components/common/ServerConfigModal';

import { APP_LOGO_BASE64 } from '../constants/logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const count = prev + 1;
      if (count >= 3) {
        setIsServerModalOpen(true);
        return 0;
      }
      return count;
    });

    if (window.logoClickTimeout) clearTimeout(window.logoClickTimeout);
    window.logoClickTimeout = setTimeout(() => {
      setLogoClicks(0);
    }, 4000);
  };

  const login = useAuthStore((state) => state.login);
  const kdsLogin = useAuthStore((state) => state.kdsLogin);
  const { restaurantDetails } = usePosStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(email, password);
      redirectUser(user.role);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleKdsLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const user = await kdsLogin();
      redirectUser(user.role);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };



  const redirectUser = (role) => {
    if (from !== '/') { navigate(from, { replace: true }); return; }
    switch (role) {
      case 'admin': case 'manager': navigate('/admin', { replace: true }); break;
      case 'waiter': navigate('/waiter', { replace: true }); break;
      case 'kitchen_manager': navigate('/kds', { replace: true }); break;
      default: navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex font-sans relative overflow-hidden" style={{ background: '#f8fafc' }}>
      
      {/* ── LEFT PANEL: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden bg-white/70">
        
        {/* Background art */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(234,88,12,0.04) 0%, transparent 50%)'
        }} />
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full animate-blob" style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Top logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white" style={{
              boxShadow: '0 0 20px rgba(249,115,22,0.3)'
            }}>
              <img src={restaurantDetails?.logo_base64 || APP_LOGO_BASE64} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <span className="text-surface-100 font-black text-lg">{restaurantDetails?.name || 'HappyPie'}</span>
          </div>

          {/* Hero text */}
          <div>
            <h1 className="text-5xl xl:text-6xl font-black leading-tight mb-6" style={{
              background: 'linear-gradient(135deg, #090d16 30%, rgba(15,23,42,0.6))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Run your restaurant smarter.
            </h1>
            <p className="text-lg font-medium text-surface-400">
              Orders, billing & kitchen — all in one place.
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: Coffee, label: 'Menu Dashboard', desc: 'Take orders from tables instantly' },
            { icon: ChefHat, label: 'Kitchen Display', desc: 'Real-time KOT management' },
            { icon: ShoppingBag, label: 'Quick Billing', desc: 'Takeaway & delivery orders' },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.label} className="flex items-center gap-4 p-4 rounded-2xl bg-white/80" style={{
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.2)'
                }}>
                  <Icon className="w-5 h-5" style={{ color: '#ea580c' }} />
                </div>
                <div>
                  <p className="font-bold text-sm text-surface-100">{feat.label}</p>
                  <p className="text-xs text-surface-400">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="relative z-10 text-xs font-bold tracking-widest uppercase text-surface-400">
          Made by Gaurav Yadav
        </p>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative bg-surface-950">
        
        {/* Subtle right glow */}
        <div className="absolute top-0 right-0 w-[60%] h-[60%] rounded-full pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }} />

        <div className="w-full max-w-md animate-slide-up relative z-10">
          
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white" style={{
              boxShadow: '0 0 25px rgba(249,115,22,0.3)'
            }}>
              <img src={restaurantDetails?.logo_base64 || APP_LOGO_BASE64} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <span className="font-black text-xl text-surface-100">{restaurantDetails?.name || 'HappyPie'}</span>
          </div>

          <h2 className="text-3xl font-black text-surface-100 mb-2">Welcome back</h2>
          <p className="text-sm font-medium mb-8 text-surface-400">Sign in to your workspace</p>

          {/* Error */}
          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm font-bold animate-fade-in flex items-center gap-2" style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#dc2626'
            }}>
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-8">
            
            {/* Email */}
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-surface-400">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                  style={{ color: focusedInput === 'email' ? '#ea580c' : 'rgba(15,23,42,0.35)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium"
                  placeholder="admin@appthat.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-surface-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                  style={{ color: focusedInput === 'password' ? '#ea580c' : 'rgba(15,23,42,0.35)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-orange w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <span className="relative z-10">Sign In</span>
                  <KeyRound className="w-4 h-4 relative z-10" />
                </>
              )}
            </button>
          </form>

          {/* One-Tap KDS Bypass */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t" style={{ borderColor: 'rgba(15,23,42,0.06)' }} />
            <span className="flex-shrink mx-4 text-[10px] font-black text-surface-400 uppercase tracking-widest">Kitchen Screen / Android TV</span>
            <div className="flex-grow border-t" style={{ borderColor: 'rgba(15,23,42,0.06)' }} />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleKdsLogin}
            className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all mt-2"
            style={{
              background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.05))',
              border: '1px solid rgba(244,63,94,0.25)',
              color: '#f43f5e',
              cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(244,63,94,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.05))';
            }}
          >
            <ChefHat className="w-4 h-4" />
            <span>One-Tap KDS Login</span>
          </button>
        </div>

        {/* Server IP Config Button is now hidden (access by clicking logo 5 times) */}

        <ServerConfigModal 
          isOpen={isServerModalOpen} 
          onClose={() => setIsServerModalOpen(false)} 
        />

        {/* Mobile footer */}
        <div className="lg:hidden absolute bottom-4 text-xs font-bold tracking-widest uppercase text-surface-400">
          Made by Gaurav Yadav
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden lg:block absolute top-0 left-[45%] w-px h-full" style={{
        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.05) 80%, transparent)'
      }} />
    </div>
  );
}
