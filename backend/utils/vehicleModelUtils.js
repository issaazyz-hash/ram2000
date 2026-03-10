/**
 * Vehicle model normalization + dedup helpers.
 *
 * Source of data:
 * - All compatibility lists (Cat pages "Compatibilité Véhicules", KiaCars, HyundaiCars, and acha2 selectors)
 *   read from the `vehicle_models` table through GET /api/vehicleModels (VehicleModelController.getAll).
 * - That endpoint previously returned raw rows, so if the table contained duplicates
 *   (same marque/model but different casing or spacing) the UI displayed duplicates.
 *
 * By normalizing and deduplicating at this layer we guarantee every downstream consumer
 * (Cat pages, kia/hyundai catalogues, admin compatibility picker, etc.) receives a unique list.
 */

const stripDiacritics = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeWhitespace = (value = '') =>
  value.replace(/\s+/g, ' ').trim();

const normalizeSeparators = (value = '') => {
  let next = value;
  // Normalize hyphen spacing (e.g., "2012-2015" vs "2012 - 2015")
  next = next.replace(/\s*-\s*/g, ' - ');
  // Normalize slash spacing (e.g., "GT/Line" vs "GT / Line")
  next = next.replace(/\s*\/\s*/g, ' / ');
  return normalizeWhitespace(next);
};

const canonicalizeBrand = (raw = '') => {
  const trimmed = normalizeWhitespace(raw);
  const lower = trimmed.toLowerCase();
  if (!trimmed) return '';
  if (lower === 'kia') return 'Kia';
  if (lower === 'hyundai') return 'Hyundai';
  // Title-case unknown brands while keeping acronyms (e.g., "GT") untouched.
  return trimmed
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

const normalizeModelDisplay = (raw = '') => normalizeSeparators(raw);

const buildVehicleKey = (entry = {}) => {
  const marqueKey = stripDiacritics(normalizeSeparators((entry.marque || '').toLowerCase()));
  const modelKey = stripDiacritics(normalizeSeparators((entry.model || '').toLowerCase()));
  if (!marqueKey && !modelKey) return '';
  return `${marqueKey}|${modelKey}`;
};

const normalizeVehicleEntry = (entry = {}) => ({
  ...entry,
  marque: canonicalizeBrand(entry.marque || ''),
  model: normalizeModelDisplay(entry.model || ''),
});

const dedupeVehicleModels = (list = []) => {
  const seen = new Map();
  for (const raw of list) {
    if (!raw) continue;
    const normalized = normalizeVehicleEntry(raw);
    const key = buildVehicleKey(normalized);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  }
  return Array.from(seen.values());
};

module.exports = {
  normalizeVehicleEntry,
  dedupeVehicleModels,
  buildVehicleKey,
};
