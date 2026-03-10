/**
 * Shared slug helper for category/subcategory URLs.
 * Must match FamilleSection and CAT navigation logic.
 */
export const createSlug = (text: string): string => {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};
