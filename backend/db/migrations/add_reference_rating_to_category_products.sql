-- ============================================
-- Add reference and rating columns to category_products
-- ============================================

-- Add reference column (TEXT, nullable, can contain one or multiple values as a single string)
ALTER TABLE category_products 
ADD COLUMN IF NOT EXISTS reference TEXT NULL;

-- Add rating column (INTEGER, nullable, 0 to 5)
ALTER TABLE category_products 
ADD COLUMN IF NOT EXISTS rating INTEGER NULL;

-- Add check constraint to ensure rating is between 0 and 5
ALTER TABLE category_products 
DROP CONSTRAINT IF EXISTS check_rating_range;

ALTER TABLE category_products 
ADD CONSTRAINT check_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- Verify columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'category_products'
    AND column_name = 'reference'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'category_products'
    AND column_name = 'rating'
  ) THEN
    RAISE NOTICE '✅ reference and rating columns added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add reference and rating columns';
  END IF;
END $$;

