/**
 * Supabase API proxy for the TAURA gateway.
 * Handles /api/products, /api/customers, /api/orders endpoints.
 * Keeps the Supabase secret key on the backend only.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import https from "node:https";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coiwajcdvqbrxbshdnwl.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

function supabaseRequest(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function supabaseWrite(
  path: string,
  method: string,
  body: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };
    const req = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        resolve({ status: response.statusCode ?? 500, body: data });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sendJson(res: ServerResponse, status: number, body: string) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
  });
}

export async function handleSupabaseApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS" && path.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return true;
  }

  if (!path.startsWith("/api/")) {
    return false;
  }

  try {
    // GET /api/products — list active products
    if (path === "/api/products" && req.method === "GET") {
      const result = await supabaseRequest(
        "products?select=*&active=eq.true&order=category.asc,name.asc",
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/products/visible — only customer-visible products
    if (path === "/api/products/visible" && req.method === "GET") {
      const result = await supabaseRequest(
        "products?select=id,sku,name,description,category,format,concentration,brand,price_brl,stock_qty,warehouse,purity&active=eq.true&visible_to_customer=eq.true&order=category.asc,name.asc",
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // POST /api/products — create product
    if (path === "/api/products" && req.method === "POST") {
      const body = await readBody(req);
      const result = await supabaseWrite("products", "POST", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // PATCH /api/products/:id — update product
    const patchMatch = path.match(/^\/api\/products\/([a-f0-9-]+)$/);
    if (patchMatch && req.method === "PATCH") {
      const id = patchMatch[1];
      const body = await readBody(req);
      const result = await supabaseWrite(`products?id=eq.${id}`, "PATCH", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // DELETE /api/products/:id — delete product
    if (patchMatch && req.method === "DELETE") {
      const id = patchMatch[1];
      const result = await supabaseWrite(`products?id=eq.${id}`, "DELETE", "");
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/customers
    if (path === "/api/customers" && req.method === "GET") {
      const result = await supabaseRequest("customers?select=*&order=created_at.desc");
      sendJson(res, result.status, result.body);
      return true;
    }

    // POST /api/customers — create customer
    if (path === "/api/customers" && req.method === "POST") {
      const body = await readBody(req);
      const result = await supabaseWrite("customers", "POST", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // PATCH /api/customers/:id — update customer
    const customerPatchMatch = path.match(/^\/api\/customers\/([a-f0-9-]+)$/);
    if (customerPatchMatch && req.method === "PATCH") {
      const id = customerPatchMatch[1];
      const body = await readBody(req);
      const result = await supabaseWrite(`customers?id=eq.${id}`, "PATCH", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // DELETE /api/customers/:id — delete customer
    if (customerPatchMatch && req.method === "DELETE") {
      const id = customerPatchMatch[1];
      const result = await supabaseWrite(`customers?id=eq.${id}`, "DELETE", "");
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/orders
    if (path === "/api/orders" && req.method === "GET") {
      const result = await supabaseRequest(
        "orders?select=*,customer:customers(name,phone),items:order_items(quantity,unit_price,product:products(name,sku))&order=created_at.desc",
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // POST /api/orders
    if (path === "/api/orders" && req.method === "POST") {
      const body = await readBody(req);
      const result = await supabaseWrite("orders", "POST", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/suppliers
    if (path === "/api/suppliers" && req.method === "GET") {
      const result = await supabaseRequest("suppliers?select=*&order=name.asc");
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/conversations — list conversations with customer info
    if (path === "/api/conversations" && req.method === "GET") {
      const result = await supabaseRequest(
        "conversations?select=*,customer:customers(id,name,phone,type)&order=started_at.desc",
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/conversations/:id — single conversation with messages
    const convMatch = path.match(/^\/api\/conversations\/([a-f0-9-]+)$/);
    if (convMatch && req.method === "GET") {
      const id = convMatch[1];
      const result = await supabaseRequest(
        `conversations?id=eq.${id}&select=*,customer:customers(id,name,phone,type),messages(id,role,content,created_at)`,
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // PATCH /api/conversations/:id — update conversation status
    if (convMatch && req.method === "PATCH") {
      const id = convMatch[1];
      const body = await readBody(req);
      const result = await supabaseWrite(`conversations?id=eq.${id}`, "PATCH", body);
      sendJson(res, result.status, result.body);
      return true;
    }

    // GET /api/messages?conversation_id=xxx — list messages for a conversation
    if (path === "/api/messages" && req.method === "GET") {
      const convId = url.searchParams.get("conversation_id");
      const queryPath = convId
        ? `messages?conversation_id=eq.${convId}&select=*&order=created_at.asc`
        : "messages?select=*&order=created_at.desc&limit=100";
      const result = await supabaseRequest(queryPath);
      sendJson(res, result.status, result.body);
      return true;
    }

    // Not matched
    sendJson(res, 404, JSON.stringify({ error: "API endpoint not found" }));
    return true;
  } catch (err: any) {
    sendJson(res, 500, JSON.stringify({ error: err.message || "Internal error" }));
    return true;
  }
}
