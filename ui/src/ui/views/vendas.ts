import { html, nothing } from "lit";

/* ── Storage Keys ────────────────────────────────────────────── */
const STORAGE_KEY = "troy_vape_orders";
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

interface VapeConfig {
  whatsapp: string;
  pix: string;
  storeName: string;
}

/* ── State (module-scoped, survives re-renders) ──────────────── */
let orders: Order[] = [];
let feed: FeedEvent[] = [];
let metrics: Metrics = { conversations: 0, catalogs: 0, checkouts: 0, payments: 0 };
let config: VapeConfig = { whatsapp: "", pix: "", storeName: "Troy Vape" };
let loaded = false;
let configSavedTimer: number | null = null;

/* ── Persistence ─────────────────────────────────────────────── */
function load() {
  if (loaded) return;
  try {
    const o = localStorage.getItem(STORAGE_KEY);
    if (o) orders = JSON.parse(o);
    const f = localStorage.getItem(FEED_KEY);
    if (f) feed = JSON.parse(f);
    const m = localStorage.getItem(METRICS_KEY);
    if (m) metrics = { ...metrics, ...JSON.parse(m) };
    const c = localStorage.getItem(CONFIG_KEY);
    if (c) config = { ...config, ...JSON.parse(c) };
  } catch { /* ignore corrupt data */ }
  loaded = true;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

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
    message: "💬", checkout: "🛒", payment: "💰",
    forward: "📦", system: "⚙️", catalog: "📋",
  };
  feed.unshift({ icon: icons[type] ?? "📌", message, time: Date.now() });
  if (feed.length > 50) feed = feed.slice(0, 50);
  save();
}

function buildForwardMsg(orderData: { customer?: string; items?: OrderItem[]; total?: number; address?: string; cep?: string; paymentStatus?: string }) {
  const store = config.storeName || "Troy Vape";
  const items = (orderData.items ?? []).map(i => {
    let line = `- ${i.quantity}x ${i.name} (${i.sku})`;
    if (i.flavor) line += `\n  Sabor: ${i.flavor}`;
    return line;
  }).join("\n");
  return [
    `🚨 NOVO PEDIDO - ${store.toUpperCase()} 🚨`,
    "--------------------------------",
    `CLIENTE: ${orderData.customer ?? "Anônimo"}`,
    "PRODUTOS:", items,
    "--------------------------------",
    "ENTREGA:", orderData.address ?? "(endereço pendente)",
    `CEP: ${orderData.cep ?? "(pendente)"}`,
    "--------------------------------",
    `TOTAL: ${fmt(orderData.total ?? 0)}`,
    `STATUS: ${(orderData.paymentStatus ?? "PAGO").toUpperCase()} (Comprovante recebido)`,
  ].join("\n");
}

/* ── Demo data (first time only) ─────────────────────────────── */
function ensureDemo() {
  if (orders.length > 0) return;
  const demo = [
    { customer: "João Silva", items: [{ quantity: 2, name: "Ignite V15", sku: "IGNITE-V15", price: 69.92 }], total: 139.84 },
    { customer: "Maria Costa", items: [{ quantity: 1, name: "ElfBar BC Pro", sku: "ELFBAR-BC-PRO", price: 94.95 }, { quantity: 1, name: "Nikbar 30.000", sku: "NIKBAR-30000", price: 64.95 }], total: 159.90 },
  ];
  demo.forEach(d => {
    orders.push({ id: genId(), customer: d.customer, items: d.items, total: d.total, status: "novo", createdAt: Date.now(), isNew: false });
  });
  if (orders.length >= 1) orders[0].status = "pago";
  metrics = { conversations: 15, catalogs: 10, checkouts: 5, payments: 3 };
  save();
}

/* ── Public API (window.troyDashboard) ───────────────────────── */
function exposeApi(requestUpdate: () => void) {
  (window as any).troyDashboard = {
    addOrder(data: { customer?: string; items?: OrderItem[]; total?: number }) {
      const order: Order = { id: genId(), customer: data.customer ?? "Anônimo", items: data.items ?? [], total: data.total ?? 0, status: "novo", createdAt: Date.now(), isNew: true };
      orders.push(order);
      save();
      addFeed("checkout", `Novo pedido ${order.id} de ${order.customer} — ${fmt(order.total)}`);
      requestUpdate();
      return order.id;
    },
    updateStatus(orderId: string, newStatus: string) {
      const o = orders.find(x => x.id === orderId);
      if (!o) return false;
      const old = o.status;
      o.status = newStatus;
      save();
      addFeed("system", `Pedido ${orderId}: ${old.toUpperCase()} → ${newStatus.toUpperCase()}`);
      requestUpdate();
      return true;
    },
    trackEvent(type: string) {
      if (type in metrics) { (metrics as any)[type]++; save(); requestUpdate(); }
    },
    logActivity(type: string, msg: string) { addFeed(type, msg); requestUpdate(); },
    getOrders: () => [...orders],
    getMetrics: () => ({ ...metrics }),
    getConfig: () => ({ ...config }),
    forwardOrder(data: { customer?: string; items?: OrderItem[]; total?: number; address?: string; cep?: string }) {
      const msg = buildForwardMsg(data);
      if (!config.whatsapp) {
        addFeed("system", "⚠️ Número do escritório não configurado!");
        requestUpdate();
        return { success: false, reason: "no_whatsapp_configured" };
      }
      addFeed("forward", `Pedido encaminhado para escritório (...${config.whatsapp.slice(-4)})`);
      requestUpdate();
      return { success: true, whatsapp: config.whatsapp, pix: config.pix, message: msg };
    },
  };
}

/* ── KPI computation ─────────────────────────────────────────── */
function kpis() {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const paid = todayOrders.filter(o => ["pago", "separado", "enviado"].includes(o.status));
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const pending = todayOrders.filter(o => o.status === "novo").length;
  const completed = todayOrders.filter(o => ["separado", "enviado"].includes(o.status)).length;
  const ticket = paid.length > 0 ? revenue / paid.length : 0;
  return { revenue, pending, completed, ticket };
}

/* ── Render (pure Lit html) ──────────────────────────────────── */
export interface VendasRenderState {
  requestUpdate: () => void;
}

export function renderVendas(state: VendasRenderState) {
  load();
  ensureDemo();
  exposeApi(state.requestUpdate);

  const k = kpis();
  const rate = metrics.conversations > 0 ? ((metrics.payments / metrics.conversations) * 100).toFixed(1) : "0";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const handleSaveConfig = () => {
    const waInput = document.getElementById("cfg-wa") as HTMLInputElement | null;
    const pixInput = document.getElementById("cfg-pix") as HTMLInputElement | null;
    const nameInput = document.getElementById("cfg-name") as HTMLInputElement | null;
    config.whatsapp = (waInput?.value ?? "").replace(/\D/g, "");
    config.pix = (pixInput?.value ?? "").trim();
    config.storeName = (nameInput?.value ?? "").trim() || "Troy Vape";
    saveConfig();
    if (waInput) waInput.value = config.whatsapp;
    addFeed("system", `Configurações atualizadas — WA: ...${config.whatsapp.slice(-4) || "???"}, Pix: ${config.pix ? "✓" : "✗"}`);
    // Show saved badge
    configSavedTimer && clearTimeout(configSavedTimer);
    const badge = document.getElementById("tv-config-saved");
    if (badge) badge.style.display = "inline-block";
    configSavedTimer = window.setTimeout(() => { if (badge) badge.style.display = "none"; }, 2500);
    state.requestUpdate();
  };

  const handleTestForward = () => {
    if (!config.whatsapp) {
      addFeed("system", "⚠️ Configure o número do escritório antes de testar");
      state.requestUpdate();
      return;
    }
    const testMsg = buildForwardMsg({ customer: "Cliente Teste", items: [{ quantity: 1, name: "Produto Teste", sku: "TEST-001", flavor: "Grape Ice" }], total: 99.90, address: "Rua Exemplo, 123 — São Paulo/SP", cep: "01234-567" });
    addFeed("forward", `📤 Teste:\n${testMsg}`);
    state.requestUpdate();
  };

  const handleClearFeed = () => {
    feed = [];
    save();
    state.requestUpdate();
  };

  const handleFilterChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    (window as any).__tvFilter = select.value;
    state.requestUpdate();
  };

  const filter = (window as any).__tvFilter ?? "all";
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

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
            <h3>Pedidos</h3>
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
              <thead><tr><th>ID</th><th>Cliente</th><th>Produtos</th><th>Total</th><th>Status</th><th>Hora</th></tr></thead>
              <tbody>
                ${sorted.length === 0
                  ? html`<tr><td colspan="6" class="tv-empty">Nenhum pedido ${filter !== "all" ? `com status "${filter}"` : ""}.</td></tr>`
                  : sorted.map(o => {
                      const prods = o.items.map(i => `${i.quantity}x ${i.name}`).join(", ");
                      return html`
                        <tr class="tv-order-row">
                          <td class="tv-order-id">${o.id}</td>
                          <td>${o.customer}</td>
                          <td class="tv-products-cell" title=${prods}>${prods}</td>
                          <td class="tv-order-total">${fmt(o.total)}</td>
                          <td><span class="tv-badge tv-badge--${o.status}">${o.status.toUpperCase()}</span></td>
                          <td>${fmtTime(o.createdAt)}</td>
                        </tr>`;
                    })}
              </tbody>
            </table>
          </div>
        </div>

        <div class="tv-panel">
          <div class="tv-panel-header">
            <h3>Feed de Atividades</h3>
            <button class="tv-btn-sm" @click=${handleClearFeed}>Limpar</button>
          </div>
          <div class="tv-feed">
            ${feed.length === 0
              ? html`<div class="tv-empty">Aguardando eventos...</div>`
              : feed.slice(0, 20).map((ev, i) => html`
                  <div class="tv-feed-item ${i === 0 ? "tv-feed-item--latest" : ""}">
                    <span class="tv-feed-icon">${ev.icon}</span>
                    <span class="tv-feed-msg">${ev.message}</span>
                    <span class="tv-feed-time">${fmtTime(ev.time)}</span>
                  </div>`)}
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

      <!-- Config -->
      <div class="tv-panel">
        <div class="tv-panel-header">
          <h3>⚙️ Configurações</h3>
          <span id="tv-config-saved" class="tv-saved-badge" style="display:none;">✓ Salvo</span>
        </div>
        <div class="tv-config-grid">
          <div class="tv-config-field">
            <label>📱 WhatsApp do Escritório</label>
            <input type="tel" id="cfg-wa" .value=${config.whatsapp} placeholder="5511999999999" />
            <span class="tv-hint">Número completo com DDI+DDD</span>
          </div>
          <div class="tv-config-field">
            <label>🔑 Chave Pix da Loja</label>
            <input type="text" id="cfg-pix" .value=${config.pix} placeholder="email@loja.com ou CPF/CNPJ" />
            <span class="tv-hint">Email, CPF, CNPJ ou chave aleatória</span>
          </div>
          <div class="tv-config-field">
            <label>🏪 Nome da Loja</label>
            <input type="text" id="cfg-name" .value=${config.storeName} placeholder="Troy Vape" />
            <span class="tv-hint">Usado no cabeçalho do catálogo e nas mensagens</span>
          </div>
        </div>
        <div class="tv-config-actions">
          <button class="tv-btn-gold" @click=${handleSaveConfig}>Salvar Configurações</button>
          <button class="tv-btn-outline" @click=${handleTestForward}>📤 Testar Encaminhamento</button>
        </div>
      </div>
    </div>
  `;
}
