/**
 * A6: Request body validators for TAURA API endpoints.
 * Uses Zod schemas to validate POST/PATCH bodies before writing to Supabase.
 */
import { z } from "zod";

// ── Shared ──────────────────────────────────────────────────
const uuid = z.string().uuid().optional();
const isoDate = z.string().datetime({ offset: true }).optional();

// ── Products ────────────────────────────────────────────────
export const productCreate = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  description: z.string().max(2000).optional().default(""),
  price_brl: z.number().min(0).optional().default(0),
  cost_usd: z.number().min(0).optional().default(0),
  category: z.string().max(50).optional().default("peptide"),
  format: z.string().max(50).optional().default("vial"),
  concentration: z.string().max(50).optional().default(""),
  brand: z.string().max(100).optional().default(""),
  stock_qty: z.number().int().min(0).optional().default(0),
  warehouse: z.string().max(10).optional().default("PY"),
  purity: z.string().max(20).optional().default("99%+"),
  coa_url: z.string().url().optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
  visible_to_customer: z.boolean().optional().default(true),
}).strict();

export const productUpdate = productCreate.partial();

// ── Customers ───────────────────────────────────────────────
export const customerCreate = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  type: z.enum(["b2c", "b2b"]).optional().default("b2c"),
  company_name: z.string().max(200).optional(),
  cpf_cnpj: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  notes: z.string().max(2000).optional().default(""),
  stage: z.enum(["lead", "prospect", "negotiation", "customer", "lost"]).optional().default("lead"),
}).strict();

export const customerUpdate = customerCreate.partial();

// ── Orders ──────────────────────────────────────────────────
export const orderCreate = z.object({
  customer_id: z.string().uuid().optional(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]).optional().default("pending"),
  total: z.number().min(0).optional().default(0),
  notes: z.string().max(2000).optional().default(""),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
  })).optional(),
}).strict();

export const orderUpdate = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

// ── Suppliers ───────────────────────────────────────────────
export const supplierCreate = z.object({
  name: z.string().min(1).max(200),
  contact_name: z.string().max(200).optional().default(""),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  country: z.string().max(100).optional().default(""),
  website: z.string().url().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().default(""),
}).strict();

export const supplierUpdate = supplierCreate.partial();

// ── Articles ────────────────────────────────────────────────
export const articleCreate = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200),
  category: z.string().max(50).optional().default("peptideos"),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  body_html: z.string().max(100_000).optional().default(""),
  meta_description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).optional().default([]),
  author: z.string().max(100).optional(),
  published_at: isoDate,
}).strict();

export const articleUpdate = articleCreate.partial();

// ── Missions ────────────────────────────────────────────────
export const missionCreate = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["draft", "discussing", "approved", "executing", "completed", "cancelled"]).optional().default("draft"),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  created_by: z.string().max(100).optional(),
  assigned_coordinator: z.string().max(100).optional(),
  deadline: isoDate,
  tags: z.array(z.string().max(50)).optional().default([]),
}).strict();

export const missionUpdate = missionCreate.partial();

// ── Mission Tasks ───────────────────────────────────────────
export const missionTaskCreate = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  assigned_agent: z.string().max(100).optional(),
  status: z.enum(["backlog", "in-progress", "review", "completed", "blocked"]).optional().default("backlog"),
  depends_on: z.array(z.string().uuid()).optional().default([]),
}).strict();

export const missionTaskUpdate = missionTaskCreate.partial();

// ── Mission Comments ────────────────────────────────────────
export const missionCommentCreate = z.object({
  agent_id: z.string().min(1).max(100),
  agent_name: z.string().max(100).optional(),
  agent_emoji: z.string().max(10).optional(),
  content: z.string().min(1).max(10_000),
  comment_type: z.enum(["analysis", "proposal", "question", "approval", "execution-update"]).optional().default("analysis"),
}).strict();

// ── Campaigns ───────────────────────────────────────────────
export const campaignCreate = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional().default("draft"),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  platforms: z.array(z.string().max(30)).optional().default([]),
}).strict();

export const campaignUpdate = campaignCreate.partial();

// ── Scheduled Posts ─────────────────────────────────────────
export const scheduledPostCreate = z.object({
  campaign_id: z.string().uuid().optional(),
  platform: z.string().min(1).max(30),
  content: z.string().min(1).max(10_000),
  media_url: z.string().url().max(2000).optional().or(z.literal("")),
  scheduled_for: z.string().min(1),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional().default("draft"),
}).strict();

export const scheduledPostUpdate = scheduledPostCreate.partial();

// ── Social Accounts ─────────────────────────────────────────
export const socialAccountCreate = z.object({
  platform: z.string().min(1).max(30),
  account_name: z.string().min(1).max(200),
  account_id: z.string().max(200).optional(),
  status: z.enum(["connected", "disconnected", "expired"]).optional().default("disconnected"),
  access_token: z.string().max(2000).optional(),
  refresh_token: z.string().max(2000).optional(),
  token_expires_at: isoDate,
}).strict();

// ── Content Calendar ────────────────────────────────────────
export const contentCalendarCreate = z.object({
  title: z.string().min(1).max(300),
  article_id: z.string().uuid().optional(),
  scheduled_date: z.string().min(1),
  status: z.enum(["planned", "writing", "review", "published"]).optional().default("planned"),
  assigned_agent: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export const contentCalendarUpdate = contentCalendarCreate.partial();

// ── Conversations ───────────────────────────────────────────
export const conversationUpdate = z.object({
  status: z.enum(["active", "closed"]).optional(),
}).strict();

// ── Gerador Gallery ─────────────────────────────────────────
export const geradorGalleryCreate = z.object({
  prompt: z.string().max(5000).optional().default(""),
  mode: z.enum(["image", "video", "tools"]).optional(),
  status: z.enum(["pending", "completed", "failed"]).optional().default("pending"),
  result_url: z.string().url().max(2000).optional().or(z.literal("")),
  result_base64: z.string().max(10_000_000).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
}).strict();

// ── Validator helper ────────────────────────────────────────
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: string,
): { ok: true; data: T } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Validation failed: ${issues}` };
  }
  return { ok: true, data: result.data };
}
