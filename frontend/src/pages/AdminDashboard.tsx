import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  UserCheck,
  ShoppingCart,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Droplets
} from 'lucide-react';
import { getDashboardProducts, DashboardProductData, getOrders, deleteOrder, acceptOrder, rejectOrder, OrderData } from '@/api/database';
import { useToast } from '@/hooks/use-toast';
import { markOrderProcessed, unmarkOrderProcessed } from '@/store/pendingOrdersStore';
import { CommandeCard } from '@/components/admin/CommandeCard';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [dashboardProducts, setDashboardProducts] = useState<DashboardProductData[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Check if user is admin
      if (parsedUser.role !== 'admin' && parsedUser.is_admin !== true) {
        navigate('/login');
      } else {
        setUser(parsedUser);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Meta Pixel Code
  useEffect(() => {
    // Create script element
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1755717761807103');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Create noscript element
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=1755717761807103&ev=PageView&noscript=1"
      />
    `;
    document.body.appendChild(noscript);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (noscript.parentNode) {
        noscript.parentNode.removeChild(noscript);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('userLogout'));
    navigate('/login');
  };

  // Load dashboard products
  useEffect(() => {
    if (activeMenu === 'produits') {
      loadDashboardProducts();
    }
  }, [activeMenu]);

  // Load orders
  useEffect(() => {
    if (activeMenu === 'commandes') {
      loadOrders();
    }
  }, [activeMenu]);

  const loadDashboardProducts = async () => {
    setLoadingProducts(true);
    try {
      // Fetch from /api/products (actual products table)
      const response = await fetch(`${getApiBaseUrl()}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();
      const products = result.data || result || [];
      setDashboardProducts(products);
    } catch (error) {
      // Log error only in development, show user-friendly message
      if (import.meta.env.DEV && typeof console !== 'undefined' && console.error) {
        console.error('Error loading products:', error);
      }
      // User-friendly error handling - products array will remain empty
      // UI will show empty state naturally
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const ordersData = await getOrders();
      setOrders(ordersData);
    } catch (error) {
      // Log error only in development
      if (import.meta.env.DEV && typeof console !== 'undefined' && console.error) {
        console.error('Error loading orders:', error);
      }
      if (error instanceof Error && error.message === 'Admin access required') {
        alert('Vous devez être administrateur pour accéder aux commandes.');
        navigate('/login');
      }
      // User-friendly error handling - orders array will remain empty
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      return;
    }

    try {
      await deleteOrder(orderId);
      await loadOrders();
    } catch (error) {
      if (import.meta.env.DEV && typeof console !== 'undefined' && console.error) {
        console.error('Error deleting order:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la suppression de la commande: ${errorMessage}`);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    const prevOrders = [...orders];
    const prevPending = queryClient.getQueryData<OrderData[]>(['orders', 'pending']);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'accepted' } : o))
    );
    markOrderProcessed(orderId);
    queryClient.setQueryData(['orders', 'pending'], (old: OrderData[] | undefined) =>
      (old || []).filter((o) => o.id !== orderId)
    );

    try {
      await acceptOrder(orderId);
      await loadOrders();
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['category-status'] });
      queryClient.invalidateQueries({ queryKey: ['cat3_pages'] });
    } catch (error) {
      setOrders(prevOrders);
      unmarkOrderProcessed(orderId);
      queryClient.setQueryData(['orders', 'pending'], prevPending);
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    const prevOrders = [...orders];
    const prevPending = queryClient.getQueryData<OrderData[]>(['orders', 'pending']);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o))
    );
    markOrderProcessed(orderId);
    queryClient.setQueryData(['orders', 'pending'], (old: OrderData[] | undefined) =>
      (old || []).filter((o) => o.id !== orderId)
    );

    try {
      await rejectOrder(orderId);
      await loadOrders();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['category-status'] });
    } catch (error) {
      setOrders(prevOrders);
      unmarkOrderProcessed(orderId);
      queryClient.setQueryData(['orders', 'pending'], prevPending);
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const getOrderStatusLabel = (status: string | undefined | null) => {
    if (!status) return 'En attente';
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Accepté';
      case 'rejected':
      case 'refused': return 'Refusé';
      default: return status;
    }
  };

  const isOrderPending = (order: OrderData) => (order.status || 'pending') === 'pending';

  // Mock data
  const stats = [
    {
      title: 'Total Ventes',
      value: '125,430',
      change: '+12.5%',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Produits',
      value: '1,234',
      change: '+8.2%',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Clients',
      value: '8,567',
      change: '+15.3%',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Revenus',
      value: '45,678 TND',
      change: '+23.1%',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  const recentOrders = [
    { id: 1, client: 'Ahmed Ben Ali', montant: '245.50 TND', statut: 'Livré', date: '15 Jan 2025' },
    { id: 2, client: 'Fatma Bouzid', montant: '189.30 TND', statut: 'En cours', date: '14 Jan 2025' },
    { id: 3, client: 'Mohamed Trabelsi', montant: '567.80 TND', statut: 'Livré', date: '14 Jan 2025' },
    { id: 4, client: 'Salma Hammami', montant: '123.45 TND', statut: 'En attente', date: '13 Jan 2025' },
    { id: 5, client: 'Karim Dridi', montant: '890.20 TND', statut: 'Livré', date: '13 Jan 2025' }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'produits', label: 'Offre historique', icon: Package },
    { id: 'produits2', label: 'Produits 2', icon: Package, path: '/admin-produits2' },
    { id: 'huile-eau-additif', label: 'Huile & Eau Additif', icon: Droplets, path: '/admin/huile-eau-additif' },
    { id: 'commandes', label: 'Commandes', icon: ShoppingBag },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Livré':
        return 'bg-green-100 text-green-800';
      case 'En cours':
        return 'bg-blue-100 text-blue-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Meta Pixel Code */}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white shadow-lg z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-64
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#6366F1]">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Special handling for "Offre historique" and "Produits 2" - link to separate pages
            if (item.id === 'produits') {
              return (
                <Link
                  key={item.id}
                  to="/admin/offre-historique"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            }
            if ('path' in item && item.path) {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-[#6366F1] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${activeMenu === item.id
                    ? 'bg-[#6366F1] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={`lg:ml-64 transition-all duration-300`}>
        {/* Navbar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.username || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-500">Administrateur</p>
                  </div>
                  <div className="w-10 h-10 bg-[#6366F1] rounded-full flex items-center justify-center text-white font-semibold">
                    {(user?.username || 'A').charAt(0).toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeMenu === 'dashboard' ? 'Dashboard' : 
               activeMenu === 'produits' ? 'Offre historique' :
               activeMenu === 'commandes' ? 'Commandes' :
               activeMenu === 'clients' ? 'Clients' :
               activeMenu === 'statistiques' ? 'Statistiques' :
               activeMenu === 'parametres' ? 'Paramètres' : 'Dashboard'}
            </h2>
            <p className="text-gray-600 mt-1">
              {activeMenu === 'dashboard' ? 'Vue d\'ensemble de votre activité' :
               activeMenu === 'produits' ? 'Offre historique' :
               activeMenu === 'commandes' ? 'Gestion des commandes' :
               activeMenu === 'clients' ? 'Gestion des clients' :
               activeMenu === 'statistiques' ? 'Statistiques et analyses' :
               activeMenu === 'parametres' ? 'Paramètres du système' : ''}
            </p>
          </div>

          {/* Produits Section */}
          {activeMenu === 'produits' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Produits du tableau de bord
                </h3>
              </div>
              <div className="p-6">
                {loadingProducts ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Chargement des produits...</p>
                  </div>
                ) : dashboardProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun produit dans le tableau de bord</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        {(product.image || product.main_image) && (
                          <img
                            src={product.image || product.main_image}
                            alt={product.name || 'Product'}
                            className="w-full h-48 object-cover rounded-lg mb-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-800 mb-2">{product.name}</h4>
                        {product.references && Array.isArray(product.references) && product.references.length > 0 && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Références:</span> {product.references.join(', ')}
                          </p>
                        )}
                        <div className="space-y-1 mb-3">
                          {product.promo_percent && product.promo_percent > 0 ? (
                            <>
                              <p className="text-sm text-gray-500 line-through">
                                {Number(product.price || 0).toFixed(3)} DT
                              </p>
                              <p className="text-sm font-semibold text-green-600">
                                {Number(product.promo_price || product.price || 0).toFixed(3)} DT
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                  -{product.promo_percent}%
                                </span>
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Prix:</span> {Number(product.price || 0).toFixed(3)} DT
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // TODO: Implement delete functionality
                            console.log('Delete product:', product.id);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commandes Section */}
          {activeMenu === 'commandes' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Gestion des commandes
                </h3>
              </div>
              
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <p className="text-gray-500 mt-4">Chargement des commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune commande pour le moment</p>
                </div>
              ) : (
                <>
                  {/* MOBILE & TABLET CARD VIEW (< 1024px) */}
                  <div className="block lg:hidden p-4 space-y-3">
                    {orders.map((order) => (
                      <CommandeCard
                        key={order.id}
                        order={order}
                        onAccept={handleAcceptOrder}
                        onRefuse={handleRejectOrder}
                        onDelete={handleDeleteOrder}
                        getOrderStatusLabel={getOrderStatusLabel}
                        isOrderPending={isOrderPending}
                      />
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= 1024px) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Date & Heure
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Image
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Produit
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Marque
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Modèle
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Prix
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Références
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Qté
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Client
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Téléphone
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Wilaya
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Délégation
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b hidden lg:table-cell">
                            Statut
                          </th>
                          <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order, index) => {
                          const orderDate = order.created_at 
                            ? new Date(order.created_at) 
                            : new Date();
                          const formattedDate = orderDate.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          const formattedTime = orderDate.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr 
                              key={order.id} 
                              className={isOrderPending(order) ? 'pending-row' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                            >
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex flex-col">
                                  <span className="font-medium">{formattedDate}</span>
                                  <span className="text-gray-500 text-xs">{formattedTime}</span>
                                </div>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                {(() => {
                                  // Get image from product_snapshot first, fallback to product_image
                                  const productImage = order.product_snapshot?.image || order.product_image || 
                                                       (Array.isArray(order.product_snapshot?.images) && order.product_snapshot.images.length > 0 
                                                        ? order.product_snapshot.images[0] : null);
                                  
                                  return productImage ? (
                                    <img 
                                      src={productImage} 
                                      alt={order.product_name}
                                      className="w-12 h-12 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                      <Package className="w-6 h-6 text-gray-400" />
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-3 lg:px-4 py-3 text-sm text-gray-900">
                                <div className="max-w-xs truncate" title={order.product_name}>
                                  {order.product_name}
                                </div>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                                {(order as any).brand_name || order.product_snapshot?.brand_name || "—"}
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                                {(order as any).model_name || order.product_snapshot?.model_name || "—"}
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {parseFloat(String(order.product_price || 0)).toFixed(3)} DT
                              </td>
                              <td className="px-3 lg:px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                                {order.product_references && order.product_references.length > 0 ? (
                                  <div className="max-w-xs">
                                    <div className="flex flex-wrap gap-1">
                                      {order.product_references.slice(0, 2).map((ref, i) => (
                                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                          {ref}
                                        </span>
                                      ))}
                                      {order.product_references.length > 2 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                          +{order.product_references.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Aucune</span>
                                )}
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                                  {order.quantity}
                                </span>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">{order.customer_prenom} {order.customer_nom}</div>
                                </div>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <a 
                                  href={`tel:${order.customer_phone}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {order.customer_phone}
                                </a>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {order.customer_wilaya}
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                                <div className="max-w-xs truncate" title={order.customer_delegation}>
                                  {order.customer_delegation}
                                </div>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm hidden lg:table-cell">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  (order as any).status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  (order as any).status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {getOrderStatusLabel((order as any).status)}
                                </span>
                              </td>
                              <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-1">
                                  {isOrderPending(order) && (
                                    <>
                                      <button
                                        onClick={() => order.id && handleAcceptOrder(order.id)}
                                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-2 rounded transition-colors"
                                        title="Accepter"
                                        aria-label="Accepter"
                                      >
                                        <span className="text-xs font-medium">Accepter</span>
                                      </button>
                                      <button
                                        onClick={() => order.id && handleRejectOrder(order.id)}
                                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-2 rounded transition-colors"
                                        title="Refuser"
                                        aria-label="Refuser"
                                      >
                                        <span className="text-xs font-medium">Refuser</span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => order.id && handleDeleteOrder(order.id)}
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-2 rounded transition-colors"
                                    title="Supprimer"
                                    aria-label="Supprimer la commande"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dashboard Section */}
          {activeMenu === 'dashboard' && (
            <>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              );
            })}
          </div>

          {/* Graph and Table Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Graph Placeholder */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Graphique des ventes
              </h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <p className="text-gray-400">Graphique ici</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Activité récente
              </h3>
              <div className="space-y-3">
                {recentOrders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{order.client}</p>
                      <p className="text-sm text-gray-500">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{order.montant}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.statut)}`}>
                        {order.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Dernières commandes
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.montant}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.statut)}`}>
                          {order.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#6366F1] hover:text-[#4f46e5] transition-colors">
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;

