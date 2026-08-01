import { Outlet } from 'react-router-dom';
import FloatingNav from './FloatingNav';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden font-sans relative" style={{ background: '#f8fafc' }}>
      
      {/* Ambient Background Orbs */}
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none animate-blob" 
           style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full pointer-events-none animate-blob animation-delay-4000"
           style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.04) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      <div className="fixed top-[40%] right-[20%] w-[30%] h-[30%] rounded-full pointer-events-none animate-blob animation-delay-2000"
           style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto pb-28 xl:pb-20 focus:outline-none scroll-smooth custom-scrollbar relative z-10">
          <Outlet />
        </main>
      </div>

      <FloatingNav />
    </div>
  );
}
