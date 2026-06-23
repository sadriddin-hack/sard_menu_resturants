import React, { useState, useEffect } from 'react';
import { Restaurant, Plan, PlatformStats } from '../types';
import { i18n } from '../i18n';
import { 
  Building2, ShieldCheck, CreditCard, RotateCcw, 
  Database, Activity, CheckCircle, XCircle, Plus, 
  Globe, TrendingUp, DollarSign, ShoppingBag, 
  Settings, Check, Smartphone
} from 'lucide-react';

interface SuperAdminProps {
  lang: 'tj' | 'ru' | 'en';
}

export default function SuperAdminPanel({ lang }: SuperAdminProps) {
  const t = i18n[lang];
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create Restaurant form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestPlan, setNewRestPlan] = useState<'Basic' | 'Pro' | 'Premium'>('Basic');
  const [newRestEmail, setNewRestEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Backup & Restore states
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'settings'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [restRes, statsRes, settingsRes] = await Promise.all([
        fetch('/api/restaurants'),
        fetch('/api/super/stats'),
        fetch('/api/super/settings')
      ]);

      const restData = await restRes.json();
      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();

      setRestaurants(restData);
      setStats(statsData);
      if (settingsData && settingsData.backupHistory) {
        setBackupLogs(settingsData.backupHistory);
      }
    } catch (e) {
      console.error("Error loading Super Admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (id: string) => {
    try {
      const res = await fetch(`/api/restaurants/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setRestaurants(prev => prev.map(r => r.id === id ? updated : r));
        // Refresh stats
        const statsRes = await fetch('/api/super/stats');
        setStats(await statsRes.json());
      }
    } catch (e) {
      console.error("Error toggling subscription:", e);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRestName,
          planId: newRestPlan,
          ownerEmail: newRestEmail,
        })
      });

      if (res.ok) {
        const created = await res.json();
        setRestaurants(prev => [...prev, created]);
        setNewRestName('');
        setNewRestEmail('');
        setShowCreateModal(false);
        // Refresh stats
        const statsRes = await fetch('/api/super/stats');
        setStats(await statsRes.json());
      }
    } catch (e) {
      console.error("Error creating restaurant:", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/super/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupSuccessMsg(t.backupSuccess);
        setBackupLogs(prev => [data.backup, ...prev]);
        setTimeout(() => setBackupSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error("Backup failed:", e);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm("Шумо мутмаин ҳастед? База барқарор мешавад.")) return;
    try {
      const res = await fetch('/api/super/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      });
      const data = await res.json();
      if (data.success) {
        setRestoreSuccessMsg(t.restoreSuccess);
        fetchData();
        setTimeout(() => setRestoreSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error("Restore failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Activity className="animate-spin text-amber-500 mr-2" size={32} />
        <span className="text-gray-500 font-medium">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-500" size={28} />
            {t.superDashboard}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.platformOverview}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition border border-gray-200"
          >
            <Database size={16} />
            {t.backupDb}
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 shadow-sm hover:shadow-md transition"
          >
            <Plus size={16} />
            {t.createRestaurant}
          </button>
        </div>
      </div>

      {/* Success Alerts */}
      {backupSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-sm font-medium flex items-center gap-2 animate-pulse">
          <CheckCircle className="text-emerald-500" size={18} />
          {backupSuccessMsg}
        </div>
      )}
      {restoreSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-sm font-medium flex items-center gap-2 animate-pulse">
          <CheckCircle className="text-emerald-500" size={18} />
          {restoreSuccessMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 py-2 rounded-xl border border-gray-100">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.analytics}
        </button>
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'restaurants'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.restaurants} ({restaurants.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.systemSettings} & {t.backupDb}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Platform Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.totalRevenue}</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalRevenue} {lang === 'en' ? 'TJS' : 'сом.'}</h3>
                <span className="text-xs text-emerald-500 font-semibold flex items-center mt-1">
                  <TrendingUp size={12} className="mr-1" /> +18.4% ин моҳ
                </span>
              </div>
              <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                <DollarSign size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.orders}</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalOrdersCount}</h3>
                <span className="text-xs text-emerald-500 font-semibold flex items-center mt-1">
                  <TrendingUp size={12} className="mr-1" /> +12.3% ин ҳафта
                </span>
              </div>
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.restaurants}</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalRestaurants}</h3>
                <span className="text-xs text-gray-500 font-semibold flex items-center mt-1">
                  Платформаи фаъол
                </span>
              </div>
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.activeSubs}</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.activeSubscriptions}</h3>
                <span className="text-xs text-emerald-500 font-semibold flex items-center mt-1">
                  {(stats.activeSubscriptions / (stats.totalRestaurants || 1) * 100).toFixed(0)}% муштариён
                </span>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Visualizer (Pure CSS/SVG Custom High Quality Chart) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-lg">{t.revenueChart} (6-моҳа)</h4>
                <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full font-medium">Ҳаҷми умумӣ</span>
              </div>
              <div className="relative h-64 flex items-end justify-between pt-8 px-4">
                {/* Horizontal gridlines */}
                <div className="absolute inset-x-0 top-8 border-t border-gray-100" />
                <div className="absolute inset-x-0 top-24 border-t border-gray-100" />
                <div className="absolute inset-x-0 top-40 border-t border-gray-100" />
                <div className="absolute inset-x-0 bottom-0 border-t border-gray-200" />

                {stats.revenueByMonth.map((item, index) => {
                  const maxAmt = Math.max(...stats.revenueByMonth.map(m => m.amount)) || 1000;
                  const pct = (item.amount / maxAmt) * 100;
                  return (
                    <div key={index} className="flex flex-col items-center group z-10 w-12">
                      <div className="absolute -top-1 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs py-1 px-2 rounded-lg -translate-y-full transition-all duration-200 shadow-md font-mono">
                        {item.amount} c.
                      </div>
                      <div 
                        style={{ height: `${Math.max(pct, 10)}%` }}
                        className="w-8 bg-amber-500 hover:bg-amber-600 rounded-t-lg transition-all duration-300 relative shadow-sm"
                      >
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-lg" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 mt-2">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Restaurants */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h4 className="font-bold text-gray-800 text-lg">{t.popularRestaurants}</h4>
              <div className="divide-y divide-gray-100">
                {stats.popularRestaurants.map((rest, index) => (
                  <div key={index} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{rest.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rest.ordersCount} фармоишҳо</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{rest.revenue} c.</p>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold">TOP {index+1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restaurants Tab */}
      {activeTab === 'restaurants' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-bold text-gray-800 text-lg">{t.restaurants}</h4>
              <p className="text-xs text-gray-500 mt-0.5">Аъзоён ва тарифҳои фаъоли платформа</p>
            </div>
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder={t.search} 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">{t.restaurantName}</th>
                  <th className="py-4 px-6">{t.selectPlan}</th>
                  <th className="py-4 px-6">{t.status}</th>
                  <th className="py-4 px-6">Санаи обуна</th>
                  <th className="py-4 px-6 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {restaurants.map((rest) => (
                  <tr key={rest.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img 
                          src={rest.logo} 
                          alt={rest.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-2xs"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{rest.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{rest.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        rest.planId === 'Premium' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                          : rest.planId === 'Pro' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-gray-50 text-gray-600 border border-gray-100'
                      }`}>
                        {rest.planId}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rest.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {rest.status === 'active' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t.active}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {t.inactive}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-xs">
                      {new Date(rest.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleToggleSubscription(rest.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          rest.status === 'active'
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100'
                        }`}
                      >
                        {rest.status === 'active' ? t.deactivate : t.activate}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform Settings Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2 space-y-6">
            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Settings className="text-gray-500" size={20} />
              Мудирияти Платформа
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Номи Система</label>
                <input 
                  type="text" 
                  defaultValue="MenuQR TJ" 
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Фосилаи нусхабардори (соат)</label>
                <input 
                  type="number" 
                  defaultValue={24} 
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            
            <div>
              <h5 className="font-bold text-gray-700 text-sm mb-3">Забонҳои дастрас</h5>
              <div className="flex gap-4">
                {['Tajik (TJ)', 'Russian (RU)', 'English (EN)'].map((langName, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <input type="checkbox" defaultChecked className="rounded text-amber-500 focus:ring-amber-500" />
                    {langName}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-bold text-gray-700 text-sm mb-3">Даргоҳҳои пардохтии дастгиришаванда</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Alif Mobil', 'Dushanbe City', 'Eskhata Online', 'Кортҳои Банкӣ'].map((g, idx) => (
                  <div key={idx} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex items-center gap-2">
                    <Check className="text-emerald-500" size={16} />
                    <span className="text-xs font-semibold text-gray-600">{g}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition">
              {t.save}
            </button>
          </div>

          {/* Backup History */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Database className="text-amber-500" size={20} />
              Нусхаҳои эҳтиётӣ (Backups)
            </h4>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1 space-y-3">
              {backupLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-xs truncate">{log.filename}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleRestore(log.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-100 transition"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Restaurant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-100 shadow-2xl p-6 relative">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t.createRestaurant}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Сабт ва конфигуратсияи устави ресторан</p>
            </div>
            
            <form onSubmit={handleCreateRestaurant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.restaurantName}</label>
                <input 
                  type="text" 
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="Масалан: Оши Ризо"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.selectPlan}</label>
                <select 
                  value={newRestPlan}
                  onChange={(e: any) => setNewRestPlan(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Basic">Basic - 150 c. / моҳ</option>
                  <option value="Pro">Pro - 300 c. / моҳ</option>
                  <option value="Premium">Premium - 500 c. / моҳ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.ownerEmail}</label>
                <input 
                  type="email" 
                  value={newRestEmail}
                  onChange={(e) => setNewRestEmail(e.target.value)}
                  placeholder="owner@oshirizo.tj"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition flex items-center gap-2"
                >
                  {isCreating ? 'Creating...' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
