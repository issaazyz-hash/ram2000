import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, Upload } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  getCat3Pages,
  getEauAdditifCards,
  ensureCat3PageForCard,
  addCat3Item,
  updateCat3Item,
  deleteCat3Item,
  getOrders,
  type Cat3Item,
  type Cat3PageData,
} from "@/api/database";
import { resolveImageUrl } from "@/utils/apiConfig";
import { uploadImage } from "@/services/uploadService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AddItemModal, type AddItemFormPayload } from "@/components/AddItemModal";

const slugify = (value: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

const Cat3Page = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    data: page,
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ["cat3_page", slug],
    queryFn: async () => {
      if (!slug) return null;
      const pages = await getCat3Pages();
      const slugStr = String(slug);
      const slugNum = Number(slug);
      // Prefer exact page.id match first (cat3PageId from new cards — unique, no mixing)
      let p =
        (Number.isFinite(slugNum) ? pages.find((x) => x.id === slugNum) : undefined) ??
        pages.find((x) => x.cardId === slugStr) ??
        pages.find((x) => x.slug === slugStr);
      if (!p && /^\d+$/.test(slugStr)) {
        const cards = await getEauAdditifCards();
        const card = cards.find(
          (c) => c.cat3PageId === slugNum || c.id === slugNum || String(c.id) === slugStr
        );
        const currentCardTitle = card?.title ?? "Sans titre";
        await ensureCat3PageForCard(slugStr, currentCardTitle);
        const updatedPages = await getCat3Pages();
        p =
          (Number.isFinite(slugNum) ? updatedPages.find((x) => x.id === slugNum) : undefined) ??
          updatedPages.find((x) => x.cardId === slugStr) ??
          updatedPages.find((x) => x.slug === slugStr) ??
          null;
      }
      if (import.meta.env.DEV && p) {
        const items = p?.items ?? [];
        console.log("[Cat3Page] fetch", {
          cat3Id: slug,
          pageId: p?.id,
          pageCardId: p?.cardId,
          itemsCount: items.length,
          firstItemId: items[0]?.id ?? null,
        });
      }
      return p ?? null;
    },
    enabled: !!slug,
    staleTime: 0,
  });

  // Only use page if it belongs to current slug (avoid showing another category's items)
  const slugStr = String(slug ?? "");
  const pageForThisSlug =
    page &&
    (page.cardId === slugStr ||
      page.id === Number(slugStr) ||
      page.slug === slugStr)
      ? page
      : null;

  const title =
    (pageForThisSlug?.title && String(pageForThisSlug.title).trim()) ??
    (slug ? decodeURIComponent(slug) : "Cat3");
  const safeItems = pageForThisSlug?.items ?? [];

  useEffect(() => {
    if (import.meta.env.DEV && slug && (isSuccess || page != null)) {
      console.log("[Cat3Page] cat3Id and items after filter", {
        cat3Id: slug,
        pageCardId: page?.cardId,
        pageId: page?.id,
        itemsCount: safeItems.length,
        pageMatchesSlug: !!pageForThisSlug,
      });
    }
  }, [slug, isSuccess, page, pageForThisSlug, safeItems.length]);

  // Pending orders for this Cat3 page (admin only) — used to highlight cards with pending orders
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "pending", slug],
    queryFn: () => getOrders({ status: "pending" }),
    enabled: isAdmin && !!slug,
    staleTime: 30 * 1000,
  });
  const pendingOrderItemIds = useMemo(() => {
    const set = new Set<number>();
    const slugStr = String(slug ?? "");
    for (const order of orders) {
      const snapshot = order.product_snapshot as { cat3Id?: number; itemId?: number } | undefined;
      if (order.status !== "pending" || !snapshot) continue;
      const orderCat3Id = snapshot.cat3Id != null ? String(snapshot.cat3Id) : "";
      if (orderCat3Id !== slugStr) continue;
      const itemId = snapshot.itemId != null && Number.isFinite(Number(snapshot.itemId)) ? Number(snapshot.itemId) : null;
      if (itemId != null) set.add(itemId);
    }
    return set;
  }, [orders, slug]);

  const addItemMutation = useMutation({
    mutationFn: async (payload: Omit<Cat3Item, "id">) => {
      if (!slug) throw new Error("Missing slug");
      return addCat3Item(slug, payload);
    },
    onSuccess: async (data) => {
      console.log("[Cat3Page] add success", data);
      if (!data || !data.updatedPage) {
        toast({
          title: "Erreur",
          description: "Réponse invalide du serveur. L'élément n'a peut-être pas été ajouté.",
          variant: "destructive",
        });
        return;
      }
      queryClient.setQueryData(["cat3_page", slug], data.updatedPage);
      await queryClient.invalidateQueries({ queryKey: ["cat3_page", slug] });
      await queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      toast({ title: "Succès", description: "Élément ajouté." });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ajouter l'élément",
        variant: "destructive",
      });
    },
  });

  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
  const imageInputByItemId = useRef<Record<number, HTMLInputElement | null>>({});

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!slug) throw new Error("Missing slug");
      await deleteCat3Item(slug, itemId);
    },
    onMutate: (itemId) => {
      setDeletingItemId(itemId);
    },
    onSuccess: () => {
      setDeletingItemId(null);
      queryClient.invalidateQueries({ queryKey: ["cat3_page", slug] });
      queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      toast({ title: "Succès", description: "Élément supprimé." });
    },
    onError: (err) => {
      setDeletingItemId(null);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de supprimer",
        variant: "destructive",
      });
    },
  });

  const handleDeleteItem = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingItemId !== null) return;
    if (!window.confirm("Supprimer cet élément ?")) return;
    deleteItemMutation.mutate(itemId);
  };

  const handleUpdateItemImage = async (e: React.ChangeEvent<HTMLInputElement>, itemId: number) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !slug) return;
    setUploadingItemId(itemId);
    try {
      const uploadedUrl = await uploadImage(file);
      await updateCat3Item(slug, itemId, { image: uploadedUrl });
      await queryClient.invalidateQueries({ queryKey: ["cat3_page", slug] });
      await queryClient.invalidateQueries({ queryKey: ["cat3_pages"] });
      toast({ title: "Succès", description: "Image mise à jour." });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de mettre à jour l'image",
        variant: "destructive",
      });
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleOpenItem = (item: Cat3Item) => {
    if (!slug) return;
    const base = item.title || `item-${item.id}`;
    const productSlug = slugify(base);
    const params = new URLSearchParams();
    params.set("source", "cat3");
    params.set("cat3Id", String(slug));
    params.set("itemId", String(item.id));
    navigate(`/acha2/${productSlug}?${params.toString()}`);
  };

  useEffect(() => {
    document.title = `${title} | RAM Auto Motors`;
  }, [title]);

  const formPayloadToCat3Item = (p: AddItemFormPayload): Omit<Cat3Item, "id"> => ({
    title: p.title,
    reference: p.reference ?? undefined,
    stock: p.stock,
    alertThreshold: p.alertThreshold,
    image: p.image,
    prix_achat_brut: p.prix_achat_brut ?? null,
    remise_achat_percent: p.remise_achat_percent ?? null,
    net_achat_htva: p.net_achat_htva ?? null,
    tva_percent: p.tva_percent ?? null,
    net_achat_ttc: p.net_achat_ttc ?? null,
    marge_percent: p.marge_percent ?? null,
    prix_neveux: p.prix_neveux ?? null,
  });

  const handleSubmitAddItem = async (payload: AddItemFormPayload) => {
    if (!slug) throw new Error("Missing slug");
    console.log("[Cat3Page] add item", { slug, pageId: page?.id, pageCardId: page?.cardId });
    await addItemMutation.mutateAsync(formPayloadToCat3Item(payload));
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cat3
          </h1>
          <p className="text-muted-foreground mt-1">Page non trouvée.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {safeItems.length === 0
            ? "Aucun élément pour le moment."
            : `${safeItems.length} élément${safeItems.length !== 1 ? "s" : ""}`}
        </p>

        {isSuccess && safeItems.length === 0 && (
          <div className="mt-8 rounded-lg border border-border bg-card p-8 sm:p-12 text-center text-muted-foreground">
            <p>Aucun élément pour le moment</p>
            {isAdmin && (
              <Button
                variant="outline"
                className="mt-4"
                type="button"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un élément
              </Button>
            )}
          </div>
        )}

        {isSuccess && safeItems.length > 0 && (
          <>
            {isAdmin && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un élément
                </Button>
              </div>
            )}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {safeItems.map((item) => {
                // Same condition as "Stock faible": stockDisponible <= seuilAlerte
                const stockDisponible = Number(item.stock ?? 0);
                const seuilAlerte = Number(item.alertThreshold ?? 0);
                const isCriticalStock = isAdmin && stockDisponible <= seuilAlerte;
                if (import.meta.env.DEV && isCriticalStock) {
                  console.log("[Cat3Page] critical stock", {
                    product: item.title,
                    stockDisponible,
                    seuilAlerte,
                    typeofStock: typeof item.stock,
                    typeofSeuil: typeof item.alertThreshold,
                  });
                }
                const hasPendingOrder = isAdmin && pendingOrderItemIds.has(item.id);
                return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`rounded-lg border overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow relative cursor-pointer ${
                    isCriticalStock
                      ? "bg-red-200 border border-red-500"
                      : hasPendingOrder
                        ? "bg-yellow-200 border-yellow-500"
                        : "border-border bg-card"
                  }`}
                  onClick={() => handleOpenItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenItem(item);
                    }
                  }}
                >
                  {isCriticalStock && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white shadow-sm">
                      Stock critique
                    </span>
                  )}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          imageInputByItemId.current[item.id]?.click();
                        }}
                        disabled={uploadingItemId === item.id}
                        className="p-2 rounded-lg bg-background/90 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                        aria-label="Modifier image"
                      >
                        {uploadingItemId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        disabled={deletingItemId !== null}
                        className="p-2 rounded-lg bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                        aria-label="Supprimer"
                      >
                        {deletingItemId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          imageInputByItemId.current[item.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpdateItemImage(e, item.id)}
                      />
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full bg-muted overflow-hidden">
                    <img
                      src={resolveImageUrl(item.image)}
                      alt={item.title ?? ""}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/pp.jpg";
                      }}
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="font-semibold text-foreground line-clamp-2">
                      {item.title ?? ""}
                    </h2>
                    {item.reference && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Réf. {item.reference}
                      </p>
                    )}
                  </div>
                </article>
              );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />

      <AddItemModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleSubmitAddItem}
        isSubmitting={addItemMutation.isPending}
        title="Ajouter un élément"
        description="Renseignez les champs ci-dessous. Les calculs Tarif se mettent à jour automatiquement."
      />
    </div>
  );
};

export default Cat3Page;
