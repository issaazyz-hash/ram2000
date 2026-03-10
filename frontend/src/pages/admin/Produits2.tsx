import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  Package,
  Trash2,
  Star,
} from 'lucide-react';
import { resolveImageUrl, deleteAdminDashboardProduct, deleteAdminDashboardProductBySlug } from '@/api/database';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { useToast } from '@/hooks/use-toast';

interface DashboardProduct {
  id?: number | null;
  slug: string;
  name: string;
  image: string | null;
  reference: string | null;
  price: number;
  quantity: number;
  stock_disponible: number | null;
  seuilAlerte?: number;
  category_slug?: string | null;
  categoryName?: string | null;
  rating?: number | null;
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
  prix_vente?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  compatible_vehicles_count?: number;
  champ1?: string | null;
  champ2?: string | null;
  champ3?: string | null;
  champ4?: string | null;
  champ5?: string | null;
  champ6?: string | null;
}

const fmt = (v: number | null | undefined): string =>
  v != null && Number.isFinite(v) ? String(v) : '—';

const fmtPrice = (v: number | null | undefined): string =>
  v != null && Number.isFinite(v) ? v.toFixed(2) : '—';

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  } catch {
    return '—';
  }
};

const Produits2: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

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

  const fetchDashboardProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/admin/dashboard-products`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load dashboard products');
      const result = await response.json();
      if (result.success && Array.isArray(result.products)) {
        const mappedProducts: DashboardProduct[] = result.products.map((p: any) => ({
          id: p.id != null ? Number(p.id) : null,
          slug: p.slug,
          name: p.name,
          image: p.image ?? null,
          reference: p.reference ?? null,
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          quantity: p.quantity ?? 0,
          stock_disponible: p.stock_disponible ?? p.stockDisponible ?? null,
          seuilAlerte: p.seuilAlerte ?? 0,
          category_slug: p.category_slug ?? null,
          categoryName: p.categoryName ?? null,
          rating: p.rating ?? null,
          prix_achat_brut: p.prix_achat_brut != null ? parseFloat(p.prix_achat_brut) : null,
          remise_achat_percent: p.remise_achat_percent != null ? parseFloat(p.remise_achat_percent) : null,
          net_achat_htva: p.net_achat_htva != null ? parseFloat(p.net_achat_htva) : null,
          tva_percent: p.tva_percent != null ? parseFloat(p.tva_percent) : null,
          net_achat_ttc: p.net_achat_ttc != null ? parseFloat(p.net_achat_ttc) : null,
          marge_percent: p.marge_percent != null ? parseFloat(p.marge_percent) : null,
          prix_vente: p.prix_vente != null ? parseFloat(p.prix_vente) : p.prix_neveux != null ? parseFloat(p.prix_neveux) : null,
          created_at: p.created_at ?? null,
          updated_at: p.updated_at ?? null,
          compatible_vehicles_count: p.compatible_vehicles_count ?? 0,
          champ1: p.champ1 ?? null,
          champ2: p.champ2 ?? null,
          champ3: p.champ3 ?? null,
          champ4: p.champ4 ?? null,
          champ5: p.champ5 ?? null,
          champ6: p.champ6 ?? null,
        }));
        setProducts(mappedProducts);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading dashboard products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardProducts();
  }, [user]);

  const handleDelete = async (product: DashboardProduct) => {
    if (!window.confirm('Supprimer ce produit de Produits 2 ?')) return;
    const key = product.id ?? product.slug;
    setDeletingId(key);
    try {
      if (product.id != null && Number.isFinite(product.id)) {
        await deleteAdminDashboardProduct(product.id);
      } else {
        await deleteAdminDashboardProductBySlug(product.slug);
      }
      setProducts((prev) => prev.filter((p) => (p.id ?? p.slug) !== key));
      toast({ title: 'Succès', description: 'Produit supprimé' });
    } catch (err) {
      console.error('Error deleting product:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de supprimer le produit',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q) ||
      p.categoryName?.toLowerCase().includes(q)
    );
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
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
              <h1 className="text-xl font-bold text-gray-800">Dashboard Produits</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" />
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit disponible'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const imageUrl = product.image ? resolveImageUrl(product.image) : '/pp.jpg';
              const stock = product.stock_disponible ?? 0;
              const seuil = product.seuilAlerte ?? 0;
              const isRupture = stock <= 0;
              const isStockFaible = !isRupture && stock <= seuil;
              const prixVente = product.prix_vente ?? product.price ?? 0;

              return (
                <div
                  key={product.slug}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 sm:gap-4 p-4 border-b border-gray-100">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/pp.jpg'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2">
                        {product.name || '—'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                        Réf: {product.reference || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-purple-600">
                        {fmtPrice(prixVente)} DT
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                        disabled={deletingId === (product.id ?? product.slug)}
                        title="Supprimer"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === (product.id ?? product.slug) ? (
                          <span className="inline-block w-5 h-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Section A — Stock */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Stock</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-xs text-gray-500">Stock disponible:</span>
                      <span className="text-sm font-semibold text-gray-900">{fmt(stock)}</span>
                      <span className="text-xs text-gray-500">Seuil d'alerte:</span>
                      <span className="text-sm font-semibold text-gray-900">{fmt(seuil)}</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isRupture
                            ? 'bg-red-100 text-red-800'
                            : isStockFaible
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isRupture ? 'Rupture' : isStockFaible ? 'Stock faible' : 'OK'}
                      </span>
                    </div>
                  </div>

                  {/* Section B — Tarification */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tarification</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                      <div><span className="text-gray-500">Prix Achat Brut</span><br /><span className="font-semibold">{fmtPrice(product.prix_achat_brut)} DT</span></div>
                      <div><span className="text-gray-500">Remise Achat (%)</span><br /><span className="font-semibold">{fmt(product.remise_achat_percent)}%</span></div>
                      <div><span className="text-gray-500">Net Achat HTVA</span><br /><span className="font-semibold">{fmtPrice(product.net_achat_htva)} DT</span></div>
                      <div><span className="text-gray-500">TVA (%)</span><br /><span className="font-semibold">{fmt(product.tva_percent)}%</span></div>
                      <div><span className="text-gray-500">Net Achat TTC</span><br /><span className="font-semibold">{fmtPrice(product.net_achat_ttc)} DT</span></div>
                      <div><span className="text-gray-500">Marge (%)</span><br /><span className="font-semibold">{fmt(product.marge_percent)}%</span></div>
                      <div><span className="text-gray-500">Prix vente</span><br /><span className="font-semibold text-purple-600">{fmtPrice(prixVente)} DT</span></div>
                    </div>
                  </div>

                  {/* Section C — Meta */}
                  <div className="px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold">{product.rating != null ? product.rating : '—'}/5</span>
                    </div>
                    <span className="text-gray-500">Créé: {fmtDate(product.created_at)}</span>
                    {product.categoryName && (
                      <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{product.categoryName}</span>
                    )}
                    {product.compatible_vehicles_count != null && product.compatible_vehicles_count > 0 && (
                      <span className="text-gray-600 bg-blue-50 px-2 py-0.5 rounded">
                        Compatibilité: {product.compatible_vehicles_count} modèle(s)
                      </span>
                    )}
                  </div>

                  {/* Gestion (champ1-6) */}
                  {[product.champ1, product.champ2, product.champ3, product.champ4, product.champ5, product.champ6].some(Boolean) && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Gestion</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Champ 1', v: product.champ1 },
                          { label: 'Champ 2', v: product.champ2 },
                          { label: 'Champ 3', v: product.champ3 },
                          { label: 'Champ 4', v: product.champ4 },
                          { label: 'Champ 5', v: product.champ5 },
                          { label: 'Champ 6', v: product.champ6 },
                        ]
                          .filter((x) => x.v && String(x.v).trim())
                          .map((x) => (
                            <span key={x.label} className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700 max-w-[160px] truncate">
                              <span className="font-semibold mr-1">{x.label}:</span>
                              {x.v}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!loading && filteredProducts.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produit trouvé' : 'produits trouvés'}
          </div>
        )}
      </main>
    </div>
  );
};

export default Produits2;
