-- ════════════════════════════════════════════════════════════
-- TAURA Migration 000: Base Schema
-- Creates core tables referenced by all other migrations.
-- Run BEFORE 001_content_social_missions.sql
-- ════════════════════════════════════════════════════════════

-- ── CUSTOMERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT '',
  phone TEXT,
  email TEXT,
  type TEXT DEFAULT 'b2c' CHECK (type IN ('b2c', 'b2b')),
  company_name TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  notes TEXT DEFAULT '',
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'prospect', 'negotiation', 'customer', 'lost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- A2: UNIQUE constraint to prevent race-condition duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
  ON customers(phone) WHERE phone IS NOT NULL AND phone != '';

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);

-- ── SUPPLIERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT,
  phone TEXT,
  country TEXT DEFAULT '',
  website TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── PRODUCTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_brl NUMERIC DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'peptide',
  format TEXT DEFAULT 'vial',
  concentration TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  stock_qty INTEGER DEFAULT 0,
  warehouse TEXT DEFAULT 'PY',
  purity TEXT DEFAULT '99%+',
  coa_url TEXT,
  active BOOLEAN DEFAULT true,
  visible_to_customer BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products(sku) WHERE sku IS NOT NULL AND sku != '';

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- ── ORDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  total NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- ── ORDER ITEMS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ── CONVERSATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- A3: Partial unique to prevent duplicate active conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_active_unique
  ON conversations(customer_id, channel) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- ── MESSAGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ── Enable RLS ────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Service role bypass (gateway uses service_role key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'customers') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON customers FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'suppliers') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON suppliers FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'products') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON products FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'orders') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON orders FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'order_items') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON order_items FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'conversations') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON conversations FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'messages') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON messages FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;
