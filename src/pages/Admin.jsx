import { useState } from 'react';
import { Home, LineChart, Utensils, LayoutDashboard, Receipt, Users, Download, Store, Wallet, Package } from 'lucide-react';
import AdminDashboard from '../components/admin/dashboard/AdminDashboard';
import LogsContainer from '../components/admin/logs/LogsContainer';
import MenuConfiguration from '../components/admin/menu/MenuConfiguration';
import TableConfiguration from '../components/admin/tables/TableConfiguration';
import UserManagement from '../components/admin/users/UserManagement';
import RestaurantSettings from '../components/admin/settings/RestaurantSettings';
import ExpensesStaffManagement from '../components/admin/expenses/ExpensesStaffManagement';
import InventoryManagement from '../components/admin/inventory/InventoryManagement';

import { useAuthStore } from '../store/authStore';

export default function Admin() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard & Reports', icon: <LineChart className="w-4 h-4 mr-2" /> },
    { id: 'logs', label: 'Orders & KOTs', icon: <Receipt className="w-4 h-4 mr-2" /> },
    { id: 'menu', label: 'Menu Configuration', icon: <Utensils className="w-4 h-4 mr-2" /> },
    { id: 'tables', label: 'Table & Areas', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { id: 'expenses', label: 'Expenses & Staff', icon: <Wallet className="w-4 h-4 mr-2" /> },
    { id: 'inventory', label: 'Inventory & Balances', icon: <Package className="w-4 h-4 mr-2" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'restaurant', label: 'Restaurant Details', icon: <Store className="w-4 h-4 mr-2" /> }
  ];

  const tabs = allTabs.filter(tab => {
    if (user?.role === 'manager') {
      return tab.id !== 'users' && tab.id !== 'restaurant';
    }
    return true;
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'logs':
        return <LogsContainer />;
      case 'menu':
        return <MenuConfiguration />;
      case 'tables':
        return <TableConfiguration />;
      case 'expenses':
        return <ExpensesStaffManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'users':
        return <UserManagement />;
      case 'restaurant':
        return <RestaurantSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-950 w-full overflow-hidden relative font-sans">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-brand-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-10 pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-10 pointer-events-none animate-blob animation-delay-4000"></div>

      {/* Admin Top Navigation */}
      <div className="glass-panel border-x-0 border-t-0 border-b border-surface-700/50 px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-2 bg-surface-900/50 px-4 py-2 rounded-xl border border-surface-700 shadow-sm backdrop-blur-sm">
          <Home className="w-5 h-5 text-brand-500 mr-2" />
          <span className="text-surface-400 font-bold">/</span>
          <h1 className="text-xl font-black text-surface-100 ml-2 uppercase tracking-wide">Administration</h1>
        </div>
        <button 
          onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/excel`, '_blank')}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 hover-lift active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-surface-900/60 backdrop-blur-md px-6 border-b border-surface-700/50 shrink-0 z-10 shadow-sm">
        <div className="flex space-x-6 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-2 border-b-[3px] font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700 drop-shadow-sm'
                  : 'border-transparent text-surface-400 hover:text-surface-100 hover:border-surface-650'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="bg-surface-900/80 backdrop-blur-xl rounded-[2rem] border border-surface-700/60 shadow-glass min-h-full p-2 animate-fade-in">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
