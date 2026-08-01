import { useState, useEffect } from 'react';
import { usePosStore } from '../../../store/posStore';
import { 
  Package, AlertTriangle, ShieldCheck, ChevronRight, Plus, Trash2, 
  Edit3, Save, X, Info, Search, ListFilter, CreditCard, UserCheck, 
  DollarSign, FileText, Activity 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryManagement() {
  const { 
    inventoryItems, vendorPayments, staffAdvances,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, logInventoryUsage,
    addVendorPayment, updateVendorPayment, deleteVendorPayment,
    addStaffAdvance, updateStaffAdvance, deleteStaffAdvance
  } = usePosStore();

  const [activeSubTab, setActiveSubTab] = useState('stock'); // 'stock' | 'vendors' | 'advances'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // ==================== STATE FOR FORMS ====================
  // Inventory Form
  const [editingItemId, setEditingItemId] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '', quantity: '', unit: 'kg', category: 'Grocery', min_threshold: '5', red_threshold: '2'
  });

  // Log usage dialog
  const [loggingItemId, setLoggingItemId] = useState(null);
  const [logForm, setLogForm] = useState({
    type: 'consumption', quantity: '', logged_by: 'Manager', notes: ''
  });

  // Vendor Payment Form
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendor_name: '', amount_pending: '', notes: ''
  });

  // Staff Advance Form
  const [editingAdvanceId, setEditingAdvanceId] = useState(null);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    staff_name: '', total_advance_given: '', amount_recovered: '0'
  });

  const categoriesList = ['All', 'Vegetables', 'Dairy', 'Grocery', 'Meat', 'Miscellaneous'];

  // ==================== HANDLERS ====================
  // Inventory
  const handleItemSubmit = (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.unit) return;

    const payload = {
      ...itemForm,
      quantity: parseFloat(itemForm.quantity || 0),
      min_threshold: parseFloat(itemForm.min_threshold || 5),
      red_threshold: parseFloat(itemForm.red_threshold || 2)
    };

    if (editingItemId) {
      updateInventoryItem(editingItemId, payload);
      setEditingItemId(null);
    } else {
      addInventoryItem(payload);
    }

    setItemForm({ name: '', quantity: '', unit: 'kg', category: 'Grocery', min_threshold: '5', red_threshold: '2' });
    setShowItemForm(false);
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!logForm.quantity) return;

    logInventoryUsage(loggingItemId, {
      ...logForm,
      quantity: parseFloat(logForm.quantity)
    });

    setLoggingItemId(null);
    setLogForm({ type: 'consumption', quantity: '', logged_by: 'Manager', notes: '' });
  };

  // Vendor Payment
  const handleVendorSubmit = (e) => {
    e.preventDefault();
    if (!vendorForm.vendor_name || !vendorForm.amount_pending) return;

    const payload = {
      ...vendorForm,
      amount_pending: parseFloat(vendorForm.amount_pending)
    };

    if (editingVendorId) {
      updateVendorPayment(editingVendorId, payload);
      setEditingVendorId(null);
    } else {
      addVendorPayment(payload);
    }

    setVendorForm({ vendor_name: '', amount_pending: '', notes: '' });
    setShowVendorForm(false);
  };

  // Staff Advance
  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    if (!advanceForm.staff_name || !advanceForm.total_advance_given) return;

    const payload = {
      ...advanceForm,
      total_advance_given: parseFloat(advanceForm.total_advance_given),
      amount_recovered: parseFloat(advanceForm.amount_recovered || 0)
    };

    if (editingAdvanceId) {
      updateStaffAdvance(editingAdvanceId, payload);
      setEditingAdvanceId(null);
    } else {
      addStaffAdvance(payload);
    }

    setAdvanceForm({ staff_name: '', total_advance_given: '', amount_recovered: '0' });
    setShowAdvanceForm(false);
  };

  // Quick recovery of staff advance helper
  const handleQuickRecovery = (advance) => {
    const amount = prompt(`Enter amount to recover for ${advance.staff_name}:`, advance.total_advance_given - advance.amount_recovered);
    if (amount === null) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Invalid amount entered');
      return;
    }
    const newRecovered = parseFloat(advance.amount_recovered) + parsed;
    if (newRecovered > advance.total_advance_given) {
      toast.error('Recovered amount cannot exceed the total advance amount');
      return;
    }
    updateStaffAdvance(advance.id, {
      ...advance,
      amount_recovered: newRecovered
    });
  };

  // Helper to determine status color based on threshold levels
  const getStockStatus = (item) => {
    const qty = parseFloat(item.quantity);
    const min = parseFloat(item.min_threshold);
    const red = parseFloat(item.red_threshold);

    if (qty <= red) {
      return { 
        label: 'Critical', 
        bg: 'bg-red-500/10', 
        text: 'text-red-500 border-red-500/30', 
        dot: 'bg-red-500 animate-pulse' 
      };
    } else if (qty <= min) {
      return { 
        label: 'Low Stock', 
        bg: 'bg-amber-500/10', 
        text: 'text-amber-500 border-amber-500/30', 
        dot: 'bg-amber-500' 
      };
    } else {
      return { 
        label: 'Healthy', 
        bg: 'bg-emerald-500/10', 
        text: 'text-emerald-500 border-emerald-500/30', 
        dot: 'bg-emerald-500' 
      };
    }
  };

  // Filter items
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-700/50 pb-4">
        <div className="flex bg-surface-900/60 p-1 rounded-xl border border-surface-700/50 backdrop-blur-md">
          <button
            onClick={() => setActiveSubTab('stock')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm transition-all ${
              activeSubTab === 'stock'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'text-surface-400 hover:text-surface-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Raw Materials Stock</span>
          </button>
          <button
            onClick={() => setActiveSubTab('vendors')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm transition-all ${
              activeSubTab === 'vendors'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'text-surface-400 hover:text-surface-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pending Vendor Payments</span>
          </button>
          <button
            onClick={() => setActiveSubTab('advances')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm transition-all ${
              activeSubTab === 'advances'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'text-surface-400 hover:text-surface-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Staff Advances</span>
          </button>
        </div>

        {/* Global Statistics Indicators */}
        <div className="flex gap-4">
          {activeSubTab === 'stock' && (
            <div className="flex items-center gap-3 bg-surface-900/40 px-4 py-2 rounded-xl border border-surface-700/50 text-xs">
              <span className="text-surface-400 font-bold uppercase">Alerts:</span>
              <span className="flex items-center gap-1 text-red-500 font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                {inventoryItems.filter(i => parseFloat(i.quantity) <= parseFloat(i.red_threshold)).length} Critical
              </span>
              <span className="flex items-center gap-1 text-amber-500 font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                {inventoryItems.filter(i => {
                  const qty = parseFloat(i.quantity);
                  return qty > parseFloat(i.red_threshold) && qty <= parseFloat(i.min_threshold);
                }).length} Low
              </span>
            </div>
          )}

          {activeSubTab === 'vendors' && (
            <div className="bg-surface-900/40 px-4 py-2 rounded-xl border border-surface-700/50 text-xs font-black text-surface-200">
              Total Pending: <span className="text-rose-500 ml-1 text-sm font-black">₹{vendorPayments.reduce((sum, v) => sum + parseFloat(v.amount_pending), 0).toFixed(2)}</span>
            </div>
          )}

          {activeSubTab === 'advances' && (
            <div className="bg-surface-900/40 px-4 py-2 rounded-xl border border-surface-700/50 text-xs font-black text-surface-200">
              Outstanding Advances: <span className="text-cyan-500 ml-1 text-sm font-black">₹{staffAdvances.reduce((sum, a) => sum + (parseFloat(a.total_advance_given) - parseFloat(a.amount_recovered)), 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== SUB TAB: STOCK ==================== */}
      {activeSubTab === 'stock' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-3 w-full">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search raw materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:border-brand-500"
                />
              </div>
              {/* Filter */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500 appearance-none pr-8 cursor-pointer"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat} Category</option>
                  ))}
                </select>
                <ListFilter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => {
                setEditingItemId(null);
                setItemForm({ name: '', quantity: '', unit: 'kg', category: 'Grocery', min_threshold: '5', red_threshold: '2' });
                setShowItemForm(true);
              }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/20 w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Add Raw Material
            </button>
          </div>

          {/* Add / Edit Form Modal */}
          {showItemForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button 
                  onClick={() => setShowItemForm(false)} 
                  className="absolute top-4 right-4 text-surface-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-surface-100 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-500" />
                  {editingItemId ? 'Edit Inventory Item' : 'Add New Raw Material'}
                </h3>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gajar, Paneer, Doodh"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 10"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Unit</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. kg, litre, packet"
                        value={itemForm.unit}
                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Min Alert level (Yellow)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={itemForm.min_threshold}
                        onChange={(e) => setItemForm({ ...itemForm, min_threshold: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Red Alert level</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 2"
                        value={itemForm.red_threshold}
                        onChange={(e) => setItemForm({ ...itemForm, red_threshold: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={itemForm.category}
                      onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                    >
                      {categoriesList.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowItemForm(false)}
                      className="flex-1 bg-surface-950 border border-surface-700 hover:bg-surface-900 text-surface-300 font-bold px-4 py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black px-4 py-2.5 rounded-xl transition-all"
                    >
                      Save Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Log adjustment Form modal */}
          {loggingItemId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button 
                  onClick={() => setLoggingItemId(null)} 
                  className="absolute top-4 right-4 text-surface-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-surface-100 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-500" />
                  Log Stock Update ({inventoryItems.find(i => i.id === loggingItemId)?.name})
                </h3>
                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Action Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['consumption', 'addition', 'adjustment'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setLogForm({ ...logForm, type: t })}
                          className={`py-2 rounded-xl text-xs font-black capitalize border transition-all ${
                            logForm.type === t
                              ? 'bg-brand-600 border-brand-500 text-white'
                              : 'bg-surface-950 border-surface-700 text-surface-400 hover:text-surface-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">
                      Quantity ({inventoryItems.find(i => i.id === loggingItemId)?.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 5"
                      value={logForm.quantity}
                      onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Notes / Comment</label>
                    <textarea
                      placeholder="Add audit reasons..."
                      value={logForm.notes}
                      onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                      className="w-full h-20 bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setLoggingItemId(null)}
                      className="flex-1 bg-surface-950 border border-surface-700 hover:bg-surface-900 text-surface-300 font-bold px-4 py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black px-4 py-2.5 rounded-xl transition-all"
                    >
                      Commit Log
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Stock Table */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-950/40 text-surface-300 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Quantity</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4">Status Alert</th>
                    <th className="p-4 text-right">Min/Red</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-surface-500 font-bold text-sm">
                        No raw materials matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const status = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-surface-900/20 text-sm">
                          <td className="p-4 text-center font-mono text-surface-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-surface-100">{item.name}</td>
                          <td className="p-4 text-surface-300">
                            <span className="bg-surface-950/60 border border-surface-700 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-surface-100">{parseFloat(item.quantity).toFixed(2)}</td>
                          <td className="p-4 text-surface-400 font-bold">{item.unit}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${status.bg} ${status.text}`}>
                              <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4 text-right text-surface-400 font-mono">
                            {parseFloat(item.min_threshold).toFixed(1)} / {parseFloat(item.red_threshold).toFixed(1)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setLoggingItemId(item.id)}
                                className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-black text-xs bg-brand-500/10 border border-brand-500/25 px-2.5 py-1.5 rounded-lg transition-all"
                                title="Update quantity logs"
                              >
                                <Activity className="w-3.5 h-3.5" /> Adjust
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setItemForm({
                                    name: item.name,
                                    quantity: item.quantity,
                                    unit: item.unit,
                                    category: item.category,
                                    min_threshold: item.min_threshold,
                                    red_threshold: item.red_threshold
                                  });
                                  setShowItemForm(true);
                                }}
                                className="p-2 border border-surface-700 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                                    deleteInventoryItem(item.id);
                                  }
                                }}
                                className="p-2 border border-surface-700 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB TAB: VENDORS ==================== */}
      {activeSubTab === 'vendors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-surface-200 text-sm">Vendor Liabilities</h3>
            <button
              onClick={() => {
                setEditingVendorId(null);
                setVendorForm({ vendor_name: '', amount_pending: '', notes: '' });
                setShowVendorForm(true);
              }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Record Pending Payment
            </button>
          </div>

          {/* Vendor Payment Form Modal */}
          {showVendorForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button 
                  onClick={() => setShowVendorForm(false)} 
                  className="absolute top-4 right-4 text-surface-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-surface-100 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-500" />
                  {editingVendorId ? 'Edit Vendor Statement' : 'Log Pending Vendor Balance'}
                </h3>
                <form onSubmit={handleVendorSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Vendor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma Sabzi Wale, Ram Kirana Store"
                      value={vendorForm.vendor_name}
                      onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Amount Pending (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2400"
                      value={vendorForm.amount_pending}
                      onChange={(e) => setVendorForm({ ...vendorForm, amount_pending: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Notes / Reference</label>
                    <textarea
                      placeholder="e.g. Bill from last month, Grocery balance..."
                      value={vendorForm.notes}
                      onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                      className="w-full h-20 bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowVendorForm(false)}
                      className="flex-1 bg-surface-950 border border-surface-700 hover:bg-surface-900 text-surface-300 font-bold px-4 py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black px-4 py-2.5 rounded-xl transition-all"
                    >
                      Save Statement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Vendors list */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-950/40 text-surface-300 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4 text-right">Amount Pending</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {vendorPayments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-surface-500 font-bold text-sm">
                      No pending vendor payments recorded.
                    </td>
                  </tr>
                ) : (
                  vendorPayments.map((vp, idx) => (
                    <tr key={vp.id} className="hover:bg-surface-900/20 text-sm">
                      <td className="p-4 text-center font-mono text-surface-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-surface-100">{vp.vendor_name}</td>
                      <td className="p-4 text-right font-black text-rose-500">₹{parseFloat(vp.amount_pending).toFixed(2)}</td>
                      <td className="p-4 text-surface-300 font-medium italic">{vp.notes || '—'}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingVendorId(vp.id);
                              setVendorForm({
                                vendor_name: vp.vendor_name,
                                amount_pending: vp.amount_pending,
                                notes: vp.notes
                              });
                              setShowVendorForm(true);
                            }}
                            className="p-2 border border-surface-700 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Clear balance for ${vp.vendor_name}?`)) {
                                deleteVendorPayment(vp.id);
                              }
                            }}
                            className="p-2 border border-surface-700 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title="Mark as Cleared / Paid"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB TAB: ADVANCES ==================== */}
      {activeSubTab === 'advances' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-surface-200 text-sm">Employee Advances Ledger</h3>
            <button
              onClick={() => {
                setEditingAdvanceId(null);
                setAdvanceForm({ staff_name: '', total_advance_given: '', amount_recovered: '0' });
                setShowAdvanceForm(true);
              }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Record Staff Advance
            </button>
          </div>

          {/* Staff Advance Form Modal */}
          {showAdvanceForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button 
                  onClick={() => setShowAdvanceForm(false)} 
                  className="absolute top-4 right-4 text-surface-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-surface-100 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-500" />
                  {editingAdvanceId ? 'Edit Advance Ledger' : 'Log Salary Advance'}
                </h3>
                <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Staff Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar, Sunita Devi"
                      value={advanceForm.staff_name}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, staff_name: e.target.value })}
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Total Advance Given (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 3000"
                        value={advanceForm.total_advance_given}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, total_advance_given: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider mb-1.5">Amount Recovered (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 1500"
                        value={advanceForm.amount_recovered}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, amount_recovered: e.target.value })}
                        className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvanceForm(false)}
                      className="flex-1 bg-surface-950 border border-surface-700 hover:bg-surface-900 text-surface-300 font-bold px-4 py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black px-4 py-2.5 rounded-xl transition-all"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Advances list */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-950/40 text-surface-300 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Staff Name</th>
                  <th className="p-4 text-right">Total Advance Given</th>
                  <th className="p-4 text-right">Amount Recovered</th>
                  <th className="p-4 text-right">Outstanding Balance</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {staffAdvances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-surface-500 font-bold text-sm">
                      No staff advance ledgers logged.
                    </td>
                  </tr>
                ) : (
                  staffAdvances.map((sa, idx) => {
                    const outstanding = parseFloat(sa.total_advance_given) - parseFloat(sa.amount_recovered);
                    return (
                      <tr key={sa.id} className="hover:bg-surface-900/20 text-sm">
                        <td className="p-4 text-center font-mono text-surface-400">{idx + 1}</td>
                        <td className="p-4 font-bold text-surface-100">{sa.staff_name}</td>
                        <td className="p-4 text-right font-bold text-surface-100">₹{parseFloat(sa.total_advance_given).toFixed(2)}</td>
                        <td className="p-4 text-right text-emerald-500 font-bold">₹{parseFloat(sa.amount_recovered).toFixed(2)}</td>
                        <td className="p-4 text-right font-black text-rose-500">₹{outstanding.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {outstanding > 0 && (
                              <button
                                onClick={() => handleQuickRecovery(sa)}
                                className="text-emerald-400 bg-emerald-500/10 hover:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all"
                              >
                                Recover Advance
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingAdvanceId(sa.id);
                                setAdvanceForm({
                                  staff_name: sa.staff_name,
                                  total_advance_given: sa.total_advance_given,
                                  amount_recovered: sa.amount_recovered
                                });
                                setShowAdvanceForm(true);
                              }}
                              className="p-2 border border-surface-700 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete advance record for ${sa.staff_name}?`)) {
                                  deleteStaffAdvance(sa.id);
                                }
                              }}
                              className="p-2 border border-surface-700 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
