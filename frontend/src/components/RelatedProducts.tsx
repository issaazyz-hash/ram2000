import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, type ProductData } from "@/api/database";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RelatedProductsProps {
  currentProductId?: string;
  currentProductCategory?: string;
  currentProductName?: string;
  limit?: number;
}

// Product Card Component
const ProductCard = ({
  product,
  onProductClick,
}: {
  product: ProductData;
  onProductClick?: (productId: string) => void;
}) => {
  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return "0.00";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "0.00";
    return numPrice.toFixed(2);
  };

  const renderStars = (rating: number = 5) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              star <= rating ? "text-[#FACC15]" : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden flex-shrink-0 w-[280px] sm:w-full">
      {/* Image */}
      <div className="aspect-square bg-gray-100 overflow-hidden">
        <img
          src={product.image || "/ff.png"}
          alt={product.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/ff.png";
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Reference */}
        {product.sku && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            Réf : {product.sku}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          {renderStars(5)}
          <span className="text-xs text-gray-600">5 Avis</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-xl sm:text-2xl font-bold text-[#F97316]">
            {formatPrice(product.price)} DT
          </p>
          <p className="text-xs text-gray-600">TTC</p>
        </div>

        {/* Button */}
        <Button
          onClick={() => product.id && onProductClick?.(product.id)}
          className="w-full bg-gradient-to-r from-[#F97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#F97316] text-white font-semibold rounded-lg py-2 text-sm transition-all duration-300 hover:scale-105"
        >
          Voir le produit
        </Button>
      </div>
    </div>
  );
};

// Skeleton Loading Component
const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex-shrink-0 w-[280px] sm:w-full animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded mb-2" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
};

const RelatedProducts = ({
  currentProductId,
  currentProductCategory,
  currentProductName,
  limit = 4,
}: RelatedProductsProps) => {
  const navigate = useNavigate();

  // Fetch all products
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter related products
  const relatedProducts = React.useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];

    let filtered = allProducts.filter((product) => {
      // Exclude current product by ID
      if (currentProductId && product.id?.toString() === currentProductId.toString()) {
        return false;
      }

      // Exclude current product by name (if IDs don't match)
      if (currentProductName && product.name && 
          product.name.toLowerCase().trim() === currentProductName.toLowerCase().trim()) {
        return false;
      }

      // Priority 1: Filter by category if available
      if (currentProductCategory && product.category) {
        const categoryMatch = product.category.toLowerCase().trim() === currentProductCategory.toLowerCase().trim();
        if (categoryMatch) return true;
      }

      // Priority 2: Filter by product name keywords (extract type from name)
      if (currentProductName && product.name) {
        const currentWords = currentProductName
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const productWords = product.name.toLowerCase().split(/\s+/);

        // Check if they share significant words (like "filtre", "huile", etc.)
        const hasCommonWord = currentWords.some((word) =>
          productWords.some((pw) => pw.includes(word) || word.includes(pw))
        );

        if (hasCommonWord) return true;
      }

      return false;
    });

    // Shuffle and limit results for variety
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }, [allProducts, currentProductId, currentProductCategory, currentProductName, limit]);

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  // Don't render if no products
  if (!isLoading && relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 uppercase mb-4 sm:mb-6">
        RÉFÉRENCES ÉQUIVALENTES
      </h2>

      {/* Products Grid - Horizontal scroll on mobile, grid on desktop */}
      {isLoading ? (
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 scrollbar-hide">
          {[...Array(limit)].map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 scrollbar-hide">
          {relatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onProductClick={handleProductClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RelatedProducts;

