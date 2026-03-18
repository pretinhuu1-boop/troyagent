import { html, nothing } from "lit";
import { apiFetch, API_BASE } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";
import { showFeedback, isFeedbackVisible } from "../utils/feedback.ts";
import { statusColor, statusLabel, type MissionStatus } from "../utils/status.ts";

/* ── Types ───────────────────────────────────────────────── */
interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "discussing" | "approved" | "executing" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  coordinator: string | null;
  tags: string[];
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface MissionTask {
  id: string;
  mission_id: string;
  title: string;
  description: string | null;
  assigned_agent: string | null;
  status: "pending" | "in_progress" | "review" | "done";
  created_at: string;
}

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  skills?: string[];
}

interface EventLogEntry {
  ts: number;
  event: string;
  payload?: unknown;
}

interface PresenceEntry {
  sessionKey?: string;
  agentId?: string;
  status?: string;
  startedAt?: number;
  lastActivity?: number;
}

interface WarRoomState {
  state: {
    requestUpdate?: () => void;
    eventLogBuffer?: EventLogEntry[];
    presenceEntries?: PresenceEntry[];
  };
  requestUpdate?: () => void;
  eventLogBuffer?: EventLogEntry[];
  presenceEntries?: PresenceEntry[];
}

/* ── Agents Config ───────────────────────────────────────── */
const DEFAULT_AGENTS: AgentInfo[] = [
  { id: "dev", name: "C3-PO", emoji: "🤖", description: "Desenvolvimento e integracao", skills: ["TypeScript", "Node.js", "APIs", "DevOps"] },
  { id: "content-editor", name: "TAURA Editor", emoji: "✍️", description: "Edicao e revisao de conteudo", skills: ["Copywriting", "Revisao", "SEO Writing"] },
  { id: "seo-specialist", name: "TAURA SEO", emoji: "🔍", description: "Otimizacao para motores de busca", skills: ["SEO", "Analytics", "Keywords", "Link Building"] },
  { id: "social-media", name: "TAURA Social", emoji: "📱", description: "Gestao de redes sociais", skills: ["Instagram", "Facebook", "TikTok", "Engajamento"] },
  { id: "content-creator", name: "TAURA Creator", emoji: "🎨", description: "Criacao de conteudo visual e textual", skills: ["Design", "Video", "Copywriting", "Branding"] },
  { id: "content-strategist", name: "TAURA Estrategista", emoji: "📋", description: "Planejamento estrategico de conteudo", skills: ["Estrategia", "Calendario", "Metricas", "Planejamento"] },
  { id: "ops-monitor", name: "TAURA Ops", emoji: "🛡️", description: "Monitoramento de operacoes e infra", skills: ["Monitoring", "Alertas", "Uptime", "Logs"] },
  { id: "sales-agent", name: "Troy Vendas", emoji: "💰", description: "Vendas e atendimento ao cliente", skills: ["Vendas", "CRM", "WhatsApp", "Follow-up"] },
];

/** Try to read agent list from gateway config (injected by app-render). Falls back to defaults. */
function getAgents(): AgentInfo[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appConfig = (window as any).__openclawConfig;
    if (appConfig?.agents?.list && Array.isArray(appConfig.agents.list)) {
      return appConfig.agents.list.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? "unknown"),
        name: (a.identity as Record<string, unknown>)?.name
          ? String((a.identity as Record<string, unknown>).name)
          : String(a.id ?? "Agent"),
        emoji: (a.identity as Record<string, unknown>)?.emoji
          ? String((a.identity as Record<string, unknown>).emoji)
          : "🤖",
        description: (a.identity as Record<string, unknown>)?.theme
          ? String((a.identity as Record<string, unknown>).theme).slice(0, 60)
          : undefined,
        skills: Array.isArray(a.skills) ? (a.skills as string[]) : [],
      }));
    }
  } catch { /* fallback */ }
  return DEFAULT_AGENTS;
}

let AGENTS: AgentInfo[] = DEFAULT_AGENTS;

/* ── State ───────────────────────────────────────────────── */
let missions: Mission[] = [];
let allTasks: { task: MissionTask; missionTitle: string; missionId: string }[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let lastKnownEventCount = 0;
let dragTaskId: string | null = null;
let dragOverColumn: string | null = null;

/* ── Data Loading ────────────────────────────────────────── */
async function loadWarRoomData(state: WarRoomState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    // Refresh agent list from gateway config if available
    AGENTS = getAgents();
    missions = await apiFetch("/missions");
    // Load tasks for all missions
    const taskPromises = missions.map(async (m) => {
      try {
        const tasks: MissionTask[] = await apiFetch(`/missions/${m.id}/tasks`);
        return (tasks || []).map((t) => ({ task: { ...t, mission_id: t.mission_id || m.id }, missionTitle: m.title, missionId: m.id }));
      } catch {
        return [];
      }
    });
    const taskResults = await Promise.all(taskPromises);
    allTasks = taskResults.flat();
    loaded = true;
  } catch (e: unknown) {
    error = (e instanceof Error ? e.message : String(e)) || "Erro ao carregar dados do War Room";
    console.error("[war-room] load error:", e);
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
/** Determine agent status color from live presence data */
function agentStatusColor(agentId: string, presence: PresenceEntry[]): string {
  // Check if agent has active sessions in presence data
  const agentSessions = presence.filter(
    (p) => p.agentId === agentId || p.sessionKey?.includes(agentId),
  );
  if (agentSessions.length === 0) return "#95a5a6"; // gray = offline/idle
  const hasActive = agentSessions.some(
    (p) => p.status === "running" || p.status === "active" || p.status === "busy",
  );
  if (hasActive) return "#2ecc71"; // green = active
  return "#f1c40f"; // yellow = connected but idle
}

/** Format an event for the activity feed */
function formatActivityEvent(entry: EventLogEntry): { icon: string; text: string; color: string } | null {
  const p = entry.payload as Record<string, unknown> | undefined;
  switch (entry.event) {
    case "agent": {
      const type = String(p?.type ?? "");
      const agentId = String(p?.agentId ?? p?.agent ?? "");
      const emoji = AGENTS.find((a) => a.id === agentId)?.emoji || "🤖";
      if (type === "run.started" || type === "started") {
        return { icon: emoji, text: `${agentId} iniciou execucao`, color: "#2ecc71" };
      }
      if (type === "run.completed" || type === "completed" || type === "done") {
        return { icon: emoji, text: `${agentId} concluiu tarefa`, color: "#27ae60" };
      }
      if (type === "run.failed" || type === "error" || type === "failed") {
        return { icon: "❌", text: `${agentId} falhou: ${String(p?.error ?? "erro")}`, color: "#e74c3c" };
      }
      if (type === "tool.call" || type === "tool_use") {
        const tool = String(p?.tool ?? p?.name ?? "");
        return { icon: "🔧", text: `${agentId} usando ${tool}`, color: "#3498db" };
      }
      if (type === "thinking" || type === "text") {
        return null; // too noisy
      }
      return { icon: emoji, text: `${agentId}: ${type}`, color: "#95a5a6" };
    }
    case "chat": {
      const chatType = String(p?.type ?? "");
      if (chatType === "message" || chatType === "user" || chatType === "assistant") {
        const text = String(p?.text ?? p?.content ?? "").slice(0, 80);
        return { icon: "💬", text: text || "Nova mensagem", color: "#9b59b6" };
      }
      return null;
    }
    case "presence": {
      return { icon: "👥", text: "Status dos agentes atualizado", color: "#3498db" };
    }
    case "cron": {
      const jobId = String(p?.jobId ?? p?.id ?? "cron");
      return { icon: "⏰", text: `Cron executado: ${jobId}`, color: "#f39c12" };
    }
    case "exec.approval.requested": {
      const desc = String(p?.description ?? p?.type ?? "acao");
      return { icon: "⚠️", text: `Aprovacao necessaria: ${desc.slice(0, 60)}`, color: "#e67e22" };
    }
    case "health": {
      return null; // too frequent
    }
    case "tick": {
      return null; // heartbeat, skip
    }
    default:
      return null;
  }
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5000) return "agora";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s atras`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atras`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atras`;
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function agentEmojiById(agentId: string): string {
  const agent = AGENTS.find((a) => a.id === agentId);
  return agent?.emoji || "👤";
}

function kanbanBacklog(): { task: MissionTask; missionTitle: string; missionId: string }[] {
  return allTasks.filter((t) => t.task.status === "pending");
}

function kanbanInProgress(): { task: MissionTask; missionTitle: string; missionId: string }[] {
  return allTasks.filter((t) => t.task.status === "in_progress");
}

function kanbanReview(): { task: MissionTask; missionTitle: string; missionId: string }[] {
  return allTasks.filter((t) => t.task.status === "review");
}

function kanbanCompleted(): { task: MissionTask; missionTitle: string; missionId: string }[] {
  return allTasks.filter((t) => t.task.status === "done");
}

/* ── Keyboard Navigation ────────────────────────────────── */
const KANBAN_STATUS_ORDER: MissionTask["status"][] = ["pending", "in_progress", "review", "done"];

/* ── Render ───────────────────────────────────────────────── */
export function renderWarRoom(state: WarRoomState) {
  void loadWarRoomData(state);

  // Extract live data from app state (passed via { state } as any)
  const hostState = state.state || state;
  const eventLog: EventLogEntry[] = (hostState as any).eventLogBuffer || (hostState as any).eventLog || [];
  const presence: PresenceEntry[] = (hostState as any).presenceEntries || [];

  // Auto-refresh when new events arrive
  if (eventLog.length !== lastKnownEventCount) {
    lastKnownEventCount = eventLog.length;
  }

  // Build activity feed from event log (most recent first, filtered)
  const activityFeed = eventLog
    .map((entry) => ({ entry, formatted: formatActivityEvent(entry) }))
    .filter((x): x is { entry: EventLogEntry; formatted: NonNullable<ReturnType<typeof formatActivityEvent>> } => x.formatted !== null)
    .slice(0, 30);

  const handleRefresh = () => {
    loaded = false;
    loadWarRoomData(state, true);
  };

  const handleChangeTaskStatus = (task: MissionTask, missionId: string, newStatus: MissionTask["status"]) => async () => {
    try {
      await apiFetch(`/missions/${missionId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      task.status = newStatus;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
  };

  /* ── Drag-and-Drop Handlers ── */
  const onDragStart = (taskId: string) => (e: DragEvent) => {
    dragTaskId = taskId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
    }
    // Add dragging class after a tick so the source card gets styled
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
      if (el) el.classList.add("tv-kanban-card--dragging");
    });
  };

  const onDragEnd = () => {
    const prev = dragTaskId;
    dragTaskId = null;
    dragOverColumn = null;
    if (prev) {
      const el = document.querySelector(`[data-task-id="${prev}"]`) as HTMLElement;
      if (el) el.classList.remove("tv-kanban-card--dragging");
    }
    // Remove all drop-over highlights
    document.querySelectorAll(".tv-kanban-col--drop-over").forEach((el) => el.classList.remove("tv-kanban-col--drop-over"));
    triggerUpdate(state);
  };

  const onDragOver = (colStatus: string) => (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colStatus) {
      // Remove previous highlight
      document.querySelectorAll(".tv-kanban-col--drop-over").forEach((el) => el.classList.remove("tv-kanban-col--drop-over"));
      dragOverColumn = colStatus;
      const col = document.querySelector(`[data-col-status="${colStatus}"]`) as HTMLElement;
      if (col) col.classList.add("tv-kanban-col--drop-over");
    }
  };

  const onDragLeave = (colStatus: string) => (e: DragEvent) => {
    // Only clear if actually leaving the column (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    const col = document.querySelector(`[data-col-status="${colStatus}"]`) as HTMLElement;
    if (col && related && col.contains(related)) return;
    if (dragOverColumn === colStatus) {
      dragOverColumn = null;
      if (col) col.classList.remove("tv-kanban-col--drop-over");
    }
  };

  const onDrop = (targetStatus: MissionTask["status"]) => (e: DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer?.getData("text/plain") || dragTaskId;
    if (!taskId) return;

    const taskEntry = allTasks.find((t) => t.task.id === taskId);
    if (!taskEntry || taskEntry.task.status === targetStatus) {
      onDragEnd();
      return;
    }

    // Optimistically update + call API (use missionId from parent context as fallback)
    const missionId = taskEntry.task.mission_id || taskEntry.missionId;
    handleChangeTaskStatus(taskEntry.task, missionId, targetStatus)();
    onDragEnd();
  };

  const onCardKeydown = (task: MissionTask, missionId: string) => (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const idx = KANBAN_STATUS_ORDER.indexOf(task.status);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= KANBAN_STATUS_ORDER.length) return;
      handleChangeTaskStatus(task, missionId, KANBAN_STATUS_ORDER[nextIdx])();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLElement)?.click();
    }
  };

  const renderKanbanColumn = (title: string, icon: string, items: { task: MissionTask; missionTitle: string; missionId: string }[], color: string, colStatus: MissionTask["status"]) => html`
    <div class="tv-kanban-col" data-col-status=${colStatus}
      role="list"
      aria-label="${title}"
      @dragover=${onDragOver(colStatus)}
      @dragleave=${onDragLeave(colStatus)}
      @drop=${onDrop(colStatus)}>
      <div class="tv-kanban-col-header" style="border-bottom-color:${color}">
        <span>${icon}</span>
        <strong style="font-size:0.85rem">${title}</strong>
        <span class="tv-cat-count" style="margin-left:auto">${items.length}</span>
      </div>
      ${items.length === 0 ? html`<div class="tv-kanban-empty">Arraste tarefas aqui</div>` : nothing}
      ${items.map(({ task, missionTitle, missionId }) => html`
        <div class="tv-kanban-card" data-task-id=${task.id}
          draggable="true"
          tabindex="0"
          role="listitem"
          @dragstart=${onDragStart(task.id)}
          @dragend=${onDragEnd}
          @keydown=${onCardKeydown(task, missionId)}>
          <div class="tv-kanban-card-grip">⠿</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;font-weight:600;margin-bottom:4px">${task.title}</div>
            <div style="font-size:0.72rem;color:var(--tv-text-muted)">
              ${agentEmojiById(task.assigned_agent || "")} ${task.assigned_agent || "Sem agente"} · ${missionTitle}
            </div>
          </div>
        </div>
      `)}
    </div>
  `;

  return html`
    <div class="tv-catalogo">
      <!-- Header -->
      <div class="tv-panel-header">
        <div class="tv-header-actions">
          ${isFeedbackVisible() ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${handleRefresh}>🔄 Atualizar</button>
        </div>
      </div>

      <!-- Agent Status Grid -->
      <div style="margin-bottom:20px">
        <h3 style="font-size:0.95rem;margin:0 0 12px 0;display:flex;align-items:center;gap:8px">
          🛡️ Status dos Agentes
        </h3>
        <div class="tv-kpi-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr))">
          ${AGENTS.map((agent) => {
            const statusDotColor = agentStatusColor(agent.id, presence);
            return html`
              <div class="tv-kpi" style="flex-direction:column;align-items:flex-start;gap:6px;padding:14px">
                <div style="display:flex;align-items:center;gap:8px;width:100%">
                  <span style="font-size:1.5rem">${agent.emoji}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.85rem;display:flex;align-items:center;gap:6px">
                      ${agent.name}
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusDotColor};flex-shrink:0"></span>
                    </div>
                    <div style="font-size:0.7rem;color:var(--tv-text-muted)">${agent.id}</div>
                  </div>
                </div>
                ${agent.description ? html`<div style="font-size:0.72rem;color:var(--tv-text-muted)">${agent.description}</div>` : nothing}
                ${(agent.skills || []).length > 0 ? html`
                  <div style="display:flex;gap:3px;flex-wrap:wrap">
                    ${agent.skills!.map((skill) => html`
                      <span class="tv-badge" style="font-size:0.6rem;padding:1px 5px">${skill}</span>
                    `)}
                  </div>
                ` : nothing}
              </div>
            `;
          })}
        </div>
      </div>

      <!-- Mission Pipeline (Kanban) -->
      <div style="margin-bottom:20px">
        <h3 style="font-size:0.95rem;margin:0 0 12px 0;display:flex;align-items:center;gap:8px">
          📊 Pipeline de Tarefas
        </h3>
        <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:4px">
          ${renderKanbanColumn("Backlog", "📋", kanbanBacklog(), "#95a5a6", "pending")}
          ${renderKanbanColumn("Em Progresso", "⚡", kanbanInProgress(), "#f39c12", "in_progress")}
          ${renderKanbanColumn("Revisao", "🔍", kanbanReview(), "#3498db", "review")}
          ${renderKanbanColumn("Concluido", "✅", kanbanCompleted(), "#27ae60", "done")}
        </div>
      </div>

      <!-- Live Activity Feed -->
      <div style="margin-bottom:20px">
        <h3 style="font-size:0.95rem;margin:0 0 12px 0;display:flex;align-items:center;gap:8px">
          ⚡ Activity Feed
          ${activityFeed.length > 0 ? html`<span class="tv-cat-count">${activityFeed.length}</span>` : nothing}
          ${presence.length > 0 ? html`<span style="font-size:0.7rem;color:var(--tv-text-muted);margin-left:auto">👥 ${presence.length} sessoes ativas</span>` : nothing}
        </h3>
        ${activityFeed.length === 0 ? html`
          <div style="padding:20px;text-align:center;color:var(--tv-text-muted);font-size:0.85rem;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            Nenhuma atividade recente. Eventos dos agentes aparecerao aqui em tempo real.
          </div>
        ` : html`
          <div class="tv-activity-feed">
            ${activityFeed.map(({ entry, formatted }) => html`
              <div class="tv-activity-item">
                <span class="tv-activity-icon">${formatted.icon}</span>
                <div class="tv-activity-body">
                  <span class="tv-activity-text">${formatted.text}</span>
                  <span class="tv-activity-time">${relativeTime(entry.ts)}</span>
                </div>
                <span class="tv-activity-dot" style="background:${formatted.color}"></span>
              </div>
            `)}
          </div>
        `}
      </div>

      <!-- Activity Summary -->
      <div style="margin-bottom:20px">
        <h3 style="font-size:0.95rem;margin:0 0 12px 0;display:flex;align-items:center;gap:8px">
          📡 Resumo de Missoes
        </h3>
        ${missions.length === 0 ? html`
          <div class="tv-empty">Nenhuma missao encontrada. Crie missoes no Mission Board.</div>
        ` : html`
          <div class="tv-product-grid" style="grid-template-columns:repeat(auto-fill, minmax(280px, 1fr))">
            ${missions.slice(0, 12).map((m) => html`
              <div class="tv-product-card">
                <div class="tv-product-body" style="padding:14px">
                  <div class="tv-product-header">
                    <strong style="font-size:0.85rem">${m.title}</strong>
                    <span class="tv-badge" style="background:${statusColor(m.status)};color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:10px">
                      ${statusLabel(m.status)}
                    </span>
                  </div>
                  ${m.description ? html`<div class="tv-product-desc" style="font-size:0.78rem">${m.description}</div>` : nothing}
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
                    ${m.coordinator ? html`<span style="font-size:0.72rem;color:var(--tv-text-muted)">${agentEmojiById(m.coordinator)} ${m.coordinator}</span>` : nothing}
                    <span style="font-size:0.72rem;color:var(--tv-text-muted)">${fmtDate(m.created_at)}</span>
                    ${m.deadline ? html`<span style="font-size:0.72rem;color:var(--tv-text-muted)">⏰ ${fmtDate(m.deadline)}</span>` : nothing}
                  </div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    </div>
  `;
}
