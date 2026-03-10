import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  getOrCreateAchaProduct, 
  updateAchaProduct, 
  venteHorsLigneAchaProduct,
  AchaProductData,
  addDashboardProduct,
  updateDashboardProduct,
  getDashboardProducts,
  createOrder
} from "@/api/database";
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  X, 
  Edit3, 
  Save, 
  ShoppingCart,
  Zap,
  ImagePlus,
  Trash2,
  Plus,
  Package,
  MinusCircle,
  Tag
} from "lucide-react";

// ==========================================
// TUNISIA WILAYAS & DELEGATIONS DATA
// ==========================================
const TUNISIA_DATA: Record<string, string[]> = {
  "Tunis": ["Tunis Ville", "Le Bardo", "La Marsa", "Carthage", "Sidi Bou Said", "La Goulette", "Le Kram", "Sidi Hassine", "El Ouardia", "Ettahrir", "Ezzouhour", "El Menzah", "El Omrane", "El Omrane Supérieur", "Hrairia", "Séjoumi", "Médina", "Bab El Bhar", "Bab Souika", "El Kabaria", "Cité El Khadra"],
  "Ariana": ["Ariana Ville", "La Soukra", "Raoued", "Sidi Thabet", "Ettadhamen", "Mnihla", "Kalâat el-Andalous"],
  "Ben Arous": ["Ben Arous", "El Mourouj", "Hammam Lif", "Hammam Chott", "Bou Mhel el-Bassatine", "Ezzahra", "Radès", "Mégrine", "Mohamedia", "Fouchana", "Mornag", "Nouvelle Médina"],
  "Manouba": ["Manouba", "Den Den", "Douar Hicher", "Oued Ellil", "Tebourba", "El Batan", "Borj El Amri", "Jedaida", "Mornaguia"],
  "Nabeul": ["Nabeul", "Hammamet", "Dar Chaâbane", "Béni Khiar", "Korba", "Menzel Temime", "Kelibia", "El Haouaria", "Soliman", "Menzel Bouzelfa", "Bou Argoub", "Grombalia", "Takelsa", "Hammam Ghezèze", "El Mida"],
  "Zaghouan": ["Zaghouan", "Zriba", "Bir Mcherga", "Djebel Oust", "El Fahs", "Nadhour"],
  "Bizerte": ["Bizerte", "Menzel Bourguiba", "Menzel Jemil", "Menzel Abderrahman", "Mateur", "Ras Jebel", "Raf Raf", "Ghar El Melh", "Utique", "Tinja", "Sejnane", "Joumine", "Ghezala"],
  "Béja": ["Béja", "Medjez el-Bab", "Testour", "Téboursouk", "Nefza", "Goubellat", "Thibar", "Amdoun", "El Ma'goula"],
  "Jendouba": ["Jendouba", "Bou Salem", "Tabarka", "Ain Draham", "Fernana", "Ghardimaou", "Oued Mliz", "Balta-Bou Aouane"],
  "Kef": ["Le Kef", "Nebeur", "Tajerouine", "Sers", "Dahmani", "Kalâat Snan", "Kalâat Khasba", "Jérissa", "El Ksour", "Sakiet Sidi Youssef"],
  "Siliana": ["Siliana", "Bou Arada", "Gaafour", "El Krib", "Sidi Bou Rouis", "Kesra", "Bargou", "Makthar", "Rouhia", "El Aroussa", "Sidi Hmada"],
  "Sousse": ["Sousse Ville", "Sousse Jawhara", "Sousse Riadh", "Sousse Sidi Abdelhamid", "Hammam Sousse", "Akouda", "Kalâa Kebira", "Kalâa Sghira", "Sidi Bou Ali", "Hergla", "Enfidha", "Msaken", "Bouficha", "Kondar", "Sidi El Heni"],
  "Monastir": ["Monastir", "Ksar Hellal", "Moknine", "Jemmal", "Zéramdine", "Bembla", "Sahline", "Téboulba", "Bekalta", "Sayada-Lamta-Bou Hajar", "Ouerdanine", "Beni Hassen"],
  "Mahdia": ["Mahdia", "El Jem", "Ksour Essef", "Chebba", "Bou Merdes", "Chorbane", "Hebira", "Essouassi", "Ouled Chamekh", "Melloulèche", "Sidi Alouane"],
  "Sfax": ["Sfax Ville", "Sfax Ouest", "Sfax Sud", "Sakiet Ezzit", "Sakiet Eddaïer", "Chihia", "Thyna", "El Ain", "Agareb", "Jebiniana", "El Hencha", "Menzel Chaker", "Graiba", "Bir Ali Ben Khalifa", "Skhira", "Mahares", "Kerkennah"],
  "Kairouan": ["Kairouan", "Chebika", "Sbikha", "Hajeb El Ayoun", "Nasrallah", "Oueslatia", "El Alâa", "Haffouz", "Bou Hajla", "Ain Djeloula", "Echrarda", "Menzel Mehiri"],
  "Kasserine": ["Kasserine", "Sbeitla", "Thala", "Foussana", "Fériana", "Majel Bel Abbès", "Haïdra", "Jedeliane", "El Ayoun", "Sbiba", "Hassi El Ferid", "Ezzouhour"],
  "Sidi Bouzid": ["Sidi Bouzid", "Jilma", "Regueb", "Mezzouna", "Menzel Bouzaiane", "Meknassy", "Sidi Ali Ben Aoun", "Bir El Hafey", "Cebbala Ouled Asker", "Ouled Haffouz", "Souk Jedid"],
  "Gabès": ["Gabès", "Gabès Sud", "Gabès Ouest", "Ghannouch", "Métouia", "Menzel El Habib", "El Hamma", "Matmata", "Nouvelle Matmata", "Mareth", "Djorf"],
  "Médenine": ["Médenine", "Ben Gardane", "Zarzis", "Djerba Houmt Souk", "Djerba Midoun", "Djerba Ajim", "Beni Khedache", "Sidi Makhlouf"],
  "Tataouine": ["Tataouine", "Ghomrassen", "Bir Lahmar", "Smar", "Remada", "Dehiba"],
  "Gafsa": ["Gafsa", "El Ksar", "Moularès", "Métlaoui", "Redeyef", "Mdhila", "El Guettar", "Sened", "Om El Araies", "Belkhir", "Sidi Aïch"],
  "Tozeur": ["Tozeur", "Degache", "Nefta", "Tameghza", "Hazoua"],
  "Kébili": ["Kébili", "Douz", "Souk Lahad", "El Faouar", "Jemna"]
};

const WILAYAS = Object.keys(TUNISIA_DATA);

interface ProductData {
  images: string[];
  description: string;
  price: string;
  promotion_percentage?: number;
}

// Order form interface
interface OrderFormData {
  nom: string;
  prenom: string;
  telephone: string;
  wilaya: string;
  delegation: string;
  quantite: number;
}

const Acha = () => {
  const { subId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Product data from database
  const [product, setProduct] = useState<AchaProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local product data state (for images, description, price, promotion)
  const [productData, setProductData] = useState<ProductData>({
    images: [],
    description: "",
    price: "0.000",
    promotion_percentage: 0
  });
  
  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Admin editing states
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [tempPrice, setTempPrice] = useState("");
  
  // Admin-only states
  const [newReference, setNewReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);
  const [promotionInput, setPromotionInput] = useState<number>(0);
  
  // ==========================================
  // ORDER MODAL STATE
  // ==========================================
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    nom: "",
    prenom: "",
    telephone: "",
    wilaya: "",
    delegation: "",
    quantite: 1
  });
  const [orderErrors, setOrderErrors] = useState<Partial<OrderFormData>>({});
  
  // Navigation tracking - read from localStorage
  const [savedMarque, setSavedMarque] = useState<string | null>(null);
  const [savedModele, setSavedModele] = useState<string | null>(null);
  
  // Breadcrumb state
  const [bcCatalogue, setBcCatalogue] = useState<string | null>(null);
  const [bcBrand, setBcBrand] = useState<string | null>(null);
  const [bcCatalogue2, setBcCatalogue2] = useState<string | null>(null);
  const [bcModel, setBcModel] = useState<string | null>(null);
  const [bcProduct, setBcProduct] = useState<string | null>(null);
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Get delegations based on selected wilaya
  const delegations = orderForm.wilaya ? TUNISIA_DATA[orderForm.wilaya] || [] : [];

  // Load navigation tracking and breadcrumb data from localStorage
  useEffect(() => {
    const marque = localStorage.getItem("selected_marque");
    const modele = localStorage.getItem("selected_modele");
    setSavedMarque(marque);
    setSavedModele(modele);

    // Load breadcrumb data
    setBcCatalogue(localStorage.getItem("breadcrumb_catalogue"));
    setBcBrand(localStorage.getItem("selectedBrand"));
    setBcCatalogue2(localStorage.getItem("breadcrumb_catalogue2"));
    setBcModel(localStorage.getItem("selectedModel"));
    
    // Save product name for breadcrumb
    if (subId) {
      const productName = decodeURIComponent(subId);
      localStorage.setItem("breadcrumb_product", productName);
      setBcProduct(productName);
    }
  }, [subId]);

  // Load product when page opens
  useEffect(() => {
    const loadProduct = async () => {
      if (!subId) return;
      
      setIsLoading(true);
      try {
        const productFromDb = await getOrCreateAchaProduct(subId);
        
        console.log('📦 Product loaded from DB:', {
          id: productFromDb.id,
          promotion_percentage: productFromDb.promotion_percentage,
          promotion_price: productFromDb.promotion_price,
          price: productFromDb.price,
          quantity: productFromDb.quantity
        });
        
        setProduct(productFromDb);
        setPromotionInput(productFromDb.promotion_percentage ?? 0);

        setProductData({
          images: productFromDb.images || [],
          description: productFromDb.description || "",
          price: productFromDb.price || "0.000",
          promotion_percentage: productFromDb.promotion_percentage ?? 0,
        });
        
        console.log('🔄 State set with promotion:', {
          promotion_percentage: productFromDb.promotion_percentage ?? 0,
          promotion_price: productFromDb.promotion_price
        });

      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger le produit.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [subId]);

  // Save any field to database
  const saveFieldToDatabase = async (fieldName: string, value: unknown) => {
    if (!product?.id) return;
    setIsSaving(true);

    try {
      const updatedProduct = await updateAchaProduct(product.id, { [fieldName]: value });
      setProduct(updatedProduct);
      
      // Update productData state to keep UI in sync
      if (fieldName === 'price' || fieldName === 'promotion_percentage') {
        setProductData(prev => ({
          ...prev,
          [fieldName]: value,
        }));
      }

      toast({
        title: "Succès",
        description: "Modification enregistrée.",
      });

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la modification.",
        variant: "destructive",
      });

    } finally {
      setIsSaving(false);
    }
  };

  // Handle quantity modification (admin only)
  const handleQuantityChange = async (newQuantity: number) => {
    if (!isAdmin || !product?.id) return;

    const quantity = Math.max(0, newQuantity);
    setProduct(prev => prev ? { ...prev, quantity } : null);

    await saveFieldToDatabase("quantity", quantity);
  };

  // Vente hors ligne (quantity -1)
  const handleVenteHorsLigne = async () => {
    if (!isAdmin || !product?.id) return;
    if ((product.quantity || 0) <= 0) return;

    setIsSaving(true);

    try {
      const updatedProduct = await venteHorsLigneAchaProduct(product.id);
      setProduct(updatedProduct);

      // Also update quantity in dashboard_products if it exists
      try {
        // Find dashboard product by product_id
        const dashboardProducts = await getDashboardProducts();
        const dashboardProduct = dashboardProducts?.data?.find((p: any) => 
          p.product_id === String(product.id) || p.id === String(product.id)
        );
        
        if (dashboardProduct) {
          await updateDashboardProduct(String(dashboardProduct.id), { 
            quantity: updatedProduct.quantity 
          });
          console.log('✅ Dashboard product quantity updated:', updatedProduct.quantity);
        }
      } catch (dashboardError) {
        // Non-critical error - dashboard product might not exist
        console.log('ℹ️ Dashboard product update skipped:', dashboardError);
      }

      toast({
        title: "Vente hors ligne",
        description: `Quantité mise à jour: ${updatedProduct.quantity}`,
      });

    } catch {
      toast({
        title: "Erreur",
        description: "Vente hors ligne impossible.",
        variant: "destructive",
      });

    } finally {
      setIsSaving(false);
    }
  };

  // Add reference
  const handleAddReference = async () => {
    if (!isAdmin || !product?.id || !newReference.trim()) return;

    const updated = [...(product.product_references || []), newReference.trim()];

    setProduct(prev => prev ? { ...prev, product_references: updated } : null);
    setNewReference("");

    await saveFieldToDatabase("product_references", updated);
  };

  // Remove reference
  const handleRemoveReference = async (refToRemove: string) => {
    if (!isAdmin || !product?.id) return;

    const updated = (product.product_references || []).filter(r => r !== refToRemove);

    setProduct(prev => prev ? { ...prev, product_references: updated } : null);

    await saveFieldToDatabase("product_references", updated);
  };

  // Image slideshow navigation
  const handleNextImage = useCallback(() => {
    if (productData.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % productData.images.length);
    }
  }, [productData.images.length]);

  const handlePrevImage = useCallback(() => {
    if (productData.images.length > 0) {
      setCurrentImageIndex((prev) => 
        (prev - 1 + productData.images.length) % productData.images.length
      );
    }
  }, [productData.images.length]);

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

  // Admin image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !product?.id) return;

    const remaining = 5 - productData.images.length;
    const selected = Array.from(files).slice(0, remaining);

    const newImages: string[] = [];

    for (const file of selected) {
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const updatedImages = [...productData.images, ...newImages];
    setProductData(prev => ({ ...prev, images: updatedImages }));

    await saveFieldToDatabase("images", updatedImages);

    e.target.value = "";
  };

  // Delete image
  const handleDeleteImage = async (index: number) => {
    if (!product?.id) return;

    const updated = productData.images.filter((_, i) => i !== index);
    setProductData(prev => ({ ...prev, images: updated }));

    if (currentImageIndex >= updated.length) {
      setCurrentImageIndex(Math.max(0, updated.length - 1));
    }

    await saveFieldToDatabase("images", updated);
  };

  // Save Description
  const handleSaveDescription = async () => {
    if (!product?.id) return;
    setProductData(prev => ({ ...prev, description: tempDescription }));
    setIsEditingDescription(false);
    await saveFieldToDatabase("description", tempDescription);
  };

  // Save Price
  const handleSavePrice = async () => {
    if (!product?.id) return;
    setProductData(prev => ({ ...prev, price: tempPrice }));
    setIsEditingPrice(false);
    await saveFieldToDatabase("price", tempPrice);
  };

  // Save Promotion Percentage
  const handleSavePromotion = async () => {
    if (!product?.id) return;
    
    setIsSavingPromotion(true);
    try {
      const basePrice = parseFloat(product.price || productData.price || '0');
      const promo = Number.isFinite(promotionInput) ? promotionInput : 0;
      const newPrice = promo > 0 ? basePrice * (1 - promo / 100) : basePrice;
      
      console.log('💾 Saving promotion:', {
        productId: product.id,
        basePrice,
        promotion_percentage: promo,
        calculated_promotion_price: newPrice.toFixed(3),
        dataToSend: {
          promotion_percentage: promo,
          promotion_price: newPrice.toFixed(3)
        }
      });
      
      const updatedProduct = await updateAchaProduct(product.id, {
        promotion_percentage: promo,
        promotion_price: newPrice.toFixed(3),
      });
      
      console.log('✅ Promotion saved, received from server:', {
        promotion_percentage: updatedProduct.promotion_percentage,
        promotion_price: updatedProduct.promotion_price,
        price: updatedProduct.price
      });
      
      // Update state with exactly what comes from the server
      setProduct(prev =>
        prev
          ? {
              ...prev,
              promotion_percentage: updatedProduct.promotion_percentage,
              promotion_price: updatedProduct.promotion_price,
            }
          : updatedProduct
      );
      
      setPromotionInput(updatedProduct.promotion_percentage ?? 0);
      
      console.log('🔄 State updated with promotion_percentage:', updatedProduct.promotion_percentage);
      
      toast({
        title: "Succès",
        description: "Promotion mise à jour.",
      });
    } catch (error) {
      console.error('❌ Error saving promotion:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la promotion.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPromotion(false);
    }
  };

  const startEditingDescription = () => {
    setTempDescription(productData.description);
    setIsEditingDescription(true);
  };

  const startEditingPrice = () => {
    setTempPrice(productData.price);
    setIsEditingPrice(true);
  };

  // ACTIONS
  const handleAddToCart = () => {
    toast({
      title: "Panier",
      description: "Produit ajouté au panier!",
    });
  };

  // ==========================================
  // ORDER MODAL HANDLERS
  // ==========================================
  const handleOpenOrderModal = () => {
    // Reset form when opening
    setOrderForm({
      nom: "",
      prenom: "",
      telephone: "",
      wilaya: "",
      delegation: "",
      quantite: 1
    });
    setOrderErrors({});
    setIsOrderModalOpen(true);
  };

  // Add to Dashboard
  const handleAddToDashboard = async () => {
    if (!product || !isAdmin || !product.id) return;

    try {
      const finalPrice = parseFloat(product.promotion_price?.toString() || product.price?.toString() || '0');
      const selectedImage = product.images?.[currentImageIndex] || product.images?.[0] || null;
      
      // Convert image to base64 if it's a URL (fetch and convert)
      let selectedImageBase64 = selectedImage;
      
      if (selectedImage && !selectedImage.startsWith('data:')) {
        // If it's already a base64 data URL, use it as is
        if (selectedImage.startsWith('data:image')) {
          selectedImageBase64 = selectedImage;
        } else {
          // Try to fetch and convert to base64
          try {
            const response = await fetch(selectedImage);
            const blob = await response.blob();
            const reader = new FileReader();
            selectedImageBase64 = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchError) {
            // If fetch fails, use the original URL
            selectedImageBase64 = selectedImage;
          }
        }
      }
      
      // Build dashboard product object matching backend API expectations
      const dashboardProduct = {
        name: productTitle || product.name || product.sub_id || subId || '',
        price: String(product.price || productData.price || "0.000"),
        promo_percent: product.promotion_percentage || null,
        promo_price: product.promotion_price ? String(product.promotion_price) : null,
        image: selectedImageBase64 || null,
        references: product.product_references || []
      };

      console.log('📤 Sending product to dashboard:', {
        name: dashboardProduct.name,
        price: dashboardProduct.price,
        promo_percent: dashboardProduct.promo_percent
      });

      const response = await addDashboardProduct(dashboardProduct);

      // Check response
      if (response.success) {
        toast({
          title: "Succès",
          description: response.message || "Produit ajouté au Dashboard",
        });
      } else {
        throw new Error(response.error || "Failed to add product");
      }
    } catch (error: any) {
      console.error('❌ Error adding to dashboard:', error);
      
      // Extract readable error message
      let errorMessage = "Une erreur est survenue lors de l'ajout au Dashboard.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : error.error.message || errorMessage;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
  };

  const handleOrderFormChange = (field: keyof OrderFormData, value: string | number) => {
    setOrderForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset delegation when wilaya changes
      if (field === "wilaya") {
        updated.delegation = "";
      }
      
      return updated;
    });
    
    // Clear error for this field
    if (orderErrors[field]) {
      setOrderErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateOrderForm = (): boolean => {
    const errors: Partial<OrderFormData> = {};
    
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
      errors.quantite = 1;
    }
    
    setOrderErrors(errors as Partial<OrderFormData>);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async () => {
    if (!validateOrderForm()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate product exists and has required fields
      if (!product) {
        toast({
          title: "Erreur",
          description: "Impossible de créer la commande: produit introuvable. Veuillez recharger la page.",
          variant: "destructive",
        });
        return;
      }

      // Validate product has required fields (name and price)
      if (!product.name && !productTitle) {
        toast({
          title: "Erreur",
          description: "Nom du produit manquant. Veuillez recharger la page.",
          variant: "destructive",
        });
        return;
      }

      const productPrice = product.price || productData.price || "0.000";
      if (!productPrice || parseFloat(productPrice) < 0) {
        toast({
          title: "Erreur",
          description: "Prix du produit invalide. Veuillez recharger la page.",
          variant: "destructive",
        });
        return;
      }

      // Prepare order data
      const productImage = productData.images && productData.images.length > 0 
        ? productData.images[0] 
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

      // Prepare full product object for snapshot
      const productObject = {
        id: product.id || null,
        sub_id: product.sub_id || subId || null,
        name: productTitle,
        price: productPrice,
        image: productImage && productImage.length < 10000 ? productImage : null,
        product_image: productImage && productImage.length < 10000 ? productImage : null,
        references: product?.product_references || [],
        product_references: product?.product_references || [],
        brand_name: product?.brand_name || null,
        model_name: product?.model_name || null,
        description: product?.description || productData.description || null,
        promotion_percentage: product?.promotion_percentage || null,
        promotion_price: product?.promotion_price || null,
        quantity: product?.quantity || null,
        images: productData.images || product?.images || []
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

        // Marque/Modèle snapshot (from localStorage if available)
        brandName: savedMarque || null,
        modelName: savedModele || null
      };

      // Final validation: ensure quantity is valid
      if (!Number.isInteger(orderData.quantity) || orderData.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      console.log('📦 Frontend: Sending order with product snapshot:', {
        product_name: orderData.product.name,
        product_price: orderData.product.price
      });

      // Submit order to API
      await createOrder(orderData);

      // Show success toast
      toast({
        title: "Commande envoyée!",
        description: `Merci ${orderForm.prenom}! Nous vous contacterons bientôt.`,
      });

      // Reset form
      setOrderForm({
        nom: "",
        prenom: "",
        telephone: "",
        wilaya: "",
        delegation: "",
        quantite: 1
      });

      // Close modal
      setIsOrderModalOpen(false);
    } catch (error: any) {
      console.error("❌ Error submitting order:", error);
      
      // Extract readable error message
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

  const productTitle = decodeURIComponent(subId || "Produit");

  // ==============================
  // RENDER PAGE
  // ==============================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto p-10">
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:py-10">

        {/* Mobile-Optimized Breadcrumb */}
        <nav className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center text-xs sm:text-sm text-gray-500 gap-1 whitespace-nowrap">
            <a href="/" className="hover:text-orange-500 font-medium">Accueil</a>
            <span className="text-gray-400">›</span>
            {bcCatalogue && <span className="truncate max-w-[70px] sm:max-w-[80px]">{bcCatalogue}</span>}
            {bcBrand && (
              <>
                <span className="text-gray-400">›</span>
                <span className="truncate max-w-[70px] sm:max-w-[80px]">{bcBrand}</span>
              </>
            )}
            {bcModel && (
              <>
                <span className="text-gray-400">›</span>
                <span className="truncate max-w-[70px] sm:max-w-[80px]">{bcModel}</span>
              </>
            )}
            <span className="text-gray-400">›</span>
            <span className="text-gray-900 font-semibold truncate max-w-[90px] sm:max-w-[100px]">{productTitle}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">

          {/* ========== IMAGES ========== */}
          <section className="space-y-3 sm:space-y-4">

            <div
              className="relative h-[260px] sm:h-[320px] lg:aspect-square lg:h-auto bg-white rounded-xl shadow overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Promotion Badge */}
              {product?.promotion_percentage && parseFloat(product.promotion_percentage.toString()) > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    backgroundColor: "rgba(255, 0, 0, 0.85)",
                    color: "white",
                    fontWeight: "bold",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    zIndex: 20,
                    fontSize: "16px"
                  }}
                >
                  🔥 PROMO {product.promotion_percentage}%
                </div>
              )}

              {productData.images.length > 0 ? (
                <>
                  {productData.images.map((image, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentImageIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <img
                        src={image}
                        className="object-contain w-full h-full p-2 sm:p-4"
                        alt="Product"
                      />

                      {/* DELETE IMAGE */}
                      {isAdmin && index === currentImageIndex && (
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 text-white p-1.5 sm:p-2 rounded-full shadow"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {productData.images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 sm:p-3 rounded-full"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 sm:p-3 rounded-full"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-full text-gray-400">
                  <ImagePlus className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <span className="text-sm">Aucune image</span>
                </div>
              )}
            </div>

            {/* Thumbs */}
            {productData.images.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2 justify-center overflow-x-auto">
                {productData.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleDotClick(i)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === i
                        ? "border-orange-500"
                        : "border-gray-200"
                    }`}
                  >
                    <img src={img} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}

            {/* Upload Images (Admin) */}
            {isAdmin && productData.images.length < 5 && (
              <label className="border-2 border-dashed border-orange-400 p-3 sm:p-4 rounded-xl block text-center cursor-pointer">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-orange-600" />
                <p className="text-xs sm:text-sm text-orange-600 mt-1">
                  Ajouter des images ({productData.images.length}/5)
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

          {/* ========== INFO ========== */}
          <section className="space-y-4 sm:space-y-6">

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">{productTitle}</h1>

            {/* ADMIN BLOCK: Quantity + References */}
            {isAdmin && product && (
              <>
                {/* Quantity */}
                <div className="bg-purple-50 border border-purple-200 p-3 sm:p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-800 flex items-center gap-2 text-sm sm:text-base">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" /> Quantité du produit
                  </h3>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-3">
                    <Input
                      type="number"
                      value={product.quantity || 0}
                      min={0}
                      onChange={(e) =>
                        handleQuantityChange(parseInt(e.target.value) || 0)
                      }
                      className="w-full sm:w-24 text-center font-bold h-10"
                    />

                    <Button
                      onClick={handleVenteHorsLigne}
                      disabled={(product.quantity || 0) <= 0 || isSaving}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 h-10 text-sm"
                    >
                      <MinusCircle className="w-4 h-4" /> Vente hors ligne
                    </Button>
                  </div>

                  {product.quantity === 0 && (
                    <p className="text-xs sm:text-sm mt-2 text-red-600">Stock épuisé</p>
                  )}
                </div>

                {/* References */}
                <div className="bg-green-50 border border-green-200 p-3 sm:p-4 rounded-xl">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2 text-sm sm:text-base">
                    <Tag className="w-4 h-4 sm:w-5 sm:h-5" /> Références
                  </h3>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                    {(product.product_references || []).length === 0 ? (
                      <p className="text-xs sm:text-sm text-gray-500 italic">
                        Aucune référence
                      </p>
                    ) : (
                      product.product_references.map((ref, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 sm:gap-2 bg-white border border-green-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                        >
                          <span className="truncate max-w-[100px] sm:max-w-none">{ref}</span>
                          <button
                            onClick={() => handleRemoveReference(ref)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add reference */}
                  <div className="flex gap-2 mt-3 sm:mt-4">
                    <Input
                      type="text"
                      placeholder="Nouvelle référence"
                      value={newReference}
                      onChange={(e) => setNewReference(e.target.value)}
                      className="flex-1 h-10 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddReference();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddReference}
                      disabled={!newReference.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white h-10 px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* USER VIEW: SHOW REFERENCES */}
            {!isAdmin &&
              product?.product_references &&
              product.product_references.length > 0 && (
                <div className="bg-white border p-3 sm:p-4 rounded-xl shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                    Références
                  </h3>

                  <ul className="space-y-1">
                    {product.product_references.map((ref, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                        <span className="break-words">{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* DESCRIPTION */}
            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex justify-between items-center px-3 sm:px-4 py-2 sm:py-3 border-b">
                <h3 className="font-semibold text-sm sm:text-base">DESCRIPTION</h3>

                {isAdmin && !isEditingDescription && (
                  <button
                    onClick={startEditingDescription}
                    className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-xs sm:text-sm"
                  >
                    <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" /> Modifier
                  </button>
                )}
              </div>

              <div className="p-3 sm:p-4">
                {isEditingDescription ? (
                  <>
                    <Textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="min-h-[100px] sm:min-h-[140px] text-sm"
                    />

                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingDescription(false)}
                        className="w-full sm:w-auto h-9 text-sm"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" /> Annuler
                      </Button>

                      <Button
                        className="w-full sm:w-auto bg-orange-500 text-white h-9 text-sm"
                        onClick={handleSaveDescription}
                      >
                        <Save className="w-3 h-3 sm:w-4 sm:h-4" /> Sauvegarder
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
                    {productData.description || "Aucune description disponible."}
                  </p>
                )}
              </div>
            </div>

            {/* PRICE */}
            <div className="bg-orange-50 border-2 border-orange-200 p-3 sm:p-5 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Prix</h3>

                {isAdmin && !isEditingPrice && (
                  <button
                    onClick={startEditingPrice}
                    className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-xs sm:text-sm"
                  >
                    <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" /> Modifier
                  </button>
                )}
              </div>

              {isEditingPrice ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      className="text-xl sm:text-2xl font-bold w-24 sm:w-32 h-10"
                    />
                    <span className="text-lg sm:text-xl">DT</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Button variant="outline" onClick={() => setIsEditingPrice(false)} className="w-full sm:w-auto h-9 text-sm">
                      <X className="w-3 h-3 sm:w-4 sm:h-4" /> Annuler
                    </Button>

                    <Button
                      className="w-full sm:w-auto bg-orange-500 text-white h-9 text-sm"
                      onClick={handleSavePrice}
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4" /> Sauvegarder
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-4 border rounded-lg bg-white shadow-sm mt-4">
                  {(() => {
                    const basePrice = parseFloat(product?.price || productData.price || '0');
                    const promoPercent = product?.promotion_percentage ?? 0;
                    const promoPrice = product?.promotion_price ? parseFloat(product.promotion_price) : null;
                    
                    const hasPromo =
                      promoPercent > 0 &&
                      promoPrice !== null &&
                      promoPrice < basePrice;

                    return hasPromo ? (
                      <div className="space-y-1">
                        <div className="text-xs sm:text-sm font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
                          <span>🔥 PROMO {promoPercent}%</span>
                        </div>
                        <div className="text-sm sm:text-base text-gray-500 line-through">
                          {basePrice.toFixed(3)} DT
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-red-600">
                          {promoPrice.toFixed(3)} DT
                        </div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-orange-700">
                        {basePrice.toFixed(3)} DT
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* ADMIN: PROMOTION PERCENTAGE */}
            {isAdmin && product && (
              <div className="bg-red-50 border border-red-200 p-3 sm:p-4 rounded-xl">
                <h3 className="font-semibold text-red-800 flex items-center gap-2 text-sm sm:text-base mb-3">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" /> Promotion (%)
                </h3>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={promotionInput}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setPromotionInput(isNaN(value) ? 0 : value);
                    }}
                    placeholder="0"
                    className="w-full sm:w-24 text-center font-bold h-10"
                  />
                  <span className="text-sm sm:text-base text-gray-700 self-center">%</span>

                  <Button
                    onClick={handleSavePromotion}
                    disabled={isSavingPromotion || (product.promotion_percentage ?? 0) === promotionInput}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 h-10 text-sm"
                  >
                    {isSavingPromotion ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Enregistrer Promotion
                      </>
                    )}
                  </Button>
                </div>

                {(() => {
                  const basePrice = parseFloat(product?.price || productData.price || '0');
                  const promoPercent = product?.promotion_percentage ?? 0;
                  const promoPrice = product?.promotion_price ? parseFloat(product.promotion_price) : null;
                  
                  const hasPromo =
                    promoPercent > 0 &&
                    promoPrice !== null &&
                    promoPrice < basePrice;

                  return promoPercent > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Prix après réduction:&nbsp;
                      <span className="font-semibold">
                        {hasPromo ? `${promoPrice.toFixed(3)} DT` : `${basePrice.toFixed(3)} DT`}
                      </span>
                    </p>
                  );
                })()}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <Button 
                onClick={handleAddToCart}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 sm:py-5 text-sm sm:text-base lg:text-lg h-auto"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Ajouter au panier
              </Button>

              <Button 
                onClick={handleOpenOrderModal}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 sm:py-5 text-sm sm:text-base lg:text-lg h-auto"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Commander
              </Button>

              {/* Admin: Add to Dashboard */}
              {isAdmin && (
                <Button 
                  onClick={handleAddToDashboard}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg shadow mt-3"
                >
                  Add to Dashboard
                </Button>
              )}
            </div>

          </section>

        </div>
      </main>

      <Footer />

      {/* ==========================================
          ORDER MODAL - Mobile Optimized
          ========================================== */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="w-[92%] sm:max-w-[500px] p-4 sm:p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-2xl font-bold text-gray-900">
              Commander ce produit
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-xs sm:text-sm">
              Remplissez vos informations pour passer commande.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            {/* Product Details Block */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border mb-4">
              <p className="text-xs sm:text-sm leading-snug font-semibold">
                Produit : <span className="text-red-600 font-bold truncate">{productTitle}</span>
              </p>
              <p className="text-xs sm:text-sm leading-snug font-semibold mt-1">
                Marque :
                <span className="text-gray-700 font-normal ml-1">
                  {savedMarque || "Non spécifiée"}
                </span>
              </p>
              <p className="text-xs sm:text-sm leading-snug font-semibold mt-1">
                Modèle :
                <span className="text-gray-700 font-normal ml-1">
                  {savedModele || "Non spécifié"}
                </span>
              </p>
              <p className="text-xs sm:text-sm leading-snug font-semibold mt-1">
                Réf :
                <span className="text-gray-700 font-normal ml-1 break-words">
                  {(product?.product_references || []).join(", ") || "—"}
                </span>
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom"
                    value={orderForm.nom}
                    onChange={(e) => handleOrderFormChange("nom", e.target.value)}
                    className={`w-full h-10 text-sm ${orderErrors.nom ? "border-red-500" : ""}`}
                  />
                  {orderErrors.nom && (
                    <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">{orderErrors.nom}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Prénom"
                    value={orderForm.prenom}
                    onChange={(e) => handleOrderFormChange("prenom", e.target.value)}
                    className={`w-full h-10 text-sm ${orderErrors.prenom ? "border-red-500" : ""}`}
                  />
                  {orderErrors.prenom && (
                    <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">{orderErrors.prenom}</p>
                  )}
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="XX XXX XXX"
                  value={orderForm.telephone}
                  onChange={(e) => handleOrderFormChange("telephone", e.target.value)}
                  className={`w-full h-10 text-sm ${orderErrors.telephone ? "border-red-500" : ""}`}
                />
                {orderErrors.telephone && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">{orderErrors.telephone}</p>
                )}
              </div>

              {/* Wilaya */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Gouvernorat <span className="text-red-500">*</span>
                </label>
                <Select
                  value={orderForm.wilaya}
                  onValueChange={(value) => handleOrderFormChange("wilaya", value)}
                >
                  <SelectTrigger className={`w-full h-10 text-sm ${orderErrors.wilaya ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {WILAYAS.map((wilaya) => (
                      <SelectItem key={wilaya} value={wilaya} className="text-sm">
                        {wilaya}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orderErrors.wilaya && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">{orderErrors.wilaya}</p>
                )}
              </div>

              {/* Délégation */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Délégation <span className="text-red-500">*</span>
                </label>
                <Select
                  value={orderForm.delegation}
                  onValueChange={(value) => handleOrderFormChange("delegation", value)}
                  disabled={!orderForm.wilaya}
                >
                  <SelectTrigger className={`w-full h-10 text-sm ${orderErrors.delegation ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={orderForm.wilaya ? "Sélectionnez" : "Gouvernorat d'abord"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {delegations.map((delegation) => (
                      <SelectItem key={delegation} value={delegation} className="text-sm">
                        {delegation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orderErrors.delegation && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">{orderErrors.delegation}</p>
                )}
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Quantité <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={orderForm.quantite}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    const value = Number.isNaN(raw) || raw < 1 ? 1 : raw;
                    handleOrderFormChange("quantite", value);
                  }}
                  className="w-20 sm:w-24 h-10 text-sm text-center"
                />
              </div>

              {/* Price Summary */}
              <div className="bg-orange-50 border border-orange-200 p-3 sm:p-4 rounded-lg">
                {(() => {
                  // Use product.promotion_percentage as primary source, fallback to productData
                  const promoFromProduct = product?.promotion_percentage ?? 0;
                  const promoFromData = productData.promotion_percentage ?? 0;
                  const promo = Number(promoFromProduct || promoFromData);
                  
                  const basePrice = parseFloat(product?.price || productData.price || '0');
                  const promoPercent = product?.promotion_percentage ?? 0;
                  const promoPrice = product?.promotion_price ? parseFloat(product.promotion_price) : null;
                  
                  const hasPromo =
                    promoPercent > 0 &&
                    promoPrice !== null &&
                    promoPrice < basePrice;

                  return hasPromo ? (
                    <>
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-700">Prix unitaire (original):</span>
                        <span className="font-semibold line-through text-gray-500">{basePrice.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm mt-1">
                        <span className="text-gray-700">Prix unitaire (promo):</span>
                        <span className="font-semibold text-red-600">{promoPrice.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-300">
                        <span className="text-gray-700 text-xs sm:text-sm">Total estimé:</span>
                        <span className="text-base sm:text-xl font-bold text-orange-600">
                          {(promoPrice * Math.max(1, orderForm.quantite)).toFixed(3)} DT
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-700">Prix unitaire:</span>
                        <span className="font-semibold">{basePrice.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-700 text-xs sm:text-sm">Total estimé:</span>
                        <span className="text-base sm:text-xl font-bold text-orange-600">
                          {(basePrice * Math.max(1, orderForm.quantite)).toFixed(3)} DT
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Fixed Buttons at Bottom */}
          <div className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleCloseOrderModal}
                className="w-full sm:flex-1 h-10 sm:h-11 text-sm"
              >
                Fermer
              </Button>

              <Button
                onClick={handleSubmitOrder}
                className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 text-white h-10 sm:h-11 text-sm"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Valider
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acha;
