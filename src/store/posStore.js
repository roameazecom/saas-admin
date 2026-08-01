import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const getStoredUrls = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('POS_SERVER_URL');
    if (stored) {
      const clean = stored.replace(/\/$/, "");
      return {
        api: `${clean}/api`,
        socket: clean
      };
    }
    
    // Auto-detect local host if loaded locally
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      const localUrl = `http://${hostname}${port ? ':' + port : ''}`;
      return {
        api: `${localUrl}/api`,
        socket: localUrl
      };
    }
  }
  const defaultSocket = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const defaultApi = import.meta.env.VITE_API_URL || `${defaultSocket}/api`;
  return {
    api: defaultApi,
    socket: defaultSocket
  };
};

const urls = getStoredUrls();
const API_URL = urls.api;
const SOCKET_URL = urls.socket;

console.log('POS Connecting to Server:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'], // Start with HTTP polling (always works through proxy), upgrade to WebSocket
  upgrade: true,
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 15000,
  reconnectionAttempts: 10,
  timeout: 30000,           // 30s connection timeout to handle slow Hostinger proxy
  autoConnect: true
});

// Global Audio Context definition
let globalAudioCtx = null;

export const usePosStore = create((set, get) => ({
  getServerUrl: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('POS_SERVER_URL');
      if (saved && saved.includes('darkblue-mosquito')) {
        localStorage.setItem('POS_SERVER_URL', 'https://apn.happypiecafe.in');
        return 'https://apn.happypiecafe.in';
      }
      return saved || import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  },
  setServerUrl: (url) => {
    if (typeof window !== 'undefined') {
      if (!url) {
        localStorage.removeItem('POS_SERVER_URL');
      } else {
        const clean = url.trim().replace(/\/$/, "");
        localStorage.setItem('POS_SERVER_URL', clean);
      }
      window.location.reload();
    }
  },
  orders: [],
  orderHistory: [],
  socketConnected: false,
  audioUnlocked: false,
  unlockAudio: () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioContext();
      }
      globalAudioCtx.resume().then(() => {
        set({ audioUnlocked: true });
        // Play quick test sound
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, globalAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);
        osc.start();
        osc.stop(globalAudioCtx.currentTime + 0.15);
      }).catch(err => {
        console.warn('Unlock failed:', err);
      });
    } catch (e) {
      console.error('Manual audio unlock failed:', e);
    }
  },
  tables: [],
  menuItems: [],
  categories: [],
  locations: [],
  staff: [],
  expenses: [],
  vehicles: [],
  trips: [],
  inventoryItems: [],
  vendorPayments: [],
  staffAdvances: [],
  cancellationLogs: [],

  // UI state for Waiter App
  activeTableId: null,
  cart: [],

  restaurantDetails: null,

  // Notifications
  notifications: [],
  unreadNotificationsCount: 0,
  addNotification: (message, type, audioType) => set(state => {
    playSound(audioType);
    const newNotif = { id: Date.now(), message, type, time: Date.now(), read: false };
    return { 
      notifications: [newNotif, ...state.notifications],
      unreadNotificationsCount: state.unreadNotificationsCount + 1
    };
  }),
  markNotificationsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadNotificationsCount: 0
  })),

  // INITIALIZATION
  fetchData: async () => {
    try {
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        if (Capacitor.isNativePlatform()) {
          LocalNotifications.requestPermissions();
        }
      } catch (permErr) {
        console.warn('Notification permissions request failed:', permErr);
      }

      const [catRes, menuRes, locRes, tableRes, orderRes, restRes] = await Promise.all([
        axios.get(`${API_URL}/config/categories`),
        axios.get(`${API_URL}/config/menu-items`),
        axios.get(`${API_URL}/config/locations`),
        axios.get(`${API_URL}/config/tables`),
        axios.get(`${API_URL}/orders`),
        axios.get(`${API_URL}/restaurant`)
      ]);
      set({
        categories: catRes.data,
        menuItems: menuRes.data,
        locations: locRes.data,
        tables: tableRes.data,
        orders: orderRes.data,
        restaurantDetails: restRes.data
      });
      // also fetch history, expenses, and inventory data
      get().fetchOrderHistory();
      get().fetchExpensesData();
      get().fetchInventoryData();
      get().fetchCancellationLogs();
    } catch (err) {
      console.error('Failed to fetch data', err);
      toast.error('Failed to load POS data');
    }
  },

  fetchOrderHistory: async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/history`);
      set({ orderHistory: res.data });
    } catch (err) {
      console.error('Failed to fetch order history', err);
    }
  },

  fetchCancellationLogs: async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/cancellations/logs`);
      set({ cancellationLogs: res.data });
    } catch (err) {
      console.error('Failed to fetch cancellation logs', err);
    }
  },

  setActiveTableId: (id) => set({ activeTableId: id }),
  
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(i => i.menu_item_id === item.id);
    if (existing) {
      return { cart: state.cart.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
    }
    return { cart: [...state.cart, { id: Date.now(), menu_item_id: item.id, quantity: 1, name: item.name, price: item.price, status: 'pending', notes: '' }] };
  }),

  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => i.menu_item_id !== itemId)
  })),

  updateCartQuantity: (itemId, quantity) => set((state) => ({
    cart: state.cart.map(i => i.menu_item_id === itemId ? { ...i, quantity } : i)
  })),

  updateCartItemNotes: (itemId, notes) => set((state) => ({
    cart: state.cart.map(i => i.menu_item_id === itemId ? { ...i, notes } : i)
  })),

  clearCart: () => set({ cart: [] }),

  // Actions
  placeOrder: async (userId = null, orderType = 'dine_in', customerName = '', customerPhone = '') => {
    const state = get();
    if (orderType === 'dine_in' && !state.activeTableId) return;
    if (state.cart.length === 0) return;

    const cartSubtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
      await axios.post(`${API_URL}/orders`, {
        table_id: orderType === 'dine_in' ? state.activeTableId : null,
        items: state.cart,
        subtotal: cartSubtotal,
        user_id: userId,
        order_type: orderType,
        customer_name: customerName,
        customer_phone: customerPhone
      });
      
      toast.success(`Order placed and sent to kitchen!`, { position: 'bottom-center' });
      set({ cart: [] });
      // We don't manually update local state; we wait for the socket event to trigger fetchData()
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order');
    }
  },

  checkoutOrder: async (orderId, paymentType = 'Cash', customerName = '', customerPhone = '', userId = null, discountAmount = 0, applyGst = true) => {
    try {
      await axios.post(`${API_URL}/orders/${orderId}/checkout`, { 
        payment_type: paymentType,
        customer_name: customerName,
        customer_phone: customerPhone,
        user_id: userId,
        discount_amount: discountAmount,
        apply_gst: applyGst
      });
      toast.success(`Bill closed successfully! (${paymentType})`);
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to checkout');
    }
  },

  updateHistoryOrderDiscount: async (orderId, discountAmount, applyGst = true) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/history/discount`, {
        discount_amount: discountAmount,
        apply_gst: applyGst
      });
      toast.success('Bill discount updated successfully!');
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update discount');
    }
  },

  transferTable: async (sourceTableId, targetTableId, orderId, waiterName) => {
    try {
      await axios.post(`${API_URL}/orders/transfer`, {
        orderId,
        sourceTableId,
        targetTableId,
        waiterName
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  quickBillOrder: async (orderType = 'takeaway', paymentType = 'Cash', customerName = '', customerPhone = '', discountAmount = 0, userId = null, applyGst = true) => {
    const state = get();
    if (state.cart.length === 0) return null;

    const cartSubtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
      const res = await axios.post(`${API_URL}/orders/quick-bill`, {
        items: state.cart,
        subtotal: cartSubtotal,
        user_id: userId,
        order_type: orderType,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_type: paymentType,
        discount_amount: discountAmount,
        apply_gst: applyGst
      });
      
      toast.success(`Quick Bill generated successfully!`);
      set({ cart: [] });
      return res.data.orderId;
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate quick bill');
      return null;
    }
  },

  // KDS actions
  updateItemStatus: async (orderId, itemId, newStatus) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/items/${itemId}`, { status: newStatus });
      if (newStatus === 'ready') toast.success(`Item is Ready!`);
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  },

  updateKotStatus: async (orderId, kotId, newStatus) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/kot/${kotId}`, { status: newStatus });
      if (newStatus === 'ready') toast.success(`KOT ${kotId} is Ready!`, { duration: 5000, icon: '🍲' });
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update KOT status');
    }
  },

  deleteActiveOrderItem: async (orderId, itemId, reason = 'Not specified', cancelledByName = 'Staff') => {
    try {
      await axios.delete(`${API_URL}/orders/${orderId}/items/${itemId}`, {
        data: { reason, cancelled_by_name: cancelledByName }
      });
      toast.success('Item deleted from KOT');
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item from KOT');
    }
  },

  cancelEntireOrder: async (orderId, reason = 'Full Order Cancelled', cancelledByName = 'Manager') => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/cancel`, {
        reason,
        cancelled_by_name: cancelledByName
      });
      toast.success('Entire order cancelled successfully');
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel order');
    }
  },

  updateActiveOrderItemQuantity: async (orderId, itemId, quantity) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/items/${itemId}/quantity`, { quantity });
      toast.success('Quantity updated');
      await get().fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update quantity');
    }
  },
  updateOrderItemDiscount: async (orderId, itemId, discountAmount) => {
    // 1. Optimistically update local Zustand store state for instant input rendering & total recalculation
    set((state) => {
      const updatedOrders = state.orders.map(o => {
        if (o.id === orderId) {
          const updatedItems = o.items.map(item => {
            if (item.id === itemId) {
              return { ...item, discount_amount: Number(discountAmount) || 0 };
            }
            return item;
          });
          const newSubtotal = updatedItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity - Number(item.discount_amount || 0)), 0);
          return { ...o, items: updatedItems, subtotal: newSubtotal };
        }
        return o;
      });
      return { orders: updatedOrders };
    });

    // 2. Persist changes to database in the background
    try {
      await axios.put(`${API_URL}/orders/${orderId}/items/${itemId}/discount`, { discount_amount: discountAmount });
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync discount to server');
    }
  },

  // Admin Configuration CRUD
  addCategory: async (category) => {
    try {
      const res = await axios.post(`${API_URL}/config/categories`, category);
      set((state) => ({ categories: [...state.categories, res.data] }));
      toast.success('Category added successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add category');
    }
  },
  
  addMenuItem: async (item) => {
    try {
      const res = await axios.post(`${API_URL}/config/menu-items`, item);
      set((state) => ({ menuItems: [...state.menuItems, res.data] }));
      toast.success('Menu item added successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add menu item');
    }
  },
  
  addLocation: async (loc) => {
    try {
      const res = await axios.post(`${API_URL}/config/locations`, loc);
      set((state) => ({ locations: [...state.locations, res.data] }));
      toast.success('Location added successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add location');
    }
  },
  
  addTable: async (table) => {
    try {
      const res = await axios.post(`${API_URL}/config/tables`, table);
      set((state) => ({ tables: [...state.tables, res.data] }));
      toast.success('Table added successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add table');
    }
  },

  fetchExpensesData: async () => {
    try {
      const [staffRes, expRes, vehRes, tripRes] = await Promise.all([
        axios.get(`${API_URL}/expenses/staff`),
        axios.get(`${API_URL}/expenses`),
        axios.get(`${API_URL}/expenses/vehicles`),
        axios.get(`${API_URL}/expenses/trips`)
      ]);
      set({
        staff: staffRes.data,
        expenses: expRes.data,
        vehicles: vehRes.data,
        trips: tripRes.data
      });
    } catch (err) {
      console.error('Failed to fetch expenses/staff data', err);
    }
  },

  addStaff: async (staffMember) => {
    try {
      await axios.post(`${API_URL}/expenses/staff`, staffMember);
      get().fetchExpensesData();
      toast.success('Staff member added');
    } catch (err) { console.error(err); toast.error('Failed to add staff'); }
  },
  updateStaff: async (id, staffMember) => {
    try {
      await axios.put(`${API_URL}/expenses/staff/${id}`, staffMember);
      get().fetchExpensesData();
      toast.success('Staff member updated');
    } catch (err) { console.error(err); toast.error('Failed to update staff'); }
  },
  deleteStaff: async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/staff/${id}`);
      get().fetchExpensesData();
      toast.success('Staff member deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete staff'); }
  },

  addExpense: async (expense) => {
    try {
      await axios.post(`${API_URL}/expenses`, expense);
      get().fetchExpensesData();
      toast.success('Expense log saved');
    } catch (err) { console.error(err); toast.error('Failed to save expense'); }
  },
  updateExpense: async (id, expense) => {
    try {
      await axios.put(`${API_URL}/expenses/${id}`, expense);
      get().fetchExpensesData();
      toast.success('Expense log updated');
    } catch (err) { console.error(err); toast.error('Failed to update expense'); }
  },
  deleteExpense: async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      get().fetchExpensesData();
      toast.success('Expense log deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete expense'); }
  },

  addVehicle: async (vehicle) => {
    try {
      await axios.post(`${API_URL}/expenses/vehicles`, vehicle);
      get().fetchExpensesData();
      toast.success('Vehicle registered');
    } catch (err) { console.error(err); toast.error('Failed to register vehicle'); }
  },
  updateVehicle: async (id, vehicle) => {
    try {
      await axios.put(`${API_URL}/expenses/vehicles/${id}`, vehicle);
      get().fetchExpensesData();
      toast.success('Vehicle updated');
    } catch (err) { console.error(err); toast.error('Failed to update vehicle'); }
  },
  deleteVehicle: async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/vehicles/${id}`);
      get().fetchExpensesData();
      toast.success('Vehicle deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete vehicle'); }
  },

  addTrip: async (trip) => {
    try {
      await axios.post(`${API_URL}/expenses/trips`, trip);
      get().fetchExpensesData();
      toast.success('Trip log saved');
    } catch (err) { console.error(err); toast.error('Failed to save trip log'); }
  },
  updateTrip: async (id, trip) => {
    try {
      await axios.put(`${API_URL}/expenses/trips/${id}`, trip);
      get().fetchExpensesData();
      toast.success('Trip log updated');
    } catch (err) { console.error(err); toast.error('Failed to update trip log'); }
  },
  deleteTrip: async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/trips/${id}`);
      get().fetchExpensesData();
      toast.success('Trip log deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete trip log'); }
  },

  fetchInventoryData: async () => {
    try {
      const [invRes, vpRes, saRes] = await Promise.all([
        axios.get(`${API_URL}/inventory/items`),
        axios.get(`${API_URL}/inventory/vendor-payments`),
        axios.get(`${API_URL}/inventory/staff-advances`)
      ]);
      set({
        inventoryItems: invRes.data,
        vendorPayments: vpRes.data,
        staffAdvances: saRes.data
      });
    } catch (err) {
      console.error('Failed to fetch inventory/advances data', err);
    }
  },

  addInventoryItem: async (item) => {
    try {
      await axios.post(`${API_URL}/inventory/items`, item);
      get().fetchInventoryData();
      toast.success('Inventory item added');
    } catch (err) { console.error(err); toast.error('Failed to add inventory item'); }
  },
  updateInventoryItem: async (id, item) => {
    try {
      await axios.put(`${API_URL}/inventory/items/${id}`, item);
      get().fetchInventoryData();
      toast.success('Inventory item updated');
    } catch (err) { console.error(err); toast.error('Failed to update inventory item'); }
  },
  deleteInventoryItem: async (id) => {
    try {
      await axios.delete(`${API_URL}/inventory/items/${id}`);
      get().fetchInventoryData();
      toast.success('Inventory item deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete inventory item'); }
  },
  logInventoryUsage: async (id, logData) => {
    try {
      const res = await axios.post(`${API_URL}/inventory/items/${id}/log`, logData);
      get().fetchInventoryData();
      if (logData.type === 'consumption') {
        toast.success(`Used ${logData.quantity} of stock`);
      } else {
        toast.success('Stock level adjusted successfully');
      }
      return res.data;
    } catch (err) { console.error(err); toast.error('Failed to log stock change'); }
  },

  addVendorPayment: async (vp) => {
    try {
      await axios.post(`${API_URL}/inventory/vendor-payments`, vp);
      get().fetchInventoryData();
      toast.success('Vendor payment added');
    } catch (err) { console.error(err); toast.error('Failed to add vendor payment'); }
  },
  updateVendorPayment: async (id, vp) => {
    try {
      await axios.put(`${API_URL}/inventory/vendor-payments/${id}`, vp);
      get().fetchInventoryData();
      toast.success('Vendor payment updated');
    } catch (err) { console.error(err); toast.error('Failed to update vendor payment'); }
  },
  deleteVendorPayment: async (id) => {
    try {
      await axios.delete(`${API_URL}/inventory/vendor-payments/${id}`);
      get().fetchInventoryData();
      toast.success('Vendor payment deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete vendor payment'); }
  },

  addStaffAdvance: async (sa) => {
    try {
      await axios.post(`${API_URL}/inventory/staff-advances`, sa);
      get().fetchInventoryData();
      toast.success('Staff advance logged');
    } catch (err) { console.error(err); toast.error('Failed to log staff advance'); }
  },
  updateStaffAdvance: async (id, sa) => {
    try {
      await axios.put(`${API_URL}/inventory/staff-advances/${id}`, sa);
      get().fetchInventoryData();
      toast.success('Staff advance updated');
    } catch (err) { console.error(err); toast.error('Failed to update staff advance'); }
  },
  deleteStaffAdvance: async (id) => {
    try {
      await axios.delete(`${API_URL}/inventory/staff-advances/${id}`);
      get().fetchInventoryData();
      toast.success('Staff advance deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete staff advance'); }
  },
  
  // Notice: For brevity, updates and deletes would be implemented similarly using axios.put and axios.delete.
  // The local state should be updated to reflect changes immediately or wait for a fetch.
  updateCategory: async (id, name) => {
    try {
      const res = await axios.put(`${API_URL}/config/categories/${id}`, { name });
      set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, name: res.data.name } : c)
      }));
      toast.success('Category updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category');
    }
  },
  deleteCategory: async (id) => {
    try {
      await axios.delete(`${API_URL}/config/categories/${id}`);
      set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      }));
      toast.success('Category deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete category');
    }
  },
  updateMenuItem: async (id, item) => {
    try {
      const res = await axios.put(`${API_URL}/config/menu-items/${id}`, item);
      set((state) => ({
        menuItems: state.menuItems.map(m => m.id === id ? { ...m, ...res.data, is_available: !!res.data.is_available } : m)
      }));
      toast.success('Menu item updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update menu item');
    }
  },
  deleteMenuItem: async (id) => {
    try {
      await axios.delete(`${API_URL}/config/menu-items/${id}`);
      set((state) => ({
        menuItems: state.menuItems.filter(m => m.id !== id)
      }));
      toast.success('Menu item deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu item');
    }
  },
  updateLocation: async (id, name) => {
    try {
      const res = await axios.put(`${API_URL}/config/locations/${id}`, { name });
      set((state) => ({
        locations: state.locations.map(l => l.id === id ? { ...l, name: res.data.name } : l)
      }));
      toast.success('Location updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update location');
    }
  },
  deleteLocation: async (id) => {
    try {
      await axios.delete(`${API_URL}/config/locations/${id}`);
      set((state) => ({
        locations: state.locations.filter(l => l.id !== id)
      }));
      toast.success('Location deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete location');
    }
  },
  updateTable: async (id, table) => {
    try {
      const res = await axios.put(`${API_URL}/config/tables/${id}`, table);
      set((state) => ({
        tables: state.tables.map(t => t.id === id ? { ...t, ...res.data } : t)
      }));
      toast.success('Table updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update table');
    }
  },
  deleteTable: async (id) => {
    try {
      await axios.delete(`${API_URL}/config/tables/${id}`);
      set((state) => ({
        tables: state.tables.filter(t => t.id !== id)
      }));
      toast.success('Table deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete table');
    }
  },
  callWaiter: (tableId, tableNumber, locationId) => {
    socket.emit('call_waiter', { tableId, tableNumber, locationId });
  }
}));

// Audio Context management to bypass browser autoplay restrictions
const unlockAudioContext = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().then(() => {
        console.log('AudioContext successfully unlocked!');
        usePosStore.setState({ audioUnlocked: true });
        cleanupUnlockListeners();
      }).catch(err => {
        console.warn('Failed to unlock AudioContext:', err);
      });
    } else {
      usePosStore.setState({ audioUnlocked: true });
      cleanupUnlockListeners();
    }
  } catch (err) {
    console.error(err);
  }
};

const cleanupUnlockListeners = () => {
  window.removeEventListener('click', unlockAudioContext);
  window.removeEventListener('touchstart', unlockAudioContext);
  window.removeEventListener('keydown', unlockAudioContext);
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudioContext);
  window.addEventListener('touchstart', unlockAudioContext);
  window.addEventListener('keydown', unlockAudioContext);
}

// Helper to play synthesized sounds using a single global AudioContext
const playSound = (type) => {
  try {
    if (!globalAudioCtx) {
      // Return early if user hasn't clicked/interacted to prevent browser autoplay warnings
      return;
    }
    
    const ctx = globalAudioCtx;
    if (ctx.state === 'suspended') {
      console.warn(`[Audio] AudioContext is suspended. Playback of "${type}" bypassed until user gesture.`);
      return;
    }
    
    if (type === 'new_order') {
      // Extremely loud, sharp sawtooth buzzes for kitchen (3 times)
      const playBeep = (delay) => {
        setTimeout(() => {
          if (ctx.state === 'suspended') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth'; // Much louder and buzzer-like
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
          gain.gain.setValueAtTime(0.8, ctx.currentTime); // High volume (80%)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }, delay);
      };
      playBeep(0);
      playBeep(450);
      playBeep(900);
    } else if (type === 'ready_order') {
      // Pleasant ding for waiter
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch (err) {
    console.error("Audio play failed:", err);
  }
};

// Helper to display system-level alerts (Web Notification / Capacitor local notification)
const showSystemNotification = async (title, body) => {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 500) }
            }
          ]
        });
      }
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.svg'
        });
      }
    }
  } catch (err) {
    console.error('Failed to trigger system notification:', err);
  }
};

// Real-Time Socket Connection State and Events
socket.on('connect', () => {
  console.log('Socket.io connected successfully! ID:', socket.id);
  usePosStore.setState({ socketConnected: true });
  // Always fetch fresh data on connection / reconnection to prevent stale UI
  usePosStore.getState().fetchData();
});

socket.on('disconnect', (reason) => {
  console.warn('Socket.io disconnected! Reason:', reason);
  usePosStore.setState({ socketConnected: false });
});

socket.on('sync_status', (data) => {
  if (data && data.success) {
    const ordersCount = data.ordersCount || 0;
    const expensesCount = data.expensesCount || 0;
    if (ordersCount > 0 || expensesCount > 0) {
      toast.success(
        `Sync Alert: Successfully synced ${ordersCount} offline orders & ${expensesCount} expenses to Cloud Database!`,
        { duration: 7000, icon: '🔄' }
      );
      // Fetch fresh data from server to reflect synced updates in the UI
      usePosStore.getState().fetchData();
    }
  }
});

socket.on('order_updated', (data) => {
  console.log('Socket event received: order_updated', data);
  const store = usePosStore.getState();
  
  if (data.action === 'new_kot' || data.action === 'quick_bill') {
    const isQuick = data.action === 'quick_bill';
    const msg = isQuick
      ? 'New Quick Bill Order Received!'
      : `New KOT Received for Table ${data.table_id || '?'}`;
    store.addNotification(msg, 'info', 'new_order');
    showSystemNotification('New KOT Order', msg);
    toast.success(isQuick ? '🍲 New Quick Bill Order!' : `🍲 New KOT for Table ${data.table_id || '?'}!`, {
      icon: '🔔',
      duration: 6000
    });
  } else if (data.action === 'item_status' || data.action === 'kot_status') {
    if (data.status === 'ready') {
      const msg = `Order items are Ready to Serve!`;
      store.addNotification(msg, 'success', 'ready_order');
      toast.success('🛎️ Order Ready to Serve!', { id: 'order-update-toast', icon: '🍲' });
      showSystemNotification('Order Ready', msg);
    } else {
      const msg = `Order status updated to ${data.status}`;
      store.addNotification(msg, 'info', null);
      showSystemNotification('Order Update', msg);
    }
  } else if (data.action === 'table_transfer') {
    const msg = `Table ${data.source_table_number} moved to Table ${data.target_table_number} by ${data.waiter_name || 'Staff'}`;
    store.addNotification(msg, 'info', 'ready_order');
    toast.success(msg, { icon: '🔄', duration: 6000 });
    showSystemNotification('Table Transferred', msg);
  }

  // Re-fetch all data to ensure synchronization
  store.fetchData();
});

socket.on('waiter_called', (data) => {
  console.log('waiter_called event received:', data);
  const store = usePosStore.getState();
  const authStore = useAuthStore.getState();
  
  // Verify mapping: if user is waiter and has specific location assigned, check it.
  const currentUser = authStore.user;
  const isRelated = !currentUser || currentUser.role !== 'waiter' || !currentUser.location_id || currentUser.location_id === parseInt(data.locationId, 10);
  
  if (isRelated) {
    const msg = `Table ${data.tableNumber} needs a waiter!`;
    store.addNotification(`🛎️ Table ${data.tableNumber} is calling!`, 'success', 'ready_order');
    toast(msg, {
      icon: '🔔',
      duration: 6000,
      style: {
        background: '#ffedd5',
        color: '#c2410c',
        border: '1px solid #fed7aa',
        fontWeight: 'bold',
        fontSize: '14px'
      }
    });
    showSystemNotification('🛎️ Waiter Assistance Called', msg);
  }
});

socket.on('config_updated', () => {
  console.log('Socket event received: config_updated');
  const store = usePosStore.getState();
  store.fetchData();
});
