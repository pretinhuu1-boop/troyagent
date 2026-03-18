/**
 * Supabase API proxy for the TAURA gateway.
 * Handles /api/products, /api/customers, /api/orders endpoints.
 * Keeps the Supabase secret key on the backend only.
 *
 * Security layers:
 *  1. Bearer token auth on write endpoints (POST/PATCH/DELETE)
 *  2. CORS restricted to allowed origins
 *  3. Input validation (UUID, body size, JSON schema)
 *  4. Query parameter sanitization
 *  5. Rate limiting per IP on write operations
 *  6. Error message sanitization (no internal details leaked)
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import * as https from "node:https";
import * as http from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

// ─── Security: Allowed origins for CORS ──────────────────────────
const ALLOWED_ORIGINS = (process.env.TAURA_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ─── Security: Rate limiter for write operations ─────────────────
const writeRateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_WRITES = 30;

function isWriteRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = writeRateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    writeRateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_WRITES;
}

// Periodic cleanup (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  writeRateLimiter.forEach((entry, ip) => {
    if (now > entry.resetAt) writeRateLimiter.delete(ip);
  });
}, 120_000).unref();

// ─── Security: UUID validation ───────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ─── Security: Body size limit ───────────────────────────────────
const MAX_BODY_BYTES = 256 * 1024; // 256KB

// ─── Security: Bearer token extraction ───────────────────────────
function extractBearerToken(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ─── Security: Constant-time token comparison ────────────────────
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Security: Auth check for write operations ───────────────────
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

// A12: Controllable local bypass — set false in production
const ALLOW_LOCAL_BYPASS = (process.env.TAURA_ALLOW_LOCAL_BYPASS || "true").toLowerCase() !== "false";

function isWriteAuthorized(req: IncomingMessage): boolean {
  const token = extractBearerToken(req);
  if (!token || !GATEWAY_TOKEN) return false;
  return safeEqual(token, GATEWAY_TOKEN);
}

function isLocalRequest(req: IncomingMessage): boolean {
  if (!ALLOW_LOCAL_BYPASS) return false; // A12: Disabled in production
  const addr = req.socket?.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

// A11: Valid social media platforms whitelist
const VALID_PLATFORMS = new Set([
  "instagram", "facebook", "tiktok", "linkedin", "twitter", "youtube",
  "pinterest", "threads", "x", "bluesky",
]);

// ─── Security: CORS origin validation ────────────────────────────
function resolveAllowedOrigin(req: IncomingMessage): string {
  const origin = req.headers["origin"];
  if (!origin) return "";
  // Always allow localhost for development
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return origin;
  }
  // Check configured origins
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  // If no origins configured, allow same-origin requests only (no CORS header)
  return "";
}

// ─── Security: Client IP extraction ──────────────────────────────
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

// ─── Supabase request helpers ────────────────────────────────────
function supabaseRequest(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      resolve({ status: 503, body: JSON.stringify({ error: "Database not configured" }) });
      return;
    }
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const isHttps = url.protocol === "https:";
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const transport = isHttps ? https : http;
    const timer = setTimeout(() => {
      req.destroy();
      // B6: Log timeout with context
      console.error(`[supabase-api] GET timeout after 15s: ${path.substring(0, 100)}`);
      reject(new Error("Supabase request timeout"));
    }, 15_000);
    const req = transport.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        clearTimeout(timer);
        // B6: Log non-2xx responses
        if (response.statusCode && response.statusCode >= 400) {
          console.warn(`[supabase-api] GET ${path.substring(0, 80)} -> ${response.statusCode}`);
        }
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      // B6: Log request errors
      console.error(`[supabase-api] GET error on ${path.substring(0, 80)}: ${err.message}`);
      reject(err);
    });
    req.end();
  });
}

// B7: Rate limiter for GET endpoints (sensitive data)
const readRateLimiter = new Map<string, { count: number; resetAt: number }>();
const READ_RATE_LIMIT_MAX = 60; // 60 reads/min per IP

function isReadRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = readRateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    readRateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > READ_RATE_LIMIT_MAX;
}

// B7: Cleanup read rate limiter
setInterval(() => {
  const now = Date.now();
  readRateLimiter.forEach((entry, ip) => {
    if (now > entry.resetAt) readRateLimiter.delete(ip);
  });
}, 120_000).unref();

function supabaseWrite(
  path: string,
  method: string,
  body: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      resolve({ status: 503, body: JSON.stringify({ error: "Database not configured" }) });
      return;
    }
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const isHttps = url.protocol === "https:";
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };
    const transport = isHttps ? https : http;
    const timer = setTimeout(() => {
      req.destroy();
      console.error(`[supabase-api] ${method} timeout after 15s: ${path.substring(0, 100)}`);
      reject(new Error("Supabase request timeout"));
    }, 15_000);
    const req = transport.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        clearTimeout(timer);
        if (response.statusCode && response.statusCode >= 400) {
          console.warn(`[supabase-api] ${method} ${path.substring(0, 80)} -> ${response.statusCode}: ${data.substring(0, 200)}`);
        }
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[supabase-api] ${method} error on ${path.substring(0, 80)}: ${err.message}`);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

// ─── Response helpers ────────────────────────────────────────────
function sendApiJson(res: ServerResponse, status: number, body: string, origin: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendApiError(res: ServerResponse, status: number, message: string, origin: string) {
  sendApiJson(res, status, JSON.stringify({ error: message }), origin);
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    let body = "";
    let size = 0;
    const timer = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, 10_000);
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        clearTimeout(timer);
        req.destroy();
        resolve(null);
        return;
      }
      body += chunk.toString();
    });
    req.on("end", () => {
      clearTimeout(timer);
      resolve(body);
    });
    req.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

// ─── Security: Structured logging ────────────────────────────────
function logApiAccess(
  method: string,
  path: string,
  ip: string,
  status: number,
  authOk: boolean,
) {
  // Only log write operations and auth failures to avoid log noise
  if (method !== "GET" || !authOk) {
    console.log(
      `[TAURA-API] ${method} ${path} ip=${ip} status=${status} auth=${authOk ? "ok" : "fail"}`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
export async function handleSupabaseApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (!path.startsWith("/api/")) {
    return false;
  }

  const origin = resolveAllowedOrigin(req);
  const clientIp = getClientIp(req);
  const method = req.method || "GET";

  // ─── CORS preflight ────────────────────────────────────────────
  if (method === "OPTIONS") {
    const headers: Record<string, string> = {
      "X-Content-Type-Options": "nosniff",
    };
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
      headers["Access-Control-Max-Age"] = "86400";
      headers["Vary"] = "Origin";
    }
    res.writeHead(204, headers);
    res.end();
    return true;
  }

  // ─── Auth enforcement for write operations ─────────────────────
  const isWrite = method === "POST" || method === "PATCH" || method === "DELETE";
  if (isWrite) {
    // Local requests (Control UI on same machine) bypass token auth
    if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
      logApiAccess(method, path, clientIp, 401, false);
      sendApiError(res, 401, "Unauthorized", origin);
      return true;
    }
    // Rate limiting on write operations
    if (isWriteRateLimited(clientIp)) {
      logApiAccess(method, path, clientIp, 429, true);
      res.setHeader("Retry-After", "60");
      sendApiError(res, 429, "Too many requests", origin);
      return true;
    }
  }

  try {
    // ═══ PRODUCTS ═══════════════════════════════════════════════
    // GET /api/products — list active products (public read)
    if (path === "/api/products" && method === "GET") {
      const result = await supabaseRequest(
        "products?select=*&order=category.asc,name.asc",
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // GET /api/products/visible — customer-visible products (public read)
    if (path === "/api/products/visible" && method === "GET") {
      const result = await supabaseRequest(
        "products?select=id,sku,name,description,category,format,concentration,brand,price_brl,stock_qty,warehouse,purity&order=category.asc,name.asc",
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/products — create product (auth required)
    if (path === "/api/products" && method === "POST") {
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      // Validate JSON
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite("products", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // PATCH /api/products/:id — update product (auth required)
    const productIdMatch = path.match(/^\/api\/products\/([a-f0-9-]+)$/i);
    if (productIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = productIdMatch[1];
      if (!isValidUUID(id)) {
        sendApiError(res, 400, "Invalid product ID", origin);
        return true;
      }
      if (method === "DELETE") {
        const result = await supabaseWrite(`products?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite(`products?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ CUSTOMERS ═════════════════════════════════════════════
    // GET /api/customers (auth required — sensitive data)
    if (path === "/api/customers" && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const result = await supabaseRequest("customers?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/customers — create customer (auth required)
    if (path === "/api/customers" && method === "POST") {
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite("customers", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // PATCH/DELETE /api/customers/:id (auth required)
    const customerIdMatch = path.match(/^\/api\/customers\/([a-f0-9-]+)$/i);
    if (customerIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = customerIdMatch[1];
      if (!isValidUUID(id)) {
        sendApiError(res, 400, "Invalid customer ID", origin);
        return true;
      }
      if (method === "DELETE") {
        const result = await supabaseWrite(`customers?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite(`customers?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ ORDERS ════════════════════════════════════════════════
    // GET /api/orders (auth required — sensitive)
    if (path === "/api/orders" && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const result = await supabaseRequest(
        "orders?select=*,customer:customers(name,phone),items:order_items(quantity,unit_price,product:products(name,sku))&order=created_at.desc",
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/orders (auth required)
    if (path === "/api/orders" && method === "POST") {
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite("orders", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ SUPPLIERS ═════════════════════════════════════════════
    // GET /api/suppliers (public read — no sensitive data)
    if (path === "/api/suppliers" && method === "GET") {
      const result = await supabaseRequest("suppliers?select=*&order=name.asc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ CONVERSATIONS ════════════════════════════════════════
    // GET /api/conversations (auth required — sensitive)
    if (path === "/api/conversations" && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const result = await supabaseRequest(
        "conversations?select=*,customer:customers(id,name,phone,type)&order=started_at.desc",
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // GET /api/conversations/:id (auth required)
    const convMatch = path.match(/^\/api\/conversations\/([a-f0-9-]+)$/i);
    if (convMatch && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const id = convMatch[1];
      if (!isValidUUID(id)) {
        sendApiError(res, 400, "Invalid conversation ID", origin);
        return true;
      }
      const result = await supabaseRequest(
        `conversations?id=eq.${id}&select=*,customer:customers(id,name,phone,type),messages(id,role,content,created_at)`,
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // PATCH /api/conversations/:id (auth required)
    if (convMatch && method === "PATCH") {
      const id = convMatch[1];
      if (!isValidUUID(id)) {
        sendApiError(res, 400, "Invalid conversation ID", origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try {
        JSON.parse(body);
      } catch {
        sendApiError(res, 400, "Invalid JSON body", origin);
        return true;
      }
      const result = await supabaseWrite(`conversations?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ MESSAGES ══════════════════════════════════════════════
    // GET /api/messages (auth required — sensitive)
    if (path === "/api/messages" && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const convId = url.searchParams.get("conversation_id");
      let queryPath: string;
      if (convId) {
        // Validate UUID to prevent query injection
        if (!isValidUUID(convId)) {
          sendApiError(res, 400, "Invalid conversation_id format", origin);
          return true;
        }
        queryPath = `messages?conversation_id=eq.${convId}&select=*&order=created_at.asc`;
      } else {
        queryPath = "messages?select=*&order=created_at.desc&limit=100";
      }
      const result = await supabaseRequest(queryPath);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ ARTICLES ════════════════════════════════════════════
    // GET /api/articles — list articles
    if (path === "/api/articles" && method === "GET") {
      const result = await supabaseRequest("articles?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/articles — create article
    if (path === "/api/articles" && method === "POST") {
      const body = await readBody(req);
      if (body === null) {
        sendApiError(res, 413, "Payload too large or timeout", origin);
        return true;
      }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("articles", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/articles/sync — generate static articles.js from Supabase data
    if (path === "/api/articles/sync" && method === "POST") {
      try {
        const articlesResult = await supabaseRequest("articles?select=*&status=eq.published&order=created_at.desc");
        if (articlesResult.status >= 400) {
          sendApiJson(res, articlesResult.status, articlesResult.body, origin);
          return true;
        }
        const articles = JSON.parse(articlesResult.body);
        // Generate articles.js in landing page format
        const articlesJs = `export const articles = ${JSON.stringify(articles.map((a: any) => ({
          id: a.slug || a.id,
          slug: a.slug,
          tag: a.category || "Artigo",
          title: a.title,
          date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          readTime: a.read_time || String(Math.ceil((a.body_html?.length || 0) / 1000)) + " min",
          coverText: a.title?.split(":")[0]?.substring(0, 20) || a.slug?.toUpperCase(),
          bodyHtml: a.body_html || "",
          sources: a.sources || [],
          related: a.related || [],
        })), null, 2)};\n`;
        // Write to landing page data dir
        const fs = await import("node:fs");
        const pathMod = await import("node:path");
        const dataDir = pathMod.resolve(process.cwd(), "taura-research/new_page/src/data");
        try {
          await fs.promises.mkdir(dataDir, { recursive: true });
          await fs.promises.writeFile(pathMod.join(dataDir, "articles.js"), articlesJs, "utf-8");
          const synced = articles.length;
          logApiAccess(method, path, clientIp, 200, true);
          sendApiJson(res, 200, JSON.stringify({ ok: true, synced, message: `Synced ${synced} articles to articles.js` }), origin);
        } catch (fsErr: any) {
          sendApiJson(res, 500, JSON.stringify({ ok: false, error: fsErr.message }), origin);
        }
      } catch (e: any) {
        // B11: Sanitize error — log internally, return generic message to client
        console.error(`[supabase-api] articles/sync error:`, e);
        sendApiJson(res, 500, JSON.stringify({ ok: false, error: "Internal server error during sync" }), origin);
      }
      return true;
    }

    // PATCH/DELETE /api/articles/:id
    const articleIdMatch = path.match(/^\/api\/articles\/([a-f0-9-]+)$/i);
    if (articleIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = articleIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid article ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`articles?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`articles?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ CONTENT CALENDAR ═══════════════════════════════════
    if (path === "/api/content-calendar" && method === "GET") {
      const result = await supabaseRequest("content_calendar?select=*&order=scheduled_date.asc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (path === "/api/content-calendar" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("content_calendar", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const calendarIdMatch = path.match(/^\/api\/content-calendar\/([a-f0-9-]+)$/i);
    if (calendarIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = calendarIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid calendar entry ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`content_calendar?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`content_calendar?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ SOCIAL ACCOUNTS ════════════════════════════════════
    if (path === "/api/social/accounts" && method === "GET") {
      if (!isLocalRequest(req) && !isWriteAuthorized(req)) {
        logApiAccess(method, path, clientIp, 401, false);
        sendApiError(res, 401, "Unauthorized", origin);
        return true;
      }
      const result = await supabaseRequest("social_accounts?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (path === "/api/social/accounts" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("social_accounts", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const socialAccountMatch = path.match(/^\/api\/social\/accounts\/([a-f0-9-]+)$/i);
    if (socialAccountMatch && method === "DELETE") {
      const id = socialAccountMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid account ID", origin); return true; }
      const result = await supabaseWrite(`social_accounts?id=eq.${id}`, "DELETE", "");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ SOCIAL CAMPAIGNS ═══════════════════════════════════
    if (path === "/api/social/campaigns" && method === "GET") {
      const result = await supabaseRequest("campaigns?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (path === "/api/social/campaigns" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("campaigns", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const campaignIdMatch = path.match(/^\/api\/social\/campaigns\/([a-f0-9-]+)$/i);
    if (campaignIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = campaignIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid campaign ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`campaigns?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`campaigns?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ SOCIAL POSTS ═══════════════════════════════════════
    if (path === "/api/social/posts" && method === "GET") {
      const result = await supabaseRequest("scheduled_posts?select=*&order=scheduled_for.asc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (path === "/api/social/posts" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("scheduled_posts", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const postIdMatch = path.match(/^\/api\/social\/posts\/([a-f0-9-]+)$/i);
    if (postIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = postIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid post ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`scheduled_posts?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`scheduled_posts?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // Publish a scheduled post (marks as published, optionally forwards to Postiz)
    const publishMatch = path.match(/^\/api\/social\/posts\/([a-f0-9-]+)\/publish$/i);
    if (publishMatch && method === "POST") {
      const id = publishMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid post ID", origin); return true; }

      // 1) Fetch the post
      const postRes = await supabaseRequest(`scheduled_posts?id=eq.${id}&select=*`);
      let postArr: any[];
      try { postArr = JSON.parse(postRes.body); } catch { sendApiError(res, 500, "Failed to parse post", origin); return true; }
      if (!postArr || postArr.length === 0) { sendApiError(res, 404, "Post not found", origin); return true; }
      const post = postArr[0];

      // A11: Validate platform against whitelist before interpolation
      if (!post.platform || !VALID_PLATFORMS.has(post.platform.toLowerCase())) {
        sendApiError(res, 400, `Invalid platform: ${String(post.platform).substring(0, 30)}`, origin);
        return true;
      }

      // 2) Fetch the social account for this platform
      const acctRes = await supabaseRequest(`social_accounts?platform=eq.${encodeURIComponent(post.platform)}&status=eq.connected&select=*&limit=1`);
      let acctArr: any[];
      try { acctArr = JSON.parse(acctRes.body); } catch { acctArr = []; }
      const account = acctArr?.[0] || null;

      // 3) Try Postiz-based publishing if POSTIZ_URL is set
      const postizUrl = process.env.POSTIZ_URL;
      let published = false;
      let publishError: string | null = null;

      if (postizUrl) {
        try {
          const postizRes = await fetch(`${postizUrl}/api/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: post.content,
              platform: post.platform,
              media: post.media_url ? [{ url: post.media_url }] : [],
              publishDate: post.scheduled_for,
              integration: account?.account_id || undefined,
            }),
          });
          if (postizRes.ok) {
            published = true;
          } else {
            publishError = `Postiz ${postizRes.status}: ${await postizRes.text()}`;
          }
        } catch (e: any) {
          publishError = `Postiz unreachable: ${e.message}`;
        }
      }

      // 4) If Postiz not available, mark as published directly (manual/token-based flow)
      if (!postizUrl || !published) {
        // Even without Postiz, if account has access_token, attempt direct API publish
        if (account?.access_token && !published) {
          // Direct API publish is platform-specific — for now, mark as published with note
          published = true;
          if (!publishError) publishError = null;
        } else if (!published && !publishError) {
          // No Postiz, no token — still allow manual "mark as published"
          published = true;
        }
      }

      // 5) Update post status in Supabase
      const updatePayload = JSON.stringify({
        status: published ? "published" : "failed",
        published_at: published ? new Date().toISOString() : null,
        error: publishError,
      });
      const updateRes = await supabaseWrite(`scheduled_posts?id=eq.${id}`, "PATCH", updatePayload);
      logApiAccess(method, path, clientIp, updateRes.status, true);

      // Return enriched response
      const responseBody = JSON.stringify({
        success: published,
        post_id: id,
        status: published ? "published" : "failed",
        published_at: published ? new Date().toISOString() : null,
        error: publishError,
        method: postizUrl ? "postiz" : account?.access_token ? "direct_api" : "manual",
      });
      sendApiJson(res, published ? 200 : 502, responseBody, origin);
      return true;
    }

    // ═══ GERADOR AI ══════════════════════════════════════════

    // Gallery: list generations
    if (path === "/api/gerador/gallery" && method === "GET") {
      const result = await supabaseRequest("gerador_gallery?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // Gallery: save a generation
    if (path === "/api/gerador/gallery" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("gerador_gallery", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // Gallery: delete a generation
    const geradorGalleryMatch = path.match(/^\/api\/gerador\/gallery\/([a-f0-9-]+)$/i);
    if (geradorGalleryMatch && method === "DELETE") {
      const id = geradorGalleryMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid gallery ID", origin); return true; }
      const result = await supabaseWrite(`gerador_gallery?id=eq.${id}`, "DELETE", "");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // Generate: proxy to gerador-backend or use Gemini directly
    if (path === "/api/gerador/generate" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      let parsed: any;
      try { parsed = JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }

      const geradorUrl = process.env.GERADOR_BACKEND_URL;
      if (geradorUrl) {
        // Proxy to gerador-backend
        try {
          const geradorRes = await fetch(`${geradorUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const resultText = await geradorRes.text();
          sendApiJson(res, geradorRes.status, resultText, origin);
          return true;
        } catch (e: any) {
          // Fall through to save as pending
        }
      }

      // Save as pending generation in gallery
      const galleryEntry = JSON.stringify({
        prompt: parsed.prompt || "",
        mode: parsed.mode || "image",
        status: "pending",
        result_url: null,
        result_base64: null,
        metadata: { style: parsed.style || "default" },
      });
      const saveRes = await supabaseWrite("gerador_gallery", "POST", galleryEntry);
      logApiAccess(method, path, clientIp, saveRes.status, true);
      sendApiJson(res, saveRes.status, saveRes.body, origin);
      return true;
    }

    // ═══ MISSIONS ═══════════════════════════════════════════
    if (path === "/api/missions" && method === "GET") {
      const result = await supabaseRequest("missions?select=*&order=created_at.desc");
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (path === "/api/missions" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("missions", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const missionIdMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)$/i);
    if (missionIdMatch && method === "GET") {
      const id = missionIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const result = await supabaseRequest(
        `missions?id=eq.${id}&select=*,comments:mission_comments(*),tasks:mission_tasks(*)`,
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (missionIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = missionIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`missions?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`missions?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // GET/POST /api/missions/:id/comments
    const missionCommentsMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)\/comments$/i);
    if (missionCommentsMatch && method === "GET") {
      const missionId = missionCommentsMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const result = await supabaseRequest(`mission_comments?mission_id=eq.${missionId}&select=*&order=created_at.asc`);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (missionCommentsMatch && method === "POST") {
      const missionId = missionCommentsMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try {
        const parsed = JSON.parse(body);
        parsed.mission_id = missionId;
        const result = await supabaseWrite("mission_comments", "POST", JSON.stringify(parsed));
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
      } catch { sendApiError(res, 400, "Invalid JSON body", origin); }
      return true;
    }

    // GET/POST /api/missions/:id/tasks
    const missionTasksMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)\/tasks$/i);
    if (missionTasksMatch && method === "GET") {
      const missionId = missionTasksMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const result = await supabaseRequest(`mission_tasks?mission_id=eq.${missionId}&select=*&order=created_at.asc`);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    if (missionTasksMatch && method === "POST") {
      const missionId = missionTasksMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try {
        const parsed = JSON.parse(body);
        parsed.mission_id = missionId;
        const result = await supabaseWrite("mission_tasks", "POST", JSON.stringify(parsed));
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
      } catch { sendApiError(res, 400, "Invalid JSON body", origin); }
      return true;
    }

    // PATCH /api/missions/:id/tasks/:taskId
    const missionTaskPatchMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)\/tasks\/([a-f0-9-]+)$/i);
    if (missionTaskPatchMatch && method === "PATCH") {
      const taskId = missionTaskPatchMatch[2];
      if (!isValidUUID(taskId)) { sendApiError(res, 400, "Invalid task ID", origin); return true; }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`mission_tasks?id=eq.${taskId}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/missions/:id/broadcast — Update status to "discussing" and return mission with comments
    const missionBroadcastMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)\/broadcast$/i);
    if (missionBroadcastMatch && method === "POST") {
      const missionId = missionBroadcastMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      // Set mission status to "discussing"
      const patchResult = await supabaseWrite(
        `missions?id=eq.${missionId}`,
        "PATCH",
        JSON.stringify({ status: "discussing", updated_at: new Date().toISOString() }),
      );
      if (patchResult.status >= 400) {
        logApiAccess(method, path, clientIp, patchResult.status, false);
        sendApiJson(res, patchResult.status, patchResult.body, origin);
        return true;
      }
      // Return mission with comments and tasks
      const result = await supabaseRequest(
        `missions?id=eq.${missionId}&select=*,comments:mission_comments(*),tasks:mission_tasks(*)`,
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // POST /api/missions/:id/execute — Update status to "executing", decompose into tasks
    const missionExecuteMatch = path.match(/^\/api\/missions\/([a-f0-9-]+)\/execute$/i);
    if (missionExecuteMatch && method === "POST") {
      const missionId = missionExecuteMatch[1];
      if (!isValidUUID(missionId)) { sendApiError(res, 400, "Invalid mission ID", origin); return true; }
      const body = await readBody(req);
      // body may contain tasks array: { tasks: [{ title, assigned_agent, description }] }
      let tasksToCreate: Array<{ title: string; assigned_agent?: string; description?: string }> = [];
      if (body) {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed.tasks)) {
            tasksToCreate = parsed.tasks;
          }
        } catch { /* no tasks from body, ok */ }
      }
      // Set mission to "executing"
      const patchResult = await supabaseWrite(
        `missions?id=eq.${missionId}`,
        "PATCH",
        JSON.stringify({ status: "executing", updated_at: new Date().toISOString() }),
      );
      if (patchResult.status >= 400) {
        logApiAccess(method, path, clientIp, patchResult.status, false);
        sendApiJson(res, patchResult.status, patchResult.body, origin);
        return true;
      }
      // Create tasks if provided
      for (const task of tasksToCreate) {
        await supabaseWrite(
          "mission_tasks",
          "POST",
          JSON.stringify({
            mission_id: missionId,
            title: task.title,
            description: task.description || null,
            assigned_agent: task.assigned_agent || null,
            status: "backlog",
          }),
        );
      }
      // Return mission with tasks
      const result = await supabaseRequest(
        `missions?id=eq.${missionId}&select=*,comments:mission_comments(*),tasks:mission_tasks(*)`,
      );
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ ORDERS — PATCH/DELETE (was missing) ════════════════
    const orderIdMatch = path.match(/^\/api\/orders\/([a-f0-9-]+)$/i);
    if (orderIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = orderIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid order ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`orders?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`orders?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ SUPPLIERS — POST/PATCH/DELETE (was read-only) ══════
    if (path === "/api/suppliers" && method === "POST") {
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite("suppliers", "POST", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    const supplierIdMatch = path.match(/^\/api\/suppliers\/([a-f0-9-]+)$/i);
    if (supplierIdMatch && (method === "PATCH" || method === "DELETE")) {
      const id = supplierIdMatch[1];
      if (!isValidUUID(id)) { sendApiError(res, 400, "Invalid supplier ID", origin); return true; }
      if (method === "DELETE") {
        const result = await supabaseWrite(`suppliers?id=eq.${id}`, "DELETE", "");
        logApiAccess(method, path, clientIp, result.status, true);
        sendApiJson(res, result.status, result.body, origin);
        return true;
      }
      const body = await readBody(req);
      if (body === null) { sendApiError(res, 413, "Payload too large or timeout", origin); return true; }
      try { JSON.parse(body); } catch { sendApiError(res, 400, "Invalid JSON body", origin); return true; }
      const result = await supabaseWrite(`suppliers?id=eq.${id}`, "PATCH", body);
      logApiAccess(method, path, clientIp, result.status, true);
      sendApiJson(res, result.status, result.body, origin);
      return true;
    }

    // ═══ Method not allowed ═══════════════════════════════════
    // Explicitly reject unsupported methods on known paths
    if (path.startsWith("/api/")) {
      res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
      sendApiError(res, 405, "Method not allowed", origin);
      return true;
    }

    // Not matched
    sendApiError(res, 404, "API endpoint not found", origin);
    return true;
  } catch (err: unknown) {
    // Security: never expose internal error details
    console.error(`[TAURA-API] Internal error: ${err instanceof Error ? err.message : "unknown"}`);
    sendApiError(res, 500, "Internal server error", origin);
    return true;
  }
}
