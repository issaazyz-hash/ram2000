-- ============================================
-- Production Database Schema
-- PostgreSQL - Azyz E-commerce Platform
-- ============================================
-- This schema creates all tables with proper relations
-- Run via: node db/migrate.js
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ============================================
-- PRODUCTS TABLE (with foreign keys)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  brand_id INTEGER,
  category_id INTEGER,
  sku TEXT UNIQUE,
  original_price NUMERIC(12,2),
  discount TEXT,
  main_image TEXT,
  image TEXT,
  all_images TEXT[],
  promo_percent INTEGER,
  promo_price NUMERIC(10,3),
  product_references TEXT[] DEFAULT '{}',
  loyalty_points INTEGER DEFAULT 0,
  has_preview BOOLEAN DEFAULT false,
  has_options BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================
-- VEHICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_price NUMERIC(12,2) DEFAULT 0 NOT NULL,
  product_references TEXT[] DEFAULT '{}',
  product_snapshot JSONB DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1,
  customer_nom TEXT NOT NULL,
  customer_prenom TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_wilaya TEXT NOT NULL,
  customer_delegation TEXT NOT NULL,
  promo_id INTEGER NULL,
  origin VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  promo_slug TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- SEARCH OPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS search_options (
  id SERIAL PRIMARY KEY,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_options_field ON search_options(field);

-- ============================================
-- SUBCATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  family_name TEXT NOT NULL DEFAULT 'Uncategorized',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT subcategories_name_family_unique UNIQUE(name, family_name)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);
CREATE INDEX IF NOT EXISTS idx_subcategories_family ON subcategories(family_name);

-- ============================================
-- DASHBOARD PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_products (
  id SERIAL PRIMARY KEY,
  acha_id INTEGER NOT NULL,
  sub_id TEXT,
  name TEXT,
  price NUMERIC(12,3),
  quantity INTEGER DEFAULT 0,
  first_image TEXT,
  reference TEXT,
  promotion_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_products_acha_id ON dashboard_products(acha_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_products_sub_id ON dashboard_products(sub_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_products_created_at ON dashboard_products(created_at DESC);

-- ============================================
-- CATEGORY PRODUCTS TABLE (Acha2 + equivalents)
-- ============================================
-- NOTE: Historically this table was created in initTables.js. We also define it here so
-- fresh environments get the complete schema from migrations alone.
CREATE TABLE IF NOT EXISTS category_products (
  id SERIAL PRIMARY KEY,
  category_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  image TEXT,
  reference TEXT,
  rating INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_products_slug ON category_products(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_products_product_slug ON category_products(slug);
CREATE INDEX IF NOT EXISTS idx_category_products_reference ON category_products(reference);

-- ============================================
-- OFFRE HISTORIQUE (promo-only mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS offre_historique_items (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES category_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_offre_historique_items_created_at
  ON offre_historique_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offre_historique_items_product_id
  ON offre_historique_items(product_id);

-- offre_historique_promos: promo-only, does NOT touch admin_dashboard_products
CREATE TABLE IF NOT EXISTS offre_historique_promos (
  id SERIAL PRIMARY KEY,
  promo_id INTEGER NOT NULL,
  slug TEXT,
  name TEXT,
  reference TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(promo_id)
);
CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_created_at
  ON offre_historique_promos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_promo_id
  ON offre_historique_promos(promo_id);

-- ============================================
-- ADMIN LOGS TABLE (for tracking admin actions)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_admin_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_user_id ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON admin_logs(resource_type, resource_id);

-- ============================================
-- LEGACY TABLES (for backward compatibility)
-- ============================================

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
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_vehicle_model_parts_model FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE
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

-- Section content table
CREATE TABLE IF NOT EXISTS section_content (
  id SERIAL PRIMARY KEY,
  section_type TEXT UNIQUE NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_content_type ON section_content(section_type);

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

-- Initialize default settings
INSERT INTO global_settings (setting_key, setting_value)
VALUES ('modele_list', '["Kia Picanto", "Kia Rio", "Kia Sportage", "Hyundai i10", "Hyundai i20", "Peugeot 208", "Peugeot 308", "Renault Clio", "Renault Megane", "Volkswagen Golf", "Volkswagen Polo"]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Seed default section content
INSERT INTO section_content (section_type, title, content)
VALUES 
  ('famille_categories', 'Catégories de Famille', '{"items": []}'::jsonb),
  ('promotions', 'Promotions', '{"items": []}'::jsonb),
  ('hero', 'Hero Section', '{"title": "", "subtitle": "", "images": []}'::jsonb),
  ('brand_images', 'Brand Images', '{"title": "", "images": []}'::jsonb)
ON CONFLICT (section_type) DO NOTHING;

-- ============================================
-- CAT2 CARDS (Huile sub-cards: full persistence for Ajouter une carte)
-- ============================================
CREATE TABLE IF NOT EXISTS cat2_cards (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  reference TEXT,
  rating INTEGER,
  stock_disponible INTEGER DEFAULT 0,
  seuil_alerte INTEGER DEFAULT 0,
  image TEXT,
  prix_achat_brut NUMERIC(12,3),
  remise_achat_percent NUMERIC(8,2),
  net_achat_htva NUMERIC(12,3),
  tva_percent NUMERIC(6,2) DEFAULT 19,
  net_achat_ttc NUMERIC(12,3),
  marge_percent NUMERIC(8,2),
  prix_neveux NUMERIC(12,3),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat2_cards_parent_id ON cat2_cards(parent_id);
CREATE INDEX IF NOT EXISTS idx_cat2_cards_slug ON cat2_cards(slug);

