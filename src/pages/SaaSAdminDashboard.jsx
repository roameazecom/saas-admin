import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, Users, Building2, Plus, Edit3, Trash2, CheckCircle2, ChevronRight, 
  MapPin, Mail, Phone, Settings, Layers, Lock, Unlock, Server, Activity, 
  Wrench, Headphones, UserCheck, AlertTriangle, Download, Copy, Check, Terminal,
  CreditCard, MessageSquare, Bell, FileText, Search, RefreshCw, ExternalLink,
  MessageCircle, DollarSign, TrendingUp, Zap, Power, AlertCircle, Eye
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SaaSAdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'clients', 'plans', 'tickets', 'announcements', 'audit_logs', 'saas_team', 'telemetry'
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedVendorStats, setSelectedVendorStats] = useState(null);
  const [saasTeam, setSaasTeam] = useState([]);

  // Advanced Modules Data State
  const [globalAnalytics, setGlobalAnalytics] = useState({
    total_vendors: 0, active_vendors: 0, suspended_vendors: 0, mrr: 0,
    total_orders: 0, total_revenue: 0, today_orders: 0, today_revenue: 0, open_tickets: 0
  });
  const [tickets, setTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [plans, setPlans] = useState([]);

  // Modals Control
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState(null);
  const [configCopied, setConfigCopied] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilterStatus, setVendorFilterStatus] = useState('all');
  const [ticketFilterStatus, setTicketFilterStatus] = useState('all');

  // Features Form State
  const [vendorFeatures, setVendorFeatures] = useState({
    takeaway: true,
    dinein: true,
    billing: true,
    kds: true,
    waiter: true,
    customer_qr: true,
    inventory: true,
    multi_outlet: false,
    hr: true
  });

  // API base â€” use Vercel serverless functions (/api/*) directly
  // On localhost dev: Vite proxy forwards /api/* to localhost:5000
  const API = '';

  // Load All Data
  const loadGlobalAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/api/vendors/analytics/global`);
      if (res.data) setGlobalAnalytics(res.data);
    } catch (err) {}
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/api/vendors`);
      if (Array.isArray(res.data)) {
        setVendors(res.data);
        if (res.data.length > 0 && !selectedVendor) {
          setSelectedVendor(res.data[0]);
          setVendorFeatures(res.data[0].features || {});
        }
      }
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  const fetchOutlets = async (vendorId) => {
    try {
      const res = await axios.get(`${API}/api/vendors/${vendorId}/outlets`);
      if (Array.isArray(res.data)) setOutlets(res.data);
    } catch (err) {}
  };

  const fetchVendorStats = async (vendorId) => {
    try {
      const res = await axios.get(`${API}/api/vendors/${vendorId}/stats`);
      if (res.data) setSelectedVendorStats(res.data);
    } catch (err) {}
  };

  const fetchSaasTeam = async () => {
    try {
      const res = await axios.get(`${API}/api/team`);
      if (Array.isArray(res.data)) setSaasTeam(res.data);
    } catch (err) {}
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/api/tickets`);
      if (Array.isArray(res.data)) setTickets(res.data);
    } catch (err) {}
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${API}/api/announcements`);
      if (Array.isArray(res.data)) setAnnouncements(res.data);
    } catch (err) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API}/api/audit-logs`);
      if (Array.isArray(res.data)) setAuditLogs(res.data);
    } catch (err) {}
  };

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/api/plans`);
      if (Array.isArray(res.data)) setPlans(res.data);
    } catch (err) {}
  };

  const refreshAllData = () => {
    loadGlobalAnalytics();
    fetchVendors();
    fetchSaasTeam();
    fetchTickets();
    fetchAnnouncements();
    fetchAuditLogs();
    fetchPlans();
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (selectedVendor?.id) {
      fetchOutlets(selectedVendor.id);
      fetchVendorStats(selectedVendor.id);
      setVendorFeatures(selectedVendor.features || {});
    }
  }, [selectedVendor]);

  // Vendor Actions
  const handleCreateVendor = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const business_name = formData.get('business_name');
    const slug = formData.get('slug') || business_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const plan_name = formData.get('plan_name');
    const plan_price = formData.get('plan_price');

    try {
      await axios.post(`${API}/api/vendors`, {
        business_name,
        slug,
        email,
        phone,
        plan_name,
        plan_price: Number(plan_price || 2499),
        features: vendorFeatures
      });
      toast.success(`Restaurant Brand "${business_name}" onboarded successfully!`);
      setIsAddVendorOpen(false);
      refreshAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to onboard vendor');
    }
  };

  const handleToggleVendorStatus = async (vendor) => {
    const newStatus = vendor.status === 'suspended' ? 'active' : 'suspended';
    const actionName = newStatus === 'suspended' ? 'Suspend' : 'Reactivate';
    if (window.confirm(`${actionName} access for "${vendor.business_name}"?`)) {
      try {
        await axios.post(`${API}/api/vendors/update`, { id: vendor.id, status: newStatus });
        toast.success(`Vendor ${vendor.business_name} set to ${newStatus.toUpperCase()}`);
        refreshAllData();
      } catch (err) {
        toast.error('Failed to update status');
      }
    }
  };

  const handleSaveFeatures = async () => {
    if (!selectedVendor) return;
    try {
      await axios.post(`${API}/api/vendors/update`, {
        id: selectedVendor.id,
        features: vendorFeatures
      });
      toast.success(`Modular features updated for ${selectedVendor.business_name}!`);
      setIsFeaturesModalOpen(false);
      refreshAllData();
    } catch (err) {
      toast.error('Failed to update feature entitlements');
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;
    const formData = new FormData(e.target);
    const plan_name = formData.get('plan_name');
    const plan_price = formData.get('plan_price');
    const renewal_date = formData.get('renewal_date');
    const subscription_status = formData.get('subscription_status');

    try {
      await axios.post(`${API}/api/vendors/update`, {
        id: selectedVendor.id,
        plan_name,
        plan_price: Number(plan_price),
        renewal_date,
        subscription_status
      });
      toast.success(`Subscription plan updated for ${selectedVendor.business_name}!`);
      setIsSubscriptionModalOpen(false);
      refreshAllData();
    } catch (err) {
      toast.error('Failed to update subscription');
    }
  };

  const handleGenerateConfig = async (vendor) => {
    try {
      const res = await axios.get(`${API}/api/vendors/${vendor.id}/generate-config`);
      setGeneratedConfig(res.data);
      setIsConfigModalOpen(true);
      setConfigCopied(false);
    } catch (err) {
      toast.error('Failed to generate config');
    }
  };

  const handleCopyConfig = () => {
    if (generatedConfig?.env_content) {
      navigator.clipboard.writeText(generatedConfig.env_content);
      setConfigCopied(true);
      toast.success('.env content copied to clipboard!');
      setTimeout(() => setConfigCopied(false), 3000);
    }
  };

  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;
    const formData = new FormData(e.target);
    const name = formData.get('name');

    try {
      await axios.post(`${API}/api/vendors/${selectedVendor.id}/outlets`, { name });
      toast.success(`New branch "${name}" added to ${selectedVendor.business_name}!`);
      setIsAddOutletOpen(false);
      fetchOutlets(selectedVendor.id);
    } catch (err) {
      toast.error('Failed to add outlet');
    }
  };

  // Support Ticket Actions
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const vendor_id = formData.get('vendor_id');
    const vendor_name = vendors.find(v => String(v.id) === String(vendor_id))?.business_name || 'Restaurant Client';
    const subject = formData.get('subject');
    const description = formData.get('description');
    const priority = formData.get('priority');

    try {
      await axios.post(`${API}/api/tickets`, {
        vendor_id, vendor_name, subject, description, priority
      });
      toast.success('Support ticket created successfully!');
      setIsTicketModalOpen(false);
      fetchTickets();
      fetchAuditLogs();
    } catch (err) {
      toast.error('Failed to create ticket');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      await axios.put(`${API}/api/tickets/${ticketId}`, { status });
      toast.success(`Ticket #${ticketId} status updated to ${status}`);
      fetchTickets();
      fetchAuditLogs();
    } catch (err) {
      toast.error('Failed to update ticket');
    }
  };

  // Announcement Actions
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const message = formData.get('message');

    try {
      await axios.post(`${API}/api/announcements`, { title, message });
      toast.success('Platform announcement broadcasted to all vendors!');
      setIsAnnouncementModalOpen(false);
      fetchAnnouncements();
      fetchAuditLogs();
    } catch (err) {
      toast.error('Failed to broadcast announcement');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm('Delete this broadcast announcement?')) {
      try {
        await axios.delete(`${API}/api/announcements/${id}`);
        toast.success('Announcement removed');
        fetchAnnouncements();
      } catch (err) {
        toast.error('Failed to delete announcement');
      }
    }
  };

  // SaaS Team Handlers
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role');
    const phone = formData.get('phone');

    try {
      await axios.post(`${API}/api/team`, {
        name, email, password, role, phone
      });
      toast.success(`New SaaS team member "${name}" added!`);
      setIsAddTeamOpen(false);
      fetchSaasTeam();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add team member');
    }
  };

  const handleDeleteTeamMember = async (t) => {
    if (window.confirm(`Delete SaaS staff account for "${t.name}"?`)) {
      try {
        await axios.delete(`${API}/api/team/${t.id}`);
        toast.success('Team member removed');
        fetchSaasTeam();
        fetchAuditLogs();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to remove team member');
      }
    }
  };

  const featureList = [
    { key: 'takeaway', label: 'Takeaway Only / Quick Bill', desc: 'Allows simple quick billing counter without table requirement' },
    { key: 'dinein', label: 'Dine-In Table Management', desc: 'Enables interactive table layouts & floor plan management' },
    { key: 'billing', label: 'Basic Billing Counter', desc: 'Enables receipt generation, thermal printing & cash/UPI payments' },
    { key: 'kds', label: 'Kitchen Display Screen (KDS)', desc: 'Enables real-time kitchen order tickets for chefs' },
    { key: 'waiter', label: 'Waiter Mobile Ordering App', desc: 'Enables mobile order punching & table calls for waiters' },
    { key: 'customer_qr', label: 'Customer QR Table Self-Ordering', desc: 'Allows customers to scan QR and self-order from phone' },
    { key: 'inventory', label: 'Inventory & Recipe Control', desc: 'Enables stock balances & automatic ingredient deduction' },
    { key: 'multi_outlet', label: 'Multi-Outlet Chain Outlets', desc: 'Allows client restaurant to add multiple city branches' },
    { key: 'hr', label: 'Staff HR & Attendance', desc: 'Enables staff clock-in/out logs, leave approvals & help tickets' }
  ];

  const getTeamRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-black flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Super Admin</span>;
      case 'saas_manager':
        return <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-black flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> SaaS Manager</span>;
      case 'support_team':
        return <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-black flex items-center gap-1"><Headphones className="w-3.5 h-3.5" /> Support Team</span>;
      case 'technical_team':
        return <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-black flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Technical / Dev</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold">{role}</span>;
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.business_name.toLowerCase().includes(searchQuery.toLowerCase()) || v.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = vendorFilterStatus === 'all' || v.status === vendorFilterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredTickets = tickets.filter(t => ticketFilterStatus === 'all' || t.status === ticketFilterStatus);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      <Toaster position="top-right" />

      {/* Top SaaS Master Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center flex-wrap gap-4 sticky top-0 z-30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
              👑 HappyPie SaaS Command Center
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Enterprise Restaurant ERP Platform</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-mono text-[10px] uppercase">v2.4 Production Live</span>
            </p>
          </div>
        </div>

        {/* Global SaaS Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analytics Overview
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Client Brands ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Billing & Plans
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap relative ${
              activeTab === 'tickets' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Support Tickets
            {globalAnalytics.open_tickets > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'announcements' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Broadcasts
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit_logs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('saas_team')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'saas_team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> SaaS Team ({saasTeam.length})
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'telemetry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Telemetry
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllData}
            title="Refresh All SaaS Data"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'clients' && (
            <button
              onClick={() => setIsAddVendorOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Onboard Restaurant Client
            </button>
          )}
          {activeTab === 'tickets' && (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Support Ticket
            </button>
          )}
          {activeTab === 'announcements' && (
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" /> Broadcast Announcement
            </button>
          )}
          {activeTab === 'saas_team' && (
            <button
              onClick={() => setIsAddTeamOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add SaaS Staff
            </button>
          )}
        </div>
      </header>

      {/* Main SaaS Portal Dashboard Body */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* High Impact Cards Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4 relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Recurring Revenue</span>
                  <span className="text-xl font-black text-white">₹{globalAnalytics.mrr?.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">Active Subscriptions</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xl">
                  {globalAnalytics.total_vendors}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Restaurants</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-emerald-400">{globalAnalytics.active_vendors} Active</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-black text-rose-400">{globalAnalytics.suspended_vendors} Suspended</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Platform Orders Processed</span>
                  <span className="text-xl font-black text-white">{globalAnalytics.total_orders?.toLocaleString('en-IN')} Total</span>
                  <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{globalAnalytics.today_orders} Today</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Restaurant Sales</span>
                  <span className="text-xl font-black text-amber-400">₹{globalAnalytics.total_revenue?.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">₹{globalAnalytics.today_revenue?.toLocaleString('en-IN')} Today</span>
                </div>
              </div>
            </div>

            {/* Performance Matrix Table across all Vendors */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    📊 Restaurant Clients Overview & Performance Matrix
                  </h3>
                  <p className="text-xs text-slate-400">Monitor active subscription plan, status, and system entitlement for each brand</p>
                </div>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="px-3.5 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Manage Clients →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-4">Brand / Restaurant Name</th>
                      <th className="p-4">Slug / ID</th>
                      <th className="p-4">Subscription Plan</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {vendors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-white flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 font-black flex items-center justify-center text-sm border border-indigo-500/30">
                            {v.business_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-sm text-white">{v.business_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Registered on {v.created_at?.split('T')[0] || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          @{v.slug} <span className="text-slate-600">(#{v.id})</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-black">
                            {v.plan_name || 'Professional POS'} (₹{v.plan_price || 2499}/mo)
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit ${
                            v.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            {v.status || 'active'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {v.phone && (
                              <a
                                href={`https://wa.me/91${v.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition"
                                title="WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {v.phone && (
                              <a href={`tel:${v.phone}`} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition" title="Call Vendor">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {v.email && (
                              <a href={`mailto:${v.email}`} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition" title="Send Email">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleGenerateConfig(v)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Terminal className="w-3 h-3" /> Setup Config
                            </button>
                            <button
                              onClick={() => { setSelectedVendor(v); setActiveTab('clients'); }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENT RESTAURANTS & FEATURE LOCK MATRIX */}
        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Client Vendors List */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xs uppercase tracking-wider text-amber-400">Client Restaurant Brands</h3>
                  <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">{filteredVendors.length} Total</span>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search restaurant or slug..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={vendorFilterStatus}
                    onChange={(e) => setVendorFilterStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-bold focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[600px]">
                {filteredVendors.map((v) => {
                  const isSelected = selectedVendor?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVendor(v)}
                      className={`p-4 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-l-4 border-indigo-500 shadow-inner'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {v.business_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{v.business_name}</h4>
                          <span className="text-xs text-slate-400 font-mono">@{v.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          v.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {v.status || 'Active'}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Restaurant Features & Outlets Control */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              {selectedVendor ? (
                <>
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                        <Building2 className="w-5 h-5" /> {selectedVendor.business_name}
                      </h3>
                      <p className="text-xs text-slate-400">Slug: @{selectedVendor.slug} | Vendor ID #{selectedVendor.id}</p>
                    </div>

                    {/* Direct Contact & Action Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedVendor.phone && (
                        <a
                          href={`https://wa.me/91${selectedVendor.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}

                      <button
                        onClick={() => handleToggleVendorStatus(selectedVendor)}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          selectedVendor.status === 'suspended'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {selectedVendor.status === 'suspended' ? 'Reactivate Vendor' : 'Suspend Vendor'}
                      </button>

                      <button
                        onClick={() => handleGenerateConfig(selectedVendor)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Terminal className="w-3.5 h-3.5" /> Setup Config
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
                    {/* Subscription & Billing Card */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Subscription Tier</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-black text-indigo-400">{selectedVendor.plan_name || 'Professional POS'}</span>
                          <span className="text-xs font-bold text-slate-300">₹{selectedVendor.plan_price || 2499}/mo</span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Renews on: {selectedVendor.renewal_date || 'N/A'}
                        </span>
                      </div>

                      <button
                        onClick={() => setIsSubscriptionModalOpen(true)}
                        className="px-3.5 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Update Subscription
                      </button>
                    </div>

                    {/* Stats for Selected Vendor */}
                    {selectedVendorStats && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Orders</span>
                          <span className="text-sm font-black text-white">{selectedVendorStats.total_orders} Orders</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Revenue</span>
                          <span className="text-sm font-black text-emerald-400">₹{selectedVendorStats.total_revenue?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Staff Users</span>
                          <span className="text-sm font-black text-purple-400">{selectedVendorStats.staff_count} Users</span>
                        </div>
                      </div>
                    )}

                    {/* Enabled Modular Feature Entitlements */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                          ðŸŽ›ï¸ Feature Lock Entitlements for {selectedVendor.business_name}:
                        </h4>
                        <button
                          onClick={() => setIsFeaturesModalOpen(true)}
                          className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" /> Customize Feature Lock
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {featureList.map(f => {
                          const isEnabled = !!vendorFeatures?.[f.key];
                          return (
                            <div
                              key={f.key}
                              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                isEnabled
                                  ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                                  : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Lock className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                                <span className="text-xs font-bold">{f.label}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {isEnabled ? 'Unlocked' : 'Locked'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Branch Outlets */}
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                          Active Branch Outlets ({outlets.length})
                        </h4>
                        <button
                          onClick={() => setIsAddOutletOpen(true)}
                          className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Branch
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {outlets.map((o) => (
                          <div key={o.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-inner flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-white">{o.name}</h5>
                                <span className="text-[10px] text-slate-500 font-mono">Location ID #{o.id}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 font-bold text-sm">
                  Select a restaurant brand from the left column.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BILLING & PRICING PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  💳 SaaS Platform Subscription Tiers & Pricing Plans
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage subscription tiers, feature packages and monthly pricing</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-black text-base text-white">{p.name}</h4>
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase">
                        {p.billing_cycle || 'monthly'}
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-black text-amber-400">₹{Number(p.price).toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400 font-bold"> / month</span>
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-4">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Included Modules:</span>
                      {featureList.map(f => {
                        const isIncluded = !!p.features_included?.[f.key];
                        return (
                          <div key={f.key} className="flex items-center gap-2 text-xs">
                            {isIncluded ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                            <span className={isIncluded ? 'text-slate-200 font-medium' : 'text-slate-600 line-through'}>{f.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-center">
                    <span className="text-xs font-bold text-slate-400">
                      {vendors.filter(v => v.plan_name === p.name).length} Active Restaurants on this Plan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SUPPORT TICKETS & HELPDESK */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  🎟️ Restaurant Vendor Support Ticket Helpdesk
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Resolve technical requests, hardware driver integrations & PIN reset requests from restaurant clients</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={ticketFilterStatus}
                  onChange={(e) => setTicketFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none"
                >
                  <option value="all">All Ticket Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Log Support Ticket
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTickets.map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-black text-indigo-400 font-mono">TICKET #{t.id} • {t.vendor_name}</span>
                        <h4 className="font-black text-sm text-white mt-0.5">{t.subject}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        t.status === 'open' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        t.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-sans">
                      {t.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      t.priority === 'urgent' || t.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      Priority: {t.priority}
                    </span>

                    <div className="flex items-center gap-2">
                      {t.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                        >
                          âœ“ Mark Resolved
                        </button>
                      )}
                      {t.status === 'open' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(t.id, 'in_progress')}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                        >
                          In Progress
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ANNOUNCEMENTS & BROADCASTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  📢 Platform Announcements & Vendor Broadcast Message Center
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Broadcast system update news, feature launches or maintenance windows to all restaurant POS terminals</p>
              </div>

              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4" /> Broadcast Announcement
              </button>
            </div>

            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-black uppercase">Broadcast</span>
                      <h4 className="font-black text-sm text-white">{a.title}</h4>
                    </div>
                    <p className="text-xs text-slate-300">{a.message}</p>
                    <span className="text-[10px] text-slate-500 block font-mono">By {a.created_by || 'Super Admin'} • {a.created_at}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                📜 SaaS Platform Admin Audit Logs & Activity History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of all administrative changes made across restaurants, feature locks, and subscriptions</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Admin User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition font-mono">
                        <td className="p-4 text-slate-500">{log.created_at}</td>
                        <td className="p-4 font-bold text-amber-400">{log.admin_name}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-black text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-sans text-xs">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SAAS INTERNAL TEAM MANAGEMENT */}
        {activeTab === 'saas_team' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  👥 SaaS Company Internal Team & Department Roles
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage Super Admins, SaaS Managers, Customer Support Team, and Technical Devs</p>
              </div>

              <button
                onClick={() => setIsAddTeamOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Onboard SaaS Team Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {saasTeam.map((member) => (
                <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-black flex items-center justify-center text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{member.name}</h4>
                          <span className="text-xs text-slate-400 block">{member.email}</span>
                        </div>
                      </div>

                      {member.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteTeamMember(member)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-400">Department Role:</span>
                      {getTeamRoleBadge(member.role)}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Phone: {member.phone || 'N/A'} | Status: {member.status || 'Active'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: SYSTEM TELEMETRY & DB SYNC MONITOR */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" /> Technical Team Telemetry
                </h3>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Cloud Monitor
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Local POS to Cloud Auto-Sync</span>
                  <span className="text-sm font-black text-emerald-400">Every 30 Seconds Auto Sync</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Cloud Database Host</span>
                  <span className="text-sm font-black text-indigo-400">apn.happypiecafe.in</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Data Isolation Guard</span>
                  <span className="text-sm font-black text-purple-400">Multi-Vendor Scoped (vendor_id)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CUSTOMIZE FEATURE LOCK FOR CLIENT */}
      {isFeaturesModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">
                Modular Feature Lock: {selectedVendor.business_name}
              </h3>
              <button onClick={() => setIsFeaturesModalOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              <p className="text-xs text-slate-400 mb-2">
                Check the modules enabled for this client restaurant. Unchecked features will be completely locked on their POS/App!
              </p>

              {featureList.map(f => (
                <label
                  key={f.key}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    vendorFeatures[f.key]
                      ? 'bg-indigo-950/60 border-indigo-500/50 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!vendorFeatures[f.key]}
                    onChange={(e) => setVendorFeatures(prev => ({ ...prev, [f.key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-xs text-white block">{f.label}</span>
                    <span className="text-[11px] text-slate-400 block">{f.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
              <button
                onClick={() => setIsFeaturesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFeatures}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
              >
                ðŸ’¾ Save Feature Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD CLIENT VENDOR */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">Onboard Client Restaurant Brand</h3>
              <button onClick={() => setIsAddVendorOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateVendor} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Restaurant / Brand Name</label>
                <input type="text" name="business_name" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Pizza Hut Noida" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">System Slug Identifier</label>
                <input type="text" name="slug" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-mono bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. pizzahut-noida" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Owner Email</label>
                  <input type="email" name="email" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="owner@pizzahut.com" />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Owner Phone</label>
                  <input type="text" name="phone" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="9876543210" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Select Subscription Plan</label>
                  <select name="plan_name" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none">
                    <option value="Professional POS">Professional POS (₹2499/mo)</option>
                    <option value="Starter Counter">Starter Counter (₹999/mo)</option>
                    <option value="Enterprise Chain">Enterprise Chain (₹4999/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Monthly Rate (₹)</label>
                  <input type="number" name="plan_price" defaultValue="2499" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddVendorOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition">Create Restaurant Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE SUBSCRIPTION */}
      {isSubscriptionModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">Update Subscription: {selectedVendor.business_name}</h3>
              <button onClick={() => setIsSubscriptionModalOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Subscription Plan Name</label>
                <select name="plan_name" defaultValue={selectedVendor.plan_name || 'Professional POS'} className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none">
                  <option value="Starter Counter">Starter Counter</option>
                  <option value="Professional POS">Professional POS</option>
                  <option value="Enterprise Chain">Enterprise Chain</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Monthly Billing Price (₹)</label>
                <input type="number" name="plan_price" defaultValue={selectedVendor.plan_price || 2499} required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Next Renewal Date</label>
                <input type="date" name="renewal_date" defaultValue={selectedVendor.renewal_date || ''} className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Billing Status</label>
                <select name="subscription_status" defaultValue={selectedVendor.subscription_status || 'active'} className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none">
                  <option value="active">Active / Paid</option>
                  <option value="past_due">Past Due / Pending Payment</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsSubscriptionModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SUPPORT TICKET */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-indigo-400">Log Restaurant Support Ticket</h3>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Select Restaurant Brand</label>
                <select name="vendor_id" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none">
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.business_name} (@{v.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Issue Subject</label>
                <input type="text" name="subject" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none" placeholder="e.g. KDS Thermal printer setup" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Detailed Description</label>
                <textarea name="description" rows="3" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none" placeholder="Explain the issue reported by the restaurant..."></textarea>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Priority</label>
                <select name="priority" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsTicketModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">Broadcast Vendor Announcement</h3>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Announcement Title</label>
                <input type="text" name="title" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none" placeholder="e.g. ðŸš€ Platform Maintenance Scheduled" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Broadcast Message</label>
                <textarea name="message" rows="4" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none" placeholder="Enter message to display on all restaurant POS terminals..."></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-lg transition">Broadcast Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD SAAS INTERNAL TEAM MEMBER */}
      {isAddTeamOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">Add SaaS Staff Member</h3>
              <button onClick={() => setIsAddTeamOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleAddTeamMember} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Email Address</label>
                <input type="email" name="email" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="rahul@happypie.in" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Login Password</label>
                <input type="password" name="password" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Department Role</label>
                <select name="role" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="saas_manager">SaaS Manager (Client Onboarding & Billing)</option>
                  <option value="support_team">Support Team (Customer Tickets & Helpdesk)</option>
                  <option value="technical_team">Technical Team (Dev, Sync & Server Telemetry)</option>
                  <option value="super_admin">Super Admin (Full Platform Control)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Phone Number</label>
                <input type="text" name="phone" className="w-full border border-slate-800 rounded-xl p-2.5 text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="9876543210" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddTeamOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition">Create SaaS Staff Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD OUTLET BRANCH */}
      {isAddOutletOpen && selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-amber-400">Add Outlet Branch to {selectedVendor.business_name}</h3>
              <button onClick={() => setIsAddOutletOpen(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateOutlet} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Branch / Location Name</label>
                <input type="text" name="name" required className="w-full border border-slate-800 rounded-xl p-2.5 text-sm font-bold bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Connaught Place Branch" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddOutletOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE SETUP CONFIG */}
      {isConfigModalOpen && generatedConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-amber-400 flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> Setup Config: {generatedConfig.vendor_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Vendor ID: #{generatedConfig.vendor_id} | Slug: @{generatedConfig.vendor_slug}</p>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-500 hover:text-white text-xl font-black cursor-pointer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Setup Instructions for Restaurant Owner:
                </h4>
                <ol className="space-y-1.5">
                  {generatedConfig.setup_instructions?.map((step, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex-shrink-0 flex items-center justify-center">{i + 1}</span>
                      {step.replace(/^\d+\.\s/, '')}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">.env File Content (Copy this):</h4>
                  <button
                    onClick={handleCopyConfig}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      configCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {configCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {configCopied ? 'Copied!' : 'Copy .env'}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-emerald-300 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                  {generatedConfig.env_content}
                </pre>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero-Config Note: This restaurant uses Embedded SQLite DB. No manual MySQL installation or database creation is needed. Simply set VENDOR_ID={generatedConfig.vendor_id}.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
