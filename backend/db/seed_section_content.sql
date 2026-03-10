-- Seed default section content data
-- Run this after migrations to ensure frontend doesn't crash on missing data

INSERT INTO section_content (section_type, title, content)
VALUES 
  ('famille_categories', 'Catégories de Famille', '{"items": []}'::jsonb),
  ('promotions', 'Promotions', '{"items": []}'::jsonb)
ON CONFLICT (section_type) DO NOTHING;

