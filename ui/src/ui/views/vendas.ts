import { html, nothing } from "lit";
import { apiFetch, API_BASE } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";

/* ── Relationship with Canvas Dashboard ──────────────────────────
 * A parallel Canvas version exists at `src/canvas-host/vape-dashboard/dashboard.js`.
 * The agent interacts with that version via `canvas eval` → `window.troyDashboard.*`.
 * Both share the same localStorage keys for config/feed/metrics and stay in sync.
 * Orders are now persisted in Supabase via /api/orders (Sprint 0b migration).
 * ────────────────────────────────────────────────────────────── */

/* ── Storage Keys (config/feed/metrics only — orders moved to API) */
const FEED_KEY = "troy_vape_feed";
const METRICS_KEY = "troy_vape_metrics";
const CONFIG_KEY = "troy_vape_config";

/* ── Types ───────────────────────────────────────────────────── */
interface OrderItem {
  quantity: number;
  name: string;
  sku: string;
  price?: number;
  flavor?: string;
}

interface Order {
  id: string;
  customer: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: number;
  isNew?: boolean;
}

interface FeedEvent {
  icon: string;
  message: string;
  time: number;
}

interface Metrics {
  conversations: number;
  catalogs: number;
  checkouts: number;
  payments: number;
}

interface HoursConfig {
  weekdays: string; // e.g. "08:00-17:00"
  saturday: string; // e.g. "08:00-16:00"
  sunday: string; // e.g. "" (closed)
}

interface BusinessRules {
  warranty: string; // e.g. "Não trabalhamos com garantia"
  shippingDeadline: string; // e.g. "48h úteis"
  wholesaleMinQty: number; // e.g. 10
  paymentMethod: string; // e.g. "Pix"
}

interface VapeConfig {
  whatsapp: string;
  pix: string;
  storeName: string;
  hours: HoursConfig;
  llmModel: string;
  businessRules: BusinessRules;
}

/* ── State (module-scoped, survives re-renders) ──────────────── */
let orders: Order[] = [];
let feed: FeedEvent[] = [];
let metrics: Metrics = { conversations: 0, catalogs: 0, checkouts: 0, payments: 0 };
let config: VapeConfig = {
  whatsapp: "",
  pix: "",
  storeName: "Troy Vape",
  hours: { weekdays: "08:00-17:00", saturday: "08:00-16:00", sunday: "" },
  llmModel: "deepseek/deepseek-r1",
  businessRules: {
    warranty: "Não trabalhamos com garantia",
    shippingDeadline: "48h úteis",
    wholesaleMinQty: 10,
    paymentMethod: "Pix",
  },
};
let loaded = false;
let error: string | null = null;
let errorTimer: number | null = null;
let showConfigSaved = false;
let configSavedTimer: number | null = null;
let storageListenerBound = false;

/* ── Form state (event-driven, no getElementById) ───────────── */
let formWa = "";
let formPix = "";
let formName = "";
let formHoursWeekdays = "";
let formHoursSaturday = "";
let formHoursSunday = "";
let formLlmModel = "";
let formWarranty = "";
let formShippingDeadline = "";
let formWholesaleMinQty = "";
let formPaymentMethod = "";
let formInitialized = false;

/** Sync form state from config (on load / external changes). */
function syncFormFromConfig() {
  formWa = config.whatsapp;
  formPix = config.pix;
  formName = config.storeName;
  formHoursWeekdays = config.hours?.weekdays ?? "08:00-17:00";
  formHoursSaturday = config.hours?.saturday ?? "08:00-16:00";
  formHoursSunday = config.hours?.sunday ?? "";
  formLlmModel = config.llmModel ?? "deepseek/deepseek-r1";
  formWarranty = config.businessRules?.warranty ?? "Não trabalhamos com garantia";
  formShippingDeadline = config.businessRules?.shippingDeadline ?? "48h úteis";
  formWholesaleMinQty = String(config.businessRules?.wholesaleMinQty ?? 10);
  formPaymentMethod = config.businessRules?.paymentMethod ?? "Pix";
}

/* ── Cross-tab sync keys (config/feed/metrics only) ──────────── */
const SYNC_KEYS = new Set([FEED_KEY, METRICS_KEY, CONFIG_KEY]);

/* ── Persistence ─────────────────────────────────────────────── */
let ordersLoading = false;

/** Load orders from Supabase via gateway API. */
async function loadOrders(requestUpdate: () => void) {
  if (ordersLoading) return;
  ordersLoading = true;
  try {
    const data = await apiFetch("/orders");
    if (Array.isArray(data)) {
      // Map relational response to flat Order interface
      orders = data.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ""),
        customer: (row.customer as Record<string, unknown>)?.name
          ? String((row.customer as Record<string, unknown>).name)
          : String(row.customer_id ?? "Anônimo"),
        items: Array.isArray(row.items)
          ? (row.items as Record<string, unknown>[]).map((item) => ({
              quantity: Number(item.quantity ?? 1),
              name: (item.product as Record<string, unknown>)?.name
                ? String((item.product as Record<string, unknown>).name)
                : "Produto",
              sku: (item.product as Record<string, unknown>)?.sku
                ? String((item.product as Record<string, unknown>).sku)
                : "",
              price: Number(item.unit_price ?? 0),
            }))
          : [],
        total: Number(row.total ?? 0),
        status: String(row.status ?? "novo"),
        createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
      }));
    }
  } catch (e) {
    error = `Erro ao carregar pedidos: ${(e as Error).message}`;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = window.setTimeout(() => { error = null; requestUpdate(); }, 5000);
  } finally {
    ordersLoading = false;
    requestUpdate();
  }
}

/** Reload local data (feed, metrics, config) from localStorage. */
function reloadLocal() {
  try {
    const f = localStorage.getItem(FEED_KEY);
    if (f) {
      feed = JSON.parse(f);
    }
    const m = localStorage.getItem(METRICS_KEY);
    if (m) {
      metrics = { ...metrics, ...JSON.parse(m) };
    }
    const c = localStorage.getItem(CONFIG_KEY);
    if (c) {
      config = { ...config, ...JSON.parse(c) };
    }
    syncFormFromConfig();
  } catch {
    /* ignore corrupt data */
  }
}

function load(requestUpdate: () => void) {
  if (loaded) {
    return;
  }
  reloadLocal();
  loaded = true;
  // Async load orders from API
  loadOrders(requestUpdate);
}

/** Listen for storage changes from the canvas dashboard (cross-tab sync). */
function bindStorageSync(requestUpdate: () => void) {
  if (storageListenerBound) {
    return;
  }
  storageListenerBound = true;
  window.addEventListener("storage", (e) => {
    if (e.key && SYNC_KEYS.has(e.key)) {
      reloadLocal();
      requestUpdate();
    }
  });
}

/** Save feed + metrics to localStorage. */
function saveLocal() {
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** Update an order's status via API. */
async function apiUpdateOrderStatus(orderId: string, newStatus: string, requestUpdate: () => void) {
  try {
    await apiFetch(`/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (e) {
    error = `Erro ao atualizar pedido: ${(e as Error).message}`;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = window.setTimeout(() => { error = null; requestUpdate(); }, 5000);
  }
  // Refresh from API
  await loadOrders(requestUpdate);
}

/** Create an order via API. */
async function apiCreateOrder(
  data: { customer_id?: string; total?: number; status?: string },
  requestUpdate: () => void,
): Promise<string | null> {
  try {
    const result = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_id: data.customer_id || null,
        total: data.total ?? 0,
        status: data.status ?? "novo",
      }),
    });
    await loadOrders(requestUpdate);
    if (Array.isArray(result) && result[0]?.id) {
      return String(result[0].id);
    }
    return null;
  } catch (e) {
    error = `Erro ao criar pedido: ${(e as Error).message}`;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = window.setTimeout(() => { error = null; requestUpdate(); }, 5000);
    return null;
  }
}

/** Delete an order via API. */
async function apiDeleteOrder(orderId: string, requestUpdate: () => void) {
  try {
    await apiFetch(`/orders/${orderId}`, { method: "DELETE" });
  } catch (e) {
    error = `Erro ao excluir pedido: ${(e as Error).message}`;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = window.setTimeout(() => { error = null; requestUpdate(); }, 5000);
  }
  await loadOrders(requestUpdate);
}

/* ── Delete confirmation state ── */
let deleteOrderTarget: string | null = null;

/* ── M6: Selected order detail state ── */
let selectedOrderId: string | null = null;

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function genId() {
  return "TV-" + Date.now().toString(36).toUpperCase().slice(-6);
}

function addFeed(type: string, message: string) {
  const icons: Record<string, string> = {
    message: "💬",
    checkout: "🛒",
    payment: "💰",
    forward: "📦",
    system: "⚙️",
    catalog: "📋",
  };
  feed.unshift({ icon: icons[type] ?? "📌", message, time: Date.now() });
  if (feed.length > 50) {
    feed = feed.slice(0, 50);
  }
  saveLocal();
}

function buildForwardMsg(orderData: {
  customer?: string;
  items?: OrderItem[];
  total?: number;
  address?: string;
  cep?: string;
  paymentStatus?: string;
}) {
  const store = config.storeName || "Troy Vape";
  const items = (orderData.items ?? [])
    .map((i) => {
      let line = `- ${i.quantity}x ${i.name} (${i.sku})`;
      if (i.flavor) {
        line += `\n  Sabor: ${i.flavor}`;
      }
      return line;
    })
    .join("\n");
  return [
    `🚨 NOVO PEDIDO - ${store.toUpperCase()} 🚨`,
    "--------------------------------",
    `CLIENTE: ${orderData.customer ?? "Anônimo"}`,
    "PRODUTOS:",
    items,
    "--------------------------------",
    "ENTREGA:",
    orderData.address ?? "(endereço pendente)",
    `CEP: ${orderData.cep ?? "(pendente)"}`,
    "--------------------------------",
    `TOTAL: ${fmt(orderData.total ?? 0)}`,
    `STATUS: ${(orderData.paymentStatus ?? "PAGO").toUpperCase()} (Comprovante recebido)`,
  ].join("\n");
}

/* ── Public API (window.troyDashboard) ───────────────────────── */
function exposeApi(requestUpdate: () => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global API bridge
  (window as any).troyDashboard = {
    async addOrder(data: { customer?: string; items?: OrderItem[]; total?: number }) {
      const tempId = genId();
      addFeed("checkout", `Novo pedido de ${data.customer ?? "Anônimo"} — ${fmt(data.total ?? 0)}`);
      // Create order in Supabase
      const newId = await apiCreateOrder(
        { total: data.total ?? 0, status: "novo" },
        requestUpdate,
      );
      requestUpdate();
      return newId ?? tempId;
    },
    async updateStatus(orderId: string, newStatus: string) {
      const o = orders.find((x) => x.id === orderId);
      if (!o) {
        return false;
      }
      const old = o.status;
      addFeed("system", `Pedido ${orderId.slice(0, 8)}...: ${old.toUpperCase()} → ${newStatus.toUpperCase()}`);
      await apiUpdateOrderStatus(orderId, newStatus, requestUpdate);
      requestUpdate();
      return true;
    },
    trackEvent(type: string) {
      if (type in metrics) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metric key
        (metrics as any)[type]++;
        saveLocal();
        requestUpdate();
      } else {
        // L8: Warn on unknown event types instead of silently ignoring
        console.warn(`[vendas] trackEvent: unknown type "${type}". Valid: ${Object.keys(metrics).join(", ")}`);
      }
    },
    logActivity(type: string, msg: string) {
      addFeed(type, msg);
      requestUpdate();
    },
    getOrders: () => [...orders],
    getMetrics: () => ({ ...metrics }),
    getConfig: () => ({ ...config }),
    forwardOrder(data: {
      customer?: string;
      items?: OrderItem[];
      total?: number;
      address?: string;
      cep?: string;
    }) {
      const msg = buildForwardMsg(data);
      if (!config.whatsapp) {
        addFeed("system", "⚠️ Número do escritório não configurado!");
        requestUpdate();
        return { success: false, reason: "no_whatsapp_configured" };
      }
      // M7: Copy forward message to clipboard
      navigator.clipboard.writeText(msg).then(() => {
        addFeed("forward", `Pedido encaminhado para escritório (...${config.whatsapp.slice(-4)}) — 📋 Copiado`);
      }).catch(() => {
        addFeed("forward", `Pedido encaminhado para escritório (...${config.whatsapp.slice(-4)})`);
      });
      requestUpdate();
      return { success: true, whatsapp: config.whatsapp, pix: config.pix, message: msg };
    },
    /** Force refresh orders from API. */
    async refresh() {
      await loadOrders(requestUpdate);
    },
  };
}

/* ── KPI computation ─────────────────────────────────────────── */
function kpis() {
  // L1: Timezone-safe date comparison using locale date string
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const oStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return oStr === todayStr;
  });
  const paid = todayOrders.filter((o) => ["pago", "separado", "enviado"].includes(o.status));
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const pending = todayOrders.filter((o) => o.status === "novo").length;
  const completed = todayOrders.filter((o) => ["separado", "enviado"].includes(o.status)).length;
  const ticket = paid.length > 0 ? revenue / paid.length : 0;
  return { revenue, pending, completed, ticket };
}

/* ── Render (pure Lit html) ──────────────────────────────────── */
export type VendasRenderState = TauraViewState;

export function renderVendas(s: VendasRenderState) {
  const updater = () => triggerUpdate(s);
  load(updater);
  exposeApi(updater);
  bindStorageSync(updater);

  const k = kpis();
  const rate =
    metrics.conversations > 0 ? ((metrics.payments / metrics.conversations) * 100).toFixed(1) : "0";
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Initialize form state once from config
  if (!formInitialized) {
    syncFormFromConfig();
    formInitialized = true;
  }

  const handleSaveConfig = () => {
    config.whatsapp = formWa.replace(/\D/g, "");
    config.pix = formPix.trim();
    config.storeName = formName.trim() || "Troy Vape";
    config.hours = {
      weekdays: formHoursWeekdays.trim() || "08:00-17:00",
      saturday: formHoursSaturday.trim() || "08:00-16:00",
      sunday: formHoursSunday.trim(),
    };
    config.llmModel = formLlmModel || "deepseek/deepseek-r1";
    config.businessRules = {
      warranty: formWarranty.trim() || "Não trabalhamos com garantia",
      shippingDeadline: formShippingDeadline.trim() || "48h úteis",
      wholesaleMinQty: parseInt(formWholesaleMinQty) || 10,
      paymentMethod: formPaymentMethod.trim() || "Pix",
    };
    formWa = config.whatsapp; // cleaned digits only
    saveConfig();
    addFeed(
      "system",
      `Config salva — WA: ...${config.whatsapp.slice(-4) || "???"}, Pix: ${config.pix ? "✓" : "✗"}, Modelo: ${config.llmModel}`,
    );
    // Show saved badge via state (no getElementById)
    showConfigSaved = true;
    if (configSavedTimer) {
      clearTimeout(configSavedTimer);
    }
    configSavedTimer = window.setTimeout(() => {
      showConfigSaved = false;
      updater();
    }, 2500);
    updater();
  };

  const handleTestForward = () => {
    if (!config.whatsapp) {
      addFeed("system", "⚠️ Configure o número do escritório antes de testar");
      updater();
      return;
    }
    const testMsg = buildForwardMsg({
      customer: "Cliente Teste",
      items: [{ quantity: 1, name: "Produto Teste", sku: "TEST-001", flavor: "Grape Ice" }],
      total: 99.9,
      address: "Rua Exemplo, 123 — São Paulo/SP",
      cep: "01234-567",
    });
    addFeed("forward", `📤 Teste:\n${testMsg}`);
    updater();
  };

  const handleClearFeed = () => {
    feed = [];
    saveLocal();
    updater();
  };

  const handleRefreshOrders = () => {
    loadOrders(updater);
  };

  const handleFilterChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global API bridge
    (window as any).__tvFilter = select.value;
    updater();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global API bridge
  const filter = (window as any).__tvFilter ?? "all";
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const sorted = [...filtered].toSorted((a, b) => b.createdAt - a.createdAt);

  return html`
    <div class="tv-dashboard">
      <!-- Date -->
      <div class="tv-date">${today}</div>

      <!-- KPI Cards -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi"><span class="tv-kpi-icon">💰</span><div><div class="tv-kpi-value">${fmt(k.revenue)}</div><div class="tv-kpi-label">Faturamento Hoje</div></div></div>
        <div class="tv-kpi"><span class="tv-kpi-icon">📦</span><div><div class="tv-kpi-value">${k.pending}</div><div class="tv-kpi-label">Pedidos Pendentes</div></div></div>
        <div class="tv-kpi"><span class="tv-kpi-icon">✅</span><div><div class="tv-kpi-value">${k.completed}</div><div class="tv-kpi-label">Concluídos Hoje</div></div></div>
        <div class="tv-kpi"><span class="tv-kpi-icon">🎫</span><div><div class="tv-kpi-value">${fmt(k.ticket)}</div><div class="tv-kpi-label">Ticket Médio</div></div></div>
      </div>

      <!-- Orders + Feed -->
      <div class="tv-content-grid">
        <div class="tv-panel">
          <div class="tv-panel-header">
            <h3>Pedidos ${ordersLoading ? html`<span class="tv-badge tv-badge--writing">carregando...</span>` : nothing}</h3>
            ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ ${error.length > 40 ? error.slice(0, 40) + "..." : error}</span>` : nothing}
            <button class="tv-btn-sm" @click=${handleRefreshOrders} title="Atualizar pedidos do servidor">🔄</button>
            <select class="tv-select" @change=${handleFilterChange}>
              <option value="all" ?selected=${filter === "all"}>Todos</option>
              <option value="novo" ?selected=${filter === "novo"}>Novo</option>
              <option value="pago" ?selected=${filter === "pago"}>Pago</option>
              <option value="separado" ?selected=${filter === "separado"}>Separado</option>
              <option value="enviado" ?selected=${filter === "enviado"}>Enviado</option>
            </select>
          </div>
          <div class="tv-table-wrap">
            <table class="tv-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Produtos</th><th>Total</th><th>Status</th><th>Hora</th><th></th></tr></thead>
              <tbody>
                ${
                  sorted.length === 0
                    ? html`<tr><td colspan="7" class="tv-empty">Nenhum pedido ${filter !== "all" ? `com status "${filter}"` : ""}.</td></tr>`
                    : sorted.map((o) => {
                        const prods = o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
                        return html`
                        <tr class="tv-order-row" style="cursor:pointer;${selectedOrderId === o.id ? "background:rgba(107,15,26,0.08);" : ""}" @click=${() => { selectedOrderId = selectedOrderId === o.id ? null : o.id; updater(); }}>
                          <td class="tv-order-id">${o.id}</td>
                          <td>${o.customer}</td>
                          <td class="tv-products-cell" title=${prods}>${prods}</td>
                          <td class="tv-order-total">${fmt(o.total)}</td>
                          <td><span class="tv-badge tv-badge--${o.status}">${o.status.toUpperCase()}</span></td>
                          <td>${fmtTime(o.createdAt)}</td>
                          <td>
                            ${deleteOrderTarget === o.id ? html`
                              <span style="display:flex;gap:4px;align-items:center;" @click=${(e: Event) => e.stopPropagation()}>
                                <button class="tv-btn-sm tv-btn-sm--danger" @click=${() => { apiDeleteOrder(o.id, updater); deleteOrderTarget = null; }} title="Confirmar exclusao">✓</button>
                                <button class="tv-btn-sm" @click=${() => { deleteOrderTarget = null; updater(); }} title="Cancelar">✗</button>
                              </span>
                            ` : html`
                              <button class="tv-btn-sm" style="color:#ef4444;font-size:0.8rem;" @click=${(e: Event) => { e.stopPropagation(); deleteOrderTarget = o.id; updater(); }} title="Excluir pedido">🗑️</button>
                            `}
                          </td>
                        </tr>`;
                      })
                }
              </tbody>
            </table>
          </div>
          <!-- M6: Order detail panel -->
          ${(() => {
            const sel = selectedOrderId ? sorted.find((o) => o.id === selectedOrderId) : null;
            if (!sel) return nothing;
            return html`
              <div style="margin-top:12px;padding:12px;border-radius:10px;background:rgba(107,15,26,0.05);border:1px solid rgba(107,15,26,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <h4 style="margin:0;font-size:1rem;">Detalhes — ${sel.id}</h4>
                  <button class="tv-btn-sm" @click=${() => { selectedOrderId = null; updater(); }}>✕ Fechar</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
                  <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Cliente</span><br/><strong>${sel.customer}</strong></div>
                  <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Total</span><br/><strong>${fmt(sel.total)}</strong></div>
                  <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Status</span><br/><span class="tv-badge tv-badge--${sel.status}">${sel.status.toUpperCase()}</span></div>
                  <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Hora</span><br/><strong>${fmtTime(sel.createdAt)}</strong></div>
                </div>
                ${sel.items.length > 0 ? html`
                  <div style="margin-top:10px;">
                    <span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Produtos</span>
                    <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
                      ${sel.items.map((item) => html`
                        <div style="display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.03);">
                          <span>${item.quantity}x ${item.name} ${item.sku ? html`<span style="font-size:0.75rem;color:var(--tv-text-muted)">(${item.sku})</span>` : nothing}</span>
                          ${item.price ? html`<span>${fmt(item.price * item.quantity)}</span>` : nothing}
                        </div>
                      `)}
                    </div>
                  </div>
                ` : nothing}
                <div style="margin-top:10px;display:flex;gap:8px;">
                  <select class="tv-select" @change=${(e: Event) => {
                    const newStatus = (e.target as HTMLSelectElement).value;
                    apiUpdateOrderStatus(sel.id, newStatus, updater);
                  }} .value=${sel.status}>
                    <option value="novo">Novo</option>
                    <option value="pago">Pago</option>
                    <option value="separado">Separado</option>
                    <option value="enviado">Enviado</option>
                  </select>
                </div>
              </div>
            `;
          })()}
        </div>

        <div class="tv-panel">
          <div class="tv-panel-header">
            <h3>Feed de Atividades</h3>
            <button class="tv-btn-sm" @click=${handleClearFeed}>Limpar</button>
          </div>
          <div class="tv-feed">
            ${
              feed.length === 0
                ? html`
                    <div class="tv-empty">Aguardando eventos...</div>
                  `
                : feed.slice(0, 20).map(
                    (ev, i) => html`
                  <div class="tv-feed-item ${i === 0 ? "tv-feed-item--latest" : ""}">
                    <span class="tv-feed-icon">${ev.icon}</span>
                    <span class="tv-feed-msg">${ev.message}</span>
                    <span class="tv-feed-time">${fmtTime(ev.time)}</span>
                  </div>`,
                  )
            }
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div class="tv-panel">
        <h3>Métricas de Conversão</h3>
        <div class="tv-metrics-grid">
          <div class="tv-metric"><div class="tv-metric-label">Conversas Iniciadas</div><div class="tv-metric-value">${metrics.conversations}</div></div>
          <div class="tv-metric"><div class="tv-metric-label">Catálogos Abertos</div><div class="tv-metric-value">${metrics.catalogs}</div></div>
          <div class="tv-metric"><div class="tv-metric-label">Checkouts Enviados</div><div class="tv-metric-value">${metrics.checkouts}</div></div>
          <div class="tv-metric"><div class="tv-metric-label">Pagamentos Confirmados</div><div class="tv-metric-value">${metrics.payments}</div></div>
          <div class="tv-metric"><div class="tv-metric-label">Taxa de Conversão</div><div class="tv-metric-value tv-gold">${rate}%</div></div>
        </div>
      </div>

      <!-- Config Header -->
      <div class="tv-panel-header" style="margin-bottom:0;">
        <h3>⚙️ Configurações</h3>
        ${
          showConfigSaved
            ? html`
                <span class="tv-saved-badge">✓ Salvo</span>
              `
            : nothing
        }
      </div>

      <!-- Config Cards Grid -->
      <div class="tv-settings-grid">

        <!-- Card: Loja & Pagamento -->
        <div class="tv-settings-card">
          <div class="tv-settings-card-header">
            <span class="tv-settings-card-icon">💳</span>
            <div>
              <h4 class="tv-settings-card-title">Loja & Pagamento</h4>
              <p class="tv-settings-card-desc">WhatsApp, Pix e nome da loja</p>
            </div>
          </div>
          <div class="tv-settings-card-body">
            <div class="tv-config-field">
              <label>WhatsApp do Escritório</label>
              <input type="tel" .value=${formWa} @input=${(e: Event) => {
                formWa = (e.target as HTMLInputElement).value;
              }} placeholder="5511999999999" />
            </div>
            <div class="tv-config-field">
              <label>Chave Pix</label>
              <input type="text" .value=${formPix} @input=${(e: Event) => {
                formPix = (e.target as HTMLInputElement).value;
              }} placeholder="email@loja.com ou CPF/CNPJ" />
            </div>
            <div class="tv-config-field">
              <label>Nome da Loja</label>
              <input type="text" .value=${formName} @input=${(e: Event) => {
                formName = (e.target as HTMLInputElement).value;
              }} placeholder="Troy Vape" />
            </div>
          </div>
        </div>

        <!-- Card: Horário de Atendimento -->
        <div class="tv-settings-card">
          <div class="tv-settings-card-header">
            <span class="tv-settings-card-icon">🕐</span>
            <div>
              <h4 class="tv-settings-card-title">Horário de Atendimento</h4>
              <p class="tv-settings-card-desc">Dias e horários de funcionamento</p>
            </div>
          </div>
          <div class="tv-settings-card-body">
            <div class="tv-config-field">
              <label>Segunda a Sexta</label>
              <input type="text" .value=${formHoursWeekdays} @input=${(e: Event) => {
                formHoursWeekdays = (e.target as HTMLInputElement).value;
              }} placeholder="08:00-17:00" />
              <span class="tv-hint">HH:MM-HH:MM (vazio = fechado)</span>
            </div>
            <div class="tv-config-field">
              <label>Sábado</label>
              <input type="text" .value=${formHoursSaturday} @input=${(e: Event) => {
                formHoursSaturday = (e.target as HTMLInputElement).value;
              }} placeholder="08:00-16:00" />
            </div>
            <div class="tv-config-field">
              <label>Domingo</label>
              <input type="text" .value=${formHoursSunday} @input=${(e: Event) => {
                formHoursSunday = (e.target as HTMLInputElement).value;
              }} placeholder="Fechado (deixe vazio)" />
            </div>
          </div>
        </div>

        <!-- Card: Modelo de IA -->
        <div class="tv-settings-card">
          <div class="tv-settings-card-header">
            <span class="tv-settings-card-icon">🤖</span>
            <div>
              <h4 class="tv-settings-card-title">Modelo de IA</h4>
              <p class="tv-settings-card-desc">Motor que responde seus clientes</p>
            </div>
          </div>
          <div class="tv-settings-card-body">
            <div class="tv-config-field">
              <label>Modelo LLM (OpenRouter)</label>
              <select class="tv-select tv-select-full" .value=${formLlmModel} @change=${(
                e: Event,
              ) => {
                formLlmModel = (e.target as HTMLSelectElement).value;
              }}>
                <option value="deepseek/deepseek-r1" ?selected=${formLlmModel === "deepseek/deepseek-r1"}>DeepSeek R1 (Reasoning)</option>
                <option value="qwen/qwq-32b" ?selected=${formLlmModel === "qwen/qwq-32b"}>Qwen QwQ 32B</option>
                <option value="anthropic/claude-sonnet-4" ?selected=${formLlmModel === "anthropic/claude-sonnet-4"}>Claude Sonnet 4</option>
                <option value="anthropic/claude-haiku-4" ?selected=${formLlmModel === "anthropic/claude-haiku-4"}>Claude Haiku 4</option>
                <option value="openai/gpt-4o" ?selected=${formLlmModel === "openai/gpt-4o"}>GPT-4o</option>
                <option value="openai/gpt-4o-mini" ?selected=${formLlmModel === "openai/gpt-4o-mini"}>GPT-4o Mini</option>
                <option value="google/gemini-2.5-flash" ?selected=${formLlmModel === "google/gemini-2.5-flash"}>Gemini 2.5 Flash</option>
              </select>
              <span class="tv-hint">Modelos com reasoning pensam antes de responder</span>
            </div>
          </div>
        </div>

        <!-- Card: Regras de Negócio -->
        <div class="tv-settings-card">
          <div class="tv-settings-card-header">
            <span class="tv-settings-card-icon">📋</span>
            <div>
              <h4 class="tv-settings-card-title">Regras de Negócio</h4>
              <p class="tv-settings-card-desc">Garantia, envio, atacado e pagamento</p>
            </div>
          </div>
          <div class="tv-settings-card-body">
            <div class="tv-config-field">
              <label>Política de Garantia</label>
              <input type="text" .value=${formWarranty} @input=${(e: Event) => {
                formWarranty = (e.target as HTMLInputElement).value;
              }} placeholder="Não trabalhamos com garantia" />
            </div>
            <div class="tv-config-field">
              <label>Prazo de Envio</label>
              <input type="text" .value=${formShippingDeadline} @input=${(e: Event) => {
                formShippingDeadline = (e.target as HTMLInputElement).value;
              }} placeholder="48h úteis" />
            </div>
            <div class="tv-settings-card-row">
              <div class="tv-config-field">
                <label>Qtd Mín. Atacado</label>
                <input type="number" .value=${formWholesaleMinQty} @input=${(e: Event) => {
                  formWholesaleMinQty = (e.target as HTMLInputElement).value;
                }} placeholder="10" min="1" />
              </div>
              <div class="tv-config-field">
                <label>Pagamento</label>
                <input type="text" .value=${formPaymentMethod} @input=${(e: Event) => {
                  formPaymentMethod = (e.target as HTMLInputElement).value;
                }} placeholder="Pix" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Config Actions -->
      <div class="tv-config-actions">
        <button class="tv-btn-gold" @click=${handleSaveConfig}>Salvar Configurações</button>
        <button class="tv-btn-outline" @click=${handleTestForward}>📤 Testar Encaminhamento</button>
      </div>
    </div>
  `;
}
