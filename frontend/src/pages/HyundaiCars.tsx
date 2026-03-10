import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { getAllVehicleModels, type VehicleModelData } from "@/api/database";
import { normalizeModelName, getModelUIMapping } from "@/utils/vehicleModelMapping";
import { dedupeVehicleModelsClient } from "@/utils/vehicleModelUtils";

type HyundaiModel = {
  id: number;      // Database ID from vehicle_models table
  name: string;    // Display name
  image: string;   // Image URL (public path)
};

const HyundaiCars: React.FC = () => {
  const navigate = useNavigate();
  const [hyundaiModels, setHyundaiModels] = useState<HyundaiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicle models from backend API
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 [HyundaiCars] Fetching all vehicle models from backend...');
        
        // Fetch all models from backend
        const allModels = await getAllVehicleModels();
        console.log('📊 [HyundaiCars] Raw API response:', {
          total: allModels.length,
          sample: allModels.slice(0, 3).map(m => ({ id: m.id, marque: m.marque, model: m.model }))
        });
        
        // Filter only Hyundai models
        const hyundaiModelsFromDb = allModels.filter(
          (model) => model.marque && normalizeModelName(model.marque) === "hyundai"
        );
        const dedupedHyundaiModels = dedupeVehicleModelsClient(hyundaiModelsFromDb);
        console.log('✅ [HyundaiCars] Filtered Hyundai models:', {
          count: dedupedHyundaiModels.length,
          removedDuplicates: hyundaiModelsFromDb.length - dedupedHyundaiModels.length,
          models: dedupedHyundaiModels.map(m => ({ id: m.id, model: m.model }))
        });
        
        if (hyundaiModelsFromDb.length === 0) {
          console.warn('⚠️ [HyundaiCars] No Hyundai models found in backend');
          setError('Aucun modèle Hyundai disponible pour le moment.');
          setHyundaiModels([]);
          return;
        }
        
        // Map database models to UI models with normalized names and image mapping
        const mappedModels: HyundaiModel[] = dedupedHyundaiModels.map((dbModel) => {
          const normalizedName = normalizeModelName(dbModel.model);
          const uiMapping = getModelUIMapping(normalizedName, "Hyundai");
          
          // Ensure ID is a number
          const modelId = typeof dbModel.id === 'number' 
            ? dbModel.id 
            : parseInt(String(dbModel.id), 10);
          
          if (isNaN(modelId) || modelId <= 0) {
            console.warn('⚠️ [HyundaiCars] Invalid model ID:', dbModel);
            return null;
          }
          
          return {
            id: modelId,
            name: uiMapping.title || dbModel.model,
            image: uiMapping.image,
          };
        }).filter((model): model is HyundaiModel => model !== null);
        
        console.log('✅ [HyundaiCars] Mapped models for UI:', {
          count: mappedModels.length,
          models: mappedModels.map(m => ({ id: m.id, name: m.name }))
        });
        
        setHyundaiModels(mappedModels);
      } catch (error: any) {
        console.error('❌ [HyundaiCars] Error loading models:', error);
        setError(`Erreur de chargement: ${error?.message || 'Erreur inconnue'}`);
        setHyundaiModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  const handleCardClick = (model: HyundaiModel) => {
    navigate(
      `/pieces-dispo/${model.id}?source=cars&brand=Hyundai&modelName=${encodeURIComponent(model.name)}`
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="bg-background min-h-screen">
        <div className="max-w-6xl mx-auto px-3 py-8 sm:px-4 sm:py-10">
          {/* Page Header */}
          <header className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500 mb-2 font-semibold">
              Catalogue Hyundai
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground">
              Hyundai cars
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              Découvrez notre sélection de modèles Hyundai et trouvez facilement les pièces compatibles
              pour votre véhicule.
            </p>
          </header>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des modèles...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && hyundaiModels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun modèle Hyundai disponible pour le moment.</p>
            </div>
          )}

          {/* Models Grid */}
          {!loading && hyundaiModels.length > 0 && (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {hyundaiModels.map((model) => (
                <Card
                  key={model.id || model.name}
                  onClick={() => handleCardClick(model)}
                  className="group overflow-hidden border border-orange-500/10 bg-gradient-to-b from-zinc-900/80 to-background shadow-md hover:shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all duration-300 cursor-pointer h-full flex flex-col"
                  role="button"
                  aria-label={`Voir les pièces pour ${model.name}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(model);
                    }
                  }}
                >
                {/* Image Container */}
                <div className="relative aspect-video overflow-hidden bg-zinc-900">
                  <img
                    src={(() => {
                      // model.image from mapping is already "/hyundai/Hyundai I10.jpg"
                      // Extract filename and URL encode it to handle spaces and special characters
                      if (model.image.startsWith('/hyundai/')) {
                        const filename = model.image.replace('/hyundai/', '');
                        return `/hyundai/${encodeURIComponent(filename)}`;
                      }
                      // Fallback: if format is different, construct path with encoding
                      return `/hyundai/${encodeURIComponent(model.image)}`;
                    })()}
                    alt={model.name}
                    className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      const failedUrl = imgElement.src;
                      console.error(`❌ [HyundaiCars] Failed to load image for "${model.name}"`);
                      console.error(`   Attempted URL: ${failedUrl}`);
                      console.error(`   Model image value: "${model.image}"`);
                      console.error(`   Model ID: ${model.id}`);
                      // Fallback to placeholder if image doesn't exist
                      imgElement.src = '/placeholder.svg';
                    }}
                  />
                  {/* Gradient Overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Hyundai Badge */}
                  <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-orange-500/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm">
                    Hyundai
                  </span>
                </div>

                {/* Card Content */}
                <CardHeader className="pb-2 flex-1 flex flex-col">
                  <CardTitle className="text-sm md:text-base font-semibold line-clamp-2 text-foreground group-hover:text-orange-500 transition-colors duration-300">
                    {model.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 pb-4 text-xs text-muted-foreground">
                  <p className="line-clamp-3">
                    Modèle Hyundai idéal pour votre véhicule. Cliquez pour voir les pièces disponibles
                    et les compatibilités.
                  </p>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HyundaiCars;
