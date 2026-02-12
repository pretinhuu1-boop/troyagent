import { html, nothing } from "lit";
import type { GatewayBrowserClient } from "../gateway.ts";

/* ── Relationship with Canvas CRM ────────────────────────────
 * The Canvas CRM module lives at `src/canvas-host/vape-dashboard/crm.js`.
 * The agent interacts with it via `canvas eval` → `window.troyCRM.*`.
 * Both share the same localStorage keys and stay in sync automatically.
 * This Lit version is the operator-facing UI for viewing and managing contacts.
 * ────────────────────────────────────────────────────────────── */

/* ── Storage Keys ────────────────────────────────────────────── */
const CRM_CONTACTS_KEY = "troy_crm_contacts";
const CRM_INTERACTIONS_KEY = "troy_crm_interactions";

/* ── Types ───────────────────────────────────────────────────── */
interface Contact {
  phone: string;
  name: string;
  stage: string;
  tags: string[];
  firstContact: number;
  lastContact: number;
  totalOrders: number;
  totalSpent: number;
  notes: string;
}

interface Interaction {
  phone: string;
  intent: string;
  products: string[];
  timestamp: number;
}

interface WhatsAppStatus {
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  lastConnectedAt?: number;
  lastMessageAt?: number;
  lastError?: string;
}

type StageFilter = "all" | "new" | "interested" | "negotiating" | "ordered" | "paid" | "delivered" | "returning";
type WaStep = "idle" | "loading" | "qr" | "waiting" | "connected" | "error";

const STAGE_LABELS: Record<string, string> = {
  new: "Novo", interested: "Interessado", negotiating: "Negociando",
  ordered: "Pedido Feito", paid: "Pago", delivered: "Entregue", returning: "Recorrente",
};

const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6", interested: "#8b5cf6", negotiating: "#f59e0b",
  ordered: "#f97316", paid: "#10b981", delivered: "#06b6d4", returning: "#d4a017",
};

/* ── State ───────────────────────────────────────────────────── */
let contacts: Record<string, Contact> = {};
let interactions: Interaction[] = [];
let stageFilter: StageFilter = "all";
let searchQuery = "";
let selectedPhone: string | null = null;
let initialized = false;
let requestUpdateFn: (() => void) | null = null;

// WhatsApp connection state
let waStep: WaStep = "idle";
let waQrDataUrl: string | null = null;
let waMessage: string | null = null;
let waStatus: WhatsAppStatus | null = null;
let waStatusLoading = false;
let clientRef: GatewayBrowserClient | null = null;

/* ── Persistence ─────────────────────────────────────────────── */
function loadCRM() {
  try {
    const savedContacts = localStorage.getItem(CRM_CONTACTS_KEY);
    if (savedContacts) contacts = JSON.parse(savedContacts);
    const savedInteractions = localStorage.getItem(CRM_INTERACTIONS_KEY);
    if (savedInteractions) interactions = JSON.parse(savedInteractions);
  } catch { /* ignore */ }
}

/* ── Helpers ──────────────────────────────────────────────────── */
function formatPrice(val: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  return `...${phone.slice(-4)}`;
}

function getFilteredContacts(): Contact[] {
  let list = Object.values(contacts);
  if (stageFilter !== "all") list = list.filter((c) => c.stage === stageFilter);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }
  return list.sort((a, b) => b.lastContact - a.lastContact);
}

function getContactInteractions(phone: string): Interaction[] {
  return interactions.filter((i) => i.phone === phone).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
}

function getStats() {
  const all = Object.values(contacts);
  const now = Date.now();
  const day = 86400000;
  return {
    total: all.length,
    activeToday: all.filter((c) => now - c.lastContact < day).length,
    activeWeek: all.filter((c) => now - c.lastContact < 7 * day).length,
    totalRevenue: all.reduce((sum, c) => sum + c.totalSpent, 0),
    byStage: Object.fromEntries(Object.keys(STAGE_LABELS).map((s) => [s, all.filter((c) => c.stage === s).length])),
  };
}

/* ── WhatsApp Actions ────────────────────────────────────────── */
async function loadWhatsAppStatus() {
  if (!clientRef || waStatusLoading) return;
  waStatusLoading = true;
  requestUpdateFn?.();
  try {
    const res = await clientRef.request<{ channels?: { whatsapp?: WhatsAppStatus } }>("channels.status", { probe: false, timeoutMs: 8000 });
    waStatus = res?.channels?.whatsapp ?? null;
    if (waStatus?.connected && waStep !== "connected") {
      waStep = "connected";
      waQrDataUrl = null;
    }
  } catch { waStatus = null; }
  waStatusLoading = false;
  requestUpdateFn?.();
}

async function startQrLogin(force = false) {
  if (!clientRef) return;
  waStep = "loading";
  waMessage = "Gerando QR Code...";
  waQrDataUrl = null;
  requestUpdateFn?.();
  try {
    const res = await clientRef.request<{ message?: string; qrDataUrl?: string }>("web.login.start", { force, timeoutMs: 30000 });
    waQrDataUrl = res.qrDataUrl ?? null;
    waMessage = res.message ?? null;
    waStep = waQrDataUrl ? "qr" : "error";
    if (waQrDataUrl) {
      // Auto-start waiting for scan
      requestUpdateFn?.();
      await waitForScan();
    }
  } catch (err) {
    waMessage = String(err);
    waStep = "error";
  }
  requestUpdateFn?.();
}

async function waitForScan() {
  if (!clientRef) return;
  waStep = "waiting";
  requestUpdateFn?.();
  try {
    const res = await clientRef.request<{ message?: string; connected?: boolean }>("web.login.wait", { timeoutMs: 120000 });
    waMessage = res.message ?? null;
    if (res.connected) {
      waStep = "connected";
      waQrDataUrl = null;
      await loadWhatsAppStatus();
    } else {
      waStep = "qr";
      waMessage = "QR expirou. Clique para gerar outro.";
    }
  } catch (err) {
    waMessage = String(err);
    waStep = "error";
  }
  requestUpdateFn?.();
}

/* ── Render: WhatsApp Connection Panel ───────────────────────── */
function renderWhatsAppPanel(connected: boolean) {
  const isGatewayConnected = connected && clientRef;
  const isWaConnected = waStatus?.connected === true;

  // Connected state — compact green bar
  if (isWaConnected && waStep !== "qr" && waStep !== "waiting" && waStep !== "loading") {
    return html`
      <div class="wa-panel wa-connected">
        <div class="wa-connected-row">
          <span class="wa-status-dot online"></span>
          <span class="wa-connected-label">WhatsApp Conectado</span>
          ${waStatus?.lastMessageAt ? html`<span class="wa-connected-meta">Última msg: ${timeAgo(waStatus.lastMessageAt)}</span>` : nothing}
          <button class="wa-btn-small" @click=${() => loadWhatsAppStatus()}>Atualizar</button>
        </div>
      </div>
    `;
  }

  // Not connected — show connection wizard
  return html`
    <div class="wa-panel">
      <div class="wa-header">
        <div class="wa-header-icon">📱</div>
        <div>
          <h3 class="wa-title">Conectar WhatsApp</h3>
          <p class="wa-subtitle">Vincule o número da loja para o agente atender seus clientes</p>
        </div>
      </div>

      ${!isGatewayConnected ? html`
        <div class="wa-step-content">
          <div class="wa-offline-msg">
            <span class="wa-status-dot offline"></span>
            Gateway offline — conecte ao gateway primeiro
          </div>
        </div>
      ` : html`
        <div class="wa-steps">
          <div class="wa-step ${waStep === "idle" || waStep === "error" ? "active" : waStep === "qr" || waStep === "waiting" || waStep === "connected" ? "done" : ""}">
            <span class="wa-step-num">1</span>
            <span class="wa-step-label">Gerar QR</span>
          </div>
          <div class="wa-step-line"></div>
          <div class="wa-step ${waStep === "qr" || waStep === "waiting" ? "active" : waStep === "connected" ? "done" : ""}">
            <span class="wa-step-num">2</span>
            <span class="wa-step-label">Escanear</span>
          </div>
          <div class="wa-step-line"></div>
          <div class="wa-step ${waStep === "connected" ? "active done" : ""}">
            <span class="wa-step-num">3</span>
            <span class="wa-step-label">Pronto!</span>
          </div>
        </div>

        <div class="wa-step-content">
          ${waStep === "idle" ? html`
            <p class="wa-instruction">Clique abaixo para gerar o QR Code. Depois, abra o WhatsApp no celular da loja e vá em <strong>Dispositivos Vinculados → Vincular Dispositivo</strong>.</p>
            <button class="wa-btn-primary" @click=${() => startQrLogin(false)}>Gerar QR Code</button>
          ` : nothing}

          ${waStep === "loading" ? html`
            <div class="wa-loading">
              <div class="wa-spinner"></div>
              <span>Gerando QR Code...</span>
            </div>
          ` : nothing}

          ${waStep === "qr" && waQrDataUrl ? html`
            <div class="wa-qr-container">
              <div class="wa-qr-frame">
                <img src=${waQrDataUrl} alt="WhatsApp QR Code" class="wa-qr-img" />
              </div>
              <p class="wa-qr-hint">Abra o WhatsApp → Dispositivos Vinculados → Escanear</p>
              <div class="wa-qr-timer">Expira em 3 minutos</div>
            </div>
          ` : nothing}

          ${waStep === "waiting" ? html`
            <div class="wa-loading">
              <div class="wa-spinner"></div>
              <span>Aguardando scan do QR Code...</span>
            </div>
          ` : nothing}

          ${waStep === "connected" ? html`
            <div class="wa-success">
              <span class="wa-success-icon">✅</span>
              <span>WhatsApp conectado com sucesso!</span>
            </div>
          ` : nothing}

          ${waStep === "error" ? html`
            <div class="wa-error">
              <p>${waMessage || "Erro ao conectar. Tente novamente."}</p>
              <button class="wa-btn-primary" @click=${() => startQrLogin(true)}>Tentar Novamente</button>
            </div>
          ` : nothing}
        </div>
      `}
    </div>
  `;
}

/* ── Render: CRM Sections ────────────────────────────────────── */
function renderKPIs() {
  const stats = getStats();
  return html`
    <div class="troy-crm-kpis">
      <div class="troy-crm-kpi"><span class="troy-crm-kpi-value">${stats.total}</span><span class="troy-crm-kpi-label">Contatos</span></div>
      <div class="troy-crm-kpi"><span class="troy-crm-kpi-value">${stats.activeToday}</span><span class="troy-crm-kpi-label">Ativos Hoje</span></div>
      <div class="troy-crm-kpi"><span class="troy-crm-kpi-value">${stats.activeWeek}</span><span class="troy-crm-kpi-label">Ativos Semana</span></div>
      <div class="troy-crm-kpi"><span class="troy-crm-kpi-value">${formatPrice(stats.totalRevenue)}</span><span class="troy-crm-kpi-label">Receita Total</span></div>
    </div>
  `;
}

function renderPipeline() {
  const stats = getStats();
  return html`
    <div class="troy-crm-pipeline">
      ${Object.entries(STAGE_LABELS).map(([stage, label]) => html`
        <div class="troy-crm-pipeline-item ${stageFilter === stage ? "active" : ""}" style="--stage-color: ${STAGE_COLORS[stage] || "#666"}"
          @click=${() => { stageFilter = stageFilter === stage ? "all" : stage as StageFilter; requestUpdateFn?.(); }}>
          <span class="troy-crm-pipeline-count">${stats.byStage[stage] || 0}</span>
          <span class="troy-crm-pipeline-label">${label}</span>
        </div>
      `)}
    </div>
  `;
}

function renderContactList() {
  const filtered = getFilteredContacts();
  return html`
    <div class="troy-crm-contacts-header">
      <input type="text" class="troy-crm-search" placeholder="Buscar por nome ou telefone..." .value=${searchQuery}
        @input=${(e: Event) => { searchQuery = (e.target as HTMLInputElement).value; requestUpdateFn?.(); }} />
      <span class="troy-crm-count">${filtered.length} contatos</span>
    </div>
    <div class="troy-crm-contact-list">
      ${filtered.length === 0
        ? html`<div class="troy-crm-empty">Nenhum contato ${stageFilter !== "all" ? `com estágio "${STAGE_LABELS[stageFilter]}"` : "encontrado"}.</div>`
        : filtered.map((c) => html`
          <div class="troy-crm-contact-row ${selectedPhone === c.phone ? "selected" : ""}"
            @click=${() => { selectedPhone = selectedPhone === c.phone ? null : c.phone; requestUpdateFn?.(); }}>
            <div class="troy-crm-contact-info">
              <span class="troy-crm-contact-name">${c.name}</span>
              <span class="troy-crm-contact-phone">${maskPhone(c.phone)}</span>
            </div>
            <div class="troy-crm-contact-meta">
              <span class="troy-crm-stage-badge" style="background: ${STAGE_COLORS[c.stage] || "#666"}20; color: ${STAGE_COLORS[c.stage] || "#666"}">${STAGE_LABELS[c.stage] || c.stage}</span>
              <span class="troy-crm-contact-time">${timeAgo(c.lastContact)}</span>
            </div>
            ${c.totalOrders > 0 ? html`<div class="troy-crm-contact-stats"><span>${c.totalOrders} pedido${c.totalOrders > 1 ? "s" : ""}</span><span>${formatPrice(c.totalSpent)}</span></div>` : nothing}
          </div>
        `)}
    </div>
  `;
}

function renderContactDetail() {
  if (!selectedPhone || !contacts[selectedPhone]) return nothing;
  const c = contacts[selectedPhone];
  const history = getContactInteractions(selectedPhone);
  return html`
    <div class="troy-crm-detail">
      <div class="troy-crm-detail-header">
        <h3>${c.name}</h3>
        <span class="troy-crm-detail-phone">${c.phone}</span>
        <span class="troy-crm-stage-badge large" style="background: ${STAGE_COLORS[c.stage] || "#666"}20; color: ${STAGE_COLORS[c.stage] || "#666"}">${STAGE_LABELS[c.stage] || c.stage}</span>
      </div>
      <div class="troy-crm-detail-stats">
        <div class="troy-crm-detail-stat"><span class="troy-crm-detail-stat-value">${c.totalOrders}</span><span class="troy-crm-detail-stat-label">Pedidos</span></div>
        <div class="troy-crm-detail-stat"><span class="troy-crm-detail-stat-value">${formatPrice(c.totalSpent)}</span><span class="troy-crm-detail-stat-label">Total Gasto</span></div>
        <div class="troy-crm-detail-stat"><span class="troy-crm-detail-stat-value">${formatDate(c.firstContact)}</span><span class="troy-crm-detail-stat-label">Primeiro Contato</span></div>
        <div class="troy-crm-detail-stat"><span class="troy-crm-detail-stat-value">${timeAgo(c.lastContact)}</span><span class="troy-crm-detail-stat-label">Último Contato</span></div>
      </div>
      ${c.tags.length > 0 ? html`<div class="troy-crm-detail-tags">${c.tags.map((t) => html`<span class="troy-crm-tag">${t}</span>`)}</div>` : nothing}
      ${c.notes ? html`<div class="troy-crm-detail-notes"><strong>Notas:</strong> ${c.notes}</div>` : nothing}
      <div class="troy-crm-detail-history">
        <h4>Histórico de Interações</h4>
        ${history.length === 0 ? html`<div class="troy-crm-empty">Sem interações registradas.</div>`
          : history.map((i) => html`
            <div class="troy-crm-history-item">
              <span class="troy-crm-history-intent ${i.intent}">${i.intent}</span>
              <span class="troy-crm-history-time">${formatDateTime(i.timestamp)}</span>
              ${i.products.length > 0 ? html`<span class="troy-crm-history-products">${i.products.join(", ")}</span>` : nothing}
            </div>
          `)}
      </div>
    </div>
  `;
}

/* ── Styles ───────────────────────────────────────────────────── */
function renderStyles() {
  return html`
    <style>
      .troy-crm { padding: 1rem; }

      /* WhatsApp Panel */
      .wa-panel { background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
      .wa-panel.wa-connected { padding: 0.75rem 1rem; border-color: #25d36620; background: linear-gradient(135deg, #25d36608, transparent); }
      .wa-connected-row { display: flex; align-items: center; gap: 0.75rem; }
      .wa-connected-label { font-weight: 600; color: #25d366; font-size: 0.9rem; }
      .wa-connected-meta { font-size: 0.75rem; color: var(--text-muted, #999); flex: 1; }
      .wa-status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
      .wa-status-dot.online { background: #25d366; box-shadow: 0 0 6px #25d36680; }
      .wa-status-dot.offline { background: #ef4444; }
      .wa-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
      .wa-header-icon { font-size: 2rem; }
      .wa-title { margin: 0; color: var(--text, #eee); font-size: 1.1rem; font-weight: 700; }
      .wa-subtitle { margin: 0.15rem 0 0; color: var(--text-muted, #999); font-size: 0.8rem; }

      /* Steps indicator */
      .wa-steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 1.25rem; }
      .wa-step { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; opacity: 0.4; transition: all 0.3s; }
      .wa-step.active { opacity: 1; }
      .wa-step.done { opacity: 0.7; }
      .wa-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--border, #333); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #999); }
      .wa-step.active .wa-step-num { background: #25d366; color: #fff; }
      .wa-step.done .wa-step-num { background: #25d36640; color: #25d366; }
      .wa-step-label { font-size: 0.65rem; color: var(--text-muted, #999); text-transform: uppercase; letter-spacing: 0.5px; }
      .wa-step.active .wa-step-label { color: #25d366; }
      .wa-step-line { flex: 1; max-width: 60px; height: 2px; background: var(--border, #333); margin: 0 0.5rem; margin-bottom: 1rem; }

      /* Step content */
      .wa-step-content { text-align: center; }
      .wa-instruction { color: var(--text-muted, #999); font-size: 0.85rem; margin: 0 0 1rem; line-height: 1.5; }
      .wa-btn-primary { background: #25d366; color: #fff; border: none; border-radius: 8px; padding: 0.75rem 2rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      .wa-btn-primary:hover { background: #20bd5a; transform: translateY(-1px); }
      .wa-btn-small { background: transparent; color: var(--text-muted, #999); border: 1px solid var(--border, #333); border-radius: 4px; padding: 0.25rem 0.6rem; font-size: 0.7rem; cursor: pointer; }
      .wa-btn-small:hover { border-color: var(--text-muted, #999); }

      /* QR Code display */
      .wa-qr-container { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
      .wa-qr-frame { background: #fff; border-radius: 12px; padding: 16px; display: inline-block; box-shadow: 0 4px 24px rgba(37, 211, 102, 0.15); }
      .wa-qr-img { width: 220px; height: 220px; display: block; image-rendering: pixelated; }
      .wa-qr-hint { color: var(--text-muted, #999); font-size: 0.8rem; margin: 0; }
      .wa-qr-timer { color: #f59e0b; font-size: 0.7rem; font-weight: 600; }

      /* Loading spinner */
      .wa-loading { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1.5rem; color: var(--text-muted, #999); font-size: 0.85rem; }
      .wa-spinner { width: 20px; height: 20px; border: 2px solid var(--border, #333); border-top-color: #25d366; border-radius: 50%; animation: wa-spin 0.8s linear infinite; }
      @keyframes wa-spin { to { transform: rotate(360deg); } }

      /* Success / Error */
      .wa-success { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; font-size: 0.9rem; color: #25d366; font-weight: 600; }
      .wa-success-icon { font-size: 1.5rem; }
      .wa-error { text-align: center; color: #ef4444; font-size: 0.85rem; }
      .wa-error p { margin: 0 0 0.75rem; }
      .wa-offline-msg { display: flex; align-items: center; gap: 0.5rem; justify-content: center; color: var(--text-muted, #999); font-size: 0.85rem; padding: 1rem; }

      /* CRM KPIs */
      .troy-crm-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
      .troy-crm-kpi { background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 8px; padding: 1rem; text-align: center; }
      .troy-crm-kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--gold, #d4a017); }
      .troy-crm-kpi-label { font-size: 0.75rem; color: var(--text-muted, #999); text-transform: uppercase; letter-spacing: 0.5px; }

      /* Pipeline */
      .troy-crm-pipeline { display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto; padding-bottom: 0.25rem; }
      .troy-crm-pipeline-item { flex: 1; min-width: 80px; background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 8px; padding: 0.75rem 0.5rem; text-align: center; cursor: pointer; transition: all 0.2s; }
      .troy-crm-pipeline-item:hover { border-color: var(--stage-color); }
      .troy-crm-pipeline-item.active { border-color: var(--stage-color); background: color-mix(in srgb, var(--stage-color) 10%, var(--bg-2, #1a1a1a)); }
      .troy-crm-pipeline-count { display: block; font-size: 1.25rem; font-weight: 700; color: var(--stage-color); }
      .troy-crm-pipeline-label { font-size: 0.65rem; color: var(--text-muted, #999); text-transform: uppercase; }

      /* Contact list */
      .troy-crm-contacts-header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; }
      .troy-crm-search { flex: 1; padding: 0.5rem 0.75rem; background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 6px; color: var(--text, #eee); font-size: 0.875rem; }
      .troy-crm-search:focus { outline: none; border-color: var(--gold, #d4a017); }
      .troy-crm-count { font-size: 0.75rem; color: var(--text-muted, #999); white-space: nowrap; }
      .troy-crm-contact-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 500px; overflow-y: auto; }
      .troy-crm-contact-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.75rem; background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 6px; cursor: pointer; transition: all 0.15s; }
      .troy-crm-contact-row:hover { border-color: var(--gold, #d4a017); }
      .troy-crm-contact-row.selected { border-color: var(--gold, #d4a017); background: color-mix(in srgb, var(--gold, #d4a017) 5%, var(--bg-2, #1a1a1a)); }
      .troy-crm-contact-info { flex: 1; min-width: 120px; }
      .troy-crm-contact-name { display: block; font-weight: 600; color: var(--text, #eee); font-size: 0.875rem; }
      .troy-crm-contact-phone { font-size: 0.75rem; color: var(--text-muted, #999); }
      .troy-crm-contact-meta { display: flex; gap: 0.5rem; align-items: center; }
      .troy-crm-contact-time { font-size: 0.7rem; color: var(--text-muted, #999); }
      .troy-crm-contact-stats { width: 100%; font-size: 0.7rem; color: var(--text-muted, #999); display: flex; gap: 0.75rem; padding-top: 0.25rem; border-top: 1px solid var(--border, #333); }
      .troy-crm-stage-badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
      .troy-crm-stage-badge.large { font-size: 0.8rem; padding: 0.25rem 0.75rem; }

      /* Detail panel */
      .troy-crm-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      @media (max-width: 768px) { .troy-crm-layout, .troy-crm-kpis { grid-template-columns: 1fr; } }
      .troy-crm-detail { background: var(--bg-2, #1a1a1a); border: 1px solid var(--border, #333); border-radius: 8px; padding: 1rem; }
      .troy-crm-detail-header { margin-bottom: 1rem; }
      .troy-crm-detail-header h3 { margin: 0 0 0.25rem; color: var(--text, #eee); font-size: 1.1rem; }
      .troy-crm-detail-phone { font-size: 0.8rem; color: var(--text-muted, #999); display: block; margin-bottom: 0.5rem; }
      .troy-crm-detail-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
      .troy-crm-detail-stat { text-align: center; padding: 0.5rem; background: var(--bg-1, #111); border-radius: 6px; }
      .troy-crm-detail-stat-value { display: block; font-weight: 700; color: var(--gold, #d4a017); font-size: 0.9rem; }
      .troy-crm-detail-stat-label { font-size: 0.65rem; color: var(--text-muted, #999); text-transform: uppercase; }
      .troy-crm-detail-tags { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
      .troy-crm-tag { padding: 0.15rem 0.5rem; background: color-mix(in srgb, var(--gold, #d4a017) 20%, transparent); color: var(--gold, #d4a017); border-radius: 4px; font-size: 0.7rem; }
      .troy-crm-detail-notes { font-size: 0.8rem; color: var(--text-muted, #999); margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-1, #111); border-radius: 4px; }
      .troy-crm-detail-history h4 { margin: 0 0 0.5rem; font-size: 0.85rem; color: var(--text, #eee); }
      .troy-crm-history-item { display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border, #222); font-size: 0.75rem; }
      .troy-crm-history-intent { padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600; text-transform: uppercase; font-size: 0.6rem; }
      .troy-crm-history-intent.sale { background: #10b98120; color: #10b981; }
      .troy-crm-history-intent.support { background: #f5970b20; color: #f5970b; }
      .troy-crm-history-intent.info { background: #3b82f620; color: #3b82f6; }
      .troy-crm-history-intent.browsing { background: #6b728020; color: #6b7280; }
      .troy-crm-history-time { color: var(--text-muted, #999); }
      .troy-crm-history-products { color: var(--text-muted, #999); font-style: italic; }
      .troy-crm-empty { text-align: center; padding: 2rem; color: var(--text-muted, #999); font-size: 0.85rem; }
    </style>
  `;
}

/* ── Main Export ──────────────────────────────────────────────── */
export function renderCRM(ctx: { requestUpdate: () => void; client: GatewayBrowserClient | null; connected: boolean }) {
  requestUpdateFn = ctx.requestUpdate;
  clientRef = ctx.client;

  if (!initialized) {
    loadCRM();
    window.addEventListener("storage", (e) => {
      if (e.key === CRM_CONTACTS_KEY || e.key === CRM_INTERACTIONS_KEY) {
        loadCRM();
        ctx.requestUpdate();
      }
    });
    // Load WhatsApp status on first render
    if (ctx.connected && ctx.client) {
      loadWhatsAppStatus();
    }
    initialized = true;
  }

  return html`
    ${renderStyles()}
    <div class="troy-crm">
      ${renderWhatsAppPanel(ctx.connected)}
      ${renderKPIs()}
      ${renderPipeline()}
      ${renderContactList()}
      <div class="troy-crm-layout">
        ${renderContactDetail()}
      </div>
    </div>
  `;
}
