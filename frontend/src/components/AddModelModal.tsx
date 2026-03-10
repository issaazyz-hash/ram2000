import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, Car, Loader2, AlertCircle } from 'lucide-react';

interface AddModelModalProps {
  isOpen: boolean;
  isSaving: boolean;
  marque: string;
  onClose: () => void;
  onSave: (data: { model: string; description: string; image: string }) => Promise<boolean>;
}

export function AddModelModal({ isOpen, isSaving, marque, onClose, onSave }: AddModelModalProps) {
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setModel('');
        setDescription('');
        setImage('');
        setImagePreview('');
        setError('');
        setTouched({});
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Cannot create canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('L\'image est trop volumineuse (maximum 10MB)');
      return;
    }

    try {
      const compressedImage = await compressImage(file, 800, 0.7);
      setImage(compressedImage);
      setImagePreview(compressedImage);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement de l\'image');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ model: true, image: true });

    if (!model.trim()) {
      setError('Le nom du modèle est requis');
      return;
    }

    if (!image) {
      setError('Une image est requise');
      return;
    }

    try {
      const success = await onSave({
        model: model.trim(),
        description: description.trim(),
        image,
      });
      
      if (success) {
        setModel('');
        setDescription('');
        setImage('');
        setImagePreview('');
        setError('');
        setTouched({});
        onClose();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    
    setModel('');
    setDescription('');
    setImage('');
    setImagePreview('');
    setError('');
    setTouched({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl
                   shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Car className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Ajouter un modèle
              </h2>
              <p className="text-xs text-gray-500">Pour {marque}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 
                       hover:bg-gray-100 rounded-lg transition-all 
                       disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form id="add-model-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom du modèle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => { setModel(e.target.value); setError(''); }}
                onBlur={() => setTouched(prev => ({ ...prev, model: true }))}
                placeholder="Ex: RS7, Q8, A6..."
                className={`w-full px-4 py-2.5 bg-white 
                           border rounded-lg text-gray-900
                           placeholder-gray-400 text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                           transition-all
                           ${touched.model && !model.trim() ? 'border-red-300' : 'border-gray-200'}`}
                disabled={isSaving}
              />
              {touched.model && !model.trim() && (
                <p className="mt-1 text-xs text-red-500">Ce champ est requis</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du modèle..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white 
                           border border-gray-200 rounded-lg 
                           text-gray-900 placeholder-gray-400 text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                           transition-all resize-none"
                disabled={isSaving}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="model-image-upload"
                disabled={isSaving}
              />
              <label
                htmlFor="model-image-upload"
                className={`flex flex-col items-center justify-center w-full h-32 sm:h-36 
                           border-2 border-dashed rounded-lg cursor-pointer transition-all
                           ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-400 hover:bg-orange-50/30'}
                           ${touched.image && !image ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-gray-50'}`}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-contain rounded-lg p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Cliquez pour télécharger
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      JPG, PNG jusqu'à 10MB
                    </span>
                  </div>
                )}
              </label>
              {touched.image && !image && (
                <p className="mt-1 text-xs text-red-500">Une image est requise</p>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 border border-gray-200 
                       text-gray-700 font-medium rounded-lg 
                       hover:bg-gray-50 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="add-model-form"
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 
                       text-white font-semibold rounded-lg 
                       shadow-sm
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                       flex items-center justify-center gap-2
                       text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ajout...</span>
              </>
            ) : (
              <span>Ajouter le modèle</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddModelModal;

