import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryProductData } from "@/api/database";
import { getBackendBaseUrl } from "@/utils/apiConfig";
import { Upload, Trash2, Save, X, Package, Plus, Minus, Star } from "lucide-react";

const formatProductPrice = (rawPrice?: number | string): string => {
  if (rawPrice === undefined || rawPrice === null) return "";
  const num = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
  if (!Number.isFinite(num)) return String(rawPrice);
  if (Number.isInteger(num)) return num.toString();
  return num.toString().replace(/\.?0+$/, "");
};

const getImageUrl = (image?: string) => {
  if (!image) return "/ff.png";
  if (image.startsWith("http")) return image;
  return `${getBackendBaseUrl()}${image}`;
};

export interface CategoryProductCardProps {
  product: CategoryProductData;
  pendingCount?: number;
  onClick?: () => void;
  className?: string;
  showAdminControls?: boolean;
  /** Show warning colors/badges (yellow for pending/low stock, red for rupture). Admin only. */
  showStatusHighlights?: boolean;
  /** When true, card is inside a Link; keep cursor-pointer and allow clicks to bubble (e.g. for "Références équivalentes"). */
  linkWrapped?: boolean;
  onImageUpload?: (productId: number) => void;
  onDelete?: (productId: number) => void;
  onStockUpdate?: (productId: number, stockDisponible: number) => Promise<void>;
  editingProductId?: number | null;
  editName?: string;
  onEditNameChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onStartEdit?: () => void;
}

const CategoryProductCard: React.FC<CategoryProductCardProps> = ({
  product,
  pendingCount = 0,
  onClick,
  className = "",
  showAdminControls = false,
  showStatusHighlights = false,
  linkWrapped = false,
  onImageUpload,
  onDelete,
  onStockUpdate,
  editingProductId,
  editName,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
}) => {
  // Prefer prixNeveux; fallback to price; show 0 DT when null/missing
  const priceForDisplay = product.prixNeveux ?? product.price ?? 0;
  const formattedPrice = formatProductPrice(priceForDisplay) || (priceForDisplay === 0 ? "0" : "");

  // Business logic: out of stock vs low stock
  const stockDisponible = product.stockDisponible ?? product.stock ?? 0;
  const seuilAlerte = product.seuilAlerte ?? 0;
  const isOutOfStock = stockDisponible <= 0;
  const isLowStock = !isOutOfStock && stockDisponible <= seuilAlerte;

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [tempStock, setTempStock] = useState(stockDisponible);
  const [isSavingStock, setIsSavingStock] = useState(false);

  const openStockModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStock(Math.max(0, stockDisponible));
    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
  };

  const handleSaveStock = async () => {
    if (!onStockUpdate || !product.id) return;
    const value = Math.max(0, Math.floor(Number(tempStock) || 0));
    setIsSavingStock(true);
    try {
      await onStockUpdate(product.id, value);
      closeStockModal();
    } finally {
      setIsSavingStock(false);
    }
  };

  const adjustStock = (delta: number) => {
    setTempStock((prev) => Math.max(0, Math.floor(Number(prev) || 0) + delta));
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const hasPending = pendingCount > 0;
  const cardClass = showStatusHighlights
    ? hasPending
      ? "pending-card cursor-pointer"
      : isOutOfStock
        ? linkWrapped
          ? "bg-gray-100 border-gray-300 opacity-75 cursor-pointer"
          : "bg-gray-100 border-gray-300 cursor-not-allowed opacity-75"
        : isLowStock
          ? "bg-amber-50 border-amber-300 cursor-pointer"
          : "bg-white border-gray-200 cursor-pointer"
    : isOutOfStock
      ? linkWrapped
        ? "bg-white border-gray-200 cursor-pointer opacity-80"
        : "bg-white border-gray-200 cursor-not-allowed opacity-80"
      : "bg-white border-gray-200 cursor-pointer";

  return (
    <div
      className={`rounded-2xl shadow-sm border p-3 sm:p-4 flex flex-col ${className} ${cardClass}`}
      style={linkWrapped ? { pointerEvents: "auto" } : undefined}
      onClick={linkWrapped ? undefined : (isOutOfStock ? undefined : handleCardClick)}
    >
      {/* main row */}
      <div className="flex gap-3">
        {/* image */}
        <div className="relative w-28 h-24 flex items-center justify-center bg-white p-1 flex-shrink-0">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/ff.png";
            }}
          />

          {showAdminControls && onImageUpload && onDelete && (
            <div className="absolute -top-2 -right-2 flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageUpload(product.id!);
                }}
                className="bg-white p-1.5 rounded-full border shadow"
              >
                <Upload className="w-3.5 h-3.5 text-gray-700" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product.id!);
                }}
                className="bg-red-500 p-1.5 rounded-full border border-red-600"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* text + price */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start w-full gap-2">
            <div className="flex-1 min-w-0">
              {showStatusHighlights && hasPending && (
                <span className="pending-badge inline-block mb-1">
                  Commande en attente ({pendingCount})
                </span>
              )}
              {editingProductId === product.id ? (
                <div
                  className="space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editName || ""}
                    onChange={(e) => onEditNameChange?.(e.target.value)}
                    className="text-xs sm:text-sm h-8 sm:h-9 w-full px-2 border rounded"
                    placeholder="Nom du produit"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveEdit?.();
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-7 sm:h-8"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelEdit?.();
                      }}
                      className="flex-1 text-xs h-7 sm:h-8"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                    {product.name}
                  </h3>

                  {product.reference && (
                    <p className="text-[11px] text-gray-600">
                      Réf : {product.reference}
                    </p>
                  )}

                  {linkWrapped ? (
                    (product.rating != null && product.rating !== undefined) || (product.reviewsCount != null && product.reviewsCount !== undefined && Number(product.reviewsCount) > 0) ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= Math.round(Number(product.rating) || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">
                          {product.rating != null && product.rating !== undefined
                            ? Number(product.rating).toFixed(1)
                            : "0.0"}
                          {(product.reviewsCount != null && product.reviewsCount !== undefined && Number(product.reviewsCount) > 0)
                            ? ` (${Number(product.reviewsCount)} ${Number(product.reviewsCount) === 1 ? "avis" : "avis"})`
                            : ""}
                        </span>
                      </div>
                    ) : null
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < (product.rating ?? 0)
                              ? "text-yellow-400 text-xs"
                              : "text-gray-300 text-xs"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}

                  {!linkWrapped && showStatusHighlights && isLowStock && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-amber-200 text-amber-900 rounded">
                      Stock faible
                    </span>
                  )}
                  {!linkWrapped && showStatusHighlights && isOutOfStock && (
                    <span className="inline-block mt-1 text-[11px] text-red-600 font-medium">
                      Rupture de stock
                    </span>
                  )}
                  {showAdminControls && onStockUpdate && (
                    <button
                      onClick={openStockModal}
                      className="mt-1.5 flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-700"
                    >
                      <Package className="w-3.5 h-3.5" />
                      Modifier stock
                    </button>
                  )}
                  {showAdminControls && onStartEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit();
                      }}
                      className="mt-1.5 text-[11px] text-orange-600"
                    >
                      Modifier
                    </button>
                  )}
                </>
              )}
            </div>

            {/* price right - Prix neveux or fallback; 0 DT when null */}
            <span className="text-sm sm:text-base font-semibold text-[#F97316] pr-1">
              {formattedPrice || "0"} DT
            </span>
          </div>

          {/* small button bottom right - hidden for equivalent cards (linkWrapped) */}
          {editingProductId !== product.id && !linkWrapped && (
            <div className="flex justify-end mt-2 pr-1">
              {isOutOfStock ? (
                <span className="text-[10px] text-gray-500 italic">Indisponible</span>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                  className="bg-[#FF6A00] hover:bg-[#e85f00] text-white text-[10px] px-3 py-1 rounded-full shadow-sm"
                >
                  Ajouter
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modifier stock modal */}
      <Dialog open={stockModalOpen} onOpenChange={setStockModalOpen}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Modifier le stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Stock disponible
              </label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => adjustStock(-10)}
                  >
                    -10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => adjustStock(-1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={tempStock}
                  onChange={(e) => setTempStock(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 text-center h-9 font-semibold"
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => adjustStock(1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => adjustStock(10)}
                  >
                    +10
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeStockModal} disabled={isSavingStock}>
              Annuler
            </Button>
            <Button onClick={handleSaveStock} disabled={isSavingStock}>
              {isSavingStock ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryProductCard;

