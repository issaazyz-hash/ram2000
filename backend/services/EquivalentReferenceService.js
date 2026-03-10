/**
 * EquivalentReferenceService
 * Finds "equivalent" products by shared reference code(s) in category_products.reference.
 *
 * - Accepts a reference string that may contain multiple codes (comma-separated)
 * - Matches by token equality (case-insensitive, trimmed)
 * - Excludes current product by id and/or slug
 * - Returns lightweight product summaries for Acha2 UI
 */

const pool = require("../db/pool");

function normalizeReferenceTokens(refString) {
  if (!refString || typeof refString !== "string") return [];

  const tokens = refString
    .replace(/[;\n|]+/g, ",")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  // De-duplicate while preserving order
  const seen = new Set();
  const uniq = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq;
}

class EquivalentReferenceService {
  /**
   * @param {Object} params
   * @param {string} params.refString - current product reference string (may contain commas)
   * @param {number|null} params.excludeId - category_products.id to exclude
   * @param {string|null} params.excludeSlug - category_products.slug to exclude
   * @param {number} params.limit - max results
   */
  static async findEquivalents({ refString, excludeId = null, excludeSlug = null, limit = 20 }) {
    const tokens = normalizeReferenceTokens(refString);
    if (tokens.length === 0) return [];

    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const excludeIdInt =
      excludeId !== null && excludeId !== undefined && Number.isFinite(Number(excludeId))
        ? Number(excludeId)
        : null;
    const excludeSlugStr =
      excludeSlug && typeof excludeSlug === "string" && excludeSlug.trim().length > 0
        ? excludeSlug.trim()
        : null;

    // Exact token match against comma-separated cp.reference
    // Prefer prix_neveux (Tarif final price) over a2.price2 for displayed price (famille des pièces)
    const query = `
      SELECT DISTINCT
        cp.id,
        cp.name,
        cp.slug,
        cp.image,
        cp.reference,
        cp.rating,
        cp.prix_neveux,
        cp.stock_disponible,
        cp.seuil_alerte,
        a2.price2,
        a2.quantity2
      FROM category_products cp
      LEFT JOIN acha2_products a2 ON a2.name = cp.name
      WHERE cp.reference IS NOT NULL
        AND btrim(cp.reference) <> ''
        AND ( $2::int IS NULL OR cp.id <> $2 )
        AND ( $3::text IS NULL OR cp.slug <> $3 )
        AND EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(cp.reference, '[,;\\n|]+')) AS r(token)
          WHERE lower(btrim(r.token)) = ANY($1::text[])
        )
      ORDER BY cp.name ASC
      LIMIT ${safeLimit}
    `;

    try {
      const result = await pool.query(query, [tokens, excludeIdInt, excludeSlugStr]);
      return (result.rows || []).map((row) => {
        // Prefer prix_neveux (from Tarif form) over price2 (acha2_products)
        let prixNeveux = null;
        if (row.prix_neveux != null && row.prix_neveux !== '' && Number.isFinite(parseFloat(row.prix_neveux))) {
          prixNeveux = parseFloat(row.prix_neveux);
        }
        const price2Val = row.price2 !== null && row.price2 !== undefined ? Number(row.price2) : null;
        const price = (prixNeveux != null && Number.isFinite(prixNeveux)) ? prixNeveux : (Number.isFinite(price2Val) ? price2Val : null);
        const stockFromCp = row.stock_disponible != null ? parseInt(row.stock_disponible, 10) : null;
        const stockFromA2 = row.quantity2 !== null && row.quantity2 !== undefined ? Number(row.quantity2) : null;
        const stock = (stockFromCp != null && Number.isFinite(stockFromCp)) ? stockFromCp : (Number.isFinite(stockFromA2) ? stockFromA2 : null);
        const seuilAlerte = row.seuil_alerte != null ? parseInt(row.seuil_alerte, 10) : 0;
        const rating = row.rating !== null && row.rating !== undefined ? Number(row.rating) : null;

        return {
          id: row.id,
          name: row.name || "",
          slug: row.slug || "",
          image: row.image || null,
          reference: row.reference || null,
          price: Number.isFinite(price) ? price : null,
          prixNeveux: Number.isFinite(prixNeveux) ? prixNeveux : null,
          stock: Number.isFinite(stock) ? stock : null,
          stockDisponible: Number.isFinite(stockFromCp) ? stockFromCp : (Number.isFinite(stock) ? stock : null),
          seuilAlerte: Number.isFinite(seuilAlerte) ? seuilAlerte : 0,
          rating: Number.isFinite(rating) ? rating : null,
        };
      });
    } catch (error) {
      // If acha2_products join fails for any reason, fall back without join (price/stock will be null)
      try {
        const fallbackQuery = `
          SELECT DISTINCT
            cp.id,
            cp.name,
            cp.slug,
            cp.image,
            cp.reference,
            cp.rating,
            cp.prix_neveux,
            cp.stock_disponible,
            cp.seuil_alerte
          FROM category_products cp
          WHERE cp.reference IS NOT NULL
            AND btrim(cp.reference) <> ''
            AND ( $2::int IS NULL OR cp.id <> $2 )
            AND ( $3::text IS NULL OR cp.slug <> $3 )
            AND EXISTS (
              SELECT 1
              FROM unnest(regexp_split_to_array(cp.reference, '[,;\\n|]+')) AS r(token)
              WHERE lower(btrim(r.token)) = ANY($1::text[])
            )
          ORDER BY cp.name ASC
          LIMIT ${safeLimit}
        `;

        const result = await pool.query(fallbackQuery, [tokens, excludeIdInt, excludeSlugStr]);
        return (result.rows || []).map((row) => {
          let prixNeveux = null;
          if (row.prix_neveux != null && row.prix_neveux !== '' && Number.isFinite(parseFloat(row.prix_neveux))) {
            prixNeveux = parseFloat(row.prix_neveux);
          }
          const price = (prixNeveux != null && Number.isFinite(prixNeveux)) ? prixNeveux : null;
          const stockFromCp = row.stock_disponible != null ? parseInt(row.stock_disponible, 10) : null;
          const seuilAlerte = row.seuil_alerte != null ? parseInt(row.seuil_alerte, 10) : 0;
          const rating = row.rating !== null && row.rating !== undefined ? Number(row.rating) : null;
          return {
            id: row.id,
            name: row.name || "",
            slug: row.slug || "",
            image: row.image || null,
            reference: row.reference || null,
            price: Number.isFinite(price) ? price : null,
            prixNeveux: Number.isFinite(prixNeveux) ? prixNeveux : null,
            stock: Number.isFinite(stockFromCp) ? stockFromCp : null,
            stockDisponible: Number.isFinite(stockFromCp) ? stockFromCp : null,
            seuilAlerte: Number.isFinite(seuilAlerte) ? seuilAlerte : 0,
            rating: Number.isFinite(rating) ? rating : null,
          };
        });
      } catch (fallbackError) {
        console.error("❌ EquivalentReferenceService.findEquivalents error:", fallbackError);
        return [];
      }
    }
  }
}

module.exports = EquivalentReferenceService;

