import { useState, useEffect } from 'react';
import { getSectionContent } from '@/api/database';

export type FamilleItem = {
  id: string;
  title: string;
  image: string;
  image_url?: string;
  subcategories?: string[];
};

const DEFAULT_FAMILLES: FamilleItem[] = [
  {
    id: "famille-moteur",
    title: "PIÈCES MOTEUR",
    image: "/images/moteur.png",
    subcategories: [],
  },
  {
    id: "famille-suspension",
    title: "DIRECTIONS SUSPENSION TRAIN",
    image: "/images/suspension.png",
    subcategories: [],
  },
  {
    id: "famille-filtration",
    title: "FILTRATION",
    image: "/images/filtre.png",
    subcategories: [],
  },
  {
    id: "famille-freinage",
    title: "FREINAGE",
    image: "/images/freinage.png",
    subcategories: [],
  },
  {
    id: "famille-embrayage",
    title: "EMBRAYAGE ET BOÎTE DE VITESSE",
    image: "/images/embrayage.png",
    subcategories: [],
  },
  {
    id: "famille-clim",
    title: "PIÈCES THERMIQUES ET CLIMATISATION",
    image: "/images/climatisation.png",
    subcategories: [],
  },
  {
    id: "famille-demarrage",
    title: "DÉMARRAGE ET CHARGE",
    image: "/images/demarrage.png",
    subcategories: [],
  },
  {
    id: "famille-carrosserie",
    title: "CARROSSERIE",
    image: "/images/carrosserie.png",
    subcategories: [],
  },
  {
    id: "famille-habitacle",
    title: "PIÈCES HABITACLE",
    image: "/images/habitacle.png",
    subcategories: [],
  },
  {
    id: "famille-essuie",
    title: "BALAI D'ESSUIE-GLACE",
    image: "/images/essuie-glace.png",
    subcategories: [],
  },
  {
    id: "famille-phares",
    title: "OPTIQUES, PHARES ET AMPOULES",
    image: "/images/phares.png",
    subcategories: [],
  },
  {
    id: "famille-echappement",
    title: "ÉCHAPPEMENT",
    image: "/images/echappement.png",
    subcategories: [],
  },
];

export const useFamilles = (enabled: boolean = true, modelId?: string | number) => {
  const [familles, setFamilles] = useState<FamilleItem[]>(DEFAULT_FAMILLES);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastModelId, setLastModelId] = useState<string | number | undefined>(modelId);

  const loadFamilles = async () => {
    try {
      setLoading(true);
      // Pass modelId to getSectionContent if provided (for model-specific filtering)
      const section = await getSectionContent("famille_categories", modelId);

      if (section && section.content) {
        let content;
        try {
          content =
            typeof section.content === "string"
              ? JSON.parse(section.content)
              : section.content;
          
          if (content && typeof content === 'object') {
            if (Array.isArray(content)) {
              content = content;
            } else if (content.items && Array.isArray(content.items)) {
              content = content.items;
            } else {
              content = [];
            }
          } else {
            content = [];
          }
        } catch (e) {
          content = [];
        }

        if (Array.isArray(content) && content.length > 0) {
          const normalized = content
            .filter((item) => item && typeof item === "object")
            .map((item: Record<string, unknown>) => {
              const image =
                typeof item.image === "string" && item.image.trim()
                  ? item.image
                  : (typeof item.image_url === "string" ? item.image_url : "");
              return {
                ...item,
                image,
              } as FamilleItem;
            });
          setFamilles(normalized.length > 0 ? normalized : DEFAULT_FAMILLES);
        } else {
          setFamilles(DEFAULT_FAMILLES);
        }
      } else {
        setFamilles(DEFAULT_FAMILLES);
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('❌ useFamilles error:', error);
      setFamilles(DEFAULT_FAMILLES);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Reset hasLoaded if modelId changed (to force refetch with new modelId)
    if (lastModelId !== modelId) {
      setHasLoaded(false);
      setLastModelId(modelId);
    }

    // Only load once if already loaded (unless modelId changed, handled above)
    if (hasLoaded) {
      return;
    }

    loadFamilles();

    const handleUpdate = () => {
      setHasLoaded(false);
      loadFamilles();
    };

    window.addEventListener('famillesUpdated', handleUpdate);
    return () => window.removeEventListener('famillesUpdated', handleUpdate);
  }, [enabled, hasLoaded, modelId, lastModelId]);

  return { familles, loading };
};

