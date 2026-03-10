-- Add stock_disponible and seuil_alerte to category_products
-- Stock disponible: current inventory (INT, default 0)
-- Seuil d'alerte: warning threshold - when stock <= seuil, show low-stock warning

ALTER TABLE category_products ADD COLUMN IF NOT EXISTS stock_disponible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE category_products ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN category_products.stock_disponible IS 'Current inventory. Product is out of stock when <= 0.';
COMMENT ON COLUMN category_products.seuil_alerte IS 'Warning threshold. Low stock when stock_disponible <= seuil_alerte AND stock_disponible > 0.';
