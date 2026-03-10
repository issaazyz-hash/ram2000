import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Edit, Trash2, Plus } from "lucide-react";

interface PartsCategory {
  id: string;
  title: string;
  image: string;
  subItems: string[];
}

// مكون Card منفصل لكل بطاقة
interface PartsCardProps {
  category: PartsCategory;
  isExpanded: boolean;
  onToggle: (categoryId: string) => void;
  isAdmin?: boolean;
  deleteMode?: boolean;
  onDelete?: (categoryId: string) => void;
  onEditImage?: (categoryId: string) => void;
  onEditSubItem?: (categoryId: string, subItemIndex: number, newValue: string) => void;
  onDeleteSubItem?: (categoryId: string, subItemIndex: number) => void;
  onAddSubItem?: (categoryId: string) => void;
}

const PartsCard = React.memo(({ category, isExpanded, onToggle, isAdmin = false, deleteMode = false, onDelete, onEditImage, onEditSubItem, onDeleteSubItem, onAddSubItem, brandName }: PartsCardProps & { brandName?: string }) => {
  const [editingSubItemIndex, setEditingSubItemIndex] = useState<number | null>(null);
  const [editingSubItemValue, setEditingSubItemValue] = useState<string>("");

  // دالة لتوليد filterId من اسم العنصر (ID ثابت)
  const generateFilterId = (subItemName: string): string => {
    const baseName = subItemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const brand = brandName ? brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'default';
    // استخدام hash بسيط لإنشاء ID ثابت
    let hash = 0;
    const str = `${brand}-${baseName}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `filter-${Math.abs(hash)}`;
  };

  // دالة لإنشاء بيانات افتراضية في localStorage
  const ensureFilterDataExists = (subItemName: string, filterId: string) => {
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');
    const existingLink = customLinks.find((link: any) => link.id === filterId || link.url?.includes(filterId));
    
    if (!existingLink) {
      // إنشاء بيانات افتراضية كاملة
      const newLink = {
        id: filterId,
        name: subItemName,
        url: `/filter/${filterId}`,
        description: `Pièce d'origine certifiée, testée et garantie pour assurer les meilleures performances et une longévité optimale de votre moteur.`,
        price: '0.00',
        image: '/ff.png',
        images: ['/ff.png', '/ll.png', '/ff.png'],
        ref: '',
        ref1: '',
        referenceFields: [
          { id: 'ref', label: 'Réf', value: '' },
          { id: 'ref1', label: 'Code usine', value: '' }
        ],
        modeles: [],
        motorisations: [],
        colors: []
      };
      
      customLinks.push(newLink);
      localStorage.setItem('customLinks', JSON.stringify(customLinks));
    }
  };
  const handleArrowClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    // التأكد من استدعاء onToggle مع ID الصحيح
    const categoryId = String(category.id).trim();
    if (categoryId) {
      onToggle(categoryId);
    }
  };

  const handleSubItemClick = (e: React.MouseEvent<HTMLButtonElement>, subItem: string) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleStartEditSubItem = (e: React.MouseEvent<HTMLButtonElement>, index: number, currentValue: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingSubItemIndex(index);
    setEditingSubItemValue(currentValue);
  };

  const handleSaveSubItem = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditSubItem && editingSubItemValue.trim()) {
      onEditSubItem(category.id, index, editingSubItemValue.trim());
    }
    setEditingSubItemIndex(null);
    setEditingSubItemValue("");
  };

  const handleCancelEditSubItem = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingSubItemIndex(null);
    setEditingSubItemValue("");
  };

  const handleDeleteSubItemClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteSubItem && confirm(`Êtes-vous sûr de vouloir supprimer "${category.subItems[index]}" ?`)) {
      onDeleteSubItem(category.id, index);
    }
  };

  const handleAddSubItemClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddSubItem) {
      onAddSubItem(category.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Êtes-vous sûr de vouloir supprimer "${category.title}" ?`)) {
      onDelete(category.id);
    }
  };

  const handleEditImageClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditImage) {
      onEditImage(category.id);
    }
  };

  return (
    <div
      key={category.id}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 flex flex-col relative"
    >
      {/* أزرار الادمين */}
      {isAdmin && deleteMode && (
        <button
          onClick={handleDeleteClick}
          className="absolute -top-2 -right-2 z-50 h-8 w-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold shadow-md flex items-center justify-center"
          title="Supprimer"
        >
          ×
        </button>
      )}
      {isAdmin && !deleteMode && (
        <button
          onClick={handleEditImageClick}
          className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center justify-center text-xs"
          title="Modifier l'image"
        >
          📷
        </button>
      )}

      {/* الصورة في الأعلى */}
      <div className="relative w-full h-32 xs:h-36 sm:h-40 md:h-44 lg:h-48 bg-gray-100 overflow-hidden flex items-center justify-center">
        <img
          src={category.image.startsWith('data:') ? category.image : category.image}
          alt={category.title}
          className="w-full h-full object-contain p-1 sm:p-2 transition-transform duration-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.fallback-icon')) {
              const fallback = document.createElement('div');
              fallback.className = 'fallback-icon w-full h-full flex items-center justify-center bg-gray-50';
              fallback.innerHTML = `<span class="text-3xl sm:text-4xl md:text-5xl">🔧</span>`;
              parent.appendChild(fallback);
            }
          }}
        />
      </div>

      {/* الخط الأحمر الفاصل */}
      <div className="w-full h-0.5 bg-red-600"></div>

      {/* العنوان والعناصر */}
      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-4">
        <h3 className="text-xs xs:text-sm sm:text-sm md:text-base font-medium text-gray-800 text-center mb-2 sm:mb-3 leading-tight min-h-[2rem] sm:min-h-[2.5rem] flex items-center justify-center px-1">
          {category.title}
        </h3>
        
        {/* العناصر الفرعية - تظهر فقط للبطاقة المفتوحة */}
        {isExpanded && (
          <div className="mt-1 sm:mt-2 mb-2 sm:mb-3 space-y-1 sm:space-y-2 border-t border-gray-200 pt-2 sm:pt-3 max-h-48 sm:max-h-64 overflow-y-auto">
            {category.subItems.map((subItem, index) => (
              <div
                key={`${category.id}-sub-${index}`}
                className="flex items-center gap-1.5 sm:gap-2 group/item"
              >
                {isAdmin && editingSubItemIndex === index ? (
                  <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={editingSubItemValue}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEditingSubItemValue(e.target.value);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveSubItem(e as any, index);
                        } else if (e.key === 'Escape') {
                          handleCancelEditSubItem(e as any);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-[10px] xs:text-xs sm:text-xs md:text-sm text-gray-800 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded border border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => handleSaveSubItem(e, index)}
                      className="p-1 sm:p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                      title="Enregistrer"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCancelEditSubItem(e)}
                      className="p-1 sm:p-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded transition-colors"
                      title="Annuler"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to={`/filter/${generateFilterId(subItem)}`}
                      className="flex-1 text-left text-[10px] xs:text-xs sm:text-xs md:text-sm text-gray-600 hover:text-red-600 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded hover:bg-gray-50 transition-colors duration-200 break-words cursor-pointer"
                      onClick={(e) => {
                        // السماح للأيقونات بالعمل
                        if ((e.target as HTMLElement).closest('button')) {
                          e.preventDefault();
                          return;
                        }
                        // إنشاء بيانات افتراضية قبل الانتقال
                        const filterId = generateFilterId(subItem);
                        ensureFilterDataExists(subItem, filterId);
                      }}
                    >
                      {subItem}
                    </Link>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStartEditSubItem(e, index, subItem);
                          }}
                          className="p-1 sm:p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors shadow-sm"
                          title="Modifier"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteSubItemClick(e, index);
                          }}
                          className="p-1 sm:p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {isAdmin && (
              <button
                type="button"
                onClick={handleAddSubItemClick}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] xs:text-xs sm:text-xs md:text-sm text-orange-600 hover:text-orange-700 py-1.5 sm:py-2 px-2 sm:px-3 rounded border border-dashed border-orange-400 hover:border-orange-500 hover:bg-orange-50 transition-colors duration-200 mt-2"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Ajouter une pièce</span>
              </button>
            )}
          </div>
        )}
        
        {/* السهم الصغير في الأسفل */}
        <div className="flex justify-center mt-auto pt-1 sm:pt-2">
          <button
            type="button"
            onClick={handleArrowClick}
            className={`p-0.5 sm:p-1 rounded touch-manipulation focus:outline-none transition-colors duration-200 ${
              isExpanded ? 'bg-gray-100' : 'hover:bg-gray-100'
            }`}
            aria-label={isExpanded ? "Fermer" : "Ouvrir"}
            aria-expanded={isExpanded}
          >
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExpanded ? 'text-red-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ 
                pointerEvents: 'none',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease, color 0.2s ease'
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

const BrandPartsPage = () => {
  const { brandName } = useParams<{ brandName: string }>();
  const navigate = useNavigate();
  // استخدام string فقط - يجب أن يحتوي على ID واحدة فقط أو null
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [pendingEditCategoryId, setPendingEditCategoryId] = useState<string | null>(null);
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>("");
  const [newCategoryItems, setNewCategoryItems] = useState<string>("PIÈCE 1\nPIÈCE 2\nPIÈCE 3");
  const [newCategoryImage, setNewCategoryImage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  // بيانات الفئات الـ 12 حسب التصميم مع العناصر الفرعية
  const defaultPartsCategories: PartsCategory[] = [
    {
      id: "moteur",
      title: "PIÈCES MOTEUR",
      image: "/parts/moteur.jpg",
      subItems: [
        "KIT DE DISTRIBUTION",
        "BOUGIE D'ALLUMAGE",
        "POMPE À EAU",
        "JOINT DE CULASSE",
        "SUPPORT MOTEUR",
        "COURROIE TRAPEZOÏDALE À NERVURES"
      ]
    },
    {
      id: "direction-suspension",
      title: "DIRECTIONS SUSPENSION TRAIN",
      image: "/parts/direction.jpg",
      subItems: [
        "AMORTISSEUR",
        "RESSORT",
        "ROTULE DE DIRECTION",
        "BRAS DE SUSPENSION",
        "COUPLEUR DE DIRECTION",
        "ROULEMENT DE ROUE"
      ]
    },
    {
      id: "filtration",
      title: "FILTRATION",
      image: "/parts/filtre.jpg",
      subItems: [
        "FILTRE À HUILE",
        "FILTRE À AIR",
        "FILTRE À CARBURANT",
        "FILTRE À POLLEN",
        "FILTRE HABITACLE"
      ]
    },
    {
      id: "freinage",
      title: "FREINAGE",
      image: "/parts/freinage.jpg",
      subItems: [
        "PLAQUETTE DE FREIN",
        "DISQUE DE FREIN",
        "ÉTIER DE FREIN",
        "LIQUIDE DE FREIN",
        "FLEXIBLE DE FREIN",
        "MAÎTRE-CYLINDRE"
      ]
    },
    {
      id: "embrayage",
      title: "EMBRAYAGE ET BOÎTE DE VITESSE",
      image: "/parts/embrayage.jpg",
      subItems: [
        "KIT D'EMBRAYAGE",
        "VOLANT MOTEUR",
        "HUILE DE BOÎTE",
        "JOINT SPI",
        "SYNCHRONISEUR"
      ]
    },
    {
      id: "thermique",
      title: "PIÈCES THERMIQUES ET CLIMATISATION",
      image: "/parts/thermique.jpg",
      subItems: [
        "RADIATEUR",
        "VENTILATEUR",
        "THERMOSTAT",
        "COMPRESSEUR CLIMATISATION",
        "CONDENSEUR",
        "RÉSISTANCE CHAUFFANTE"
      ]
    },
    {
      id: "demarrage",
      title: "DÉMARRAGE ET CHARGE",
      image: "/parts/demarrage.jpg",
      subItems: [
        "DÉMARREUR",
        "ALTERNATEUR",
        "BATTERIE",
        "RÉGULATEUR",
        "COURROIE D'ALTERNATEUR"
      ]
    },
    {
      id: "carrosserie",
      title: "CARROSSERIE",
      image: "/parts/carrosserie.jpg",
      subItems: [
        "PORTE",
        "CAPOT",
        "COFFRE",
        "AILERON",
        "PAR-CHOC",
        "RÉTROVISEUR"
      ]
    },
    {
      id: "habitacle",
      title: "PIÈCES HABITACLE",
      image: "/parts/habitacle.jpg",
      subItems: [
        "VOLANT",
        "PÉDALIER",
        "LEVIER DE VITESSE",
        "TABLEAU DE BORD",
        "SIÈGE",
        "GARNITURE INTÉRIEURE"
      ]
    },
    {
      id: "essuie-glace",
      title: "BALAI D'ESSUIE-GLACE",
      image: "/parts/essuie-glace.jpg",
      subItems: [
        "BALAI AVANT",
        "BALAI ARRIÈRE",
        "BRAS D'ESSUIE-GLACE",
        "MOTEUR D'ESSUIE-GLACE"
      ]
    },
    {
      id: "optiques",
      title: "OPTIQUES, PHARES ET AMPOULES",
      image: "/parts/optiques.jpg",
      subItems: [
        "PHARE AVANT",
        "FEU ARRIÈRE",
        "FEU STOP",
        "AMPOULE H7",
        "AMPOULE H4",
        "CLIGNOTANT"
      ]
    },
    {
      id: "echappement",
      title: "ECHAPPEMENT",
      image: "/parts/echappement.jpg",
      subItems: [
        "POT D'ÉCHAPPEMENT",
        "COLLECTEUR",
        "CATALYSEUR",
        "SONDE LAMBDA",
        "SILENCIEUX"
      ]
    }
  ];

  const [partsCategories, setPartsCategories] = useState<PartsCategory[]>(defaultPartsCategories);

  // التحقق من صلاحيات الادمين
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    let admin = false;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const role = typeof u?.role === "string" ? u.role.toLowerCase() : "";
        admin = admin || role === "admin";
        admin = admin || u?.is_admin === true || u?.isAdmin === true;
      } catch {}
    }
    if (localStorage.getItem("is_admin") === "true" || localStorage.getItem("force_admin") === "1") {
      admin = true;
    }
    setIsAdmin(admin);
  }, []);

  // تحميل البيانات من localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`parts_categories_${brandName}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPartsCategories(parsed);
        }
      } catch {}
    }
  }, [brandName]);

  // دالة ضغط الصور
  const compressImage = (dataUrl: string, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // حساب الأبعاد الجديدة
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(dataUrl); // Fallback if canvas not supported
        }
      };
      img.onerror = () => resolve(dataUrl); // Fallback on error
      img.src = dataUrl;
    });
  };

  // دالة آمنة لحفظ البيانات في localStorage
  const trySetLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded. Attempting to clear old data...');
        try {
          // حذف جميع بيانات parts_categories_ القديمة (عدا المفتاح الحالي)
          const keys = Object.keys(localStorage);
          const importantKeys = ['user', 'is_admin', 'force_admin'];
          let deleted = 0;
          
          // حذف جميع parts_categories_ القديمة
          for (const k of keys) {
            if (k.startsWith('parts_categories_') && k !== key) {
              localStorage.removeItem(k);
              deleted++;
            }
          }
          
          // حذف بيانات أخرى (عدا المهمة)
          for (const k of keys) {
            if (!importantKeys.includes(k) && !k.startsWith('parts_categories_') && deleted < 10) {
              localStorage.removeItem(k);
              deleted++;
            }
          }
          
          // محاولة الحفظ مرة أخرى
          try {
            localStorage.setItem(key, value);
            console.log('✅ Successfully saved after clearing old data');
          } catch (e2) {
            console.error('❌ Failed to save after clearing old data:', e2);
            // إذا فشل، احذف الصور من البيانات وحاول مرة أخرى
            try {
              const data = JSON.parse(value);
              if (Array.isArray(data)) {
                const dataWithoutImages = data.map((item: any) => ({
                  ...item,
                  image: item.image?.startsWith('data:') ? '/parts/default.jpg' : item.image
                }));
                const compressedData = JSON.stringify(dataWithoutImages);
                localStorage.setItem(key, compressedData);
                console.log('✅ Saved without images');
              }
            } catch (e3) {
              console.error('❌ Final save attempt failed:', e3);
              // آخر محاولة: حفظ فقط البيانات الأساسية بدون صور
              try {
                const data = JSON.parse(value);
                if (Array.isArray(data)) {
                  const minimalData = data.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    image: '/parts/default.jpg',
                    subItems: item.subItems || []
                  }));
                  localStorage.setItem(key, JSON.stringify(minimalData));
                  console.log('✅ Saved minimal data only');
                }
              } catch (e4) {
                console.error('❌ All save attempts failed:', e4);
              }
            }
          }
        } catch (clearError) {
          console.error('❌ Error clearing localStorage:', clearError);
        }
      } else {
        console.error('❌ Error saving to localStorage:', error);
      }
    }
  };

  // حفظ البيانات في localStorage
  useEffect(() => {
    trySetLocalStorage(`parts_categories_${brandName}`, JSON.stringify(partsCategories));
  }, [partsCategories, brandName]);

  // التأكد من أن expandedCardId يحتوي على قيمة واحدة فقط
  useEffect(() => {
    if (expandedCardId !== null) {
      // التأكد من أن expandedCardId هو string وليس array أو object
      if (typeof expandedCardId !== 'string') {
        console.error('❌ expandedCardId is not a string!', expandedCardId);
        setExpandedCardId(null);
      }
    }
  }, [expandedCardId]);

  const toggleCard = useCallback((categoryId: string) => {
    // التأكد من أن categoryId هو string
    const id = String(categoryId).trim();
    if (!id) return;
    
    setExpandedCardId((currentId) => {
      // إذا كانت البطاقة الحالية هي نفس البطاقة المضغوطة، أُغلقها
      if (currentId === id) {
        return null;
      }
      // وإلا، أفتح البطاقة الجديدة فقط (هذا سيغلق أي بطاقة أخرى تلقائياً)
      return id;
    });
  }, []);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleEditImageUpload = async (file: File, categoryId: string) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl) {
        // ضغط الصورة قبل الحفظ
        const compressed = await compressImage(dataUrl, 400, 400, 0.5);
        setPartsCategories(prev =>
          prev.map(cat => (cat.id === categoryId ? { ...cat, image: compressed } : cat))
        );
        setEditingImageId(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    }
  };

  const handleNewImageUpload = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl) {
        // ضغط الصورة قبل الحفظ
        const compressed = await compressImage(dataUrl, 400, 400, 0.5);
        setNewCategoryImage(compressed);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    }
  };

  const openEditImagePicker = (categoryId: string) => {
    setEditingImageId(categoryId);
    setPendingEditCategoryId(categoryId);
    if (editImageInputRef.current) {
      editImageInputRef.current.value = "";
      editImageInputRef.current.click();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryTitle.trim() || !newCategoryImage) {
      alert("Veuillez ajouter un titre et une image.");
      return;
    }
    setIsSaving(true);
    const id = newCategoryTitle.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const subItems = newCategoryItems
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);
    const newCategory: PartsCategory = {
      id,
      title: newCategoryTitle.trim(),
      image: newCategoryImage,
      subItems: subItems.length ? subItems : ["NOUVELLE PIÈCE"]
    };
    setPartsCategories(prev => [newCategory, ...prev]);
    setNewCategoryTitle("");
    setNewCategoryItems("PIÈCE 1\nPIÈCE 2\nPIÈCE 3");
    setNewCategoryImage("");
    setAddModalOpen(false);
    setIsSaving(false);
  };

  const handleEditSubItem = (categoryId: string, subItemIndex: number, newValue: string) => {
    setPartsCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subItems: cat.subItems.map((item, idx) => (idx === subItemIndex ? newValue : item))
            }
          : cat
      )
    );
  };

  const handleDeleteSubItem = (categoryId: string, subItemIndex: number) => {
    setPartsCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subItems: cat.subItems.filter((_, idx) => idx !== subItemIndex)
            }
          : cat
      )
    );
  };

  const handleAddSubItem = (categoryId: string) => {
    const newItem = prompt("Entrez le nom de la nouvelle pièce:");
    if (newItem && newItem.trim()) {
      setPartsCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                subItems: [...cat.subItems, newItem.trim()]
              }
            : cat
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* عنوان الصفحة */}
        <div className="mb-4 sm:mb-6 md:mb-8 text-center px-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2 leading-tight">
            {brandName ? `Pièces détachées pour ${brandName}` : "Pièces détachées"}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">Choisissez une catégorie de pièces</p>
        </div>

        {/* أزرار الادمين */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3 justify-center sm:justify-end mb-4 sm:mb-6">
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-lg hover:scale-[1.02] transition"
            >
              ➕ Ajouter une catégorie
            </button>
            <button
              onClick={() => setDeleteMode(prev => !prev)}
              className={`px-4 py-2 rounded-full font-semibold shadow-lg transition ${
                deleteMode
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {deleteMode ? "🔒 Quitter le mode suppression" : "🗑️ Mode suppression"}
            </button>
          </div>
        )}

        {/* شبكة البطاقات - متجاوبة بالكامل */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 max-w-7xl mx-auto">
          {partsCategories.map((category) => {
            // حساب isExpanded بشكل بسيط ودقيق
            // فقط عندما يكون expandedCardId يساوي category.id تماماً
            const isExpanded = expandedCardId !== null && typeof expandedCardId === 'string' && expandedCardId === category.id;
            
            return (
              <PartsCard
                key={category.id}
                category={category}
                isExpanded={isExpanded}
                onToggle={toggleCard}
                isAdmin={isAdmin}
                deleteMode={deleteMode}
                onDelete={(id) => {
                  setPartsCategories(prev => prev.filter(cat => cat.id !== id));
                }}
                onEditImage={(id) => {
                  openEditImagePicker(id);
                }}
                onEditSubItem={handleEditSubItem}
                onDeleteSubItem={handleDeleteSubItem}
                onAddSubItem={handleAddSubItem}
                brandName={brandName}
              />
            );
          })}
        </div>

        {/* زر الرجوع */}
        <div className="mt-4 sm:mt-6 md:mt-8 text-center px-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors duration-300 w-full sm:w-auto max-w-xs sm:max-w-none"
          >
            ← Retour
          </button>
        </div>
      </main>

      {/* مخفي لرفع الصور */}
      {isAdmin && (
        <>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleNewImageUpload(file);
              }
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={editImageInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && pendingEditCategoryId) {
                handleEditImageUpload(file, pendingEditCategoryId);
              }
              setPendingEditCategoryId(null);
              if (editImageInputRef.current) {
                editImageInputRef.current.value = "";
              }
            }}
          />
        </>
      )}

      {/* Modal إضافة بطاقة */}
      {isAdmin && addModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Ajouter une nouvelle catégorie
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Accessoires premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liste des pièces (une par ligne)
                </label>
                <textarea
                  value={newCategoryItems}
                  onChange={(e) => setNewCategoryItems(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Image de la catégorie
                </label>
                {newCategoryImage ? (
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={newCategoryImage}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setNewCategoryImage("")}
                      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-8 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition text-sm font-medium"
                  >
                    📷 Charger une image
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddCategory}
                  disabled={isSaving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Enregistrement..." : "Ajouter"}
                </button>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BrandPartsPage;
