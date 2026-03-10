import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { CatalogueCarData } from '../types/catalogue';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface CarCardProps {
  car: CatalogueCarData;
  index: number;
  isAdmin?: boolean;
  isDeleting?: boolean;
  onDelete?: (carId: string) => Promise<{ success: boolean; error?: string }>;
}

export function CarCard({ car, index, isAdmin = false, isDeleting = false, onDelete }: CarCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleViewDetails = () => {
    navigate(`/brand/${encodeURIComponent(car.brand || car.name || '')}/parts`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete && car.id) {
      const result = await onDelete(car.id);
      if (result.success) {
        setShowDeleteDialog(false);
      }
      return result;
    }
    return { success: false, error: 'Fonction de suppression non disponible' };
  };

  // Determine image source
  const imageSrc = car.image?.startsWith('data:') 
    ? car.image 
    : car.image 
      ? `/cars.logo/${car.image}` 
      : null;

  // Calculate animation delay in CSS variable
  const animationDelayMs = index * 80;

  return (
    <>
      <article
        className={`car-card-animate group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden 
                   border border-zinc-200 dark:border-zinc-800
                   shadow-sm hover:shadow-xl dark:shadow-zinc-900/50
                   transition-all duration-300 ease-out
                   hover:scale-[1.02] hover:-translate-y-1
                   ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
        style={{
          '--animation-delay': `${animationDelayMs}ms`,
        } as React.CSSProperties}
      >
        {/* Image Container */}
        <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={car.name || 'Vehicle'}
              className="w-full h-full object-contain p-6 sm:p-8 transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Fallback display */}
          <div 
            className={`absolute inset-0 flex items-center justify-center ${imageSrc ? 'hidden' : 'flex'}`}
          >
            <span className="text-5xl sm:text-6xl font-black text-zinc-300 dark:text-zinc-700">
              {car.brand?.charAt(0) || car.name?.charAt(0) || '?'}
            </span>
          </div>

          {/* Admin Delete Button */}
          {isAdmin && onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="absolute top-3 right-3 p-2 
                         bg-black/40 hover:bg-red-600 
                         backdrop-blur-sm rounded-full
                         text-white/80 hover:text-white
                         transition-all duration-200
                         opacity-0 group-hover:opacity-100
                         focus:opacity-100
                         disabled:opacity-50 disabled:cursor-not-allowed
                         z-10"
              aria-label="Supprimer le véhicule"
              title="Supprimer"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Badge */}
          {car.discount && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-md">
              {car.discount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {/* Brand & Model */}
          <div className="mb-2">
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
              {car.brand || car.name || 'Véhicule'}
            </h3>
            {car.model && (
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                {car.model}
              </p>
            )}
          </div>

          {/* Description */}
          {car.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3 line-clamp-2">
              {car.description}
            </p>
          )}

          {/* Price */}
          {car.price && (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {car.price}
              </span>
              {car.originalPrice && (
                <span className="text-sm text-zinc-400 line-through">
                  {car.originalPrice}
                </span>
              )}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleViewDetails}
            className="w-full py-3 px-4 bg-zinc-900 dark:bg-orange-600 
                       hover:bg-zinc-800 dark:hover:bg-orange-500
                       text-white font-semibold text-sm rounded-xl
                       transition-all duration-200
                       active:scale-[0.98]
                       flex items-center justify-center gap-2"
          >
            <span>Voir détails</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </article>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        carName={car.brand || car.name || 'ce véhicule'}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Scoped animation styles using CSS class */}
      <style>{`
        @keyframes carCardFadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .car-card-animate {
          animation-name: carCardFadeInUp;
          animation-duration: 0.5s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          animation-delay: var(--animation-delay, 0ms);
          opacity: 0;
        }
      `}</style>
    </>
  );
}
