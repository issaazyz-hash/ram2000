import React, { useState } from 'react';
import { Plus, Search, Loader2, Car, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useCatalogueCars } from '../hooks/useCatalogueCars';
import { VehicleCard } from '@/components/VehicleCard';
import { AddCarModal } from './AddCarModal';

export function CatalogueCarsSection() {
  const {
    cars,
    isLoading,
    error,
    isAdmin,
    isAddModalOpen,
    isSaving,
    isDeleting,
    addCar,
    deleteCar,
    openAddModal,
    closeAddModal,
    clearError,
  } = useCatalogueCars();

  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Filter cars based on search
  const filteredCars = cars.filter(
    (car) =>
      car.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddCar = async (formData: Parameters<typeof addCar>[0]) => {
    const result = await addCar(formData);
    if (result.success) {
      showNotification('Véhicule ajouté avec succès !', 'success');
      return true;
    } else {
      showNotification(result.error || 'Erreur lors de la création', 'error');
      return false;
    }
  };

  const handleDeleteCar = async (carId: string) => {
    const result = await deleteCar(carId);
    if (result.success) {
      showNotification('Véhicule supprimé avec succès !', 'success');
    } else {
      showNotification(result.error || 'Erreur lors de la suppression', 'error');
    }
    return result;
  };

  return (
    <section className="min-h-screen bg-[#F9FAFB] py-8 md:py-12 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center mb-2">
          Catalogue des véhicules
        </h1>
        <p className="text-sm md:text-base text-gray-500 text-center mb-6 md:mb-8">
          Découvrez notre collection de véhicules d'exception
        </p>

        {/* Search + Admin Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center sm:justify-between mb-6 md:mb-8 max-w-2xl mx-auto sm:max-w-none">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un véhicule..."
              className="w-full pl-10 pr-10 py-2.5 md:py-3
                         bg-white border border-gray-200
                         rounded-lg text-gray-900 text-sm
                         placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                         transition-all duration-200
                         shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Admin Add Button */}
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 md:py-3
                         bg-orange-500 hover:bg-orange-600
                         text-white font-semibold text-sm
                         rounded-lg shadow-sm
                         transition-all duration-200
                         active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un véhicule</span>
            </button>
          )}
        </div>

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

        {/* Error Banner */}
        {error && !isLoading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={clearError} className="p-1 text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-500 text-sm">Chargement des véhicules...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
            {searchTerm ? (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Aucun résultat</h3>
                <p className="text-sm text-gray-500 text-center">
                  Aucun véhicule ne correspond à « {searchTerm} »
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Catalogue vide</h3>
                <p className="text-sm text-gray-500 text-center">
                  {isAdmin
                    ? 'Cliquez sur « Ajouter un véhicule » pour commencer'
                    : 'Aucun véhicule disponible pour le moment'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Vehicles Grid */}
        {!isLoading && filteredCars.length > 0 && (
          <>
            {/* Results count */}
            <p className="text-xs text-gray-500 mb-4 text-center sm:text-left">
              {filteredCars.length} véhicule{filteredCars.length > 1 ? 's' : ''}
              {searchTerm && ` pour « ${searchTerm} »`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredCars.map((car) => (
                <VehicleCard
                  key={car.id}
                  id={car.id || ''}
                  name={car.name}
                  brand={car.brand}
                  model={car.model}
                  description={car.description}
                  image_url={car.image}
                  isAdmin={isAdmin}
                  isDeleting={isDeleting === car.id}
                  onDelete={handleDeleteCar}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Car Modal */}
      <AddCarModal
        isOpen={isAddModalOpen}
        isSaving={isSaving}
        onClose={closeAddModal}
        onSave={handleAddCar}
      />

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
    </section>
  );
}
