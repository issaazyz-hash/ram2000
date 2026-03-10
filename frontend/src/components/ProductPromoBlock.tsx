import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/services/uploadService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Upload, Trash2, Phone, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductPromoBlockProps {
  productName?: string;
  reference?: string;
  price?: string;
  images?: string[];
  onUpdate?: (data: { name: string; reference: string; price: string; images: string[] }) => void;
}

const ProductPromoBlock = ({
  productName = "Produit promotionnel",
  reference = "REF-001",
  price = "0.00",
  images = [],
  onUpdate,
}: ProductPromoBlockProps) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(productName);
  const [ref, setRef] = useState(reference);
  const [priceValue, setPriceValue] = useState(price);
  const [productImages, setProductImages] = useState<string[]>(images);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Sync with props changes
  useEffect(() => {
    setName(productName);
    setRef(reference);
    setPriceValue(price);
    setProductImages(images);
  }, [productName, reference, price, images]);

  // Notify parent of changes
  useEffect(() => {
    if (onUpdate) {
      onUpdate({
        name,
        reference: ref,
        price: priceValue,
        images: productImages,
      });
    }
  }, [name, ref, priceValue, productImages, onUpdate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image valide",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setProductImages([...productImages, imageUrl]);
      toast({
        title: "Succès",
        description: "Image uploadée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
    if (currentImageIndex >= newImages.length && newImages.length > 0) {
      setCurrentImageIndex(newImages.length - 1);
    } else if (newImages.length === 0) {
      setCurrentImageIndex(0);
    }
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header: Nom produit + Référence */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        {isAdmin ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du produit
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                placeholder="Nom du produit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence
              </label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-full"
                placeholder="Référence"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{name}</h2>
            <p className="text-sm sm:text-base text-gray-600">Réf: {ref}</p>
          </div>
        )}
      </div>

      {/* Image Gallery */}
      <div className="p-4 sm:p-6">
        {/* Main Image */}
        <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden mb-4">
          {/* Rating Overlay */}
          <div
            className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 shadow-md flex items-center gap-1.5 sm:gap-2 pointer-events-none"
            aria-label="Note du produit : 4 sur 5"
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm sm:text-base ${
                    star <= 4 ? "text-[#FACC15]" : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-700 ml-1">
              4 Avis
            </span>
          </div>
          {productImages.length > 0 ? (
            <>
              <img
                src={productImages[currentImageIndex]}
                alt={`${name} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/ff.png";
                }}
              />
              {productImages.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      aria-label="Image précédente"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                  )}
                  {currentImageIndex < productImages.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      aria-label="Image suivante"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleRemoveImage(currentImageIndex)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Supprimer l'image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune image</p>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {productImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {productImages.map((img, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                  currentImageIndex === index
                    ? "border-[#F97316]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <img
                  src={img}
                  alt={`Miniature ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Admin: Upload Image */}
        {isAdmin && (
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Upload en cours..." : "Ajouter une image"}
            </Button>
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
        {isAdmin ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix (DT)
            </label>
            <Input
              type="number"
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              className="w-full"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-sm text-gray-600 mb-1">Prix</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#F97316]">
                {parseFloat(priceValue).toFixed(2)} DT
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-[#F97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#F97316] text-white font-semibold rounded-lg px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-100 flex-shrink-0"
            >
              Acheter
            </Button>
          </div>
        )}
      </div>

      {/* Customer Support Block */}
      {!isAdmin && (
        <div className="p-4 sm:p-5 bg-[#F5F6F7] rounded-xl mx-4 sm:mx-6 mb-4 sm:mb-6">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#F97316]" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">
                Un doute sur une pièce ?
              </h3>
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                N'hésitez pas à joindre l'un de nos conseillers qui vous accompagnera dans votre recherche.
              </p>

              {/* Phone Number */}
              <div className="mb-2 sm:mb-3">
                <a
                  href="tel:0484314441"
                  className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-[#F97316] hover:text-[#ea580c] transition-colors"
                  aria-label="Contacter le support client par téléphone"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>04 84 31 44 41</span>
                </a>
              </div>

              {/* Secondary Text */}
              <p className="text-xs sm:text-sm text-gray-600">
                Prix d'un appel local du lundi au samedi de 9h à 19h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPromoBlock;

