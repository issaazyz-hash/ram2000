import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/uploadService";
import { getSectionContent, updateSectionContent } from "@/api/database";
import { Edit2, Save, X, Camera, Plus, Trash2 } from "lucide-react";

interface HuileCard {
  id: number;
  title: string;
  image: string;
  imagePosX?: number; // 0 → 100 (%)
  imagePosY?: number; // 0 → 100 (%)
}

const DEFAULT_CARDS: HuileCard[] = [
  {
    id: 1,
    title: "Huile Moteur Premium",
    image: "/pp.jpg"
  },
  {
    id: 2,
    title: "Additifs Performance",
    image: "/pp.jpg"
  },
  {
    id: 3,
    title: "Huile Transmission",
    image: "/pp.jpg"
  },
  {
    id: 4,
    title: "Liquide de Frein",
    image: "/pp.jpg"
  },
  {
    id: 5,
    title: "Huile Direction Assistée",
    image: "/pp.jpg"
  },
  {
    id: 6,
    title: "Huile Hydraulique",
    image: "/pp.jpg"
  }
];

const HuilePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cards, setCards] = useState<HuileCard[]>(DEFAULT_CARDS);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const pendingPositionSaveRef = useRef<HuileCard[] | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const isAdmin = user && (user.role === "admin" || user.isAdmin === true);

  const normalizeCards = (loadedCards: HuileCard[]): { cards: HuileCard[]; didChange: boolean } => {
    const unique: HuileCard[] = [];
    const seen = new Set<number>();
    let didChange = false;

    const normalizePercent = (v: any): number | undefined => {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(100, Math.max(0, n));
    };

    const parseLegacyImagePosition = (pos: string): { x?: number; y?: number } => {
      const p = (pos || "").trim().toLowerCase();
      if (!p) return {};

      // keyword mapping
      if (p === "center") return { x: 50, y: 50 };
      if (p === "top") return { x: 50, y: 0 };
      if (p === "bottom") return { x: 50, y: 100 };
      if (p === "left") return { x: 0, y: 50 };
      if (p === "right") return { x: 100, y: 50 };
      if (p === "center top") return { x: 50, y: 0 };
      if (p === "center bottom") return { x: 50, y: 100 };

      // percent format: "50% 30%"
      const match = p.match(/^\s*([0-9]{1,3})%\s+([0-9]{1,3})%\s*$/);
      if (match) {
        const x = normalizePercent(match[1]);
        const y = normalizePercent(match[2]);
        return { x, y };
      }

      return {};
    };

    for (const c of Array.isArray(loadedCards) ? loadedCards : []) {
      const id = typeof (c as any)?.id === "number" ? (c as any).id : Number((c as any)?.id);
      if (!Number.isFinite(id) || id <= 0) {
        didChange = true;
        continue;
      }
      if (seen.has(id)) {
        // Avoid duplicate React keys / ref collisions
        didChange = true;
        continue;
      }
      const title = typeof (c as any)?.title === "string" ? (c as any).title : "";
      const image = typeof (c as any)?.image === "string" ? (c as any).image : "/pp.jpg";

      let imagePosX = normalizePercent((c as any)?.imagePosX);
      let imagePosY = normalizePercent((c as any)?.imagePosY);

      // Backward compatibility: if legacy imagePosition exists, map to X/Y
      if ((imagePosX === undefined || imagePosY === undefined) && typeof (c as any)?.imagePosition === "string") {
        const legacy = parseLegacyImagePosition((c as any).imagePosition);
        if (imagePosX === undefined && legacy.x !== undefined) imagePosX = legacy.x;
        if (imagePosY === undefined && legacy.y !== undefined) imagePosY = legacy.y;
        didChange = true;
      }

      unique.push({
        id,
        title,
        image,
        ...(imagePosX !== undefined ? { imagePosX } : {}),
        ...(imagePosY !== undefined ? { imagePosY } : {}),
      });
      seen.add(id);
    }

    // Ensure default IDs 1..6 exist (without removing any extra/custom cards)
    for (const def of DEFAULT_CARDS) {
      if (!seen.has(def.id)) {
        unique.push(def);
        seen.add(def.id);
        didChange = true;
      }
    }

    return { cards: unique, didChange };
  };

  const updateCardImagePos = (cardId: number, patch: Partial<Pick<HuileCard, "imagePosX" | "imagePosY">>) => {
    const updatedCards = cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card));
    setCards(updatedCards);
    pendingPositionSaveRef.current = updatedCards;
  };

  const persistPendingImagePos = async () => {
    if (!pendingPositionSaveRef.current) return;
    const updatedCards = pendingPositionSaveRef.current;
    pendingPositionSaveRef.current = null;
    await saveCards(updatedCards);
  };

  // Load cards from database
  useEffect(() => {
    const loadCards = async () => {
      try {
        const section = await getSectionContent("huile_cards");
        const rawContent = section?.content;
        const parsed =
          typeof rawContent === "string"
            ? JSON.parse(rawContent)
            : rawContent;

        const loadedCards: HuileCard[] = Array.isArray(parsed) ? parsed : [];
        const { cards: normalized, didChange } = normalizeCards(loadedCards);

        if (normalized.length > 0) {
          setCards(normalized);
        } else {
          setCards(DEFAULT_CARDS);
        }

        // Auto-migrate DB from old/partial content (e.g., 3 cards) to the new 6-card defaults
        // Keep any existing/custom cards; only add missing default IDs 1..6.
        if (!section || didChange || loadedCards.length === 0) {
          await updateSectionContent("huile_cards", {
            sectionType: "huile_cards",
            title: "Huiles & Additifs Premium",
            content: normalized.length > 0 ? normalized : DEFAULT_CARDS,
          });
        }
      } catch (error) {
        console.error("Error loading huile cards:", error);
        // Fallback to defaults and (optionally) persist so admin sees the 6 cards permanently
        try {
          setCards(DEFAULT_CARDS);
          await updateSectionContent("huile_cards", {
            sectionType: "huile_cards",
            title: "Huiles & Additifs Premium",
            content: DEFAULT_CARDS,
          });
        } catch {
          // ignore
        }
      }
    };

    loadCards();
  }, []);

  // Check admin status
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  // Save cards to database
  const saveCards = async (updatedCards: HuileCard[]) => {
    try {
      await updateSectionContent("huile_cards", {
        sectionType: "huile_cards",
        title: "Huiles & Additifs Premium",
        content: updatedCards
      });
      setCards(updatedCards);
      toast({
        title: "Succès",
        description: "Modifications enregistrées avec succès",
      });
    } catch (error) {
      console.error("Error saving cards:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les modifications",
        variant: "destructive",
      });
    }
  };

  const handleCreateCard = async () => {
    const title = newCardTitle.trim();
    if (!title) {
      toast({
        title: "Erreur",
        description: "Le titre est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCard(true);
    try {
      const nextId = Math.max(0, ...cards.map((c) => Number(c.id) || 0)) + 1;
      const newCard: HuileCard = { id: nextId, title, image: "/pp.jpg" };
      await saveCards([...cards, newCard]);
      setShowAddCardModal(false);
      setNewCardTitle("");
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    const card = cards.find((c) => c.id === cardId);
    const ok = window.confirm(`Supprimer cette carte ?${card?.title ? `\n\n"${card.title}"` : ""}`);
    if (!ok) return;

    if (editingCardId === cardId) {
      setEditingCardId(null);
      setEditTitle("");
    }

    await saveCards(cards.filter((c) => c.id !== cardId));
  };

  // Enter edit mode
  const handleEdit = (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setEditingCardId(cardId);
      setEditTitle(card.title);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditTitle("");
  };

  // Save title
  const handleSaveTitle = async (cardId: number) => {
    if (!editTitle.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    const updatedCards = cards.map(card =>
      card.id === cardId ? { ...card, title: editTitle.trim() } : card
    );
    await saveCards(updatedCards);
    setEditingCardId(null);
    setEditTitle("");
  };

  // Handle image upload
  const handleImageUpload = async (cardId: number, file: File) => {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadImage(file);
      const updatedCards = cards.map(card =>
        card.id === cardId ? { ...card, image: uploadedUrl } : card
      );
      await saveCards(updatedCards);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l'image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input
  const triggerFileInput = (cardId: number) => {
    fileInputRefs.current[cardId]?.click();
  };

  // Handle file change
  const handleFileChange = (cardId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(cardId, file);
    }
    // Reset input
    if (fileInputRefs.current[cardId]) {
      fileInputRefs.current[cardId].value = "";
    }
  };

  return (
    <>
      <Header />
      
      {/* Main Content */}
      <div className="min-h-screen bg-white">
        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-12 sm:py-16 md:py-20 lg:py-24">
          
          {/* Page Header */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#111827] mb-4 sm:mb-5">
              Huiles & Additifs Premium
            </h1>
            {/* Small Orange Accent Line */}
            <div className="w-20 h-[2px] bg-[#f97316] mx-auto mb-5 sm:mb-6" />
            <p className="text-base sm:text-lg text-[#6b7280] max-w-2xl mx-auto leading-relaxed">
              Découvrez nos meilleures huiles et additifs pour votre véhicule
            </p>
          </div>

          {isAdmin && (
            <div className="mb-6 sm:mb-8 flex justify-end">
              <Button
                onClick={() => setShowAddCardModal(true)}
                className="bg-[#111827] hover:bg-[#111827]/90 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une carte
              </Button>
            </div>
          )}

          {/* Cards */}
          {/* Mobile (default): clean, light, minimal cards */}
          <div className="sm:hidden flex flex-col gap-4">
            {cards.map((card) => {
              const isEditing = editingCardId === card.id;

              return (
                <div
                  key={card.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm transition active:scale-[0.99]"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (editingCardId === card.id) return;
                    navigate(`/cat2/${card.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (editingCardId === card.id) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/cat2/${card.id}`);
                    }
                  }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-white rounded-t-xl">
                    <img
                      src={card.image || "/pp.jpg"}
                      alt={card.title}
                      style={{
                        objectPosition: `${card.imagePosX ?? 50}% ${card.imagePosY ?? 50}%`,
                      }}
                      className="w-full h-full object-contain bg-white p-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/pp.jpg";
                      }}
                    />

                    {/* Admin: change image (mobile always visible) */}
                    {isAdmin && !isEditing && (
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerFileInput(card.id);
                          }}
                          className="bg-white rounded-full p-2 shadow-sm border border-[#f97316] hover:bg-neutral-50 transition-colors duration-200"
                          aria-label="Changer l'image"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#f97316]" />
                        </button>
                      </div>
                    )}

                    {/* Admin: delete card */}
                    {isAdmin && (
                      <div className="absolute top-3 left-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          className="bg-white rounded-full p-2 shadow-sm border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors duration-200"
                          aria-label="Supprimer la carte"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    )}

                    {/* Upload Loading Overlay (light) */}
                    {isUploading && isEditing && editingCardId === card.id && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                        <div className="bg-white rounded-full p-4 shadow-lg border border-gray-200">
                          <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="px-4 py-4">
                    {isAdmin && (
                      <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[11px] font-medium text-gray-600 mb-2">
                          Position de l’image
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-500">Horizontal</label>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                {Math.round(card.imagePosX ?? 50)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={card.imagePosX ?? 50}
                              onChange={(e) => updateCardImagePos(card.id, { imagePosX: Number(e.target.value) })}
                              onMouseUp={persistPendingImagePos}
                              onTouchEnd={persistPendingImagePos}
                              className="w-full accent-[#f97316]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-500">Vertical</label>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                {Math.round(card.imagePosY ?? 50)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={card.imagePosY ?? 50}
                              onChange={(e) => updateCardImagePos(card.id, { imagePosY: Number(e.target.value) })}
                              onMouseUp={persistPendingImagePos}
                              onTouchEnd={persistPendingImagePos}
                              className="w-full accent-[#f97316]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {isEditing ? (
                      <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Titre de la carte"
                          className="text-base font-semibold border-2 border-[#f97316] focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTitle(card.id);
                            }}
                            disabled={isUploading || !editTitle.trim()}
                            className="flex-1 bg-[#111827] hover:bg-[#111827]/90 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            variant="outline"
                            disabled={isUploading}
                            className="flex-1 border-[#e5e7eb] text-[#6b7280] hover:bg-neutral-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Title under image */}
                        <h3 className="text-base font-semibold text-gray-900 text-center leading-snug line-clamp-2">
                          {card.title}
                        </h3>

                        {isAdmin && (
                          <div className="mt-3">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(card.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white text-xs py-1.5 h-auto font-medium transition-colors duration-200"
                            >
                              <Edit2 className="w-3 h-3 mr-1.5" />
                              Modifier
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/tablet: keep existing grid exactly as it is */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
            {cards.map((card, index) => {
              const isEditing = editingCardId === card.id;

              return (
                <div
                  key={card.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-[#e5e7eb]"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (editingCardId === card.id) return;
                    navigate(`/cat2/${card.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (editingCardId === card.id) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/cat2/${card.id}`);
                    }
                  }}
                >
                  {/* Image Container - Clean, No Overlays for Users */}
                  <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-neutral-50">
                    <img
                      src={card.image || "/pp.jpg"}
                      alt={card.title}
                      style={{
                        objectPosition: `${card.imagePosX ?? 50}% ${card.imagePosY ?? 50}%`,
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/pp.jpg";
                      }}
                    />
                    
                    {/* Orange Accent Line Below Image */}
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#f97316]" />
                    
                    {/* Admin Edit Icon - Small, Discreet, Only on Hover */}
                    {isAdmin && !isEditing && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerFileInput(card.id);
                          }}
                          className="bg-white/90 rounded-full p-2 shadow-sm border border-[#f97316] hover:bg-white transition-colors duration-200"
                          aria-label="Changer l'image"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#f97316]" />
                        </button>
                      </div>
                    )}

                    {/* Admin: delete card (desktop hover) */}
                    {isAdmin && (
                      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          className="bg-white/90 rounded-full p-2 shadow-sm border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors duration-200"
                          aria-label="Supprimer la carte"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    )}

                    {/* Upload Loading Overlay */}
                    {isUploading && isEditing && editingCardId === card.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div className="bg-white rounded-full p-4 shadow-lg">
                          <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 sm:p-7 md:p-8">
                    {isAdmin && (
                      <div
                        className="mb-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-[11px] font-medium text-gray-600 mb-2">
                          Position de l’image
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-500">Horizontal</label>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                {Math.round(card.imagePosX ?? 50)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={card.imagePosX ?? 50}
                              onChange={(e) => updateCardImagePos(card.id, { imagePosX: Number(e.target.value) })}
                              onMouseUp={persistPendingImagePos}
                              onTouchEnd={persistPendingImagePos}
                              className="w-full accent-[#f97316]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-500">Vertical</label>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                {Math.round(card.imagePosY ?? 50)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={card.imagePosY ?? 50}
                              onChange={(e) => updateCardImagePos(card.id, { imagePosY: Number(e.target.value) })}
                              onMouseUp={persistPendingImagePos}
                              onTouchEnd={persistPendingImagePos}
                              className="w-full accent-[#f97316]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Title Section */}
                    {isEditing ? (
                      <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Titre de la carte"
                          className="text-lg font-semibold border-2 border-[#f97316] focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTitle(card.id);
                            }}
                            disabled={isUploading || !editTitle.trim()}
                            className="flex-1 bg-[#111827] hover:bg-[#111827]/90 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            variant="outline"
                            disabled={isUploading}
                            className="flex-1 border-[#e5e7eb] text-[#6b7280] hover:bg-neutral-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Title - Clean Typography */}
                        <h3 className="text-xl sm:text-2xl font-semibold text-[#111827] mb-0 min-h-[3rem] leading-relaxed">
                          {card.title}
                        </h3>

                        {/* Admin Edit Button - Hidden by Default, Appears on Hover */}
                        {isAdmin && (
                          <div className="mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(card.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white text-xs py-1.5 h-auto font-medium transition-colors duration-200"
                            >
                              <Edit2 className="w-3 h-3 mr-1.5" />
                              Modifier
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shared hidden file inputs (single source of truth for fileInputRefs) */}
          {isAdmin &&
            cards.map((card) => (
              <input
                key={`file-${card.id}`}
                ref={(el) => {
                  fileInputRefs.current[card.id] = el;
                }}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(card.id, e)}
                className="hidden"
              />
            ))}
        </div>
      </div>

      {/* Admin: Add Card Modal */}
      {isAdmin && (
        <Dialog
          open={showAddCardModal}
          onOpenChange={(open) => {
            setShowAddCardModal(open);
            if (!open) setNewCardTitle("");
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter une carte</DialogTitle>
              <DialogDescription>
                Créez une nouvelle carte. Vous pourrez ensuite modifier l’image et la position.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <Input
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Titre de la carte"
                  disabled={isCreatingCard}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCard();
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Image par défaut: <span className="font-mono">/pp.jpg</span>
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowAddCardModal(false)}
                disabled={isCreatingCard}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateCard}
                disabled={isCreatingCard || !newCardTitle.trim()}
                className="bg-[#111827] hover:bg-[#111827]/90 text-white"
              >
                {isCreatingCard ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </>
  );
};

export default HuilePage;
