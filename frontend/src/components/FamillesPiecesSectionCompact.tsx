import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Cog, 
  Car, 
  Wrench, 
  Gauge, 
  Battery, 
  Fuel,
  Thermometer,
  Zap,
  ChevronUp,
  ChevronRight,
  Link2,
  Trash2,
  Plus,
  Camera,
  LucideIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { refreshCategoriesGlobally, getCategoryStatusMap } from "@/api/database";
import { getApiBaseUrl, getBackendBaseUrl } from "@/utils/apiConfig";
import { useAuth } from "@/hooks/useAuth";
import { mapCategoryStatusToClass, mapCategoryStatusToBadgeClass, mapCategoryStatusToLinkClass, type CategoryStatusColor } from "@/utils/categoryTheme";

interface PartFamily {
  name: string;
  icon: LucideIcon;
  description: string;
  link: string;
  subCategories: string[];
}

const createSlug = (text: string): string =>
  (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const FamillesPiecesSectionCompact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  
  // Image upload state
  const [uploadingSubcategory, setUploadingSubcategory] = useState<string | null>(null);
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Add subcategory modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentFamilyForAdd, setCurrentFamilyForAdd] = useState<string>("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubImage, setNewSubImage] = useState<File | null>(null);
  const [addingLoading, setAddingLoading] = useState(false);

  const { data: statusMap = { byCategorySlug: {} } } = useQuery({
    queryKey: ["category-status"],
    queryFn: getCategoryStatusMap,
  });

  // Force refresh subcategories from server - NO CACHE
  const refreshSubcategoriesFromServer = useCallback(async () => {
    console.log('🔄 Force refreshing subcategories from server...');
    try {
      const apiBase = getApiBaseUrl();
      const timestamp = Date.now(); // Cache buster
      const response = await fetch(`${apiBase}/subcategories?t=${timestamp}`, {
        cache: 'no-store'
      });
      const result = await response.json();

      if (result.success && result.data) {
        const imageMap: Record<string, string> = {};
        result.data.forEach((item: { name: string; image_url?: string }) => {
          if (item.image_url) {
            imageMap[item.name] = item.image_url;
          }
        });
        setSubcategoryImages(imageMap);
        console.log("🔄 Subcategory images refreshed:", Object.keys(imageMap).length, "items");
        
        // Also invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      }
    } catch (error) {
      console.error("❌ Failed refreshing subcategory images:", error);
    }
  }, [queryClient]);

  // Load subcategory images AND merge database subcategories with hardcoded families
  useEffect(() => {
    const loadSubcategoriesFromDatabase = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const timestamp = Date.now(); // Cache buster
        const response = await fetch(`${apiBase}/subcategories?t=${timestamp}`, {
          cache: 'no-store'
        });
        const result = await response.json();

        if (result.success && result.data) {
          const imageMap: Record<string, string> = {};
          const dbSubcategoriesByFamily: Record<string, string[]> = {};
          
          result.data.forEach((item: { name: string; family_name?: string; image_url?: string }) => {
            // Build image map
            if (item.image_url) {
              imageMap[item.name] = item.image_url;
            }
            
            // Build family->subcategories map from database
            if (item.family_name) {
              if (!dbSubcategoriesByFamily[item.family_name]) {
                dbSubcategoriesByFamily[item.family_name] = [];
              }
              if (!dbSubcategoriesByFamily[item.family_name].includes(item.name)) {
                dbSubcategoriesByFamily[item.family_name].push(item.name);
              }
            }
          });

          setSubcategoryImages(imageMap);
          console.log("📦 Loaded subcategory images:", Object.keys(imageMap).length, "items");
          
          // Merge database subcategories into families state
          if (Object.keys(dbSubcategoriesByFamily).length > 0) {
            setFamilies(prevFamilies => {
              return prevFamilies.map(family => {
                const dbSubs = dbSubcategoriesByFamily[family.name] || [];
                // Merge: hardcoded + database (unique only)
                const mergedSubs = [...new Set([...family.subCategories, ...dbSubs])];
                return {
                  ...family,
                  subCategories: mergedSubs
                };
              });
            });
            console.log("🔗 Merged database subcategories into families");
          }
        }
      } catch (error) {
        console.error("❌ Failed loading subcategory data:", error);
      }
    };

    loadSubcategoriesFromDatabase();
    
    // Listen for subcategory updates from other components (same tab)
    const handleSubcategoryUpdate = () => {
      console.log('🔄 Received subcategories-updated event, refreshing...');
      loadSubcategoriesFromDatabase();
    };
    
    // Listen for categories updates (same tab)
    const handleCategoriesUpdate = () => {
      console.log('🔄 Received categories-updated event, refreshing...');
      loadSubcategoriesFromDatabase();
    };
    
    // Listen for cross-tab updates via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('subcategories-updates');
      broadcastChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'refresh') {
          console.log('🔄 Received cross-tab refresh message, refreshing...');
          loadSubcategoriesFromDatabase();
        }
      });
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }
    
    // Also listen for categories BroadcastChannel
    let categoriesChannel: BroadcastChannel | null = null;
    try {
      categoriesChannel = new BroadcastChannel('categories-updates');
      categoriesChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'refresh') {
          console.log('🔄 Received cross-tab categories refresh, refreshing...');
          loadSubcategoriesFromDatabase();
        }
      });
    } catch (e) {
      console.warn('Categories BroadcastChannel not supported');
    }
    
    window.addEventListener('subcategories-updated', handleSubcategoryUpdate);
    window.addEventListener('categories-updated', handleCategoriesUpdate);
    
    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('subcategories-updated', handleSubcategoryUpdate);
      window.removeEventListener('categories-updated', handleCategoriesUpdate);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      if (categoriesChannel) {
        categoriesChannel.close();
      }
    };
  }, []);

  // Handle image upload - MUST include family_name to update correct row
  const handleImageUpload = async (subcategoryName: string, file: File, familyName?: string) => {
    if (!file) return;

    setUploadingSubcategory(subcategoryName);

    try {
      // Find the family name for this subcategory if not provided
      let actualFamilyName = familyName;
      if (!actualFamilyName) {
        // Find which family this subcategory belongs to
        const family = families.find(f => f.subCategories.includes(subcategoryName));
        actualFamilyName = family?.name || 'Uncategorized';
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('subcategory_name', subcategoryName);
      formData.append('family_name', actualFamilyName); // CRITICAL: Must send family_name!

      console.log(`📤 Uploading image for "${subcategoryName}" in family "${actualFamilyName}"`);

      // Get user from localStorage to send as header (for admin auth)
      const userData = localStorage.getItem('user');
      const headers: HeadersInit = {};
      if (userData) {
        headers['x-user'] = userData;
      }

      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/subcategories/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success && result.data?.image_url) {
        // Update the image in state
        setSubcategoryImages(prev => ({
          ...prev,
          [subcategoryName]: result.data.image_url
        }));
        console.log('✅ Image uploaded successfully for family:', actualFamilyName);
        
        // Dispatch event to refresh other components
        window.dispatchEvent(new CustomEvent('subcategories-updated'));
        
        // Use global refresh function
        await refreshCategoriesGlobally();
        
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingSubcategory(null);
    }
  };

  // Trigger file input click
  const triggerFileInput = (subcategoryName: string, context: 'mobile' | 'desktop' = 'mobile') => {
    const key = context === 'desktop' ? `desktop-${subcategoryName}` : subcategoryName;
    fileInputRefs.current[key]?.click();
  };

  // Get image URL for subcategory
  const getSubcategoryImageUrl = (subcategoryName: string): string => {
    const imageUrl = subcategoryImages[subcategoryName];
    if (!imageUrl) return "/images/placeholder.png";

    if (imageUrl.startsWith("http")) return imageUrl;

    const base = getBackendBaseUrl();
    return `${base}${imageUrl}`;
  };

  const [families, setFamilies] = useState<PartFamily[]>([
    { 
      name: "Embrayage", 
      icon: Cog, 
      description: "Disques et mécanismes",
      link: "/category/Embrayage",
      subCategories: [
        "Kit embrayage complet",
        "Disque d'embrayage",
        "Mécanisme d'embrayage",
        "Butée hydraulique",
        "Volant moteur",
        "Cable d'embrayage"
      ]
    },
    { 
      name: "Direction & Suspension", 
      icon: Car, 
      description: "Amortisseurs et rotules",
      link: "/category/Direction et Suspension",
      subCategories: [
        "Amortisseurs avant",
        "Amortisseurs arrière",
        "Rotule de direction",
        "Bras de suspension",
        "Ressort de suspension",
        "Biellette de direction"
      ]
    },
    { 
      name: "Filtration", 
      icon: Gauge, 
      description: "Filtres air, huile, carburant",
      link: "/category/Filtration",
      subCategories: [
        "Filtre à air",
        "Filtre à huile",
        "Filtre à carburant",
        "Filtre habitacle",
        "Filtre à particules",
        "Filtre de boîte"
      ]
    },
    { 
      name: "Freinage", 
      icon: Wrench, 
      description: "Plaquettes et disques",
      link: "/category/Freinage",
      subCategories: [
        "Plaquettes avant",
        "Plaquettes arrière",
        "Disques de frein avant",
        "Disques de frein arrière",
        "Étriers de frein",
        "Tambours de frein"
      ]
    },
    { 
      name: "Pièces Moteur", 
      icon: Battery, 
      description: "Distribution et allumage",
      link: "/category/Pièces Moteur",
      subCategories: [
        "Kit de distribution",
        "Courroie d'accessoires",
        "Pompe à eau",
        "Bougie d'allumage",
        "Bobine d'allumage",
        "Capteur vilebrequin"
      ]
    },
    { 
      name: "Crémaillère", 
      icon: Fuel, 
      description: "Direction assistée",
      link: "/category/Pièces et Crémailleurs",
      subCategories: [
        "Crémaillère de direction",
        "Pompe direction assistée",
        "Soufflet de crémaillère",
        "Rotule axiale",
        "Biellette de barre",
        "Réservoir DA"
      ]
    },
    { 
      name: "Échappement", 
      icon: Thermometer, 
      description: "Système d'échappement",
      link: "/category/Échappement et Charge",
      subCategories: [
        "Pot catalytique",
        "Silencieux arrière",
        "Silencieux intermédiaire",
        "Collecteur d'échappement",
        "Flexible d'échappement",
        "Colliers et joints"
      ]
    },
    { 
      name: "Carrosserie", 
      icon: Zap, 
      description: "Éléments extérieurs",
      link: "/category/Carrosserie",
      subCategories: [
        "Pare-chocs avant",
        "Pare-chocs arrière",
        "Ailes",
        "Capot",
        "Rétroviseurs",
        "Grilles de calandre"
      ]
    },
    { 
      name: "Habitacle", 
      icon: Cog, 
      description: "Intérieur véhicule",
      link: "/category/Pièces Habitacle",
      subCategories: [
        "Volant",
        "Levier de vitesse",
        "Console centrale",
        "Tableau de bord",
        "Sièges",
        "Garnitures de porte"
      ]
    },
    { 
      name: "Injection", 
      icon: Car, 
      description: "Diesel et essence",
      link: "/category/Qualité Diesel/Essence",
      subCategories: [
        "Injecteurs diesel",
        "Injecteurs essence",
        "Pompe à injection",
        "Rampe d'injection",
        "Régulateur de pression",
        "Capteur de pression"
      ]
    },
    { 
      name: "Optiques", 
      icon: Wrench, 
      description: "Éclairage automobile",
      link: "/category/Optiques et Signaux",
      subCategories: [
        "Phare avant gauche",
        "Phare avant droit",
        "Feu arrière gauche",
        "Feu arrière droit",
        "Clignotants",
        "Ampoules LED/Xénon"
      ]
    },
    { 
      name: "Refroidissement", 
      icon: Gauge, 
      description: "Radiateurs et ventilation",
      link: "/category/Refroidissement",
      subCategories: [
        "Radiateur moteur",
        "Radiateur de chauffage",
        "Ventilateur de refroidissement",
        "Thermostat",
        "Vase d'expansion",
        "Durites de refroidissement"
      ]
    }
  ]);

  const handleFamilyClick = (familyName: string) => {
    setOpenFamily(openFamily === familyName ? null : familyName);
  };

  // Admin handlers
  const handleEditSubCategory = (familyName: string, subCategory: string) => {
    console.log("Edit link for:", familyName, "->", subCategory);
    // TODO: Open modal to update/attach link in database
  };

  const handleDeleteSubCategory = (familyName: string, subCategory: string) => {
    console.log("Delete sub category:", familyName, "->", subCategory);
    // TODO: Call API to delete from database
  };

  const handleAddSubCategory = (familyName: string) => {
    setCurrentFamilyForAdd(familyName);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewSubName("");
    setNewSubImage(null);
    setCurrentFamilyForAdd("");
  };

  const handleSubmitNewSubcategory = async () => {
    // Validation
    if (!newSubName.trim()) {
      toast({
        title: "❌ Erreur",
        description: "Le nom de la sous-catégorie est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!newSubImage) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    setAddingLoading(true);

    try {
      const apiBase = getApiBaseUrl();

      // Step 1: Upload image WITH family_name to persist the relationship
      const formData = new FormData();
      formData.append("image", newSubImage);
      formData.append("subcategory_name", newSubName.trim());
      formData.append("family_name", currentFamilyForAdd); // CRITICAL: Link to parent family

      console.log(`📤 Uploading subcategory "${newSubName.trim()}" for family "${currentFamilyForAdd}"`);

      // Get user from localStorage to send as header (for admin auth)
      const userData = localStorage.getItem('user');
      const headers: HeadersInit = {};
      if (userData) {
        headers['x-user'] = userData;
      }

      const uploadResponse = await fetch(`${apiBase}/subcategories/upload-image`, {
        method: "POST",
        headers,
        body: formData,
        cache: 'no-store'
      });

      if (!uploadResponse.ok) {
        if (uploadResponse.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        if (uploadResponse.status === 403) {
          throw new Error('Admin access required');
        }
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Échec de l'upload de l'image");
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || uploadResult.message || "Échec de l'upload de l'image");
      }

      // Use canonical data from server response
      const serverData = uploadResult.data;
      const serverFamilyName = serverData.family_name || currentFamilyForAdd;
      const serverSubcategoryName = serverData.subcategory_name || newSubName.trim();
      const uploadedImageUrl = serverData.image_url;
      
      console.log('✅ Server confirmed subcategory:', serverSubcategoryName, 'in family:', serverFamilyName);

      // Step 2: Update local state - add to families (use server's family_name)
      setFamilies((prevFamilies) =>
        prevFamilies.map((family) =>
          family.name === serverFamilyName
            ? {
                ...family,
                subCategories: family.subCategories.includes(serverSubcategoryName) 
                  ? family.subCategories 
                  : [...family.subCategories, serverSubcategoryName],
              }
            : family
        )
      );

      // Step 3: Update subcategory images map
      setSubcategoryImages((prev) => ({
        ...prev,
        [serverSubcategoryName]: uploadedImageUrl,
      }));

      // Success
      toast({
        title: "✅ Succès",
        description: `La sous-catégorie "${newSubName.trim()}" a été ajoutée avec succès`,
      });

      // Force refresh for ALL users - invalidate cache globally
      await refreshSubcategoriesFromServer();
      
      // Use global refresh function to trigger refresh everywhere
      await refreshCategoriesGlobally();
      
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      console.log('🔄 Subcategory added and cache invalidated globally');

      // Close modal and reset
      handleCloseAddModal();
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout de la sous-catégorie:", error);
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Échec de l'ajout de la sous-catégorie",
        variant: "destructive",
      });
    } finally {
      setAddingLoading(false);
    }
  };

  return (
    <section className="py-4 sm:py-8 md:py-12 bg-gradient-to-b from-[#fafafa] to-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Title */}
        <h2 className="text-center text-lg sm:text-2xl md:text-3xl font-bold text-orange-500 mb-2 sm:mb-3">
          FAMILLES DES PIÈCES
        </h2>

        {/* Decorative divider */}
        <div className="w-12 sm:w-16 h-[2px] sm:h-[3px] bg-orange-300 mx-auto rounded-full mb-3 sm:mb-6 md:mb-8" />

        {/* Description */}
        <p className="text-center text-gray-600 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8 max-w-xl mx-auto leading-tight">
          Sélectionnez une catégorie pour afficher les sous-catégories disponibles
        </p>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {families.map((family, index) => {
            const IconComponent = family.icon;
            const isActive = openFamily === family.name;
            const subStatuses = (family.subCategories || []).map((sub) => statusMap.byCategorySlug?.[createSlug(sub)] || "none");
            const rawStatus: CategoryStatusColor = subStatuses.includes("red") ? "red" : subStatuses.includes("yellow") ? "yellow" : "none";
            const familleStatus = isAdmin ? rawStatus : "none";
            const familleStatusClass = isAdmin ? mapCategoryStatusToClass(rawStatus, { rounded: false }) : "";

            return (
              <div key={index} className="flex flex-col relative">
                {isAdmin && rawStatus === "red" && (
                  <span className={mapCategoryStatusToBadgeClass("red")}>RUPTURE</span>
                )}
                {isAdmin && rawStatus === "yellow" && (
                  <span className={mapCategoryStatusToBadgeClass("yellow")}>STOCK FAIBLE</span>
                )}
                {/* Family Card */}
                <button
                  onClick={() => handleFamilyClick(family.name)}
                  className={`group bg-white shadow-sm border rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-5
                              flex flex-col items-center text-center
                              transition-all duration-300 ease-out cursor-pointer
                              ${familleStatusClass || ""}
                              ${isActive 
                                ? '!border-orange-400 bg-orange-50/50 shadow-md ring-1 ring-orange-200' 
                                : familleStatusClass ? '' : 'border-gray-100 hover:shadow-lg hover:border-orange-200 hover:scale-[1.02]'
                              }`}
                >
                  {/* Icon */}
                  <div className={`w-7 h-7 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl 
                                  flex items-center justify-center mb-2 sm:mb-3
                                  transition-colors duration-300
                                  ${isActive 
                                    ? 'bg-orange-500' 
                                    : 'bg-orange-50 group-hover:bg-orange-100'
                                  }`}>
                    <IconComponent className={`w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 
                                              group-hover:scale-110 transition-all duration-300
                                              ${isActive ? 'text-white' : 'text-orange-500'}`} />
                  </div>

                  {/* Title */}
                  <h3 className={`font-semibold text-sm sm:text-base md:text-base mb-1 
                                 transition-colors duration-300 leading-tight
                                 ${isActive ? 'text-orange-600' : 'text-gray-800 group-hover:text-orange-600'}`}>
                    {family.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-400 leading-snug line-clamp-2 mb-2">
                    {family.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className={`mt-auto transition-transform duration-300 ${isActive ? 'rotate-0' : 'rotate-180'}`}>
                    <ChevronUp className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-gray-300'}`} />
                  </div>
                </button>

                {/* Accordion - Sub-categories (Mobile: full width below card) */}
                {isActive && (
                  <div className="sm:hidden mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm
                                  animate-[slideDown_0.25s_ease-out]">
                    {isAdmin && familleStatus === "yellow" ? (
                      <div className="sousCategorieTitle text-sm mb-3 -mx-3 -mt-3">
                        {family.name}
                      </div>
                    ) : (
                      <h4 className="text-sm font-bold mb-2 text-orange-600 uppercase tracking-wide">
                        {family.name}
                      </h4>
                    )}

                    <ul className="space-y-1">
                      {family.subCategories.map((item, idx) => {
                        const subStatus: CategoryStatusColor = (statusMap.byCategorySlug?.[createSlug(item)] as CategoryStatusColor) || "none";
                        const subLinkClass = isAdmin ? mapCategoryStatusToLinkClass(subStatus) : "";
                        return (
                        <li
                          key={idx}
                          className={`flex items-center justify-between gap-2 text-sm leading-tight py-1.5 pl-2 rounded ${subLinkClass || "text-gray-700"}`}
                        >
                          {/* Left: Thumbnail + Name */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Subcategory Image Thumbnail */}
                            <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <img 
                                src={getSubcategoryImageUrl(item)}
                                alt={item}
                                className="w-full h-full object-cover rounded-md"
                                onError={(e) => {
                                  // Fallback to icon if placeholder image not found
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('svg')) {
                                    const icon = document.createElement('div');
                                    icon.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                    parent.appendChild(icon.firstChild as Node);
                                  }
                                }}
                              />
                            </div>
                            
                            <span className="truncate flex-1 text-sm">{item}</span>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Navigate/View Button */}
                            <button
                              onClick={() => navigate(`/acha/${encodeURIComponent(item)}`)}
                              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                              title="Voir le produit"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600 hover:text-gray-800" />
                            </button>
                            
                            {/* Admin Controls */}
                            {isAdmin && (
                              <>
                                {/* Edit Link Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleEditSubCategory(family.name, item);
                                  }}
                                  className="p-1.5 hover:bg-orange-100 rounded-md transition-colors"
                                  title="Modifier le lien"
                                >
                                  <Link2 className="w-3.5 h-3.5 text-orange-500 hover:text-orange-600" />
                                </button>
                                
                                {/* Edit Image Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    triggerFileInput(item);
                                  }}
                                  disabled={uploadingSubcategory === item}
                                  className="p-1.5 hover:bg-blue-100 rounded-md transition-colors
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Modifier l'image"
                                >
                                  {uploadingSubcategory === item ? (
                                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Camera className="w-3.5 h-3.5 text-blue-500 hover:text-blue-600" />
                                  )}
                                </button>
                                
                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteSubCategory(family.name, item);
                                  }}
                                  className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-600" />
                                </button>
                                
                                {/* Hidden File Input */}
                                <input
                                  ref={(el) => (fileInputRefs.current[item] = el)}
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleImageUpload(item, file, family.name); // Pass family name!
                                    }
                                    e.target.value = ''; // Reset input
                                  }}
                                />
                              </>
                            )}
                          </div>
                        </li>
                      );
                      })}
                    </ul>

                    {/* Admin: Add new sub-category button */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleAddSubCategory(family.name);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 
                                   border border-dashed border-orange-300 rounded-lg
                                   text-orange-500 text-sm font-medium
                                   hover:bg-orange-50 hover:border-orange-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une sous-catégorie
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Full-width Accordion Panel (for larger screens) */}
        {openFamily && (
          <div className="hidden sm:block mt-6 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-md
                          animate-[fadeIn_0.3s_ease-out]">
            {families.filter(f => f.name === openFamily).map((family, idx) => {
              const subStatuses = (family.subCategories || []).map((sub) => statusMap.byCategorySlug?.[createSlug(sub)] || "none");
              const rawStatus: CategoryStatusColor = subStatuses.includes("red") ? "red" : subStatuses.includes("yellow") ? "yellow" : "none";
              const familleStatus = isAdmin ? rawStatus : "none";
              return (
              <div key={idx}>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <family.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isAdmin && familleStatus === "yellow" ? (
                        <div className="sousCategorieTitle">
                          {family.name}
                        </div>
                      ) : (
                        <>
                          <h4 className="text-lg md:text-xl font-bold text-orange-600 uppercase tracking-wide">
                            {family.name}
                          </h4>
                          <p className="text-xs text-gray-400">{family.description}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Admin: Add button in header */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddSubCategory(family.name);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 
                                 bg-orange-500 hover:bg-orange-600 
                                 text-white text-sm font-medium rounded-lg
                                 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  )}
                </div>

                {/* Sub-categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {family.subCategories.map((item, subIdx) => {
                    const subStatus: CategoryStatusColor = (statusMap.byCategorySlug?.[createSlug(item)] as CategoryStatusColor) || "none";
                    const subLinkClass = isAdmin ? mapCategoryStatusToLinkClass(subStatus) : "";
                    return (
                    <div
                      key={subIdx}
                      className={`group flex items-center justify-between gap-2 p-3 rounded-lg
                                 bg-gray-50 hover:bg-orange-50 
                                 border border-transparent hover:border-orange-200
                                 transition-all duration-200
                                 ${subLinkClass || "text-gray-700 hover:text-orange-600"}`}
                    >
                      {/* Left: Thumbnail + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Subcategory Image Thumbnail */}
                        <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <img 
                            src={getSubcategoryImageUrl(item)}
                            alt={item}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              // Fallback to icon if placeholder image not found
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('svg')) {
                                const icon = document.createElement('div');
                                icon.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                parent.appendChild(icon.firstChild as Node);
                              }
                            }}
                          />
                        </div>
                        
                        <span className="font-medium text-sm truncate flex-1">{item}</span>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0 
                                      opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Navigate/View Button */}
                        <button
                          onClick={() => navigate(`/acha/${encodeURIComponent(item)}`)}
                          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                          title="Voir le produit"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 hover:text-gray-800" />
                        </button>
                        
                        {/* Admin Controls */}
                        {isAdmin && (
                          <>
                            {/* Edit Link Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleEditSubCategory(family.name, item);
                              }}
                              className="p-1.5 hover:bg-orange-100 rounded-md transition-colors"
                              title="Modifier le lien"
                            >
                              <Link2 className="w-4 h-4 text-orange-500 hover:text-orange-600" />
                            </button>
                            
                            {/* Edit Image Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                triggerFileInput(item, 'desktop');
                              }}
                              disabled={uploadingSubcategory === item}
                              className="p-1.5 hover:bg-blue-100 rounded-md transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Modifier l'image"
                            >
                              {uploadingSubcategory === item ? (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Camera className="w-4 h-4 text-blue-500 hover:text-blue-600" />
                              )}
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteSubCategory(family.name, item);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                            </button>
                            
                            {/* Hidden File Input - Desktop */}
                            <input
                              ref={(el) => (fileInputRefs.current[`desktop-${item}`] = el)}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(item, file, family.name); // Pass family name!
                                }
                                e.target.value = ''; // Reset input
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Add Subcategory Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-[92%] sm:w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              Ajouter une sous-catégorie
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Catégorie : <span className="font-semibold text-gray-800">{currentFamilyForAdd}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la sous-catégorie <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Ex: Kit embrayage sport"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                disabled={addingLoading}
              />
            </div>

            {/* Image Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image (JPG/PNG) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewSubImage(file);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                disabled={addingLoading}
              />
              {newSubImage && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  ✓ Image sélectionnée : {newSubImage.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={handleCloseAddModal}
              disabled={addingLoading}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitNewSubcategory}
              disabled={addingLoading}
              className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {addingLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FamillesPiecesSectionCompact;
