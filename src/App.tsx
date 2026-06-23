import React, { useState, useEffect } from 'react';
import SuperAdminPanel from './components/SuperAdminPanel';
import RestaurantAdminPanel from './components/RestaurantAdminPanel';
import CustomerMenu from './components/CustomerMenu';
import { i18n } from './i18n';
import { LanguageCode, UserRole } from './types';
import { 
  Building2, Users, Smartphone, Globe, ShieldCheck, 
  Settings, Info, HelpCircle 
} from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<UserRole>('restaurant_admin');
  const [lang, setLang] = useState<LanguageCode>('tj');

  // Customer scan parameters (simulated QR scan)
  const [scannedRestId, setScannedRestId] = useState<string | undefined>(undefined);
  const [scannedTableId, setScannedTableId] = useState<string | undefined>(undefined);

  // Track if this is a real physical scan from the URL query string
  const [isRealQrCodeScan, setIsRealQrCodeScan] = useState<boolean>(false);

  // Read URL query parameters if opened directly (e.g., /?restaurantId=X&tableId=Y)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('restaurantId');
    const tId = params.get('tableId');
    if (rId && tId) {
      setScannedRestId(rId);
      setScannedTableId(tId);
      setRole('customer');
      setIsRealQrCodeScan(true);
    }
  }, []);

  const handleScanSimulation = (restaurantId: string, tableId: string) => {
    setScannedRestId(restaurantId);
    setScannedTableId(tableId);
    setRole('customer');
  };

  const handleClearScan = () => {
    setScannedRestId(undefined);
    setScannedTableId(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-amber-100 selection:text-amber-800 pb-12">
      {/* SaaS Global Floating Control Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-xl shadow-md text-white border border-amber-400">
              QR
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-lg tracking-tight block">MenuQR TJ</span>
              <span className="text-[10px] text-slate-400 font-medium block">SaaS Платформа • Тоҷикистон</span>
            </div>
          </div>

          {/* Role Segmented Controller */}
          {!isRealQrCodeScan && (
            <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700/50">
              <button
                onClick={() => setRole('super_admin')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === 'super_admin'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck size={14} />
                <span className="hidden md:inline">{i18n[lang].roleSuperAdmin}</span>
              </button>
              <button
                onClick={() => setRole('restaurant_admin')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === 'restaurant_admin'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 size={14} />
                <span className="hidden md:inline">{i18n[lang].roleRestAdmin}</span>
              </button>
              <button
                onClick={() => setRole('customer')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === 'customer'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span className="hidden md:inline">{i18n[lang].roleCustomer}</span>
              </button>
            </div>
          )}

          {/* Language Selector Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
            <Globe className="text-slate-400" size={14} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LanguageCode)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="tj" className="bg-slate-900 text-white">Тоҷикӣ</option>
              <option value="ru" className="bg-slate-900 text-white">Русский</option>
              <option value="en" className="bg-slate-900 text-white">English</option>
            </select>
          </div>

        </div>
      </header>

      {/* Interactive Loop Helper Banner */}
      {!isRealQrCodeScan && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 shadow-2xs">
            <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <p className="font-bold">Лоиҳаи мукаммал ва фаъол (Full SaaS Live Simulation Loop):</p>
              <p className="leading-relaxed opacity-90">
                Шумо метавонед ба нақши <strong>«{i18n[lang].roleRestAdmin}»</strong> гузашта, ба мизи дилхоҳ QR-код тавлид кунед ва тугмаи <strong>«Санҷиши меню»</strong>-ро пахш намоед. Система ба таври худкор шуморо ба нақши <strong>«{i18n[lang].roleCustomer}»</strong> мегузаронад. Фармоиши сохтаи мизоҷ фавран дар панели админ бо садои огоҳинома пайдо мешавад ва мизоҷ тағйирёбии статуси фармоишро дар вақти воқеӣ (real-time) мушоҳида мекунад!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {role === 'super_admin' && (
          <div className="animate-fade-in">
            <SuperAdminPanel lang={lang} />
          </div>
        )}

        {role === 'restaurant_admin' && (
          <div className="animate-fade-in">
            <RestaurantAdminPanel lang={lang} onScanSimulation={handleScanSimulation} />
          </div>
        )}

        {role === 'customer' && (
          <div className="flex flex-col items-center justify-center animate-fade-in w-full">
            {isRealQrCodeScan ? (
              /* Native mobile full page view for actual QR-scan users */
              <div className="w-full max-w-md bg-white min-h-[85vh] sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-2">
                <CustomerMenu 
                  lang={lang} 
                  restaurantId={scannedRestId} 
                  tableId={scannedTableId} 
                  onClearScan={handleClearScan}
                  isRealQrCodeScan={true}
                />
              </div>
            ) : (
              /* Visual Phone Frame Wrapper for simulated admin dashboard testing */
              <div className="relative w-full max-w-sm bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800/80 ring-12 ring-slate-950/20 my-2">
                {/* Camera Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-full z-50 flex items-center justify-between px-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                  <span className="w-2.5 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Status Bar */}
                <div className="h-6 flex justify-between items-center px-6 text-[10px] text-white font-semibold pt-1 bg-slate-900">
                  <span>12:00</span>
                  <div className="flex items-center gap-1.5">
                    <span>📶</span>
                    <span>🔋 98%</span>
                  </div>
                </div>

                {/* Dynamic Customer Menu Screen */}
                <div className="bg-slate-50 rounded-[2.2rem] overflow-hidden min-h-[750px] relative">
                  <CustomerMenu 
                    lang={lang} 
                    restaurantId={scannedRestId} 
                    tableId={scannedTableId} 
                    onClearScan={handleClearScan}
                    isRealQrCodeScan={false}
                  />
                </div>
              </div>
            )}

            {/* Clear simulated parameters button */}
            {!isRealQrCodeScan && scannedRestId && (
              <button 
                onClick={handleClearScan}
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Озод кардани симулятсияи миз
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
