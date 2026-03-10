import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Droplets, Trash2 } from 'lucide-react';
import { resolveImageUrl } from '@/utils/apiConfig';
import { getHuileEauAdditif, removeHuileEauAdditifItem, type HuileEauAdditifItem } from '@/api/database';
import { useToast } from '@/hooks/use-toast';

const fmt = (v: number | null | undefined): string =>
  v != null && Number.isFinite(v) ? String(v) : '—';

const fmtPrice = (v: number | null | undefined): string =>
  v != null && Number.isFinite(v) ? v.toFixed(2) : '—';

const HuileEauAdditifPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ role?: string; is_admin?: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Huile & Eau Additif | Admin | RAM Auto Motors';
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.role !== 'admin' && parsed.is_admin !== true) {
          navigate('/login');
        } else {
          setUser(parsed);
        }
      } catch {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['huile_eau_additif'],
    queryFn: getHuileEauAdditif,
    enabled: !!user,
  });

  const handleDelete = async (item: HuileEauAdditifItem) => {
    if (!window.confirm('Supprimer cet élément de Huile & Eau Additif ?')) return;
    setDeletingId(item.id);
    try {
      await removeHuileEauAdditifItem(item.id);
      await queryClient.invalidateQueries({ queryKey: ['huile_eau_additif'] });
      toast({ title: 'Succès', description: 'Élément supprimé' });
    } catch (err) {
      console.error('Error deleting huile_eau_additif item:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : "Impossible de supprimer l'élément",
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

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
              <Droplets className="w-6 h-6 text-[#6366F1]" />
              <h1 className="text-xl font-bold text-gray-800">Huile & Eau Additif</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" />
            <p className="mt-4 text-gray-500">Chargement...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Droplets className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun élément</h3>
            <p className="text-gray-500">
              Les produits ajoutés depuis les pages Cat3 (bouton « Add to Huile & Eau Additif ») apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const imageUrl = item.image ? resolveImageUrl(item.image) : '/pp.jpg';
              const stock = item.stock ?? 0;
              const seuil = item.alertThreshold ?? 0;
              const isRupture = stock <= 0;
              const isStockFaible = !isRupture && seuil != null && Number.isFinite(seuil) && stock <= seuil;
              const prixNeveux = item.prixNeveux ?? null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="flex items-start gap-3 p-4 border-b border-gray-100">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/pp.jpg'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                        {item.title || '—'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Réf: {item.reference || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {prixNeveux != null && Number.isFinite(prixNeveux) && (
                        <span className="text-lg font-bold text-purple-600">
                          {fmtPrice(prixNeveux)} DT
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                        disabled={deletingId === item.id}
                        title="Supprimer"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === item.id ? (
                          <span className="inline-block w-5 h-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Stock</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-xs text-gray-500">Stock disponible:</span>
                      <span className="text-sm font-semibold text-gray-900">{fmt(item.stock)}</span>
                      <span className="text-xs text-gray-500">Seuil d'alerte:</span>
                      <span className="text-sm font-semibold text-gray-900">{fmt(item.alertThreshold)}</span>
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

                  <div className="px-4 py-3 flex-1">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tarif</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><span className="text-gray-500">Prix achat brut</span><br /><span className="font-semibold">{fmtPrice(item.prixAchatBrut)} DT</span></div>
                      <div><span className="text-gray-500">Remise (%)</span><br /><span className="font-semibold">{fmt(item.remiseAchat)}%</span></div>
                      <div><span className="text-gray-500">Net HTVA</span><br /><span className="font-semibold">{fmtPrice(item.netAchatHTVA)} DT</span></div>
                      <div><span className="text-gray-500">TVA (%)</span><br /><span className="font-semibold">{fmt(item.tva)}%</span></div>
                      <div><span className="text-gray-500">Net TTC</span><br /><span className="font-semibold">{fmtPrice(item.netAchatTTC)} DT</span></div>
                      <div><span className="text-gray-500">Marge (%)</span><br /><span className="font-semibold">{fmt(item.marge)}%</span></div>
                      <div className="col-span-2"><span className="text-gray-500">Prix neveux</span><br /><span className="font-semibold text-purple-600">{fmtPrice(item.prixNeveux)} DT</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {items.length} {items.length === 1 ? 'élément' : 'éléments'}
          </div>
        )}
      </main>
    </div>
  );
};

export default HuileEauAdditifPage;
