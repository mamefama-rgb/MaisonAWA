-- =============================================
-- SCHEMA E-COMMERCE COMPLET
-- =============================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UTILISATEURS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUITS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '{}',
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SESSIONS PANIER (pour invités)
CREATE TABLE IF NOT EXISTS cart_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

-- PANIER
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, product_id)
);

-- CODES PROMO
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- COMMANDES
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES cart_sessions(id) ON DELETE SET NULL,
  -- Infos client
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50) NOT NULL,
  -- Adresse livraison
  delivery_address TEXT NOT NULL,
  delivery_city VARCHAR(100),
  delivery_notes TEXT,
  -- Montants
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  -- Promo
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  promo_code VARCHAR(50),
  -- Statut
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_method VARCHAR(30) DEFAULT 'cash_on_delivery',
  -- Tracking
  tracking_code VARCHAR(50),
  estimated_delivery DATE,
  -- WhatsApp
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ARTICLES DE COMMANDE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- HISTORIQUE STATUTS COMMANDE
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AVIS PRODUITS
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(255),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- BANNIÈRES / SLIDER
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEX PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Admin par défaut (password: Admin@2024)
INSERT INTO users (email, password_hash, full_name, role) VALUES 
('admin@boutique.sn', '$2a$10$rOzJqXpHQm2Vx7dL9mK8COeKXJqX3rL8mG9P1nS5tJ6Y4dF7vN2oy', 'Administrateur', 'admin')
ON CONFLICT DO NOTHING;

-- Catégories initiales
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES 
('Sacs', 'sacs', 'Sacs à main, sacs de voyage, sacs de sport', '👜', 1),
('Parfums', 'parfums', 'Parfums de luxe et eaux de toilette', '🌸', 2),
('Habits', 'habits', 'Vêtements homme et femme', '👗', 3),
('Chaussures', 'chaussures', 'Chaussures élégantes et sportives', '👟', 4),
('Accessoires', 'accessoires', 'Bijoux, montres et accessoires de mode', '💍', 5)
ON CONFLICT DO NOTHING;

-- Codes promo initiaux
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at) VALUES
('BIENVENUE10', 'Réduction de 10% pour les nouveaux clients', 'percentage', 10, 0, 100, NOW() + INTERVAL '1 year'),
('LIVRAISON50', '50 FCFA de réduction sur la livraison', 'fixed', 50, 5000, 50, NOW() + INTERVAL '6 months'),
('PROMO20', '20% de réduction sur toute commande', 'percentage', 20, 10000, 30, NOW() + INTERVAL '3 months')
ON CONFLICT DO NOTHING;

-- Produits exemples
WITH cat_sacs AS (SELECT id FROM categories WHERE slug='sacs' LIMIT 1),
     cat_parfums AS (SELECT id FROM categories WHERE slug='parfums' LIMIT 1),
     cat_habits AS (SELECT id FROM categories WHERE slug='habits' LIMIT 1),
     cat_chaussures AS (SELECT id FROM categories WHERE slug='chaussures' LIMIT 1),
     cat_accessoires AS (SELECT id FROM categories WHERE slug='accessoires' LIMIT 1)
INSERT INTO products (category_id, name, slug, description, price, original_price, stock, images, is_featured, attributes) VALUES
((SELECT id FROM cat_sacs), 'Sac à Main Cuir Premium', 'sac-main-cuir-premium', 'Sac en cuir véritable, élégant et spacieux, idéal pour toutes occasions.', 35000, 45000, 15, '["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500"]', true, '{"couleur":"Noir","matière":"Cuir véritable","dimensions":"30x20x10 cm"}'),
((SELECT id FROM cat_sacs), 'Sac Bandoulière Tendance', 'sac-bandouliere-tendance', 'Sac bandoulière moderne et polyvalent pour un style urbain.', 18000, 22000, 20, '["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500"]', false, '{"couleur":"Marron","matière":"Similicuir"}'),
((SELECT id FROM cat_parfums), 'Parfum Floral Élégance', 'parfum-floral-elegance', 'Eau de parfum aux notes florales de rose et de jasmin, longue tenue 8-10h.', 28000, 35000, 25, '["https://images.unsplash.com/photo-1541643600914-78b084683702?w=500"]', true, '{"volume":"100ml","famille":"Florale","intensité":"Eau de Parfum"}'),
((SELECT id FROM cat_parfums), 'Parfum Oriental Mystère', 'parfum-oriental-mystere', 'Fragrance envoûtante aux notes d''oud et de vanille.', 42000, 55000, 12, '["https://images.unsplash.com/photo-1592945403407-9caf930b50c0?w=500"]', true, '{"volume":"75ml","famille":"Oriental","intensité":"Parfum"}'),
((SELECT id FROM cat_habits), 'Robe d''Été Légère', 'robe-ete-legere', 'Robe légère et colorée, parfaite pour les journées ensoleillées.', 12000, 16000, 30, '["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500"]', false, '{"tailles":"XS,S,M,L,XL","matière":"100% Coton"}'),
((SELECT id FROM cat_habits), 'Costume Homme Classique', 'costume-homme-classique', 'Costume 2 pièces pour homme, coupe moderne et élégante.', 65000, 80000, 8, '["https://images.unsplash.com/photo-1594938298603-c8148c4b4d06?w=500"]', true, '{"tailles":"38,40,42,44,46","matière":"Laine et Polyester"}'),
((SELECT id FROM cat_chaussures), 'Escarpins Femme Luxe', 'escarpins-femme-luxe', 'Escarpins élégants à talon, parfaits pour les grandes occasions.', 22000, 28000, 18, '["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500"]', true, '{"pointures":"36,37,38,39,40,41","talon":"8cm"}'),
((SELECT id FROM cat_chaussures), 'Sneakers Sport Premium', 'sneakers-sport-premium', 'Chaussures de sport confortables et stylées pour le quotidien.', 19000, 25000, 25, '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"]', false, '{"pointures":"38,39,40,41,42,43,44,45"}'),
((SELECT id FROM cat_accessoires), 'Montre Femme Dorée', 'montre-femme-doree', 'Montre élégante dorée avec bracelet en acier inoxydable.', 45000, 60000, 10, '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"]', true, '{"matière":"Acier inoxydable","cadran":"Analogique"}'),
((SELECT id FROM cat_accessoires), 'Collier Perles Naturelles', 'collier-perles-naturelles', 'Collier en perles naturelles, fait main, pour une touche d''élégance.', 8500, 12000, 35, '["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500"]', false, '{"matière":"Perles naturelles","longueur":"45cm"}')
ON CONFLICT DO NOTHING;
