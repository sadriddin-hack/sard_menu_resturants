export type UserRole = 'super_admin' | 'restaurant_admin' | 'customer';

export type LanguageCode = 'tj' | 'ru' | 'en';

export interface Plan {
  id: string;
  name: 'Basic' | 'Pro' | 'Premium';
  price: number; // Monthly price in USD or Somoni
  features: string[];
  maxTables: number;
  maxProducts: number;
}

export interface RestaurantColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  cover: string;
  colors: RestaurantColors;
  address: string;
  phone: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    telegram?: string;
  };
  openingHours: string;
  status: 'active' | 'inactive';
  planId: string; // Basic, Pro, Premium
  rating: number;
  serviceFee: number; // e.g., 10%
  createdAt: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  qrCodeUrl: string;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  type: 'national_food' | 'drinks' | 'desserts' | 'salads' | 'fast_food';
  restaurantId: string;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  discountPrice?: number;
  preparationTime: number; // in minutes
  available: boolean;
  recommended: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  serviceFee: number;
  finalAmount: number;
  paymentMethod: 'cash' | 'alif' | 'dc' | 'eskhata' | 'card';
  paymentStatus: 'pending' | 'completed';
  status: 'received' | 'preparing' | 'ready' | 'delivered' | 'rejected';
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Staff {
  id: string;
  restaurantId: string;
  name: string;
  role: 'waiter' | 'kitchen' | 'cashier';
  email: string;
  permissions: string[];
  active: boolean;
}

export interface PlatformStats {
  totalRevenue: number;
  totalOrdersCount: number;
  totalRestaurants: number;
  activeSubscriptions: number;
  revenueByMonth: { month: string; amount: number }[];
  popularRestaurants: { name: string; ordersCount: number; revenue: number }[];
}

export interface RestaurantStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  activeTablesCount: number;
  bestSellers: { name: string; quantity: number; revenue: number }[];
  ordersByHour: { hour: string; count: number }[];
  tableActivity: { tableNumber: string; ordersCount: number; revenue: number }[];
  statusDistribution: { status: string; count: number }[];
}
