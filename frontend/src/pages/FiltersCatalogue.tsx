import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Upload, X, Plus } from 'lucide-react';

const FiltersCatalogue = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFilter, setEditingFilter] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFilterData, setNewFilterData] = useState({ name: '', image: '' });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Initial filter categories
  const defaultFilterCategories = [
    {
      id: 1,
      name: "Filtre à carburant",
      image: "/phf/Filtre à carburant.jpeg"
    },
    {
      id: 2,
      name: "Filtre à air",
      image: "/phf/Filtre à air.jpeg"
    },
    {
      id: 3,
      name: "Filtre à huile",
      image: "/phf/Filtre à huile.jpeg"
    },
    {
      id: 4,
      name: "Filtre d'habitacle",
      image: "/phf/Filtre d'habitacle.jpeg"
    },
    {
      id: 5,
      name: "Support de filtre à huile",
      image: "/phf/Support de filtre à huile.jpg"
    },
    {
      id: 6,
      name: "Kit de filtres",
      image: "/phf/Kit de filtres.jpeg"
    },
    {
      id: 7,
      name: "Filtre à air sport",
      image: "/phf/Filtre à air sport.jpeg"
    },
    {
      id: 8,
      name: "Joint de support de filtre à huile",
      image: "/phf/Joint de support de filtre à huile.jpg"
    },
    {
      id: 9,
      name: "Filtre hydraulique direction",
      image: "/phf/Filtre hydraulique direction.jpeg"
    },
    {
      id: 10,
      name: "Filtre à air secondaire",
      image: "/phf/Filtre à air secondaire.jpeg"
    },
    {
      id: 11,
      name: "Soupape, filtre à carburant",
      image: "/phf/Soupape, filtre à carburant.jpeg"
    },
    {
      id: 12,
      name: "Filtre, unité d'alimentation de carburant",
      image: "/phf/Filtre, unité d'alimentation de carburant - Copie.jpeg"
    },
    {
      id: 13,
      name: "Filtre à particules diesel (FAP)",
      image: "/phf/Filtre à particules diesel.jpeg"
    },
    {
      id: 14,
      name: "Filtre déshydrateur de climatisation",
      image: "/phf/Filtre déshydrateur climatisation.jpeg"
    },
    {
      id: 15,
      name: "Filtre à transmission automatique",
      image: "/phf/Filtre transmission automatique.jpeg"
    }
  ];

  const [filterCategories, setFilterCategories] = useState(defaultFilterCategories);

  // Load user and filter categories from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const savedFilters = localStorage.getItem('filterCatalogueCategories');
    if (savedFilters) {
      setFilterCategories(JSON.parse(savedFilters));
    }
  }, []);

  // Check if user is admin
  const isAdmin = user && (user.role === 'admin' || user.is_admin === true);

  // Handle image upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start editing a filter
  const handleEditFilter = (filter: any) => {
    setEditingFilter(filter);
    setImagePreview(filter.image);
    setIsEditing(true);
  };

  // Save edited filter
  const handleSaveEdit = () => {
    if (!editingFilter) return;

    const updatedFilters = filterCategories.map(f => 
      f.id === editingFilter.id 
        ? { ...editingFilter, image: imagePreview || editingFilter.image }
        : f
    );

    setFilterCategories(updatedFilters);
    localStorage.setItem('filterCatalogueCategories', JSON.stringify(updatedFilters));
    
    setIsEditing(false);
    setEditingFilter(null);
    setImagePreview('');
    setSelectedImage(null);
    alert('✅ Filtre mis à jour avec succès!');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingFilter(null);
    setImagePreview('');
    setSelectedImage(null);
  };

  // Delete filter
  const handleDeleteFilter = (filterId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce filtre?')) {
      const updatedFilters = filterCategories.filter(f => f.id !== filterId);
      setFilterCategories(updatedFilters);
      localStorage.setItem('filterCatalogueCategories', JSON.stringify(updatedFilters));
      alert('✅ Filtre supprimé avec succès!');
    }
  };

  // Add new filter
  const handleAddFilter = () => {
    if (!newFilterData.name.trim() || !imagePreview) {
      alert('⚠️ Veuillez remplir tous les champs et ajouter une image');
      return;
    }

    const newFilter = {
      id: Math.max(...filterCategories.map(f => f.id)) + 1,
      name: newFilterData.name,
      image: imagePreview
    };

    const updatedFilters = [...filterCategories, newFilter];
    setFilterCategories(updatedFilters);
    localStorage.setItem('filterCatalogueCategories', JSON.stringify(updatedFilters));

    setShowAddForm(false);
    setNewFilterData({ name: '', image: '' });
    setImagePreview('');
    setSelectedImage(null);
    alert('✅ Nouveau filtre ajouté avec succès!');
  };

  // Reset to default filters
  const handleResetFilters = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les filtres aux valeurs par défaut?')) {
      setFilterCategories(defaultFilterCategories);
      localStorage.setItem('filterCatalogueCategories', JSON.stringify(defaultFilterCategories));
      alert('✅ Filtres réinitialisés avec succès!');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à l'accueil
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">RAM Auto Motors</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-12 px-4 sm:px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            CATALOGUE DE FILTRATION
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            TROUVEZ LA BONNE PIÈCE EN QUELQUES CLICS
          </p>
          
          {/* Admin Controls */}
          {isAdmin && (
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un filtre
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-sm"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Filter Categories Grid - 3 columns on all screen sizes with responsive spacing */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-5xl mx-auto px-2 sm:px-4">
          {filterCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 group w-full min-h-0 relative"
            >
              {/* Admin Edit/Delete Buttons */}
              {isAdmin && (
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFilter(category);
                    }}
                    className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFilter(category.id);
                    }}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}

              {/* Image Container - Square with white background */}
              <div className="aspect-square bg-white rounded-t-lg overflow-hidden p-1 sm:p-2 md:p-3">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/ff.png';
                  }}
                />
              </div>
              
              {/* Category Name - Light gray background */}
              <div className="p-1 sm:p-2 md:p-3 bg-gray-100 rounded-b-lg">
                <h3 className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-900 text-center leading-tight">
                  {category.name}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Spacing */}
        <div className="h-16"></div>
      </div>

      {/* Edit Filter Modal */}
      {isEditing && editingFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Modifier le filtre</h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du filtre
                </label>
                <input
                  type="text"
                  value={editingFilter.name}
                  onChange={(e) => setEditingFilter({ ...editingFilter, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nom du filtre"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image du filtre
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {selectedImage ? selectedImage.name : 'Choisir une image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aperçu de l'image
                  </label>
                  <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Filter Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ajouter un filtre</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewFilterData({ name: '', image: '' });
                  setImagePreview('');
                  setSelectedImage(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du filtre
                </label>
                <input
                  type="text"
                  value={newFilterData.name}
                  onChange={(e) => setNewFilterData({ ...newFilterData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Filtre à air sport"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image du filtre
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {selectedImage ? selectedImage.name : 'Choisir une image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aperçu de l'image
                  </label>
                  <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddFilter}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewFilterData({ name: '', image: '' });
                    setImagePreview('');
                    setSelectedImage(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersCatalogue;
