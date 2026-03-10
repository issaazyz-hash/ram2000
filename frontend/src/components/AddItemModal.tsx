import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";

export interface AddItemFormPayload {
  title: string;
  reference?: string | null;
  stock?: number | null;
  alertThreshold?: number | null;
  image?: string | null;
  rating?: number | null;
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
  prix_neveux?: number | null;
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AddItemFormPayload) => Promise<void>;
  isSubmitting: boolean;
  title: string;
  description?: string;
}

const toNum = (v: string): number | null => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function AddItemModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  title: modalTitle,
  description,
}: AddItemModalProps) {
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [stock, setStock] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [rating, setRating] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [prixAchatBrut, setPrixAchatBrut] = useState("");
  const [remiseAchatPercent, setRemiseAchatPercent] = useState("");
  const [netAchatHtva, setNetAchatHtva] = useState("");
  const [tvaPercent, setTvaPercent] = useState("19");
  const [netAchatTtc, setNetAchatTtc] = useState("");
  const [margePercent, setMargePercent] = useState("");
  const [prixNeveux, setPrixNeveux] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setTitle("");
        setReference("");
        setStock("");
        setAlertThreshold("");
        setRating("");
        setImage("");
        setImagePreview("");
        setPrixAchatBrut("");
        setRemiseAchatPercent("");
        setNetAchatHtva("");
        setTvaPercent("19");
        setNetAchatTtc("");
        setMargePercent("");
        setPrixNeveux("");
        setError("");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const updateDerived = useCallback(() => {
    const brut = toNum(prixAchatBrut);
    const remise = toNum(remiseAchatPercent);
    const tva = toNum(tvaPercent) ?? 19;
    if (brut != null && remise != null && remise >= 0 && remise <= 100) {
      const netHtva = brut * (1 - remise / 100);
      setNetAchatHtva(netHtva.toFixed(3));
      const netTtc = netHtva * (1 + tva / 100);
      setNetAchatTtc(netTtc.toFixed(3));
      const marge = toNum(margePercent);
      if (marge != null && marge >= 0) {
        const pn = netTtc * (1 + marge / 100);
        setPrixNeveux(pn.toFixed(3));
      }
    }
  }, [prixAchatBrut, remiseAchatPercent, tvaPercent, margePercent]);

  useEffect(() => {
    if (open) updateDerived();
  }, [open, updateDerived]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const t = title.trim();
    if (!t) {
      setError("Le nom du produit est requis.");
      return;
    }
    const ratingNum = toNum(rating);
    if (ratingNum != null && (ratingNum < 0 || ratingNum > 5)) {
      setError("La note doit être entre 0 et 5.");
      return;
    }
    const payload: AddItemFormPayload = {
      title: t,
      reference: reference.trim() || null,
      stock: toNum(stock) ?? 0,
      alertThreshold: toNum(alertThreshold) ?? 0,
      image: image || null,
      rating: ratingNum,
      prix_achat_brut: toNum(prixAchatBrut),
      remise_achat_percent: toNum(remiseAchatPercent),
      net_achat_htva: toNum(netAchatHtva),
      tva_percent: toNum(tvaPercent) ?? 19,
      net_achat_ttc: toNum(netAchatTtc),
      marge_percent: toNum(margePercent),
      prix_neveux: toNum(prixNeveux),
    };
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-item-title">Nom du produit *</Label>
            <Input
              id="add-item-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Ex: Huile moteur 5W30"
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-item-ref">Référence</Label>
              <Input
                id="add-item-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: OEM 123"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-item-rating">Note (0-5)</Label>
              <Input
                id="add-item-rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="0-5"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-item-stock">Stock</Label>
              <Input
                id="add-item-stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-item-seuil">Seuil alerte</Label>
              <Input
                id="add-item-seuil"
                type="number"
                min={0}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="0"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="add-item-image"
              disabled={isSubmitting}
            />
            <label
              htmlFor="add-item-image"
              className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"} border-muted-foreground/25`}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-full w-full object-contain rounded p-1" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Cliquez pour télécharger</span>
                </>
              )}
            </label>
          </div>
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Tarif</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-item-brut">Prix achat brut</Label>
                <Input
                  id="add-item-brut"
                  type="number"
                  step="0.001"
                  min={0}
                  value={prixAchatBrut}
                  onChange={(e) => setPrixAchatBrut(e.target.value)}
                  onBlur={updateDerived}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-remise">Remise achat %</Label>
                <Input
                  id="add-item-remise"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={remiseAchatPercent}
                  onChange={(e) => setRemiseAchatPercent(e.target.value)}
                  onBlur={updateDerived}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-htva">Net achat HTVA</Label>
                <Input
                  id="add-item-htva"
                  type="number"
                  step="0.001"
                  min={0}
                  value={netAchatHtva}
                  onChange={(e) => setNetAchatHtva(e.target.value)}
                  onBlur={updateDerived}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-tva">TVA %</Label>
                <Input
                  id="add-item-tva"
                  type="number"
                  step="0.01"
                  min={0}
                  value={tvaPercent}
                  onChange={(e) => setTvaPercent(e.target.value)}
                  onBlur={updateDerived}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-ttc">Net achat TTC</Label>
                <Input
                  id="add-item-ttc"
                  type="number"
                  step="0.001"
                  min={0}
                  value={netAchatTtc}
                  onChange={(e) => setNetAchatTtc(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-marge">Marge %</Label>
                <Input
                  id="add-item-marge"
                  type="number"
                  step="0.01"
                  min={0}
                  value={margePercent}
                  onChange={(e) => setMargePercent(e.target.value)}
                  onBlur={updateDerived}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="add-item-neveux">Prix neveux</Label>
                <Input
                  id="add-item-neveux"
                  type="number"
                  step="0.001"
                  min={0}
                  value={prixNeveux}
                  onChange={(e) => setPrixNeveux(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
