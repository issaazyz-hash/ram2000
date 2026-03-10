import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, Search, ShoppingCart, Menu, Star, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AdminFiltersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'plate' | 'vehicle'>('plate');

  // بيانات الفلاتر المضافة من الادمين
  const [adminFilters, setAdminFilters] = useState([
    { id: 1, name: 'Disque de frein voiture arrière et avant', type: 'brake', image: '/ff.png' },
    { id: 2, name: 'Plaquettes de frein', type: 'brake', image: '/ll.png' },
    { id: 3, name: 'Filtre à huile', type: 'engine', image: '/ff.png' },
    { id: 4, name: 'Bougies d\'allumage', type: 'engine', image: '/ll.png' },
    { id: 5, name: 'Amortisseurs', type: 'suspension', image: '/ff.png' },
  ]);

  // العلامات التجارية الشائعة
  const popularBrands = ['RENAULT', 'PEUGEOT', 'VW', 'CITROËN', 'BMW', 'AUDI', 'MERCEDES', 'FORD'];

  // النماذج الشائعة
  const popularModels = [
    { name: 'GOLF', engine: '1.4 TSI', image: '/ff.png' },
    { name: 'CLIO', engine: '1.5 DCI', image: '/ll.png' },
    { name: 'SÉRIE 3', engine: '2.0 TDI', image: '/ff.png' },
    { name: 'MÉGANE', engine: '1.6 DCI', image: '/ll.png' },
    { name: 'C4', engine: '1.6 HDI', image: '/ff.png' },
    { name: 'C3', engine: '1.2 PureTech', image: '/ll.png' },
    { name: 'A3', engine: '1.4 TFSI', image: '/ff.png' },
    { name: '206', engine: '1.4 HDI', image: '/ll.png' },
    { name: 'POLO', engine: '1.0 TSI', image: '/ff.png' },
    { name: '208', engine: '1.2 PureTech', image: '/ll.png' },
  ];

  // أفضل المبيعات
  const bestSellers = [
    {
      id: 1,
      brand: 'Brembo',
      name: 'Disque de frein',
      price: '39,84 €',
      rating: 5,
      image: '/ff.png',
      compatible: 'Compatible avec BMW E90'
    },
    {
      id: 2,
      brand: 'ATE',
      name: 'Disque de frein',
      price: '44,33 €',
      rating: 5,
      image: '/ll.png',
      compatible: 'Compatible avec BMW E90'
    },
    {
      id: 3,
      brand: 'Bosch',
      name: 'Plaquettes de frein',
      price: '28,50 €',
      rating: 5,
      image: '/ff.png',
      compatible: 'Compatible avec VW Golf'
    }
  ];

  // العلامات التجارية الكبيرة
  const bigBrands = ['MOOG', 'BOSCH', 'Brembo', 'ATE', 'VALEO', 'CONTINENTAL', 'MANN', 'MAHLE'];

  // فئات قطع الغيار
  const partCategories = [
    { name: 'Moteur', image: '/ff.png' },
    { name: 'Freinage', image: '/ll.png' },
    { name: 'Filtration', image: '/ff.png' },
    { name: 'Suspension', image: '/ll.png' },
    { name: 'Direction', image: '/ff.png' },
    { name: 'Échappement', image: '/ll.png' },
    { name: 'Éclairage', image: '/ff.png' },
    { name: 'Carrosserie', image: '/ll.png' },
    { name: 'Intérieur', image: '/ff.png' }
  ];

  useEffect(() => {
    // التحقق من صلاحيات الادمين
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // تنفيذ البحث
      console.log('Searching for:', searchQuery);
    }
  };

  const handleFilterClick = (filter: any) => {
    // الانتقال إلى صفحة تفاصيل الفلتر
    navigate(`/filter-details/${filter.id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Status Bar */}
      <div className="bg-green-600 text-white text-xs px-4 py-1 flex justify-between items-center">
        <span>10:42</span>
        <div className="flex items-center gap-1">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* URL Bar */}
      <div className="bg-green-500 text-white text-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🏠</span>
          <span>www.pieces-auto.com</span>
        </div>
        <div className="flex items-center gap-2">
          <span>➕</span>
          <span>📁</span>
          <span>📤</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-gray-600" />
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center gap-4">
          <Search className="h-6 w-6 text-gray-600" />
          <div className="relative">
            <ShoppingCart className="h-6 w-6 text-gray-600" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button & Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <ChevronLeft className="h-5 w-5 text-gray-600" />
        <span className="text-sm text-gray-600">Disque de frein voiture arrière et avant</span>
      </div>

      {/* Search Section */}
      <div className="bg-gray-800 text-white p-4">
        {/* Search Tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => setSelectedTab('plate')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              selectedTab === 'plate' ? 'bg-white text-gray-800' : 'bg-gray-700 text-white'
            }`}
          >
            Rechercher par numéro d'immatriculation
          </button>
          <button
            onClick={() => setSelectedTab('vehicle')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              selectedTab === 'vehicle' ? 'bg-white text-gray-800' : 'bg-gray-700 text-white'
            }`}
          >
            Rechercher par marque et modèle de véhicule
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <span className="text-blue-500">🇪🇺</span>
            </div>
            <Input
              type="text"
              placeholder="AA-123-BB"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-gray-800 border-0 rounded-lg"
            />
          </div>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <Search className="h-5 w-5" />
          RECHERCHER
        </Button>
      </div>

      {/* Popular Brands */}
      <div className="bg-white p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">MARQUES DE VOITURES LES PLUS POPULAIRES</h3>
        <div className="flex overflow-x-auto gap-4 pb-2">
          {popularBrands.map((brand, index) => (
            <div
              key={index}
              className="flex-shrink-0 bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-700"
            >
              {brand}
            </div>
          ))}
        </div>
      </div>

      {/* Popular Models */}
      <div className="bg-white p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">MODÈLES DE VOITURES LES PLUS DEMANDÉS</h3>
        <div className="space-y-3">
          {popularModels.map((model, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <img
                src={model.image}
                alt={model.name}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{model.name}</h4>
                <p className="text-sm text-gray-600">{model.engine}</p>
              </div>
              <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter Categories */}
      <div className="bg-white p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🔧</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">Marque</h4>
              <p className="text-sm text-gray-600">PAR EXEMPLE</p>
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🚗</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">Véhicule</h4>
              <p className="text-sm text-gray-600">VÉHICULE</p>
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">⚙️</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">Produit</h4>
              <p className="text-sm text-gray-600">PRODUIT</p>
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="bg-white p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">LES MEILLEURES VENTES</h3>
        <div className="flex overflow-x-auto gap-4 pb-2">
          {bestSellers.map((product) => (
            <Card key={product.id} className="flex-shrink-0 w-64">
              <CardContent className="p-4">
                <div className="text-center mb-3">
                  <div className="text-red-600 font-bold text-sm mb-2">{product.brand}</div>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-24 object-contain mx-auto mb-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <h4 className="font-bold text-gray-800 mb-1">{product.name}</h4>
                  <div className="text-lg font-bold text-orange-500 mb-2">{product.price}</div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(product.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-green-500 text-sm">✓</span>
                  </div>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 mb-2">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Ajouter au panier
                  </Button>
                  <p className="text-xs text-gray-600">{product.compatible}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Big Brands */}
      <div className="bg-white p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">LES PLUS GRANDES MARQUES - LARGE CHOIX DISPONIBLE</h3>
        <div className="flex overflow-x-auto gap-4 pb-2">
          {bigBrands.map((brand, index) => (
            <div
              key={index}
              className="flex-shrink-0 bg-gray-100 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 min-w-[100px] text-center"
            >
              {brand}
            </div>
          ))}
        </div>
      </div>

      {/* Parts Catalog */}
      <div className="bg-white p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">CATALOGUE DE PIÈCES DÉTACHÉES - RECHERCHE PAR CATÉGORIE</h3>
        <div className="grid grid-cols-3 gap-4">
          {partCategories.map((category, index) => (
            <div
              key={index}
              className="text-center p-3 bg-gray-50 rounded-lg"
              onClick={() => handleFilterClick(category)}
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-16 object-contain mx-auto mb-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <p className="text-xs font-medium text-gray-700">{category.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-4 m-4 rounded-lg relative">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-white font-bold text-lg mb-2">GAGNEZ DES RÉDUCTIONS</div>
            <div className="text-white text-sm">VOULEZ-VOUS GAGNER DES RÉDUCTIONS?</div>
            <Button className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 mt-2">
              JOUER MAINTENANT
            </Button>
          </div>
          <div className="relative">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl">
              🎯
            </div>
            <div className="absolute -top-2 -right-2 text-yellow-300 text-xl">🪙</div>
            <div className="absolute -bottom-2 -left-2 text-yellow-300 text-xl">🪙</div>
          </div>
        </div>
        <button className="absolute top-2 right-2 text-white text-xl">✕</button>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="bg-gray-900 h-12 flex items-center justify-center">
        <div className="flex items-center gap-8">
          <div className="w-6 h-6 bg-white rounded"></div>
          <div className="w-6 h-6 bg-white rounded-full"></div>
          <div className="w-6 h-6 bg-white transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

export default AdminFiltersPage;
