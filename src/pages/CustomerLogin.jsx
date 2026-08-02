import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePosStore } from '../store/posStore';
import { Store, User, Phone, KeyRound, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';
import { APP_LOGO_BASE64 } from '../constants/logo';

export default function CustomerLogin() {
  const { tables, locations, restaurantDetails, fetchData } = usePosStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tableId, setTableId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!tableId) {
      toast.error('Please select your table number');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your mobile number');
      return;
    }
    if (pin.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${API_URL}/auth/customer-login`, {
        name: name.trim(),
        phone: phone.trim(),
        table_id: parseInt(tableId, 10),
        pin: pin
      });

      if (response.data.success) {
        localStorage.setItem('customer_session', JSON.stringify(response.data.customer));
        toast.success(`Welcome to ${restaurantDetails?.name || 'Restaurant'}!`);
        navigate('/customer');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans px-4 py-8 relative overflow-hidden" 
         style={{ background: '#f8fafc' }}>
      
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-orange-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[60%] h-[60%] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] shadow-glass p-8 relative z-10">
        
        {/* Logo/Restaurant Name */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4 bg-white" style={{
            boxShadow: '0 8px 24px rgba(249,115,22,0.25)'
          }}>
            <img src={restaurantDetails?.logo_base64 || APP_LOGO_BASE64} alt="Logo" className="w-full h-full object-cover rounded-3xl" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {restaurantDetails?.name || 'HappyPie'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Please enter details to start ordering</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Table select dropdown */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
              Select Table Number
            </label>
            <div className="relative">
              <Coffee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
                className="glass-input w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold appearance-none bg-white cursor-pointer"
              >
                <option value="">Choose Table...</option>
                {tables.map(table => {
                  const locName = locations.find(l => l.id === table.location_id)?.name || 'General';
                  return (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number} ({locName})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Aman Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium"
              />
            </div>
          </div>

          {/* Daily 4-digit PIN */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
              Today's 4-digit PIN
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-bold tracking-widest text-center text-lg"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Please ask your waiter for today's entry PIN.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-orange py-4 rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Proceed to Menu</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
