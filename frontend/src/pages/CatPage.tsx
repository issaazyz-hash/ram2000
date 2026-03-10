import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getCategoryProducts,
  createCategoryProduct,
  updateCategoryProduct,
  updateCategoryProductStock,
  deleteCategoryProduct,
  getAllVehicleModels,
  getPendingOrdersByProduct,
  getCategoryStatusMap,
  type CategoryProductData,
  type VehicleModelData,
} from "@/api/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadImage } from "@/services/uploadService";
import { Edit3, Save, X, Trash2, Plus, Upload } from "lucide-react";
import { getBackendBaseUrl, getApiBaseUrl } from "@/utils/apiConfig";
import CategoryProductCard from "@/components/CategoryProductCard";
import { mapCategoryStatusToClass, type CategoryStatusColor } from "@/utils/categoryTheme";

// ---------- helpers ----------
const formatProductPrice = (rawPrice?: number | string): string => {
  if (rawPrice === undefined || rawPrice === null) return "";
  const num = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
  if (!Number.isFinite(num)) return String(rawPrice);
  if (Number.isInteger(num)) return num.toString();
  return num.toString().replace(/\.?0+$/, "");
};

const parseTarifNum = (v: string): number => {
  const s = (v || "").trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/** Parse percent value: "10", "10%", "10,5" -> 10, 10, 10.5. Clamp >= 0. */
const parsePercent = (v: string | number): number => {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".")
    .replace(/%\s*$/, "");
  const n = parseFloat(s);
  const num = Number.isFinite(n) ? n : 0;
  return Math.max(0, num);
};

const formatTarifNumber = (n: number): string =>
  Number.isFinite(n) ? n.toFixed(2) : "";

const getCategoryDisplayName = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getImageUrl = (image?: string) => {
  if (!image) return "/ff.png";
  if (image.startsWith("http")) return image;
  return `${getBackendBaseUrl()}${image}`;
};

const getProductSlug = (product: CategoryProductData) =>
  product.slug ||
  product.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

// Vehicle models will be fetched from backend API

// ---------- component ----------
const CatPage = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState<CategoryProductData[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newReferenceInput, setNewReferenceInput] = useState("");
  const [newProductReferences, setNewProductReferences] = useState<string[]>([]);
  const [newProductRating, setNewProductRating] = useState<number>(0);
  
  // Tarif: user inputs X, R%, T%, M%
  const [tarifPrixAchatBrut, setTarifPrixAchatBrut] = useState("");
  const [tarifRemiseAchat, setTarifRemiseAchat] = useState("0"); // Remise % default 0
  const [tarifTVA, setTarifTVA] = useState("19"); // TVA % default 19
  const [tarifNetAchatTTC, setTarifNetAchatTTC] = useState("0"); // Marge % default 0

  // Computed: NetHTVA = X - (X * R / 100)
  const tarifNetAchatHTVAComputed = useMemo(() => {
    const x = parseTarifNum(tarifPrixAchatBrut);
    const r = parsePercent(tarifRemiseAchat);
    return x - (x * r / 100);
  }, [tarifPrixAchatBrut, tarifRemiseAchat]);

  // Computed: NetTTC = NetHTVA + (NetHTVA * T / 100)
  const tarifNetAchatTTCComputed = useMemo(() => {
    const t = parsePercent(tarifTVA);
    return tarifNetAchatHTVAComputed + (tarifNetAchatHTVAComputed * t / 100);
  }, [tarifNetAchatHTVAComputed, tarifTVA]);

  // Computed: PrixNeveux = NetTTC + (NetTTC * M / 100)
  const tarifPrixNeveuxComputed = useMemo(() => {
    const m = parsePercent(tarifNetAchatTTC);
    return tarifNetAchatTTCComputed + (tarifNetAchatTTCComputed * m / 100);
  }, [tarifNetAchatTTCComputed, tarifNetAchatTTC]);
  
  // Stock fields (Stock disponible, Seuil d'alerte)
  const [newProductStockDisponible, setNewProductStockDisponible] = useState<string>("0");
  const [newProductSeuilAlerte, setNewProductSeuilAlerte] = useState<string>("0");

  // Vehicle compatibility - using numeric IDs from backend
  const [newProductVehicleModelIds, setNewProductVehicleModelIds] = useState<number[]>([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [allVehicleModels, setAllVehicleModels] = useState<VehicleModelData[]>([]);
  const [loadingVehicleModels, setLoadingVehicleModels] = useState(false);
  const [vehicleModelsError, setVehicleModelsError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState<number | "new" | null>(
    null
  );

  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const newProductFileInputRef = useRef<HTMLInputElement>(null);

  // Get modelId from query string (passed from PiecesDispo)
  const [searchParams] = useSearchParams();
  const modelIdFromQuery = searchParams.get('modelId');
  const modelId = modelIdFromQuery ? parseInt(modelIdFromQuery, 10) : undefined;
  const isValidModelId = modelId !== undefined && !isNaN(modelId) && modelId > 0;

  // ---------- load ----------
  useEffect(() => {
    if (categorySlug) {
      loadProducts();
    }
  }, [categorySlug, modelId]); // Reload when modelId changes

  // Fetch all vehicle models when admin opens add-product form
  // Uses getAllVehicleModels() to get all Kia + Hyundai models
  useEffect(() => {
    const fetchAllVehicleModels = async () => {
      if (!isAdmin || !isAddingProduct) {
        return; // Only fetch when admin is adding a product
      }

      // Skip if already loaded
      if (allVehicleModels.length > 0 && !vehicleModelsError) {
        console.log('✅ Vehicle models already loaded, skipping fetch');
        return;
      }

      console.log('🔍 Fetching all vehicle models for admin product form...');
      setLoadingVehicleModels(true);
      setVehicleModelsError(null);

      try {
        // Fetch all vehicle models (Kia + Hyundai)
        const apiUrl = `${getApiBaseUrl()}/vehicleModels`;
        console.log('🔍 [TRACE] Fetching from:', apiUrl);
        const models = await getAllVehicleModels();
        console.log('✅ Fetched', models.length, 'vehicle models');
        console.log('🔍 [TRACE] Raw API response sample:', models.slice(0, 5));
        
        // Validate and filter models to ensure data integrity
        // Root cause fix: Filter out invalid/test data (BB, UGF, Object, etc.)
        const validModels = models.filter((model) => {
          // Must have valid id (number > 0)
          const id = typeof model.id === 'number' ? model.id : parseInt(String(model.id || ''), 10);
          if (isNaN(id) || id <= 0) {
            console.warn('⚠️ Invalid model ID:', model);
            return false;
          }
          
          // Must have marque (string, not empty, not just whitespace)
          if (!model.marque || typeof model.marque !== 'string' || model.marque.trim().length === 0) {
            console.warn('⚠️ Invalid model marque:', model);
            return false;
          }
          
          // Must have model name (string, not empty, not just whitespace)
          if (!model.model || typeof model.model !== 'string' || model.model.trim().length === 0) {
            console.warn('⚠️ Invalid model name:', model);
            return false;
          }
          
          // Filter out suspicious test data (very short names, single characters, etc.)
          // REQUIRE length >= 3 to filter out "BB", "yy", "XCXV", "bbb"
          const modelName = model.model.trim();
          const marqueName = model.marque.trim();
          
          if (modelName.length < 3) {
            console.warn('⚠️ Model name too short (length < 3, likely test data):', model);
            return false;
          }
          
          if (marqueName.length < 3) {
            console.warn('⚠️ Marque name too short (length < 3, likely test data):', model);
            return false;
          }
          
          // Filter out obvious test data patterns (all caps short strings, numbers only, etc.)
          if (/^[A-Z]{1,3}$/.test(modelName) || /^\d+$/.test(modelName)) {
            console.warn('⚠️ Suspicious model name pattern (likely test data):', model);
            return false;
          }
          
          if (/^[A-Z]{1,3}$/.test(marqueName)) {
            console.warn('⚠️ Suspicious marque pattern (likely test data):', model);
            return false;
          }
          
          // Filter out 'Object' or '[object Object]' strings
          const lowerModelName = modelName.toLowerCase();
          if (lowerModelName === 'object' || lowerModelName === '[object object]') {
            console.warn('⚠️ Invalid model name (Object):', model);
            return false;
          }
          
          return true;
        });
        
        console.log('✅ Validated', validModels.length, 'valid vehicle models (filtered', models.length - validModels.length, 'invalid)');
        console.log('🔍 [TRACE] Validated models sample:', validModels.slice(0, 5));
        
        // Warn if no valid models found - explicit warning as requested
        if (validModels.length === 0) {
          console.error('❌ [CRITICAL] No valid vehicle models found!');
          console.error('❌ [CRITICAL] API returned', models.length, 'models but all were filtered out.');
          console.error('❌ [CRITICAL] This indicates database needs to be seeded.');
          console.error('❌ [CRITICAL] Run: cd ram/bb/backend && npm run seed:vehicle-models');
          console.error('❌ [CRITICAL] DO NOT inject fake models - database must be fixed.');
        }
        
        const groupedByMarque = validModels.reduce((acc, m) => {
          acc[m.marque] = (acc[m.marque] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('🔍 [TRACE] Grouped by marque:', groupedByMarque);
        
        // Normalize IDs to ensure they're numbers (already done in getAllVehicleModels, but ensure it)
        const normalizedModels = validModels.map((model) => ({
          ...model,
          id: typeof model.id === 'number' ? model.id : parseInt(String(model.id), 10),
        }));
        
        setAllVehicleModels(normalizedModels);
        setVehicleModelsError(null);
      } catch (error: any) {
        console.error('❌ Error fetching vehicle models:', error);
        const errorMessage = error?.message || 'Impossible de charger les modèles de véhicules';
        setVehicleModelsError(errorMessage);
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
        setAllVehicleModels([]); // Clear on error
      } finally {
        setLoadingVehicleModels(false);
      }
    };

    fetchAllVehicleModels();
  }, [isAdmin, isAddingProduct]); // Fetch when admin opens add-product form

  const loadProducts = async () => {
    if (!categorySlug) return;
    try {
      setLoading(true);
      // Pass modelId if provided and valid (for model-specific filtering)
      // If modelId is undefined or invalid, getCategoryProducts returns all products (backward compatible)
      const data = await getCategoryProducts(categorySlug, isValidModelId ? modelId : undefined);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pending orders per product (for yellow highlight on CAT page)
  const { data: pendingByProduct = { byProductSlug: {} } } = useQuery({
    queryKey: ["orders", "pending-by-product", categorySlug || ""],
    queryFn: () => getPendingOrdersByProduct(categorySlug || ""),
    enabled: Boolean(categorySlug),
  });

  const { data: statusMap = { byCategorySlug: {} } } = useQuery({
    queryKey: ["category-status"],
    queryFn: getCategoryStatusMap,
  });
  const categoryStatus: CategoryStatusColor =
    (categorySlug && statusMap.byCategorySlug?.[categorySlug]) || "none";
  const categoryThemeClass = isAdmin ? mapCategoryStatusToClass(categoryStatus) : "";

  // ---------- edit ----------
  const startEdit = (product: CategoryProductData) => {
    if (!isAdmin) return;
    setEditingProduct(product.id!);
    setEditName(product.name);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditName("");
  };

  const saveEdit = async (productId: number) => {
    if (!editName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du produit est requis",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateCategoryProduct(productId, { name: editName.trim() });
      await loadProducts();
      setEditingProduct(null);
      setEditName("");
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le produit",
        variant: "destructive",
      });
    }
  };

  // ---------- image ----------
  const handleImageUpload = async (file: File, productId?: number) => {
    if (!file) return;
    try {
      setUploadingImage(productId || "new");
      const imageUrl = await uploadImage(file);

      if (productId) {
        await updateCategoryProduct(productId, { image: imageUrl });
        await loadProducts();
      } else {
        return imageUrl;
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteCategoryProduct(productId);
      await loadProducts();
      queryClient.invalidateQueries({ queryKey: ["category-status"] });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  const handleStockUpdate = async (productId: number, stockDisponible: number) => {
    try {
      await updateCategoryProductStock(productId, stockDisponible);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stockDisponible } : p
        )
      );
      queryClient.invalidateQueries({ queryKey: ["category-status"] });
      toast({
        title: "Succès",
        description: "Stock mis à jour avec succès.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le stock",
        variant: "destructive",
      });
      throw new Error("Stock update failed");
    }
  };

  // ---------- add product ----------
  const startAddProduct = () => {
    if (!isAdmin) return;
    setIsAddingProduct(true);
    setNewProductName("");
    setNewReferenceInput("");
    setNewProductReferences([]);
    setNewProductRating(0);
    setNewProductStockDisponible("0");
    setNewProductSeuilAlerte("0");
    // Reset Tarif fields
    setTarifPrixAchatBrut("");
    setTarifRemiseAchat("0");
    setTarifTVA("19");
    setTarifNetAchatTTC("0");
    // Reset vehicle models (using numeric IDs)
    setNewProductVehicleModelIds([]);
    setVehicleSearchQuery("");
    if (newProductFileInputRef.current) {
      newProductFileInputRef.current.value = "";
    }
  };

  const cancelAddProduct = () => {
    setIsAddingProduct(false);
    setNewProductName("");
    setNewReferenceInput("");
    setNewProductReferences([]);
    setNewProductRating(0);
    setNewProductStockDisponible("0");
    setNewProductSeuilAlerte("0");
    // Reset Tarif fields
    setTarifPrixAchatBrut("");
    setTarifRemiseAchat("0");
    setTarifTVA("19");
    setTarifNetAchatTTC("0");
    // Reset vehicle models (using numeric IDs)
    setNewProductVehicleModelIds([]);
    setVehicleSearchQuery("");
    if (newProductFileInputRef.current) {
      newProductFileInputRef.current.value = "";
    }
  };

  const handleAddReferenceValue = () => {
    const value = newReferenceInput.trim();
    if (!value) return;
    setNewProductReferences((prev) =>
      prev.includes(value) ? prev : [...prev, value]
    );
    setNewReferenceInput("");
  };

  const createProduct = async () => {
    if (!categorySlug) return;

    if (!newProductName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du produit est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      let imageUrl: string | undefined;

      if (newProductFileInputRef.current?.files?.[0]) {
        imageUrl = await uploadImage(newProductFileInputRef.current.files[0]);
      }

      const prixNeveux = Number.isFinite(tarifPrixNeveuxComputed) ? Math.round(tarifPrixNeveuxComputed * 100) / 100 : undefined;
      const stockDisponible = Math.max(0, Math.floor(Number(newProductStockDisponible) || 0));
      const seuilAlerte = Math.max(0, Math.floor(Number(newProductSeuilAlerte) || 0));
      const prixAchatBrut = parseTarifNum(tarifPrixAchatBrut);
      const remiseAchat = parsePercent(tarifRemiseAchat);
      const tvaPercent = parsePercent(tarifTVA);
      const margePercent = parsePercent(tarifNetAchatTTC);
      const netAchatHTVA = Number.isFinite(tarifNetAchatHTVAComputed) ? tarifNetAchatHTVAComputed : null;
      const netAchatTTC = Number.isFinite(tarifNetAchatTTCComputed) ? tarifNetAchatTTCComputed : null;
      // Include both current reference input and values added via "+" (so reference is sent even if user didn't click +)
      const referenceParts = [newReferenceInput.trim(), ...newProductReferences].filter(Boolean);
      const referenceRaw = referenceParts.join(", ").trim();
      const payload: any = {
        category_slug: categorySlug,
        name: newProductName.trim(),
        ...(imageUrl && { image: imageUrl }),
        reference: referenceRaw || undefined,
        rating: newProductRating,
        vehicle_model_ids: newProductVehicleModelIds.length > 0 ? newProductVehicleModelIds : undefined,
        ...(prixNeveux !== undefined && { prix_neveux: prixNeveux }),
        stockDisponible,
        seuilAlerte,
        prix_achat_brut: Number.isFinite(prixAchatBrut) ? prixAchatBrut : null,
        remise_achat_percent: Number.isFinite(remiseAchat) ? remiseAchat : null,
        net_achat_htva: Number.isFinite(tarifNetAchatHTVAComputed) ? tarifNetAchatHTVAComputed : null,
        tva_percent: Number.isFinite(tvaPercent) ? tvaPercent : null,
        net_achat_ttc: Number.isFinite(tarifNetAchatTTCComputed) ? tarifNetAchatTTCComputed : null,
        marge_percent: Number.isFinite(margePercent) ? margePercent : null,
      };
      console.log('[CatPage] Submit:', { stockDisponible, seuilAlerte, reference: payload.reference, payload });

      await createCategoryProduct(payload);
      await loadProducts();
      queryClient.invalidateQueries({ queryKey: ["category-status"] });
      cancelAddProduct();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit",
        variant: "destructive",
      });
    }
  };

  // ---------- vehicle models helpers ----------
  const handleVehicleModelToggle = (modelId: number) => {
    setNewProductVehicleModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleRemoveVehicleModel = (modelId: number) => {
    setNewProductVehicleModelIds((prev) => prev.filter((id) => id !== modelId));
  };

  // Group models by marque (brand) - only use validated models
  // Note: Fetches all models via getAllVehicleModels() (Kia + Hyundai)
  // Root cause fix: Filter out invalid/test data (BB, UGF, Object, etc.) before grouping
  const groupedModels = allVehicleModels
    .filter((model) => {
      // Additional runtime validation before grouping
      const id = typeof model.id === 'number' ? model.id : parseInt(String(model.id || ''), 10);
      const hasValidId = !isNaN(id) && id > 0;
      const hasValidMarque = model.marque && typeof model.marque === 'string' && model.marque.trim().length >= 3;
      const hasValidModel = model.model && typeof model.model === 'string' && model.model.trim().length >= 3;
      
      if (!hasValidId || !hasValidMarque || !hasValidModel) {
        return false;
      }
      
      // Filter out suspicious test data patterns
      const modelName = model.model.trim();
      const marqueName = model.marque.trim();
      
      // Reject short all-caps strings (BB, XCXV, etc.)
      if (/^[A-Z]{1,3}$/.test(modelName) || /^\d+$/.test(modelName)) {
        return false;
      }
      
      if (/^[A-Z]{1,3}$/.test(marqueName)) {
        return false;
      }
      
      // Reject "Object" patterns
      const lowerModel = modelName.toLowerCase();
      const lowerMarque = marqueName.toLowerCase();
      if (lowerModel === 'object' || lowerModel === '[object object]') {
        return false;
      }
      if (lowerMarque === 'object' || lowerMarque === '[object object]') {
        return false;
      }
      
      return true;
    })
    .reduce((acc, model) => {
      const marque = (model.marque || 'Other').trim();
      if (!acc[marque]) {
        acc[marque] = [];
      }
      acc[marque].push(model);
      return acc;
    }, {} as Record<string, VehicleModelData[]>);

  // Filter models by search query
  const getFilteredModels = (marque: string): VehicleModelData[] => {
    const models = groupedModels[marque] || [];
    if (!vehicleSearchQuery.trim()) return models;
    const query = vehicleSearchQuery.toLowerCase();
    return models.filter((model) => 
      model.model.toLowerCase().includes(query) || 
      model.marque.toLowerCase().includes(query)
    );
  };

  // ---------- navigation ----------
  const openProductPage = (product: CategoryProductData) => {
    if (editingProduct === product.id) return;
    const currentParams = new URLSearchParams(location.search);
    const source = currentParams.get("source");
    const brand = currentParams.get("brand");
    const modelName = currentParams.get("modelName");

    const nextParams = new URLSearchParams();
    // Always include categorySlug from route param (as requested)
    nextParams.set("categorySlug", categorySlug || "");
    // Include modelId if defined (already parsed from query)
    if (isValidModelId && modelId !== undefined) {
      nextParams.set("modelId", String(modelId));
    }
    // Include cars-flow params only if source=cars exists
    if (source === "cars" && brand && modelName) {
      nextParams.set("source", "cars");
      nextParams.set("brand", brand);
      nextParams.set("modelName", modelName);
    }

    navigate(`/acha2/${getProductSlug(product)}?${nextParams.toString()}`);
  };

  // ---------- render ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="grid place-content-center min-h-[60vh]">
          Chargement...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className={`max-w-7xl mx-auto px-4 py-8 ${categoryThemeClass}`}>
        {categorySlug && (
          <h1 className="text-3xl font-bold text-center mb-8">
            {getCategoryDisplayName(categorySlug)}
          </h1>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* product cards */}
          {products.map((product) => {
            const productSlugForPending = product.slug || getProductSlug(product);
            const pendingCount = pendingByProduct.byProductSlug?.[productSlugForPending] ?? 0;
            return (
            <React.Fragment key={product.id}>
              <CategoryProductCard
                product={product}
                pendingCount={pendingCount}
                onClick={() => openProductPage(product)}
                showAdminControls={isAdmin}
                showStatusHighlights={isAdmin}
                onImageUpload={(productId) => {
                  fileInputRefs.current.get(productId)?.click();
                }}
                onDelete={handleDeleteProduct}
                onStockUpdate={isAdmin ? handleStockUpdate : undefined}
                editingProductId={editingProduct}
                editName={editName}
                onEditNameChange={setEditName}
                onSaveEdit={() => saveEdit(product.id!)}
                onCancelEdit={cancelEdit}
                onStartEdit={() => startEdit(product)}
              />
              {/* Hidden file input for image upload */}
              {isAdmin && (
                <input
                  ref={(el) => el && fileInputRefs.current.set(product.id!, el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleImageUpload(file, product.id);
                  }}
                />
              )}
            </React.Fragment>
          );
          })}

          {/* add-product card / button (ADMIN) */}
          {isAdmin &&
            (isAddingProduct ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
                {/* image upload */}
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500">
                  {uploadingImage === "new" ? (
                    <span>Upload...</span>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-2" />
                      <label className="text-xs cursor-pointer">
                        <input
                          ref={newProductFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={() => {}}
                        />
                        Cliquer pour uploader
                      </label>
                    </>
                  )}
                </div>

                {/* name */}
                <Input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Nom du produit"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />

                {/* reference + + button */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newReferenceInput}
                      onChange={(e) => setNewReferenceInput(e.target.value)}
                      placeholder="Référence (une valeur à la fois)"
                      className="text-xs sm:text-sm h-8 sm:h-9"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleAddReferenceValue}
                      className="h-8 w-8 bg-orange-500 hover:bg-orange-600"
                    >
                      +
                    </Button>
                  </div>

                  {newProductReferences.length > 0 && (
                    <div className="text-[10px] sm:text-xs text-gray-700">
                      <span className="font-medium">Réf :</span>{" "}
                      <span>{newProductReferences[0]}</span>
                      {newProductReferences.length > 1 && (
                        <span className="text-gray-500 ml-1">
                          (+{newProductReferences.length - 1} autres)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* rating */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] sm:text-xs text-gray-600">
                    Nombre d'étoiles (0 à 5)
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewProductRating(star)}
                        className="focus:outline-none"
                      >
                        <span
                          className={`text-lg ${
                            star <= newProductRating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock disponible & Seuil d'alerte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                      Stock disponible
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={newProductStockDisponible}
                      onChange={(e) => setNewProductStockDisponible(String(Math.max(0, Number(e.target.value) || 0)))}
                      onBlur={() => {
                        const v = Number(newProductStockDisponible) || 0;
                        setNewProductStockDisponible(String(Math.max(0, Math.floor(v))));
                      }}
                      className="text-xs sm:text-sm h-8 sm:h-9"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                      Seuil d'alerte
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={newProductSeuilAlerte}
                      onChange={(e) => setNewProductSeuilAlerte(String(Math.max(0, Number(e.target.value) || 0)))}
                      onBlur={() => {
                        const v = Number(newProductSeuilAlerte) || 0;
                        setNewProductSeuilAlerte(String(Math.max(0, Math.floor(v))));
                      }}
                      className="text-xs sm:text-sm h-8 sm:h-9"
                    />
                  </div>
                </div>

                {/* Tarif section */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                    Tarif
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Prix Achat Brut
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={tarifPrixAchatBrut}
                        onChange={(e) => setTarifPrixAchatBrut(e.target.value)}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Remise Achat (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={tarifRemiseAchat}
                        onChange={(e) => setTarifRemiseAchat(e.target.value)}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Net Achat HTVA
                      </label>
                      <Input
                        readOnly
                        value={formatTarifNumber(tarifNetAchatHTVAComputed)}
                        className="text-xs sm:text-sm h-8 sm:h-9 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        TVA (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={tarifTVA}
                        onChange={(e) => setTarifTVA(e.target.value)}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Net Achat TTC
                      </label>
                      <Input
                        readOnly
                        value={formatTarifNumber(tarifNetAchatTTCComputed)}
                        className="text-xs sm:text-sm h-8 sm:h-9 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Marge (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={tarifNetAchatTTC}
                        onChange={(e) => setTarifNetAchatTTC(e.target.value)}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-gray-600 mb-1 block">
                        Prix neveux
                      </label>
                      <Input
                        readOnly
                        value={formatTarifNumber(tarifPrixNeveuxComputed)}
                        className="text-xs sm:text-sm h-8 sm:h-9 bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Compatibilité Véhicules section */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                    Compatibilité Véhicules
                  </h3>
                  
                  {loadingVehicleModels ? (
                    <p className="text-xs text-gray-500">Chargement des modèles...</p>
                  ) : vehicleModelsError ? (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      <p className="font-semibold mb-1">Erreur de chargement</p>
                      <p>{vehicleModelsError}</p>
                      <p className="mt-2 text-gray-600 italic mb-2">
                        Le produit sera visible pour tous les modèles par défaut.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🔄 Retrying vehicle models fetch...');
                          setAllVehicleModels([]); // Clear to force refetch
                          setVehicleModelsError(null);
                          // Trigger refetch by toggling isAddingProduct
                          setIsAddingProduct(false);
                          setTimeout(() => setIsAddingProduct(true), 100);
                        }}
                        className="text-xs h-7"
                      >
                        Réessayer
                      </Button>
                    </div>
                  ) : allVehicleModels.length === 0 ? (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      <p className="font-semibold mb-1">Aucun modèle disponible</p>
                      <p className="mb-2">
                        Aucun modèle de véhicule n'a été trouvé. Le produit sera visible pour tous les modèles par défaut.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🔄 Retrying vehicle models fetch...');
                          setAllVehicleModels([]);
                          setVehicleModelsError(null);
                          setIsAddingProduct(false);
                          setTimeout(() => setIsAddingProduct(true), 100);
                        }}
                        className="text-xs h-7"
                      >
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Search input */}
                      <Input
                        value={vehicleSearchQuery}
                        onChange={(e) => setVehicleSearchQuery(e.target.value)}
                        placeholder="Rechercher un modèle..."
                        className="text-xs sm:text-sm h-8 sm:h-9 mb-3"
                      />

                      {/* Models list - grouped by marque */}
                      {allVehicleModels.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                          {Object.keys(groupedModels).map((marque) => {
                            const filteredModels = getFilteredModels(marque);
                            if (filteredModels.length === 0) return null;
                            
                            return (
                              <div key={marque}>
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sticky top-0 bg-white py-1">
                                  {marque.toUpperCase()}
                                </h4>
                                <div className="space-y-2">
                                  {filteredModels.map((model) => {
                                    const modelId = typeof model.id === 'number' ? model.id : parseInt(String(model.id), 10);
                                    if (isNaN(modelId)) return null;
                                    
                                    return (
                                      <div
                                        key={modelId}
                                        className="flex items-center space-x-2 py-1"
                                      >
                                        <Checkbox
                                          id={`model-${modelId}`}
                                          checked={newProductVehicleModelIds.includes(modelId)}
                                          onCheckedChange={() => handleVehicleModelToggle(modelId)}
                                        />
                                        <label
                                          htmlFor={`model-${modelId}`}
                                          className="text-[10px] sm:text-xs text-gray-700 cursor-pointer flex-1"
                                        >
                                          {model.model}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          Aucun modèle disponible. Le produit sera visible pour tous les modèles.
                        </p>
                      )}

                      {/* Selected models badges */}
                      {newProductVehicleModelIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <p className="text-[10px] sm:text-xs text-gray-600 mb-2">
                            Modèles sélectionnés ({newProductVehicleModelIds.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {newProductVehicleModelIds.map((modelId) => {
                              const model = allVehicleModels.find(m => {
                                const id = typeof m.id === 'number' ? m.id : parseInt(String(m.id), 10);
                                return id === modelId;
                              });
                              return (
                                <div
                                  key={modelId}
                                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-[10px] sm:text-xs"
                                >
                                  <span>{model ? `${model.marque} ${model.model}` : `Model ${modelId}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVehicleModel(modelId)}
                                    className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                                    aria-label={`Retirer modèle ${modelId}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* actions */}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={createProduct}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelAddProduct}
                    className="flex-1 text-xs h-8"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={startAddProduct}
                className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 hover:border-orange-500 transition-all duration-200 p-8 flex flex-col items-center justify-center text-gray-400 hover:text-orange-500"
              >
                <Plus className="w-10 h-10 mb-2" />
                Ajouter un produit
              </button>
            ))}
        </div>

        {/* hidden file inputs for editing product images */}
        {isAdmin &&
          products.map((product) => (
            <input
              key={product.id}
              ref={(el) => el && fileInputRefs.current.set(product.id, el)}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleImageUpload(file, product.id);
              }}
            />
          ))}
      </main>

      <Footer />
    </div>
  );
};

export default CatPage;