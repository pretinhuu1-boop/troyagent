-- ════════════════════════════════════════════════════════════
-- TAURA Sprint 1 Migration: Content + Social + Missions
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- ── ARTICLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'peptideos',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  body_html TEXT DEFAULT '',
  meta_description TEXT,
  tags TEXT[] DEFAULT '{}',
  author TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- ── CONTENT CALENDAR ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'writing', 'review', 'published')),
  assigned_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar(scheduled_date);

-- ── SOCIAL ACCOUNTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'expired')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── CAMPAIGNS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE,
  platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── SCHEDULED POSTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_campaign ON scheduled_posts(campaign_id);

-- ── MISSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'discussing', 'approved', 'executing', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by TEXT,
  assigned_coordinator TEXT,
  deadline TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── MISSION COMMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  agent_emoji TEXT,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'analysis' CHECK (comment_type IN ('analysis', 'proposal', 'question', 'approval', 'execution-update')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_comments_mission ON mission_comments(mission_id);

-- ── MISSION TASKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'in-progress', 'review', 'completed', 'blocked')),
  depends_on UUID[] DEFAULT '{}',
  run_id TEXT,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mission_tasks_mission ON mission_tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_status ON mission_tasks(status);

-- ── Enable RLS (Row Level Security) ────────────────────────
-- For now, allow all access (since we auth at the gateway level)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_tasks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON content_calendar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON social_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON scheduled_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON mission_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON mission_tasks FOR ALL USING (true) WITH CHECK (true);
