import React, { useState, useEffect } from 'react';
import { Restaurant, Table, Category, Product, Order, OrderItem } from '../types';
import { i18n } from '../i18n';
import { 
  Search, ShoppingCart, Clock, Check, Star, ArrowLeft, 
  MapPin, Phone, MessageSquare, CreditCard, ChevronRight,
  ShieldCheck, AlertTriangle, RefreshCw, X
} from 'lucide-react';

interface CustomerMenuProps {
  lang: 'tj' | 'ru' | 'en';
  restaurantId?: string;
  tableId?: string;
  onClearScan: () => void;
  isRealQrCodeScan?: boolean;
}

export default function CustomerMenu({ lang, restaurantId, tableId, onClearScan, isRealQrCodeScan = false }: CustomerMenuProps) {
  const t = i18n[lang];
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [activeTable, setActiveTable] = useState<Table | null>(null);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'alif' | 'dc' | 'eskhata' | 'card'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Active placed order tracking
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner Simulator States (if loaded without restaurant/table parameters)
  const [demoRestaurants, setDemoRestaurants] = useState<Restaurant[]>([]);
  const [demoTables, setDemoTables] = useState<Table[]>([]);
  const [selectedDemoRest, setSelectedDemoRest] = useState('');
  const [selectedDemoTable, setSelectedDemoTable] = useState('');

  useEffect(() => {
    if (restaurantId && tableId) {
      loadCustomerMenuData(restaurantId, tableId);
    } else {
      loadDemoData();
    }
  }, [restaurantId, tableId]);

  // Order status polling (polls the server every 4 seconds to check if order has updated)
  useEffect(() => {
    let interval: any;
    if (placedOrder && placedOrder.status !== 'delivered' && placedOrder.status !== 'rejected') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${placedOrder.id}`);
          if (res.ok) {
            const updated: Order = await res.json();
            setPlacedOrder(updated);
            if (updated.status === 'delivered') {
              // Order complete, clear cart
              setCart([]);
            }
          }
        } catch (e) {
          console.error("Failed to poll order status:", e);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [placedOrder]);

  const loadDemoData = async () => {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setDemoRestaurants(data);
      if (data.length > 0) {
        setSelectedDemoRest(data[0].id);
        fetchDemoTables(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load demo setup data:", e);
    }
  };

  const fetchDemoTables = async (restId: string) => {
    try {
      const res = await fetch(`/api/restaurants/${restId}/tables`);
      const data: Table[] = await res.json();
      setDemoTables(data.filter(t => t.status === 'active'));
      if (data.length > 0) {
        setSelectedDemoTable(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load demo tables:", e);
    }
  };

  const loadCustomerMenuData = async (rId: string, tId: string) => {
    try {
      const [restRes, tablesRes, catsRes, prodsRes] = await Promise.all([
        fetch('/api/restaurants'),
        fetch(`/api/restaurants/${rId}/tables`),
        fetch(`/api/restaurants/${rId}/categories`),
        fetch(`/api/restaurants/${rId}/products`)
      ]);

      const restaurantsList: Restaurant[] = await restRes.json();
      const currentRest = restaurantsList.find(r => r.id === rId);
      if (!currentRest) return;

      setActiveRestaurant(currentRest);

      const tablesList: Table[] = await tablesRes.json();
      const currentTable = tablesList.find(t => t.id === tId);
      if (currentTable) {
        setActiveTable(currentTable);
      }

      setCategories(await catsRes.json());
      const allProds: Product[] = await prodsRes.json();
      // Only show available items to customer
      setProducts(allProds.filter(p => p.available));
    } catch (e) {
      console.error("Error loading customer menu data:", e);
    }
  };

  const handleDemoLaunch = () => {
    if (selectedDemoRest && selectedDemoTable) {
      loadCustomerMenuData(selectedDemoRest, selectedDemoTable);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        quantity: 1,
        image: product.image
      }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, quantity } 
        : item
    ));
  };

  // Math totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = cart.reduce((sum, item) => {
    if (item.discountPrice) {
      return sum + ((item.price - item.discountPrice) * item.quantity);
    }
    return sum;
  }, 0);

  const subtotalAfterDiscount = subtotal - discount;
  const serviceFeePercent = activeRestaurant?.serviceFee || 0;
  const serviceFee = parseFloat(((subtotalAfterDiscount * serviceFeePercent) / 100).toFixed(2));
  const total = parseFloat((subtotalAfterDiscount + serviceFee).toFixed(2));

  // Submit Order to backend
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !activeRestaurant || !activeTable) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: activeRestaurant.id,
          tableId: activeTable.id,
          items: cart,
          paymentMethod,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        setPlacedOrder(orderData);
        setShowCart(false);
      }
    } catch (e) {
      console.error("Order submission failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Welcome / Simulator Select Screen
  if (!activeRestaurant) {
    if (isRealQrCodeScan) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md mx-auto my-8">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <h3 className="font-bold text-gray-800 text-sm">Лутфан мунтазир шавед...</h3>
          <p className="text-xs text-gray-400">Меню ва тафсилоти ресторан боргузорӣ шуда истодааст</p>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto my-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <ShoppingCart className="text-white" size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{t.appName}</h2>
          <p className="text-xs text-gray-500 font-medium">{t.scanWelcome}</p>
        </div>

        {/* Demo Scanner selectors */}
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-4">
          <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span className="animate-ping w-2 h-2 rounded-full bg-amber-500" />
            {t.scanDemo}
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ресторан</label>
              <select 
                value={selectedDemoRest}
                onChange={(e) => {
                  setSelectedDemoRest(e.target.value);
                  fetchDemoTables(e.target.value);
                }}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
              >
                {demoRestaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.planId})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.selectDemoTable}</label>
              <select 
                value={selectedDemoTable}
                onChange={(e) => setSelectedDemoTable(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
              >
                {demoTables.map(t => (
                  <option key={t.id} value={t.id}>Миз {t.number}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleDemoLaunch}
              className="w-full py-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md hover:bg-amber-600 transition"
            >
              Сканировии QR (Симулятсия)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE PLACED ORDER STATUS VIEW
  if (placedOrder) {
    const getStatusStepClass = (step: number) => {
      const orderStatusMap: { [key: string]: number } = {
        'received': 1,
        'preparing': 2,
        'ready': 3,
        'delivered': 4
      };
      const currentStep = orderStatusMap[placedOrder.status] || 0;
      if (placedOrder.status === 'rejected') return 'bg-rose-500 text-white border-rose-500';

      if (currentStep >= step) {
        return 'bg-amber-500 text-white border-amber-500';
      }
      return 'bg-gray-100 text-gray-400 border-gray-100';
    };

    return (
      <div className="max-w-md mx-auto bg-white min-h-[90vh] shadow-xl rounded-2xl overflow-hidden border border-gray-100 flex flex-col justify-between p-6">
        <div className="space-y-6">
          <div className="text-center pb-4 border-b border-gray-100 space-y-1">
            <h2 className="text-lg font-extrabold text-gray-900">{activeRestaurant.name}</h2>
            <p className="text-xs text-amber-600 font-bold">Фармоиш: {placedOrder.id}</p>
            <span className="text-[10px] px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Миз №{placedOrder.tableNumber}</span>
          </div>

          {/* Stepper tracker */}
          {placedOrder.status === 'rejected' ? (
            <div className="p-4 bg-rose-50 rounded-xl text-rose-800 text-sm font-semibold border border-rose-100 text-center space-y-1.5">
              <AlertTriangle className="mx-auto text-rose-500" size={24} />
              <p>Фармоиши шумо аз ҷониби ресторан рад карда шуд.</p>
              <p className="text-xs text-rose-600">Шояд маҳсулот тамом шудааст. Лутфан бо официант тамос гиред.</p>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wider text-center">{t.orderStatus}</h3>
              
              <div className="relative pl-8 space-y-6">
                {/* Visual vertical bar */}
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />

                {/* Step 1: Received */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-7 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${getStatusStepClass(1)}`}>
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Қабул шуд (Received)</h4>
                    <p className="text-[10px] text-gray-400">Фармоиш ба админ фиристода шуд</p>
                  </div>
                </div>

                {/* Step 2: Preparing */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-7 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${getStatusStepClass(2)}`}>
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Омода шуда истодааст (Preparing)</h4>
                    <p className="text-[10px] text-gray-400">Ошпазҳо ба пухтупаз оғоз карданд</p>
                  </div>
                </div>

                {/* Step 3: Ready */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-7 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${getStatusStepClass(3)}`}>
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Омода шуд! (Ready)</h4>
                    <p className="text-[10px] text-gray-400">Хӯрок омода аст ва оварда мешавад</p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-7 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${getStatusStepClass(4)}`}>
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Супорида шуд (Delivered)</h4>
                    <p className="text-[10px] text-gray-400">Иштиҳои ҷон! Ташаккур!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Breakdown */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-2">
            <h4 className="font-bold text-gray-800">Маҳсулоти фармоишӣ:</h4>
            {placedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-600">{item.name} x{item.quantity}</span>
                <span className="font-bold">{(item.discountPrice || item.price) * item.quantity} c.</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-extrabold text-gray-900">
              <span>Пардохти умумӣ:</span>
              <span>{placedOrder.finalAmount} c. ({placedOrder.paymentMethod.toUpperCase()})</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {placedOrder.status === 'delivered' && (
            <button 
              onClick={() => {
                setPlacedOrder(null);
                setCart([]);
                if (!isRealQrCodeScan) {
                  onClearScan();
                }
              }}
              className="w-full py-2.5 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Баргашт ба саҳифаи аввал (Меню)
            </button>
          )}
          {!isRealQrCodeScan && (
            <button 
              onClick={onClearScan}
              className="w-full py-2 bg-gray-50 text-gray-500 text-xs font-bold rounded-xl border border-gray-100 transition"
            >
              Ивази ресторан / Скан кунед
            </button>
          )}
        </div>
      </div>
    );
  }

  // NORMAL DIGITAL MENU INTERFACE
  return (
    <div className="max-w-md mx-auto bg-white min-h-[90vh] shadow-xl rounded-2xl overflow-hidden border border-gray-100 flex flex-col justify-between">
      <div>
        {/* Cover image banner */}
        <div className="h-44 relative bg-gray-100">
          <img src={activeRestaurant.cover} alt={activeRestaurant.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
          
          {!isRealQrCodeScan && (
            <button 
              onClick={onClearScan}
              className="absolute top-4 left-4 p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full backdrop-blur-xs transition shadow-md"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
            <img 
              src={activeRestaurant.logo} 
              alt={activeRestaurant.name} 
              className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md bg-white" 
            />
            <div className="pb-1">
              <h2 className="text-lg font-black tracking-tight">{activeRestaurant.name}</h2>
              <p className="text-[10px] opacity-80 flex items-center gap-1">
                <MapPin size={10} /> Миз №{activeTable?.number || 'Simulation'}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative">
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition"
            />
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={14} />
          </div>
        </div>

        {/* Horizontal Category Scroll */}
        <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-100 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-500 border border-gray-100'
            }`}
          >
            Ҳама (All)
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 border border-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="p-4 grid grid-cols-1 gap-4">
          {filteredProducts.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-white p-3 rounded-2xl border border-gray-100 flex gap-3 shadow-2xs hover:shadow-sm transition"
            >
              <img 
                src={prod.image} 
                alt={prod.name} 
                className="w-20 h-20 rounded-xl object-cover border border-gray-100 bg-gray-50 shrink-0" 
              />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="font-bold text-gray-900 text-xs">{prod.name}</h4>
                    {prod.recommended && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[8px] font-extrabold tracking-wider border border-amber-100 shrink-0 flex items-center gap-0.5">
                        <Star size={8} fill="currentColor" /> REC
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-gray-900 text-sm">
                      {prod.discountPrice || prod.price} c.
                    </span>
                    {prod.discountPrice && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {prod.price} c.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock size={10} /> {prod.preparationTime} дақ
                    </span>
                    <button 
                      onClick={() => handleAddToCart(prod)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                    >
                      + Илова
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer sticky cart indicator */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{cart.length} маҳсулот</p>
            <p className="text-base font-extrabold text-gray-900 mt-0.5">{total} сом.</p>
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-amber-500/10"
          >
            <ShoppingCart size={14} />
            Сабад (Cart)
          </button>
        </div>
      )}

      {/* Cart Drawer / Dialog Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto space-y-6 animate-slide-up shadow-2xl relative">
            <button 
              onClick={() => setShowCart(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-900">{t.cart}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Фармоиши худро тафтиш кунед</p>
            </div>

            {/* Cart products list */}
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.productId} className="py-3 flex justify-between items-center gap-3">
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">{item.name}</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">{(item.discountPrice || item.price)} сом.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkouts Fields */}
            <form onSubmit={handleSubmitOrder} className="space-y-4 pt-4 border-t border-gray-100">
              <div>
                <h4 className="font-bold text-gray-800 text-xs mb-3">{t.customerDetails}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.yourName}</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Масалан: Садриддин"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.yourPhone}</label>
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+992 90 999 0011"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Selector with Tajiki logos */}
              <div>
                <h4 className="font-bold text-gray-800 text-xs mb-3">{t.selectPayment}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      paymentMethod === 'cash'
                        ? 'border-amber-500 bg-amber-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-gray-800">Нақдӣ (Cash)</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Ба пешхизмат пардохт</p>
                    </div>
                    {paymentMethod === 'cash' && <span className="text-amber-500 text-xs">●</span>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('alif')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      paymentMethod === 'alif'
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800">Alif Mobil</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Комиссия 0%</p>
                    </div>
                    {paymentMethod === 'alif' && <span className="text-emerald-500 text-xs">●</span>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('dc')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      paymentMethod === 'dc'
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-blue-800">Dushanbe City</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Корти миллӣ</p>
                    </div>
                    {paymentMethod === 'dc' && <span className="text-blue-500 text-xs">●</span>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-indigo-800">Visa / MasterCard</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Пардохти фаврӣ</p>
                    </div>
                    {paymentMethod === 'card' && <span className="text-indigo-500 text-xs">●</span>}
                  </button>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.subtotal}:</span>
                  <span className="font-bold text-gray-800">{subtotal} c.</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>{t.discount}:</span>
                    <span>-{discount} c.</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.serviceFee} ({serviceFeePercent}%):</span>
                  <span className="font-bold text-gray-800">{serviceFee} c.</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                  <span>Итого:</span>
                  <span>{total} c.</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {isSubmitting ? t.loading : t.confirmOrder}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
