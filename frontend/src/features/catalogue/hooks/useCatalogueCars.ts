import { useState, useEffect, useCallback } from 'react';
import { getVehicles, createVehicle, deleteVehicle, VehicleData } from '@/api/database';
import { CatalogueCarData, NewCarFormData } from '../types/catalogue';

/**
 * Convert VehicleData from API to CatalogueCarData for the UI
 */
const mapVehicleToCar = (vehicle: VehicleData): CatalogueCarData => ({
  id: vehicle.id?.toString() || '',
  name: vehicle.name || '',
  brand: vehicle.brand || '',
  model: vehicle.model || '',
  description: vehicle.description || '',
  price: '', // No price in vehicles table
  image: vehicle.image_url || '',
});

/**
 * Custom hook for managing catalogue vehicles
 * Uses the /api/vehicles endpoint directly - NO localStorage fallback
 */
export function useCatalogueCars() {
  const [cars, setCars] = useState<CatalogueCarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Check admin status from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = user?.role?.toLowerCase() || '';
        const admin = role === 'admin' || user?.is_admin === true || user?.isAdmin === true;
        setIsAdmin(admin);
        console.log('✅ Admin status:', admin);
      } catch (e) {
        console.error('Error parsing user:', e);
        setIsAdmin(false);
      }
    }
  }, []);

  /**
   * Fetch all vehicles from the API
   */
  const fetchCars = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching vehicles from API...');
      const vehicles = await getVehicles();
      const mappedCars = vehicles.map(mapVehicleToCar);
      setCars(mappedCars);
      console.log('✅ Loaded', mappedCars.length, 'vehicles from API');
    } catch (err) {
      console.error('❌ Error fetching vehicles:', err);
      setError('Erreur lors du chargement des véhicules');
      setCars([]); // Set empty array on error - NO localStorage fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  /**
   * Compress image before sending to API
   */
  const compressImage = useCallback((
    dataUrl: string, 
    maxWidth: number = 600, 
    maxHeight: number = 600, 
    quality: number = 0.6
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  /**
   * Add a new vehicle via API
   */
  const addCar = useCallback(async (formData: NewCarFormData): Promise<{ success: boolean; error?: string }> => {
    if (isSaving) return { success: false, error: 'Sauvegarde en cours...' };
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Compress image if it's a data URL
      let finalImage = formData.image;
      if (formData.image && formData.image.startsWith('data:image')) {
        try {
          finalImage = await compressImage(formData.image, 500, 500, 0.5);
          console.log('🖼️ Image compressed successfully');
        } catch (compressErr) {
          console.warn('⚠️ Image compression failed, using original');
        }
      }

      // Create vehicle via API
      console.log('📤 Creating vehicle via API...');
      const newVehicle = await createVehicle({
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        description: formData.description?.trim() || '',
        image_url: finalImage || null,
      });
      
      console.log('✅ Vehicle created:', newVehicle.name);
      
      // Update local state with the new vehicle
      const newCar: CatalogueCarData = mapVehicleToCar(newVehicle);
      setCars(prev => [newCar, ...prev]);
      
      return { success: true };
      
    } catch (err: unknown) {
      console.error('❌ Error adding vehicle:', err);
      
      const errorObj = err as { message?: string };
      const errorMessage = errorObj?.message || 'Erreur lors de l\'ajout du véhicule';
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, compressImage]);

  /**
   * Delete a vehicle via API
   */
  const deleteCar = useCallback(async (carId: string): Promise<{ success: boolean; error?: string }> => {
    if (!carId) {
      return { success: false, error: 'ID du véhicule manquant' };
    }
    
    if (isDeleting) {
      return { success: false, error: 'Suppression en cours...' };
    }

    setIsDeleting(carId);
    setError(null);

    try {
      console.log('🗑️ Deleting vehicle via API:', carId);
      await deleteVehicle(carId);
      console.log('✅ Vehicle deleted from API:', carId);

      // Remove from local state
      setCars(prev => prev.filter(car => car.id !== carId));

      return { success: true };

    } catch (err: unknown) {
      console.error('❌ Error deleting vehicle:', err);
      
      const errorObj = err as { message?: string };
      const errorMessage = errorObj?.message || 'Erreur lors de la suppression du véhicule';
      
      setError(errorMessage);
      return { success: false, error: errorMessage };

    } finally {
      setIsDeleting(null);
    }
  }, [isDeleting]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Open/close modal
  const openAddModal = useCallback(() => {
    setError(null);
    setIsAddModalOpen(true);
  }, []);
  
  const closeAddModal = useCallback(() => {
    setError(null);
    setIsAddModalOpen(false);
  }, []);

  return {
    // Data
    cars,
    isLoading,
    error,
    
    // Admin
    isAdmin,
    isAddModalOpen,
    isSaving,
    isDeleting,
    
    // Actions
    fetchCars,
    addCar,
    deleteCar,
    openAddModal,
    closeAddModal,
    clearError,
  };
}
