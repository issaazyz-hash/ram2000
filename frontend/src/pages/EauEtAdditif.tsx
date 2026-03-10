import { useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Loader2, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getEauAdditifCards,
  saveEauAdditifCards,
  updateEauAdditifCard,
  createNewCat3PageForCard,
  deleteEauAdditifCard,
  deleteCat3PageByCardId,
  getCat3Pages,
  getOrders,
  type EauAdditifCard,
} from "@/api/database";
import { resolveImageUrl } from "@/utils/apiConfig";
import { uploadImage } from "@/services/uploadService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const EauEtAdditif = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingExistingCardId, setUploadingExistingCardId] = useState<number | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
  const addCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const existingCardFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    document.title = "EAU ET ADDITIF | RAM Auto Motors";
  }, []);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["eau_additif"],
    queryFn: getEauAdditifCards,
  });

  const { data: cat3Pages = [] } = useQuery({
    queryKey: ["cat3_pages"],
    queryFn: getCat3Pages,
    staleTime: 30 * 1000,
  });
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => getOrders({ status: "pending" }),
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  /** Per-category status: RED (critical stock) and YELLOW (pending order, admin-only). RED takes priority. */
  const categoryStatus = useMemo(() => {
    const map = new Map<
      string,
      { hasCriticalStock: boolean; hasPendingOrder: boolean }
    >();
    for (const page of cat3Pages) {
      const catId = String(page.cardId ?? page.id ?? "");
      if (!catId) continue;
      const hasCriticalStock = isAdmin && (page.items ?? []).some(
        (item) =>
          Number(item.stock ?? 0) <= Number(item.alertThreshold ?? 0)
      );
      const hasPendingOrder =
        isAdmin &&
        pendingOrders.some((o) => {
          const snap = o.product_snapshot as {
            cat3Id?: number;
            itemId?: number;
          } | undefined;
          return (
            o.status === "pending" &&
            snap &&
            (String(snap.cat3Id) === catId ||
              (page.id != null && Number(snap.cat3Id) === Number(page.id)))
          );
        });
      map.set(catId, { hasCriticalStock, hasPendingOrder });
      if (page.id != null) map.set(String(page.id), { hasCriticalStock, hasPendingOrder });
    }
    return map;
  }, [cat3Pages, pendingOrders, isAdmin]);

  const getCardStatus = (card: EauAdditifCard) =>
    categoryStatus.get(String(card.id)) ??
    (card.cat3PageId != null
      ? categoryStatus.get(String(card.cat3PageId))
      : null) ?? { hasCriticalStock: false, hasPendingOrder: false };

  const createCardMutation = useMutation({
    mutationFn: async (payload: { name: string; imageUrl: string }) => {
      const currentCards = await getEauAdditifCards();
      const maxId =
        currentCards.length > 0
          ? Math.max(...currentCards.map((c) => c.id), 0)
          : 0;
      const newId = maxId + 1;
      const nameTrimmed = payload.name.trim();
      // Create a NEW empty Cat3 page first so this card has its own dedicated page
      const cat3PageId = await createNewCat3PageForCard(newId, nameTrimmed);
      const createdAt = new Date().toISOString();
      const newCard: EauAdditifCard = {
        id: newId,
        title: nameTrimmed,
        description: "",
        slug: `card-${newId}`,
        image: payload.imageUrl,
        createdAt,
        cat3Id: String(newId),
        cat3PageId,
      };
      const updatedCards = [...currentCards, newCard];
      await saveEauAdditifCards(updatedCards);
      if (import.meta.env.DEV) {
        console.log("[EauEtAdditif] create card", { newCardId: newId, cat3PageId });
      }
      return updatedCards;
    },
    onSuccess: (updatedCards) => {
      setIsAddModalOpen(false);
      setNewName("");
      setNewImageUrl(undefined);
      queryClient.invalidateQueries({ queryKey: ["eau_additif"] });
      queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      const newCard = updatedCards?.length ? updatedCards[updatedCards.length - 1] : null;
      if (newCard?.cat3PageId != null) {
        queryClient.invalidateQueries({ queryKey: ["cat3_page", String(newCard.cat3PageId)] });
      }
      if (newCard?.id != null) {
        queryClient.invalidateQueries({ queryKey: ["cat3_page", String(newCard.id)] });
      }
      toast({
        title: "Succès",
        description: "La carte a été ajoutée.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ajouter la carte",
        variant: "destructive",
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (card: EauAdditifCard) => {
      await deleteEauAdditifCard(card.id);
      await deleteCat3PageByCardId(card.id, card.cat3PageId);
    },
    onSuccess: () => {
      setDeletingCardId(null);
      queryClient.invalidateQueries({ queryKey: ["eau_additif"] });
      queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      queryClient.invalidateQueries({ queryKey: ["cat3_page"] });
      toast({ title: "Succès", description: "La carte a été supprimée." });
    },
    onError: (err) => {
      setDeletingCardId(null);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de supprimer la carte",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCard = (e: React.MouseEvent, card: EauAdditifCard) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingCardId !== null) return;
    if (!window.confirm(`Supprimer la carte « ${card.title} » ?`)) return;
    setDeletingCardId(card.id);
    deleteCardMutation.mutate(card);
  };

  const handleAddCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImage(file);
      setNewImageUrl(url);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec de l'upload de l'image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleExistingCardImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    card: EauAdditifCard
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingExistingCardId(card.id);
    try {
      const uploadedUrl = await uploadImage(file);
      await updateEauAdditifCard(card.id, { image: uploadedUrl });
      await queryClient.invalidateQueries({ queryKey: ["eau_additif"] });
      await queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      if (card.cat3PageId != null) {
        await queryClient.invalidateQueries({ queryKey: ["cat3_page", String(card.cat3PageId)] });
      }
      toast({ title: "Succès", description: "Image mise à jour." });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de mettre à jour l'image",
        variant: "destructive",
      });
    } finally {
      setUploadingExistingCardId(null);
    }
  };

  const handleSubmitAddCard = () => {
    const nameTrimmed = newName.trim();
    if (!nameTrimmed) {
      toast({
        title: "Champ requis",
        description: "Veuillez saisir le nom de la société.",
        variant: "destructive",
      });
      return;
    }
    if (!newImageUrl) {
      toast({
        title: "Image requise",
        description: "Veuillez sélectionner et uploader une image.",
        variant: "destructive",
      });
      return;
    }
    createCardMutation.mutate({ name: nameTrimmed, imageUrl: newImageUrl });
  };

  const openAddModal = () => {
    setNewName("");
    setNewImageUrl(undefined);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              EAU ET ADDITIF
            </h1>
            <p className="text-muted-foreground mt-1">
              Découvrez notre gamme d&apos;eau et additifs pour améliorer les
              performances et protéger votre moteur.
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={openAddModal}
              className="shrink-0"
              aria-label="Ajouter une carte"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une carte
            </Button>
          )}
        </div>

        {/* Single content block: loading, empty state, or cards grid. Do not render cards.length or "Aucun élément" here. */}
        <div className="contents">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 sm:p-12 text-center text-muted-foreground">
              <p>Aucune carte pour le moment.</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={openAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une carte
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {cards.map((card) => (
                <article
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const cat3PageId = card.cat3PageId ?? card.id;
                  const url = `/cat3/${cat3PageId}`;
                  if (import.meta.env.DEV) console.log("[EauEtAdditif] card click", { cardId: card.id, cat3PageId, url });
                  navigate(url);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const cat3PageId = card.cat3PageId ?? card.id;
                    const url = `/cat3/${cat3PageId}`;
                    if (import.meta.env.DEV) console.log("[EauEtAdditif] card key nav", { cardId: card.id, cat3PageId, url });
                    navigate(url);
                  }
                }}
                  className={`rounded-lg border overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
                    (() => {
                      const { hasCriticalStock, hasPendingOrder } = getCardStatus(card);
                      if (isAdmin && hasCriticalStock) return "status-red bg-red-200 border border-red-500";
                      if (isAdmin && hasPendingOrder) return "status-yellow bg-yellow-200 border-yellow-500";
                      return "border-border bg-card";
                    })()
                  }`}
                >
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          existingCardFileInputRefs.current[card.id]?.click();
                        }}
                        disabled={uploadingExistingCardId === card.id}
                        className="p-2 rounded-lg bg-background/90 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Modifier l'image"
                      >
                        {uploadingExistingCardId === card.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCard(e, card)}
                        disabled={deletingCardId !== null}
                        className="p-2 rounded-lg bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Supprimer la carte"
                      >
                        {deletingCardId === card.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          existingCardFileInputRefs.current[card.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleExistingCardImageChange(e, card)}
                      />
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full bg-muted overflow-hidden">
                    <img
                      src={resolveImageUrl(card.image)}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/pp.jpg";
                      }}
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="font-semibold text-foreground line-clamp-2">
                      {card.title}
                    </h2>
                    <div className="mt-auto pt-3">
                      <span className="text-sm text-primary hover:underline">
                        Voir
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une carte</DialogTitle>
            <DialogDescription>
              Renseignez le nom de la société et une image. Les deux champs sont
              obligatoires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label
                htmlFor="eau-additif-card-name"
                className="text-sm font-medium text-foreground"
              >
                Nom de la société <span className="text-destructive">*</span>
              </label>
              <Input
                id="eau-additif-card-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex. Société XYZ"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">
                Image <span className="text-destructive">*</span>
              </label>
              <input
                ref={addCardFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddCardFileChange}
              />
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCardFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {newImageUrl ? "Changer l'image" : "Choisir une image"}
                </Button>
                {newImageUrl && (
                  <div className="rounded border overflow-hidden w-20 h-20 shrink-0">
                    <img
                      src={resolveImageUrl(newImageUrl)}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitAddCard}
              disabled={
                !newName.trim() ||
                !newImageUrl ||
                createCardMutation.isPending
              }
            >
              {createCardMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EauEtAdditif;
