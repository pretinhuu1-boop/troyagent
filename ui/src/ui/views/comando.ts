import { html, nothing } from "lit";
import { apiFetch, API_BASE } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";

/* ── Command Center TAURA ────────────────────────────────────
 * Central operations view for the multi-agent TAURA system.
 * Shows: agent squad status, customer pipeline (kanban),
 * decision queue, daily metrics, live activity feed,
 * and automation (cron) status.
 *
 * Data sources:
 *   - Agents: RPC agents-list + sessions-list
 *   - Customers: GET /api/customers (supabase-api.ts)
 *   - Orders: GET /api/orders (supabase-api.ts)
 *   - Activity: WebSocket chat-message + agent-event events
 *   - Cron: RPC cron-list
 *   - Approvals: exec-approval-requested events
 * ──────────────────────────────────────────────────────────── */

/* ── Storage Keys ────────────────────────────────────────── */
const CMD_METRICS_KEY = "troy_cmd_metrics";
const CMD_FEED_KEY = "troy_cmd_feed";

/* ── Types ───────────────────────────────────────────────── */
interface AgentCard {
  id: string;
  name: string;
  emoji: string;
  role: string;
  activeSessions: number;
  status: "active" | "idle";
}

interface CustomerCard {
  id: string;
  name: string;
  phone?: string;
  stage: string;
  lastContact?: string;
  agentId?: string;
}

interface DecisionItem {
  id: string;
  type: "discount" | "publish" | "escalate" | "approval";
  title: string;
  description: string;
  agentName: string;
  createdAt: number;
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  agentName: string;
  action: string;
  target: string;
}

interface DayMetrics {
  messages: number;
  sales: number;
  salesCurrency: string;
  leads: number;
  conversionRate: number;
  llmCost: number;
}

interface CronJobSummary {
  id: string;
  name: string;
  schedule: string;
  nextRun?: string;
  lastRun?: string;
  enabled: boolean;
}

/* ── Agents TAURA ────────────────────────────────────────── */
const TAURA_AGENTS: AgentCard[] = [
  {
    id: "taura-vendas",
    name: "Troy",
    emoji: "\uD83E\uDD1D",
    role: "Vendas",
    activeSessions: 0,
    status: "idle",
  },
  {
    id: "taura-tecnico",
    name: "Dr. Troy",
    emoji: "\uD83E\uDDEC",
    role: "T\u00e9cnico",
    activeSessions: 0,
    status: "idle",
  },
  {
    id: "taura-operacional",
    name: "Troy Ops",
    emoji: "\u2699\uFE0F",
    role: "Operacional",
    activeSessions: 0,
    status: "idle",
  },
  {
    id: "taura-conteudo",
    name: "Troy Creative",
    emoji: "\u2728",
    role: "Conte\u00fado",
    activeSessions: 0,
    status: "idle",
  },
];

/* ── Pipeline Stages ─────────────────────────────────────── */
const PIPELINE_STAGES = ["lead", "prospect", "negotiation", "customer", "lost"] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: "Lead",
  prospect: "Prospect",
  negotiation: "Negocia\u00e7\u00e3o",
  customer: "Cliente",
  lost: "Perdido",
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: "#6B0F1A",
  prospect: "#8a1322",
  negotiation: "#D4A54A",
  customer: "#34D399",
  lost: "#666",
};

/* ── Live Data State (M1-M5) ─────────────────────────────── */
let liveCustomers: CustomerCard[] = [];
let liveCustomersLoaded = false;
let liveDecisions: DecisionItem[] = [];
let liveDecisionsLoaded = false;
let liveCronJobs: CronJobSummary[] | null = null;

async function loadPipelineCustomers() {
  if (liveCustomersLoaded) return;
  try {
    const data = await apiFetch("/customers");
    if (Array.isArray(data)) {
      liveCustomers = data.map((c: Record<string, unknown>) => ({
        id: String(c.id ?? ""),
        name: String(c.name ?? ""),
        phone: c.phone ? String(c.phone) : undefined,
        stage: String(c.type ?? "lead") === "b2b" ? "prospect" : "lead",
        lastContact: c.updated_at ? new Date(String(c.updated_at)).toLocaleDateString("pt-BR") : undefined,
      }));
      liveCustomersLoaded = true;
    }
  } catch (e) {
    console.warn("[comando] Failed to load customers:", e);
  }
}

async function loadDecisions() {
  if (liveDecisionsLoaded) return;
  try {
    const data = await apiFetch("/missions?status=eq.discussing");
    if (Array.isArray(data)) {
      liveDecisions = data.map((m: Record<string, unknown>) => ({
        id: String(m.id ?? ""),
        type: "approval" as const,
        title: String(m.title ?? ""),
        description: String(m.description ?? ""),
        agentName: String(m.coordinator ?? "TAURA"),
        createdAt: m.created_at ? new Date(String(m.created_at)).getTime() : Date.now(),
      }));
      liveDecisionsLoaded = true;
    }
  } catch {
    // Missions API might not exist yet
    liveDecisionsLoaded = true;
  }
}

async function loadCronJobs() {
  if (liveCronJobs !== null) return;
  try {
    const data = await apiFetch("/cron");
    if (Array.isArray(data)) {
      liveCronJobs = data.map((j: Record<string, unknown>) => ({
        id: String(j.id ?? ""),
        name: String(j.name ?? ""),
        schedule: String(j.schedule ?? ""),
        nextRun: j.next_run ? String(j.next_run) : undefined,
        lastRun: j.last_run ? String(j.last_run) : undefined,
        enabled: Boolean(j.enabled ?? true),
      }));
    }
  } catch {
    // Cron API might not exist — keep defaults
  }
}

/* ── Data Loading ────────────────────────────────────────── */

function loadFeed(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(CMD_FEED_KEY);
    return raw ? (JSON.parse(raw) as ActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function loadMetrics(): DayMetrics {
  try {
    const raw = localStorage.getItem(CMD_METRICS_KEY);
    if (raw) {
      return JSON.parse(raw) as DayMetrics;
    }
  } catch {
    /* ignore */
  }
  return { messages: 0, sales: 0, salesCurrency: "BRL", leads: 0, conversionRate: 0, llmCost: 0 };
}

/* ── Render Helpers ──────────────────────────────────────── */

function renderAgentCard(agent: AgentCard) {
  const statusDot = agent.status === "active" ? "active" : "idle";
  return html`
    <div class="cmd-agent-card cmd-agent-card--${statusDot}">
      <div class="cmd-agent-card__emoji">${agent.emoji}</div>
      <div class="cmd-agent-card__info">
        <div class="cmd-agent-card__name">${agent.name}</div>
        <div class="cmd-agent-card__role">${agent.role}</div>
      </div>
      <div class="cmd-agent-card__status">
        <span class="cmd-status-dot cmd-status-dot--${statusDot}"></span>
        <span class="cmd-agent-card__count">${agent.activeSessions}</span>
      </div>
    </div>
  `;
}

function renderPipelineColumn(stage: PipelineStage, customers: CustomerCard[]) {
  const count = customers.length;
  const color = STAGE_COLORS[stage];
  return html`
    <div class="cmd-pipeline-col"
      @dragover=${(e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = "move"; }}
      @drop=${(e: DragEvent) => {
        e.preventDefault();
        const customerId = e.dataTransfer?.getData("text/plain");
        if (customerId) {
          // M5: Move customer to new pipeline stage
          const customer = liveCustomers.find((c) => c.id === customerId);
          if (customer) {
            customer.stage = stage;
            console.info(`[comando] Customer ${customerId} moved to ${stage}`);
          }
        }
      }}>
      <div class="cmd-pipeline-col__header" style="border-top: 3px solid ${color}">
        <span class="cmd-pipeline-col__title">${STAGE_LABELS[stage]}</span>
        <span class="cmd-pipeline-col__count">${count}</span>
      </div>
      <div class="cmd-pipeline-col__cards">
        ${
          customers.length === 0
            ? html`
                <div class="cmd-pipeline-col__empty">--</div>
              `
            : customers.slice(0, 5).map(
                (c) => html`
                <div class="cmd-pipeline-card" draggable="true"
                     @dragstart=${(e: DragEvent) => {
                       e.dataTransfer?.setData("text/plain", c.id);
                       e.dataTransfer!.effectAllowed = "move";
                     }}>
                  <div class="cmd-pipeline-card__name">${c.name}</div>
                  ${c.phone ? html`<div class="cmd-pipeline-card__phone">${c.phone}</div>` : nothing}
                  ${c.lastContact ? html`<div class="cmd-pipeline-card__date">${c.lastContact}</div>` : nothing}
                </div>
              `,
              )
        }
        ${count > 5 ? html`<div class="cmd-pipeline-col__more">+${count - 5} mais</div>` : nothing}
      </div>
    </div>
  `;
}

function renderDecisionItem(item: DecisionItem, onApprove: (id: string) => void, onReject: (id: string) => void) {
  const typeIcons: Record<string, string> = {
    discount: "\u26A0",
    publish: "\uD83D\uDCDD",
    escalate: "\u2753",
    approval: "\uD83D\uDD12",
  };
  const icon = typeIcons[item.type] || "\u26A0";
  return html`
    <div class="cmd-decision-item">
      <span class="cmd-decision-item__icon">${icon}</span>
      <div class="cmd-decision-item__content">
        <div class="cmd-decision-item__title">${item.title}</div>
        <div class="cmd-decision-item__desc">${item.description}</div>
        <div class="cmd-decision-item__agent">${item.agentName}</div>
      </div>
      <div class="cmd-decision-item__actions">
        <button class="cmd-btn cmd-btn--approve" title="Aprovar" @click=${() => onApprove(item.id)}>\u2713</button>
        <button class="cmd-btn cmd-btn--reject" title="Rejeitar" @click=${() => onReject(item.id)}>\u2717</button>
      </div>
    </div>
  `;
}

function renderActivityItem(event: ActivityEvent) {
  const time = new Date(event.timestamp);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  return html`
    <div class="cmd-activity-item">
      <span class="cmd-activity-item__time">${hh}:${mm}</span>
      <span class="cmd-activity-item__agent">${event.agentName}</span>
      <span class="cmd-activity-item__arrow">\u2192</span>
      <span class="cmd-activity-item__action">${event.action}</span>
      <span class="cmd-activity-item__target">${event.target}</span>
    </div>
  `;
}

function renderMetricCard(label: string, value: string | number, suffix?: string) {
  return html`
    <div class="cmd-metric-card">
      <div class="cmd-metric-card__value">${value}${suffix ? html`<small>${suffix}</small>` : nothing}</div>
      <div class="cmd-metric-card__label">${label}</div>
    </div>
  `;
}

function renderCronItem(job: CronJobSummary) {
  return html`
    <div class="cmd-cron-item ${job.enabled ? "" : "cmd-cron-item--disabled"}">
      <div class="cmd-cron-item__name">${job.name}</div>
      <div class="cmd-cron-item__schedule">${job.schedule}</div>
      ${job.nextRun ? html`<div class="cmd-cron-item__next">${job.nextRun}</div>` : nothing}
    </div>
  `;
}

/* ── Main Render ─────────────────────────────────────────── */

/* ── Decision handlers ──────────────────────────────────── */
let decisionFeedback: { id: string; action: string } | null = null;
let decisionFeedbackTimer: number | null = null;

function handleApproveDecision(id: string) {
  decisionFeedback = { id, action: "approved" };
  if (decisionFeedbackTimer) clearTimeout(decisionFeedbackTimer);
  decisionFeedbackTimer = window.setTimeout(() => { decisionFeedback = null; }, 2500);
  // In production, this would POST approval to /api/decisions/:id/approve
  console.info(`[comando] Decision ${id} APPROVED`);
}

function handleRejectDecision(id: string) {
  decisionFeedback = { id, action: "rejected" };
  if (decisionFeedbackTimer) clearTimeout(decisionFeedbackTimer);
  decisionFeedbackTimer = window.setTimeout(() => { decisionFeedback = null; }, 2500);
  // In production, this would POST rejection to /api/decisions/:id/reject
  console.info(`[comando] Decision ${id} REJECTED`);
}

export function renderComando({ state }: { state: { connected: boolean } }) {
  const agents = TAURA_AGENTS;
  const metrics = loadMetrics();
  const feed = loadFeed();

  // M1: Load decisions from API (missions with status "discussing")
  void loadDecisions();

  // M2: Load customers from API for pipeline
  void loadPipelineCustomers();

  // M3: Load cron jobs from API
  void loadCronJobs();

  // Group customers by pipeline stage
  const customersByStage: Record<PipelineStage, CustomerCard[]> = {
    lead: [],
    prospect: [],
    negotiation: [],
    customer: [],
    lost: [],
  };
  for (const c of liveCustomers) {
    const stage = (PIPELINE_STAGES as readonly string[]).includes(c.stage)
      ? (c.stage as PipelineStage)
      : "lead";
    customersByStage[stage].push(c);
  }

  // Use live decisions (from missions with status "discussing")
  const decisions: DecisionItem[] = liveDecisions;

  // M3: Use live cron jobs with fallback to defaults
  const cronJobs: CronJobSummary[] = liveCronJobs ?? [
    { id: "1", name: "Post Semanal", schedule: "Seg 9h", enabled: true },
    { id: "2", name: "Relat\u00f3rio Di\u00e1rio", schedule: "18h", enabled: true },
    { id: "3", name: "Follow-up 48h", schedule: "10h", enabled: true },
    { id: "4", name: "Alerta Estoque", schedule: "8h", enabled: true },
  ];

  const isLive = state.connected;

  return html`
    <div class="tv-dashboard cmd-center">
      <!-- Header -->
      <div class="cmd-header">
        <div class="cmd-header__title">
          <span class="cnt-agent-badge"><span class="cnt-agent-badge__emoji">\u26A1</span>Todos</span>
          COMANDO CENTRAL
        </div>
        <div class="cmd-header__status">
          ${
            isLive
              ? html`
                  <span class="cmd-live-badge"><span class="cmd-live-dot"></span> LIVE</span>
                `
              : html`
                  <span class="cmd-offline-badge">OFFLINE</span>
                `
          }
        </div>
      </div>

      <!-- Main Grid -->
      <div class="cmd-grid">
        <!-- Left Sidebar: Agents + Automations -->
        <aside class="cmd-sidebar">
          <!-- Agent Squad -->
          <div class="tv-panel cmd-panel">
            <h3 class="tv-panel__title">EQUIPE</h3>
            <div class="cmd-agents-list">
              ${agents.map((a) => renderAgentCard(a))}
            </div>
          </div>

          <!-- Automations -->
          <div class="tv-panel cmd-panel">
            <h3 class="tv-panel__title">AUTOMA\u00c7\u00d5ES</h3>
            <div class="cmd-cron-list">
              ${cronJobs.map((j) => renderCronItem(j))}
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="cmd-main">
          <!-- Pipeline Kanban -->
          <div class="tv-panel cmd-panel cmd-pipeline">
            <h3 class="tv-panel__title">\uD83D\uDD00 PIPELINE DE CLIENTES</h3>
            <div class="cmd-pipeline-grid">
              ${PIPELINE_STAGES.filter((s) => s !== "lost").map((stage) =>
                renderPipelineColumn(stage, customersByStage[stage]),
              )}
            </div>
          </div>

          <!-- Decisions Queue -->
          <div class="tv-panel cmd-panel cmd-decisions">
            <h3 class="tv-panel__title">\uD83D\uDCCB FILA DE DECIS\u00d5ES</h3>
            ${
              decisions.length === 0
                ? html`
                    <div class="cmd-empty">Nenhuma decis\u00e3o pendente</div>
                  `
                : html`<div class="cmd-decisions-list">${decisions.map((d) => renderDecisionItem(d, handleApproveDecision, handleRejectDecision))}</div>`
            }
          </div>

          <!-- Bottom row: Metrics + Activity Feed -->
          <div class="cmd-bottom-row">
            <!-- Metrics -->
            <div class="tv-panel cmd-panel cmd-metrics">
              <h3 class="tv-panel__title">\uD83D\uDCCA M\u00c9TRICAS HOJE</h3>
              <div class="cmd-metrics-grid">
                ${renderMetricCard("Mensagens", metrics.messages)}
                ${renderMetricCard("Vendas", `R$${metrics.sales.toLocaleString("pt-BR")}`)}
                ${renderMetricCard("Leads", metrics.leads)}
                ${renderMetricCard("Convers\u00e3o", `${metrics.conversionRate}`, "%")}
                ${renderMetricCard("Custo LLM", `$${metrics.llmCost.toFixed(2)}`)}
              </div>
            </div>

            <!-- Activity Feed -->
            <div class="tv-panel cmd-panel cmd-feed">
              <h3 class="tv-panel__title">\uD83D\uDCE1 ATIVIDADE AO VIVO</h3>
              ${
                feed.length === 0
                  ? html`
                      <div class="cmd-empty">Aguardando atividade...</div>
                    `
                  : html`<div class="cmd-feed-list">${feed.slice(0, 20).map((e) => renderActivityItem(e))}</div>`
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
