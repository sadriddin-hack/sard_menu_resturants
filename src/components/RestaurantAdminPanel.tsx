import React, { useState, useEffect, useRef } from 'react';
import { Restaurant, Table, Category, Product, Order, Staff, RestaurantStats } from '../types';
import { i18n } from '../i18n';
import { 
  Building2, Users, ClipboardList, Utensils, QrCode, 
  Settings, DollarSign, BarChart3, Plus, Check, Trash2, 
  Sparkles, Bell, Play, X, Eye, CheckCircle, Flame, 
  Smartphone, Languages, Printer, Download, Clock
} from 'lucide-react';

interface RestaurantAdminProps {
  lang: 'tj' | 'ru' | 'en';
  onScanSimulation: (restaurantId: string, tableId: string) => void;
}

export default function RestaurantAdminPanel({ lang, onScanSimulation }: RestaurantAdminProps) {
  const t = i18n[lang];
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestId, setSelectedRestId] = useState<string>('');
  const [activeRest, setActiveRest] = useState<Restaurant | null>(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables' | 'staff' | 'payments' | 'settings'>('orders');

  // Sub data
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [stats, setStats] = useState<RestaurantStats | null>(null);

  // New item modals & forms
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'national_food' | 'drinks' | 'desserts' | 'salads' | 'fast_food'>('national_food');
  
  // Product form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscount, setProdDiscount] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrepTime, setProdPrepTime] = useState('15');
  const [prodRecommended, setProdRecommended] = useState(false);
  const [prodImage, setProdImage] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Staff form states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [stfName, setStfName] = useState('');
  const [stfRole, setStfRole] = useState<'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [stfEmail, setStfEmail] = useState('');

  // Invoice viewer
  const [activeInvoice, setActiveInvoice] = useState<Order | null>(null);

  // Audio notifier state
  const prevOrdersCount = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Poll for orders and load initial data
  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestId) {
      loadRestaurantData();
      const interval = setInterval(pollOrdersAndStats, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedRestId]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setRestaurants(data);
      if (data.length > 0) {
        setSelectedRestId(data[0].id);
        setActiveRest(data[0]);
      }
    } catch (e) {
      console.error("Failed to load restaurants list:", e);
    }
  };

  const loadRestaurantData = async () => {
    if (!selectedRestId) return;
    try {
      const current = restaurants.find(r => r.id === selectedRestId);
      if (current) setActiveRest(current);

      const [tablesRes, catsRes, prodsRes, staffRes] = await Promise.all([
        fetch(`/api/restaurants/${selectedRestId}/tables`),
        fetch(`/api/restaurants/${selectedRestId}/categories`),
        fetch(`/api/restaurants/${selectedRestId}/products`),
        fetch(`/api/restaurants/${selectedRestId}/staff`)
      ]);

      setTables(await tablesRes.json());
      const catsData = await catsRes.json();
      setCategories(catsData);
      if (catsData.length > 0) setProdCategory(catsData[0].id);
      setProducts(await prodsRes.json());
      setStaff(await staffRes.json());
      
      await pollOrdersAndStats();
    } catch (e) {
      console.error("Error loading restaurant data:", e);
    }
  };

  // Sound generator (bell) when a new order arrives
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitched friendly ping
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio playback not allowed or supported yet:", e);
    }
  };

  const pollOrdersAndStats = async () => {
    if (!selectedRestId) return;
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/restaurants/${selectedRestId}/orders`),
        fetch(`/api/restaurants/${selectedRestId}/stats`)
      ]);

      const ordersData: Order[] = await ordersRes.json();
      setOrders(ordersData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setStats(await statsRes.json());

      // Sound notification logic
      const pendingAndReceived = ordersData.filter(o => o.status === 'received').length;
      if (prevOrdersCount.current < pendingAndReceived) {
        playNotificationSound();
      }
      prevOrdersCount.current = pendingAndReceived;
    } catch (e) {
      console.error("Short-polling failed:", e);
    }
  };

  // Actions
  const handleUpdateSettings = async (updatedFields: Partial<Restaurant>) => {
    if (!activeRest) return;
    try {
      const res = await fetch(`/api/restaurants/${activeRest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveRest(saved);
        setRestaurants(prev => prev.map(r => r.id === saved.id ? saved : r));
      }
    } catch (e) {
      console.error("Failed to update general settings:", e);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    try {
      const res = await fetch(`/api/restaurants/${selectedRestId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newTableNumber })
      });
      if (res.ok) {
        const created = await res.json();
        setTables(prev => [...prev, created]);
        setNewTableNumber('');
      }
    } catch (e) {
      console.error("Failed to add table:", e);
    }
  };

  const handleToggleTable = async (id: string) => {
    try {
      const res = await fetch(`/api/tables/${id}/toggle`, { method: 'PUT' });
      if (res.ok) {
        const updated = await res.json();
        setTables(prev => prev.map(t => t.id === id ? updated : t));
      }
    } catch (e) {
      console.error("Failed to toggle table state:", e);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch(`/api/restaurants/${selectedRestId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, type: newCatType })
      });
      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, created]);
        setNewCatName('');
      }
    } catch (e) {
      console.error("Failed to add category:", e);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    try {
      const res = await fetch(`/api/restaurants/${selectedRestId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          categoryId: prodCategory,
          price: Number(prodPrice),
          discountPrice: prodDiscount ? Number(prodDiscount) : undefined,
          description: prodDesc,
          preparationTime: Number(prodPrepTime),
          image: prodImage || undefined,
          recommended: prodRecommended
        })
      });

      if (res.ok) {
        const created = await res.json();
        setProducts(prev => [created, ...prev]);
        setShowProductModal(false);
        // Reset states
        setProdName('');
        setProdPrice('');
        setProdDiscount('');
        setProdDesc('');
        setProdPrepTime('15');
        setProdRecommended(false);
        setProdImage('');
      }
    } catch (e) {
      console.error("Failed to add product:", e);
    }
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !product.available })
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      }
    } catch (e) {
      console.error("Failed to toggle availability:", e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Шумо мутмаин ҳастед? Ин хӯрок ҳазф мешавад.")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete product:", e);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, newStatus: string, newPaymentStatus?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, paymentStatus: newPaymentStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        // Refresh statistics
        const statsRes = await fetch(`/api/restaurants/${selectedRestId}/stats`);
        setStats(await statsRes.json());
      }
    } catch (e) {
      console.error("Failed to update order status:", e);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stfName.trim() || !stfEmail.trim()) return;

    try {
      const res = await fetch(`/api/restaurants/${selectedRestId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stfName,
          role: stfRole,
          email: stfEmail,
          permissions: stfRole === 'cashier' 
            ? ['view_orders', 'update_status', 'manage_payments']
            : ['view_orders', 'update_status']
        })
      });
      if (res.ok) {
        const created = await res.json();
        setStaff(prev => [...prev, created]);
        setShowStaffModal(false);
        setStfName('');
        setStfEmail('');
      }
    } catch (e) {
      console.error("Failed to add staff:", e);
    }
  };

  // AI Description Generator trigger (invokes server Gemini API proxy)
  const handleAiSuggest = async () => {
    if (!prodName.trim()) {
      alert("Лутфан номи хӯрокро аввал ворид кунед!");
      return;
    }
    try {
      setIsAiGenerating(true);
      const cat = categories.find(c => c.id === prodCategory)?.name || '';
      const res = await fetch('/api/ai/suggest-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prodName, category: cat })
      });
      if (res.ok) {
        const data = await res.json();
        setProdDesc(data.description);
      }
    } catch (e) {
      console.error("AI description failed:", e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // High Fidelity custom SVG QR code rendering with cutlery logo inside
  const renderTableQR = (restaurantId: string, tableId: string, tableNumber: string) => {
    const qrHref = `${window.location.origin}/?restaurantId=${restaurantId}&tableId=${tableId}`;
    return (
      <svg viewBox="0 0 100 100" className="w-36 h-36 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
        {/* Frame / Outer Border */}
        <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="#D97706" strokeWidth="1.5" />
        
        {/* QR Eye 1 (Top-Left) */}
        <rect x="8" y="8" width="22" height="22" rx="3" fill="#1F2937" />
        <rect x="12" y="12" width="14" height="14" rx="1.5" fill="#FFFFFF" />
        <rect x="15" y="15" width="8" height="8" rx="1" fill="#D97706" />

        {/* QR Eye 2 (Top-Right) */}
        <rect x="70" y="8" width="22" height="22" rx="3" fill="#1F2937" />
        <rect x="74" y="12" width="14" height="14" rx="1.5" fill="#FFFFFF" />
        <rect x="77" y="15" width="8" height="8" rx="1" fill="#D97706" />

        {/* QR Eye 3 (Bottom-Left) */}
        <rect x="8" y="70" width="22" height="22" rx="3" fill="#1F2937" />
        <rect x="12" y="74" width="14" height="14" rx="1.5" fill="#FFFFFF" />
        <rect x="15" y="77" width="8" height="8" rx="1" fill="#D97706" />

        {/* Mock QR Pixels / Pattern */}
        <g fill="#1F2937">
          <rect x="36" y="8" width="4" height="4" rx="0.5" />
          <rect x="44" y="12" width="8" height="4" rx="0.5" />
          <rect x="56" y="8" width="4" height="12" rx="0.5" />
          <rect x="36" y="20" width="12" height="4" rx="0.5" />
          <rect x="52" y="24" width="4" height="8" rx="0.5" />
          
          <rect x="8" y="36" width="12" height="4" rx="0.5" />
          <rect x="24" y="36" width="4" height="8" rx="0.5" />
          <rect x="36" y="36" width="8" height="8" rx="0.5" />
          <rect x="48" y="40" width="16" height="4" rx="0.5" />
          <rect x="68" y="36" width="4" height="12" rx="0.5" />
          <rect x="80" y="36" width="12" height="4" rx="0.5" />

          <rect x="8" y="48" width="4" height="12" rx="0.5" />
          <rect x="16" y="52" width="12" height="4" rx="0.5" />
          <rect x="32" y="48" width="4" height="16" rx="0.5" />
          <rect x="40" y="56" width="16" height="4" rx="0.5" />
          <rect x="60" y="52" width="8" height="8" rx="0.5" />
          <rect x="76" y="48" width="16" height="4" rx="0.5" />

          <rect x="36" y="70" width="12" height="4" rx="0.5" />
          <rect x="52" y="76" width="12" height="4" rx="0.5" />
          <rect x="36" y="82" width="4" height="10" rx="0.5" />
          <rect x="44" y="88" width="16" height="4" rx="0.5" />
          <rect x="68" y="70" width="4" height="16" rx="0.5" />
          <rect x="76" y="76" width="16" height="4" rx="0.5" />
          <rect x="80" y="84" width="12" height="8" rx="0.5" />
        </g>

        {/* Center Cutlery Fork/Knife Logo */}
        <rect x="42" y="42" width="16" height="16" rx="4" fill="#D97706" />
        <path d="M47 46 v4 M49 46 v4 M48 50 v4 M52 46 l1 2 v6" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
    );
  };

  if (!activeRest) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <Building2 className="text-gray-300 animate-pulse mb-3" size={48} />
        <span className="text-gray-500 font-semibold">Ресторанҳо дастрас нестанд. Лутфан аввал дар саҳифаи Супер Админ якто созед!</span>
      </div>
    );
  }

  // Define status translation dictionary
  const getStatusBadge = (status: Order['status']) => {
    switch(status) {
      case 'received':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold animate-pulse">Кабул шуд</span>;
      case 'preparing':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold">Омода шуда истодааст</span>;
      case 'ready':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold animate-pulse">Омода шуд</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-xs font-semibold">Супорида шуд</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold">Рад шуд</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={activeRest.logo} alt={activeRest.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{activeRest.name}</h1>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  {activeRest.planId}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{activeRest.address} | {activeRest.phone}</p>
            </div>
          </div>
        </div>

        {/* Multi Restaurant Selector & Sound Test */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button 
            onClick={playNotificationSound}
            className="p-2.5 bg-gray-50 text-gray-500 hover:text-amber-500 rounded-xl hover:bg-amber-50 border border-gray-200 transition"
            title="Санҷиши садои огоҳинома"
          >
            <Bell size={18} />
          </button>
          
          <select 
            value={selectedRestId} 
            onChange={(e) => {
              setSelectedRestId(e.target.value);
            }}
            className="p-2.5 border border-gray-200 rounded-xl text-sm bg-white font-semibold text-gray-800 focus:outline-none focus:border-amber-500"
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Menu */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <ClipboardList size={18} />
            {t.orderManagement}
            {orders.filter(o => o.status === 'received').length > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-bold text-xs px-2 py-0.5 rounded-full animate-bounce">
                {orders.filter(o => o.status === 'received').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Utensils size={18} />
            {t.menuManagement}
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'tables'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <QrCode size={18} />
            {t.tableManagement}
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'staff'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Users size={18} />
            {t.staffManagement}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'payments'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <DollarSign size={18} />
            {t.paymentsReports}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Settings size={18} />
            {t.generalSettings}
          </button>
        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <ClipboardList className="text-amber-500" size={20} />
                  Фармоишҳои фаъол
                </h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">
                  Умумӣ: {orders.length}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                  <ClipboardList size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400 font-semibold">{t.noOrders}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.map((order) => (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-2xl border p-5 shadow-xs transition duration-300 hover:shadow-md flex flex-col justify-between ${
                        order.status === 'received' 
                          ? 'border-l-4 border-l-blue-500 border-gray-100 animate-pulse' 
                          : 'border-gray-100'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-base">Миз: {order.tableNumber}</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        {/* Customer Meta */}
                        {(order.customerName || order.customerPhone) && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                            <span className="font-semibold block">{order.customerName || 'Мизоҷ'}</span>
                            <span className="text-[10px] text-gray-400">{order.customerPhone || 'Бидуни рақам'}</span>
                          </div>
                        )}

                        {/* Items list */}
                        <div className="divide-y divide-gray-100 mb-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="py-2 flex justify-between items-center text-xs">
                              <span className="text-gray-700 font-medium">
                                {item.name} <strong className="text-amber-500 ml-1">x{item.quantity}</strong>
                              </span>
                              <span className="font-bold text-gray-900">
                                {((item.discountPrice || item.price) * item.quantity)} c.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Totals & Actions */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold text-gray-900">
                          <span>{t.totalAmount}:</span>
                          <span>{order.finalAmount} c.</span>
                        </div>

                        {/* Order Management Actions */}
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button 
                            onClick={() => setActiveInvoice(order)}
                            className="p-2 bg-gray-50 text-gray-500 hover:text-gray-800 rounded-lg border border-gray-200 transition"
                            title="Чопи фактура"
                          >
                            <Printer size={14} />
                          </button>

                          {order.status === 'received' && (
                            <>
                              <button 
                                onClick={() => handleOrderStatusUpdate(order.id, 'rejected')}
                                className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-lg text-xs font-bold transition"
                              >
                                {t.reject}
                              </button>
                              <button 
                                onClick={() => handleOrderStatusUpdate(order.id, 'preparing')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition"
                              >
                                {t.accept}
                              </button>
                            </>
                          )}

                          {order.status === 'preparing' && (
                            <button 
                              onClick={() => handleOrderStatusUpdate(order.id, 'ready')}
                              className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Check size={14} /> {t.markReady}
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button 
                              onClick={() => handleOrderStatusUpdate(order.id, 'delivered', 'completed')}
                              className="w-full py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle size={14} /> {t.markDelivered}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MENU MANAGEMENT TAB */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Add Category Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Utensils className="text-amber-500" size={20} />
                  Категорияҳои меню
                </h4>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Масалан: Кабобҳо, Чой" 
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <select
                    value={newCatType}
                    onChange={(e: any) => setNewCatType(e.target.value)}
                    className="p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="national_food">Национальная Еда</option>
                    <option value="drinks">Напитки</option>
                    <option value="desserts">Десерты</option>
                    <option value="salads">Салаты</option>
                    <option value="fast_food">Фастфуд</option>
                  </select>
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition">
                    + {t.addCategory}
                  </button>
                </form>
                
                {/* Categories Pills */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {categories.map((cat) => (
                    <span key={cat.id} className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-xs font-semibold">
                      {cat.name} ({cat.type})
                    </span>
                  ))}
                </div>
              </div>

              {/* Products Directory */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">Каталоги маҳсулот</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Рӯйхати умумии хӯрокҳо ва нӯшокиҳо</p>
                  </div>
                  <button 
                    onClick={() => setShowProductModal(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    {t.addProduct}
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {products.map((prod) => {
                    const catName = categories.find(c => c.id === prod.categoryId)?.name || '';
                    return (
                      <div key={prod.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition duration-150">
                        <div className="flex gap-4">
                          <img 
                            src={prod.image} 
                            alt={prod.name} 
                            className="w-14 h-14 rounded-xl object-cover border border-gray-200" 
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-bold text-gray-900 text-sm">{prod.name}</h5>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">{catName}</span>
                              {prod.recommended && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold flex items-center gap-0.5">
                                  <Flame size={10} /> Rec
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 max-w-md line-clamp-1">{prod.description}</p>
                            <p className="text-xs text-gray-500 mt-1 font-semibold flex items-center gap-1.5">
                              <Clock size={12} /> {prod.preparationTime} дақ
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-sm">
                              {prod.discountPrice || prod.price} c.
                            </p>
                            {prod.discountPrice && (
                              <p className="text-xs text-gray-400 line-through mt-0.5">{prod.price} c.</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Availability Toggle */}
                            <button 
                              onClick={() => handleToggleProductAvailability(prod)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                prod.available
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                              }`}
                            >
                              {prod.available ? t.available : 'Недоступен'}
                            </button>

                            <button 
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TABLE MANAGEMENT TAB */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              {/* Create Table Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <QrCode className="text-amber-500" size={20} />
                  Мудирияти Мизҳо
                </h4>
                <form onSubmit={handleAddTable} className="flex gap-3 max-w-md">
                  <input 
                    type="number" 
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="Рақами мизи нав" 
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    required
                    min="1"
                  />
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition">
                    + Иловаи Миз
                  </button>
                </form>
              </div>

              {/* Table List / QR Code Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => (
                  <div key={table.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-between text-center gap-4 relative">
                    <div>
                      <div className="flex justify-between items-center w-full absolute top-4 inset-x-0 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          table.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {table.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                        
                        <button 
                          onClick={() => handleToggleTable(table.id)}
                          className="text-xs text-amber-600 font-bold hover:underline"
                        >
                          Ивази статус
                        </button>
                      </div>

                      <h4 className="font-extrabold text-gray-900 text-lg mt-5">Миз {table.number}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Барои сканер омода аст</p>
                    </div>

                    {/* Custom Vector QR */}
                    {renderTableQR(selectedRestId, table.id, table.number)}

                    {/* QR Simulation Launcher & Utilities */}
                    <div className="w-full space-y-2">
                      <button 
                        onClick={() => onScanSimulation(selectedRestId, table.id)}
                        className="w-full py-2 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl border border-amber-100 hover:bg-amber-100 transition flex items-center justify-center gap-1.5"
                      >
                        <Smartphone size={14} />
                        Санҷиши меню (Мизоҷ)
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button 
                          onClick={() => window.print()}
                          className="py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold text-[10px] rounded-lg border border-gray-200 flex items-center justify-center gap-1"
                        >
                          <Printer size={10} />
                          Print
                        </button>
                        <a 
                          href={`data:image/svg+xml;utf8,${encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${renderTableQR(selectedRestId, table.id, table.number)}</svg>`
                          )}`}
                          download={`QR_Table_${table.number}.svg`}
                          className="py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold text-[10px] rounded-lg border border-gray-200 flex items-center justify-center gap-1"
                        >
                          <Download size={10} />
                          SVG
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAFF MANAGEMENT TAB */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">Ҳайати кормандон</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Идоракунии ҳуқуқҳо ва вазифаҳо</p>
                </div>
                <button 
                  onClick={() => setShowStaffModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  + Ҳисоби нав
                </button>
              </div>

              {/* Staff Roster Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((employee) => (
                  <div key={employee.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm flex items-center justify-center">
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">{employee.name}</h5>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold capitalize">
                            {employee.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{employee.email}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-50 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Иҷозатҳо:</p>
                      <div className="flex flex-wrap gap-1">
                        {employee.permissions.map((p, idx) => (
                          <span key={idx} className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENTS & REPORTS TAB */}
          {activeTab === 'payments' && stats && (
            <div className="space-y-6">
              {/* Financial Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Фурӯши умумӣ</span>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{stats.totalRevenue} c.</h3>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-1">▲ +8.2% нисбат ба дирӯз</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Чеки миёна</span>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{stats.averageOrderValue} c.</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Оптималӣ барои тиҷорат</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Мизҳои фаъол</span>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{stats.activeTablesCount} миз</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Аз мизҳои умумии мавҷуда</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Best Sellers Analytics */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                  <h4 className="font-bold text-gray-800 text-base">{t.bestSellers}</h4>
                  <div className="divide-y divide-gray-100">
                    {stats.bestSellers.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-gray-900">{item.revenue} c.</p>
                          <p className="text-[10px] text-gray-400 font-medium">{item.quantity} дона фурӯхта шуд</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Reports / Payment methods ratio */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                  <h4 className="font-bold text-gray-800 text-base">Интихоби Усулҳои Пардохти Мизоҷон</h4>
                  <div className="space-y-3 pt-2">
                    {[
                      { name: 'Alif Mobil', share: '45%', color: 'bg-emerald-500' },
                      { name: 'Нақдӣ (Cash)', share: '30%', color: 'bg-amber-500' },
                      { name: 'Dushanbe City', share: '15%', color: 'bg-blue-500' },
                      { name: 'Кортҳои Банкӣ', share: '10%', color: 'bg-indigo-500' }
                    ].map((m, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 font-medium">{m.name}</span>
                          <span className="font-bold text-gray-900">{m.share}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div style={{ width: m.share }} className={`h-full ${m.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GENERAL SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Building2 className="text-amber-500" size={20} />
                Танзимоти ресторан
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Номи ресторан</label>
                  <input 
                    type="text" 
                    defaultValue={activeRest.name}
                    onBlur={(e) => handleUpdateSettings({ name: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Телефон</label>
                  <input 
                    type="text" 
                    defaultValue={activeRest.phone}
                    onBlur={(e) => handleUpdateSettings({ phone: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Суроға</label>
                  <input 
                    type="text" 
                    defaultValue={activeRest.address}
                    onBlur={(e) => handleUpdateSettings({ address: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Соатҳои корӣ</label>
                  <input 
                    type="text" 
                    defaultValue={activeRest.openingHours}
                    onBlur={(e) => handleUpdateSettings({ openingHours: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ҳаққи хизматрасонӣ (%)</label>
                  <input 
                    type="number" 
                    defaultValue={activeRest.serviceFee}
                    onBlur={(e) => handleUpdateSettings({ serviceFee: Number(e.target.value) })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <h5 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">Шабакаҳои иҷтимоӣ</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Instagram</label>
                    <input 
                      type="text" 
                      defaultValue={activeRest.socialLinks?.instagram || ''}
                      onBlur={(e) => handleUpdateSettings({ socialLinks: { ...activeRest.socialLinks, instagram: e.target.value } })}
                      placeholder="Username"
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telegram</label>
                    <input 
                      type="text" 
                      defaultValue={activeRest.socialLinks?.telegram || ''}
                      onBlur={(e) => handleUpdateSettings({ socialLinks: { ...activeRest.socialLinks, telegram: e.target.value } })}
                      placeholder="Username"
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-100 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t.addProduct}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Эҷод ва нашри хӯроки нав дар меню</p>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.productName}</label>
                  <input 
                    type="text" 
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Масалан: Шашлики гӯсфандӣ"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.categories}</label>
                  <select 
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.price} (сом.)</label>
                  <input 
                    type="number" 
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.discountPrice} (сом.)</label>
                  <input 
                    type="number" 
                    value={prodDiscount}
                    onChange={(e) => setProdDiscount(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.prepTime}</label>
                  <input 
                    type="number" 
                    value={prodPrepTime}
                    onChange={(e) => setProdPrepTime(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Расми Хӯрок (Unsplash URL)</label>
                  <input 
                    type="text" 
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">{t.description}</label>
                  
                  {/* AI Trigger */}
                  <button 
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={isAiGenerating}
                    className="text-xs text-amber-600 font-bold hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 shadow-2xs cursor-pointer"
                  >
                    <Sparkles size={12} className={isAiGenerating ? "animate-spin" : ""} />
                    {isAiGenerating ? 'Таҳия...' : 'AI Эҷоди тавсиф'}
                  </button>
                </div>
                <textarea 
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-24 resize-none"
                  placeholder="Тавсифи ҷузъиёти хӯрок ва компонентҳо..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="prodRec" 
                  checked={prodRecommended} 
                  onChange={(e) => setProdRecommended(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="prodRec" className="text-xs font-semibold text-gray-600 cursor-pointer">Марк кардани ин хӯрок ҳамчун тавсияшуда (Recommended)</label>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-100 shadow-2xl p-6 relative">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t.createEmployee}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Бақайдгирии корманди нав бо ҳуқуқҳои мушаххас</p>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.employeeName}</label>
                <input 
                  type="text" 
                  value={stfName}
                  onChange={(e) => setStfName(e.target.value)}
                  placeholder="Масалан: Алишер Назаров"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.role}</label>
                <select 
                  value={stfRole}
                  onChange={(e: any) => setStfRole(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="waiter">Пешхизмат (Waiter)</option>
                  <option value="kitchen">Ошпазхона (Kitchen)</option>
                  <option value="cashier">Хазинадор (Cashier)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                <input 
                  type="email" 
                  value={stfEmail}
                  onChange={(e) => setStfEmail(e.target.value)}
                  placeholder="alisher@oshirizo.tj"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal Overlay (PDF / Printable View) */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-100 shadow-2xl p-8 relative space-y-6">
            <button 
              onClick={() => setActiveInvoice(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {/* Invoice Layout */}
            <div className="text-center pb-4 border-b border-gray-200 space-y-1">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{activeRest.name}</h2>
              <p className="text-xs text-gray-500">{activeRest.address}</p>
              <p className="text-xs text-gray-400">Тел: {activeRest.phone}</p>
              <div className="pt-2">
                <span className="text-[10px] px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold uppercase tracking-wider">Ҳисоб-фактура (Receipt)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Фармоиш №:</p>
                <p className="font-bold text-gray-800">{activeInvoice.id}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 font-medium">Сана / Вақт:</p>
                <p className="font-bold text-gray-800">{new Date(activeInvoice.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Миз:</p>
                <p className="font-extrabold text-amber-600 text-sm">Рақами {activeInvoice.tableNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 font-medium">Усули Пардохт:</p>
                <p className="font-bold text-gray-800 capitalize">{activeInvoice.paymentMethod}</p>
              </div>
            </div>

            {/* Bill Table */}
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-2">Номгӯй</th>
                  <th className="py-2 text-center">Миқдор</th>
                  <th className="py-2 text-right">Арзиш</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {activeInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{item.name}</td>
                    <td className="py-2 text-center font-bold">x{item.quantity}</td>
                    <td className="py-2 text-right font-bold">{((item.discountPrice || item.price) * item.quantity)} c.</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Invoice Totals */}
            <div className="pt-4 border-t border-gray-200 text-xs space-y-1.5 text-right">
              <div className="flex justify-between">
                <span className="text-gray-400">Нарх (Subtotal):</span>
                <span className="font-bold text-gray-800">{activeInvoice.totalAmount} c.</span>
              </div>
              {activeInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-500 font-semibold">
                  <span>Тахфиф (Discount):</span>
                  <span>-{activeInvoice.discountAmount} c.</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Хизматрасонӣ ({activeRest.serviceFee}%):</span>
                <span className="font-bold text-gray-800">{activeInvoice.serviceFee} c.</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                <span>Итого (Total):</span>
                <span>{activeInvoice.finalAmount} c.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-amber-600 font-bold">Барои ташрифатон ташаккур!</p>
              <p className="text-[10px] text-gray-400 mt-1">Омодашуда бо системаи MenuQR TJ</p>
              
              <div className="pt-4 flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Printer size={14} /> Чоп кардан
                </button>
                <button 
                  onClick={() => setActiveInvoice(null)}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl transition"
                >
                  Баргашт
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
