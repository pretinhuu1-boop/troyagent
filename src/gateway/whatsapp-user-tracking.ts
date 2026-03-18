/**
 * WhatsApp User Tracking & Conversation Logging
 * Auto-registers WhatsApp users in the customers table and logs conversations/messages.
 * Runs as background tasks to avoid blocking message processing.
 *
 * Security fixes (Fase A):
 *  A1 — LRU cache with TTL (prevents unbounded memory growth)
 *  A2 — UPSERT pattern for ensureCustomer (prevents race-condition duplicates)
 *  A3 — UPSERT pattern for ensureConversation (prevents duplicate active convos)
 *  B12 — Phone format validation (E.164)
 *  B13 — Name update failure logging (no silent swallow)
 *  B14 — Content sanitization (strip HTML, null bytes)
 */
import https from "node:https";
import http from "node:http";
import { LRUCache } from "./lru-cache.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coiwajcdvqbrxbshdnwl.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

// A1: LRU cache with max 10K entries + 24h TTL (was unbounded Map)
const knownPhones = new LRUCache<string, string>(10_000, 86_400_000); // phone -> customer_id
const activeConversations = new LRUCache<string, string>(10_000, 86_400_000); // phone -> conversation_id

// Periodic prune (every 10 minutes)
setInterval(() => {
  const prunedPhones = knownPhones.prune();
  const prunedConvos = activeConversations.prune();
  if (prunedPhones + prunedConvos > 0) {
    console.log(
      `[TAURA-TRACK] Cache pruned: ${prunedPhones} phones, ${prunedConvos} conversations`,
    );
  }
}, 600_000).unref();

// B12: Phone format validation (E.164)
const PHONE_RE = /^\+?[1-9]\d{1,14}$/;
function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.replace(/[\s\-()]/g, ""));
}

// B14: Content sanitization
function sanitizeContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/\0/g, "") // Remove null bytes
    .substring(0, 10_000); // Length limit
}

function supabaseGet(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const isHttps = url.protocol === "https:";
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : isHttps ? 443 : 80,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const transport = isHttps ? https : http;
    const req = transport.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", (err) => {
      console.error("[TAURA-TRACK] Supabase GET error:", err.message);
      reject(err);
    });
    req.end();
  });
}

function supabaseWrite(
  path: string,
  method: string,
  body: string,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const isHttps = url.protocol === "https:";
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : isHttps ? 443 : 80,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...extraHeaders,
      },
    };
    const transport = isHttps ? https : http;
    const req = transport.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", (err) => {
      console.error("[TAURA-TRACK] Supabase write error:", err.message);
      reject(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Find or create a customer by phone number.
 * A2: Uses UPSERT via Prefer: resolution=merge-duplicates to prevent race condition duplicates.
 * Relies on UNIQUE index on customers(phone).
 */
async function ensureCustomer(phone: string, name?: string): Promise<string> {
  // Check cache first
  const cached = knownPhones.get(phone);
  if (cached) return cached;

  // Look up by phone
  const result = await supabaseGet(
    `customers?phone=eq.${encodeURIComponent(phone)}&select=id,name&limit=1`,
  );
  if (result.status === 200) {
    const rows = JSON.parse(result.body);
    if (rows.length > 0) {
      const id = rows[0].id;
      knownPhones.set(phone, id);

      // B13: Update name if we have a new one and existing is empty (with logging)
      if (name && !rows[0].name) {
        await supabaseWrite(
          `customers?id=eq.${id}`,
          "PATCH",
          JSON.stringify({ name, updated_at: new Date().toISOString() }),
        ).catch((e) =>
          console.warn("[TAURA-TRACK] Name update failed:", e.message),
        );
      }
      return id;
    }
  }

  // A2: Create with UPSERT — if another request already created, merge instead of error
  const newCustomer = {
    name: name || phone,
    phone,
    type: "b2c",
    notes: `Auto-registrado via WhatsApp em ${new Date().toISOString()}`,
  };
  const createResult = await supabaseWrite(
    "customers",
    "POST",
    JSON.stringify(newCustomer),
    { Prefer: "return=representation,resolution=merge-duplicates" },
  );
  if (
    createResult.status === 201 ||
    createResult.status === 200 ||
    createResult.status === 409
  ) {
    let rows: any[];
    try {
      rows = JSON.parse(createResult.body);
    } catch {
      // 409 conflict — fetch the existing record
      const retry = await supabaseGet(
        `customers?phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`,
      );
      rows = JSON.parse(retry.body);
    }
    if (rows.length > 0) {
      const id = rows[0].id;
      knownPhones.set(phone, id);
      console.log(
        `[TAURA-TRACK] Auto-registered WhatsApp user: ${name || phone} (${phone}) -> ${id}`,
      );
      return id;
    }
  }

  throw new Error(
    `Failed to create customer for phone ${phone}: status ${createResult.status}`,
  );
}

/**
 * Find or create an active conversation for a customer.
 * A3: Uses partial unique index on conversations(customer_id, channel) WHERE status='active'
 * to prevent duplicate active conversations via race conditions.
 */
async function ensureConversation(
  customerId: string,
  phone: string,
): Promise<string> {
  // Check cache
  const cached = activeConversations.get(phone);
  if (cached) return cached;

  // Look for existing active conversation
  const result = await supabaseGet(
    `conversations?customer_id=eq.${customerId}&status=eq.active&channel=eq.whatsapp&select=id&order=started_at.desc&limit=1`,
  );
  if (result.status === 200) {
    const rows = JSON.parse(result.body);
    if (rows.length > 0) {
      const id = rows[0].id;
      activeConversations.set(phone, id);
      return id;
    }
  }

  // A3: Create with conflict handling — unique index prevents duplicates
  const newConv = {
    customer_id: customerId,
    channel: "whatsapp",
    status: "active",
  };
  const createResult = await supabaseWrite(
    "conversations",
    "POST",
    JSON.stringify(newConv),
  );
  if (
    createResult.status === 201 ||
    createResult.status === 200
  ) {
    const rows = JSON.parse(createResult.body);
    if (rows.length > 0) {
      const id = rows[0].id;
      activeConversations.set(phone, id);
      console.log(
        `[TAURA-TRACK] New conversation started for ${phone} -> ${id}`,
      );
      return id;
    }
  }

  // 409 = conflict (another request created it) — fetch existing
  if (createResult.status === 409) {
    const retry = await supabaseGet(
      `conversations?customer_id=eq.${customerId}&status=eq.active&channel=eq.whatsapp&select=id&limit=1`,
    );
    const rows = JSON.parse(retry.body);
    if (rows.length > 0) {
      const id = rows[0].id;
      activeConversations.set(phone, id);
      return id;
    }
  }

  throw new Error(
    `Failed to create conversation: status ${createResult.status}`,
  );
}

/**
 * Log a message to the messages table.
 * B14: Content is sanitized (HTML stripped, null bytes removed, length limited).
 */
async function logMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
): Promise<void> {
  const msg = {
    conversation_id: conversationId,
    role,
    content: sanitizeContent(content),
  };
  await supabaseWrite("messages", "POST", JSON.stringify(msg)).catch((e) =>
    console.error("[TAURA-TRACK] logMessage failed:", e.message),
  );
}

/**
 * Main tracking function called on each inbound WhatsApp message.
 * Runs as a background task — does not block message processing.
 */
export async function trackInboundMessage(params: {
  senderPhone: string;
  senderName?: string;
  messageBody: string;
  sessionKey: string;
  chatType: string;
}): Promise<{ customerId: string; conversationId: string } | null> {
  // Only track DM messages, not groups
  if (params.chatType === "group") return null;
  if (!params.senderPhone) return null;

  // B12: Validate phone format
  if (!isValidPhone(params.senderPhone)) {
    console.warn(
      `[TAURA-TRACK] Invalid phone format: ${params.senderPhone.substring(0, 20)}`,
    );
    return null;
  }

  try {
    const customerId = await ensureCustomer(
      params.senderPhone,
      params.senderName,
    );
    const conversationId = await ensureConversation(
      customerId,
      params.senderPhone,
    );

    // Log the inbound message
    await logMessage(conversationId, "user", params.messageBody);

    return { customerId, conversationId };
  } catch (err: any) {
    console.error(
      `[TAURA-TRACK] Error tracking inbound message: ${err.message}`,
    );
    return null;
  }
}

/**
 * Log an outbound (assistant) reply.
 */
export async function trackOutboundMessage(params: {
  senderPhone: string;
  replyText: string;
}): Promise<void> {
  if (!params.senderPhone || !params.replyText) return;

  try {
    const customerId = knownPhones.get(params.senderPhone);
    if (!customerId) return; // Not tracked yet

    const conversationId = activeConversations.get(params.senderPhone);
    if (!conversationId) return;

    await logMessage(conversationId, "assistant", params.replyText);
  } catch (err: any) {
    console.error(
      `[TAURA-TRACK] Error tracking outbound message: ${err.message}`,
    );
  }
}
