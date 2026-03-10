import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Eye, 
  ArrowUpDown,
  Package,
  ArrowLeft,
  Trash2,
  Eraser,
} from 'lucide-react';
import { 
  getOffreHistorique,
  getPromotions,
  deleteOffreHistoriqueById,
  deleteOffreHistoriqueByPromo,
  deleteOffreHistoriqueBySlug,
  cleanupOffreHistoriqueOrphans,
} from '@/api/database';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const supportsCrud = false; // edit not supported; delete is enabled separately

  // Check admin access
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin' && parsedUser.is_admin !== true) {
        navigate('/login');
      } else {
        setUser(parsedUser);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [list, promotionsData] = await Promise.all([
        getOffreHistorique(),
        getPromotions(),
      ]);

      // Build maps for live promotion stock (promo_id -> promo, slug -> promo)
      const promotionsByPromoId = new Map<number, { stock?: number | null }>();
      const promotionsBySlug = new Map<string, { stock?: number | null }>();
      (promotionsData || []).forEach((promo: any) => {
        if (promo && typeof promo.id === 'number') {
          const stock = promo.stock ?? promo.stock_disponible ?? promo.stockDisponible ?? null;
          const stockNum = stock != null ? Number(stock) : null;
          promotionsByPromoId.set(promo.id, { stock: Number.isFinite(stockNum) ? stockNum : null });
          const slug = (promo.product_slug ?? promo.productSlug ?? promo.slug ?? '').trim().toLowerCase();
          if (slug) promotionsBySlug.set(slug, { stock: Number.isFinite(stockNum) ? stockNum : null });
        }
      });

      const getLiveStock = (item: any): number | null => {
        if (item.promo_id != null) {
          const p = promotionsByPromoId.get(Number(item.promo_id));
          if (p?.stock != null && Number.isFinite(p.stock)) return Number(p.stock);
        }
        const slugKey = String(item.slug || '').trim().toLowerCase();
        if (slugKey) {
          const p = promotionsBySlug.get(slugKey);
          if (p?.stock != null && Number.isFinite(p.stock)) return Number(p.stock);
        }
        return null;
      };

      const mappedProducts = list.map((p: any) => {
        const item = {
          id: p.id != null ? p.id : (p.slug || String(p.promo_id) || `item-${Math.random()}`),
          dbId: p.id != null ? Number(p.id) : null as number | null,
          slug: p.slug,
          name: p.name,
          reference: p.reference ?? null,
          price: p.price ?? null,
          quantity: p.quantity !== undefined && p.quantity !== null ? Number(p.quantity) : null,
          image: p.image ?? null,
          created_at: p.created_at ?? null,
          promo_id: p.promo_id != null ? Number(p.promo_id) : null,
        };
        const liveStock = getLiveStock({ promo_id: item.promo_id, slug: item.slug });
        return {
          ...item,
          stock_disponible: liveStock,
        };
      });

      setProducts(mappedProducts);
      setFilteredProducts(mappedProducts);
    } catch (err) {
      console.error('Error loading offre historique:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger l’offre historique",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch products on mount + whenever the list is updated elsewhere (Acha2 promo flow)
  useEffect(() => {
    if (!user) return;
    loadProducts();

    const onUpdated = () => loadProducts();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "offre-historique-updated") loadProducts();
    };
    window.addEventListener('offre-historique-updated', onUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('offre-historique-updated', onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [user]);

  // Search and filter
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = p.name?.toLowerCase().includes(query);
        const refMatch = p.reference?.toLowerCase().includes(query) || 
                        (Array.isArray(p.references) && p.references.some((r: string) => r.toLowerCase().includes(query)));
        return nameMatch || refMatch;
      });
    }

    // Sort by created_at (newest first) or price
    filtered.sort((a, b) => {
      if (a.created_at && b.created_at) {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? ta - tb : tb - ta;
      }
      const priceA = Number(a.price || 0);
      const priceB = Number(b.price || 0);
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortOrder]);

  const handleDelete = async (product: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée de l’offre historique ?')) {
      return;
    }

    try {
      if (product.dbId != null && Number.isFinite(product.dbId)) {
        await deleteOffreHistoriqueById(product.dbId);
      } else if (product.promo_id != null && Number.isFinite(product.promo_id)) {
        await deleteOffreHistoriqueByPromo(product.promo_id);
      } else if (product.slug) {
        await deleteOffreHistoriqueBySlug(product.slug);
      } else {
        toast({ title: "Erreur", description: "Impossible d’identifier l’entrée à supprimer", variant: "destructive" });
        return;
      }
      await loadProducts();
      toast({ title: "Succès", description: "Entrée supprimée avec succès" });
    } catch (err) {
      console.error('Error deleting from offre historique:', err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l’entrée",
        variant: "destructive",
      });
    }
  };

  const handleCleanupOrphans = async () => {
    if (!confirm('Supprimer toutes les entrées orphelines (promotions supprimées) ? Cette action est irréversible.')) {
      return;
    }

    setCleanupLoading(true);
    try {
      const result = await cleanupOffreHistoriqueOrphans();
      await loadProducts();
      toast({
        title: "Nettoyage terminé",
        description: result.deletedCount > 0
          ? `${result.deletedCount} entrée(s) orpheline(s) supprimée(s)`
          : "Aucune entrée orpheline trouvée",
      });
    } catch (err) {
      console.error('Error cleaning orphans:', err);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les orphelins",
        variant: "destructive",
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    if (!supportsCrud) return;
  };

  const handleSaveEdit = async () => {
    if (!supportsCrud) return;
  };

  const handleView = (product: any) => {
    const slug = String(product?.slug || product?.id || '').trim();
    if (!slug) return;
    const promoId = product?.promo_id;
    const qs = promoId != null && Number.isFinite(promoId) ? `?promoId=${promoId}` : '';
    navigate(`/acha2/${encodeURIComponent(slug)}${qs}`);
  };

  const formatReferences = (reference: string | string[] | null | undefined): string[] => {
    if (!reference) return [];
    if (Array.isArray(reference)) {
      return reference;
    }
    if (typeof reference === 'string') {
      return reference.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }
    return [];
  };

  const calculateFinalPrice = (price: number | string | undefined, promotion: number | undefined): number => {
    const basePrice = Number(price || 0);
    const promo = Number(promotion || 0);
    if (promo > 0) {
      return basePrice - (basePrice * (promo / 100));
    }
    return basePrice;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-[#6366F1]" />
                  <h1 className="text-xl font-bold text-gray-800">Offre historique</h1>
                </div>
              </div>
              <button
                onClick={handleCleanupOrphans}
                disabled={cleanupLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Supprimer les entrées orphelines (promotions déjà supprimées)"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">Nettoyer orphelins</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Search and Sort Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par nom ou référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Prix {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock disponible</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                      <p className="mt-4 text-gray-500">Chargement...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Aucun produit trouvé
                      </h3>
                      <p className="text-gray-500">
                        {searchQuery ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit n\'est encore ajouté au tableau de bord.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const createdDate = product.created_at 
                      ? new Date(product.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-';

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name || 'Product'}
                              className="w-[50px] h-[50px] object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-[50px] h-[50px] bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {product.name || 'Produit sans nom'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 max-w-xs truncate">
                            {product.reference || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {product.price === null || product.price === undefined
                              ? "-"
                              : `${Number(product.price).toFixed(3)} DT`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {product.stock_disponible != null && Number.isFinite(product.stock_disponible)
                              ? product.stock_disponible
                              : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {createdDate}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir le produit"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer de l’offre historique"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-gray-500">
                {searchQuery ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit n\'est encore ajouté au tableau de bord.'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name || 'Product'}
                      className="w-20 h-20 object-cover rounded-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {product.name || 'Produit sans nom'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Ref: {product.reference || '-'}
                    </p>
                    <p className="text-sm font-bold text-indigo-600 mt-1">
                      {product.price === null || product.price === undefined
                        ? "-"
                        : `${Number(product.price).toFixed(3)} DT`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Stock disponible:</span>
                  <span className="font-semibold">
                    {product.stock_disponible != null && Number.isFinite(product.stock_disponible)
                      ? product.stock_disponible
                      : "-"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleView(product)}
                    className="flex-1 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Voir
                  </button>
                  <button 
                    onClick={() => handleDelete(product)}
                    className="flex-1 p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminProducts;

