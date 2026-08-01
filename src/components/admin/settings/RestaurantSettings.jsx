import { useState, useEffect } from 'react';
import { Save, Store, Upload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePosStore } from '../../../store/posStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RestaurantSettings() {
  const { restaurantDetails, fetchData } = usePosStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_percent: 0,
    fssai: '',
    gst: '',
    logo_base64: '',
    daily_pin: '1234'
  });

  useEffect(() => {
    if (restaurantDetails) {
      setFormData({
        name: restaurantDetails.name || '',
        address: restaurantDetails.address || '',
        phone: restaurantDetails.phone || '',
        email: restaurantDetails.email || '',
        tax_percent: restaurantDetails.tax_percent || 0,
        fssai: restaurantDetails.fssai || '',
        gst: restaurantDetails.gst || '',
        logo_base64: restaurantDetails.logo_base64 || '',
        daily_pin: restaurantDetails.daily_pin || '1234'
      });
    }
  }, [restaurantDetails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateDailyPin = async () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const updatedFormData = { ...formData, daily_pin: pin };
    setFormData(updatedFormData);
    try {
      await axios.put(`${API_URL}/restaurant`, updatedFormData);
      toast.success(`Generated & Saved Today's PIN: ${pin}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to auto-save generated PIN');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_base64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_URL}/restaurant`, formData);
      toast.success('Restaurant details updated successfully');
      fetchData(); // Refresh global state
    } catch (error) {
      console.error(error);
      toast.error('Failed to update details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-surface-100 flex items-center">
            <Store className="w-6 h-6 mr-2 text-brand-600" />
            Restaurant Details
          </h2>
          <p className="text-surface-500 text-sm mt-1">Manage your restaurant's public information, logo, and tax details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-950 rounded-2xl border border-surface-700 p-6 shadow-sm max-w-4xl">
        
        {/* Logo Upload */}
        <div className="mb-8 flex items-start space-x-6">
          <div className="shrink-0">
            <div className="w-32 h-32 rounded-xl bg-surface-800 border-2 border-dashed border-surface-600 flex items-center justify-center overflow-hidden relative group">
              {formData.logo_base64 ? (
                <img src={formData.logo_base64} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : (
                <div className="text-center p-4">
                  <Store className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                  <span className="text-xs text-surface-500">No Logo</span>
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all">
                <Upload className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {formData.logo_base64 && (
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({...prev, logo_base64: ''}))}
                className="text-xs text-rose-500 mt-2 hover:underline w-full text-center"
              >
                Remove
              </button>
            )}
          </div>
          <div className="flex-1 pt-2">
            <h3 className="font-bold text-surface-100">Restaurant Logo</h3>
            <p className="text-sm text-surface-500 mb-2">This logo will appear on the login screen and potentially on printed receipts.</p>
            <p className="text-xs text-surface-400">Max size: 2MB. Recommended format: PNG with transparent background.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-surface-100 border-b border-surface-700 pb-2">Basic Info</h3>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Restaurant Name</label>
              <input 
                type="text" name="name" value={formData.name} onChange={handleChange} required
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="e.g. The Grand Cafe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Email Address</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="contact@restaurant.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Phone Number</label>
              <input 
                type="text" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="+91 9876543210"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Full Address</label>
              <textarea 
                name="address" value={formData.address} onChange={handleChange} rows="3"
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                placeholder="123 Food Street, City, State, ZIP"
              ></textarea>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-surface-100 border-b border-surface-700 pb-2">Legal & Tax</h3>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">GST Number</label>
              <input 
                type="text" name="gst" value={formData.gst} onChange={handleChange}
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">FSSAI License Number</label>
              <input 
                type="text" name="fssai" value={formData.fssai} onChange={handleChange}
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="10000000000000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Default Tax Percentage (%)</label>
              <input 
                type="number" step="0.01" min="0" name="tax_percent" value={formData.tax_percent} onChange={handleChange}
                className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                placeholder="5.00"
              />
              <p className="text-xs text-surface-500 mt-1">This is for informational tracking and PDF reports.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-200 mb-1">Today's Customer PIN (4-digit)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="daily_pin" 
                  maxLength={4}
                  value={formData.daily_pin} 
                  onChange={handleChange}
                  required
                  className="w-full bg-white border border-surface-600 text-surface-100 rounded-lg px-4 py-2.5 font-bold tracking-widest text-center text-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  placeholder="1234"
                />
                <button
                  type="button"
                  onClick={generateDailyPin}
                  className="px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg text-xs whitespace-nowrap transition-colors"
                >
                  Generate PIN
                </button>
              </div>
              <p className="text-xs text-surface-500 mt-1">Customers will enter this daily PIN to log in from their tables.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-700 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-surface-700/70 border-t-white rounded-full animate-spin mr-2"></span>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Save Details
          </button>
        </div>

      </form>
    </div>
  );
}
