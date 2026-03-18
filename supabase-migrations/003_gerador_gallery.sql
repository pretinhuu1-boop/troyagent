-- Migration 003: Gerador AI Gallery
-- Stores AI-generated content (images, videos, tools output)

CREATE TABLE IF NOT EXISTS gerador_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'image' CHECK (mode IN ('image', 'video', 'tools')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  result_url TEXT,
  result_base64 TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing by date
CREATE INDEX IF NOT EXISTS idx_gerador_gallery_created ON gerador_gallery (created_at DESC);

-- RLS: allow all for now (service_role key)
ALTER TABLE gerador_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON gerador_gallery FOR ALL USING (true);
