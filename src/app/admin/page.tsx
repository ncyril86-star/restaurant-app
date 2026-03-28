'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, ShoppingCart,
  Menu as MenuIcon, LogOut, Home, Settings, Plus,
  Pencil, Trash2, X, Check, ChefHat, Package,
  BarChart3, Eye, EyeOff, Search, LayoutDashboard, MessageSquare, Star
} from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  is_available?: boolean;
};

type AnalyticsData = {
  total_orders?: number;
  total_revenue?: number;
  menu_items?: number;
  avg_order_value?: number;
  daily_orders?: { date: string; count: number }[];
  category_sales?: { category: string; sales: number }[];
  top_items?: { name: string; sales: number; image?: string }[];
  today_sales?: { name: string; qty: number; price: number; time: string }[];
  all_sales?: { name: string; qty: number; price: number; date: string }[];
};

/* ───────────────────── Fetch helper ───────────────────── */

const fetchWithAuth = async (url: string) => {
  const user = auth.currentUser;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
};

/* ───────────────────── Component ───────────────────────── */

export default function AdminDashboard() {
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState('');

  const [formData, setFormData] = useState({
    name: '', price: '', description: '', image: '', category: '', is_available: true,
  });

  // SWR data
  const { data: items = [], isLoading: loadingItems, mutate: mutateMenu } =
    useSWR<MenuItem[]>(API ? `${API}/api/menu/` : null, fetchWithAuth, { refreshInterval: 10000 });

  const { data: analytics = {}, mutate: mutateAnalytics } =
    useSWR<AnalyticsData>(API ? `${API}/api/analytics/` : null, fetchWithAuth, { refreshInterval: 10000 });

  // 🔥 WebSocket (optional – falls back to SWR polling)
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;
    const connect = () => {
      if (!isMounted) return;
      try {
        const wsUrl = process.env.NEXT_PUBLIC_DJANGO_WS_URL || 'ws://localhost:8000';
        socket = new WebSocket(`${wsUrl}/ws/dashboard/`);
        socket.onmessage = () => { mutateMenu(); mutateAnalytics(); };
        socket.onerror = () => { };
        socket.onclose = () => { if (isMounted) reconnectTimer = setTimeout(connect, 5000); };
      } catch { }
    };
    connect();
    return () => { isMounted = false; clearTimeout(reconnectTimer); socket?.close(); };
  }, []);

  // Fetch Reviews from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReviews(data);
    });
    return () => unsub();
  }, []);

  /* ─── CRUD helpers ─── */

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', price: '', description: '', image: '', category: '', is_available: true });
    setModalOpen(true);
    setFormStatus('');
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: String(item.price),
      description: item.description || '',
      image: item.image || '',
      category: item.category || '',
      is_available: item.is_available ?? true,
    });
    setModalOpen(true);
    setFormStatus('');
  };

  const handleSave = async () => {
    setFormStatus('Saving...');
    try {
      const user = auth.currentUser;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = JSON.stringify({
        ...formData,
        price: parseFloat(formData.price) || 0,
      });

      if (editingItem) {
        await fetch(`${API}/api/menu/${editingItem.id}/`, { method: 'PUT', headers, body });
      } else {
        await fetch(`${API}/api/menu/`, { method: 'POST', headers, body });
      }

      mutateMenu();
      mutateAnalytics();
      setModalOpen(false);
      setFormStatus('');
    } catch {
      setFormStatus('Error saving item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const user = auth.currentUser;
      const headers: Record<string, string> = {};
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API}/api/menu/${id}/`, { method: 'DELETE', headers });
      mutateMenu();
      mutateAnalytics();
      setDeleteConfirm(null);
    } catch {
      console.error('Delete failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  /* ─── Filtered items ─── */
  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ─── Analytics Sorting ─── */
  const [analyticsSort, setAnalyticsSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  const sortedAllSales = [...(analytics.all_sales || [])].sort((a, b) => {
    const { key, direction } = analyticsSort;
    const valA = a[key as keyof typeof a];
    const valB = b[key as keyof typeof b];

    if (valA === undefined || valB === undefined) return 0;
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: string) => {
    setAnalyticsSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  /* ─── Stat cards data ─── */
  const stats = [
    {
      label: 'Total Orders',
      value: analytics.total_orders ?? 0,
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
    },
    {
      label: 'Revenue',
      value: `RM ${(analytics.total_revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
    },
    {
      label: 'Menu Items',
      value: analytics.menu_items ?? items.length,
      icon: ChefHat,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
    },
    {
      label: 'Avg Order',
      value: `RM ${(analytics.avg_order_value ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
    },
  ];

  const sidebarItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'menu', label: 'Menu', icon: Package },
    { key: 'reviews', label: 'Reviews', icon: MessageSquare },
  ];

  /* ─────────────────────── UI ─────────────────────────── */
  return (
    <div className="flex h-screen bg-[#0b0f19] text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col transition-all duration-300 border-r border-white/10 bg-[#0d1117]`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-extrabold text-black text-xl shadow-lg shadow-amber-500/20">
            M
          </div>
          {sidebarOpen && (
            <div className="leading-tight overflow-hidden animate-in fade-in duration-500">
              <p className="text-sm font-black tracking-tight text-white uppercase">MakanSedap</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Admin Pro</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
          >
            <MenuIcon size={20} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl px-8 py-4">
          <div>
            <h1 className="text-xl font-bold text-white capitalize">{currentTab}</h1>
            <p className="text-xs text-white/50 mt-0.5">
              {currentTab === 'dashboard' && 'Overview of your restaurant performance'}
              {currentTab === 'analytics' && 'Detailed insights and sales performance'}
              {currentTab === 'menu' && 'Manage your menu items'}
            </p>
          </div>
          {currentTab === 'menu' && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-black hover:from-amber-300 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus size={18} strokeWidth={3} />
              Add Item
            </button>
          )}
        </header>

        <div className="p-8">

          {/* ═══════════ DASHBOARD TAB ═══════════ */}
          {currentTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">

              {/* Stat Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  // Mock percentage for visual flair matching the user's example
                  const progress = 65 + (idx * 10); 
                  const strokeDash = 113; // 2 * PI * 18
                  const offset = strokeDash - (strokeDash * progress) / 100;

                  return (
                    <div
                      key={stat.label}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05] hover:shadow-2xl hover:shadow-black/20"
                    >
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{stat.label}</p>
                          <p className="mt-2 text-2xl font-black text-white">{stat.value}</p>
                        </div>
                        <div className="relative flex h-12 w-12 items-center justify-center">
                            <svg className="absolute inset-0 -rotate-90 h-full w-full">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={125} strokeDashoffset={125 - (125 * progress / 100)} className={stat.text} style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                            </svg>
                            <Icon size={18} className={stat.text} strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 blur-2xl transition-all group-hover:opacity-10`} />
                    </div>
                  );
                })}
              </div>

              {/* Charts row (Quick View) */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-amber-400" />
                    Daily Orders
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={analytics.daily_orders || []}>
                      <defs>
                        <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#orderGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    Sales by Category
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics.category_sales || []} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="category" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                        formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, 'Sales']}
                      />
                    <Bar dataKey="sales" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Today's Sales Table */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden shadow-2xl">
              <div className="border-b border-white/10 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingCart size={16} className="text-amber-400" />
                  Items Bought Today
                </h3>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 py-1 rounded">
                    Live Sales Feed
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                      <th className="px-6 py-4">Article Name</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Unit Price</th>
                      <th className="px-6 py-4">Subtotal</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analytics.today_sales && analytics.today_sales.length > 0 ? (
                      analytics.today_sales.map((sale, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                              {sale.name}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center rounded-lg bg-amber-400/5 border border-amber-400/10 px-2.5 py-1 text-[11px] font-black text-amber-400">
                              {sale.qty}x
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xs font-medium text-white/40">
                            RM {Number(sale.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-5 text-sm font-black text-emerald-400/80">
                            RM {(sale.price * sale.qty).toFixed(2)}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="inline-flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md group-hover:bg-amber-400/10 group-hover:text-amber-400/60 transition-all">
                              {sale.time}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-white/10">
                             <ShoppingCart size={40} strokeWidth={1} className="mb-4 opacity-20" />
                             <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Transactions Recorded Today</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {/* ═══════════ ANALYTICS TAB ═══════════ */}
          {currentTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Analytics Header Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 shadow-lg shadow-amber-500/5">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Best Selling Item</p>
                  <h3 className="text-2xl font-black text-white">
                    {analytics.top_items && analytics.top_items.length > 0 ? analytics.top_items[0].name : 'N/A'}
                  </h3>
                  <p className="text-sm text-white/50 mt-1">
                    {analytics.top_items && analytics.top_items.length > 0 ? `${analytics.top_items[0].sales} units sold` : 'No sales yet'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Total Revenue</p>
                  <h3 className="text-2xl font-black text-white">RM {(analytics.total_revenue ?? 0).toLocaleString()}</h3>
                  <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                    <TrendingUp size={14} /> Overall Performance
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Avg. Order Value</p>
                  <h3 className="text-2xl font-black text-white">RM {(analytics.avg_order_value ?? 0).toFixed(2)}</h3>
                  <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
                    <ShoppingCart size={14} /> Per customer visit
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Top Selling Items (Visual Gallery) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-amber-400" />
                      Top Performing Items
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {analytics.top_items?.slice(0, 3).map((item, idx) => (
                      <div key={item.name} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] transition-all hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-900/10">
                        <div className="relative h-40 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">
                              <ChefHat size={40} />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-amber-400 border border-white/10">
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-white line-clamp-1">{item.name}</h4>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Units Sold</p>
                              <p className="text-lg font-black text-amber-400">{item.sales}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full border-2 border-white/5 flex items-center justify-center relative">
                                <span className="text-[10px] font-bold text-white/60">{(item.sales / (analytics.total_orders || 1) * 100).toFixed(0)}%</span>
                                <svg className="absolute inset-0 -rotate-90">
                                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={113} strokeDashoffset={113 - (113 * (item.sales / (analytics.total_orders || 1)))} className="text-amber-400 transition-all duration-1000" />
                                </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!analytics.top_items || analytics.top_items.length === 0) && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-white/20">
                        <Package size={40} className="mb-2" />
                        <p className="text-sm">No sales data available yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales by Category (Enhanced for Analytics) */}
                <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-xl h-full flex flex-col">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <Package size={16} className="text-purple-400" />
                    Revenue Mix
                  </h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analytics.category_sales || []} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="category" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        {analytics.category_sales?.slice(0, 3).map(cat => (
                            <div key={cat.category} className="flex items-center justify-between">
                                <span className="text-xs text-white/50">{cat.category}</span>
                                <span className="text-xs font-bold text-white">RM {cat.sales.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Item Sales Table */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1117] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingCart size={16} className="text-amber-400" />
                    Historical Item Sales
                  </h3>
                  <div className="text-[10px] uppercase font-bold text-white/20 tracking-widest bg-white/5 px-2 py-1 rounded">
                    Sortable by Column
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#141f30] border-b border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                      <tr>
                        <th onClick={() => toggleSort('name')} className="px-6 py-4 cursor-pointer hover:text-amber-400 transition-colors">
                          <div className="flex items-center gap-2">
                            Article Name {analyticsSort.key === 'name' && (analyticsSort.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th onClick={() => toggleSort('qty')} className="px-6 py-4 cursor-pointer hover:text-amber-400 transition-colors">
                          <div className="flex items-center gap-2">
                            Quantity {analyticsSort.key === 'qty' && (analyticsSort.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th onClick={() => toggleSort('price')} className="px-6 py-4 cursor-pointer hover:text-amber-400 transition-colors">
                          <div className="flex items-center gap-2">
                            Unit Price {analyticsSort.key === 'price' && (analyticsSort.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th onClick={() => toggleSort('date')} className="px-6 py-4 cursor-pointer hover:text-amber-400 transition-colors text-right">
                          <div className="flex items-center justify-end gap-2">
                            Date & Time {analyticsSort.key === 'date' && (analyticsSort.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedAllSales.length > 0 ? (
                        sortedAllSales.map((sale, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-5">
                                <span className="font-bold text-white group-hover:text-amber-400 transition-colors">{sale.name}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center rounded-lg bg-amber-400/5 border border-amber-400/10 px-2.5 py-1 text-[11px] font-black text-amber-400">
                                {sale.qty}x
                              </span>
                            </td>
                            <td className="px-6 py-5 text-xs font-medium text-white/40">RM {Number(sale.price).toFixed(2)}</td>
                            <td className="px-6 py-5 text-right">
                                <span className="inline-flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md group-hover:bg-amber-400/10 group-hover:text-amber-400/60 transition-all font-mono">
                                    {sale.date}
                                </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center text-white/10">
                                 <Package size={40} strokeWidth={1} className="mb-4 opacity-20" />
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Historical Data Available</p>
                              </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ MENU TAB ═══════════ */}
          {currentTab === 'menu' && (
            <div className="space-y-6">

              {/* Search bar */}
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
              </div>

              {/* Items list */}
              {loadingItems ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <p className="text-sm text-white/50">Loading menu...</p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/50">
                  <Package size={48} strokeWidth={1.5} className="mb-3 text-white/20" />
                  <p className="text-sm font-medium">No menu items found</p>
                  <button onClick={openAddModal} className="mt-4 text-sm text-amber-400 hover:underline">
                    + Add your first item
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Item</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Category</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Price</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Status</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-white/10"
                                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80/1a1f2e/f59e0b?text=🍽️'; }}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/30">
                                  <ChefHat size={18} />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-white">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1 max-w-[200px]">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-white/70">
                              {item.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-amber-400">
                            RM {Number(item.price).toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${item.is_available !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                              {item.is_available !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                              {item.is_available !== false ? 'Available' : 'Hidden'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-amber-400/10 hover:text-amber-400 transition-all border border-white/10"
                              >
                                <Pencil size={14} />
                              </button>
                              {deleteConfirm === item.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/10"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ REVIEWS TAB ═══════════ */}
          {currentTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
                <div>
                  <h2 className="text-xl font-bold">Customer Reviews</h2>
                  <p className="text-white/60 text-sm mt-1">Manage feedback on your Wall of Love</p>
                </div>
              </div>

              <div className="bg-[#0f1724] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left bg-transparent">
                    <thead className="bg-[#141f30] border-b border-white/10 text-[10px] uppercase font-bold text-white/40 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Customer & Feedback</th>
                        <th className="px-6 py-4">Order Context</th>
                        <th className="px-6 py-4">Order Bill</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {reviews.length === 0 ? (
                         <tr>
                            <td colSpan={4} className="px-6 py-20 text-center text-white/20">
                                <MessageSquare size={40} className="mx-auto mb-2 opacity-10" />
                                <p>No reviews found</p>
                            </td>
                         </tr>
                      ) : reviews.map((review) => (
                        <tr key={review.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Customer & Feedback */}
                          <td className="px-6 py-6 border-r border-white/5 min-w-[300px]">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20">
                                <MessageSquare size={18} className="text-amber-400" />
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="font-bold text-white leading-none">{review.customerName || 'Anonymous'}</p>
                                  <p className="text-[10px] text-white/30 mt-1.5 uppercase font-bold tracking-wider">
                                     Posted: {review.createdAt?.toDate ? new Date(review.createdAt.toDate()).toLocaleString() : 'Just now'}
                                  </p>
                                </div>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'} />
                                  ))}
                                </div>
                                <div className="relative">
                                  <p className="text-sm text-white/80 leading-relaxed italic bg-white/5 p-4 rounded-2xl border border-white/5">
                                    "{review.text}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Order Context */}
                          <td className="px-6 py-6 border-r border-white/5">
                             {review.orderId ? (
                               <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                     <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                     <span className="text-[10px] font-mono text-white/40 uppercase font-bold tracking-widest">ORDER #{review.orderId.substring(0, 8)}</span>
                                  </div>
                                  <div className="space-y-1.5">
                                     <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em]">Items Purchased</p>
                                     <div className="flex flex-wrap gap-2">
                                        {(review.orderItems || []).map((it: any, k: number) => (
                                          <div key={k} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 transition-all hover:bg-white/10">
                                            <span className="text-[10px] font-bold text-amber-400">{it.qty}x</span>
                                            <span className="text-[10px] font-medium text-white/70">{it.name}</span>
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                                  <div className="pt-3 border-t border-white/5">
                                     <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mb-1.5">Original Transaction</p>
                                     <div className="flex items-center gap-2 text-white/60">
                                        <TrendingUp size={12} className="text-emerald-400" />
                                        <p className="text-[11px] font-medium">
                                           {review.orderCreatedAt?.toDate ? new Date(review.orderCreatedAt.toDate()).toLocaleString() : 'N/A'}
                                        </p>
                                     </div>
                                  </div>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center justify-center h-32 text-white/10 border-2 border-dashed border-white/5 rounded-2xl p-4 bg-white/[0.01]">
                                  <Users size={24} strokeWidth={1.5} className="mb-2" />
                                  <span className="text-[10px] uppercase font-black tracking-[0.2em]">External Feedback</span>
                               </div>
                             )}
                          </td>

                          {/* Order Bill */}
                          <td className="px-6 py-6 bg-white/[0.01]">
                             {review.orderId ? (
                               <div className="space-y-4">
                                  <div className="space-y-2.5">
                                      {(review.orderItems || []).map((it: any, k: number) => (
                                          <div key={k} className="flex justify-between text-[11px]">
                                              <span className="text-white/40">{it.name}</span>
                                              <span className="font-mono font-bold text-white/70">RM {(it.price * it.qty).toFixed(2)}</span>
                                          </div>
                                      ))}
                                  </div>
                                  <div className="pt-3 border-t border-amber-400/20 flex justify-between items-center">
                                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Total Amount</span>
                                      <span className="text-lg font-black text-amber-400 drop-shadow-lg">RM {Number(review.orderTotal || 0).toFixed(2)}</span>
                                  </div>
                               </div>
                             ) : (
                               <div className="h-full flex items-center justify-center italic text-white/10 text-xs">
                                  No transaction data
                               </div>
                             )}
                          </td>
                        
                          <td className="px-6 py-6 text-right">
                             <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                                  <Trash2 size={16} />
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


        </div>
      </main>

      {/* ═══════════ MODAL ═══════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#12161f] p-8 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-all"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold mb-6">
              {editingItem ? 'Edit Menu Item' : 'Add New Item'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
                  placeholder="e.g. Nasi Lemak"
                />
              </div>

              {/* Price + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Price (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Category</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
                    placeholder="e.g. Main Dish"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none transition-all resize-none"
                  placeholder="Brief description..."
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Image URL</label>
                <input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none transition-all"
                  placeholder="https://..."
                />
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm font-medium text-white/70">Available on menu</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${formData.is_available ? 'bg-amber-400' : 'bg-white/20'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.is_available ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Status */}
              {formStatus && (
                <p className={`text-sm font-medium ${formStatus.includes('Error') ? 'text-red-400' : 'text-amber-400'}`}>
                  {formStatus}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-bold text-black hover:from-amber-300 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}