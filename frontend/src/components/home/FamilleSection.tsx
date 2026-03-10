import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronRight,
} from "lucide-react";

import FamilleCard from "./FamilleCard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSectionContent,
  updateSectionContent,
  getCategoryStatusMap,
  type SectionContentData,
} from "@/api/database";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl, resolveImageUrl } from "@/utils/apiConfig";
import { useFamilles, type FamilleItem } from "@/hooks/useFamilles";
import { useAuth } from "@/hooks/useAuth";
import { createSlug } from "@/utils/slugUtils";
import { mapCategoryStatusToClass, mapCategoryStatusToBadgeClass, mapCategoryStatusToLinkClass, type CategoryStatusColor } from "@/utils/categoryTheme";

interface FamilleSectionProps {
  modelId?: string | number; // Optional modelId for model-specific filtering and passing to /cat routes
}

const FamilleSection = ({ modelId }: FamilleSectionProps = {}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  // Pass modelId to useFamilles for model-specific filtering (if provided)
  // If modelId is undefined, returns all familles (global behavior)
  const { familles, loading } = useFamilles(true, modelId);
  const [famillesState, setFamillesState] = useState<FamilleItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [addSubIndex, setAddSubIndex] = useState<number | null>(null);
  const [newSubText, setNewSubText] = useState("");
  const [editSub, setEditSub] = useState<{
    familleIndex: number;
    subIndex: number;
  } | null>(null);
  const [editSubText, setEditSubText] = useState("");
  const [updatedImages, setUpdatedImages] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isSavingSub, setIsSavingSub] = useState(false);

  const { data: statusMap = { byCategorySlug: {} } } = useQuery({
    queryKey: ["category-status"],
    queryFn: getCategoryStatusMap,
  });

  // Sync local families state with hook data
  useEffect(() => {
    setFamillesState(familles || []);
  }, [familles]);

  const saveFamillesToDB = async (nextFamilles: FamilleItem[]) => {
    try {
      const section = await getSectionContent("famille_categories");

      const newSection: SectionContentData = section
        ? {
            id: section.id,
            sectionType: "famille_categories",
            title: "FAMILLES DES PIÈCES",
            content: nextFamilles,
          }
        : {
            sectionType: "famille_categories",
            title: "FAMILLES DES PIÈCES",
            content: nextFamilles,
          };

      await updateSectionContent("famille_categories", newSection);
      window.dispatchEvent(new CustomEvent('famillesUpdated'));
    } catch (error) {
      console.error("Error saving famille_categories:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les sous-catégories",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleToggleCard = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
    setAddSubIndex(null);
    setEditSub(null);
  };

  const startAddSub = (index: number) => {
    if (!isAdmin) return;
    setAddSubIndex(index);
    setNewSubText("");
    setEditSub(null);
  };

  const confirmAddSub = async () => {
    if (addSubIndex === null || !newSubText.trim()) return;

    const previous = famillesState;
    const next = [...previous];
    const target = next[addSubIndex];
    const list = Array.isArray(target.subcategories)
      ? [...target.subcategories]
      : [];

    list.push(newSubText.trim());
    next[addSubIndex] = { ...target, subcategories: list };

    setFamillesState(next);
    setIsSavingSub(true);
    try {
      await saveFamillesToDB(next);
      setAddSubIndex(null);
      setNewSubText("");
      toast({
        title: "Succès",
        description: "Sous-catégorie ajoutée avec succès",
      });
    } catch (error) {
      setFamillesState(previous);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la sous-catégorie",
        variant: "destructive",
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const cancelAddSub = () => {
    setAddSubIndex(null);
    setNewSubText("");
  };

  const startEditSub = (familleIndex: number, subIndex: number) => {
    if (!isAdmin) return;
    const value = famillesState[familleIndex].subcategories[subIndex];
    setEditSub({ familleIndex, subIndex });
    setEditSubText(value);
    setAddSubIndex(null);
  };

  const confirmEditSub = async () => {
    if (!editSub || !editSubText.trim()) return;

    const previous = famillesState;
    const next = [...previous];
    const list = [...next[editSub.familleIndex].subcategories];

    list[editSub.subIndex] = editSubText.trim();
    next[editSub.familleIndex] = {
      ...next[editSub.familleIndex],
      subcategories: list,
    };

    setFamillesState(next);
    setIsSavingSub(true);
    try {
      await saveFamillesToDB(next);
      setEditSub(null);
      setEditSubText("");
      toast({
        title: "Succès",
        description: "Sous-catégorie modifiée avec succès",
      });
    } catch (error) {
      setFamillesState(previous);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la sous-catégorie",
        variant: "destructive",
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const cancelEditSub = () => {
    setEditSub(null);
    setEditSubText("");
  };

  const handleDeleteSub = async (familleIndex: number, subIndex: number) => {
    if (!isAdmin) return;
    if (!confirm("Supprimer cette sous-catégorie ?")) return;

    const previous = famillesState;
    const next = [...previous];
    const list = Array.isArray(next[familleIndex].subcategories)
      ? [...next[familleIndex].subcategories]
      : [];
    if (!list[subIndex]) return;
    list.splice(subIndex, 1);
    next[familleIndex] = { ...next[familleIndex], subcategories: list };

    setFamillesState(next);
    setIsSavingSub(true);
    try {
      await saveFamillesToDB(next);
      toast({
        title: "Succès",
        description: "Sous-catégorie supprimée avec succès",
      });
    } catch (error) {
      setFamillesState(previous);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la sous-catégorie",
        variant: "destructive",
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleImageChange = async (familleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setUpdatedImages(prev => ({
      ...prev,
      [familleId]: previewUrl
    }));

    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append('image', file);

      // Get user from localStorage for admin auth
      const userData = localStorage.getItem('user');
      const headers: HeadersInit = {};
      if (userData) {
        headers['x-user'] = userData;
      }

      // Send to API
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/familles/${familleId}/image`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.success && result.image) {
        // Update preview with server URL
        setUpdatedImages(prev => ({
          ...prev,
          [familleId]: result.image
        }));

        toast({
          title: "Succès",
          description: "Image mise à jour avec succès",
        });
        
        window.dispatchEvent(new CustomEvent('famillesUpdated'));
      }
    } catch (error) {
      // Remove preview on error
      setUpdatedImages(prev => {
        const newState = { ...prev };
        delete newState[familleId];
        return newState;
      });

      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'image",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="pt-4 pb-10 bg-gray-100">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-gray-900 uppercase tracking-wide">
          FAMILLES DES PIÈCES
        </h2>
        {isAdmin && isSavingSub && (
          <p className="text-center text-sm text-gray-500 mb-2">Enregistrement…</p>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-b-2 border-orange-500 animate-spin" />
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div
            className="
              flex overflow-x-auto sm:overflow-visible
              sm:flex-wrap sm:grid sm:grid-cols-4 sm:gap-6
              gap-4 justify-start items-start w-full px-3 sm:px-0 py-2
              scrollbar-hide
            "
          >
            {famillesState.map((famille, index) => {
              const isExpanded = expandedIndex === index;
              const subcategories = Array.isArray(famille.subcategories) ? famille.subcategories : [];
              const subStatuses = subcategories.map((sub) => statusMap.byCategorySlug?.[createSlug(sub)] || "none");
              const rawStatus: CategoryStatusColor = subStatuses.includes("red") ? "red" : subStatuses.includes("yellow") ? "yellow" : "none";
              const familleStatus = isAdmin ? rawStatus : "none";
              const familleStatusClass = isAdmin ? mapCategoryStatusToClass(rawStatus) : "";

              return (
                <div
                  key={famille.id}
                  className={`${familleStatusClass || ""} relative ${
                    isAdmin
                      ? "bg-transparent flex flex-col w-fit max-w-[320px]"
                      : "bg-transparent flex flex-col w-fit max-w-[230px] min-w-[200px] sm:min-w-0"
                  }`}
                >
                  {isAdmin && familleStatus === "red" && (
                    <span className={mapCategoryStatusToBadgeClass("red")}>RUPTURE</span>
                  )}
                  {isAdmin && familleStatus === "yellow" && (
                    <span className={mapCategoryStatusToBadgeClass("yellow")}>STOCK FAIBLE</span>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          fileInputRefs.current[famille.id]?.click();
                        }}
                        className="absolute top-2 right-2 z-10 bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600 transition-colors"
                      >
                        Modifier
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[famille.id] = el;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleImageChange(famille.id, e)}
                      />
                    </>
                  )}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleCard(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggleCard(index);
                      }
                    }}
                    className="text-left focus:outline-none focus:ring-2 focus:ring-orange-300 rounded-2xl"
                  >
                    <FamilleCard
                      title={famille.title}
                      image={(() => {
                        const imagePath =
                          updatedImages[famille.id] ||
                          famille.image ||
                          famille.image_url ||
                          "";
                        if (!imagePath) return "";
                        return resolveImageUrl(imagePath);
                      })()}
                      isExpanded={isExpanded}
                    />
                  </div>

                  <div
                    className={`mt-2 sm:mt-4 flex justify-center transition-all duration-300 ${
                      isExpanded ? "max-h-[620px] py-2" : "max-h-0 py-0"
                    } overflow-hidden`}
                  >
                    {isExpanded && (
                      <div className="flex justify-start w-full">
                        <div
                          className="
                            mt-2
                            w-full
                            max-w-[250px]
                            rounded-2xl
                            bg-white
                            shadow-md
                            border border-orange-200
                            p-3
                            space-y-2
                            max-h-80
                            overflow-y-auto
                            direction-ltr
                            [scrollbar-color:#c5c5c5_transparent] 
                            [&::-webkit-scrollbar]:w-2
                            [&::-webkit-scrollbar-track]:bg-transparent
                            [&::-webkit-scrollbar-thumb]:bg-orange-300
                            [&::-webkit-scrollbar-thumb]:rounded-full
                          "
                        >
                          {isAdmin && familleStatus === "yellow" ? (
                            <div className="sousCategorieTitle text-left sm:text-center text-sm mb-2 -mx-3 -mt-3">
                              {famille.title}
                            </div>
                          ) : (
                            <>
                              {isAdmin && (
                                <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide text-left sm:text-center">
                                  {famille.title}
                                </div>
                              )}
                              {!isAdmin && (
                                <div className="bg-orange-500 text-white text-center text-sm font-semibold py-2 uppercase tracking-wide rounded-md">
                                  {famille.title}
                                </div>
                              )}
                            </>
                          )}

                          <div className={`divide-y divide-gray-100 ${isAdmin ? "space-y-1" : "space-y-2"}`}>
                            {subcategories.length === 0 ? (
                              <p className="text-sm text-gray-600 py-3 text-center">
                                Aucune sous-catégorie pour le moment.
                              </p>
                            ) : (
                              subcategories.map((sub, subIndex) => {
                                const isEditingSub =
                                  editSub &&
                                  editSub.familleIndex === index &&
                                  editSub.subIndex === subIndex;

                                if (isEditingSub) {
                                  return (
                                    <div
                                      key={subIndex}
                                      className="px-2 py-2 flex items-center gap-2"
                                    >
                                      <ChevronRight className="w-4 h-4 text-orange-500" />
                                      <Input
                                        value={editSubText}
                                        onChange={(e) =>
                                          setEditSubText(e.target.value)
                                        }
                                        className="h-8 text-sm flex-1"
                                      />
                                      <Button
                                        size="icon"
                                        className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                        onClick={confirmEditSub}
                                        disabled={!editSubText.trim() || isSavingSub}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8"
                                        onClick={cancelEditSub}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                }

                                const subSlug = createSlug(sub);
                                const subStatus: CategoryStatusColor = (statusMap.byCategorySlug?.[subSlug] as CategoryStatusColor) || "none";
                                const subLinkClass = isAdmin ? mapCategoryStatusToLinkClass(subStatus) : "";

                                if (isAdmin) {
                                  return (
                                    <div
                                      key={subIndex}
                                      className={`flex items-center justify-between gap-2 rounded-lg bg-orange-50 px-2 py-1 ${subLinkClass}`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const slug = createSlug(sub);

                                          const currentParams = new URLSearchParams(location.search);
                                          const source = currentParams.get("source");
                                          const brand = currentParams.get("brand");
                                          const modelName = currentParams.get("modelName");

                                          const nextParams = new URLSearchParams();
                                          if (modelId !== undefined && modelId !== null && String(modelId).trim() !== "") {
                                            nextParams.set("modelId", String(modelId));
                                          }
                                          if (source === "cars" && brand && modelName) {
                                            nextParams.set("source", "cars");
                                            nextParams.set("brand", brand);
                                            nextParams.set("modelName", modelName);
                                          }

                                          const qs = nextParams.toString();
                                          const url = qs ? `/cat/${slug}?${qs}` : `/cat/${slug}`;
                                          navigate(url);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="text-sm hover:text-orange-600 text-left flex-1 truncate"
                                      >
                                        {sub}
                                      </button>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            startEditSub(index, subIndex);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200 text-blue-600"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleDeleteSub(index, subIndex);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200 text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={subIndex}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const slug = createSlug(sub);

                                      const currentParams = new URLSearchParams(location.search);
                                      const source = currentParams.get("source");
                                      const brand = currentParams.get("brand");
                                      const modelName = currentParams.get("modelName");

                                      const nextParams = new URLSearchParams();
                                      if (modelId !== undefined && modelId !== null && String(modelId).trim() !== "") {
                                        nextParams.set("modelId", String(modelId));
                                      }
                                      if (source === "cars" && brand && modelName) {
                                        nextParams.set("source", "cars");
                                        nextParams.set("brand", brand);
                                        nextParams.set("modelName", modelName);
                                      }

                                      const qs = nextParams.toString();
                                      const url = qs ? `/cat/${slug}?${qs}` : `/cat/${slug}`;
                                      navigate(url);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className={`
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                      px-2
                                      py-2.5
                                      hover:bg-gray-50
                                      transition-colors
                                      w-full
                                      rounded-lg
                                      ${subLinkClass || "text-gray-700"}
                                    `}
                                  >
                                    <span
                                      className="flex-1 text-sm sm:text-base font-medium text-left leading-snug whitespace-nowrap truncate"
                                    >
                                      {sub}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {isAdmin && (
                            <div className="border-t border-gray-100 pt-2">
                              {addSubIndex === index ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={newSubText}
                                    onChange={(e) =>
                                      setNewSubText(e.target.value)
                                    }
                                    placeholder="Nom de la sous-catégorie"
                                    className="h-9 text-sm flex-1"
                                  />
                                  <Button
                                    size="icon"
                                    className="h-9 w-9 bg-orange-500 hover:bg-orange-600"
                                    onClick={confirmAddSub}
                                    disabled={!newSubText.trim() || isSavingSub}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9"
                                    onClick={cancelAddSub}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startAddSub(index)}
                                  className="mt-2 w-full rounded-lg border border-dashed border-orange-400 px-2 py-2 text-center text-xs font-medium text-orange-600 hover:bg-orange-50"
                                >
                                  Ajouter une sous-catégorie
                                </button>
                              )}
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
        )}
      </div>
    </section>
  );
};

export default FamilleSection;
