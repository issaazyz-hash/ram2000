/**
 * Vehicle Model UI Mapping
 * Maps normalized model names to their display titles and image paths
 * Used by KiaCars and HyundaiCars pages to display models fetched from the database
 */

// Import Kia images as module assets
import kiaRio2010 from "@/assets/kia/kia rio 2010.jpg";
import kiaRio2018_2025 from "@/assets/kia/kia rio 2018_2025.jpg";
import kiaPicanto from "@/assets/kia/kia picanto.jpg";
import kiaPicantoGTLine from "@/assets/kia/kia picanto GT Line.jpg";
import kiaSeltos from "@/assets/kia/kia seltos.jpg";
import kiaSportage from "@/assets/kia/kia sportage.jpg";
import kiaCerato from "@/assets/kia/kia Cerato.jpg";
import kiaSorento from "@/assets/kia/kia sorento.jpg";
import kiaRio2012_2018 from "@/assets/kia/kia Rio 2012_2018.jpg";
import kiaPicanto2010 from "@/assets/kia/kia picanto 2010.jpg";
import kiaPicanto2012_2016 from "@/assets/kia/kia picanto 2012_2016.jpg";
import kiaCerato2010 from "@/assets/kia/kia cerato 2010.jpg";
import kiaSportage2012_2015 from "@/assets/kia/kia SPORTAGE 2012_20015.jpg";

/**
 * Normalize a model name for consistent matching
 * - trim whitespace
 * - convert to lowercase
 */
export const normalizeModelName = (name: string): string => {
  return name.trim().toLowerCase();
};

/**
 * UI mapping for Kia models
 * Key: normalized model name (lowercase, trimmed)
 * Value: { title: display title, image: imported image module }
 */
export const kiaModelMapping: Record<string, { title: string; image: string }> = {
  "kia rio 2010": { title: "kia rio 2010", image: kiaRio2010 },
  "kia rio 2018_2025": { title: "kia rio 2018_2025", image: kiaRio2018_2025 },
  "kia picanto": { title: "kia picanto", image: kiaPicanto },
  "kia picanto gt line": { title: "kia picanto GT Line", image: kiaPicantoGTLine },
  "kia seltos": { title: "kia seltos", image: kiaSeltos },
  "kia sportage": { title: "kia sportage", image: kiaSportage },
  "kia cerato": { title: "kia Cerato", image: kiaCerato },
  "kia sorento": { title: "kia sorento", image: kiaSorento },
  "kia rio 2012_2018": { title: "kia Rio 2012_2018", image: kiaRio2012_2018 },
  "kia picanto 2010": { title: "kia picanto 2010", image: kiaPicanto2010 },
  "kia picanto 2012_2016": { title: "kia picanto 2012_2016", image: kiaPicanto2012_2016 },
  "kia cerato 2010": { title: "kia cerato 2010", image: kiaCerato2010 },
  "kia sportage 2012_20015": { title: "kia SPORTAGE 2012_20015", image: kiaSportage2012_2015 },
  // Handle duplicate "kia Seltos" (capital S) - use same image as lowercase version
  "kia seltos": { title: "kia Seltos", image: kiaSeltos },
};

/**
 * UI mapping for Hyundai models
 * Key: normalized model name (lowercase, trimmed)
 * Value: { title: display title, image: public path }
 * Note: Hyundai images are in public/hyundai/ directory
 */
export const hyundaiModelMapping: Record<string, { title: string; image: string }> = {
  "hyundai i10": { title: "Hyundai I10", image: "/hyundai/Hyundai I10.jpg" },
  "hyundai gran i10 2012_2018": { title: "Hyundai GRAN I10 2012_2018", image: "/hyundai/Hyundai GRAN I10 2012_2018.jpg" },
  "hyundai i20": { title: "Hyundai i20", image: "/hyundai/Hyundai i20.jpg" },
  "hyundai ix 35": { title: "Hyundai IX 35", image: "/hyundai/Hyundai IX 35.jpg" },
  "hyundai grand i10 2018_2022": { title: "Hyundai GRAND I10 2018_2022", image: "/hyundai/Hyundai GRAND I10 2018_2022.jpg" },
  "hyundai i20 2014": { title: "Hyundai i20 2014", image: "/hyundai/Hyundai i20 2014.jpg" },
  "hyundai i20 2015_2019": { title: "Hyundai i20 2015_2019", image: "/hyundai/Hyundai i20 2015_2019.jpg" },
  "hyundai grand i10": { title: "Hyundai grand i10", image: "/hyundai/Hyundai grand i10.jpg" },
  "hyundai grand i10sedan": { title: "Hyundai grand i10sedan", image: "/hyundai/Hyundai grand i10sedan.jpg" },
  "hyundai i30 fastback": { title: "Hyundai i30 fastback", image: "/hyundai/Hyundai i30 fastback.jpg" },
  "hyundai creta": { title: "Hyundai creta", image: "/hyundai/Hyundai creta.jpg" },
  "hyundai accent": { title: "Hyundai Accent", image: "/hyundai/Hyundai Accent.jpg" },
  "hyundai elantra": { title: "Hyundai elantra", image: "/hyundai/Hyundai elantra.jpg" },
  "hyundai veloster": { title: "Hyundai veloster", image: "/hyundai/Hyundai veloster.jpg" },
  "hyundai getz": { title: "Hyundai Getz", image: "/hyundai/Hyundai Getz.jpg" },
  "hyundai atos": { title: "Hyundai atos", image: "/hyundai/Hyundai atos.jpg" },
  "hyundai tucson": { title: "Hyundai tucson", image: "/hyundai/Hyundai tucson.jpg" },
  "hyundai santa fe": { title: "Hyundai santa fe", image: "/hyundai/Hyundai santa fe.jpg" },
  "hyundai h1": { title: "Hyundai h1", image: "/hyundai/Hyundai h1.jpg" },
  "hyundai h100": { title: "Hyundai h100", image: "/hyundai/Hyundai h100.jpg" },
  "hyundai porter": { title: "Hyundai porter", image: "/hyundai/Hyundai porter.jpg" },
  "hyundai i30": { title: "Hyundai i30", image: "/hyundai/Hyundai i30.jpg" },
};

/**
 * Get UI mapping for a model by normalized name
 * Returns default values if model not found in mapping
 */
export const getModelUIMapping = (
  normalizedName: string,
  marque: "Kia" | "Hyundai"
): { title: string; image: string } => {
  const mapping = marque === "Kia" ? kiaModelMapping : hyundaiModelMapping;
  const mapped = mapping[normalizedName];
  
  if (mapped) {
    return mapped;
  }
  
  // Default: use the original model name as title and placeholder image
  return {
    title: normalizedName,
    image: "/placeholder.svg",
  };
};

