import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface FamilleCardProps {
  id?: string;
  title: string;
  image: string;
  subcategories?: string[];
  isExpanded?: boolean;
  editable?: boolean;
  onImageChange?: (id: string, file: File) => void;
}

const FamilleCard: React.FC<FamilleCardProps> = ({
  id,
  title,
  image,
  subcategories = [],
  isExpanded: isExpandedProp,
  editable = false,
  onImageChange,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use prop if provided, otherwise use internal state
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : internalExpanded;

  const handleImageClick = (e: React.MouseEvent) => {
    if (editable && onImageChange && id) {
      e.stopPropagation();
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange && id) {
      onImageChange(id, file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCardClick = () => {
    if (!editable && isExpandedProp === undefined) {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !editable) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="w-[180px] sm:w-[190px] bg-gray-200 rounded-2xl shadow-md overflow-hidden cursor-pointer outline-none focus:ring-2 focus:ring-orange-300 transition-transform hover:shadow-lg"
    >
      <div className="bg-white h-32 sm:h-40 flex items-center justify-center rounded-t-2xl relative" onClick={handleImageClick}>
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain p-3"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.placeholder-icon')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'placeholder-icon text-6xl text-gray-300';
                placeholder.innerHTML = '🔧';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <span className="text-xs text-gray-400">Aucune image</span>
        )}
        {editable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute top-2 right-2 bg-orange-500 text-white text-sm px-3 py-1 rounded-lg shadow"
          >
            Modifier
          </button>
        )}
        {editable && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>

      <div className="bg-orange-500 py-2 rounded-b-2xl flex justify-center items-center">
        <h3 className="text-gray-900 text-sm sm:text-base font-semibold text-center uppercase leading-tight">
          {title}
        </h3>
      </div>
      {!editable && (
        <div className="flex justify-center mt-1">
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default FamilleCard;
