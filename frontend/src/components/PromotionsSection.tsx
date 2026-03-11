import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { Edit2, Upload, Image as ImageIcon, Plus, X, Trash2, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPromotions,
  getOrders,
  type PromotionData,
  updateSectionContent,
  deleteOffreHistoriqueByPromo,
} from "@/api/database";
import { resolveImageUrl } from "@/utils/apiConfig";
import { uploadImage } from "@/services/uploadService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProcessedOrderIds } from "@/hooks/useProcessedOrderIds";

interface Offer {
  id: number;
  title: string;
  price: string;
  oldPrice?: string;
  image?: string;
  expiresAt?: string;
  badge?: string;
  productSlug?: string;
  reference?: string;
  stock?: number | null;
  alertThreshold?: number | null;
}

type PromotionDataWithReference = PromotionData & {
  reference?: string;
  stock?: number | null;
  alertThreshold?: number | null;
};

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

/** Disabled: caused page scroll jump. See PROMOTIONS_SECTION_FINAL_FIX.md. Manual prev/next and card click still work. */
const CAROUSEL_AUTO_SCROLL_AND_AUTOPLAY_ENABLED = false;
/** Disabled: scroll restore on edit exit could cause jump. Re-enable when safe. */
const SCROLL_LOCK_IN_EDIT_ENABLED = false;

const PromotionsSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [editedOffer, setEditedOffer] = useState<Partial<Offer>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [newOfferSlug, setNewOfferSlug] = useState("");
  const [newOfferSlugTouched, setNewOfferSlugTouched] = useState(false);
  const [newOfferReference, setNewOfferReference] = useState("");
  const [newOfferBadge, setNewOfferBadge] = useState("");
  const [newOfferExpiresAt, setNewOfferExpiresAt] = useState(""); // yyyy-mm-dd
  const [newOfferStock, setNewOfferStock] = useState<string>("");
  const [newOfferAlertThreshold, setNewOfferAlertThreshold] = useState<string>("");
  const [newOfferImage, setNewOfferImage] = useState<string | undefined>(undefined);
  const [isUploadingNewOfferImage, setIsUploadingNewOfferImage] = useState(false);
  const [deleteOfferId, setDeleteOfferId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const newOfferFileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = editingOfferId !== null;

  const { data: promotionsData = [], isLoading: isLoadingPromotions } =
    useQuery({
      queryKey: ["promotions"],
      queryFn: getPromotions,
      staleTime: 0,
    });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => getOrders({ status: "pending" }),
    staleTime: 1000 * 60,
    enabled: !!isAdmin,
  });

  const processedOrderIds = useProcessedOrderIds();

  const pendingPromoIds = useMemo(() => {
    const ids = new Set<number>();
    (pendingOrders || []).forEach((o: { id?: number; origin?: string; promo_id?: number }) => {
      if (processedOrderIds.has(Number(o.id))) return;
      if (o.origin === "promotion" && o.promo_id != null && Number.isFinite(o.promo_id)) {
        ids.add(Number(o.promo_id));
      }
    });
    return ids;
  }, [pendingOrders, processedOrderIds]);

  const [offers, setOffers] = useState<Offer[]>([]);

  const upsertPromotion = async (
    promoId: number,
    promoData: Partial<PromotionDataWithReference>
  ) => {
    const clean = (promo: PromotionDataWithReference): PromotionDataWithReference => {
      const cleaned: PromotionDataWithReference = { id: promo.id };
      if (promo.title !== undefined && promo.title !== null) cleaned.title = String(promo.title);
      if (promo.price !== undefined && promo.price !== null) cleaned.price = String(promo.price);
      if (promo.oldPrice !== undefined && promo.oldPrice !== null) cleaned.oldPrice = String(promo.oldPrice);
      if (promo.originalPrice !== undefined && promo.originalPrice !== null) cleaned.originalPrice = String(promo.originalPrice);
      if (promo.image !== undefined && promo.image !== null) cleaned.image = String(promo.image);
      if (promo.badge !== undefined && promo.badge !== null) cleaned.badge = String(promo.badge);
      if (promo.productId !== undefined && promo.productId !== null) cleaned.productId = String(promo.productId);
      if ((promo as any).product_slug !== undefined && (promo as any).product_slug !== null) {
        (cleaned as any).product_slug = String((promo as any).product_slug);
      }
      if (promo.expiresAt !== undefined && promo.expiresAt !== null) {
        cleaned.expiresAt =
          typeof promo.expiresAt === "string"
            ? promo.expiresAt
            : new Date(promo.expiresAt).toISOString();
      }
      if ((promo as any).reference !== undefined && (promo as any).reference !== null) {
        (cleaned as any).reference = String((promo as any).reference);
      }
      const rawStock = (promo as any).stock ?? (promo as any).stock_disponible;
      if (rawStock !== undefined && rawStock !== null) {
        const n = typeof rawStock === "number" ? rawStock : parseInt(String(rawStock), 10);
        (cleaned as any).stock = Number.isFinite(n) ? n : null;
      } else if ("stock" in promo || "stock_disponible" in promo) {
        (cleaned as any).stock = null;
      }
      const rawThreshold = (promo as any).alertThreshold ?? (promo as any).seuil_alerte;
      if (rawThreshold !== undefined && rawThreshold !== null) {
        const n = typeof rawThreshold === "number" ? rawThreshold : parseInt(String(rawThreshold), 10);
        (cleaned as any).alertThreshold = Number.isFinite(n) ? n : null;
      } else if ("alertThreshold" in promo || "seuil_alerte" in promo) {
        (cleaned as any).alertThreshold = null;
      }
      return cleaned;
    };

    const currentPromotions =
      (await getPromotions()) as unknown as PromotionDataWithReference[];

    const exists = (currentPromotions || []).some((p) => p && p.id === promoId);
    const merged: PromotionDataWithReference[] = exists
      ? (currentPromotions || []).map((p) =>
          p.id === promoId ? ({ ...p, ...promoData, id: promoId } as any) : p
        )
      : [...(currentPromotions || []), ({ id: promoId, ...promoData } as any)];

    const cleanedPromotions = merged
      .filter((p) => p && typeof p.id === "number")
      .map((p) => clean(p));

    await updateSectionContent("promotions", {
      sectionType: "promotions",
      title: "PROMOTIONS",
      content: cleanedPromotions,
    });

    return cleanedPromotions;
  };

  // Build offers from API data
  useEffect(() => {
    if (isLoadingPromotions) return;

    const parseStock = (v: unknown): number | null | undefined => {
      if (v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    };

    const initializedOffers: Offer[] = (promotionsData || [])
      .filter((promo) => promo && typeof promo.id === "number")
      .map((promo: PromotionData, index: number): Offer => {
        const productSlug =
          (promo as any).product_slug ||
          (promo as any).productSlug ||
          (promo as any).slug ||
          undefined;

        return {
          id: promo.id,
          title: promo.title || `Offre ${index + 1}`,
          price: promo.price || (promo as any).originalPrice || "0",
          oldPrice: promo.oldPrice || (promo as any).originalPrice,
          image: promo.image,
          expiresAt:
            promo.expiresAt ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          badge: promo.badge || "",
          productSlug,
          reference:
            (promo as any).reference ||
            (promo as any).ref ||
            (promo as any).product_ref ||
            undefined,
          stock: parseStock((promo as any).stock ?? (promo as any).stock_disponible),
          alertThreshold: parseStock((promo as any).alertThreshold ?? (promo as any).seuil_alerte),
        };
      });

    setOffers(initializedOffers);
  }, [promotionsData, isLoadingPromotions]);

  // Keep currentIndex safe when list length changes
  useEffect(() => {
    if (offers.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => prev % offers.length);
  }, [offers.length]);

  // Scroll active card into view — disabled when CAROUSEL_AUTO_SCROLL_AND_AUTOPLAY_ENABLED is false (fixes scroll jump)
  useEffect(() => {
    if (!CAROUSEL_AUTO_SCROLL_AND_AUTOPLAY_ENABLED) return;
    if (isEditing) return;
    if (offers.length === 0) return;
    if (isPaused) return;
    const container = carouselRef.current;
    if (!container) return;
    const child = container.children[currentIndex] as HTMLElement | undefined;
    if (!child) return;
    requestAnimationFrame(() => {
      child.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    });
  }, [currentIndex, offers.length, isPaused, isEditing]);

  const updatePromotionMutation = useMutation({
    mutationFn: async ({
      promoId,
      promoData,
    }: {
      promoId: number;
      promoData: Partial<PromotionDataWithReference>;
    }) => {
      return await upsertPromotion(promoId, promoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({
        title: "Succès",
        description: "Offre mise à jour avec succès",
      });
      setEditingOfferId(null);
      setEditedOffer({});
      setTimeout(() => {
        setIsPaused(false);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'offre",
        variant: "destructive",
      });
    },
  });

  const createPromotionMutation = useMutation({
    mutationFn: async (payload: {
      promoId: number;
      promoData: Partial<PromotionDataWithReference>;
    }) => {
      return await upsertPromotion(payload.promoId, payload.promoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({
        title: "Succès",
        description: "Offre créée avec succès",
      });
      setIsAddModalOpen(false);
      setNewOfferTitle("");
      setNewOfferSlug("");
      setNewOfferSlugTouched(false);
      setNewOfferReference("");
      setNewOfferBadge("");
      setNewOfferExpiresAt("");
      setNewOfferStock("");
      setNewOfferAlertThreshold("");
      setNewOfferImage(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'offre",
        variant: "destructive",
      });
    },
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (promoId: number) => {
      // Use same data source as getPromotions() and persist via sectionContent
      const currentPromotions = await getPromotions();
      const remainingPromotions = (currentPromotions || []).filter(
        (p) => p && typeof p.id === "number" && p.id !== promoId
      );

      await updateSectionContent("promotions", {
        sectionType: "promotions",
        title: "PROMOTIONS",
        content: remainingPromotions,
      });

      // Remove from offre-historique when promotion is deleted (keeps lists in sync)
      try {
        await deleteOffreHistoriqueByPromo(promoId);
      } catch (err) {
        console.warn("deleteOffreHistoriqueByPromo failed (promo already deleted):", err);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({
        title: "Supprimé",
        description: "L'offre a été supprimée avec succès",
      });

      // Notify admin offre-historique page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offre-historique-updated"));
        try {
          window.localStorage?.setItem("offre-historique-updated", String(Date.now()));
        } catch {
          /* ignore */
        }
      }

      if (deleteOfferId !== null && editingOfferId === deleteOfferId) {
        setEditingOfferId(null);
        setEditedOffer({});
      }

      setIsDeleteModalOpen(false);
      setDeleteOfferId(null);
      setTimeout(() => setIsPaused(false), 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'offre",
        variant: "destructive",
      });
    },
  });

  const openDeleteOfferModal = (offerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isUploading || isUploadingNewOfferImage) return;
    setIsPaused(true);
    setDeleteOfferId(offerId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteOffer = async () => {
    if (deleteOfferId === null) return;
    // Safety: don't delete while any upload is in progress
    if (isUploading || isUploadingNewOfferImage) return;

    await deletePromotionMutation.mutateAsync(deleteOfferId);
  };

  // Auto-generate slug from title until user edits slug manually
  useEffect(() => {
    if (newOfferSlugTouched) return;
    setNewOfferSlug(slugify(newOfferTitle || ""));
  }, [newOfferTitle, newOfferSlugTouched]);

  const openAddOfferModal = () => {
    setIsAddModalOpen(true);
    setNewOfferTitle("");
    setNewOfferSlug("");
    setNewOfferSlugTouched(false);
    setNewOfferReference("");
    setNewOfferBadge("");
    setNewOfferExpiresAt("");
    setNewOfferStock("");
    setNewOfferAlertThreshold("");
    setNewOfferImage(undefined);
  };

  const handleCreateOffer = async () => {
    const title = newOfferTitle.trim();
    const slug = (newOfferSlug || slugify(title)).trim();
    if (!title || !slug) return;

    const ids = (promotionsData || [])
      .map((p) => (p && typeof p.id === "number" ? p.id : -1))
      .filter((n) => Number.isFinite(n));
    const nextId = (ids.length ? Math.max(...ids) : -1) + 1;

    const expiresAtIso = newOfferExpiresAt
      ? new Date(`${newOfferExpiresAt}T00:00:00`).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const badgeRaw = newOfferBadge; // keep exactly what admin typed
    const badgeTrimmed = newOfferBadge.trim();
    const reference = newOfferReference.trim();
    const stockNum = newOfferStock.trim() ? parseInt(newOfferStock, 10) : null;
    const thresholdNum = newOfferAlertThreshold.trim() ? parseInt(newOfferAlertThreshold, 10) : null;
    const stock = stockNum !== null && Number.isFinite(stockNum) ? stockNum : null;
    const alertThreshold = thresholdNum !== null && Number.isFinite(thresholdNum) ? thresholdNum : null;

    await createPromotionMutation.mutateAsync({
      promoId: nextId,
      promoData: {
        title,
        product_slug: slug,
        ...(reference ? ({ reference } as any) : {}),
        ...(newOfferImage ? { image: newOfferImage } : {}),
        ...(badgeTrimmed ? { badge: badgeRaw } : {}),
        expiresAt: expiresAtIso,
        ...(stock !== null ? { stock } : {}),
        ...(alertThreshold !== null ? { alertThreshold } : {}),
      },
    });
  };

  const handleNewOfferImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingNewOfferImage(true);
    try {
      const uploadedImageUrl = await uploadImage(file);
      setNewOfferImage(uploadedImageUrl);
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Impossible d'uploader l'image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingNewOfferImage(false);
    }
  };

  // autoplay — disabled when CAROUSEL_AUTO_SCROLL_AND_AUTOPLAY_ENABLED is false (fixes scroll jump)
  useEffect(() => {
    if (!CAROUSEL_AUTO_SCROLL_AND_AUTOPLAY_ENABLED) return;
    if (isEditing) return;
    if (offers.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % offers.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [offers.length, isPaused, isEditing]);

  // lock scroll while editing — disabled when SCROLL_LOCK_IN_EDIT_ENABLED is false (avoids scroll restore jump)
  useEffect(() => {
    if (!SCROLL_LOCK_IN_EDIT_ENABLED) return;
    if (!isEditing) return;

    const scrollY = window.scrollY;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("scroll", preventScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener("wheel", preventScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchmove", preventScroll, {
      passive: false,
      capture: true,
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      window.removeEventListener("scroll", preventScroll, { capture: true });
      window.removeEventListener("wheel", preventScroll, { capture: true });
      window.removeEventListener("touchmove", preventScroll, { capture: true });

      window.scrollTo(0, scrollY);
    };
  }, [isEditing]);

  const handleUserInteraction = () => {
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 8000);
  };

  const updateScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const run = () => updateScrollButtons();
    run();
    const t = setTimeout(run, 100);
    el.addEventListener("scroll", run);
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", run);
      ro.disconnect();
    };
  }, [offers.length]);

  const handleScrollLeft = () => {
    const el = carouselRef.current;
    if (!el || !canScrollLeft) return;
    const firstCard = el.querySelector('[data-offer-card="true"]') as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 12 : 220;
    el.scrollBy({ left: -step, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    const el = carouselRef.current;
    if (!el || !canScrollRight) return;
    const firstCard = el.querySelector('[data-offer-card="true"]') as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 12 : 220;
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  const handleEditClick = (offerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsPaused(true);

    const offer = offers.find((o) => o.id === offerId);
    if (offer) {
      setEditingOfferId(offerId);
      setEditedOffer({ ...offer });
    }
  };

  const handleSaveOffer = (offerId: number) => {
    const originalOffer = offers.find((o) => o.id === offerId);
    if (!originalOffer) return;

    // Don't allow saving empty product name
    if (editedOffer.title !== undefined && !String(editedOffer.title).trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du produit est requis.",
        variant: "destructive",
      });
      return;
    }

    const nextReferenceRaw =
      editedOffer.reference !== undefined
        ? editedOffer.reference
        : originalOffer.reference;
    const nextReferenceTrimmed =
      typeof nextReferenceRaw === "string" ? nextReferenceRaw.trim() : undefined;

    const promoData: Partial<PromotionDataWithReference> = {
      title:
        editedOffer.title !== undefined ? editedOffer.title : originalOffer.title,
      price:
        editedOffer.price !== undefined ? editedOffer.price : originalOffer.price,
      oldPrice:
        editedOffer.oldPrice !== undefined
          ? editedOffer.oldPrice
          : originalOffer.oldPrice,
      expiresAt:
        editedOffer.expiresAt !== undefined
          ? editedOffer.expiresAt
          : originalOffer.expiresAt,
      badge:
        editedOffer.badge !== undefined ? editedOffer.badge : originalOffer.badge,
      image:
        editedOffer.image !== undefined ? editedOffer.image : originalOffer.image,
      ...(editedOffer.reference !== undefined
        ? // If admin cleared the field, persist null (removes reference)
          ({ reference: nextReferenceTrimmed || null } as any)
        : nextReferenceTrimmed
          ? ({ reference: nextReferenceTrimmed } as any)
          : {}),
      ...(editedOffer.stock !== undefined
        ? { stock: (editedOffer.stock == null || String(editedOffer.stock) === "") ? null : (Number(editedOffer.stock) || null) }
        : {}),
      ...(editedOffer.alertThreshold !== undefined
        ? { alertThreshold: (editedOffer.alertThreshold == null || String(editedOffer.alertThreshold) === "") ? null : (Number(editedOffer.alertThreshold) || null) }
        : {}),
    };

    updatePromotionMutation.mutate({ promoId: offerId, promoData });
  };

  const handleCancelEdit = () => {
    setEditingOfferId(null);
    setEditedOffer({});
    setTimeout(() => {
      setIsPaused(false);
    }, 1000);
  };

  const handleImageUpload = async (
    offerId: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedImageUrl = await uploadImage(file);
      if (editingOfferId === offerId) {
        setEditedOffer((prev) => ({ ...prev, image: uploadedImageUrl }));
      }
      const promoData: Partial<PromotionDataWithReference> = { image: uploadedImageUrl };
      await updatePromotionMutation.mutateAsync({ promoId: offerId, promoData });
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // IMPORTANT: promoId is the ONLY reliable detection for promotion-originated acha2 pages
  const handleOfferClick = (offer: Offer) => {
    const base = offer.productSlug || offer.title || "";
    if (!base) return;
    const slug = slugify(base);
    const params = new URLSearchParams();
    params.set("promoId", String(offer.id));
    const qs = params.toString();
    navigate(`/acha2/${slug}?${qs}`);
  };

  const calculateDiscount = (price?: string, oldPrice?: string): number => {
    if (!price || !oldPrice) return 0;
    const priceNum = parseFloat(String(price));
    const oldPriceNum = parseFloat(String(oldPrice));
    if (!Number.isFinite(priceNum) || !Number.isFinite(oldPriceNum)) return 0;
    if (priceNum <= 0 || oldPriceNum <= 0) return 0;
    if (oldPriceNum <= priceNum) return 0;
    const pct = Math.round((1 - priceNum / oldPriceNum) * 100);
    return Number.isFinite(pct) && pct > 0 ? pct : 0;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 640;

  const carouselClasses = isSmallScreen
    ? "flex gap-2 overflow-x-auto"
    : "flex gap-0 transition-transform duration-500 ease-in-out";

  if (isLoadingPromotions) {
    return (
      <section className="w-full bg-white py-4 sm:py-6">
        <div className="max-w-5xl mx-auto px-3">
          <h2 className="text-center text-lg sm:text-2xl font-extrabold tracking-wide text-[#F97316] mb-3 sm:mb-4">
            NOS OFFRES DU MOMENT
          </h2>
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-b-2 border-[#F97316] animate-spin" />
            <p className="mt-4 text-gray-600 text-sm">
              Chargement des promotions...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white mt-1 mb-1">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="relative flex items-center justify-center">
          <h2 className="text-center text-lg sm:text-2xl font-extrabold tracking-wide text-[#F97316]">
            NOS OFFRES DU MOMENT
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={openAddOfferModal}
              className="absolute right-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              aria-label="Ajouter une offre"
              title="Ajouter une offre"
            >
              <Plus className="w-5 h-5 text-[#F97316]" />
            </button>
          )}
        </div>

        <div
          className="relative w-full mt-3 sm:mt-5"
          onMouseEnter={!isEditing ? handleUserInteraction : undefined}
        >
          {/* Left/Right arrows - desktop only */}
          <button
            type="button"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            aria-label="Précédent"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-700 hover:border-[#F97316] hover:text-[#F97316] hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-md disabled:hover:text-gray-700 transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-current" />
          </button>
          <button
            type="button"
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            aria-label="Suivant"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-700 hover:border-[#F97316] hover:text-[#F97316] hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-md disabled:hover:text-gray-700 transition-all"
          >
            <ChevronRight className="w-6 h-6 text-current" />
          </button>
          <div
            ref={carouselRef}
            className="flex flex-nowrap gap-2.5 sm:gap-3 overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide snap-x snap-mandatory mobile-scroll -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3"
            aria-label={`Offres du moment (index ${currentIndex + 1})`}
          >
            {offers.map((offer) => {
              const isCardEditing = editingOfferId === offer.id;
              const displayOffer =
                isCardEditing && editedOffer.id === offer.id
                  ? editedOffer
                  : offer;
              const discount =
                typeof displayOffer.price === "string" &&
                displayOffer.price.trim() &&
                typeof displayOffer.oldPrice === "string" &&
                displayOffer.oldPrice.trim()
                  ? calculateDiscount(displayOffer.price, displayOffer.oldPrice)
                  : 0;

              const isLowStock =
                isAdmin &&
                displayOffer.stock != null &&
                displayOffer.alertThreshold != null &&
                displayOffer.stock <= displayOffer.alertThreshold;

              const isPendingPromo = isAdmin && pendingPromoIds.has(offer.id);

              const isOutOfStock = displayOffer.stock != null && displayOffer.stock <= 0;

              const cardOverlayClass =
                isLowStock ? "promo-low-stock" : isPendingPromo ? "promo-pending" : "";

              return (
                <div
                  key={offer.id}
                  data-offer-card="true"
                  className="promo-card relative flex-shrink-0 snap-start w-[170px] sm:w-[190px] lg:w-[210px] xl:w-[220px]"
                >
                  {isAdmin && (
                    <div className="promo-card-actions">
                      {isCardEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveOffer(offer.id)}
                            disabled={isUploading}
                            className="promo-card-action-btn promo-card-action-save"
                            aria-label="Enregistrer les modifications"
                            title="Enregistrer"
                          >
                            {isUploading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" aria-hidden />
                            ) : (
                              <Check className="w-5 h-5 text-emerald-600" aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isUploading}
                            className="promo-card-action-btn promo-card-action-cancel"
                            aria-label="Annuler les modifications"
                            title="Annuler"
                          >
                            <X className="w-5 h-5 text-gray-600" aria-hidden />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleEditClick(offer.id, e)}
                            className="promo-card-action-btn promo-card-action-edit"
                            aria-label="Modifier l'offre"
                            title="Modifier"
                          >
                            <Edit2 className="w-5 h-5 text-[#f97316]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openDeleteOfferModal(offer.id, e)}
                            disabled={
                              deletePromotionMutation.isPending ||
                              isUploading ||
                              isUploadingNewOfferImage
                            }
                            className="promo-card-action-btn promo-card-action-delete"
                            aria-label="Supprimer l'offre"
                            title="Supprimer"
                          >
                            {deletePromotionMutation.isPending && deleteOfferId === offer.id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-red-600" aria-hidden />
                            ) : (
                              <Trash2 className="w-5 h-5 text-red-600" aria-hidden />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div
                    className={`w-full aspect-square rounded-xl shadow-sm overflow-hidden relative transition ${
                      cardOverlayClass
                        ? cardOverlayClass === "promo-low-stock"
                          ? "promo-low-stock border border-red-400"
                          : "promo-pending"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {isCardEditing ? (
                      <div className="relative z-10 flex flex-col gap-2 p-2 text-[11px] h-full overflow-auto scrollbar-hide">
                        <div className="w-full h-24 bg-white rounded-lg flex items-center justify-center relative overflow-hidden ring-1 ring-gray-100">
                          {displayOffer.image ? (
                            <img
                              src={resolveImageUrl(displayOffer.image)}
                              alt={displayOffer.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-gray-300" />
                          )}

                          <label className="absolute bottom-1 right-1 bg-white/90 rounded-md px-2 py-0.5 text-[10px] cursor-pointer flex items-center gap-1 border border-gray-200 shadow-sm">
                            <Upload className="w-3 h-3" />
                            <span>Image</span>
                            <input
                              ref={(el) => (fileInputRefs.current[offer.id] = el)}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(offer.id, e)}
                              disabled={isUploading}
                            />
                          </label>
                        </div>

                        <Input
                          value={displayOffer.title || ""}
                          onChange={(e) =>
                            setEditedOffer((prev) => ({
                              ...prev,
                              id: offer.id,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Nom du produit"
                          className="h-7 text-[11px]"
                        />

                        <Input
                          value={displayOffer.badge || ""}
                          onChange={(e) =>
                            setEditedOffer((prev) => ({
                              ...prev,
                              id: offer.id,
                              badge: e.target.value,
                            }))
                          }
                          placeholder="Badge"
                          className="h-7 text-[11px]"
                        />

                        {isAdmin && (
                          <Input
                            value={displayOffer.reference || ""}
                            onChange={(e) =>
                              setEditedOffer((prev) => ({
                                ...prev,
                                id: offer.id,
                                reference: e.target.value,
                              }))
                            }
                            placeholder="Réf (ex: 2566)"
                            className="h-7 text-[11px]"
                          />
                        )}

                        {isAdmin && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500">Stock</label>
                              <Input
                                type="number"
                                min={0}
                                value={displayOffer.stock != null ? String(displayOffer.stock) : ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditedOffer((prev) => ({
                                    ...prev,
                                    id: offer.id,
                                    stock: v === "" ? null : (parseInt(v, 10) || null),
                                  }));
                                }}
                                placeholder="—"
                                className="h-7 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Seuil alerte</label>
                              <Input
                                type="number"
                                min={0}
                                value={displayOffer.alertThreshold != null ? String(displayOffer.alertThreshold) : ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditedOffer((prev) => ({
                                    ...prev,
                                    id: offer.id,
                                    alertThreshold: v === "" ? null : (parseInt(v, 10) || null),
                                  }));
                                }}
                                placeholder="—"
                                className="h-7 text-[11px]"
                              />
                            </div>
                          </div>
                        )}

                        <Input
                          type="date"
                          value={
                            displayOffer.expiresAt
                              ? displayOffer.expiresAt.split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setEditedOffer((prev) => ({
                              ...prev,
                              id: offer.id,
                              expiresAt: new Date(
                                e.target.value
                              ).toISOString(),
                            }))
                          }
                          className="h-7 text-[11px]"
                        />

                        <div className="flex gap-2 mt-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveOffer(offer.id)}
                            disabled={isUploading}
                            className="flex-1 bg-[#F97316] hover:bg-[#ea580c] text-white text-[11px] h-7 px-2"
                          >
                            {isUploading ? "..." : "Enregistrer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1 text-[11px] h-7 px-2"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isOutOfStock && handleOfferClick(offer)}
                        disabled={isOutOfStock}
                        className={`group relative z-10 flex flex-col w-full h-full rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                          isOutOfStock
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:shadow-md"
                        } ${
                          cardOverlayClass ? "bg-transparent" : "bg-white"
                        }`}
                      >
                        {isOutOfStock && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 rounded-xl pointer-events-none">
                            <p className="text-xs font-semibold text-white text-center px-3">
                              Désolé, ce produit n&apos;est plus disponible.
                            </p>
                          </div>
                        )}
                        {(() => {
                          const badgeRaw = displayOffer.badge ?? "";
                          const badgeTrimmed = badgeRaw.trim();
                          const showPill = discount > 0 || badgeTrimmed.length > 0;
                          if (!showPill) return null;
                          return (
                            <div className="absolute left-1.5 top-1.5 z-10">
                              <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 tracking-tight">
                                {discount > 0 ? `-${discount}%` : badgeRaw}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="grid h-full grid-rows-[7fr_3fr]">
                          {/* Image (≈70%) */}
                          <div className="min-h-0 flex items-center justify-center p-2 pt-6">
                            {displayOffer.image ? (
                              <img
                                src={resolveImageUrl(displayOffer.image)}
                                alt={displayOffer.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-300" />
                            )}
                          </div>

                          {/* Text (compact) */}
                          <div className="min-h-0 px-2 pb-2 flex flex-col justify-end gap-1">
                            <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate">
                              {displayOffer.title}
                            </p>
                            {(() => {
                              const refRaw = displayOffer.reference ?? "";
                              const refTrimmed = refRaw.trim();
                              const badgeRaw = displayOffer.badge ?? "";
                              const badgeTrimmed = badgeRaw.trim();
                              const line = refTrimmed ? `Réf: ${refRaw}` : badgeTrimmed ? badgeRaw : "";
                              if (!line) return null;
                              return (
                                <p className="text-[10px] text-gray-600 leading-tight truncate">
                                  {line}
                                </p>
                              );
                            })()}
                            <p className="text-[10px] text-gray-700 leading-tight truncate">
                              Jusqu&apos;au{" "}
                              {displayOffer.expiresAt
                                ? formatDate(displayOffer.expiresAt)
                                : "18/01/2026"}
                            </p>
                          </div>
                        </div>

                        {/* CTA pill (visual only; card remains clickable) */}
                        <span className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          Voir
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isAdmin && isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter une offre"
          onMouseDown={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Ajouter une offre
                </div>
                <div className="text-xs text-gray-500">
                  Visible pour tous après création
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newOfferTitle}
                  onChange={(e) => setNewOfferTitle(e.target.value)}
                  placeholder="Ex: Filtre à huile"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Slug / Product slug <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newOfferSlug}
                  onChange={(e) => {
                    setNewOfferSlugTouched(true);
                    setNewOfferSlug(e.target.value);
                  }}
                  placeholder="ex: filtre-a-huile"
                  className="h-9 text-sm"
                />
              </div>

              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Réf</label>
                  <Input
                    value={newOfferReference}
                    onChange={(e) => setNewOfferReference(e.target.value)}
                    placeholder="ex: 2566"
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Stock disponible</label>
                    <Input
                      type="number"
                      min={0}
                      value={newOfferStock}
                      onChange={(e) => setNewOfferStock(e.target.value)}
                      placeholder="ex: 10"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Seuil d&apos;alerte</label>
                    <Input
                      type="number"
                      min={0}
                      value={newOfferAlertThreshold}
                      onChange={(e) => setNewOfferAlertThreshold(e.target.value)}
                      placeholder="ex: 3"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Badge
                  </label>
                  <Input
                    value={newOfferBadge}
                    onChange={(e) => setNewOfferBadge(e.target.value)}
                    placeholder="ex: PROMO"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Expiration
                  </label>
                  <Input
                    type="date"
                    value={newOfferExpiresAt}
                    onChange={(e) => setNewOfferExpiresAt(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Image (optionnel)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => newOfferFileInputRef.current?.click()}
                    disabled={isUploadingNewOfferImage}
                    className="h-9 px-3 text-xs"
                  >
                    {isUploadingNewOfferImage ? "Upload..." : "Choisir"}
                  </Button>
                  <input
                    ref={newOfferFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNewOfferImageUpload}
                    disabled={isUploadingNewOfferImage}
                  />
                  <div className="flex-1 min-w-0 text-xs text-gray-600 truncate">
                    {newOfferImage ? "Image prête" : "Aucune image"}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 h-9 text-sm"
                disabled={createPromotionMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleCreateOffer}
                className="flex-1 h-9 text-sm bg-[#F97316] hover:bg-[#ea580c]"
                disabled={
                  createPromotionMutation.isPending ||
                  !newOfferTitle.trim() ||
                  !(newOfferSlug || slugify(newOfferTitle)).trim()
                }
              >
                {createPromotionMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && isDeleteModalOpen && deleteOfferId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmation suppression offre"
          onMouseDown={() => {
            if (deletePromotionMutation.isPending) return;
            setIsDeleteModalOpen(false);
            setDeleteOfferId(null);
            setTimeout(() => setIsPaused(false), 300);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                Supprimer l’offre
              </div>
              <button
                type="button"
                onClick={() => {
                  if (deletePromotionMutation.isPending) return;
                  setIsDeleteModalOpen(false);
                  setDeleteOfferId(null);
                  setTimeout(() => setIsPaused(false), 300);
                }}
                className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-800">
                Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.
              </p>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 text-sm"
                onClick={() => {
                  if (deletePromotionMutation.isPending) return;
                  setIsDeleteModalOpen(false);
                  setDeleteOfferId(null);
                  setTimeout(() => setIsPaused(false), 300);
                }}
                disabled={deletePromotionMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 text-sm bg-[#ef4444] hover:bg-[#dc2626]"
                onClick={confirmDeleteOffer}
                disabled={
                  deletePromotionMutation.isPending ||
                  isUploading ||
                  isUploadingNewOfferImage
                }
              >
                {deletePromotionMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PromotionsSection;