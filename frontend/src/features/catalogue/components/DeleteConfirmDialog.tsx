import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  carName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  carName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 
                     hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all 
                     disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white text-center mb-2">
          Supprimer ce véhicule ?
        </h3>

        {/* Message */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-6">
          Êtes-vous sûr de vouloir supprimer{' '}
          <span className="font-semibold text-zinc-900 dark:text-white">{carName}</span> ?
          <br />
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Cette action est irréversible.
          </span>
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 
                       text-zinc-700 dark:text-zinc-300 font-medium rounded-xl 
                       hover:bg-zinc-50 dark:hover:bg-zinc-800 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 
                       text-white font-semibold rounded-xl 
                       shadow-md shadow-red-500/20 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                       flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Suppression...</span>
              </>
            ) : (
              <span>Supprimer</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

