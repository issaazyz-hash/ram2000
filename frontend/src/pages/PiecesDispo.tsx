import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Package, Plus, Loader2, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FamilleSection from "@/components/home/FamilleSection";
import { useModelParts } from "@/features/piecesDispo/hooks/useModelParts";
import { AddPartModal } from "@/components/AddPartModal";

export default function PiecesDispo() {
  const { modelId } = useParams<{ modelId: string }>();
  const id = modelId ? Number(modelId) : NaN;
  const isValidId = !isNaN(id) && id > 0;
  
  const { 
    parts, 
    loading, 
    error, 
    isAdmin, 
    isSaving,
    deletingId,
    addPart, 
    removePart 
  } = useModelParts(isValidId ? String(id) : undefined);

  // Save breadcrumb data on page load
  useEffect(() => {
    localStorage.setItem("breadcrumb_pieces", "Pièces disponibles");
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddPart = async (data: {
    name: string;
    reference?: string;
    description?: string;
    price?: number;
    image_url?: string;
    category?: string;
  }) => {
    const result = await addPart(data);
    if (result.success) {
      showNotification('Pièce ajoutée avec succès !', 'success');
      return true;
    } else {
      showNotification(result.error || 'Erreur lors de l\'ajout', 'error');
      return false;
    }
  };

  const handleDeletePart = async (partId: number) => {
    const result = await removePart(partId);
    if (result.success) {
      showNotification('Pièce supprimée avec succès !', 'success');
    } else {
      showNotification(result.error || 'Erreur lors de la suppression', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] overflow-x-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header />
      </div>

      {/* Familles des pièces Section - Accordion Grid */}
      {/* Pass modelId only if valid - this enables model-specific filtering */}
      {/* If modelId is invalid or undefined, FamilleSection shows all familles (backward compatible) */}
      <FamilleSection modelId={isValidId ? id : undefined} />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50
                      px-4 py-3 rounded-xl shadow-lg flex items-center gap-3
                      animate-[slideDown_0.3s_ease-out]
                      ${notification.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                      }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Invalid Model ID Error */}
      {!isValidId && (
        <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">
              ID de modèle invalide. Veuillez sélectionner un modèle valide.
            </p>
          </div>
        </section>
      )}

      {/* Parts Section - Only shows if there are parts or admin wants to add */}
      {isValidId && (parts.length > 0 || isAdmin || loading || error) && (
        <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8">
          {/* Admin Add Button */}
          {isAdmin && !loading && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5
                           bg-orange-500 hover:bg-orange-600
                           text-white font-semibold text-sm
                           rounded-lg shadow-sm
                           transition-all duration-200
                           active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une pièce</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
            </div>
          )}

          {/* Parts Grid */}
          {!loading && !error && parts.length > 0 && (
            <>
              {/* Results count */}
              <p className="text-xs text-gray-500 mb-4">
                {parts.length} pièce{parts.length > 1 ? 's' : ''} disponible{parts.length > 1 ? 's' : ''}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {parts.map((part) => (
                  <article
                    key={part.id}
                    className="group relative bg-white rounded-xl overflow-hidden
                               border border-gray-200 shadow-sm
                               transition-all duration-300 ease-out
                               hover:shadow-md hover:border-gray-300"
                  >
                    {/* Admin Delete Button */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        disabled={deletingId === part.id}
                        className="absolute top-2 right-2 z-20 p-2
                                   bg-white border border-gray-200
                                   rounded-full shadow-sm
                                   text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50
                                   transition-all duration-200
                                   opacity-0 group-hover:opacity-100 focus:opacity-100
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Supprimer"
                      >
                        {deletingId === part.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Image */}
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt={part.name}
                        className="w-full h-36 md:h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-36 md:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-base text-gray-900 mb-1">
                        {part.name}
                      </h3>

                      {part.reference && (
                        <p className="text-xs text-gray-400 mb-1">
                          Réf: {part.reference}
                        </p>
                      )}

                      {part.category && (
                        <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded mb-2">
                          {part.category}
                        </span>
                      )}

                      {part.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {part.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {part.price != null ? (
                          <p className="font-bold text-lg text-orange-500">
                            {part.price.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            DT
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">Prix sur demande</p>
                        )}

                        {part.in_stock !== false ? (
                          <span className="text-xs text-green-600 font-medium">En stock</span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Rupture</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Spacer to push footer down when no parts */}
      {!loading && !error && parts.length === 0 && !isAdmin && (
        <div className="flex-1" />
      )}

      {/* Footer */}
      <Footer />

      {/* Add Part Modal */}
      {isAdmin && (
        <AddPartModal
          isOpen={isAddModalOpen}
          isSaving={isSaving}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddPart}
        />
      )}

      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
