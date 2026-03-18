-- TAURA Database Extensions
-- Run this in your Supabase SQL editor to add the customer_insights table

-- Customer Insights table (for multi-agent memory sharing)
CREATE TABLE IF NOT EXISTS customer_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('preference', 'objection', 'interest', 'follow_up')),
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by customer
CREATE INDEX IF NOT EXISTS idx_customer_insights_customer_id ON customer_insights(customer_id);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_customer_insights_type ON customer_insights(insight_type);

-- Add sales pipeline stage to customers (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'stage'
  ) THEN
    ALTER TABLE customers ADD COLUMN stage TEXT DEFAULT 'lead'
      CHECK (stage IN ('lead', 'prospect', 'negotiation', 'customer', 'lost'));
  END IF;
END $$;

-- RLS policies for customer_insights (enable row-level security)
ALTER TABLE customer_insights ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on customer_insights"
  ON customer_insights
  FOR ALL
  USING (true)
  WITH CHECK (true);
