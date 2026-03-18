import { html, nothing } from "lit";
import { apiFetch, API_BASE } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";
import { showFeedback, isFeedbackVisible } from "../utils/feedback.ts";
import { statusColor, statusLabel, priorityColor, type MissionStatus, type Priority } from "../utils/status.ts";

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

interface MissionComment {
  id: string;
  mission_id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  content: string;
  comment_type: string;
  created_at: string;
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

/* ── State ───────────────────────────────────────────────── */
let missions: Mission[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let showForm = false;
let editing: Mission | null = null;
let deleteTarget: Mission | null = null;
let selectedMission: Mission | null = null;
let missionComments: MissionComment[] = [];
let missionTasks: MissionTask[] = [];
let showCommentForm = false;
let showTaskForm = false;
let statusFilter: "all" | Mission["status"] = "all";

let formFields = {
  title: "",
  description: "",
  priority: "normal" as Mission["priority"],
  coordinator: "",
  tags: "",
  deadline: "",
};

let commentFormFields = {
  agent_id: "",
  agent_name: "",
  agent_emoji: "",
  content: "",
  comment_type: "feedback",
};

let taskFormFields = {
  title: "",
  description: "",
  assigned_agent: "",
  status: "pending" as MissionTask["status"],
};

/* ── Data Loading ────────────────────────────────────────── */
async function loadMissions(state: TauraViewState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    missions = await apiFetch("/missions");
    loaded = true;
  } catch (e: unknown) {
    error = (e instanceof Error ? e.message : String(e)) || "Erro ao carregar missoes";
    console.error("[mission-board] load error:", e);
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

async function loadMissionDetails(state: TauraViewState, missionId: string) {
  try {
    const [comments, tasks] = await Promise.all([
      apiFetch(`/missions/${missionId}/comments`),
      apiFetch(`/missions/${missionId}/tasks`),
    ]);
    missionComments = comments || [];
    missionTasks = tasks || [];
  } catch (e: unknown) {
    console.error("[mission-board] detail load error:", e);
    missionComments = [];
    missionTasks = [];
  }
  triggerUpdate(state);
}

/* ── Helpers ─────────────────────────────────────────────── */
function priorityIcon(priority: Mission["priority"]): string {
  switch (priority) {
    case "low": return "🟢";
    case "normal": return "🔵";
    case "high": return "🟠";
    case "urgent": return "🔴";
    default: return "⚪";
  }
}

function priorityLabel(priority: Mission["priority"]): string {
  switch (priority) {
    case "low": return "Baixa";
    case "normal": return "Normal";
    case "high": return "Alta";
    case "urgent": return "Urgente";
    default: return priority;
  }
}

function taskStatusLabel(status: MissionTask["status"]): string {
  switch (status) {
    case "pending": return "Pendente";
    case "in_progress": return "Em Progresso";
    case "review": return "Revisao";
    case "done": return "Concluido";
    default: return status;
  }
}

function filteredMissions(): Mission[] {
  if (statusFilter === "all") return missions;
  return missions.filter((m) => m.status === statusFilter);
}

const ALL_STATUSES: Mission["status"][] = ["draft", "discussing", "approved", "executing", "completed", "cancelled"];

/* ── Render ───────────────────────────────────────────────── */
export function renderMissionBoard(state: TauraViewState) {
  void loadMissions(state);

  const filtered = filteredMissions();
  const totalMissions = missions.length;
  const activeMissions = missions.filter((m) => m.status === "executing" || m.status === "approved").length;
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const pendingTasks = missionTasks.filter((t) => t.status === "pending").length;

  /* ── Handlers ── */
  const handleRefresh = () => {
    loaded = false;
    loadMissions(state, true);
  };

  const handleAdd = () => {
    editing = null;
    formFields = {
      title: "", description: "", priority: "normal",
      coordinator: "", tags: "", deadline: "",
    };
    showForm = true;
    triggerUpdate(state);
  };

  const handleEdit = (m: Mission) => {
    editing = { ...m };
    formFields = {
      title: m.title,
      description: m.description || "",
      priority: m.priority,
      coordinator: m.coordinator || "",
      tags: (m.tags || []).join(", "),
      deadline: m.deadline || "",
    };
    showForm = true;
    triggerUpdate(state);
  };

  const handleCancel = () => {
    showForm = false;
    editing = null;
    triggerUpdate(state);
  };

  const onField = (field: keyof typeof formFields) => (e: Event) => {
    (formFields as Record<string, unknown>)[field] = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  };

  const handleSave = async () => {
    const title = formFields.title.trim();
    if (!title) return;

    const payload: Record<string, unknown> = {
      title,
      description: formFields.description || null,
      priority: formFields.priority,
      coordinator: formFields.coordinator || null,
      tags: formFields.tags ? formFields.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      deadline: formFields.deadline || null,
    };

    try {
      if (editing) {
        const result = await apiFetch(`/missions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const idx = missions.findIndex((m) => m.id === editing!.id);
        if (idx >= 0 && result?.[0]) missions[idx] = result[0];
        else if (idx >= 0 && result) missions[idx] = result;
      } else {
        const result = await apiFetch("/missions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result?.[0]) missions.push(result[0]);
        else if (result) missions.push(result);
      }
      showForm = false;
      editing = null;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  const handleDelete = (m: Mission) => {
    deleteTarget = m;
    triggerUpdate(state);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/missions/${deleteTarget.id}`, { method: "DELETE" });
      missions = missions.filter((x) => x.id !== deleteTarget!.id);
      if (selectedMission?.id === deleteTarget.id) {
        selectedMission = null;
        missionComments = [];
        missionTasks = [];
      }
      deleteTarget = null;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  const cancelDelete = () => {
    deleteTarget = null;
    triggerUpdate(state);
  };

  const handleSelectMission = (m: Mission) => {
    selectedMission = m;
    void loadMissionDetails(state, m.id);
  };

  const handleDeselectMission = () => {
    selectedMission = null;
    missionComments = [];
    missionTasks = [];
    triggerUpdate(state);
  };

  const handleChangeStatus = (m: Mission, newStatus: Mission["status"]) => async () => {
    try {
      await apiFetch(`/missions/${m.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      m.status = newStatus;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  const handleStatusFilter = (s: typeof statusFilter) => () => {
    statusFilter = s;
    triggerUpdate(state);
  };

  /** Broadcast mission to all agents (sets status to "discussing"). */
  const handleBroadcast = (m: Mission) => async () => {
    try {
      await apiFetch(`/missions/${m.id}/broadcast`, { method: "POST" });
      m.status = "discussing";
      showFeedback(state);
      // Reload details to pick up any new comments
      void loadMissionDetails(state, m.id);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  /** Execute mission — coordinator decomposes into tasks (sets status to "executing"). */
  const handleExecute = (m: Mission) => async () => {
    try {
      await apiFetch(`/missions/${m.id}/execute`, {
        method: "POST",
        body: JSON.stringify({ tasks: [] }),
      });
      m.status = "executing";
      showFeedback(state);
      // Reload details to pick up new tasks
      void loadMissionDetails(state, m.id);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  /* ── Comment handlers ── */
  const handleShowCommentForm = () => {
    showCommentForm = true;
    commentFormFields = { agent_id: "", agent_name: "", agent_emoji: "", content: "", comment_type: "feedback" };
    triggerUpdate(state);
  };

  const handleCancelComment = () => {
    showCommentForm = false;
    triggerUpdate(state);
  };

  const onCommentField = (field: keyof typeof commentFormFields) => (e: Event) => {
    (commentFormFields as Record<string, unknown>)[field] = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  };

  const handleSaveComment = async () => {
    if (!selectedMission || !commentFormFields.content.trim()) return;
    try {
      const result = await apiFetch(`/missions/${selectedMission.id}/comments`, {
        method: "POST",
        body: JSON.stringify(commentFormFields),
      });
      if (result?.[0]) missionComments.push(result[0]);
      else if (result) missionComments.push(result);
      showCommentForm = false;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  /* ── Task handlers ── */
  const handleShowTaskForm = () => {
    showTaskForm = true;
    taskFormFields = { title: "", description: "", assigned_agent: "", status: "pending" };
    triggerUpdate(state);
  };

  const handleCancelTask = () => {
    showTaskForm = false;
    triggerUpdate(state);
  };

  const onTaskField = (field: keyof typeof taskFormFields) => (e: Event) => {
    (taskFormFields as Record<string, unknown>)[field] = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  };

  const handleSaveTask = async () => {
    if (!selectedMission || !taskFormFields.title.trim()) return;
    try {
      const result = await apiFetch(`/missions/${selectedMission.id}/tasks`, {
        method: "POST",
        body: JSON.stringify(taskFormFields),
      });
      if (result?.[0]) missionTasks.push(result[0]);
      else if (result) missionTasks.push(result);
      showTaskForm = false;
      showFeedback(state);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    triggerUpdate(state);
  };

  const handleChangeTaskStatus = (task: MissionTask, newStatus: MissionTask["status"]) => async () => {
    if (!selectedMission) return;
    try {
      await apiFetch(`/missions/${selectedMission.id}/tasks/${task.id}`, {
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

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🎯</div>
          <div>
            <div class="tv-kpi-value">${totalMissions}</div>
            <div class="tv-kpi-label">Total Missoes</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">⚡</div>
          <div>
            <div class="tv-kpi-value">${activeMissions}</div>
            <div class="tv-kpi-label">Ativas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">✅</div>
          <div>
            <div class="tv-kpi-value">${completedMissions}</div>
            <div class="tv-kpi-label">Concluidas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📋</div>
          <div>
            <div class="tv-kpi-value">${pendingTasks}</div>
            <div class="tv-kpi-label">Tarefas Pendentes</div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div class="tv-header-actions">
          ${isFeedbackVisible() ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${handleRefresh}>🔄 Atualizar</button>
          <button class="tv-btn-gold" @click=${handleAdd}>+ Nova Missao</button>
        </div>
      </div>

      <!-- Status Filter Bar -->
      <div class="tv-category-bar">
        <button class="tv-cat-btn ${statusFilter === "all" ? "active" : ""}" @click=${handleStatusFilter("all")}>
          Todas <span class="tv-cat-count">${missions.length}</span>
        </button>
        ${ALL_STATUSES.map(
          (s) => {
            const count = missions.filter((m) => m.status === s).length;
            return html`
              <button class="tv-cat-btn ${statusFilter === s ? "active" : ""}" @click=${handleStatusFilter(s)}>
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor(s)};margin-right:4px"></span>
                ${statusLabel(s)} <span class="tv-cat-count">${count}</span>
              </button>
            `;
          }
        )}
      </div>

      <!-- Delete Confirmation -->
      ${deleteTarget ? html`
        <div class="tv-confirm-bar">
          <span>Excluir missao <strong>${deleteTarget.title}</strong>?</span>
          <button class="tv-btn-danger" @click=${confirmDelete}>Confirmar Exclusao</button>
          <button class="tv-btn-sm" @click=${cancelDelete}>Cancelar</button>
        </div>
      ` : nothing}

      <!-- Mission Form (add/edit) -->
      ${showForm ? html`
        <div class="tv-panel tv-form-panel">
          <h3>${editing ? `Editar: ${editing.title}` : "Nova Missao"}</h3>
          <div class="tv-form-grid">
            <div class="tv-config-field">
              <label>Titulo *</label>
              <input type="text" .value=${formFields.title} @input=${onField("title")} placeholder="Titulo da missao" />
            </div>
            <div class="tv-config-field">
              <label>Prioridade</label>
              <select .value=${formFields.priority} @change=${onField("priority")}>
                <option value="low">🟢 Baixa</option>
                <option value="normal">🔵 Normal</option>
                <option value="high">🟠 Alta</option>
                <option value="urgent">🔴 Urgente</option>
              </select>
            </div>
            <div class="tv-config-field">
              <label>Coordenador</label>
              <input type="text" .value=${formFields.coordinator} @input=${onField("coordinator")} placeholder="ID do agente coordenador" />
            </div>
            <div class="tv-config-field">
              <label>Deadline</label>
              <input type="date" .value=${formFields.deadline} @input=${onField("deadline")} />
            </div>
            <div class="tv-config-field">
              <label>Tags (separadas por virgula)</label>
              <input type="text" .value=${formFields.tags} @input=${onField("tags")} placeholder="tag1, tag2, tag3" />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Descricao</label>
              <textarea rows="3" .value=${formFields.description} @input=${onField("description")} placeholder="Descreva a missao..."></textarea>
            </div>
          </div>
          <div class="tv-config-actions">
            <button class="tv-btn-gold" @click=${handleSave}>${editing ? "Atualizar" : "Criar Missao"}</button>
            <button class="tv-btn-outline" @click=${handleCancel}>Cancelar</button>
          </div>
        </div>
      ` : nothing}

      <!-- Selected Mission Detail Panel -->
      ${selectedMission ? html`
        <div class="tv-panel" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <h3 style="margin:0 0 8px 0;display:flex;align-items:center;gap:8px">
                ${priorityIcon(selectedMission.priority)}
                ${selectedMission.title}
                <span class="tv-badge" style="background:${statusColor(selectedMission.status)};color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px">
                  ${statusLabel(selectedMission.status)}
                </span>
              </h3>
              ${selectedMission.description ? html`<p style="margin:0 0 8px 0;color:var(--tv-text-muted);font-size:0.85rem">${selectedMission.description}</p>` : nothing}
              <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.8rem;color:var(--tv-text-muted)">
                ${selectedMission.coordinator ? html`<span>Coordenador: <strong>${selectedMission.coordinator}</strong></span>` : nothing}
                ${selectedMission.deadline ? html`<span>Deadline: <strong>${fmtDate(selectedMission.deadline)}</strong></span>` : nothing}
                <span>Criada: ${fmtDate(selectedMission.created_at)}</span>
              </div>
              ${(selectedMission.tags || []).length > 0 ? html`
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">
                  ${selectedMission.tags.map((tag) => html`<span class="tv-badge" style="font-size:0.7rem">#${tag}</span>`)}
                </div>
              ` : nothing}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
              <select @change=${(e: Event) => {
                const newStatus = (e.target as HTMLSelectElement).value as Mission["status"];
                handleChangeStatus(selectedMission!, newStatus)();
              }} .value=${selectedMission.status} style="font-size:0.8rem;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.05);color:inherit;border:1px solid rgba(255,255,255,0.15)">
                ${ALL_STATUSES.map((s) => html`<option value=${s}>${statusLabel(s)}</option>`)}
              </select>
              <button class="tv-btn-sm" @click=${() => handleEdit(selectedMission!)}>✏️ Editar</button>
              ${selectedMission.status === "draft" || selectedMission.status === "approved"
                ? html`<button class="tv-btn-sm" style="background:rgba(52,152,219,0.15);color:#3498db" @click=${handleBroadcast(selectedMission)}>📡 Broadcast</button>`
                : nothing}
              ${selectedMission.status === "approved" || selectedMission.status === "discussing"
                ? html`<button class="tv-btn-sm" style="background:rgba(243,156,18,0.15);color:#f39c12" @click=${handleExecute(selectedMission)}>⚡ Executar</button>`
                : nothing}
              <button class="tv-btn-sm" @click=${handleDeselectMission}>✕ Fechar</button>
            </div>
          </div>

          <!-- Tasks Section -->
          <div style="margin-top:16px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <h4 style="margin:0;font-size:0.9rem">Tarefas (${missionTasks.length})</h4>
              <button class="tv-btn-sm" @click=${handleShowTaskForm}>+ Tarefa</button>
            </div>

            ${showTaskForm ? html`
              <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:8px">
                <div class="tv-form-grid">
                  <div class="tv-config-field">
                    <label>Titulo *</label>
                    <input type="text" .value=${taskFormFields.title} @input=${onTaskField("title")} placeholder="Titulo da tarefa" />
                  </div>
                  <div class="tv-config-field">
                    <label>Agente Responsavel</label>
                    <input type="text" .value=${taskFormFields.assigned_agent} @input=${onTaskField("assigned_agent")} placeholder="ID do agente" />
                  </div>
                  <div class="tv-config-field">
                    <label>Status</label>
                    <select .value=${taskFormFields.status} @change=${onTaskField("status")}>
                      <option value="pending">Pendente</option>
                      <option value="in_progress">Em Progresso</option>
                      <option value="review">Revisao</option>
                      <option value="done">Concluido</option>
                    </select>
                  </div>
                  <div class="tv-config-field" style="grid-column: span 2;">
                    <label>Descricao</label>
                    <textarea rows="2" .value=${taskFormFields.description} @input=${onTaskField("description")} placeholder="Descricao da tarefa"></textarea>
                  </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <button class="tv-btn-gold" @click=${handleSaveTask}>Salvar Tarefa</button>
                  <button class="tv-btn-sm" @click=${handleCancelTask}>Cancelar</button>
                </div>
              </div>
            ` : nothing}

            ${missionTasks.length === 0 ? html`<div style="color:var(--tv-text-muted);font-size:0.8rem;padding:8px 0">Nenhuma tarefa cadastrada.</div>` : nothing}
            ${missionTasks.map((task) => html`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.02);margin-bottom:4px;gap:8px;flex-wrap:wrap">
                <div style="flex:1;min-width:150px">
                  <strong style="font-size:0.85rem">${task.title}</strong>
                  ${task.assigned_agent ? html`<span style="font-size:0.75rem;color:var(--tv-text-muted);margin-left:8px">@${task.assigned_agent}</span>` : nothing}
                  ${task.description ? html`<div style="font-size:0.75rem;color:var(--tv-text-muted)">${task.description}</div>` : nothing}
                </div>
                <select @change=${(e: Event) => {
                  const ns = (e.target as HTMLSelectElement).value as MissionTask["status"];
                  handleChangeTaskStatus(task, ns)();
                }} .value=${task.status} style="font-size:0.75rem;padding:3px 6px;border-radius:4px;background:rgba(255,255,255,0.05);color:inherit;border:1px solid rgba(255,255,255,0.15)">
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="review">Revisao</option>
                  <option value="done">Concluido</option>
                </select>
              </div>
            `)}
          </div>

          <!-- Comments Section -->
          <div style="margin-top:16px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <h4 style="margin:0;font-size:0.9rem">Comentarios (${missionComments.length})</h4>
              <button class="tv-btn-sm" @click=${handleShowCommentForm}>+ Comentario</button>
            </div>

            ${showCommentForm ? html`
              <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:8px">
                <div class="tv-form-grid">
                  <div class="tv-config-field">
                    <label>Agent ID *</label>
                    <input type="text" .value=${commentFormFields.agent_id} @input=${onCommentField("agent_id")} placeholder="ex: dev" />
                  </div>
                  <div class="tv-config-field">
                    <label>Agent Name</label>
                    <input type="text" .value=${commentFormFields.agent_name} @input=${onCommentField("agent_name")} placeholder="ex: C3-PO" />
                  </div>
                  <div class="tv-config-field">
                    <label>Emoji</label>
                    <input type="text" .value=${commentFormFields.agent_emoji} @input=${onCommentField("agent_emoji")} placeholder="ex: 🤖" />
                  </div>
                  <div class="tv-config-field">
                    <label>Tipo</label>
                    <select .value=${commentFormFields.comment_type} @change=${onCommentField("comment_type")}>
                      <option value="feedback">Feedback</option>
                      <option value="suggestion">Sugestao</option>
                      <option value="question">Pergunta</option>
                      <option value="update">Update</option>
                      <option value="decision">Decisao</option>
                    </select>
                  </div>
                  <div class="tv-config-field" style="grid-column: span 2;">
                    <label>Conteudo *</label>
                    <textarea rows="3" .value=${commentFormFields.content} @input=${onCommentField("content")} placeholder="Escreva o comentario..."></textarea>
                  </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <button class="tv-btn-gold" @click=${handleSaveComment}>Enviar Comentario</button>
                  <button class="tv-btn-sm" @click=${handleCancelComment}>Cancelar</button>
                </div>
              </div>
            ` : nothing}

            ${missionComments.length === 0 ? html`<div style="color:var(--tv-text-muted);font-size:0.8rem;padding:8px 0">Nenhum comentario ainda.</div>` : nothing}
            ${missionComments.map((c) => html`
              <div style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.02);margin-bottom:4px">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <span style="font-size:1.1rem">${c.agent_emoji || "💬"}</span>
                  <strong style="font-size:0.82rem">${c.agent_name || c.agent_id}</strong>
                  <span class="tv-badge" style="font-size:0.65rem">${c.comment_type}</span>
                  <span style="font-size:0.7rem;color:var(--tv-text-muted);margin-left:auto">${fmtDate(c.created_at)}</span>
                  <!-- L7: Edit/delete comment buttons -->
                  <button class="tv-btn-sm" style="font-size:0.7rem;padding:1px 4px;" title="Editar" @click=${() => {
                    showCommentForm = true;
                    commentFormFields = {
                      agent_id: c.agent_id,
                      agent_name: c.agent_name,
                      agent_emoji: c.agent_emoji,
                      content: c.content,
                      comment_type: c.comment_type,
                    };
                    triggerUpdate(state);
                  }}>✏️</button>
                  <button class="tv-btn-sm tv-btn-sm--danger" style="font-size:0.7rem;padding:1px 4px;" title="Excluir" @click=${async () => {
                    if (!selectedMission) return;
                    try {
                      await apiFetch(`/missions/${selectedMission.id}/comments/${c.id}`, { method: "DELETE" });
                      missionComments = missionComments.filter((x) => x.id !== c.id);
                      showFeedback(state);
                    } catch (e: unknown) {
                      error = e instanceof Error ? e.message : String(e);
                    }
                    triggerUpdate(state);
                  }}>🗑️</button>
                </div>
                <div style="font-size:0.82rem;color:var(--tv-text-secondary)">${c.content}</div>
              </div>
            `)}
          </div>
        </div>
      ` : nothing}

      <!-- Mission Cards Grid -->
      ${filtered.length === 0 && !loading ? html`
        <div class="tv-empty">
          ${statusFilter !== "all"
            ? "Nenhuma missao encontrada com esse filtro."
            : "Nenhuma missao cadastrada. Clique em '+ Nova Missao' para comecar."}
        </div>
      ` : nothing}

      <div class="tv-product-grid">
        ${filtered.map((m) => html`
          <div class="tv-product-card" @click=${() => handleSelectMission(m)} style="cursor:pointer;${selectedMission?.id === m.id ? 'border:1px solid rgba(46,204,113,0.5);box-shadow:0 0 12px rgba(46,204,113,0.15)' : ''}">
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${priorityIcon(m.priority)} ${m.title}</strong>
                <span class="tv-badge" style="background:${statusColor(m.status)};color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px">
                  ${statusLabel(m.status)}
                </span>
              </div>
              <div class="tv-product-sku">
                Prioridade: ${priorityLabel(m.priority)}
                ${m.coordinator ? html` · Coord: ${m.coordinator}` : nothing}
              </div>
              ${m.description ? html`<div class="tv-product-desc">${m.description}</div>` : nothing}
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
                <span style="font-size:0.75rem;color:var(--tv-text-muted)">Criada: ${fmtDate(m.created_at)}</span>
                ${m.deadline ? html`<span style="font-size:0.75rem;color:var(--tv-text-muted)">Deadline: ${fmtDate(m.deadline)}</span>` : nothing}
              </div>
              ${(m.tags || []).length > 0 ? html`
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                  ${m.tags.map((tag) => html`<span class="tv-badge" style="font-size:0.65rem">#${tag}</span>`)}
                </div>
              ` : nothing}
              <div class="tv-product-actions" @click=${(e: Event) => e.stopPropagation()}>
                <button class="tv-btn-sm" @click=${() => handleEdit(m)}>✏️ Editar</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${() => handleDelete(m)}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}
