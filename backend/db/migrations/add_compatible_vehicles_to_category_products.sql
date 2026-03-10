-- Add compatible_vehicles column to category_products
-- Stores [{ brand: "Kia", model: "Kia Rio 2018_2025" }, ...] for acha2 Marque/Modèle filtering
-- NULL or empty means product is global (show all brands/models on acha2)

ALTER TABLE category_products 
ADD COLUMN IF NOT EXISTS compatible_vehicles JSONB NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN category_products.compatible_vehicles IS 
'Array of {brand, model} for compatible vehicles. Used to filter Marque/Modèle dropdowns on acha2. NULL or [] means show all.';
