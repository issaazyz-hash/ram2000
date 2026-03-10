import { 
  Cog, 
  Car, 
  Wrench, 
  Gauge, 
  Battery, 
  Fuel,
  Thermometer,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const ProductCategoriesSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  const categories = [
    { 
      name: "Embrayage", 
      icon: Cog, 
      description: "Disques et mécanismes",
      links: [
        "Disque d'embrayage",
        "Kit d'embrayage",
        "Mécanisme d'embrayage",
        "Ressort d'embrayage",
        "Cable d'embrayage"
      ]
    },
    { 
      name: "Direction et Suspension", 
      icon: Car, 
      description: "Amortisseurs et rotules",
      links: [
        "Amortisseur avant",
        "Amortisseur arrière",
        "Rotule de direction",
        "Bras de suspension",
        "Ressort de suspension",
        "Biellette de direction"
      ]
    },
    { 
      name: "Filtration", 
      icon: Gauge, 
      description: "Filtres air, huile, carburant",
      links: [
        "Filtre à air",
        "Filtre à huile",
        "Filtre à carburant",
        "Filtre à pollen",
        "Filtre habitacle"
      ]
    },
    { 
      name: "Freinage", 
      icon: Wrench, 
      description: "Plaquettes et disques",
      links: [
        "Plaquettes de frein avant",
        "Plaquettes de frein arrière",
        "Disque de frein avant",
        "Disque de frein arrière",
        "Étrier de frein",
        "Liquide de frein"
      ]
    },
    { 
      name: "Pièces Moteur", 
      icon: Battery, 
      description: "Système de transmission",
      links: [
        "KIT DE DISTRIBUTION",
        "BOUGIE D'ALLUMAGE",
        "POMPE À EAU",
        "JOINT DE CULASSE",
        "SUPPORT MOTEUR",
        "COURROIE TRAPÉZOÏDALE À NERVURES"
      ]
    },
    { 
      name: "Pièces et Crémailleurs", 
      icon: Fuel, 
      description: "Direction assistée",
      links: [
        "Crémaillère de direction",
        "Biellette de direction",
        "Rotule de direction",
        "Pompe de direction assistée"
      ]
    },
    { 
      name: "Échappement et Charge", 
      icon: Thermometer, 
      description: "Système d'échappement",
      links: [
        "Pot d'échappement",
        "Catalyseur",
        "Silencieux",
        "Collecteur d'échappement"
      ]
    },
    { 
      name: "Carrosserie", 
      icon: Zap, 
      description: "Éléments de carrosserie",
      links: [
        "Pare-chocs avant",
        "Pare-chocs arrière",
        "Aile avant",
        "Aile arrière",
        "Capot"
      ]
    },
    { 
      name: "Pièces Habitacle", 
      icon: Cog, 
      description: "Intérieur véhicule",
      links: [
        "Volant",
        "Siège conducteur",
        "Tableau de bord",
        "Poignée de porte"
      ]
    },
    { 
      name: "Qualité Diesel/Essence", 
      icon: Car, 
      description: "Système d'injection",
      links: [
        "Injecteur",
        "Pompe à injection",
        "Filtre à gasoil",
        "Bougie de préchauffage"
      ]
    },
    { 
      name: "Optiques et Signaux", 
      icon: Wrench, 
      description: "Éclairage automobile",
      links: [
        "Phares avant",
        "Feux arrière",
        "Clignotant",
        "Ampoule"
      ]
    },
    { 
      name: "Refroidissement", 
      icon: Gauge, 
      description: "Radiateurs et ventilation",
      links: [
        "Radiateur",
        "Ventilateur",
        "Thermostat",
        "Liquide de refroidissement"
      ]
    }
  ];

  // Check scroll position and update button states
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -250,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 250,
        behavior: 'smooth'
      });
    }
  };

  // Handle wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: e.deltaY,
        behavior: 'smooth'
      });
    }
  };

  // Toggle category expansion
  const toggleCategory = (index: number) => {
    setExpandedCategory(expandedCategory === index ? null : index);
  };

  // Update scroll state on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      container.addEventListener('wheel', handleWheel, { passive: false });
      checkScrollPosition(); // Initial check
      
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  return (
    <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gradient-to-b from-white via-orange-50/5 to-white relative overflow-hidden w-full max-w-full">
      {/* Ultra-luxury texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.02)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10 overflow-hidden">
        
        {/* Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-5 sm:mb-6 md:mb-8 lg:mb-10 text-[#F97316] leading-tight px-2">
          FAMILLES DES PIÈCES
        </h2>
        
        {/* Horizontal scrolling categories display with controls */}
        <div className="relative w-full">
          
          {/* Scroll Left Button - Hidden on mobile */}
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={`hidden md:flex absolute -left-1 lg:left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-white/95 backdrop-blur-md border-2 border-gray-200 hover:border-[#F97316] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-100 items-center justify-center group ${
              canScrollLeft ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-[#F97316] group-hover:text-[#ea580c] transition-colors" />
          </button>

          {/* Scroll Right Button - Hidden on mobile */}
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={`hidden md:flex absolute -right-1 lg:right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-white/95 backdrop-blur-md border-2 border-gray-200 hover:border-[#F97316] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-100 items-center justify-center group ${
              canScrollRight ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-[#F97316] group-hover:text-[#ea580c] transition-colors" />
          </button>

          {/* Categories Container - Better mobile scroll handling */}
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-3 sm:gap-4 md:gap-5 pb-3 sm:pb-4 scrollbar-hide px-1 sm:px-2 md:px-10 lg:px-12 snap-x snap-mandatory -webkit-overflow-scrolling-touch"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              const isExpanded = expandedCategory === index;
              
              return (
                <div
                  key={index}
                  className="group flex-shrink-0 snap-start w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px]"
                >
                  {/* Category Card */}
                  <div 
                    className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer h-full"
                    onClick={() => toggleCategory(index)}
                  >
                    {/* Card Header */}
                    <div className="p-3 sm:p-4 md:p-5">
                      <div className="text-center">
                        <div className="mb-2 sm:mb-3 flex justify-center">
                          <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#F97316]/10 to-[#E85A00]/5 border-2 transition-all duration-300 ${
                            isExpanded ? 'border-[#F97316] shadow-lg' : 'border-[#F97316]/20 group-hover:border-[#F97316]/50'
                          }`}>
                            <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 mx-auto text-[#F97316] transition-transform duration-300 ${
                              isExpanded ? 'scale-110' : 'group-hover:scale-110'
                            }`} />
                          </div>
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1.5 sm:mb-2 text-gray-900 leading-tight group-hover:text-[#F97316] transition-colors line-clamp-2">
                          {category.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-2 sm:mb-3 line-clamp-2">
                          {category.description}
                        </p>
                        {/* Expand/Collapse Icon */}
                        <div className="flex justify-center">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#F97316] transition-transform duration-300" />
                          ) : (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-[#F97316] transition-all duration-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Links List */}
                    {isExpanded && (
                      <div className="border-t-2 border-[#F97316] bg-white animate-in slide-in-from-top-2 duration-300">
                        <div className="p-3 sm:p-4 md:p-5">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase mb-2 sm:mb-3 text-center">
                            {category.name}
                          </h4>
                          <ul className="space-y-1.5 sm:space-y-2 max-h-[200px] sm:max-h-[250px] md:max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
                            {category.links.map((link, linkIndex) => (
                              <li key={linkIndex}>
                                <Link
                                  to={`/category/${encodeURIComponent(link)}`}
                                  className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 hover:text-[#F97316] transition-colors group/link py-1 sm:py-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-[#F97316] flex-shrink-0 group-hover/link:translate-x-1 transition-transform" />
                                  <span className="flex-1 line-clamp-1">{link}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {/* Scroll Indicator */}
                          {category.links.length > 5 && (
                            <div className="flex justify-center mt-2 sm:mt-3">
                              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 animate-bounce" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll Indicators - More visible on mobile for touch hint */}
          <div className="flex justify-center mt-3 sm:mt-4 md:mt-5 gap-2">
            <div 
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                canScrollLeft 
                  ? 'bg-[#F97316] scale-110 shadow-md' 
                  : 'bg-gray-300'
              }`}
              aria-hidden="true"
            />
            <div 
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                canScrollRight 
                  ? 'bg-[#F97316] scale-110 shadow-md' 
                  : 'bg-gray-300'
              }`}
              aria-hidden="true"
            />
          </div>
          {/* Mobile scroll hint */}
          <p className="text-center text-xs text-gray-400 mt-2 md:hidden">← Glissez pour voir plus →</p>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #fb923c;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #f97316;
        }
      `}</style>
    </section>
  );
};

export default ProductCategoriesSection;
