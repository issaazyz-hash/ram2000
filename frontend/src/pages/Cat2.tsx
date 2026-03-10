import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/uploadService";
import {
  getSectionContent,
  getCat2Cards,
  createCat2Card,
  updateCat2Card,
  deleteCat2Card,
  type Cat2CardApi,
  type CreateCat2CardPayload,
} from "@/api/database";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { AddItemModal, type AddItemFormPayload } from "@/components/AddItemModal";
import { ArrowLeft, Camera, Edit2, Save, X, Plus, Trash2 } from "lucide-react";

interface HuileCard {
  id: number;
  title: string;
  image: string;
  imagePosX?: number; // 0 → 100 (%)
  imagePosY?: number; // 0 → 100 (%)
  // Keep backward compatibility if older records exist
  imagePosition?: string;
}

interface Cat2Card {
  id: number;
  title: string;
  reference?: string;
  image: string;
  acha2Slug?: string;
  stock?: number;
  alertThreshold?: number;
  rating?: number;
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
  prix_neveux?: number | null;
}

const HUILE_SECTION = "huile_cards";

const clampPercent = (v: any, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
};

const Cat2 = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { parentId } = useParams<{ parentId: string }>();

  const numericParentId = useMemo(() => {
    const n = Number(parentId);
    return Number.isFinite(n) ? n : NaN;
  }, [parentId]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = Boolean(user && (user.role === "admin" || user.isAdmin === true));

  // Parent card (optional breadcrumb/title)
  const [parentTitle, setParentTitle] = useState<string | null>(null);

  // Sub-cards for this Cat2 page (stored per parentId)
  const [cards, setCards] = useState<Cat2Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editReference, setEditReference] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const editingCard = useMemo(
    () => (editingCardId != null ? cards.find((c) => c.id === editingCardId) || null : null),
    [cards, editingCardId]
  );

  /** Map API row to Cat2Card for UI. */
  const apiToCard = (row: Cat2CardApi): Cat2Card => ({
    id: row.id,
    title: row.name,
    reference: row.reference ?? undefined,
    image: row.image ?? "/pp.jpg",
    acha2Slug: row.slug ?? undefined,
    stock: row.stockDisponible,
    alertThreshold: row.seuilAlerte,
    rating: row.rating ?? undefined,
    prix_achat_brut: row.prixAchatBrut ?? undefined,
    remise_achat_percent: row.remiseAchat ?? undefined,
    net_achat_htva: row.netAchatHTVA ?? undefined,
    tva_percent: row.tva ?? undefined,
    net_achat_ttc: row.netAchatTTC ?? undefined,
    marge_percent: row.marge ?? undefined,
    prix_neveux: row.prixNeveux ?? undefined,
  });

  const loadCards = async () => {
    if (!parentId || !Number.isFinite(numericParentId)) return;
    try {
      const list = await getCat2Cards(numericParentId);
      setCards(list.map(apiToCard));
    } catch (e) {
      console.error("Error loading Cat2 cards:", e);
      setCards([]);
    }
  };

  const getAdminHeaders = (): HeadersInit => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (user?.id != null) {
      headers["x-user"] = JSON.stringify({ id: user.id });
    }
    return headers;
  };

  const syncCategoryProductReference = async (slug: string, reference: string) => {
    if (!isAdmin) return;
    if (!user?.id) return;

    const s = (slug || "").trim();
    const r = (reference || "").trim();
    if (!s || !r) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(s)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const categoryProductId = Number(json?.data?.categoryProductId);
      if (!res.ok || !Number.isFinite(categoryProductId) || categoryProductId <= 0) {
        console.warn("[Cat2] Could not resolve categoryProductId for slug:", s, json);
        return;
      }

      const updateRes = await fetch(`${getApiBaseUrl()}/category-products/${categoryProductId}`, {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({ reference: r }),
      });
      const updateJson = await updateRes.json().catch(() => null);
      if (!updateRes.ok || !updateJson?.success) {
        console.warn("[Cat2] Failed to sync category_products.reference:", updateRes.status, updateJson);
      }
    } catch (e) {
      console.warn("[Cat2] Error syncing category_products.reference:", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!parentId || !Number.isFinite(numericParentId)) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [parentSection, cardList] = await Promise.all([
          getSectionContent(HUILE_SECTION),
          getCat2Cards(numericParentId),
        ]);
        const parentRaw = parentSection?.content;
        const parentParsed = typeof parentRaw === "string" ? JSON.parse(parentRaw) : parentRaw;
        const parentList: HuileCard[] = Array.isArray(parentParsed) ? parentParsed : [];
        const parentCard = parentList.find((c) => c.id === numericParentId);
        setParentTitle(parentCard?.title || null);
        setCards(cardList.map((row: Cat2CardApi) => apiToCard(row)));
      } catch (e) {
        console.error("Error loading Cat2:", e);
        setCards([]);
        setParentTitle(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [parentId, numericParentId]);

  const slugify = (value: string): string =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");

  const startEdit = (card: Cat2Card) => {
    setEditingCardId(card.id);
    setEditTitle(card.title);
    setEditReference(card.reference || "");
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setEditTitle("");
    setEditReference("");
  };

  const saveEdit = async () => {
    if (!editingCard) return;
    const next = editTitle.trim();
    const nextRef = editReference.trim();
    if (!next) {
      toast({ title: "Erreur", description: "Le titre est obligatoire", variant: "destructive" });
      return;
    }
    try {
      await updateCat2Card(editingCard.id, { name: next, reference: nextRef || null });
      toast({ title: "Succès", description: "Modifications enregistrées." });
      await loadCards();
      if (nextRef) await syncCategoryProductReference(slugify(next), nextRef);
      cancelEdit();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible d'enregistrer",
        variant: "destructive",
      });
    }
  };

  const triggerUpload = (id: number) => {
    fileInputRefs.current[id]?.click();
  };

  const uploadForCard = async (id: number, file: File) => {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadImage(file);
      await updateCat2Card(id, { image: uploadedUrl });
      await loadCards();
    } catch (e) {
      console.error("Error uploading Cat2 card image:", e);
      toast({ title: "Erreur", description: "Impossible de télécharger l'image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCard = async (id: number) => {
    const card = cards.find((c) => c.id === id);
    const ok = window.confirm(`Supprimer cette carte ?${card?.title ? `\n\n"${card.title}"` : ""}`);
    if (!ok) return;
    if (editingCardId === id) cancelEdit();
    try {
      await deleteCat2Card(id);
      toast({ title: "Succès", description: "Carte supprimée." });
      await loadCards();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible de supprimer",
        variant: "destructive",
      });
    }
  };

  const createCardFromPayload = async (payload: AddItemFormPayload) => {
    const title = payload.title.trim();
    if (!title) {
      toast({ title: "Erreur", description: "Le nom du produit est requis", variant: "destructive" });
      throw new Error("Le nom du produit est requis");
    }
    if (!Number.isFinite(numericParentId)) {
      toast({ title: "Erreur", description: "Parent invalide", variant: "destructive" });
      throw new Error("Parent invalide");
    }
    setIsCreating(true);
    try {
      const apiPayload: CreateCat2CardPayload = {
        parentId: numericParentId,
        name: title,
        reference: payload.reference?.trim() || null,
        rating: payload.rating != null ? Math.min(5, Math.max(0, Number(payload.rating))) : null,
        stockDisponible: Math.max(0, Math.floor(Number(payload.stock) || 0)),
        seuilAlerte: Math.max(0, Math.floor(Number(payload.alertThreshold) || 0)),
        image: payload.image?.trim() || null,
        prixAchatBrut: payload.prix_achat_brut != null ? Number(payload.prix_achat_brut) : null,
        remiseAchat: payload.remise_achat_percent != null ? Number(payload.remise_achat_percent) : null,
        netAchatHTVA: payload.net_achat_htva != null ? Number(payload.net_achat_htva) : null,
        tva: payload.tva_percent != null ? Number(payload.tva_percent) : 19,
        netAchatTTC: payload.net_achat_ttc != null ? Number(payload.net_achat_ttc) : null,
        marge: payload.marge_percent != null ? Number(payload.marge_percent) : null,
        prixNeveux: payload.prix_neveux != null ? Number(payload.prix_neveux) : null,
      };
      await createCat2Card(apiPayload);
      toast({ title: "Succès", description: "Carte ajoutée." });
      await loadCards();
      const referenceRaw = payload.reference?.trim() || "";
      if (referenceRaw) {
        const generatedSlug = slugify(title);
        await syncCategoryProductReference(generatedSlug, referenceRaw);
      }
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible d'ajouter la carte",
        variant: "destructive",
      });
      throw e;
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="h-5 w-5 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
            Chargement...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!parentId) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="mb-4">
            <Button variant="outline" onClick={() => navigate("/huile")} className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour à Huile
            </Button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Carte introuvable</h1>
            <p className="text-gray-600 text-sm">
              Identifiant parent manquant.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Button variant="outline" onClick={() => navigate("/huile")} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <p className="text-xs text-gray-500">
            Huile <span className="mx-1">→</span>{" "}
            <span className="text-gray-700 font-medium">{parentTitle || `Carte #${parentId}`}</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {parentTitle || `Cat2 #${parentId}`}
          </h1>
          {isAdmin && (
            <Button
              className="bg-[#111827] hover:bg-[#111827]/90 text-white rounded-full"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une carte
            </Button>
          )}
        </div>

        {!isAdmin && cards.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-600">Aucune carte disponible pour le moment.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card) => {
            const isEditing = editingCardId === card.id;
            return (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (editingCardId === card.id) return;
                  const slug = (card.acha2Slug || slugify(card.title)).trim();
                  if (!slug) {
                    toast({
                      title: "Erreur",
                      description: "Lien produit manquant. Contactez l’admin.",
                      variant: "destructive",
                    });
                    return;
                  }
                  const qs = new URLSearchParams({
                    cat2ParentId: String(parentId),
                    cat2CardId: String(card.id),
                  }).toString();
                  navigate(`/acha2/${encodeURIComponent(slug)}?${qs}`);
                }}
                onKeyDown={(e) => {
                  if (editingCardId === card.id) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const slug = (card.acha2Slug || slugify(card.title)).trim();
                    if (!slug) {
                      toast({
                        title: "Erreur",
                        description: "Lien produit manquant. Contactez l’admin.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const qs = new URLSearchParams({
                      cat2ParentId: String(parentId),
                      cat2CardId: String(card.id),
                    }).toString();
                    navigate(`/acha2/${encodeURIComponent(slug)}?${qs}`);
                  }
                }}
              >
                <div className="relative h-48 bg-white">
                  <img
                    src={card.image || "/pp.jpg"}
                    alt={card.title}
                    className="w-full h-full object-contain bg-white p-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/pp.jpg";
                    }}
                  />

                  {isUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="bg-white rounded-full p-4 shadow-lg border border-gray-200">
                        <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerUpload(card.id);
                          }}
                          className="bg-white rounded-full p-2 shadow-sm border border-[#f97316] hover:bg-neutral-50 transition-colors"
                          aria-label="Changer l'image"
                        >
                          <Camera className="w-4 h-4 text-[#f97316]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCard(card.id);
                          }}
                          className="bg-white rounded-full p-2 shadow-sm border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors"
                          aria-label="Supprimer la carte"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[card.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadForCard(card.id, file);
                          if (fileInputRefs.current[card.id]) fileInputRefs.current[card.id]!.value = "";
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="p-4">
                  {isAdmin && isEditing ? (
                    <div className="space-y-3">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <Input
                        value={editReference}
                        onChange={(e) => setEditReference(e.target.value)}
                        placeholder="Référence (ex: REF-TE-001)"
                      />
                      <div className="flex gap-2">
                        <Button
                          className="bg-[#111827] hover:bg-[#111827]/90 text-white"
                          disabled={!editTitle.trim() || !editReference.trim()}
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEdit();
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
                        {card.title}
                      </h2>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(card);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Modifier
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin: Add Sub-Card Modal (same form as Cat3) */}
        {isAdmin && (
          <AddItemModal
            open={showAddModal}
            onOpenChange={setShowAddModal}
            onSubmit={createCardFromPayload}
            isSubmitting={isCreating}
            title="Ajouter une carte"
            description="Renseignez les champs ci-dessous. Les calculs Tarif se mettent à jour automatiquement."
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cat2;
