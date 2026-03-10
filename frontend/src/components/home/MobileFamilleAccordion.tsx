import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

type FamilleItem = {
  id: string;
  title: string;
  image: string;
  subcategories: string[];
};

interface MobileFamilleAccordionProps {
  familles: FamilleItem[];
  expandedIndex: number | null;
  onToggle: (index: number) => void;
  onLinkClick?: () => void;
}

const MobileFamilleAccordion: React.FC<MobileFamilleAccordionProps> = ({
  familles,
  expandedIndex,
  onToggle,
  onLinkClick,
}) => {
  return (
    <div className="space-y-2">
      {familles.map((famille, index) => {
        const isExpanded = expandedIndex === index;

        return (
          <div
            key={famille.id}
            className="bg-gray-900/50 rounded-md border border-gray-700/50 overflow-hidden transition-all duration-200 hover:bg-gray-800/50"
          >
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => onToggle(index)}
              className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-gray-800/30 transition-colors active:bg-gray-800/50"
            >
              {/* Small Image */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-700 flex items-center justify-center">
                <img
                  src={famille.image}
                  alt={famille.title}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.placeholder-icon')) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'placeholder-icon text-lg text-gray-400';
                      placeholder.innerHTML = '🔧';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              </div>

              {/* Title */}
              <span className="flex-1 text-sm sm:text-base font-medium text-white truncate">
                {famille.title}
              </span>

              {/* Chevron Icon */}
              <ChevronDown
                className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {/* Accordion Content - Subcategories */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 bg-gray-800/30">
                  {famille.subcategories.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">Aucune sous-catégorie pour le moment.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {famille.subcategories.map((sub, subIndex) => (
                        <li key={subIndex}>
                          <Link
                            to={`/acha2?name=${encodeURIComponent(sub)}`}
                            onClick={onLinkClick}
                            className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs sm:text-sm text-gray-300 hover:text-[#F97316] hover:bg-gray-700/50 transition-colors group"
                          >
                            <ChevronRight className="w-3 h-3 text-[#F97316] flex-shrink-0" />
                            <span className="flex-1">{sub}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MobileFamilleAccordion;

