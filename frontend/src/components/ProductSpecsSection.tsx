import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSectionContent, updateSectionContent } from "@/api/database";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";

interface Spec {
  label: string;
  value: string;
}

interface ProductSpecsData {
  title: string;
  specs: Spec[];
  extraTitle: string;
  extraDescription: string;
}

const ProductSpecsSection = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<ProductSpecsData>({
    title: "",
    specs: [],
    extraTitle: "",
    extraDescription: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const sectionContent = await getSectionContent("product_specs");
      
      if (sectionContent?.content) {
        const content = typeof sectionContent.content === 'string'
          ? JSON.parse(sectionContent.content)
          : sectionContent.content;
        
        if (content && typeof content === 'object') {
          setData({
            title: content.title || "",
            specs: Array.isArray(content.specs) ? content.specs : [],
            extraTitle: content.extraTitle || "",
            extraDescription: content.extraDescription || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading product specs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Clean data before saving
      const cleanedData: ProductSpecsData = {
        title: data.title || "",
        specs: data.specs.filter(spec => spec.label.trim() && spec.value.trim()),
        extraTitle: data.extraTitle || "",
        extraDescription: data.extraDescription || "",
      };

      await updateSectionContent("product_specs", {
        sectionType: "product_specs",
        title: "Product Specifications",
        content: cleanedData,
      });

      toast({
        title: "Succès",
        description: "Spécifications mises à jour avec succès",
      });
    } catch (error) {
      console.error("Error saving product specs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les spécifications",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSpec = () => {
    setData({
      ...data,
      specs: [...data.specs, { label: "", value: "" }],
    });
  };

  const removeSpec = (index: number) => {
    setData({
      ...data,
      specs: data.specs.filter((_, i) => i !== index),
    });
  };

  const updateSpec = (index: number, field: "label" | "value", value: string) => {
    const newSpecs = [...data.specs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setData({ ...data, specs: newSpecs });
  };

  // Don't show anything for regular users if no data
  const hasData = data.title || data.specs.length > 0 || data.extraTitle || data.extraDescription;
  
  if (isLoading) {
    return null;
  }

  // For regular users: only show if there's data
  if (!isAdmin && !hasData) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Admin Edit Mode */}
      {isAdmin && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
            Mode Édition Admin - Spécifications Produit
          </h3>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre Principal
            </label>
            <Input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="CARACTÉRISTIQUES TECHNIQUES"
              className="w-full"
            />
          </div>

          {/* Specs List */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Spécifications
              </label>
              <Button
                onClick={addSpec}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {data.specs.map((spec, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={spec.label}
                    onChange={(e) => updateSpec(index, "label", e.target.value)}
                    placeholder="Label"
                    className="flex-1"
                  />
                  <Input
                    value={spec.value}
                    onChange={(e) => updateSpec(index, "value", e.target.value)}
                    placeholder="Valeur"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => removeSpec(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre Section Secondaire
            </label>
            <Input
              value={data.extraTitle}
              onChange={(e) => setData({ ...data, extraTitle: e.target.value })}
              placeholder="INFORMATIONS TECHNIQUES"
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description Section Secondaire
            </label>
            <textarea
              value={data.extraDescription}
              onChange={(e) => setData({ ...data, extraDescription: e.target.value })}
              placeholder="Texte descriptif..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent resize-y"
              rows={4}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-[#F97316] hover:bg-[#ea580c] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      )}

      {/* Display Mode - Only show if there's data */}
      {hasData && (
        <>
          {/* Main Specs Card */}
          {data.title || data.specs.length > 0 ? (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8 mb-6">
              {data.title && (
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 uppercase mb-4 sm:mb-6">
                  {data.title}
                </h2>
              )}

              {data.specs.length > 0 && (
                <div className="space-y-0">
                  {data.specs.map((spec, index) => (
                    <div
                      key={index}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 px-3 sm:px-4 ${
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } rounded-lg`}
                    >
                      <span className="font-bold text-gray-900 text-sm sm:text-base mb-1 sm:mb-0 sm:mr-4">
                        {spec.label}
                      </span>
                      <span className="text-gray-700 text-sm sm:text-base text-left sm:text-right">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Extra Section */}
          {data.extraTitle || data.extraDescription ? (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8">
              {data.extraTitle && (
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 uppercase mb-3 sm:mb-4">
                  {data.extraTitle}
                </h3>
              )}
              {data.extraDescription && (
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {data.extraDescription}
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default ProductSpecsSection;

