-- =============================================================================
-- Cleanup script: Remove orphan offre-historique entries
-- Orphan = row whose promo no longer exists in section_content (promotions)
-- SAFE: Only touches offre_historique_promos (and optionally offre_historique_items)
-- Does NOT touch admin_dashboard_products, category_products, or any product tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: PREVIEW - Rows that will be deleted (run first to verify)
-- -----------------------------------------------------------------------------

-- Preview orphans in offre_historique_promos (promo_id no longer in promotions)
SELECT o.id, o.promo_id, o.slug, o.name, o.created_at
FROM offre_historique_promos o
WHERE o.promo_id IS NOT NULL
AND o.promo_id NOT IN (
  SELECT (elem->>'id')::int
  FROM section_content sc,
       LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions'
             THEN sc.content->'promotions'
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items'
             THEN sc.content->'items'
           ELSE '[]'::jsonb
         END
       ) AS elem
  WHERE sc.section_type = 'promotions'
  AND elem->>'id' IS NOT NULL
  AND (elem->>'id') ~ '^\d+$'
);

-- Preview slug-orphans (promo_id NULL, slug not in any promotion) - if such rows exist
SELECT o.id, o.promo_id, o.slug, o.name, o.created_at
FROM offre_historique_promos o
WHERE o.promo_id IS NULL
AND o.slug IS NOT NULL
AND o.slug != ''
AND NOT EXISTS (
  SELECT 1
  FROM section_content sc,
       LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions'
             THEN sc.content->'promotions'
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items'
             THEN sc.content->'items'
           ELSE '[]'::jsonb
         END
       ) AS elem
  WHERE sc.section_type = 'promotions'
  AND (
    LOWER(COALESCE(elem->>'productSlug', elem->>'product_slug', elem->>'slug', '')) = LOWER(o.slug)
  )
);

-- -----------------------------------------------------------------------------
-- STEP 2: DELETE (run after preview confirms correct rows)
-- -----------------------------------------------------------------------------

BEGIN;

-- Delete promo_id orphans
DELETE FROM offre_historique_promos o
WHERE o.promo_id IS NOT NULL
AND o.promo_id NOT IN (
  SELECT (elem->>'id')::int
  FROM section_content sc,
       LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions'
             THEN sc.content->'promotions'
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items'
             THEN sc.content->'items'
           ELSE '[]'::jsonb
         END
       ) AS elem
  WHERE sc.section_type = 'promotions'
  AND elem->>'id' IS NOT NULL
  AND (elem->>'id') ~ '^\d+$'
);

-- Delete slug orphans (promo_id NULL only)
DELETE FROM offre_historique_promos o
WHERE o.promo_id IS NULL
AND o.slug IS NOT NULL
AND o.slug != ''
AND NOT EXISTS (
  SELECT 1
  FROM section_content sc,
       LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions'
             THEN sc.content->'promotions'
           WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items'
             THEN sc.content->'items'
           ELSE '[]'::jsonb
         END
       ) AS elem
  WHERE sc.section_type = 'promotions'
  AND (
    LOWER(COALESCE(elem->>'productSlug', elem->>'product_slug', elem->>'slug', '')) = LOWER(o.slug)
  )
);

COMMIT;
