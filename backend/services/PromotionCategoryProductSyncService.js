const pool = require("../db/pool");

function safeString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function generateSlug(name) {
  return safeString(name)
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

function normalizeReferenceString(reference) {
  // Accept commas/semicolons/newlines/pipes and normalize to comma-separated tokens
  const raw = safeString(reference).trim();
  if (!raw) return null;
  const tokens = raw
    .replace(/[;\n|]+/g, ",")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;
  // De-dupe while preserving order (case-insensitive)
  const seen = new Set();
  const uniq = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(t);
  }
  return uniq.join(", ");
}

function extractPromotionsArray(sectionContent) {
  if (Array.isArray(sectionContent)) return sectionContent;
  if (sectionContent && typeof sectionContent === "object") {
    if (Array.isArray(sectionContent.items)) return sectionContent.items;
    if (Array.isArray(sectionContent.promotions)) return sectionContent.promotions;
    if (Array.isArray(sectionContent.content)) return sectionContent.content;
  }
  return [];
}

function extractPromotionFields(promo) {
  const title =
    safeString(promo?.title || promo?.name || promo?.product_name || "").trim() || null;

  const slugCandidate =
    promo?.product_slug || promo?.productSlug || promo?.slug || promo?.productSlug;
  const slug =
    safeString(slugCandidate).trim() || (title ? generateSlug(title) : "");

  const image = safeString(promo?.image || "").trim() || null;

  const referenceRaw =
    promo?.reference || promo?.ref || promo?.product_ref || promo?.productRef || null;
  const reference = normalizeReferenceString(referenceRaw);

  return {
    title,
    slug: safeString(slug).trim() || null,
    image,
    reference,
  };
}

async function ensureCategoryProductsColumns() {
  // Make sure required columns exist (older installs may miss these).
  await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`);
  await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS reference TEXT NULL`);
  await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS rating INTEGER NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_category_products_product_slug ON category_products(slug)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_category_products_reference ON category_products(reference)`);
  // Ensure slug has a unique constraint/index so we can safely UPSERT by slug.
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS category_products_slug_unique
      ON category_products(slug)
    `);
  } catch (e) {
    // If duplicates exist, unique index creation can fail; we still proceed with a manual upsert.
  }
}

class PromotionCategoryProductSyncService {
  /**
   * Sync promotions section_content -> category_products so equivalents can match.
   *
   * - Upserts rows by slug into category_products with category_slug='promotions'
   * - Updates name/image/reference when slug already exists
   * - Optionally cleans up removed promotions (category_slug='promotions' only)
   */
  static async syncPromotionsSectionContent(sectionContent) {
    const promotions = extractPromotionsArray(sectionContent);
    if (!Array.isArray(promotions) || promotions.length === 0) return { upserted: 0, cleaned: 0 };

    await ensureCategoryProductsColumns();

    const slugsToKeep = [];
    let upserted = 0;

    for (const promo of promotions) {
      const { title, slug, image, reference } = extractPromotionFields(promo);
      if (!title || !slug) continue;

      slugsToKeep.push(slug);

      // Prefer ON CONFLICT (slug) if unique index exists; if it doesn't, fall back to SELECT+UPDATE/INSERT.
      try {
        await pool.query(
          `
          INSERT INTO category_products (category_slug, name, slug, image, reference, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            reference = EXCLUDED.reference,
            updated_at = NOW()
          `,
          ["promotions", title, slug, image, reference]
        );
        upserted += 1;
      } catch (e) {
        // Fallback path if ON CONFLICT isn't available (no unique constraint on slug)
        const existing = await pool.query(`SELECT id FROM category_products WHERE slug = $1 LIMIT 1`, [slug]);
        if (existing.rows.length > 0) {
          await pool.query(
            `
            UPDATE category_products
            SET name = $1, image = $2, reference = $3, updated_at = NOW()
            WHERE slug = $4
            `,
            [title, image, reference, slug]
          );
          upserted += 1;
        } else {
          await pool.query(
            `
            INSERT INTO category_products (category_slug, name, slug, image, reference, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `,
            ["promotions", title, slug, image, reference]
          );
          upserted += 1;
        }
      }
    }

    // Cleanup: only remove rows created for promotions category that are no longer present
    let cleaned = 0;
    try {
      if (slugsToKeep.length === 0) {
        const del = await pool.query(`DELETE FROM category_products WHERE category_slug = $1`, ["promotions"]);
        cleaned = del.rowCount || 0;
      } else {
        const del = await pool.query(
          `
          DELETE FROM category_products
          WHERE category_slug = $1
            AND slug IS NOT NULL
            AND slug <> ''
            AND NOT (slug = ANY($2::text[]))
          `,
          ["promotions", slugsToKeep]
        );
        cleaned = del.rowCount || 0;
      }
    } catch (e) {
      // Non-fatal: cleanup failures should not break saving promotions
    }

    return { upserted, cleaned };
  }
}

module.exports = PromotionCategoryProductSyncService;

