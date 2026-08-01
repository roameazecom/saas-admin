import { useState, useEffect } from 'react';
import { usePosStore } from '../../../store/posStore';
import { useAuthStore } from '../../../store/authStore';
import { 
  Users, Wallet, Truck, Plus, Trash2, Edit3, Save, X, Calendar, 
  MapPin, UserCheck, CreditCard, Fuel, Navigation, FileText 
} from 'lucide-react';

export default function ExpensesStaffManagement() {
  const { 
    staff, expenses, vehicles, trips,
    fetchExpensesData,
    addStaff, updateStaff, deleteStaff,
    addExpense, updateExpense, deleteExpense,
    addVehicle, updateVehicle, deleteVehicle,
    addTrip, updateTrip, deleteTrip
  } = usePosStore();

  const { users, fetchUsers } = useAuthStore();

  const [subTab, setSubTab] = useState('staff'); // 'staff' | 'expenses' | 'vehicles' | 'trips'

  // Fetch initial data
  useEffect(() => {
    fetchExpensesData();
    fetchUsers();
  }, []);

  // Pre-defined categories and vendors from user screenshots
  const EXPENSE_CATEGORIES = [
    'Utilities', 'Maintenance & Repairs', 'Laundry', 'Staff Welfare', 
    'Marketing', 'Decoration', 'Stationery', 'Cleaning Supplies', 
    'Guest Amenities', 'Rent', 'Vehicle', 'Swimming Pool', 'Miscellaneous'
  ];

  const DEFAULT_VENDORS = [
    'Sabji wala', 'UJJIYARA', 'Arora', 'HP Petrol Pump', 'Other Vendor', 
    'Hooney Disposable', 'Gas', 'Wood Supplier', 'Chickenwala'
  ];

  const TRIP_PURPOSES = [
    'Market Purchase', 'Guest Pickup', 'Guest Drop', 
    'Staff Pickup / Drop', 'Resort Maintenance', 'Owner Personal Use', 'Other'
  ];

  // ==================== STATE FOR FORMS ====================
  // Staff Form
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '', role: '', monthly_salary: '', join_date: new Date().toISOString().split('T')[0],
    phone_number: '', is_management: false, notes: '', user_id: ''
  });

  // Expense Form
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    category: EXPENSE_CATEGORIES[0], vendor_name: DEFAULT_VENDORS[0], 
    amount: '', payment_mode: 'Cash', paid_by: '', date: new Date().toISOString().split('T')[0], comment: ''
  });
  // Expense Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPaymentMode, setFilterPaymentMode] = useState('All');
  const [filterPaidBy, setFilterPaidBy] = useState('All');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Vehicle Form
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '', vehicle_type: '', fuel_type: 'Diesel', average_kml: '', notes: ''
  });

  // Trip Form
  const [editingTripId, setEditingTripId] = useState(null);
  const [tripForm, setTripForm] = useState({
    vehicle_id: '', purpose: TRIP_PURPOSES[0], date: new Date().toISOString().split('T')[0],
    start_reading: '', end_reading: '', fuel_added_litres: '0', fuel_amount: '0', driver_name: '', notes: ''
  });

  // Helper: auto-add asterisk for management staff name
  const handleStaffSubmit = (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role || !staffForm.monthly_salary) return;

    let formattedName = staffForm.name.trim().toUpperCase();
    if (staffForm.is_management && !formattedName.endsWith('*')) {
      formattedName = `${formattedName}*`;
    } else if (!staffForm.is_management && formattedName.endsWith('*')) {
      formattedName = formattedName.slice(0, -1);
    }

    const payload = {
      ...staffForm,
      name: formattedName,
      user_id: staffForm.user_id ? parseInt(staffForm.user_id, 10) : null
    };

    if (editingStaffId) {
      updateStaff(editingStaffId, payload);
      setEditingStaffId(null);
    } else {
      addStaff(payload);
    }

    setStaffForm({
      name: '', role: '', monthly_salary: '', join_date: new Date().toISOString().split('T')[0],
      phone_number: '', is_management: false, notes: '', user_id: ''
    });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.date) return;

    if (editingExpenseId) {
      updateExpense(editingExpenseId, expenseForm);
      setEditingExpenseId(null);
    } else {
      addExpense(expenseForm);
    }

    setExpenseForm({
      category: EXPENSE_CATEGORIES[0], vendor_name: DEFAULT_VENDORS[0], 
      amount: '', payment_mode: 'Cash', paid_by: '', date: new Date().toISOString().split('T')[0], comment: ''
    });
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    if (!vehicleForm.vehicle_type) return;

    if (editingVehicleId) {
      updateVehicle(editingVehicleId, vehicleForm);
      setEditingVehicleId(null);
    } else {
      addVehicle(vehicleForm);
    }

    setVehicleForm({
      vehicle_number: '', vehicle_type: '', fuel_type: 'Diesel', average_kml: '', notes: ''
    });
  };

  const handleTripSubmit = (e) => {
    e.preventDefault();
    if (!tripForm.vehicle_id || !tripForm.purpose || !tripForm.start_reading || !tripForm.end_reading) return;

    const payload = {
      ...tripForm,
      vehicle_id: parseInt(tripForm.vehicle_id, 10),
      start_reading: parseInt(tripForm.start_reading, 10),
      end_reading: parseInt(tripForm.end_reading, 10),
      fuel_added_litres: parseFloat(tripForm.fuel_added_litres || 0),
      fuel_amount: parseFloat(tripForm.fuel_amount || 0)
    };

    if (editingTripId) {
      updateTrip(editingTripId, payload);
      setEditingTripId(null);
    } else {
      addTrip(payload);
    }

    setTripForm({
      vehicle_id: '', purpose: TRIP_PURPOSES[0], date: new Date().toISOString().split('T')[0],
      start_reading: '', end_reading: '', fuel_added_litres: '0', fuel_amount: '0', driver_name: '', notes: ''
    });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 lg:p-6 space-y-6">
      
      {/* Sub tabs switcher */}
      <div className="flex space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-700/60 w-fit shrink-0">
        {[
          { id: 'staff', label: 'Staff List', icon: Users },
          { id: 'expenses', label: 'Outflows / Expenses', icon: Wallet },
          { id: 'vehicles', label: 'Vehicle Details', icon: Truck },
          { id: 'trips', label: 'Trip Logs', icon: Navigation }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                subTab === tab.id
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Inner Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* ==================== 1. STAFF TAB ==================== */}
        {subTab === 'staff' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Form */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 space-y-4">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                {editingStaffId ? 'Edit Staff Member' : 'Register New Staff'}
              </h3>
              <form onSubmit={handleStaffSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Staff Name</label>
                  <input
                    type="text" required placeholder="VISHAL" value={staffForm.name}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Role / Kaam</label>
                    <input
                      type="text" required placeholder="SERVICE" value={staffForm.role}
                      onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Monthly Salary</label>
                    <input
                      type="number" required placeholder="15000" value={staffForm.monthly_salary}
                      onChange={e => setStaffForm({ ...staffForm, monthly_salary: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Join Date</label>
                    <input
                      type="date" required value={staffForm.join_date}
                      onChange={e => setStaffForm({ ...staffForm, join_date: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="tel" placeholder="9876543210" value={staffForm.phone_number}
                      onChange={e => setStaffForm({ ...staffForm, phone_number: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>
                
                {/* Management Flag */}
                <div className="flex items-center gap-3 py-2 bg-slate-900/30 px-3 rounded-xl border border-slate-800">
                  <input
                    type="checkbox" id="is_mgmt" checked={staffForm.is_management}
                    onChange={e => setStaffForm({ ...staffForm, is_management: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="is_mgmt" className="text-xs font-bold text-slate-300 select-none">
                    Management Staff? (Allowed Free Food/Rooms)
                  </label>
                </div>

                {/* Connected Login User */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-orange-500" /> Connected POS Login User
                  </label>
                  <select
                    value={staffForm.user_id}
                    onChange={e => setStaffForm({ ...staffForm, user_id: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  >
                    <option value="">-- No Account Linked --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    placeholder="Extra details..." value={staffForm.notes} rows={2}
                    onChange={e => setStaffForm({ ...staffForm, notes: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-orange flex-1 py-2.5 rounded-xl text-sm">
                    {editingStaffId ? 'Update Info' : 'Add to Database'}
                  </button>
                  {editingStaffId && (
                    <button
                      type="button" onClick={() => {
                        setEditingStaffId(null);
                        setStaffForm({
                          name: '', role: '', monthly_salary: '', join_date: new Date().toISOString().split('T')[0],
                          phone_number: '', is_management: false, notes: '', user_id: ''
                        });
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-sm border border-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col">
              <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Staff Directory
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Salary</th>
                      <th className="py-3 px-4">Join Date</th>
                      <th className="py-3 px-4">Linked User</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">
                          {s.name}
                          {s.is_management ? (
                            <span className="ml-1.5 text-[9px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full">MGMT</span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{s.role}</td>
                        <td className="py-3 px-4 font-black">₹ {parseFloat(s.monthly_salary).toFixed(0)}</td>
                        <td className="py-3 px-4">{s.join_date}</td>
                        <td className="py-3 px-4">
                          {s.linked_username ? (
                            <span className="text-xs text-orange-500 font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              {s.linked_username}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unlinked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStaffId(s.id);
                              setStaffForm({
                                name: s.name, role: s.role, monthly_salary: s.monthly_salary, join_date: s.join_date,
                                phone_number: s.phone_number || '', is_management: !!s.is_management, notes: s.notes || '', user_id: s.user_id || ''
                              });
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if(confirm('Delete staff member?')) deleteStaff(s.id); }}
                            className="p-1.5 bg-red-950 hover:bg-red-900 text-red-500 rounded-lg transition-colors border border-red-900/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500 font-bold">No staff members in directory.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. EXPENSES TAB ==================== */}
        {/* ==================== 2. EXPENSES TAB ==================== */}
        {subTab === 'expenses' && (() => {
          const filteredExpenses = expenses.filter(e => {
            if (filterStartDate && e.date < filterStartDate) return false;
            if (filterEndDate && e.date > filterEndDate) return false;
            if (filterCategory !== 'All' && e.category !== filterCategory) return false;
            if (filterPaymentMode !== 'All' && e.payment_mode !== filterPaymentMode) return false;
            if (filterPaidBy !== 'All' && e.paid_by !== filterPaidBy) return false;
            if (filterSearchQuery) {
              const q = filterSearchQuery.toLowerCase();
              const vendor = (e.vendor_name || '').toLowerCase();
              const comment = (e.comment || '').toLowerCase();
              if (!vendor.includes(q) && !comment.includes(q)) return false;
            }
            return true;
          });

          const totalFilteredSum = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

          return (
            <div className="space-y-6">
              {/* Filter Panel */}
              <div className="glass-panel p-5 rounded-3xl border border-slate-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-orange-500" /> Filter & Analyze Expenses
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
                      Logs: {filteredExpenses.length}
                    </span>
                    <span className="text-xs font-black text-white bg-orange-600 px-3 py-1 rounded-lg shadow-sm">
                      Total: ₹{totalFilteredSum.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Start Date</label>
                    <input
                      type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">End Date</label>
                    <input
                      type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Category</label>
                    <select
                      value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="All">All Categories</option>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Payment Mode</label>
                    <select
                      value={filterPaymentMode} onChange={e => setFilterPaymentMode(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="All">All Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Paid By (Staff)</label>
                    <select
                      value={filterPaidBy} onChange={e => setFilterPaidBy(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="All">All Staff</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Keyword Search</label>
                    <input
                      type="text" placeholder="Vendor / comments..." value={filterSearchQuery} onChange={e => setFilterSearchQuery(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterCategory('All');
                      setFilterPaymentMode('All');
                      setFilterPaidBy('All');
                      setFilterSearchQuery('');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs border border-slate-750 font-bold transition-all"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Form */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 space-y-4">
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-orange-500" />
                    {editingExpenseId ? 'Edit Outflow Record' : 'Record Outflow/Expense'}
                  </h3>
                  <form onSubmit={handleExpenseSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Category</label>
                        <select
                          value={expenseForm.category}
                          onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Vendor/Payee</label>
                        <select
                          value={expenseForm.vendor_name}
                          onChange={e => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                          className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                        >
                          {DEFAULT_VENDORS.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                          <option value="Custom">Custom Payee</option>
                        </select>
                      </div>
                    </div>

                    {expenseForm.vendor_name === 'Custom' && (
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Custom Payee Name</label>
                        <input
                          type="text" placeholder="Enter custom name"
                          onChange={e => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                        <input
                          type="number" required placeholder="500" value={expenseForm.amount}
                          onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
                        <select
                          value={expenseForm.payment_mode}
                          onChange={e => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                          className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                        <input
                          type="date" required value={expenseForm.date}
                          onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Paid By (Staff)</label>
                        <select
                          value={expenseForm.paid_by}
                          onChange={e => setExpenseForm({ ...expenseForm, paid_by: e.target.value })}
                          className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                        >
                          <option value="">-- Select Staff --</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Comments</label>
                      <textarea
                        placeholder="Bill invoice ref etc..." value={expenseForm.comment} rows={2}
                        onChange={e => setExpenseForm({ ...expenseForm, comment: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="btn-orange flex-1 py-2.5 rounded-xl text-sm">
                        {editingExpenseId ? 'Update Record' : 'Record Outflow'}
                      </button>
                      {editingExpenseId && (
                        <button
                          type="button" onClick={() => {
                            setEditingExpenseId(null);
                            setExpenseForm({
                              category: EXPENSE_CATEGORIES[0], vendor_name: DEFAULT_VENDORS[0], 
                              amount: '', payment_mode: 'Cash', paid_by: '', date: new Date().toISOString().split('T')[0], comment: ''
                            });
                          }}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-sm border border-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col">
                  <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-orange-500" />
                    Expenses & Outflows Log
                  </h3>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-700 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Vendor</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4">Paid By</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                        {filteredExpenses.map(e => (
                          <tr key={e.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 px-4">{e.date}</td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700">{e.category}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-100">{e.vendor_name}</td>
                            <td className="py-3 px-4 text-red-400 font-black">₹ {parseFloat(e.amount).toFixed(0)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                                e.payment_mode === 'UPI' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                e.payment_mode === 'Card' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              }`}>
                                {e.payment_mode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{e.paid_by || 'N/A'}</td>
                            <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingExpenseId(e.id);
                                  setExpenseForm({
                                    category: e.category, vendor_name: e.vendor_name, amount: e.amount,
                                    payment_mode: e.payment_mode, paid_by: e.paid_by || '', date: e.date, comment: e.comment || ''
                                  });
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors border border-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if(confirm('Delete expense?')) deleteExpense(e.id); }}
                                className="p-1.5 bg-red-950 hover:bg-red-900 text-red-500 rounded-lg transition-colors border border-red-900/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-500 font-bold">No outflow logs match your search filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== 3. VEHICLES TAB ==================== */}
        {subTab === 'vehicles' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Form */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 space-y-4">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                {editingVehicleId ? 'Edit Vehicle Details' : 'Register Vehicle'}
              </h3>
              <form onSubmit={handleVehicleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Vehicle Type / Name</label>
                  <input
                    type="text" required placeholder="Mahindra Bolero / Bike" value={vehicleForm.vehicle_type}
                    onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Vehicle Number</label>
                  <input
                    type="text" placeholder="HR98 D 3247" value={vehicleForm.vehicle_number}
                    onChange={e => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Fuel Type</label>
                    <select
                      value={vehicleForm.fuel_type}
                      onChange={e => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Average (km/l)</label>
                    <input
                      type="number" step="0.1" placeholder="14" value={vehicleForm.average_kml}
                      onChange={e => setVehicleForm({ ...vehicleForm, average_kml: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    placeholder="Vehicle notes..." value={vehicleForm.notes} rows={2}
                    onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-orange flex-1 py-2.5 rounded-xl text-sm">
                    {editingVehicleId ? 'Update Info' : 'Register Vehicle'}
                  </button>
                  {editingVehicleId && (
                    <button
                      type="button" onClick={() => {
                        setEditingVehicleId(null);
                        setVehicleForm({
                          vehicle_number: '', vehicle_type: '', fuel_type: 'Diesel', average_kml: '', notes: ''
                        });
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-sm border border-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col">
              <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-500" />
                Registered Vehicles
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Type / Name</th>
                      <th className="py-3 px-4">Vehicle Number</th>
                      <th className="py-3 px-4">Fuel Type</th>
                      <th className="py-3 px-4">Average (km/l)</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {vehicles.map(v => (
                      <tr key={v.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">{v.vehicle_type}</td>
                        <td className="py-3 px-4 text-slate-700">{v.vehicle_number || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                            v.fuel_type === 'Diesel' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {v.fuel_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black">{v.average_kml ? `${v.average_kml} km/l` : 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{v.notes || '-'}</td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingVehicleId(v.id);
                              setVehicleForm({
                                vehicle_number: v.vehicle_number || '', vehicle_type: v.vehicle_type,
                                fuel_type: v.fuel_type, average_kml: v.average_kml || '', notes: v.notes || ''
                              });
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if(confirm('Delete vehicle?')) deleteVehicle(v.id); }}
                            className="p-1.5 bg-red-950 hover:bg-red-900 text-red-500 rounded-lg transition-colors border border-red-900/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500 font-bold">No vehicles registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. TRIP LOGS TAB ==================== */}
        {subTab === 'trips' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Form */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 space-y-4">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                {editingTripId ? 'Edit Trip Details' : 'Record Trip Log'}
              </h3>
              <form onSubmit={handleTripSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Vehicle</label>
                    <select
                      required value={tripForm.vehicle_id}
                      onChange={e => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="">-- Select --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.vehicle_type} ({v.vehicle_number || 'N/A'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Purpose</label>
                    <select
                      value={tripForm.purpose}
                      onChange={e => setTripForm({ ...tripForm, purpose: e.target.value })}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      {TRIP_PURPOSES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Start Reading (km)</label>
                    <input
                      type="number" required placeholder="12500" value={tripForm.start_reading}
                      onChange={e => setTripForm({ ...tripForm, start_reading: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">End Reading (km)</label>
                    <input
                      type="number" required placeholder="12580" value={tripForm.end_reading}
                      onChange={e => setTripForm({ ...tripForm, end_reading: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Fuel Added (Litres)</label>
                    <input
                      type="number" step="0.01" value={tripForm.fuel_added_litres}
                      onChange={e => setTripForm({ ...tripForm, fuel_added_litres: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Fuel Cost (₹)</label>
                    <input
                      type="number" step="0.01" value={tripForm.fuel_amount}
                      onChange={e => setTripForm({ ...tripForm, fuel_amount: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                    <input
                      type="date" required value={tripForm.date}
                      onChange={e => setTripForm({ ...tripForm, date: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Driver Name</label>
                    <select
                      value={tripForm.driver_name}
                      onChange={e => setTripForm({ ...tripForm, driver_name: e.target.value })}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      <option value="">-- Select Driver --</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    placeholder="Route details etc..." value={tripForm.notes} rows={2}
                    onChange={e => setTripForm({ ...tripForm, notes: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-orange flex-1 py-2.5 rounded-xl text-sm">
                    {editingTripId ? 'Update Trip' : 'Save Trip Log'}
                  </button>
                  {editingTripId && (
                    <button
                      type="button" onClick={() => {
                        setEditingTripId(null);
                        setTripForm({
                          vehicle_id: '', purpose: TRIP_PURPOSES[0], date: new Date().toISOString().split('T')[0],
                          start_reading: '', end_reading: '', fuel_added_litres: '0', fuel_amount: '0', driver_name: '', notes: ''
                        });
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-sm border border-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col">
              <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-orange-500" />
                Trip & Fuel logs
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Total Run</th>
                      <th className="py-3 px-4">Odometer</th>
                      <th className="py-3 px-4">Fuel Log</th>
                      <th className="py-3 px-4">Driver</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {trips.map(t => {
                      const totalRun = t.end_reading - t.start_reading;
                      return (
                        <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-4">{t.date}</td>
                          <td className="py-3 px-4 font-bold text-slate-100">
                            {t.vehicle_type} <span className="text-[10px] text-slate-700 font-normal">({t.vehicle_number || 'N/A'})</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 text-slate-300">{t.purpose}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-orange-500">{totalRun} km</td>
                          <td className="py-3 px-4 text-slate-700">{t.start_reading} - {t.end_reading}</td>
                          <td className="py-3 px-4">
                            {t.fuel_added_litres > 0 ? (
                              <span className="flex flex-col text-[10px] text-slate-300">
                                <span>⛽ {t.fuel_added_litres} L</span>
                                <span className="font-bold text-slate-700">₹ {t.fuel_amount}</span>
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{t.driver_name || 'N/A'}</td>
                          <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTripId(t.id);
                                setTripForm({
                                  vehicle_id: t.vehicle_id, purpose: t.purpose, date: t.date,
                                  start_reading: t.start_reading, end_reading: t.end_reading,
                                  fuel_added_litres: t.fuel_added_litres, fuel_amount: t.fuel_amount,
                                  driver_name: t.driver_name || '', notes: t.notes || ''
                                });
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { if(confirm('Delete trip log?')) deleteTrip(t.id); }}
                              className="p-1.5 bg-red-950 hover:bg-red-900 text-red-500 rounded-lg transition-colors border border-red-900/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {trips.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-slate-500 font-bold">No trips logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
