-- ============================================
-- Database Schema - Single Source of Truth
-- ============================================
-- This file contains ALL table definitions
-- Run via: node db/migrate.js
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Car brands table
CREATE TABLE IF NOT EXISTS car_brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Search options table
CREATE TABLE IF NOT EXISTS search_options (
  id SERIAL PRIMARY KEY,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC,
  original_price NUMERIC,
  discount TEXT,
  main_image TEXT,
  all_images TEXT[],
  brand TEXT,
  sku TEXT,
  category TEXT,
  loyalty_points INTEGER DEFAULT 0,
  has_preview BOOLEAN DEFAULT false,
  has_options BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle models table
CREATE TABLE IF NOT EXISTS vehicle_models (
  id SERIAL PRIMARY KEY,
  marque VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  description TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint on (marque, model) to prevent duplicates (case-insensitive)
-- Added via migration: add_unique_constraint_vehicle_models.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_marque_model_unique
ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)));

-- Vehicle model parts table
CREATE TABLE IF NOT EXISTS vehicle_model_parts (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  reference TEXT,
  description TEXT,
  price NUMERIC(10,2),
  image_url TEXT,
  category TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Acha products table
CREATE TABLE IF NOT EXISTS acha_products (
  id SERIAL PRIMARY KEY,
  sub_id TEXT UNIQUE NOT NULL,
  name TEXT,
  brand_name TEXT,
  model_name TEXT,
  description TEXT,
  price NUMERIC(12,3) DEFAULT 0.000,
  images TEXT[],
  quantity INTEGER DEFAULT 0,
  product_references TEXT[] DEFAULT '{}',
  promotion_percentage NUMERIC DEFAULT 0,
  promotion_price NUMERIC DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hero content table
CREATE TABLE IF NOT EXISTS hero_content (
  id SERIAL PRIMARY KEY,
  title TEXT DEFAULT 'Un large choix de pièces auto',
  subtitle TEXT DEFAULT 'Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.',
  button_text TEXT DEFAULT 'Découvrir le catalogue',
  button_link TEXT DEFAULT '/catalogue',
  images TEXT[] DEFAULT ARRAY['/k.png', '/k2.jpg', '/k3.png'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Brand images table
CREATE TABLE IF NOT EXISTS brand_images (
  id SERIAL PRIMARY KEY,
  title TEXT DEFAULT 'NOS MARQUES DISPONIBLES',
  images TEXT[] DEFAULT ARRAY['/pp.jpg'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard products table
CREATE TABLE IF NOT EXISTS dashboard_products (
  id SERIAL PRIMARY KEY,
  product_id TEXT,
  name TEXT,
  image TEXT,
  reference TEXT,
  price NUMERIC(12,3),
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Section content table
CREATE TABLE IF NOT EXISTS section_content (
  id SERIAL PRIMARY KEY,
  section_type TEXT UNIQUE NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_price NUMERIC(12,3) DEFAULT 0,
  product_references TEXT[] DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  customer_nom TEXT NOT NULL,
  customer_prenom TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_wilaya TEXT NOT NULL,
  customer_delegation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  family_name TEXT NOT NULL DEFAULT 'Uncategorized',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT subcategories_name_family_unique UNIQUE(name, family_name)
);

-- Familles table
CREATE TABLE IF NOT EXISTS familles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT,
  subcategories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_familles_id ON familles(id);

-- Vehicle model familles pivot table (for model-specific filtering)
CREATE TABLE IF NOT EXISTS vehicle_model_familles (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  famille_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(model_id, famille_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_model_id ON vehicle_model_familles(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_famille_id ON vehicle_model_familles(famille_id);

-- Category product vehicle models pivot table (for model-specific product filtering)
CREATE TABLE IF NOT EXISTS category_product_vehicle_models (
  product_id INTEGER NOT NULL REFERENCES category_products(id) ON DELETE CASCADE,
  model_id INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(product_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_category_product_vehicle_models_product_id 
  ON category_product_vehicle_models(product_id);
CREATE INDEX IF NOT EXISTS idx_category_product_vehicle_models_model_id 
  ON category_product_vehicle_models(model_id);

-- Acha2 products table
CREATE TABLE IF NOT EXISTS acha2_products (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  quantity2 INTEGER DEFAULT 0,
  price2 NUMERIC DEFAULT 0,
  description2 TEXT,
  references2 JSONB DEFAULT '[]'::jsonb,
  images2 JSONB DEFAULT '[]'::jsonb,
  modele2 JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Global settings table
CREATE TABLE IF NOT EXISTS global_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize default modele_list if not exists
INSERT INTO global_settings (setting_key, setting_value)
VALUES ('modele_list', '["Kia Picanto", "Kia Rio", "Kia Sportage", "Hyundai i10", "Hyundai i20", "Peugeot 208", "Peugeot 308", "Renault Clio", "Renault Megane", "Volkswagen Golf", "Volkswagen Polo"]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

