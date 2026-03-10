import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, Car, Loader2, AlertCircle } from 'lucide-react';
import { NewCarFormData } from '../types/catalogue';

interface AddCarModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: NewCarFormData) => Promise<boolean>;
}

const initialFormState: NewCarFormData = {
  name: '',
  brand: '',
  model: '',
  description: '',
  image: '',
};

export function AddCarModal({ isOpen, isSaving, onClose, onSave }: AddCarModalProps) {
  const [formData, setFormData] = useState<NewCarFormData>({ ...initialFormState });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData({ ...initialFormState });
        setImagePreview('');
        setError('');
        setTouched({});
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ?? '' }));
    setError('');
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image est trop volumineuse (maximum 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = (event.target?.result as string) ?? '';
      setFormData(prev => ({ ...prev, image: dataUrl }));
      setImagePreview(dataUrl);
      setError('');
    };
    reader.onerror = () => {
      setError('Erreur lors du chargement de l\'image');
    };
    reader.readAsDataURL(file);
  }, []);

  const validateForm = (): boolean => {
    const name = formData.name ?? '';
    const brand = formData.brand ?? '';
    const model = formData.model ?? '';
    const image = formData.image ?? '';

    if (!name.trim()) {
      setError('Le nom du véhicule est requis');
      return false;
    }
    if (!brand.trim()) {
      setError('La marque est requise');
      return false;
    }
    if (!model.trim()) {
      setError('Le modèle est requis');
      return false;
    }
    if (!image) {
      setError('Une image est requise');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({
      name: true,
      brand: true,
      model: true,
      image: true,
    });

    if (!validateForm()) return;

    try {
      const success = await onSave(formData);
      
      if (success) {
        setFormData({ ...initialFormState });
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
    
    setFormData({ ...initialFormState });
    setImagePreview('');
    setError('');
    setTouched({});
    onClose();
  };

  const getFieldError = (field: string, required: boolean = true): string | null => {
    if (!touched[field]) return null;
    const value = formData[field as keyof NewCarFormData] ?? '';
    if (required && !value.trim()) {
      return 'Ce champ est requis';
    }
    return null;
  };

  if (!isOpen) return null;

  const nameValue = formData.name ?? '';
  const brandValue = formData.brand ?? '';
  const modelValue = formData.model ?? '';
  const descriptionValue = formData.description ?? '';
  const imageValue = formData.image ?? '';

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
            <h2 className="text-lg font-bold text-gray-900">
              Ajouter un véhicule
            </h2>
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

          <form id="add-car-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom du véhicule <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={nameValue}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                placeholder="Ex: Audi R8 V10 Plus"
                className={`w-full px-4 py-2.5 bg-white 
                           border rounded-lg text-gray-900
                           placeholder-gray-400 text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                           transition-all
                           ${getFieldError('name') 
                             ? 'border-red-300' 
                             : 'border-gray-200'
                           }`}
                disabled={isSaving}
              />
              {getFieldError('name') && (
                <p className="mt-1 text-xs text-red-500">{getFieldError('name')}</p>
              )}
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Marque <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="brand"
                  value={brandValue}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('brand')}
                  placeholder="Ex: Audi"
                  className={`w-full px-4 py-2.5 bg-white 
                             border rounded-lg text-gray-900
                             placeholder-gray-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                             transition-all
                             ${getFieldError('brand') 
                               ? 'border-red-300' 
                               : 'border-gray-200'
                             }`}
                  disabled={isSaving}
                />
                {getFieldError('brand') && (
                  <p className="mt-1 text-xs text-red-500">{getFieldError('brand')}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Modèle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="model"
                  value={modelValue}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('model')}
                  placeholder="Ex: R8 V10 Plus"
                  className={`w-full px-4 py-2.5 bg-white 
                             border rounded-lg text-gray-900
                             placeholder-gray-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                             transition-all
                             ${getFieldError('model') 
                               ? 'border-red-300' 
                               : 'border-gray-200'
                             }`}
                  disabled={isSaving}
                />
                {getFieldError('model') && (
                  <p className="mt-1 text-xs text-red-500">{getFieldError('model')}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={descriptionValue}
                onChange={handleInputChange}
                placeholder="Description du véhicule..."
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
                id="car-image-upload"
                disabled={isSaving}
              />
              <label
                htmlFor="car-image-upload"
                className={`flex flex-col items-center justify-center w-full h-32 sm:h-36 
                           border-2 border-dashed rounded-lg cursor-pointer transition-all
                           ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-400 hover:bg-orange-50/30'}
                           ${touched.image && !imageValue 
                             ? 'border-red-300 bg-red-50/30' 
                             : 'border-gray-200 bg-gray-50'
                           }`}
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
                      JPG, PNG jusqu'à 5MB
                    </span>
                  </div>
                )}
              </label>
              {touched.image && !imageValue && (
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
            form="add-car-form"
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
                <span>Création...</span>
              </>
            ) : (
              <span>Créer le véhicule</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
