-- =============================================================================
-- Cleanup helper: remove duplicate vehicle models (same marque/model after normalization)
-- =============================================================================
-- Preview duplicates first. Normalization collapses internal whitespaces,
-- normalizes hyphen/slash spacing, and lowercases values.

WITH normalized AS (
  SELECT
    id,
    marque,
    model,
    LOWER(
      regexp_replace(
        regexp_replace(
          trim(marque),
          '\s+',
          ' ',
          'g'
        ),
        '\s*-\s*',
        ' - ',
        'g'
      )
    ) AS marque_key,
    LOWER(
      regexp_replace(
        regexp_replace(
          trim(model),
          '\s+',
          ' ',
          'g'
        ),
        '\s*-\s*',
        ' - ',
        'g'
      )
    ) AS model_key,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(
          regexp_replace(
            regexp_replace(
              trim(marque),
              '\s+',
              ' ',
              'g'
            ),
            '\s*-\s*',
            ' - ',
            'g'
          )
        ),
        LOWER(
          regexp_replace(
            regexp_replace(
              trim(model),
              '\s+',
              ' ',
              'g'
            ),
            '\s*-\s*',
            ' - ',
            'g'
          )
        )
      ORDER BY id
    ) AS rn
  FROM vehicle_models
)
SELECT id, marque, model, rn
FROM normalized
WHERE rn > 1
ORDER BY marque_key, model_key, id;

-- =============================================================================
-- Delete duplicates while keeping the first row (rn = 1)
-- =============================================================================
WITH normalized AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(
          regexp_replace(
            regexp_replace(
              trim(marque),
              '\s+',
              ' ',
              'g'
            ),
            '\s*-\s*',
            ' - ',
            'g'
          )
        ),
        LOWER(
          regexp_replace(
            regexp_replace(
              trim(model),
              '\s+',
              ' ',
              'g'
            ),
            '\s*-\s*',
            ' - ',
            'g'
          )
        )
      ORDER BY id
    ) AS rn
  FROM vehicle_models
)
DELETE FROM vehicle_models vm
USING normalized n
WHERE vm.id = n.id
  AND n.rn > 1;
