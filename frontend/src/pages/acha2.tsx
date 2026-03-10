import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl, resolveImageUrl } from "@/utils/apiConfig";
import CategoryProductCard from "@/components/CategoryProductCard";
import { CategoryProductData } from "@/api/database";
import { updateAcha2Product, saveAcha2Product, createOrder, getSectionContent, addOffreHistorique, getPromotionById, patchPromotionStock, setPromotionStock, addOffreHistoriquePromo, decrementCategoryProductStockBySlug, updateCategoryProductStockBySlug, patchAcha2HideVehicleSelectors, getCat3PageById, getHuileEauAdditif, addHuileEauAdditifItem, updateCat3Item, updateCat2Card, getEquivalentProducts, getCat2CardById, type Cat3Item, type EquivalentProductData } from "@/api/database";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  X,
  Trash2,
  Plus,
  Package,
  Eye,
  EyeOff,
  Tag,
  ImagePlus,
  Upload,
  ShoppingCart,
  Zap,
  Check,
  Shield,
  Truck,
  Star,
  Minus,
} from "lucide-react";

const Acha2 = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  const isDev = import.meta.env.DEV;

  // Cars flow query params (optional)
  const queryParams = new URLSearchParams(location.search);
  const source = queryParams.get("source") || "";
  const brand = queryParams.get("brand") || "";
  const modelIdFromQuery = queryParams.get("modelId") || "";
  const modelNameFromQuery = queryParams.get("modelName") || "";
  const categorySlugFromQuery = queryParams.get("categorySlug") || "";
  const promoIdParam = queryParams.get("promoId");
  const promoId = promoIdParam ? parseInt(promoIdParam, 10) : null;
  const isPromoOrigin = promoId != null && Number.isFinite(promoId);

  const cat3IdParam = queryParams.get("cat3Id") || "";
  const itemIdParam = queryParams.get("itemId") || "";
  const isCat3Source = (queryParams.get("source") || "") === "cat3" && Boolean(cat3IdParam) && Boolean(itemIdParam);

  const cat2ParentId = queryParams.get("cat2ParentId") || "";
  const cat2CardId = queryParams.get("cat2CardId") || "";

  const isCarsFlow =
    source === "cars" &&
    Boolean(brand) &&
    Boolean(modelIdFromQuery) &&
    Boolean(modelNameFromQuery) &&
    Boolean(categorySlugFromQuery);

  const [cat2Meta, setCat2Meta] = useState<{
    title: string;
    reference?: string | null;
    image?: string | null;
    stockDisponible?: number;
    seuilAlerte?: number;
    rating?: number | null;
    prixNeveux?: number | null;
  } | null>(null);
  const [cat3Item, setCat3Item] = useState<Cat3Item | null>(null);
  const [cat3NotFound, setCat3NotFound] = useState(false);
  const [addedToHuileEauAdditif, setAddedToHuileEauAdditif] = useState(false);
  const [addingToHuileEauAdditif, setAddingToHuileEauAdditif] = useState(false);

  // Format price to remove trailing zeros
  const formatProductPrice = (rawPrice?: number | string): string => {
    if (rawPrice === undefined || rawPrice === null) return "";
    const num = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
    if (!Number.isFinite(num)) return String(rawPrice);
    // if integer -> no decimals
    if (Number.isInteger(num)) return num.toString();
    // otherwise remove trailing zeros after decimal
    return num.toString().replace(/\.?0+$/, "");
  };

  // Helper function to get auth headers for admin requests
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add x-user header if user is available
    if (user) {
      headers['x-user'] = JSON.stringify({ id: user.id });
    }
    
    return headers;
  };

  // Get product slug from route params
  const { slug } = useParams<{ slug: string }>();
  const productSlug = slug || "";
  
  // Product name state (loaded from API)
  const [productName, setProductName] = useState<string>("");
  // Current product ID state (for excluding from equivalents)
  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  
  // Product data state (using fields ending with "2")
  const [quantity2, setQuantity2] = useState<number>(0);
  const [references2, setReferences2] = useState<string[]>([]);
  const [description2, setDescription2] = useState<string>("");
  const [price2, setPrice2] = useState<string>("0.000");
  const [images2, setImages2] = useState<string[]>([]);
  const [modeles, setModeles] = useState<string[]>([]);
  const [newModele, setNewModele] = useState("");
  const [showModeles, setShowModeles] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // New fields for refactored UI - using database column names
  const [caracteristiques2, setCaracteristiques2] = useState<string>("");
  const [custom_content2, setCustom_content2] = useState<string>("");
  const [references_constructeur2, setReferences_constructeur2] = useState<string>("");
  // Category product fields (reference, rating, stock from category_products)
  const [categoryReference, setCategoryReference] = useState<string | null>(null);
  const [categoryRating, setCategoryRating] = useState<number | null>(null);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(0);
  const [promoStock, setPromoStock] = useState<number | null>(null);
  const [promoRefState, setPromoRefState] = useState<string>("");
  const [promoDataLoaded, setPromoDataLoaded] = useState(false);
  const [isPromoVenteSaving, setIsPromoVenteSaving] = useState(false);
  const [isOfflineSaleSaving, setIsOfflineSaleSaving] = useState(false);
  const [hideVehicleSelectors, setHideVehicleSelectors] = useState(false);
  const [compatibleVehicles, setCompatibleVehicles] = useState<Array<{ brand: string; model: string }>>([]);
  const [isTogglingHideSelectors, setIsTogglingHideSelectors] = useState(false);
  const [avisClients, setAvisClients] = useState<{
    average: number;
    count: number;
    reviews: Array<{ author: string; rating: number; comment: string }>;
  }>({ average: 0, count: 0, reviews: [] });
  const [isEditingTechnicalDetails, setIsEditingTechnicalDetails] = useState(false);
  const [isEditingCustomContent, setIsEditingCustomContent] = useState(false);
  const [isEditingManufacturerRefs, setIsEditingManufacturerRefs] = useState(false);
  const [isEditingAvisClients, setIsEditingAvisClients] = useState(false);
  const [tempTechnicalDetails, setTempTechnicalDetails] = useState<Record<string, string>>({});
  const [tempCustomContent, setTempCustomContent] = useState<string>("");
  const [tempManufacturerRefs, setTempManufacturerRefs] = useState<string>("");
  const [tempAvisClients, setTempAvisClients] = useState<{
    average: number;
    count: number;
    reviews: Array<{ author: string; rating: number; comment: string }>;
  }>({ average: 0, count: 0, reviews: [] });
  const [quantity, setQuantity] = useState<number>(1); // For quantity selector UI
  
  // Discount state (acha2 isolated fields)
  const [hasDiscount2, setHasDiscount2] = useState<boolean>(false);
  const [discountType2, setDiscountType2] = useState<string>("percentage");
  const [discountValue2, setDiscountValue2] = useState<number>(0);
  const [discountedPrice2, setDiscountedPrice2] = useState<number | null>(null);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  
  // Order modal state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [orderForm, setOrderForm] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    wilaya: "",
    delegation: "",
    quantite: 1,
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderErrors, setOrderErrors] = useState<Partial<Record<keyof typeof orderForm, string>>>({});

  // Editing states
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newReference, setNewReference] = useState("");
  const [tempQuantity, setTempQuantity] = useState(quantity2);
  const [tempDescription, setTempDescription] = useState(description2);
  const [tempPrice, setTempPrice] = useState(price2);
  const [isSaving, setIsSaving] = useState(false);

  // Promo stock edit (Nos offres du moment - acha2)
  const [isEditingPromoStock, setIsEditingPromoStock] = useState(false);
  const [tempPromoStock, setTempPromoStock] = useState(0);
  const [isPromoStockSaving, setIsPromoStockSaving] = useState(false);

  // Marque/Modèle selector state
  interface Marque {
    id: number;
    name: string;
  }
  interface Modele {
    id: number;
    name: string;
    marque_id: number;
  }
  interface VehicleModel {
    id: number;
    marque: string;
    model: string;
  }

  const marquesListBase = useMemo<Marque[]>(() => [
    { id: 1, name: "Kia" },
    { id: 2, name: "Hyundai" },
  ], []);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [modelesList, setModelesList] = useState<Modele[]>([]);

  // Build allowed brands/models from compatibleVehicles for Marque/Modèle filtering
  const { allowedBrands, allowedModelsByBrand } = useMemo(() => {
    const brands = [...new Set(compatibleVehicles.map((v) => (v.brand || "").trim()).filter(Boolean))];
    const byBrand = new Map<string, string[]>();
    for (const v of compatibleVehicles) {
      const b = (v.brand || "").trim();
      const m = (v.model || "").trim();
      if (b && m) {
        const key = b.toLowerCase();
        const arr = byBrand.get(key) || [];
        if (!arr.some((x) => x.toLowerCase() === m.toLowerCase())) arr.push(m);
        byBrand.set(key, arr);
      }
    }
    return { allowedBrands: brands, allowedModelsByBrand: byBrand };
  }, [compatibleVehicles]);

  // Filter marques to compatibleVehicles when non-empty; otherwise show all
  const marquesList = useMemo(() => {
    if (compatibleVehicles.length === 0) return marquesListBase;
    const allowed = new Set(allowedBrands.map((b) => b.toLowerCase()));
    return marquesListBase.filter((m) => allowed.has((m.name || "").trim().toLowerCase()));
  }, [compatibleVehicles, allowedBrands, marquesListBase]);
  const [selectedMarqueId, setSelectedMarqueId] = useState<number | null>(null);
  const [selectedModeleId, setSelectedModeleId] = useState<number | null>(null);
  
  // Store selected marque and modele objects for display in modal
  const [selectedMarque, setSelectedMarque] = useState<{ id: number; name: string } | null>(null);
  const [selectedModele, setSelectedModele] = useState<{ id: number; name: string; marque_id: number } | null>(null);
  const [loadingModeles, setLoadingModeles] = useState(false);

  // Admin edit modals state
  const [showAddMarqueModal, setShowAddMarqueModal] = useState(false);
  const [showEditMarqueModal, setShowEditMarqueModal] = useState(false);
  const [showAddModeleModal, setShowAddModeleModal] = useState(false);
  const [showEditModeleModal, setShowEditModeleModal] = useState(false);
  const [showDeleteMarqueConfirm, setShowDeleteMarqueConfirm] = useState(false);
  const [showDeleteModeleConfirm, setShowDeleteModeleConfirm] = useState(false);
  const [editingMarque, setEditingMarque] = useState<Marque | null>(null);
  const [editingModele, setEditingModele] = useState<Modele | null>(null);
  const [deletingMarque, setDeletingMarque] = useState<Marque | null>(null);
  const [deletingModele, setDeletingModele] = useState<Modele | null>(null);
  const [tempMarqueName, setTempMarqueName] = useState("");
  const [tempModeleName, setTempModeleName] = useState("");
  const [isSavingMarque, setIsSavingMarque] = useState(false);
  const [isSavingModele, setIsSavingModele] = useState(false);

  // Admin marques/modeles management state
  const [allMarques, setAllMarques] = useState<Marque[]>([]);
  const [allModeles, setAllModeles] = useState<Modele[]>([]);
  const [productMarques, setProductMarques] = useState<Marque[]>([]);
  const [productModeles, setProductModeles] = useState<Modele[]>([]);
  const [adminSelectedMarqueForModeles, setAdminSelectedMarqueForModeles] = useState<number | null>(null);
  const [newMarqueName, setNewMarqueName] = useState("");
  const [newModeleName, setNewModeleName] = useState("");
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(false);

  // Image carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Equivalent products state
  const [equivalentProducts, setEquivalentProducts] = useState<EquivalentProductData[]>([]);
  const isHydratingRef = useRef(false);
  const lastHydratedSlugRef = useRef<string>("");

  const fetchVehicleModels = useCallback(async () => {
    try {
      setLoadingModeles(true);
      const response = await fetch(`${getApiBaseUrl()}/vehicleModels`, { cache: "no-store" });
      if (!response.ok) {
        setVehicleModels([]);
        return;
      }
      const result = await response.json().catch(() => null);
      const items: VehicleModel[] = Array.isArray(result)
        ? result
        : Array.isArray((result as any)?.vehicleModels)
          ? (result as any).vehicleModels
          : Array.isArray((result as any)?.items)
            ? (result as any).items
            : Array.isArray((result as any)?.data)
              ? (result as any).data
              : [];
      setVehicleModels(items);
      // console.log("[vehicleModels] loaded:", items);
    } catch (error) {
      console.error("Error loading vehicle models:", error);
      setVehicleModels([]);
    } finally {
      setLoadingModeles(false);
    }
  }, []);

  // Load all vehicle models (backend) once on mount
  useEffect(() => {
    fetchVehicleModels();
  }, [fetchVehicleModels]);

  // If opened from Cat2 card, load full card from API (persisted Cat2 cards)
  useEffect(() => {
    const loadCat2Meta = async () => {
      if (!cat2ParentId || !cat2CardId) {
        setCat2Meta(null);
        return;
      }

      const numericId = parseInt(cat2CardId, 10);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        setCat2Meta(null);
        return;
      }

      try {
        const card = await getCat2CardById(numericId);
        if (!card) {
          setCat2Meta(null);
          return;
        }
        setCat2Meta({
          title: card.name,
          reference: card.reference ?? undefined,
          image: card.image ?? undefined,
          stockDisponible: card.stockDisponible,
          seuilAlerte: card.seuilAlerte,
          rating: card.rating ?? undefined,
          prixNeveux: card.prixNeveux ?? undefined,
        });
        // Ensure productName is set for order payload when /api/acha2/:slug returned null (Cat2 products)
        setProductName((prev) => (prev && prev.trim() ? prev : card.name));
        if (isDev) console.log("[Acha2] source-specific fetch executed (Cat2)");
      } catch (e) {
        console.error("Error loading Cat2 meta:", e);
        setCat2Meta(null);
      }
    };

    loadCat2Meta();
  }, [cat2ParentId, cat2CardId]);

  // Fetch promo data when page is promotion-originated (promoId in URL)
  useEffect(() => {
    if (!isPromoOrigin || promoId == null) {
      setPromoDataLoaded(true);
      return;
    }
    let cancelled = false;
    const loadPromo = async () => {
      const promo = await getPromotionById(promoId);
      if (cancelled) return;
      setPromoDataLoaded(true);
      if (promo) {
        const stock = promo.stock ?? promo.stock_disponible;
        setPromoStock(stock != null ? Number(stock) : null);
        setPromoRefState((promo.reference || promo.ref || "").trim());
      }
    };
    loadPromo();
    return () => { cancelled = true; };
  }, [isPromoOrigin, promoId]);

  const displayProductName = cat3Item?.title || cat2Meta?.title || productName || "Produit";

  // Single source of truth for displayed "Réf" + equivalents.
  // Priority: Cat3 item → promo reference → Cat2 meta → category_products.reference
  const effectiveReference = useMemo(
    () => (cat3Item?.reference || promoRefState || cat2Meta?.reference || categoryReference || "").trim(),
    [cat3Item?.reference, promoRefState, cat2Meta?.reference, categoryReference]
  );

  const displayReferenceText = effectiveReference || "Référence indisponible";

  // Use Cat2 image as fallback if Acha2 has no images
  useEffect(() => {
    if (!cat2Meta?.image) return;
    setImages2((prev) => (prev && prev.length > 0 ? prev : [resolveImageUrl(cat2Meta.image)]));
  }, [cat2Meta?.image]);

  // When opened from Cat2 card, apply persisted price/stock/rating/seuil from cat2Meta
  useEffect(() => {
    if (!cat2Meta || !cat2ParentId || !cat2CardId) return;
    if (cat2Meta.prixNeveux != null && Number.isFinite(Number(cat2Meta.prixNeveux))) {
      setPrice2(String(cat2Meta.prixNeveux));
      setTempPrice(String(cat2Meta.prixNeveux));
    }
    if (cat2Meta.stockDisponible != null && Number.isFinite(cat2Meta.stockDisponible)) {
      const stock = Math.max(0, cat2Meta.stockDisponible);
      setQuantity2(stock);
      setTempQuantity(stock);
      setQuantity(stock > 0 ? 1 : 0);
    }
    if (cat2Meta.seuilAlerte != null && Number.isFinite(cat2Meta.seuilAlerte)) {
      setSeuilAlerte(Math.max(0, cat2Meta.seuilAlerte));
    }
    if (cat2Meta.rating != null && Number.isFinite(Number(cat2Meta.rating))) {
      setCategoryRating(Math.min(5, Math.max(0, Math.floor(Number(cat2Meta.rating)))));
    }
  }, [cat2Meta, cat2ParentId, cat2CardId]);

  // Update selectedMarque object when selectedMarqueId changes
  useEffect(() => {
    if (selectedMarqueId !== null) {
      const marque = marquesList.find(m => m.id === selectedMarqueId);
      setSelectedMarque(marque ? { id: marque.id, name: marque.name } : null);
    } else {
      setSelectedMarque(null);
    }
  }, [selectedMarqueId, marquesList]);

  // Reset model selection when marque changes
  useEffect(() => {
    setSelectedModeleId(null);
  }, [selectedMarqueId]);

  // Compute modeles list from vehicleModels when marque is selected
  useEffect(() => {
    if (!selectedMarqueId) {
      setModelesList([]);
      setSelectedModeleId(null);
      return;
    }

    const marqueName = selectedMarqueId === 1 ? "Kia" : "Hyundai";
    const normalizedMarque = marqueName.trim().toLowerCase();

    const byName = new Map<string, Modele>();
    const allowedForBrand = compatibleVehicles.length > 0
      ? (allowedModelsByBrand.get(normalizedMarque) || [])
      : null;

    for (const vm of vehicleModels) {
      const vmMarque = (vm?.marque ?? "").trim().toLowerCase();
      if (vmMarque !== normalizedMarque) continue;

      const name = (vm?.model ?? "").trim();
      if (!name) continue;

      if (allowedForBrand !== null) {
        const modelMatch = allowedForBrand.some(
          (a) => a.trim().toLowerCase() === name.toLowerCase()
        );
        if (!modelMatch) continue;
      }

      const key = name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { id: vm.id, name, marque_id: selectedMarqueId });
      }
    }

    const nextModeles = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    setModelesList(nextModeles);
  }, [selectedMarqueId, vehicleModels, compatibleVehicles, allowedModelsByBrand]);

  // If user arrived from cars flow, pre-select marque/modèle (selectors may be hidden)
  useEffect(() => {
    if (!isCarsFlow) return;
    const desiredMarqueId = brand === "Kia" ? 1 : brand === "Hyundai" ? 2 : null;
    if (desiredMarqueId !== null) {
      setSelectedMarqueId(desiredMarqueId);
    }
  }, [isCarsFlow, brand]);

  useEffect(() => {
    if (!isCarsFlow) return;
    const desiredModeleId = parseInt(modelIdFromQuery, 10);
    if (!Number.isFinite(desiredModeleId) || desiredModeleId <= 0) return;
    // Only set once the computed modelesList contains the ID (prevents race with marque reset)
    if (modelesList.some((m) => m.id === desiredModeleId)) {
      setSelectedModeleId(desiredModeleId);
    }
  }, [isCarsFlow, modelIdFromQuery, modelesList]);

  // Update selectedModele object when selectedModeleId changes
  useEffect(() => {
    if (selectedModeleId !== null) {
      const modele = modelesList.find(m => m.id === selectedModeleId);
      setSelectedModele(modele ? { id: modele.id, name: modele.name, marque_id: modele.marque_id } : null);
    } else {
      setSelectedModele(null);
    }
  }, [selectedModeleId, modelesList]);

  // Load admin data (all marques/modeles and product-linked ones)
  useEffect(() => {
    const loadAdminData = async () => {
      if (!isAdmin || !productSlug) return;

      try {
        setIsLoadingAdminData(true);
        
        // Load all marques
        const marquesResponse = await fetch(`${getApiBaseUrl()}/admin/marques`, { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        if (marquesResponse.ok) {
          const marquesResult = await marquesResponse.json();
          if (marquesResult.success) setAllMarques(marquesResult.marques || []);
        } else if (marquesResponse.status === 401 || marquesResponse.status === 403) {
          console.error('[Admin] Unauthorized access to marques');
        }

        // Load product marques
        const productMarquesResponse = await fetch(`${getApiBaseUrl()}/admin/products/${productSlug}/marques`, { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        if (productMarquesResponse.ok) {
          const productMarquesResult = await productMarquesResponse.json();
          if (productMarquesResult.success) setProductMarques(productMarquesResult.marques || []);
        } else if (productMarquesResponse.status === 401 || productMarquesResponse.status === 403) {
          console.error('[Admin] Unauthorized access to product marques');
        }

        // Load product modeles
        const productModelesResponse = await fetch(`${getApiBaseUrl()}/admin/products/${productSlug}/modeles`, { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        if (productModelesResponse.ok) {
          const productModelesResult = await productModelesResponse.json();
          if (productModelesResult.success) setProductModeles(productModelesResult.modeles || []);
        } else if (productModelesResponse.status === 401 || productModelesResponse.status === 403) {
          console.error('[Admin] Unauthorized access to product modeles');
        }
        
      } catch (error) {
        console.error("Error loading admin marques/modeles data:", error);
      } finally {
        setIsLoadingAdminData(false);
      }
    };

    loadAdminData();
  }, [isAdmin, productSlug]);

  // Load modeles for selected marque in admin UI
  useEffect(() => {
    const loadAdminModeles = async () => {
      if (!isAdmin || !adminSelectedMarqueForModeles) {
        setAllModeles([]);
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/admin/modeles?marqueId=${adminSelectedMarqueForModeles}`, { cache: 'no-store' });
        if (response.ok) {
          const result = await response.json();
          if (result.success) setAllModeles(result.modeles || []);
        }
      } catch (error) {
        console.error("Error loading admin modeles:", error);
      }
    };

    loadAdminModeles();
  }, [isAdmin, adminSelectedMarqueForModeles]);

  // Load product data from API (or from Cat3/Cat2 when source-specific params present)
  const loadProductCancelledRef = useRef(false);
  useEffect(() => {
    loadProductCancelledRef.current = false;
    const loadProduct = async () => {
      if (!productSlug) {
        setIsLoading(false);
        return;
      }
      isHydratingRef.current = true;
      if (lastHydratedSlugRef.current !== productSlug) {
        // Reset product-specific state when slug changes to avoid stale carry-over.
        setCurrentProductId(null);
        setEquivalentProducts([]);
        setDescription2("");
        setTempDescription("");
        setReferences2([]);
        setImages2([]);
        setCustom_content2("");
        setReferences_constructeur2("");
        setTempCustomContent("");
        setTempManufacturerRefs("");
        setCaracteristiques2("");
        setTempTechnicalDetails({});
        setAvisClients({ average: 0, count: 0, reviews: [] });
        setTempAvisClients({ average: 0, count: 0, reviews: [] });
        lastHydratedSlugRef.current = productSlug;
      }

      const hasCat3Params = isCat3Source && cat3IdParam && itemIdParam;
      const hasCat2Params = Boolean(cat2ParentId && cat2CardId);
      if (isDev) {
        console.log("[Acha2] source resolution:", {
          slug: productSlug,
          source: hasCat3Params ? "cat3" : hasCat2Params ? "cat2" : "generic",
          cat3Id: cat3IdParam || null,
          itemId: itemIdParam || null,
          cat2ParentId: cat2ParentId || null,
          cat2CardId: cat2CardId || null,
        });
      }

      if (!isCat3Source) {
        setCat3Item(null);
        setCat3NotFound(false);
      }

      if (hasCat3Params) {
        try {
          setIsLoading(true);
          setCat3Item(null);
          setCat3NotFound(false);
          setEquivalentProducts([]);
          const page = await getCat3PageById(cat3IdParam);
          if (loadProductCancelledRef.current) return;
          const itemIdNum = parseInt(itemIdParam, 10);
          const item =
            page && Array.isArray(page.items)
              ? page.items.find((i) => i.id === itemIdNum)
              : undefined;
          if (item) {
            if (isDev) console.log("[Acha2] source-specific fetch executed (Cat3)");
            setProductName(item.title);
            const stockVal = item.stock != null && Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0;
            setQuantity2(stockVal);
            setQuantity(stockVal > 0 ? 1 : 0);
            setCategoryReference(item.reference ?? null);
            setSeuilAlerte(item.alertThreshold ?? 0);
            setImages2(item.image ? [item.image] : []);
            setTempQuantity(stockVal);
            setCurrentProductId(null);
            setCat3Item(item);
            setCat3NotFound(false);
            // Load Acha2-persisted fields from Cat3 item (so they survive refresh)
            const customContent = item.custom_content2 ?? "";
            const refsConstructeur = item.references_constructeur2 ?? "";
            const avis = item.avis_clients ?? { average: 0, count: 0, reviews: [] };
            const reviewsList = Array.isArray(avis.reviews) ? avis.reviews : [];
            const avisNormalized = {
              average: typeof avis.average === "number" ? avis.average : 0,
              count: typeof avis.count === "number" ? avis.count : 0,
              reviews: reviewsList.map((r: { author?: string; rating?: number; comment?: string }) => ({
                author: typeof r?.author === "string" ? r.author : "",
                rating: typeof r?.rating === "number" ? r.rating : 0,
                comment: typeof r?.comment === "string" ? r.comment : "",
              })),
            };
            setCustom_content2(customContent);
            setReferences_constructeur2(refsConstructeur);
            setTempCustomContent(customContent);
            setTempManufacturerRefs(refsConstructeur);
            setAvisClients(avisNormalized);
            setTempAvisClients(avisNormalized);
            const priceVal = item.price2 != null && item.price2 !== ""
              ? String(item.price2)
              : (item.prix_neveux != null ? String(item.prix_neveux) : "0");
            setPrice2(priceVal);
            setTempPrice(priceVal);
            if (isDev) console.log("[Acha2] final merged state: Cat3");
          } else {
            setCat3NotFound(true);
            setCat3Item(null);
          }
        } catch (e) {
          console.error("Error loading Cat3 item:", e);
          setCat3NotFound(true);
          setCat3Item(null);
        } finally {
          setIsLoading(false);
          isHydratingRef.current = false;
        }
        return;
      }

      // Re-read URL: if source-specific params (Cat3 or Cat2) are present, do NOT fetch generic (would overwrite after refresh)
      const currentSearch = typeof window !== "undefined" ? window.location.search : "";
      const currentParams = new URLSearchParams(currentSearch);
      const urlHasCat3 = currentParams.get("source") === "cat3" && currentParams.get("cat3Id") && currentParams.get("itemId");
      const urlHasCat2 = Boolean(currentParams.get("cat2ParentId") && currentParams.get("cat2CardId"));
      if (urlHasCat3 || urlHasCat2) {
        if (isDev) console.log("[Acha2] generic fallback skipped (source data complete)");
        setIsLoading(false);
        isHydratingRef.current = false;
        return;
      }

      try {
        setIsLoading(true);
        setEquivalentProducts([]);
        const url = `${getApiBaseUrl()}/acha2/${encodeURIComponent(productSlug)}`;
        const response = await fetch(url, { cache: "no-store" });
        if (loadProductCancelledRef.current) return;

        if (!response.ok) {
          const text = await response.text();
          console.error("❌ Failed to load acha2 product", response.status, text);
          toast({
            title: "Erreur",
            description: `Impossible de charger le produit (${response.status})`,
            variant: "destructive",
          });
          return;
        }

        const result = await response.json();
        if (loadProductCancelledRef.current) return;

        // Do not overwrite state with generic data if URL indicates Cat3 or Cat2 (e.g. response arrived after source load or race)
        const applySearch = typeof window !== "undefined" ? window.location.search : "";
        const applyParams = new URLSearchParams(applySearch);
        const applyHasCat3 = applyParams.get("source") === "cat3" && applyParams.get("cat3Id") && applyParams.get("itemId");
        const applyHasCat2 = Boolean(applyParams.get("cat2ParentId") && applyParams.get("cat2CardId"));
        if (applyHasCat3 || applyHasCat2) {
          if (isDev) console.log("[Acha2] generic fallback skipped (source data complete)");
        } else if (result.success && result.data) {
          if (isDev) console.log("[Acha2] generic fallback executed");
          // Store product name for saving operations
          const loadedProductName = result.data.name;
          setProductName(loadedProductName);

          // category_products.id (used for equivalent refs exclusion)
          const loadedCategoryProductId = Number((result.data as any).categoryProductId);
          setCurrentProductId(Number.isFinite(loadedCategoryProductId) ? loadedCategoryProductId : null);
          
          const loadedQuantity2 = result.data.quantity2 ?? 0;
          setQuantity2(loadedQuantity2);
          // Initialize quantity selector to 1, capped at available stock
          setQuantity(loadedQuantity2 > 0 ? 1 : 0);
          setReferences2(Array.isArray(result.data.references2) ? result.data.references2 : []);
          setDescription2(result.data.description2 ?? "");
          setPrice2(result.data.price2?.toString() ?? "0.000");
          setImages2(Array.isArray(result.data.images2) ? result.data.images2 : []);
          // Load discount data from API (BACKEND IS SOURCE OF TRUTH)
          setHasDiscount2(result.data.has_discount2 ?? false);
          setDiscountType2(result.data.discount_type2 || "percentage");
          setDiscountValue2(result.data.discount_value2 ?? 0);
          setDiscountedPrice2(result.data.discounted_price2 ?? null);
          // Note: modeles are loaded from global_settings, not from product
          setTempQuantity(result.data.quantity2 ?? 0);
          setTempDescription(result.data.description2 ?? "");
          setTempPrice(result.data.price2?.toString() ?? "0.000");
          // Load new fields if they exist - using database column names
          const caracteristiques = result.data.caracteristiques2 || '';
          try {
            setCaracteristiques2(caracteristiques);
            setTempTechnicalDetails(typeof caracteristiques === 'string' && caracteristiques ? JSON.parse(caracteristiques) : {});
          } catch (e) {
            setCaracteristiques2(caracteristiques);
            setTempTechnicalDetails({});
          }
          // Load custom_content2 and references_constructeur2 from API
          const loadedCustomContent = result.data.custom_content2 || "";
          const loadedReferencesConstructeur = result.data.references_constructeur2 || "";
          setCustom_content2(loadedCustomContent);
          setReferences_constructeur2(loadedReferencesConstructeur);
          setTempCustomContent(loadedCustomContent);
          // Load reference and rating from category_products
          setCategoryReference(result.data.reference || null);
          setCategoryRating(result.data.rating !== null && result.data.rating !== undefined ? parseInt(result.data.rating) : null);
          setSeuilAlerte(result.data.seuilAlerte ?? 0);
          setTempManufacturerRefs(loadedReferencesConstructeur);
          // Load avis_clients from API
          const loadedAvisClients = result.data.avis_clients || { average: 0, count: 0, reviews: [] };
          setAvisClients(loadedAvisClients);
          setTempAvisClients(loadedAvisClients);
          setHideVehicleSelectors(result.data.hideVehicleSelectors === true);
          setCompatibleVehicles(Array.isArray(result.data.compatibleVehicles) ? result.data.compatibleVehicles : []);
          if (isDev) console.log("[Acha2] loaded product (generic) – editable sections", {
            caracteristiques2: result.data.caracteristiques2 ? `${String(result.data.caracteristiques2).length} chars` : "empty",
            custom_content2: result.data.custom_content2 ? `${String(result.data.custom_content2).length} chars` : "empty",
            references_constructeur2: result.data.references_constructeur2 ? `${String(result.data.references_constructeur2).length} chars` : "empty",
            avis_clients: result.data.avis_clients?.reviews?.length ?? 0,
          });
          if (isDev) console.log("[Acha2] final merged state: generic");
        }
      } catch (error) {
        console.error("❌ Error loading product:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le produit",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        isHydratingRef.current = false;
      }
    };

    if (productSlug) {
      loadProduct();
    }
    return () => {
      loadProductCancelledRef.current = true;
    };
  }, [productSlug, toast, isCat3Source, cat3IdParam, itemIdParam, cat2ParentId, cat2CardId]);

  // Source-aware hydration from /api/acha2/:slug for Cat2/Cat3:
  // fill only missing fields and never overwrite source-owned state.
  useEffect(() => {
    if (!productSlug) return;
    const hasSourceContext = isCat3Source || Boolean(cat2ParentId && cat2CardId);
    if (!hasSourceContext) return;
    let cancelled = false;
    const hydrateMissingFields = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(productSlug)}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = await res.json().catch(() => null);
        const d = json?.success ? json?.data : null;
        if (!d || cancelled) return;

        const resolvedCategoryProductId = Number(d.categoryProductId);
        if (Number.isFinite(resolvedCategoryProductId) && resolvedCategoryProductId > 0) {
          setCurrentProductId((prev) => prev ?? resolvedCategoryProductId);
        }

        setDescription2((prev) => (prev?.trim() ? prev : (typeof d.description2 === "string" ? d.description2 : "")));
        setTempDescription((prev) => (prev?.trim() ? prev : (typeof d.description2 === "string" ? d.description2 : "")));
        setReferences2((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(d.references2) ? d.references2 : [])));
        setImages2((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(d.images2) ? d.images2 : [])));
        setPrice2((prev) => {
          const prevNum = parseFloat(String(prev || "0"));
          if (Number.isFinite(prevNum) && prevNum > 0) return prev;
          return d.price2 != null ? String(d.price2) : prev;
        });
        setTempPrice((prev) => {
          const prevNum = parseFloat(String(prev || "0"));
          if (Number.isFinite(prevNum) && prevNum > 0) return prev;
          return d.price2 != null ? String(d.price2) : prev;
        });
        setCaracteristiques2((prev) => (prev?.trim() ? prev : (typeof d.caracteristiques2 === "string" ? d.caracteristiques2 : "")));
        setTempTechnicalDetails((prev) => {
          if (Object.keys(prev || {}).length > 0) return prev;
          if (typeof d.caracteristiques2 !== "string" || !d.caracteristiques2) return prev;
          try {
            return JSON.parse(d.caracteristiques2);
          } catch {
            return prev;
          }
        });
        setCustom_content2((prev) => (prev?.trim() ? prev : (typeof d.custom_content2 === "string" ? d.custom_content2 : "")));
        setTempCustomContent((prev) => (prev?.trim() ? prev : (typeof d.custom_content2 === "string" ? d.custom_content2 : "")));
        setReferences_constructeur2((prev) => (prev?.trim() ? prev : (typeof d.references_constructeur2 === "string" ? d.references_constructeur2 : "")));
        setTempManufacturerRefs((prev) => (prev?.trim() ? prev : (typeof d.references_constructeur2 === "string" ? d.references_constructeur2 : "")));
        setAvisClients((prev) => {
          const hasReviews = Array.isArray(prev?.reviews) && prev.reviews.length > 0;
          if (hasReviews) return prev;
          return d.avis_clients && typeof d.avis_clients === "object"
            ? d.avis_clients
            : prev;
        });
        setTempAvisClients((prev) => {
          const hasReviews = Array.isArray(prev?.reviews) && prev.reviews.length > 0;
          if (hasReviews) return prev;
          return d.avis_clients && typeof d.avis_clients === "object"
            ? d.avis_clients
            : prev;
        });
      } catch {
        // Non-fatal: source context can still operate with source data only.
      }
    };
    hydrateMissingFields();
    return () => {
      cancelled = true;
    };
  }, [productSlug, isCat3Source, cat2ParentId, cat2CardId]);

  // When opened from Cat3, check if this item is already in Huile & Eau Additif list
  useEffect(() => {
    if (!isCat3Source || !cat3IdParam || !itemIdParam) return;
    const itemIdNum = parseInt(itemIdParam, 10);
    if (!Number.isFinite(itemIdNum)) return;
    getHuileEauAdditif()
      .then((list) => {
        const already = list.some(
          (i) => String(i.cat3PageId) === String(cat3IdParam) && i.cat3ItemId === itemIdNum
        );
        setAddedToHuileEauAdditif(already);
      })
      .catch(() => setAddedToHuileEauAdditif(false));
  }, [isCat3Source, cat3IdParam, itemIdParam]);

  // Fetch equivalent products by shared reference. Do not call when reference is missing/empty.
  useEffect(() => {
    const loadEquivalents = async () => {
      const ref = (effectiveReference ?? "").trim();
      if (!ref) {
        setEquivalentProducts([]);
        return;
      }
      const excludeId =
        isCat3Source && itemIdParam
          ? (parseInt(itemIdParam, 10) || null)
          : currentProductId;
      try {
        const list = await getEquivalentProducts(ref, excludeId);
        // Exclude current product by slug (e.g. same slug from different source)
        const filtered = list.filter(
          (p) => p.slug !== productSlug && (excludeId == null || p.id !== excludeId)
        );
        const bySlug = new Map<string, EquivalentProductData>();
        for (const p of filtered) {
          if (!p.slug || !p.name) continue;
          if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
        }
        setEquivalentProducts(Array.from(bySlug.values()));
      } catch (e) {
        console.error("❌ Error loading equivalent references:", e);
        setEquivalentProducts([]);
      }
    };
    loadEquivalents();
  }, [effectiveReference, isCat3Source, itemIdParam, currentProductId, productSlug]);

  // Save to database - use API service function like Acha.tsx
  const saveFieldToDatabase = async (fieldName: string, value: unknown) => {
    if (!isAdmin || isSaving) return;
    if (isHydratingRef.current) {
      if (isDev) console.log("[Acha2] skip save during hydration:", fieldName);
      return;
    }
    const isUnchanged = (() => {
      switch (fieldName) {
        case "quantity2":
          return Number(value) === Number(quantity2);
        case "price2":
          return String(value ?? "") === String(price2 ?? "");
        case "description2":
          return String(value ?? "") === String(description2 ?? "");
        case "references2":
          return JSON.stringify(Array.isArray(value) ? value : []) === JSON.stringify(references2 || []);
        case "images2":
          return JSON.stringify(Array.isArray(value) ? value : []) === JSON.stringify(images2 || []);
        case "caracteristiques2":
          return String(value ?? "") === String(caracteristiques2 ?? "");
        case "custom_content2":
          return String(value ?? "") === String(custom_content2 ?? "");
        case "references_constructeur2":
          return String(value ?? "") === String(references_constructeur2 ?? "");
        case "avis_clients":
          return JSON.stringify(value ?? null) === JSON.stringify(avisClients ?? null);
        default:
          return false;
      }
    })();
    if (isUnchanged) {
      if (isDev) console.log("[Acha2] skip save (unchanged):", fieldName);
      return;
    }
    // Cat3-origin: persist to Cat3 item via sectionContent (no productSlug required)
    if (isCat3Source && cat3IdParam && itemIdParam) {
      const itemIdNum = parseInt(itemIdParam, 10);
      if (!Number.isFinite(itemIdNum)) return;
      setIsSaving(true);
      try {
        const patch: Partial<Cat3Item> = {};
        if (fieldName === "quantity2") patch.stock = typeof value === "number" ? value : Math.max(0, Math.floor(Number(value) || 0));
        if (fieldName === "price2") patch.price2 = value != null && value !== "" ? String(value) : undefined;
        if (fieldName === "custom_content2") patch.custom_content2 = value != null ? String(value) : "";
        if (fieldName === "references_constructeur2") patch.references_constructeur2 = value != null ? String(value) : "";
        if (fieldName === "avis_clients") patch.avis_clients = (value as Cat3Item["avis_clients"]) ?? undefined;
        if (Object.keys(patch).length === 0) return;
        await updateCat3Item(cat3IdParam, itemIdNum, patch);
        if (patch.stock !== undefined) setQuantity2(patch.stock);
        if (patch.price2 !== undefined) setPrice2(String(patch.price2));
        if (patch.custom_content2 !== undefined) setCustom_content2(patch.custom_content2), setTempCustomContent(patch.custom_content2);
        if (patch.references_constructeur2 !== undefined) setReferences_constructeur2(patch.references_constructeur2), setTempManufacturerRefs(patch.references_constructeur2);
        if (patch.avis_clients !== undefined) {
          const a = patch.avis_clients;
          const revs = Array.isArray(a?.reviews) ? a.reviews : [];
          const norm = {
            average: typeof a?.average === "number" ? a.average : 0,
            count: typeof a?.count === "number" ? a.count : 0,
            reviews: revs.map((r: { author?: string; rating?: number; comment?: string }) => ({
              author: typeof r?.author === "string" ? r.author : "",
              rating: typeof r?.rating === "number" ? r.rating : 0,
              comment: typeof r?.comment === "string" ? r.comment : "",
            })),
          };
          setAvisClients(norm);
          setTempAvisClients(norm);
        }
        queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
        toast({ title: "Succès", description: "Modification enregistrée." });
      } catch (error: any) {
        console.error("❌ Error saving Cat3 item:", error);
        toast({ title: "Erreur", description: error?.message || "Impossible d'enregistrer.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    if (cat2ParentId && cat2CardId && fieldName === "quantity2") {
      const cardIdNum = parseInt(cat2CardId, 10);
      if (Number.isFinite(cardIdNum)) {
        setIsSaving(true);
        try {
          const numVal = typeof value === "number" ? value : Math.max(0, Math.floor(Number(value) || 0));
          await updateCat2Card(cardIdNum, { stockDisponible: numVal });
          setQuantity2(numVal);
          queryClient.invalidateQueries({ queryKey: ["cat2_cards"] });
          toast({ title: "Succès", description: "Modification enregistrée." });
        } catch (error: any) {
          console.error("❌ Error saving Cat2 stock:", error);
          toast({ title: "Erreur", description: error?.message || "Impossible d'enregistrer.", variant: "destructive" });
        } finally {
          setIsSaving(false);
        }
      }
      return;
    }
    if (!productSlug) return;
    setIsSaving(true);

    try {
      const payload = { [fieldName]: value };
      const productNameToUse = (cat2ParentId && cat2CardId) ? productSlug : (productName || productSlug);
      if (isDev) console.log("[Acha2] saveFieldToDatabase – dirty field:", fieldName, "payload keys:", Object.keys(payload), "save key:", productNameToUse);
      if (isDev) console.log("[Acha2][localhost] partial update mode active (sending only changed field)");
      const updatedProduct = await updateAcha2Product(productNameToUse, payload);
      
      // Update state with saved data - match Acha.tsx pattern
      if (fieldName === 'quantity2') setQuantity2(updatedProduct.quantity2);
      if (fieldName === 'description2') setDescription2(updatedProduct.description2);
      if (fieldName === 'price2') setPrice2(updatedProduct.price2?.toString() || "0.000");
      if (fieldName === 'references2') setReferences2(updatedProduct.references2 || []);
      if (fieldName === 'images2') setImages2(updatedProduct.images2 || []);
      if (fieldName === 'caracteristiques2') {
        const caracteristiques = typeof value === 'string' ? value : JSON.stringify(value);
        setCaracteristiques2(caracteristiques);
      }
      if (fieldName === 'references_constructeur2') {
        const refs = (updatedProduct as any).references_constructeur2 || "";
        if (isDev) console.log('✅ Updated references_constructeur2 from API:', refs);
        setReferences_constructeur2(refs);
        setTempManufacturerRefs(refs);
      }
      if (fieldName === 'custom_content2') {
        const content = (updatedProduct as any).custom_content2 || "";
        if (isDev) console.log('✅ Updated custom_content2 from API:', content);
        setCustom_content2(content);
        setTempCustomContent(content);
      }
      if (fieldName === 'avis_clients') {
        const avis = (updatedProduct as any).avis_clients || { average: 0, count: 0, reviews: [] };
        if (isDev) console.log('✅ Updated avis_clients from API');
        setAvisClients(avis);
        setTempAvisClients(avis);
      }

      toast({
        title: "Succès",
        description: "Modification enregistrée.",
      });
    } catch (error: any) {
      console.error("❌ Error saving product:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer la modification.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Image navigation
  const handleNextImage = useCallback(() => {
    if (images2.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images2.length);
    }
  }, [images2.length]);

  const handlePrevImage = useCallback(() => {
    if (images2.length > 0) {
      setCurrentImageIndex((prev) =>
        (prev - 1 + images2.length) % images2.length
      );
    }
  }, [images2.length]);

  const handleDotClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNextImage();
    if (distance < -50) handlePrevImage();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevImage();
      if (e.key === "ArrowRight") handleNextImage();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNextImage, handlePrevImage]);

  // Admin: Toggle hide vehicle selectors (Marque/Modèle)
  const handleToggleHideVehicleSelectors = async () => {
    if (!isAdmin || !productSlug || isTogglingHideSelectors) return;
    const nextValue = !hideVehicleSelectors;
    setIsTogglingHideSelectors(true);
    try {
      await patchAcha2HideVehicleSelectors(productSlug, nextValue);
      setHideVehicleSelectors(nextValue);
      toast({
        title: "Succès",
        description: nextValue ? "Marque et Modèle masqués" : "Marque et Modèle affichés",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de modifier la visibilité",
        variant: "destructive",
      });
    } finally {
      setIsTogglingHideSelectors(false);
    }
  };

  // Admin handlers - match Acha.tsx pattern
  const handleSaveQuantity = async () => {
    setIsEditingQuantity(false);
    const value = Math.max(0, Math.floor(Number(tempQuantity) || 0));
    if (isCat3Source && cat3IdParam && itemIdParam) {
      const itemIdNum = parseInt(itemIdParam, 10);
      if (Number.isFinite(itemIdNum)) {
        setQuantity2(value);
        setTempQuantity(value);
        if (value <= 0) setQuantity(0);
        try {
          await updateCat3Item(cat3IdParam, itemIdNum, { stock: value });
          setCat3Item((prev) => (prev ? { ...prev, stock: value } : null));
          queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
          toast({ title: "Succès", description: "Stock mis à jour." });
        } catch (error: any) {
          toast({ title: "Erreur", description: error?.message || "Impossible de mettre à jour le stock.", variant: "destructive" });
          setTempQuantity(quantity2);
          setQuantity2(quantity2);
        }
        return;
      }
    }
    if (currentProductId != null && productSlug) {
      // Product from category_products - persist to DB
      try {
        const result = await updateCategoryProductStockBySlug(productSlug, {
          stockDisponible: value,
        });
        setQuantity2(result.stockDisponible);
        setTempQuantity(result.stockDisponible);
        if (result.stockDisponible <= 0) setQuantity(0);
        queryClient.invalidateQueries({ queryKey: ["category-status"] });
        toast({ title: "Succès", description: "Stock mis à jour." });
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de mettre à jour le stock.",
          variant: "destructive",
        });
        setTempQuantity(quantity2); // revert on error
      }
    } else {
      // acha2-only product (no category_products row) - persist to acha2_products
      setQuantity2(value);
      await saveFieldToDatabase("quantity2", value);
    }
  };

  const handleOfflineSale = async () => {
    if (!isAdmin || quantity2 <= 0) return;
    if (isCat3Source && cat3IdParam && itemIdParam) {
      const itemIdNum = parseInt(itemIdParam, 10);
      if (!Number.isFinite(itemIdNum)) return;
      const newStock = Math.max(0, quantity2 - 1);
      setIsOfflineSaleSaving(true);
      try {
        await updateCat3Item(cat3IdParam, itemIdNum, { stock: newStock });
        setQuantity2(newStock);
        setTempQuantity(newStock);
        setCat3Item((prev) => (prev ? { ...prev, stock: newStock } : null));
        if (newStock <= 0) setQuantity(0);
        queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
        toast({ title: "Succès", description: "Vente hors ligne enregistrée" });
      } catch (error: any) {
        toast({ title: "Erreur", description: error?.message || "Impossible d'enregistrer.", variant: "destructive" });
      } finally {
        setIsOfflineSaleSaving(false);
      }
      return;
    }
    if (cat2ParentId && cat2CardId) {
      const cardIdNum = parseInt(cat2CardId, 10);
      if (!Number.isFinite(cardIdNum)) return;
      const newStock = Math.max(0, quantity2 - 1);
      setIsOfflineSaleSaving(true);
      try {
        await updateCat2Card(cardIdNum, { stockDisponible: newStock });
        setQuantity2(newStock);
        setTempQuantity(newStock);
        if (newStock <= 0) setQuantity(0);
        setCat2Meta((prev) => (prev ? { ...prev, stockDisponible: newStock } : null));
        toast({ title: "Succès", description: "Vente hors ligne enregistrée" });
      } catch (error: any) {
        toast({ title: "Erreur", description: error?.message || "Impossible d'enregistrer.", variant: "destructive" });
      } finally {
        setIsOfflineSaleSaving(false);
      }
      return;
    }
    if (!productSlug) return;
    if (currentProductId == null) {
      const newQuantity = Math.max(0, quantity2 - 1);
      setIsOfflineSaleSaving(true);
      try {
        setQuantity2(newQuantity);
        setTempQuantity(newQuantity);
        if (newQuantity <= 0) setQuantity(0);
        await saveFieldToDatabase("quantity2", newQuantity);
        toast({ title: "Succès", description: "Vente hors ligne enregistrée" });
      } catch (error: any) {
        toast({ title: "Erreur", description: error?.message || "Impossible d'enregistrer.", variant: "destructive" });
      } finally {
        setIsOfflineSaleSaving(false);
      }
      return;
    }
    setIsOfflineSaleSaving(true);
    try {
      const result = await decrementCategoryProductStockBySlug(productSlug);
      const newStock = result.stockDisponible;
      setQuantity2(newStock);
      setTempQuantity(newStock);
      if (newStock <= 0) setQuantity(0);
      queryClient.invalidateQueries({ queryKey: ["category-status"] });
      toast({ title: "Succès", description: "Vente hors ligne enregistrée" });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Stock insuffisant.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      if (msg.includes("introuvable") || msg.includes("not found")) {
        const newQuantity = Math.max(0, quantity2 - 1);
        setQuantity2(newQuantity);
        setTempQuantity(newQuantity);
        await saveFieldToDatabase("quantity2", newQuantity);
      }
    } finally {
      setIsOfflineSaleSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsEditingDescription(false);
    setDescription2(tempDescription);
    await saveFieldToDatabase("description2", tempDescription);
  };

  const handleSavePrice = async () => {
    setIsEditingPrice(false);
    setPrice2(tempPrice);
    await saveFieldToDatabase("price2", tempPrice);
  };

  // Save handlers for new fields - using database column names
  const handleSaveTechnicalDetails = async () => {
    setIsEditingTechnicalDetails(false);
    const caracteristiquesJson = JSON.stringify(tempTechnicalDetails);
    setCaracteristiques2(caracteristiquesJson);
    await saveFieldToDatabase("caracteristiques2", caracteristiquesJson);
  };

  const handleSaveCustomContent = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      await saveFieldToDatabase("custom_content2", tempCustomContent);
      setIsEditingCustomContent(false);
    } catch (error: any) {
      console.error("❌ Error saving custom content:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer la description personnalisée.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManufacturerRefs = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      await saveFieldToDatabase("references_constructeur2", tempManufacturerRefs);
      setIsEditingManufacturerRefs(false);
    } catch (error: any) {
      console.error("❌ Error saving manufacturer refs:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer les références constructeur.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save handler for avis_clients
  const handleSaveAvisClients = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      // Recalculate average from reviews
      const reviews = tempAvisClients.reviews.filter(r => r.author.trim() && r.comment.trim());
      const average = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;
      const updatedAvis = {
        ...tempAvisClients,
        reviews,
        average: Math.round(average * 10) / 10, // Round to 1 decimal
        count: reviews.length
      };
      await saveFieldToDatabase("avis_clients", updatedAvis);
      setIsEditingAvisClients(false);
    } catch (error: any) {
      console.error("❌ Error saving avis clients:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer les avis clients.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for managing reviews
  const addReview = () => {
    setTempAvisClients({
      ...tempAvisClients,
      reviews: [...tempAvisClients.reviews, { author: '', rating: 5, comment: '' }]
    });
  };

  const removeReview = (index: number) => {
    setTempAvisClients({
      ...tempAvisClients,
      reviews: tempAvisClients.reviews.filter((_, i) => i !== index)
    });
  };

  const updateReview = (index: number, field: 'author' | 'rating' | 'comment', value: string | number) => {
    const updatedReviews = [...tempAvisClients.reviews];
    updatedReviews[index] = { ...updatedReviews[index], [field]: value };
    setTempAvisClients({ ...tempAvisClients, reviews: updatedReviews });
  };

  // Save discount settings - DO NOT calculate discounted_price2, backend does it
  const handleSaveDiscount = async () => {
    if (!isAdmin) return;
    setIsSavingDiscount(true);

    try {
      // Send only discount configuration, NOT discounted_price2
      // Backend will calculate discounted_price2 based on price2
      const discountData = {
        has_discount2: hasDiscount2,
        discount_type2: hasDiscount2 ? discountType2 : null,
        discount_value2: hasDiscount2 ? discountValue2 : null
        // DO NOT send discounted_price2 - backend calculates it
      };

      const productNameToUse = (cat2ParentId && cat2CardId) ? productSlug : (productName || productSlug);
      const updatedProduct = await updateAcha2Product(productNameToUse, discountData);
      
      // Update state from backend response (source of truth)
      setHasDiscount2(updatedProduct.has_discount2 ?? false);
      setDiscountType2(updatedProduct.discount_type2 || "percentage");
      setDiscountValue2(updatedProduct.discount_value2 ?? 0);
      setDiscountedPrice2(updatedProduct.discounted_price2 ?? null);

      // Reload product data to ensure UI is in sync
      const url = `${getApiBaseUrl()}/acha2/${encodeURIComponent(productSlug)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setHasDiscount2(result.data.has_discount2 ?? false);
          setDiscountType2(result.data.discount_type2 || "percentage");
          setDiscountValue2(result.data.discount_value2 ?? 0);
          setDiscountedPrice2(result.data.discounted_price2 ?? null);
        }
      }

      toast({
        title: "Succès",
        description: "Réduction mise à jour.",
      });
    } catch (error: any) {
      console.error("❌ Error saving discount:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer la réduction.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleAddReference = async () => {
    if (!isAdmin || !newReference.trim()) return;
    const updated = [...references2, newReference.trim()];
    setReferences2(updated);
    setNewReference("");
    await saveFieldToDatabase("references2", updated);
  };

  const handleRemoveReference = async (refToRemove: string) => {
    if (!isAdmin) return;
    const updated = references2.filter((r) => r !== refToRemove);
    setReferences2(updated);
    await saveFieldToDatabase("references2", updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !isAdmin) return;

    const remaining = 5 - images2.length;
    const selected = Array.from(files).slice(0, remaining);

    const newImages: string[] = [];

    for (const file of selected) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const updated = [...images2, ...newImages];
    setImages2(updated);
    e.target.value = "";
    await saveFieldToDatabase("images2", updated);
  };

  const handleDeleteImage = async (index: number) => {
    if (!isAdmin) return;
    const updated = images2.filter((_, i) => i !== index);
    setImages2(updated);
    
    if (currentImageIndex >= updated.length) {
      setCurrentImageIndex(Math.max(0, updated.length - 1));
    }
    
    await saveFieldToDatabase("images2", updated);
  };

  // Handle add modele
  const handleAddModele = async () => {
    if (!newModele.trim()) return;
    
    // Check if already exists
    if (modeles.includes(newModele.trim())) {
      toast({
        title: "Attention",
        description: "Ce modèle existe déjà",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/modeles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          value: newModele.trim()
        })
      });
      
      if (response.ok) {
        const updatedList = await response.json();
        setModeles(Array.isArray(updatedList) ? updatedList : modeles);
        setNewModele("");
        toast({
          title: "Succès",
          description: "Modèle ajouté avec succès",
        });
      } else {
        throw new Error("Failed to add modele");
      }
    } catch (error) {
      console.error("Error adding modele:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le modèle",
        variant: "destructive",
      });
    }
  };

  // Handle delete modele
  const handleDeleteModele = async (modeleName: string) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/modeles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          value: modeleName
        })
      });
      
      if (response.ok) {
        const updatedList = await response.json();
        setModeles(Array.isArray(updatedList) ? updatedList : modeles);
        toast({
          title: "Succès",
          description: "Modèle supprimé avec succès",
        });
      } else {
        throw new Error("Failed to delete modele");
      }
    } catch (error) {
      console.error("Error deleting modele:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle",
        variant: "destructive",
      });
    }
  };

  const handleAddToDashboard = async () => {
    if (!isAdmin || !productSlug) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/acha2/add-to-dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: productSlug })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add product to dashboard');
      }

      toast({
        title: "Succès",
        description: "Produit ajouté au dashboard",
      });
    } catch (error: any) {
      console.error('❌ Error adding to dashboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter au dashboard",
        variant: "destructive",
      });
    }
  };

  const handlePromoOfflineSale = async () => {
    if (!isPromoOrigin || promoId == null || !isAdmin) return;
    if (promoStock != null && promoStock <= 0) return;
    setIsPromoVenteSaving(true);
    try {
      const result = await patchPromotionStock(promoId, -1);
      const updated = result?.promo?.stock;
      if (updated !== undefined) setPromoStock(updated);
      else setPromoStock((prev) => (prev != null ? Math.max(0, prev - 1) : 0));
      toast({ title: "Succès", description: "Vente hors ligne enregistrée" });
    } catch (error: any) {
      console.warn("patchPromotionStock error:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer la vente",
        variant: "destructive",
      });
    } finally {
      setIsPromoVenteSaving(false);
    }
  };

  const handleSavePromoStock = async () => {
    if (!isPromoOrigin || promoId == null || !isAdmin) return;
    const value = Math.max(0, Math.floor(parseInt(String(tempPromoStock), 10) || 0));
    setIsPromoStockSaving(true);
    try {
      if (import.meta.env?.DEV) {
        console.log("[acha2 handleSavePromoStock] promoId=%s value=%s", promoId, value);
      }
      const result = await setPromotionStock(promoId, value);
      const newStock = result?.stock ?? result?.promo?.stock ?? value;
      setPromoStock(newStock);
      setIsEditingPromoStock(false);
      // Refetch from server so state is 100% in sync (persist verified)
      const fresh = await getPromotionById(promoId);
      if (fresh && (fresh.stock != null || (fresh as { stock_disponible?: number }).stock_disponible != null)) {
        const serverStock = (fresh.stock ?? (fresh as { stock_disponible?: number }).stock_disponible) ?? newStock;
        setPromoStock(serverStock);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offre-historique-updated"));
        try {
          window.localStorage?.setItem("offre-historique-updated", String(Date.now()));
        } catch {
          // ignore
        }
      }
      toast({ title: "Succès", description: "Stock mis à jour" });
    } catch (error: any) {
      if (import.meta.env?.DEV) {
        console.warn("[acha2 handleSavePromoStock] error", error);
      }
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le stock",
        variant: "destructive",
      });
    } finally {
      setIsPromoStockSaving(false);
    }
  };

  const handleAddToOffreHistorique = async () => {
    if (!isPromoOrigin) return handleAddToDashboard();
    if (!isAdmin || promoId == null) return;

    try {
      const slugToSend = (productSlug || slug || "").trim();
      if (!slugToSend) {
        toast({
          title: "Erreur",
          description: "Slug manquant pour cette offre",
          variant: "destructive",
        });
        return;
      }

      // Promo price = same as displayed on Acha2 (do NOT use quantity2)
      const basePrice = parseFloat(price2 || "0");
      const hasActiveDiscount =
        hasDiscount2 && discountedPrice2 !== null && discountedPrice2 < basePrice;
      const promoPrice = hasActiveDiscount ? (discountedPrice2 ?? basePrice) : basePrice;
      const promoStockVal = promoStock != null ? promoStock : 0;

      await addOffreHistoriquePromo({
        promoId,
        slug: slugToSend,
        promoPrice,
        promoStock: promoStockVal,
      });

      // Notify other tabs/pages (admin list) to refetch
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offre-historique-updated"));
        try {
          window.localStorage?.setItem("offre-historique-updated", String(Date.now()));
        } catch {
          // ignore storage errors
        }
      }

      toast({
        title: "Succès",
        description: "Produit ajouté à l’offre historique",
      });
    } catch (error: any) {
      console.error("❌ Error adding to offre historique:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Impossible d'ajouter à l’offre historique",
        variant: "destructive",
      });
    }
  };

  const handleAddToHuileEauAdditif = async () => {
    if (!isCat3Source || !cat3Item || !cat3IdParam || !itemIdParam) return;
    const itemIdNum = parseInt(itemIdParam, 10);
    if (!Number.isFinite(itemIdNum)) return;
    setAddingToHuileEauAdditif(true);
    try {
      await addHuileEauAdditifItem({
        cat3PageId: cat3IdParam,
        cat3ItemId: itemIdNum,
        title: productName || cat3Item.title,
        reference: categoryReference ?? cat3Item.reference ?? null,
        stock: quantity2 ?? cat3Item.stock ?? null,
        alertThreshold: seuilAlerte ?? cat3Item.alertThreshold ?? null,
        image: (images2 && images2[0]) || cat3Item.image || null,
        prixAchatBrut: cat3Item.prix_achat_brut ?? null,
        remiseAchat: cat3Item.remise_achat_percent ?? null,
        netAchatHTVA: cat3Item.net_achat_htva ?? null,
        tva: cat3Item.tva_percent ?? null,
        netAchatTTC: cat3Item.net_achat_ttc ?? null,
        marge: cat3Item.marge_percent ?? null,
        prixNeveux: cat3Item.prix_neveux ?? null,
      });
      setAddedToHuileEauAdditif(true);
      toast({ title: "Succès", description: "Ajouté à Huile & Eau Additif" });
    } catch (error: any) {
      console.error("❌ Error adding to Huile & Eau Additif:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Impossible d'ajouter à Huile & Eau Additif",
        variant: "destructive",
      });
    } finally {
      setAddingToHuileEauAdditif(false);
    }
  };

  // Cart and checkout handlers
  const addToCart = () => {
    if (!hideVehicleSelectors && !isCarsFlow && (!selectedMarqueId || !selectedModeleId)) {
      toast({
        title: "Sélection requise",
        description: "Veuillez choisir une marque et un modèle",
        variant: "destructive",
      });
      return;
    }

    const selectedMarque = marquesList.find(m => m.id === selectedMarqueId);
    const selectedModele = modelesList.find(m => m.id === selectedModeleId);
    
    if (isDev) console.log("Added to cart:", productName);
    toast({
      title: "Succès",
      description: "Produit ajouté au panier",
    });
  };

  // Tunisian governorates and delegations
  const governorates: Record<string, string[]> = {
    "Tunis": ["Bab El Bhar", "Bab Souika", "Carthage", "Cité El Khadra", "El Kabaria", "El Menzah", "El Omrane", "Ettahrir", "La Goulette", "Le Bardo", "Sidi El Béchir", "Sidi Hassine"],
    "Ariana": ["Ariana Ville", "Ettadhamen", "Mnihla", "Raoued", "Sidi Thabet", "La Soukra"],
    "Ben Arous": ["Ben Arous", "Bou Mhel el-Bassatine", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam Lif", "Mohamedia", "Mornag", "Radès", "Mégrine"],
    "Manouba": ["Borj El Amri", "Douar Hicher", "El Battan", "La Manouba", "Mornaguia", "Oued Ellil", "Tebourba"],
    "Bizerte": ["Bizerte Nord", "Bizerte Sud", "El Alia", "Ghar El Melh", "Mateur", "Menzel Bourguiba", "Menzel Jemil", "Ras Jebel", "Sejnane", "Tinja", "Utique", "Zarzouna"],
    "Nabeul": ["Béni Khalled", "Béni Khiar", "Bou Argoub", "Dar Chaabane", "El Haouaria", "El Mida", "Grombalia", "Hammamet", "Kelibia", "Korba", "Menzel Bouzelfa", "Menzel Temime", "Nabeul", "Soliman", "Takelsa"],
    "Zaghouan": ["Bir Mcherga", "El Fahs", "Nadhour", "Saouaf", "Zaghouan", "Zriba"],
    "Sousse": ["Akouda", "Bouficha", "Enfidha", "Hammam Sousse", "Hergla", "Kalâa Kebira", "Kalâa Seghira", "Kondar", "Msaken", "Sidi Bou Ali", "Sidi El Hani", "Sousse Jawhara", "Sousse Medina", "Sousse Riadh", "Sousse Sidi Abdelhamid"],
    "Monastir": ["Bekalta", "Bembla", "Beni Hassen", "Jemmal", "Ksar Hellal", "Ksibet el-Médiouni", "Moknine", "Monastir", "Ouerdanine", "Sahline", "Sayada-Lamta-Bou Hajar", "Téboulba", "Zéramdine"],
    "Mahdia": ["Bou Merdes", "Chebba", "Chorbane", "El Jem", "Essouassi", "Hebira", "Ksour Essef", "Mahdia", "Melloulèche", "Ouled Chamekh", "Sidi Alouane", "Zouila"],
    "Sfax": ["Agareb", "Bir Ali Ben Khalifa", "El Amra", "El Hencha", "Graïba", "Jebiniana", "Kerkenah", "Mahares", "Menzel Chaker", "Sakiet Eddaier", "Sakiet Ezzit", "Sfax Est", "Sfax Ouest", "Sfax Sud", "Skhira", "Thyna"],
    "Kairouan": ["Bou Hajla", "Chebika", "Echrarda", "El Alâa", "Haffouz", "Hajeb El Ayoun", "Kairouan Nord", "Kairouan Sud", "Nasrallah", "Oueslatia", "Sbikha"],
    "Kasserine": ["El Ayoun", "Ezzouhour", "Fériana", "Foussana", "Haïdra", "Hassi El Ferid", "Jedelienne", "Kasserine Nord", "Kasserine Sud", "Majel Bel Abbès", "Sbeïtla", "Sbiba", "Thala"],
    "Sidi Bouzid": ["Bir El Hafey", "Cebbala Ouled Asker", "Jilma", "Meknassy", "Menzel Bouzaiane", "Mezzouna", "Ouled Haffouz", "Regueb", "Sidi Ali Ben Aoun", "Sidi Bouzid Est", "Sidi Bouzid Ouest", "Souk Jedid"],
    "Siliana": ["Bargou", "Bou Arada", "El Aroussa", "El Krib", "Gaâfour", "Kesra", "Makthar", "Rouhia", "Siliana Nord", "Siliana Sud"],
    "Kef": ["Dahmani", "El Ksour", "Jérissa", "Kalâat Khasba", "Kalâat Senan", "Kef Est", "Kef Ouest", "Nebeur", "Sakiet Sidi Youssef", "Sers", "Tajerouine"],
    "Jendouba": ["Aïn Draham", "Balta-Bou Aouane", "Bou Salem", "Fernana", "Ghardimaou", "Jendouba", "Oued Melliz", "Tabarka"],
    "Béja": ["Amdoun", "Béja Nord", "Béja Sud", "Goubellat", "Medjez el-Bab", "Nefza", "Téboursouk", "Testour", "Thibar"],
    "Gafsa": ["El Guettar", "El Ksar", "Gafsa Nord", "Gafsa Sud", "Mdhilla", "Métlaoui", "Oum El Araies", "Redeyef", "Sened", "Sidi Aïch"],
    "Tozeur": ["Degache", "Hazoua", "Nefta", "Tameghza", "Tozeur"],
    "Kebili": ["Douz Nord", "Douz Sud", "Faouar", "Kebili Nord", "Kebili Sud", "Souk Lahad"],
    "Gabès": ["Gabès Médina", "Gabès Ouest", "Gabès Sud", "Ghannouch", "El Hamma", "Mareth", "Matmata", "Menzel El Habib", "Nouvelle Matmata"],
    "Médenine": ["Ben Gardane", "Beni Khedache", "Djerba - Ajim", "Djerba - Houmt Souk", "Djerba - Midoun", "Médenine Nord", "Médenine Sud", "Sidi Makhlouf", "Zarzis"],
    "Tataouine": ["Bir Lahmar", "Dhehiba", "Ghomrassen", "Remada", "Smâr", "Tataouine Nord", "Tataouine Sud"]
  };

  const goToCheckout = () => {
    // Set quantity in order form from current quantity state (minimum 1)
    setOrderForm(prev => ({ ...prev, quantite: Math.max(1, quantity) }));
    setIsOrderModalOpen(true);
    // Set default selected model if available
    if (modeles.length > 0 && !selectedModel) {
      setSelectedModel(modeles[0]);
    }
  };

  const handleOrderFormChange = (field: string, value: string | number) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (orderErrors[field as keyof typeof orderForm]) {
      setOrderErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof orderForm];
        return newErrors;
      });
    }
  };

  const validateOrderForm = (): boolean => {
    const errors: Partial<Record<keyof typeof orderForm, string>> = {};
    
    if (!orderForm.nom.trim()) {
      errors.nom = "Le nom est obligatoire";
    }
    if (!orderForm.prenom.trim()) {
      errors.prenom = "Le prénom est obligatoire";
    }
    if (!orderForm.telephone.trim()) {
      errors.telephone = "Le téléphone est obligatoire";
    } else if (!/^[0-9]{8}$/.test(orderForm.telephone.replace(/\s/g, ""))) {
      errors.telephone = "Numéro invalide (8 chiffres)";
    }
    if (!orderForm.wilaya) {
      errors.wilaya = "La wilaya est obligatoire";
    }
    if (!orderForm.delegation) {
      errors.delegation = "La délégation est obligatoire";
    }
    if (orderForm.quantite < 1) {
      errors.quantite = "1";
    }
    
    setOrderErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async () => {
    if (isPromoOrigin && (promoStock == null || promoStock <= 1)) {
      toast({
        title: "Indisponible",
        description: "Désolé, ce produit n'est pas disponible pour le moment.",
        variant: "destructive",
      });
      return;
    }
    if (!isPromoOrigin && quantity2 <= 0) {
      toast({
        title: "Indisponible",
        description: "Stock insuffisant.",
        variant: "destructive",
      });
      return;
    }
    if (!validateOrderForm()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare order data - EXACTLY like Acha.tsx
      const productImage = images2 && images2.length > 0 
        ? images2[0] 
        : null;

      // Validate required fields before sending
      if (!orderForm.wilaya || !orderForm.delegation || !orderForm.nom || !orderForm.prenom || !orderForm.telephone) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires.",
          variant: "destructive",
        });
        return;
      }

      // Use discounted price if available, otherwise use base price
      const finalPrice = hasDiscount2 && discountedPrice2 !== null && discountedPrice2 < parseFloat(price2 || '0')
        ? discountedPrice2.toString()
        : price2 || "0.000";

      // Marque/Modèle from selection (for snapshot)
      const marqueName = selectedMarque?.name;
      const modeleName = selectedModele?.name;

      // Resolved product name: Cat3 title, Cat2 title, productName (from API), or slug fallback (order payload must have non-empty name)
      const resolvedProductName = (cat3Item?.title ?? cat2Meta?.title ?? productName ?? productSlug ?? "").trim();

      // Safety guard: do not send order if product name cannot be resolved
      if (!resolvedProductName) {
        toast({
          title: "Erreur",
          description: "Nom du produit manquant. Impossible d'envoyer la commande.",
          variant: "destructive",
        });
        return;
      }

      // Prepare full product object for snapshot (Acha2 products)
      const parsedCat3ItemId = parseInt(itemIdParam, 10);
      const parsedCat2ParentId = parseInt(cat2ParentId, 10);
      const parsedCat2CardId = parseInt(cat2CardId, 10);
      const productObject = {
        id: null, // Acha2 products are not in products table
        name: resolvedProductName,
        slug: productSlug || null, // For pending-by-product matching on CAT page
        price: finalPrice,
        image: productImage || null,
        product_image: productImage || null,
        references: references2 || [],
        product_references: references2 || [],
        description: description2 || null,
        quantity: quantity2 || null,
        images: images2 || [],
        modele2: modeles || [],
        // Marque/Modèle for product_snapshot (fallback for older orders)
        brand_name: marqueName || null,
        model_name: modeleName || null,
        // Include discount info in order
        has_discount2: hasDiscount2,
        discount_type2: discountType2,
        discount_value2: discountValue2,
        discounted_price2: discountedPrice2,
        // Cat3-origin: so Admin Accept can resolve stock from Cat3 item (not Produits 2)
        ...(isCat3Source && cat3IdParam && itemIdParam
          ? {
              source: "cat3",
              // Keep raw Cat3 identifier to support numeric ids and slug/cardId strings.
              cat3Id: cat3IdParam,
              itemId: Number.isFinite(parsedCat3ItemId) ? parsedCat3ItemId : null,
            }
          : {}),
        // Cat2-origin: so Admin Accept can resolve stock from cat2_cards
        ...(cat2ParentId && cat2CardId
          ? {
              source: "cat2",
              cat2ParentId: Number.isFinite(parsedCat2ParentId) ? parsedCat2ParentId : null,
              cat2CardId: Number.isFinite(parsedCat2CardId) ? parsedCat2CardId : null,
            }
          : {}),
      };

      const orderData = {
        // Full product object for snapshot (required)
        product: productObject,
        
        // INTEGER: quantity - ensure it's a number
        quantity: Number(orderForm.quantite) || 1,
        
        // TEXT: customer fields (all required)
        customer_nom: orderForm.nom.trim(),
        customer_prenom: orderForm.prenom.trim(),
        customer_phone: orderForm.telephone.trim(),
        customer_wilaya: orderForm.wilaya.trim(),
        customer_delegation: orderForm.delegation.trim(),
        
        // Marque/Modèle snapshot (human-readable names for Admin Commandes table)
        brandName: marqueName || null,
        modelName: modeleName || null,
        
        // Cat3-origin (Acha2 from Cat3 cards): Accept will use Cat3 item stock
        ...(isCat3Source && cat3IdParam && itemIdParam
          ? { origin: "cat3" }
          : {}),
        // Cat2-origin (Acha2 from Cat2 cards): Accept will use cat2_cards stock
        ...(cat2ParentId && cat2CardId
          ? { origin: "cat2" }
          : {}),
        // Promo-origin fields (for orders from NOS OFFRES DU MOMENT)
        ...(isPromoOrigin && promoId != null
          ? {
              origin: "promotion",
              promo_id: promoId,
              promo_slug: productSlug,
            }
          : {}),
      };

      // Validate quantity
      if (!Number.isInteger(orderData.quantity) || orderData.quantity < 1) {
        toast({
          title: "Erreur",
          description: "La quantité doit être au moins 1.",
          variant: "destructive",
        });
        return;
      }

      if (isDev) console.log('📦 Frontend (Acha2): Order payload being sent');

      // Submit order to API using the same function as Acha.tsx
      await createOrder(orderData as any);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["category-status"] });

      // Show success toast (same message as Acha.tsx)
      toast({
        title: "Commande envoyée!",
        description: `Merci ${orderForm.prenom}! Nous vous contacterons bientôt.`,
      });

      setIsOrderModalOpen(false);
      
      // Reset form
      setOrderForm({
        nom: "",
        prenom: "",
        telephone: "",
        wilaya: "",
        delegation: "",
        quantite: 1
      });
      setSelectedModel("");
      setOrderErrors({});
    } catch (error: any) {
      console.error("❌ Error submitting order:", error);
      
      // Extract readable error message (same pattern as Acha.tsx)
      let errorMessage = "Impossible d'envoyer la commande. Veuillez réessayer.";
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : errorMessage;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:py-10 max-sm:pt-20">
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isCat3Source && cat3NotFound) {
    const backToCat3 = cat3IdParam ? `/cat3/${cat3IdParam}` : "/eau-et-additif";
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:py-10 max-sm:pt-20">
          <div className="rounded-xl border border-gray-200 bg-white p-8 sm:p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Produit introuvable</h2>
            <p className="text-muted-foreground mb-6">Ce produit n&apos;existe pas ou a été supprimé.</p>
            <Button asChild className="bg-[#F97316] hover:bg-[#ea580c]">
              <Link to={backToCat3}>Retour</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // (debug log removed) equivalentProducts are loaded via /api/products/equivalents

  const basePrice = parseFloat(price2 || "0");
  const hasActiveDiscount =
    hasDiscount2 && discountedPrice2 !== null && discountedPrice2 < basePrice;
  const displayPrice = hasActiveDiscount
    ? discountedPrice2 || basePrice
    : basePrice;
  const referencePreview = references2.slice(0, 2);
  const extraReferences = Math.max(0, references2.length - referencePreview.length);
  const referenceSummary =
    references2.length > 0
      ? `${references2[0]}${extraReferences > 0 ? `, +${extraReferences} autres` : ""}`
      : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 max-sm:pt-20">
        {/* Sticky light header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-5">
          <div className="flex flex-col gap-1">
            {isCarsFlow && (
              <nav
                aria-label="Breadcrumb"
                className="text-[11px] text-gray-600 flex flex-wrap items-center gap-1"
              >
                <Link
                  to={brand === "Kia" ? "/kia-cars" : "/hyundai-cars"}
                  className="hover:underline text-orange-600 font-medium"
                >
                  {brand === "Kia" ? "Kia-cars" : "Hyundai-cars"}
                </Link>
                <span className="text-gray-400">→</span>
                <Link
                  to={`/pieces-dispo/${modelIdFromQuery}?${new URLSearchParams({
                    source: "cars",
                    brand,
                    modelName: modelNameFromQuery,
                  }).toString()}`}
                  className="hover:underline"
                >
                  {modelNameFromQuery}
                </Link>
                <span className="text-gray-400">→</span>
                <Link
                  to={`/cat/${categorySlugFromQuery}?${new URLSearchParams({
                    modelId: modelIdFromQuery,
                    source: "cars",
                    brand,
                    modelName: modelNameFromQuery,
                  }).toString()}`}
                  className="hover:underline"
                >
                  {categorySlugFromQuery.replace(/-/g, " ")}
                </Link>
                <span className="text-gray-400">→</span>
                <span className="text-gray-900 font-medium">
                  {productName || productSlug || "Produit"}
                </span>
              </nav>
            )}
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">
              {displayProductName}
            </h1>
            <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
              <span className="truncate">
                Référence: {effectiveReference || "Référence indisponible"}
              </span>
              {cat3Item && quantity2 != null && seuilAlerte != null && quantity2 <= seuilAlerte && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 shrink-0">
                  Stock bas
                </span>
              )}
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={
                      index < (categoryRating ?? 0)
                        ? "text-yellow-400 text-xs sm:text-sm"
                        : "text-gray-300 text-xs sm:text-sm"
                    }
                  >
                    ★
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Image gallery */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 space-y-3">
            <div
              className="relative bg-white rounded-xl shadow-sm overflow-hidden h-[260px] sm:h-[320px]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {images2.length > 0 ? (
                <>
                  {hasActiveDiscount && discountValue2 > 0 && (
                    <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
                      {discountType2 === "percentage"
                        ? `-${discountValue2}%`
                        : `-${discountValue2} DT`}
                    </div>
                  )}
                  {images2.map((image, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentImageIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <img
                        src={resolveImageUrl(image)}
                        className="object-contain w-full h-full p-4"
                        alt="Product"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          if (el.src && !el.src.endsWith('/pp.jpg')) el.src = '/pp.jpg';
                        }}
                      />
                      {isAdmin && index === currentImageIndex && (
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {images2.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 text-white p-2 rounded-full hover:bg-black/60 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 text-white p-2 rounded-full hover:bg-black/60 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-full text-gray-400">
                  <ImagePlus className="w-8 h-8 mb-2" />
                  <span className="text-sm">Aucune image</span>
                </div>
              )}
            </div>
            {images2.length > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto">
                {images2.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleDotClick(i)}
                    className={`w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border ${
                      currentImageIndex === i ? "border-orange-500" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={resolveImageUrl(img)}
                      className="object-cover w-full h-full"
                      alt={`Miniature ${i + 1}`}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        if (el.src && !el.src.endsWith('/pp.jpg')) el.src = '/pp.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {isAdmin && images2.length < 5 && (
              <label className="border-2 border-dashed border-orange-400 p-3 rounded-xl block text-center cursor-pointer hover:bg-orange-50 transition-colors">
                <Upload className="w-5 h-5 mx-auto text-orange-600" />
                <p className="text-xs text-orange-600 mt-1">
                  Ajouter des images ({images2.length}/5)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </section>

          {/* Price, Stock, Marque, Modèle, and Actions - Unified Card */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
            {/* Price Section */}
            <div>
              {isEditingPrice ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      className="text-xl sm:text-2xl font-bold w-32 sm:w-40 h-12"
                    />
                    <span className="text-lg sm:text-xl">DT</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempPrice(price2);
                        setIsEditingPrice(false);
                      }}
                      className="h-10 text-sm"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>
                    <Button
                      onClick={handleSavePrice}
                      className="bg-orange-500 text-white h-10 text-sm"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" /> Sauvegarder
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  {hasActiveDiscount ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-400 line-through">
                        {formatProductPrice(basePrice)} DT
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                          {formatProductPrice(displayPrice)} DT
                        </div>
                        {discountValue2 > 0 && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">
                            {discountType2 === "percentage"
                              ? `-${discountValue2}%`
                              : `-${formatProductPrice(discountValue2)} DT`}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatProductPrice(displayPrice)} DT
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setTempPrice(price2);
                        setIsEditingPrice(true);
                      }}
                      className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-xs mt-1"
                    >
                      <Edit3 className="w-3 h-3" /> Modifier le prix
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stock disponible - visible only for admin; stock logic still enforced internally */}
            {isAdmin && isPromoOrigin ? (
              <div className="mt-1">
                <p className="text-sm text-gray-600">
                  {promoDataLoaded ? (
                    (promoStock != null && promoStock <= 0) ? (
                      <>
                        <span className="text-red-600 font-medium">Rupture de stock</span>
                        <span className="ml-1">— Indisponible</span>
                      </>
                    ) : (
                      <>Stock disponible : {promoStock ?? "—"}</>
                    )
                  ) : (
                    "..."
                  )}
                </p>
                {isEditingPromoStock ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      type="number"
                      value={tempPromoStock}
                      min={0}
                      onChange={(e) => setTempPromoStock(parseInt(e.target.value) || 0)}
                      className="w-24 text-center font-bold h-10"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTempPromoStock(promoStock ?? 0);
                          setIsEditingPromoStock(false);
                        }}
                        className="h-9 text-sm"
                        disabled={isPromoStockSaving}
                      >
                        <X className="w-3 h-3" /> Annuler
                      </Button>
                      <Button
                        onClick={handleSavePromoStock}
                        className="bg-orange-500 text-white h-9 text-sm"
                        disabled={isPromoStockSaving}
                      >
                        {isPromoStockSaving ? "..." : <><Save className="w-3 h-3" /> Enregistrer</>}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button
                      onClick={() => {
                        setTempPromoStock(promoStock ?? 0);
                        setIsEditingPromoStock(true);
                      }}
                      variant="outline"
                      className="h-9 text-sm"
                    >
                      <Edit3 className="w-3 h-3 mr-1" /> Modifier stock
                    </Button>
                    <Button
                      onClick={handlePromoOfflineSale}
                      disabled={(promoStock != null && promoStock <= 0) || isPromoVenteSaving}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 disabled:opacity-60"
                    >
                      {isPromoVenteSaving ? "..." : "Vente hors ligne"}
                    </Button>
                  </div>
                )}
              </div>
            ) : isAdmin && !isPromoOrigin ? (
              <div className="mt-1">
                <p className="text-sm text-gray-600">
                  {quantity2 <= 0 ? (
                    <>
                      <span className="text-red-600 font-medium">Rupture de stock</span>
                      <span className="ml-1">— Indisponible</span>
                    </>
                  ) : (
                    <>Stock disponible : {quantity2}</>
                  )}
                </p>
                {isEditingQuantity ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      type="number"
                      value={tempQuantity}
                      min={0}
                      onChange={(e) => setTempQuantity(parseInt(e.target.value) || 0)}
                      className="w-24 text-center font-bold h-10"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTempQuantity(quantity2);
                          setIsEditingQuantity(false);
                        }}
                        className="h-9 text-sm"
                        disabled={isSaving}
                      >
                        <X className="w-3 h-3" /> Annuler
                      </Button>
                      <Button
                        onClick={handleSaveQuantity}
                        className="bg-orange-500 text-white h-9 text-sm"
                        disabled={isSaving}
                      >
                        <Save className="w-3 h-3" /> Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      onClick={() => {
                        setTempQuantity(quantity2);
                        setIsEditingQuantity(true);
                      }}
                      variant="outline"
                      className="h-9 text-sm"
                    >
                      <Edit3 className="w-3 h-3 mr-1" /> Modifier stock
                    </Button>
                    <Button
                      onClick={handleOfflineSale}
                      disabled={quantity2 <= 0 || isOfflineSaleSaving}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 disabled:opacity-60"
                    >
                      {isOfflineSaleSaving ? "..." : "Vente hors ligne"}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Low stock warning - admin only, non-promo, when stock <= seuil */}
            {isAdmin && !isPromoOrigin && quantity2 > 0 && quantity2 <= seuilAlerte && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg">
                <span className="text-amber-800 text-sm font-medium">Stock faible</span>
                <span className="text-amber-700 text-xs">({quantity2} en stock)</span>
              </div>
            )}

            {!isCarsFlow && hideVehicleSelectors && isAdmin && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Marque et Modèle masqués</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleHideVehicleSelectors}
                  disabled={isTogglingHideSelectors}
                  className="h-8 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {isTogglingHideSelectors ? "..." : "Afficher"}
                </Button>
              </div>
            )}
            {!isCarsFlow && !hideVehicleSelectors && (
              <>
                {/* Marque Field */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-800">Marque</label>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleHideVehicleSelectors}
                          disabled={isTogglingHideSelectors}
                          className="h-7 px-2 text-xs"
                          title="Masquer Marque et Modèle"
                        >
                          <EyeOff className="w-3.5 h-3.5 mr-1" />
                          {isTogglingHideSelectors ? "..." : "Masquer"}
                        </Button>
                        <button
                          onClick={() => {
                            setTempMarqueName("");
                            setShowAddMarqueModal(true);
                          }}
                          className="text-orange-500 hover:text-orange-600 p-1"
                          title="Ajouter une marque"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const marque = marquesList.find((m) => m.id === selectedMarqueId);
                            if (marque) {
                              setEditingMarque(marque);
                              setTempMarqueName(marque.name);
                              setShowEditMarqueModal(true);
                            }
                          }}
                          disabled={!selectedMarqueId}
                          className="text-orange-500 hover:text-orange-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedMarqueId ? "Modifier la marque" : "Sélectionnez une marque d'abord"}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const marque = marquesList.find((m) => m.id === selectedMarqueId);
                            if (marque) {
                              setDeletingMarque(marque);
                              setShowDeleteMarqueConfirm(true);
                            }
                          }}
                          disabled={!selectedMarqueId}
                          className="text-red-500 hover:text-red-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedMarqueId ? "Supprimer la marque" : "Sélectionnez une marque d'abord"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <select
                    value={selectedMarqueId || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedMarqueId(value);
                      setSelectedModeleId(null);
                    }}
                    className="w-full h-12 px-3 rounded-lg border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  >
                    <option value="">Sélectionner une marque</option>
                    {marquesList.map((marque) => (
                      <option key={marque.id} value={marque.id}>
                        {marque.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modèle Field */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-800">Modèle</label>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (!selectedMarqueId) {
                              toast({
                                title: "Attention",
                                description: "Sélectionnez une marque d'abord",
                                variant: "destructive",
                              });
                              return;
                            }
                            setTempModeleName("");
                            setShowAddModeleModal(true);
                          }}
                          disabled={!selectedMarqueId}
                          className="text-orange-500 hover:text-orange-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedMarqueId ? "Ajouter un modèle" : "Sélectionnez une marque d'abord"}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const modele = modelesList.find((m) => m.id === selectedModeleId);
                            if (modele) {
                              setEditingModele(modele);
                              setTempModeleName(modele.name);
                              setShowEditModeleModal(true);
                            }
                          }}
                          disabled={!selectedModeleId}
                          className="text-orange-500 hover:text-orange-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedModeleId ? "Modifier le modèle" : "Sélectionnez un modèle d'abord"}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const modele = modelesList.find((m) => m.id === selectedModeleId);
                            if (modele) {
                              setDeletingModele(modele);
                              setShowDeleteModeleConfirm(true);
                            }
                          }}
                          disabled={!selectedModeleId}
                          className="text-red-500 hover:text-red-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedModeleId ? "Supprimer le modèle" : "Sélectionnez un modèle d'abord"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <select
                    value={selectedModeleId || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedModeleId(value);
                    }}
                    disabled={!selectedMarqueId || loadingModeles}
                    className="w-full h-12 px-3 rounded-lg border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Sélectionner un modèle</option>
                    {modelesList.map((modele) => (
                      <option key={modele.id} value={modele.id}>
                        {modele.name}
                      </option>
                    ))}
                  </select>
                  {loadingModeles && <p className="text-xs text-gray-500 mt-1">Chargement...</p>}
                  {!loadingModeles && selectedMarqueId && modelesList.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Aucun modèle pour cette marque</p>
                  )}
                  {!selectedMarqueId && (
                    <p className="text-xs text-gray-500 mt-1">Veuillez d'abord sélectionner une marque</p>
                  )}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={addToCart}
                disabled={!hideVehicleSelectors && !isCarsFlow && (!selectedMarqueId || !selectedModeleId)}
                className="bg-[#FF6A00] hover:bg-[#e85f00] text-white font-semibold rounded-full px-6 py-2.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5 mr-2" /> Ajouter au panier
              </Button>
              {(isPromoOrigin && promoStock != null && promoStock <= 1) || (!isPromoOrigin && quantity2 <= 0) ? (
                <Button
                  disabled
                  variant="outline"
                  className="border border-gray-300 text-gray-600 bg-gray-100 rounded-full px-6 py-2.5 w-full sm:w-auto opacity-60 cursor-not-allowed"
                >
                  Désolé, ce produit n&apos;est plus disponible.
                </Button>
              ) : (
                <Button
                  onClick={goToCheckout}
                  disabled={!hideVehicleSelectors && !isCarsFlow && (!selectedMarqueId || !selectedModeleId)}
                  variant="outline"
                  className="border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 rounded-full px-6 py-2.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Commander
                </Button>
              )}
            </div>
            {!hideVehicleSelectors && !isCarsFlow && (!selectedMarqueId || !selectedModeleId) && (
              <p className="text-xs text-gray-500 text-center mt-2">Veuillez choisir une marque et un modèle</p>
            )}
          </section>

          {/* Support block */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-semibold text-gray-900">Un doute sur une pièce ?</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Contactez un conseiller pour être accompagné dans votre recherche.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <a
                href="tel:+216231678813"
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
              >
                +216 23 167 8813
              </a>
              <p className="text-xs text-gray-500">
                Appel local du lundi au samedi de 9h à 19h
              </p>
            </div>
          </section>

          {/* Technical details */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-b">
              <h2 className="text-lg font-bold text-gray-900">Caractéristiques techniques</h2>
              {isAdmin && !isEditingTechnicalDetails && (
                <button
                  onClick={() => {
                    try {
                      const parsed = caracteristiques2 ? JSON.parse(caracteristiques2) : {};
                      setTempTechnicalDetails(parsed);
                    } catch {
                      setTempTechnicalDetails({});
                    }
                    setIsEditingTechnicalDetails(true);
                  }}
                  className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm"
                >
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {isEditingTechnicalDetails ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {Object.entries(tempTechnicalDetails).map(([key, value], idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            const newDetails = { ...tempTechnicalDetails };
                            delete newDetails[key];
                            newDetails[e.target.value] = value;
                            setTempTechnicalDetails(newDetails);
                          }}
                          placeholder="Caractéristique"
                          className="h-10"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={value}
                            onChange={(e) => {
                              setTempTechnicalDetails({ ...tempTechnicalDetails, [key]: e.target.value });
                            }}
                            placeholder="Valeur"
                            className="h-10"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              const newDetails = { ...tempTechnicalDetails };
                              delete newDetails[key];
                              setTempTechnicalDetails(newDetails);
                            }}
                            className="h-10 px-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setTempTechnicalDetails({ ...tempTechnicalDetails, "": "" })}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Ajouter une caractéristique
                  </Button>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          const parsed = caracteristiques2 ? JSON.parse(caracteristiques2) : {};
                          setTempTechnicalDetails(parsed);
                        } catch {
                          setTempTechnicalDetails({});
                        }
                        setIsEditingTechnicalDetails(false);
                      }}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>
                    <Button
                      onClick={handleSaveTechnicalDetails}
                      className="flex-1 bg-orange-500 text-white"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" /> Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    try {
                      const parsed = caracteristiques2 ? JSON.parse(caracteristiques2) : {};
                      return Object.keys(parsed).length === 0;
                    } catch {
                      return true;
                    }
                  })() ? (
                    <p className="text-gray-500 text-sm italic">Aucune caractéristique technique disponible.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        try {
                          const parsed = caracteristiques2 ? JSON.parse(caracteristiques2) : {};
                          return Object.entries(parsed);
                        } catch {
                          return [];
                        }
                      })().map(([key, value], idx) => (
                        <div key={idx} className="border-b border-gray-200 pb-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{key}</div>
                          <div className="text-sm font-medium text-gray-900">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Avis clients */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-b">
              <h2 className="text-lg font-bold text-gray-900">Avis clients</h2>
              {isAdmin && !isEditingAvisClients && (
                <button
                  onClick={() => {
                    setTempAvisClients(avisClients);
                    setIsEditingAvisClients(true);
                  }}
                  className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm"
                >
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {isAdmin && isEditingAvisClients ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note moyenne (0-5)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={tempAvisClients.average}
                      onChange={(e) => {
                        const avg = Math.max(0, Math.min(5, parseFloat(e.target.value) || 0));
                        setTempAvisClients({ ...tempAvisClients, average: avg });
                      }}
                      className="w-32"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      La moyenne sera recalculée automatiquement à partir des avis lors de la sauvegarde.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Avis ({tempAvisClients.reviews.length})
                      </label>
                      <Button variant="outline" onClick={addReview} className="h-9 text-sm">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un avis
                      </Button>
                    </div>

                    {tempAvisClients.reviews.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        Aucun avis. Cliquez sur "Ajouter un avis" pour commencer.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {tempAvisClients.reviews.map((review, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-semibold text-gray-900">Avis #{index + 1}</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeReview(index)}
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Auteur
                              </label>
                              <Input
                                value={review.author}
                                onChange={(e) => updateReview(index, "author", e.target.value)}
                                placeholder="Nom de l'auteur"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Note (1-5)
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={review.rating}
                                onChange={(e) =>
                                  updateReview(
                                    index,
                                    "rating",
                                    Math.max(1, Math.min(5, parseInt(e.target.value) || 5))
                                  )
                                }
                                className="w-24 h-9"
                              />
                              <div className="flex items-center gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Commentaire
                              </label>
                              <Textarea
                                value={review.comment}
                                onChange={(e) => updateReview(index, "comment", e.target.value)}
                                placeholder="Commentaire de l'avis"
                                className="min-h-[80px] text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempAvisClients(avisClients);
                        setIsEditingAvisClients(false);
                      }}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>
                    <Button
                      onClick={handleSaveAvisClients}
                      className="flex-1 bg-orange-500 text-white"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" /> Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(avisClients.average)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {avisClients.average > 0 ? `${avisClients.average.toFixed(1)}` : "0.0"} (
                      {avisClients.count} {avisClients.count === 1 ? "avis" : "avis"})
                    </span>
                  </div>
                  {avisClients.reviews.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Aucun avis client disponible.</p>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                      {avisClients.reviews.map((review, index) => (
                        <div
                          key={index}
                          className="min-w-[220px] bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-shrink-0"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{review.author}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Equivalent products - section has relative z-10 so it is not covered by overlays */}
          <section className="relative z-10 mt-6 bg-white rounded-2xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Références équivalentes
              </h2>
            </div>

            {equivalentProducts.length === 0 ? (
              <div className="px-4 py-4">
                <p className="text-sm text-gray-500">
                  Aucune référence équivalente disponible
                </p>
                {effectiveReference && (
                  <p className="mt-1 text-xs text-gray-400">
                    No equivalent products found for reference: {effectiveReference}
                  </p>
                )}
              </div>
            ) : (
              <div className="px-3 py-3 overflow-x-auto overflow-y-visible">
                <div className="flex gap-3 min-w-full">
                  {equivalentProducts.map((p) => {
                    const categoryProduct: CategoryProductData = {
                      id: p.id,
                      category_slug: "",
                      name: p.name,
                      slug: p.slug,
                      image: p.image || undefined,
                      reference: p.reference || undefined,
                      rating: p.rating ?? p.avgRating ?? undefined,
                      reviewsCount: p.reviewsCount ?? undefined,
                      price: p.price ?? null,
                      prixNeveux: p.prixNeveux ?? null,
                      stockDisponible: p.stockDisponible ?? p.stock ?? 0,
                      seuilAlerte: p.seuilAlerte ?? 0,
                    };
                    const toUrl =
                      p.cat3Id != null && p.itemId != null
                        ? `/acha2/${p.slug}?source=cat3&cat3Id=${p.cat3Id}&itemId=${p.itemId}`
                        : `/acha2/${p.slug}`;
                    return (
                      <Link
                        key={`${p.id}-${p.slug}-${p.cat3Id ?? ""}-${p.itemId ?? ""}`}
                        to={toUrl}
                        className="block min-w-[260px] max-w-xs flex-shrink-0 cursor-pointer"
                        style={{ pointerEvents: "auto" }}
                      >
                        <CategoryProductCard
                          product={categoryProduct}
                          className="w-full"
                          showStatusHighlights={isAdmin}
                          linkWrapped
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Custom description */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-b">
              <h2 className="text-lg font-bold text-gray-900">RANNEN AUTO MOTORS répond à vos besoins</h2>
              {isAdmin && !isEditingCustomContent && (
                <button
                  onClick={() => {
                    setTempCustomContent(custom_content2);
                    setIsEditingCustomContent(true);
                  }}
                  className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm"
                >
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {isAdmin && isEditingCustomContent ? (
                <div className="space-y-3">
                  <Textarea
                    value={tempCustomContent}
                    onChange={(e) => setTempCustomContent(e.target.value)}
                    className="min-h-[200px] text-sm"
                    placeholder="Saisissez votre description personnalisée..."
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempCustomContent(custom_content2);
                        setIsEditingCustomContent(false);
                      }}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>
                    <Button
                      onClick={handleSaveCustomContent}
                      className="flex-1 bg-orange-500 text-white"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" /> Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {custom_content2 || "Aucune description personnalisée."}
                </div>
              )}
            </div>
          </section>

          {/* Manufacturer references */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-b">
              <h2 className="text-lg font-bold text-gray-900">Références constructeur</h2>
              {isAdmin && !isEditingManufacturerRefs && (
                <button
                  onClick={() => {
                    setTempManufacturerRefs(references_constructeur2);
                    setIsEditingManufacturerRefs(true);
                  }}
                  className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm"
                >
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {isAdmin && isEditingManufacturerRefs ? (
                <div className="space-y-3">
                  <Textarea
                    value={tempManufacturerRefs}
                    onChange={(e) => setTempManufacturerRefs(e.target.value)}
                    className="min-h-[150px] text-sm"
                    placeholder="Saisissez les références constructeur..."
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempManufacturerRefs(references_constructeur2);
                        setIsEditingManufacturerRefs(false);
                      }}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>
                    <Button
                      onClick={handleSaveManufacturerRefs}
                      className="flex-1 bg-orange-500 text-white"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" /> Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {references_constructeur2 || "Aucune référence constructeur."}
                </div>
              )}
            </div>
          </section>

          {/* Admin-only area */}
          {isAdmin && (
            <section className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-800 flex items-center gap-2 text-base mb-3">
                    <Tag className="w-5 h-5" /> Produit en promotion
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hasDiscount2"
                        checked={hasDiscount2}
                        onChange={(e) => {
                          setHasDiscount2(e.target.checked);
                          if (!e.target.checked) {
                            setDiscountValue2(0);
                            setDiscountedPrice2(null);
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="hasDiscount2" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Activer la réduction
                      </label>
                    </div>

                    {hasDiscount2 && (
                      <div className="space-y-3 pl-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type de réduction
                          </label>
                          <Select value={discountType2} onValueChange={(value) => setDiscountType2(value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                              <SelectItem value="fixed">Montant fixe (DT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valeur {discountType2 === "percentage" ? "(%)" : "(DT)"}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={discountType2 === "percentage" ? "100" : undefined}
                            step={discountType2 === "percentage" ? "1" : "0.001"}
                            value={discountValue2}
                            onChange={(e) => setDiscountValue2(parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                        </div>
                        {discountValue2 > 0 && discountedPrice2 !== null && (
                          <div className="bg-white p-3 rounded-lg border border-purple-200">
                            <div className="text-xs text-gray-600 mb-1">Prix de base</div>
                            <div className="text-sm line-through text-gray-500">
                              {formatProductPrice(basePrice)} DT
                            </div>
                            <div className="text-xs text-gray-600 mt-2 mb-1">Prix réduit</div>
                            <div className="text-lg font-bold text-purple-700">
                              {formatProductPrice(discountedPrice2)} DT
                            </div>
                            <div className="text-xs text-gray-400 mt-1">(calculé par le serveur)</div>
                          </div>
                        )}
                        <Button
                          onClick={handleSaveDiscount}
                          disabled={isSavingDiscount || discountValue2 <= 0}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {isSavingDiscount ? "Enregistrement..." : "Enregistrer la réduction"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add to Dashboard button */}
              <div className="mt-4">
                <Button
                  onClick={
                    isPromoOrigin
                      ? handleAddToOffreHistorique
                      : isCat3Source
                        ? handleAddToHuileEauAdditif
                        : handleAddToDashboard
                  }
                  disabled={isCat3Source && (addedToHuileEauAdditif || addingToHuileEauAdditif)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base h-auto"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />{" "}
                  {isCat3Source && addedToHuileEauAdditif
                    ? "Ajouté"
                    : isCat3Source && addingToHuileEauAdditif
                      ? "Ajout en cours..."
                      : isPromoOrigin
                        ? "Add to offre histoire"
                        : isCat3Source
                          ? "Add to Huile & Eau Additif"
                          : "Add to Dashboard"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Order Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Commander ce produit</DialogTitle>
            <DialogDescription>
              Remplissez vos informations pour passer commande.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Summary Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Produit:</p>
                <p className="text-gray-900 font-medium">{productName}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Marque:</span>
                <span className="font-semibold text-gray-900">{selectedMarque?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Modèle:</span>
                <span className="font-semibold text-gray-900">{selectedModele?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Réf:</span>
                <span>{effectiveReference || "—"}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <Input
                  value={orderForm.nom}
                  onChange={(e) => handleOrderFormChange("nom", e.target.value)}
                  className={orderErrors.nom ? "border-red-500" : ""}
                  placeholder="Nom"
                />
                {orderErrors.nom && (
                  <p className="text-xs text-red-500 mt-0.5">{orderErrors.nom}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <Input
                  value={orderForm.prenom}
                  onChange={(e) => handleOrderFormChange("prenom", e.target.value)}
                  className={orderErrors.prenom ? "border-red-500" : ""}
                  placeholder="Prénom"
                />
                {orderErrors.prenom && (
                  <p className="text-xs text-red-500 mt-0.5">{orderErrors.prenom}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <Input
                  value={orderForm.telephone}
                  onChange={(e) => handleOrderFormChange("telephone", e.target.value)}
                  className={orderErrors.telephone ? "border-red-500" : ""}
                  placeholder="Téléphone"
                />
                {orderErrors.telephone && (
                  <p className="text-xs text-red-500 mt-0.5">{orderErrors.telephone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gouvernorat <span className="text-red-500">*</span>
                </label>
                <Select
                  value={orderForm.wilaya}
                  onValueChange={(value) => {
                    handleOrderFormChange("wilaya", value);
                    handleOrderFormChange("delegation", ""); // Reset delegation when wilaya changes
                  }}
                >
                  <SelectTrigger className={orderErrors.wilaya ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner un gouvernorat" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(governorates).map((gov) => (
                      <SelectItem key={gov} value={gov}>
                        {gov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orderErrors.wilaya && (
                  <p className="text-xs text-red-500 mt-0.5">{orderErrors.wilaya}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Délégation <span className="text-red-500">*</span>
                </label>
                <Select
                  value={orderForm.delegation}
                  onValueChange={(value) => handleOrderFormChange("delegation", value)}
                  disabled={!orderForm.wilaya}
                >
                  <SelectTrigger className={orderErrors.delegation ? "border-red-500" : ""}>
                    <SelectValue placeholder={orderForm.wilaya ? "Sélectionner une délégation" : "Gouvernorat d'abord"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orderForm.wilaya && governorates[orderForm.wilaya]?.map((del) => (
                      <SelectItem key={del} value={del}>
                        {del}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orderErrors.delegation && (
                  <p className="text-xs text-red-500 mt-0.5">{orderErrors.delegation}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const effectiveStock = isPromoOrigin ? (promoStock ?? 0) : quantity2;
                  return (
                    <>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        max={effectiveStock || undefined}
                        value={orderForm.quantite}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const maxQty = effectiveStock || 1;
                          const value = Number.isNaN(raw) ? 1 : Math.max(1, Math.min(maxQty, raw));
                          handleOrderFormChange("quantite", value);
                        }}
                        className={orderErrors.quantite ? "border-red-500" : ""}
                      />
                      {orderErrors.quantite && (
                        <p className="text-xs text-red-500 mt-0.5">La quantité doit être d'au moins 1</p>
                      )}
                      {isAdmin && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stock disponible : {effectiveStock}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              {(() => {
                const basePrice = parseFloat(price2 || '0');
                const unitPrice = hasDiscount2 && discountedPrice2 !== null && discountedPrice2 < basePrice 
                  ? discountedPrice2 
                  : basePrice;
                const hasActiveDiscount = hasDiscount2 && discountedPrice2 !== null && discountedPrice2 < basePrice;

                return (
                  <>
                    {hasActiveDiscount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prix unitaire (original):</span>
                        <span className="font-semibold line-through text-gray-500">{formatProductPrice(basePrice)} DT</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix unitaire {hasActiveDiscount ? '(réduit)' : ''}:</span>
                      <span className={`font-semibold ${hasActiveDiscount ? 'text-red-600' : ''}`}>
                        {formatProductPrice(unitPrice)} DT
                        {hasActiveDiscount && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">PROMO</span>}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-orange-300">
                      <span className="text-lg font-bold text-gray-900">Total estimé:</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatProductPrice(unitPrice * Math.max(1, orderForm.quantite))} DT
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Promo out-of-stock message */}
            {isPromoOrigin && (promoStock == null || promoStock <= 1) && (
              <p className="text-sm text-red-600 font-medium">
                Désolé, ce produit n&apos;est pas disponible pour le moment.
              </p>
            )}

            {/* Submit Button */}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setOrderForm({
                    nom: "",
                    prenom: "",
                    telephone: "",
                    wilaya: "",
                    delegation: "",
                    quantite: 1,
                  });
                  setOrderErrors({});
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmittingOrder || (isPromoOrigin && (promoStock == null || promoStock <= 1))}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSubmittingOrder ? "Envoi en cours..." : "Envoyer la commande"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals for Marque/Modèle Management */}
      {/* Add Marque Modal */}
      <Dialog open={showAddMarqueModal} onOpenChange={setShowAddMarqueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une marque</DialogTitle>
            <DialogDescription>
              Entrez le nom de la nouvelle marque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={tempMarqueName}
              onChange={(e) => setTempMarqueName(e.target.value)}
              placeholder="Nom de la marque"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tempMarqueName.trim() && !isSavingMarque) {
                  e.preventDefault();
                  // Handle save logic here if needed
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMarqueModal(false);
                  setTempMarqueName("");
                }}
                disabled={isSavingMarque}
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!tempMarqueName.trim()) return;
                  setIsSavingMarque(true);
                  try {
                    const response = await fetch(`${getApiBaseUrl()}/admin/marques`, {
                      method: "POST",
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ name: tempMarqueName.trim() })
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast({ title: "Succès", description: "Marque créée" });
                      setShowAddMarqueModal(false);
                      setTempMarqueName("");

                      // Refresh admin marques list
                      if (isAdmin) {
                        const allMarquesResponse = await fetch(`${getApiBaseUrl()}/admin/marques`, {
                          headers: getAuthHeaders(),
                        });
                        if (allMarquesResponse.ok) {
                          const allMarquesResult = await allMarquesResponse.json();
                          if (allMarquesResult.success) {
                            setAllMarques(allMarquesResult.marques || []);
                          }
                        }
                      }
                    } else {
                      toast({ title: "Erreur", description: result.message || "Échec", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Erreur", description: "Impossible de créer la marque", variant: "destructive" });
                  } finally {
                    setIsSavingMarque(false);
                  }
                }}
                disabled={!tempMarqueName.trim() || isSavingMarque}
              >
                {isSavingMarque ? "Enregistrement..." : "Créer"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* Add Marque Modal */}
      <Dialog open={showAddMarqueModal} onOpenChange={setShowAddMarqueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une marque</DialogTitle>
            <DialogDescription>
              Entrez le nom de la nouvelle marque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={tempMarqueName}
              onChange={(e) => setTempMarqueName(e.target.value)}
              placeholder="Nom de la marque"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tempMarqueName.trim() && !isSavingMarque) {
                  e.preventDefault();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMarqueModal(false);
                setTempMarqueName("");
              }}
              disabled={isSavingMarque}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!tempMarqueName.trim()) return;
                setIsSavingMarque(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/marques`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name: tempMarqueName.trim() })
                  });
                  if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                      toast({ 
                        title: "Erreur", 
                        description: "Accès réservé à l'administrateur", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    const errorData = await response.json().catch(() => ({}));
                    toast({ 
                      title: "Erreur", 
                      description: errorData.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                    return;
                  }
                  const result = await response.json();
                  if (result.success && result.marque) {
                    toast({ title: "Succès", description: "Marque créée" });
                    setShowAddMarqueModal(false);
                    setTempMarqueName("");
                    
                    // Refresh admin marques list
                    if (isAdmin) {
                      const adminMarquesResponse = await fetch(`${getApiBaseUrl()}/admin/marques`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminMarquesResponse.ok) {
                        const adminMarquesResult = await adminMarquesResponse.json();
                        if (adminMarquesResult.success) setAllMarques(adminMarquesResult.marques || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Marques introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingMarque(false);
                }
              }}
              disabled={!tempMarqueName.trim() || isSavingMarque}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingMarque ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Marque Modal */}
      <Dialog open={showEditMarqueModal} onOpenChange={setShowEditMarqueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la marque</DialogTitle>
            <DialogDescription>
              Modifiez le nom de la marque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={tempMarqueName}
              onChange={(e) => setTempMarqueName(e.target.value)}
              placeholder="Nom de la marque"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditMarqueModal(false);
                setEditingMarque(null);
                setTempMarqueName("");
              }}
              disabled={isSavingMarque}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!tempMarqueName.trim() || !editingMarque) return;
                setIsSavingMarque(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/marques/${editingMarque.id}`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name: tempMarqueName.trim() })
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast({ title: "Succès", description: "Marque modifiée" });
                    setShowEditMarqueModal(false);
                    setEditingMarque(null);
                    setTempMarqueName("");
                    // Refresh admin marques list
                    if (isAdmin) {
                      const adminMarquesResponse = await fetch(`${getApiBaseUrl()}/admin/marques`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminMarquesResponse.ok) {
                        const adminMarquesResult = await adminMarquesResponse.json();
                        if (adminMarquesResult.success) setAllMarques(adminMarquesResult.marques || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Marques introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingMarque(false);
                }
              }}
              disabled={!tempMarqueName.trim() || isSavingMarque}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingMarque ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Marque Confirmation */}
      <Dialog open={showDeleteMarqueConfirm} onOpenChange={setShowDeleteMarqueConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la marque</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingMarque?.name}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteMarqueConfirm(false);
                setDeletingMarque(null);
              }}
              disabled={isSavingMarque}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!deletingMarque) return;
                setIsSavingMarque(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/marques/${deletingMarque.id}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast({ title: "Succès", description: "Marque supprimée" });
                    setShowDeleteMarqueConfirm(false);
                    setDeletingMarque(null);
                    // Clear selection if deleted marque was selected
                    if (selectedMarqueId === deletingMarque.id) {
                      setSelectedMarqueId(null);
                      setSelectedModeleId(null);
                    }
                    // Refresh admin marques list
                    if (isAdmin) {
                      const adminMarquesResponse = await fetch(`${getApiBaseUrl()}/admin/marques`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminMarquesResponse.ok) {
                        const adminMarquesResult = await adminMarquesResponse.json();
                        if (adminMarquesResult.success) setAllMarques(adminMarquesResult.marques || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Marques introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingMarque(false);
                }
              }}
              disabled={isSavingMarque}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSavingMarque ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modele Modal */}
      <Dialog open={showAddModeleModal} onOpenChange={setShowAddModeleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un modèle</DialogTitle>
            <DialogDescription>
              Entrez le nom du nouveau modèle pour la marque sélectionnée
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={tempModeleName}
              onChange={(e) => setTempModeleName(e.target.value)}
              placeholder="Nom du modèle"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModeleModal(false);
                setTempModeleName("");
              }}
              disabled={isSavingModele}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!tempModeleName.trim() || !selectedMarqueId) return;
                setIsSavingModele(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/modeles`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ marqueId: selectedMarqueId, name: tempModeleName.trim() })
                  });
                  const result = await response.json();
                  if (result.success && result.modele) {
                    toast({ title: "Succès", description: "Modèle créé" });
                    setShowAddModeleModal(false);
                    setTempModeleName("");

                    // Refresh vehicle models (source of truth for the selector)
                    await fetchVehicleModels();
                    
                    // Refresh admin modeles list
                    if (isAdmin && adminSelectedMarqueForModeles === selectedMarqueId) {
                      const adminModelesResponse = await fetch(`${getApiBaseUrl()}/admin/modeles?marqueId=${selectedMarqueId}`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminModelesResponse.ok) {
                        const adminModelesResult = await adminModelesResponse.json();
                        if (adminModelesResult.success) setAllModeles(adminModelesResult.modeles || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Modèles introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Modèles introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingModele(false);
                }
              }}
              disabled={!tempModeleName.trim() || !selectedMarqueId || isSavingModele}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingModele ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modele Modal */}
      <Dialog open={showEditModeleModal} onOpenChange={setShowEditModeleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le modèle</DialogTitle>
            <DialogDescription>
              Modifiez le nom du modèle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={tempModeleName}
              onChange={(e) => setTempModeleName(e.target.value)}
              placeholder="Nom du modèle"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModeleModal(false);
                setEditingModele(null);
                setTempModeleName("");
              }}
              disabled={isSavingModele}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!tempModeleName.trim() || !editingModele) return;
                setIsSavingModele(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/modeles/${editingModele.id}`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name: tempModeleName.trim() })
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast({ title: "Succès", description: "Modèle modifié" });
                    setShowEditModeleModal(false);
                    setEditingModele(null);
                    setTempModeleName("");

                    // Refresh vehicle models (source of truth for the selector)
                    await fetchVehicleModels();
                    // Refresh admin modeles list
                    if (isAdmin && adminSelectedMarqueForModeles) {
                      const adminModelesResponse = await fetch(`${getApiBaseUrl()}/admin/modeles?marqueId=${adminSelectedMarqueForModeles}`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminModelesResponse.ok) {
                        const adminModelesResult = await adminModelesResponse.json();
                        if (adminModelesResult.success) setAllModeles(adminModelesResult.modeles || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Modèles introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingModele(false);
                }
              }}
              disabled={!tempModeleName.trim() || isSavingModele}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingModele ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modele Confirmation */}
      <Dialog open={showDeleteModeleConfirm} onOpenChange={setShowDeleteModeleConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le modèle</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingModele?.name}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModeleConfirm(false);
                setDeletingModele(null);
              }}
              disabled={isSavingModele}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!deletingModele) return;
                setIsSavingModele(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/admin/modeles/${deletingModele.id}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast({ title: "Succès", description: "Modèle supprimé" });
                    setShowDeleteModeleConfirm(false);
                    setDeletingModele(null);
                    // Clear selection if deleted modele was selected
                    if (selectedModeleId === deletingModele.id) {
                      setSelectedModeleId(null);
                    }

                    // Refresh vehicle models (source of truth for the selector)
                    await fetchVehicleModels();
                    // Refresh admin modeles list
                    if (isAdmin && adminSelectedMarqueForModeles) {
                      const adminModelesResponse = await fetch(`${getApiBaseUrl()}/admin/modeles?marqueId=${adminSelectedMarqueForModeles}`, { 
                        cache: 'no-store',
                        headers: getAuthHeaders()
                      });
                      if (adminModelesResponse.ok) {
                        const adminModelesResult = await adminModelesResponse.json();
                        if (adminModelesResult.success) setAllModeles(adminModelesResult.modeles || []);
                      }
                    }
                  } else {
                    toast({ 
                      title: "Erreur", 
                      description: result.message || "Erreur serveur (API Marques introuvable)", 
                      variant: "destructive" 
                    });
                  }
                } catch (error) {
                  toast({ 
                    title: "Erreur", 
                    description: "Erreur serveur (API Modèles introuvable)", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsSavingModele(false);
                }
              }}
              disabled={isSavingModele}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSavingModele ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acha2;

