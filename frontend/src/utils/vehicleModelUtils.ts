export interface VehicleModelLike {
  marque?: string | null;
  model?: string | null;
  [key: string]: any;
}

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const normalizeSeparators = (value: string) => {
  let next = normalizeWhitespace(value);
  next = next.replace(/\s*-\s*/g, " - ");
  next = next.replace(/\s*\/\s*/g, " / ");
  return normalizeWhitespace(next);
};

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const canonicalizeBrand = (raw: string) => {
  const trimmed = normalizeWhitespace(raw);
  const lower = trimmed.toLowerCase();
  if (!trimmed) return "";
  if (lower === "kia") return "Kia";
  if (lower === "hyundai") return "Hyundai";
  return trimmed;
};

export const buildVehicleModelKey = (entry: VehicleModelLike) => {
  const marqueKey = stripDiacritics(
    normalizeSeparators((entry.marque || "").toLowerCase())
  );
  const modelKey = stripDiacritics(
    normalizeSeparators((entry.model || "").toLowerCase())
  );
  if (!marqueKey && !modelKey) return "";
  return `${marqueKey}|${modelKey}`;
};

export const normalizeVehicleModelEntry = <T extends VehicleModelLike>(
  entry: T
): T => {
  const normalizedMarque = canonicalizeBrand(entry.marque || "");
  const normalizedModel = normalizeSeparators(entry.model || "");
  return {
    ...entry,
    marque: normalizedMarque,
    model: normalizedModel,
  };
};

export const dedupeVehicleModelsClient = <T extends VehicleModelLike>(
  list: T[]
): T[] => {
  const seen = new Map<string, T>();
  for (const raw of list || []) {
    if (!raw) continue;
    const normalized = normalizeVehicleModelEntry(raw);
    const key = buildVehicleModelKey(normalized);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  }
  return Array.from(seen.values());
};
