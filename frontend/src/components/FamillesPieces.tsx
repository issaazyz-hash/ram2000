import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Package } from "lucide-react";
import { createSlug } from "@/utils/slugUtils";
import { resolveImageUrl } from "@/utils/apiConfig";

export type FamilleItem = {
  id: string;
  title: string;
  image?: string;
  image_url?: string;
  subcategories?: string[];
};

interface FamillesPiecesProps {
  familles: FamilleItem[];
  isAdmin?: boolean;
  onImageChange?: (familleId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  updatedImages?: Record<string, string>;
  variant?: "grid" | "list";
  onClose?: () => void;
}

const FamillesPieces: React.FC<FamillesPiecesProps> = ({
  familles,
  isAdmin = false,
  onImageChange,
  updatedImages = {},
  variant = "grid",
  onClose,
}) => {
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const getFullImageUrl = (image?: string | null) => {
    if (!image) return null;
    return resolveImageUrl(image);
  };

  const toggleExpand = (familleId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(familleId)) {
        next.delete(familleId);
      } else {
        next.add(familleId);
      }
      return next;
    });
  };

  const buildCatUrl = (subSlug: string) => {
    const currentParams = new URLSearchParams(location.search);
    const source = currentParams.get("source");
    const brand = currentParams.get("brand");
    const modelName = currentParams.get("modelName");

    const nextParams = new URLSearchParams();
    if (source === "cars" && brand && modelName) {
      nextParams.set("source", "cars");
      nextParams.set("brand", brand);
      nextParams.set("modelName", modelName);
    }

    const qs = nextParams.toString();
    return qs ? `/cat/${subSlug}?${qs}` : `/cat/${subSlug}`;
  };

  if (variant === "list") {
    return (
      <div className="px-4 py-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
          Familles des pièces
        </h3>

        {/* Accordion - mobile only (< 768px) */}
        <div className="md:hidden space-y-0">
          {familles.map((famille) => {
            const imageUrl = getFullImageUrl(famille.image || famille.image_url || null);
            const subcategories = Array.isArray(famille.subcategories)
              ? famille.subcategories
              : [];
            const hasSubs = subcategories.length > 0;
            const isExpanded = expandedIds.has(famille.id);

            return (
              <div
                key={famille.id}
                className="border-b border-white/10"
              >
                <button
                  type="button"
                  onClick={() => (hasSubs ? toggleExpand(famille.id) : undefined)}
                  disabled={!hasSubs}
                  className={`w-full flex items-center gap-3 py-2.5 text-left transition-colors ${
                    hasSubs
                      ? "hover:bg-white/5 cursor-pointer"
                      : "cursor-default opacity-75"
                  }`}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={famille.title}
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-white text-sm font-medium">
                    {famille.title}
                  </span>
                  {hasSubs && (
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Subcategories - animated expand */}
                {hasSubs && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-9 pr-4 pb-2 space-y-0.5">
                      {subcategories.map((sub, index) => {
                        const subSlug = createSlug(sub);
                        const url = buildCatUrl(subSlug);
                        return (
                          <Link
                            key={`${famille.id}-${subSlug}-${index}`}
                            to={url}
                            onClick={onClose}
                            className="block py-2 pl-3 text-xs text-gray-300 hover:text-orange-400 
                                       hover:bg-white/5 rounded-md transition-colors border-l-2 
                                       border-transparent hover:border-orange-500/50"
                          >
                            {sub}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Flat list - tablet only (>= 768px) when sidebar is still visible */}
        <div className="hidden md:block space-y-0">
          {familles.map((famille) => {
            const imageUrl = getFullImageUrl(famille.image || famille.image_url || null);

            return (
              <div
                key={famille.id}
                className="flex items-center gap-3 py-2 border-b border-white/10"
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={famille.title}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                )}
                <span className="text-white text-sm">{famille.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default FamillesPieces;
