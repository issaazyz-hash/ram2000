import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, ChevronRight } from 'lucide-react';

interface VehicleCardProps {
  id: string | number;
  name: string;
  brand: string;
  model: string;
  description?: string;
  image_url?: string;
  isAdmin?: boolean;
  isDeleting?: boolean;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function VehicleCard({
  id,
  name,
  brand,
  model,
  description,
  image_url,
  isAdmin = false,
  isDeleting = false,
  onDelete,
}: VehicleCardProps) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleViewDetails = () => {
    // Removed: Navigation to catalogue2 page - page deleted
    // Save selected marque (brand) to localStorage for order tracking
    // localStorage.setItem("selected_marque", brand || name);
    // Save for breadcrumb navigation
    // localStorage.setItem("selectedBrand", brand || name);
    // localStorage.setItem("breadcrumb_catalogue", "Catalogue");
    // navigate(`/catalogue2/${encodeURIComponent(brand || name)}`);
    console.warn('Catalogue2 page has been removed');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete(String(id));
    }
    setShowConfirm(false);
  };

  // Determine image source
  const imageSrc = image_url?.startsWith('data:')
    ? image_url
    : image_url
      ? `/cars.logo/${image_url}`
      : null;

  return (
    <>
      <article
        className="group relative bg-white rounded-xl overflow-hidden
                   border border-gray-200 
                   shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                   transition-all duration-300 ease-out
                   md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                   md:hover:scale-[1.02] md:hover:-translate-y-1"
      >
        {/* Admin Delete Button */}
        {isAdmin && onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute top-2 right-2 z-20 p-2
                       bg-white border border-gray-200
                       rounded-full shadow-sm
                       text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50
                       transition-all duration-200
                       opacity-0 group-hover:opacity-100 focus:opacity-100
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Supprimer"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Image Container */}
        <div className="relative w-full h-40 sm:h-48 md:h-52 lg:h-56 overflow-hidden bg-gray-50">
          {imageSrc && !imageError ? (
            <img
              src={imageSrc}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 ease-out
                         md:group-hover:scale-105"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-5xl md:text-6xl font-black text-gray-300 select-none">
                {brand?.charAt(0) || name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          {/* Vehicle Name */}
          <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight mb-1 text-center md:text-left">
            {name || `${brand} ${model}`}
          </h3>

          {/* Brand + Model */}
          <p className="text-sm font-medium text-orange-500 mb-2 text-center md:text-left">
            {brand} • {model}
          </p>

          {/* Description */}
          {description && (
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 text-center md:text-left">
              {description}
            </p>
          )}

          {/* CTA Button */}
          <button
            onClick={handleViewDetails}
            className="w-full py-2.5 md:py-3 px-4
                       bg-orange-500 hover:bg-orange-600
                       text-white font-semibold text-sm
                       rounded-lg
                       transition-all duration-200
                       active:scale-[0.98]
                       flex items-center justify-center gap-2"
          >
            <span>Voir détails</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </article>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
              Confirmer la suppression
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Voulez-vous vraiment supprimer <strong>{name}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-gray-200 
                           text-gray-700 font-medium rounded-lg
                           hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600
                           text-white font-semibold rounded-lg
                           transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VehicleCard;

