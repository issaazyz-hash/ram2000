-- Add prix_neveux column to category_products (final calculated price from Tarif form)
-- Used as displayed price in "famille des pièces" (category product cards, acha2)

ALTER TABLE category_products ADD COLUMN IF NOT EXISTS prix_neveux NUMERIC(12,3) NULL;

COMMENT ON COLUMN category_products.prix_neveux IS 'Final price from Tarif (Prix neveux). Displayed in famille des pièces.';
