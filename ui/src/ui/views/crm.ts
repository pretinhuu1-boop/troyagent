import { html, nothing } from "lit";

/* ── API Config (backend proxy) ───────────────────────────── */
const API_BASE = "/api";

/* ── Types ───────────────────────────────────────────────── */
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: "b2c" | "b2b";
  company_name: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  customer_id: string;
  channel: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface CRMState {
  state: {
    requestUpdate?: () => void;
  };
  requestUpdate?: () => void;
}

/* ── State ───────────────────────────────────────────────── */
let customers: Customer[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let typeFilter: "all" | "b2c" | "b2b" = "all";
let searchQuery = "";
let selectedId: string | null = null;
let showForm = false;
let editing: Customer | null = null;
let deleteTarget: Customer | null = null;
let refreshInterval: number | null = null;
let showSavedBadge = false;
let savedTimer: number | null = null;

/* ── Conversations State ─────────────────────────────────── */
let activeSubTab: "clientes" | "conversas" = "clientes";
let conversations: Conversation[] = [];
let conversationsLoading = false;
let conversationsLoaded = false;
let conversationsError: string | null = null;
let selectedConversationId: string | null = null;
let conversationMessages: Message[] = [];
let messagesLoading = false;
let conversationsRefreshInterval: number | null = null;
let messageSearchQuery = ""; // L3: search in messages
let messagesPageSize = 20; // L4: pagination
let messagesShowAll = false;

let formFields = {
  name: "",
  phone: "",
  email: "",
  type: "b2c" as "b2c" | "b2b",
  company_name: "",
  city: "",
  state: "",
  notes: "",
};

/* ── Trigger Update (handles { state } wrapper pattern) ─── */
function triggerUpdate(s: CRMState) {
  if (typeof s.requestUpdate === "function") {
    s.requestUpdate();
  } else if (s.state && typeof s.state.requestUpdate === "function") {
    s.state.requestUpdate();
  }
}

/* ── Gateway API ─────────────────────────────────────────── */
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchCustomers(): Promise<Customer[]> {
  return apiFetch("/customers");
}

/* ── Load & Refresh ──────────────────────────────────────── */
async function loadCustomers(state: CRMState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    customers = await fetchCustomers();
    loaded = true;
  } catch (e: any) {
    error = e.message || "Erro ao carregar clientes";
    console.error("[crm] load error:", e);
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

function startAutoRefresh(state: CRMState) {
  if (refreshInterval) return;
  refreshInterval = window.setInterval(() => {
    loadCustomers(state, true);
  }, 30000);
}

/* ── Conversations Load & Refresh ─────────────────────────── */
async function loadConversations(state: CRMState, force = false) {
  if (conversationsLoaded && !force) return;
  conversationsLoading = true;
  conversationsError = null;
  triggerUpdate(state);
  try {
    conversations = await apiFetch("/conversations");
    conversationsLoaded = true;
  } catch (e: any) {
    conversationsError = e.message || "Erro ao carregar conversas";
    console.error("[crm] conversations load error:", e);
  } finally {
    conversationsLoading = false;
    triggerUpdate(state);
  }
}

async function loadMessages(state: CRMState, conversationId: string) {
  messagesLoading = true;
  triggerUpdate(state);
  try {
    conversationMessages = await apiFetch(`/messages?conversation_id=${conversationId}`);
  } catch (e: any) {
    console.error("[crm] messages load error:", e);
    conversationMessages = [];
  } finally {
    messagesLoading = false;
    triggerUpdate(state);
  }
}

function startConversationsAutoRefresh(state: CRMState) {
  if (conversationsRefreshInterval) return;
  conversationsRefreshInterval = window.setInterval(() => {
    loadConversations(state, true);
    if (selectedConversationId) {
      loadMessages(state, selectedConversationId);
    }
  }, 15000);
}

/* ── Helpers ─────────────────────────────────────────────── */
function filteredCustomers(): Customer[] {
  let filtered = customers;
  if (typeFilter !== "all") {
    filtered = filtered.filter((c) => c.type === typeFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company_name || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q),
    );
  }
  return filtered;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}m`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelIcon(channel: string): string {
  switch (channel?.toLowerCase()) {
    case "whatsapp": return "\uD83D\uDCAC";
    case "instagram": return "\uD83D\uDCF7";
    case "telegram": return "\u2708\uFE0F";
    case "web": return "\uD83C\uDF10";
    default: return "\uD83D\uDCE8";
  }
}

function statusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "open": return "Aberta";
    case "closed": return "Fechada";
    case "pending": return "Pendente";
    default: return status || "—";
  }
}

function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "open": return "#22c55e";
    case "closed": return "#6b7280";
    case "pending": return "#f59e0b";
    default: return "#94a3b8";
  }
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  // Show country code + last 4
  if (phone.startsWith("+595")) return `🇵🇾 ...${phone.slice(-4)}`;
  if (phone.startsWith("+55")) return `🇧🇷 ...${phone.slice(-4)}`;
  return `...${phone.slice(-4)}`;
}

function fullPhone(phone: string): string {
  if (phone.startsWith("+595")) return `🇵🇾 ${phone}`;
  if (phone.startsWith("+55")) return `🇧🇷 ${phone}`;
  return phone;
}

/* ── Render ───────────────────────────────────────────────── */
export function renderCRM(state: CRMState) {
  void loadCustomers(state);
  startAutoRefresh(state);

  if (activeSubTab === "conversas") {
    void loadConversations(state);
    startConversationsAutoRefresh(state);
  } else {
    // M11: Clear conversations refresh interval when not on conversas tab
    if (conversationsRefreshInterval) {
      clearInterval(conversationsRefreshInterval);
      conversationsRefreshInterval = null;
    }
  }

  const filtered = filteredCustomers();
  const b2cCount = customers.filter((c) => c.type === "b2c").length;
  const b2bCount = customers.filter((c) => c.type === "b2b").length;
  const citiesCount = new Set(customers.map((c) => c.city).filter(Boolean)).size;
  const selected = selectedId ? customers.find((c) => c.id === selectedId) : null;

  /* ── Sub-tab handlers ── */
  const handleSubTab = (tab: "clientes" | "conversas") => () => {
    activeSubTab = tab;
    triggerUpdate(state);
  };

  const handleSelectConversation = (id: string) => () => {
    if (selectedConversationId === id) {
      selectedConversationId = null;
      conversationMessages = [];
    } else {
      selectedConversationId = id;
      messageSearchQuery = ""; // L3: Reset search on conversation change
      messagesShowAll = false; // L4: Reset pagination on conversation change
      void loadMessages(state, id);
    }
    triggerUpdate(state);
  };

  const handleRefreshConversations = () => {
    conversationsLoaded = false;
    void loadConversations(state, true);
    if (selectedConversationId) {
      void loadMessages(state, selectedConversationId);
    }
  };

  /* ── Handlers ── */
  const handleSearch = (e: Event) => {
    searchQuery = (e.target as HTMLInputElement).value;
    triggerUpdate(state);
  };

  const handleTypeFilter = (t: "all" | "b2c" | "b2b") => () => {
    typeFilter = t;
    triggerUpdate(state);
  };

  const handleSelect = (id: string) => () => {
    selectedId = selectedId === id ? null : id;
    triggerUpdate(state);
  };

  const handleAdd = () => {
    editing = null;
    formFields = {
      name: "",
      phone: "",
      email: "",
      type: "b2c",
      company_name: "",
      city: "",
      state: "",
      notes: "",
    };
    showForm = true;
    triggerUpdate(state);
  };

  const handleEdit = (c: Customer) => {
    editing = { ...c };
    formFields = {
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      type: c.type,
      company_name: c.company_name || "",
      city: c.city || "",
      state: c.state || "",
      notes: c.notes || "",
    };
    showForm = true;
    triggerUpdate(state);
  };

  const onField = (field: keyof typeof formFields) => (e: Event) => {
    (formFields as any)[field] = (e.target as HTMLInputElement).value;
  };

  const handleCancel = () => {
    showForm = false;
    editing = null;
    triggerUpdate(state);
  };

  const handleSave = async () => {
    const name = formFields.name.trim();
    const phone = formFields.phone.trim();
    if (!name || !phone) return;

    const payload: any = {
      name,
      phone,
      email: formFields.email || null,
      type: formFields.type,
      company_name: formFields.company_name || null,
      city: formFields.city || null,
      state: formFields.state || null,
      notes: formFields.notes || null,
    };

    try {
      if (editing) {
        payload.updated_at = new Date().toISOString();
        const result = await apiFetch(`/customers/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        // Update in-place
        const updated = result?.[0] ?? { ...editing, ...payload };
        const idx = customers.findIndex((c) => c.id === editing!.id);
        if (idx >= 0) {
          customers[idx] = updated;
        }
      } else {
        // POST creates new
        const result = await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result?.[0]) {
          customers.unshift(result[0]);
        }
      }
      showForm = false;
      editing = null;
      showFeedback(state);
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const handleDelete = (c: Customer) => {
    deleteTarget = c;
    triggerUpdate(state);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/customers/${deleteTarget.id}`, { method: "DELETE" });
      customers = customers.filter((x) => x.id !== deleteTarget!.id);
      if (selectedId === deleteTarget.id) selectedId = null;
      deleteTarget = null;
      showFeedback(state);
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const cancelDelete = () => {
    deleteTarget = null;
    triggerUpdate(state);
  };

  function showFeedback(st: CRMState) {
    showSavedBadge = true;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => {
      showSavedBadge = false;
      triggerUpdate(st);
    }, 2500);
  }

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- Sub-Tab Bar -->
      <div class="tv-category-bar" style="margin-bottom: 1rem;">
        <button class="tv-cat-btn ${activeSubTab === "clientes" ? "active" : ""}" @click=${handleSubTab("clientes")}>
          Clientes <span class="tv-cat-count">${customers.length}</span>
        </button>
        <button class="tv-cat-btn ${activeSubTab === "conversas" ? "active" : ""}" @click=${handleSubTab("conversas")}>
          Conversas <span class="tv-cat-count">${conversations.length}</span>
        </button>
      </div>

      ${activeSubTab === "clientes" ? html`
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">👥</div>
          <div>
            <div class="tv-kpi-value">${customers.length}</div>
            <div class="tv-kpi-label">Total Clientes</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🛒</div>
          <div>
            <div class="tv-kpi-value">${b2cCount}</div>
            <div class="tv-kpi-label">Pessoa Fisica (B2C)</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🏢</div>
          <div>
            <div class="tv-kpi-value">${b2bCount}</div>
            <div class="tv-kpi-label">Empresas (B2B)</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📍</div>
          <div>
            <div class="tv-kpi-value">${citiesCount}</div>
            <div class="tv-kpi-label">Cidades</div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div class="tv-search-bar">
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email, empresa..."
            .value=${searchQuery}
            @input=${handleSearch}
          />
        </div>
        <div class="tv-header-actions">
          ${showSavedBadge ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${() => { loaded = false; loadCustomers(state, true); }}>🔄 Atualizar</button>
          <button class="tv-btn-gold" @click=${handleAdd}>+ Novo Cliente</button>
        </div>
      </div>

      <!-- Type Filter Bar -->
      <div class="tv-category-bar">
        <button class="tv-cat-btn ${typeFilter === "all" ? "active" : ""}" @click=${handleTypeFilter("all")}>
          Todos <span class="tv-cat-count">${customers.length}</span>
        </button>
        <button class="tv-cat-btn ${typeFilter === "b2c" ? "active" : ""}" @click=${handleTypeFilter("b2c")}>
          🛒 B2C <span class="tv-cat-count">${b2cCount}</span>
        </button>
        <button class="tv-cat-btn ${typeFilter === "b2b" ? "active" : ""}" @click=${handleTypeFilter("b2b")}>
          🏢 B2B <span class="tv-cat-count">${b2bCount}</span>
        </button>
      </div>

      <!-- Delete Confirmation -->
      ${deleteTarget ? html`
        <div class="tv-confirm-bar">
          <span>Excluir <strong>${deleteTarget.name}</strong> (${deleteTarget.phone})?</span>
          <button class="tv-btn-danger" @click=${confirmDelete}>Confirmar</button>
          <button class="tv-btn-sm" @click=${cancelDelete}>Cancelar</button>
        </div>
      ` : nothing}

      <!-- Customer Form -->
      ${showForm ? html`
        <div class="tv-panel tv-form-panel">
          <h3>${editing ? `Editar: ${editing.name}` : "Novo Cliente"}</h3>
          <div class="tv-form-grid">
            <div class="tv-config-field">
              <label>Nome *</label>
              <input type="text" .value=${formFields.name} @input=${onField("name")} placeholder="Nome completo" />
            </div>
            <div class="tv-config-field">
              <label>Telefone *</label>
              <input type="text" .value=${formFields.phone} @input=${onField("phone")} placeholder="+55 11 99999-9999" />
            </div>
            <div class="tv-config-field">
              <label>Email</label>
              <input type="email" .value=${formFields.email} @input=${onField("email")} placeholder="email@exemplo.com" />
            </div>
            <div class="tv-config-field">
              <label>Tipo</label>
              <select .value=${formFields.type} @change=${onField("type")}>
                <option value="b2c">B2C - Pessoa Fisica</option>
                <option value="b2b">B2B - Empresa</option>
              </select>
            </div>
            <div class="tv-config-field">
              <label>Empresa</label>
              <input type="text" .value=${formFields.company_name} @input=${onField("company_name")} placeholder="Nome da empresa (se B2B)" />
            </div>
            <div class="tv-config-field">
              <label>Cidade</label>
              <input type="text" .value=${formFields.city} @input=${onField("city")} placeholder="Cidade" />
            </div>
            <div class="tv-config-field">
              <label>Estado/Depto</label>
              <input type="text" .value=${formFields.state} @input=${onField("state")} placeholder="SP, RJ, Alto Paraná..." />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Notas</label>
              <textarea rows="2" .value=${formFields.notes} @input=${onField("notes")} placeholder="Observacoes sobre o cliente"></textarea>
            </div>
          </div>
          <div class="tv-config-actions">
            <button class="tv-btn-gold" @click=${handleSave}>${editing ? "Atualizar" : "Adicionar"}</button>
            <button class="tv-btn-outline" @click=${handleCancel}>Cancelar</button>
          </div>
        </div>
      ` : nothing}

      <!-- Customer List -->
      ${filtered.length === 0 && !loading ? html`
        <div class="tv-empty">
          ${searchQuery || typeFilter !== "all"
            ? "Nenhum cliente encontrado com esse filtro."
            : "Nenhum cliente cadastrado. Clique em '+ Novo Cliente' para começar."}
        </div>
      ` : nothing}

      <!-- Customer Grid -->
      <div class="tv-product-grid">
        ${filtered.map((c) => html`
          <div class="tv-product-card ${selectedId === c.id ? "tv-card-selected" : ""}" @click=${handleSelect(c.id)}>
            <div class="tv-product-img" style="
              display: flex; align-items: center; justify-content: center;
              font-size: 2.5rem; background: rgba(107, 15, 26, 0.06);
            ">
              ${c.type === "b2b" ? "🏢" : "👤"}
            </div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${c.name}</strong>
                <span class="tv-badge tv-badge--category" style="
                  background: ${c.type === "b2b" ? "rgba(139, 92, 246, 0.12)" : "rgba(59, 130, 246, 0.12)"};
                  color: ${c.type === "b2b" ? "#8b5cf6" : "#3b82f6"};
                ">${c.type === "b2b" ? "🏢 B2B" : "🛒 B2C"}</span>
              </div>
              <div class="tv-product-sku">
                ${fullPhone(c.phone)}
                ${c.email ? html` · ✉️ ${c.email}` : nothing}
              </div>
              ${c.company_name ? html`<div class="tv-product-sku" style="color: var(--tv-lime-light, #8a1322);">🏢 ${c.company_name}</div>` : nothing}
              ${c.city ? html`<div class="tv-product-sku">📍 ${c.city}${c.state ? `, ${c.state}` : ""}</div>` : nothing}
              ${c.notes ? html`<div class="tv-product-desc">${c.notes}</div>` : nothing}
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
                <span style="font-size:0.72rem;color:var(--tv-text-muted)">Cadastro: ${formatDate(c.created_at)}</span>
                <span style="font-size:0.72rem;color:var(--tv-text-muted)">Atualizado: ${timeAgo(c.updated_at)}</span>
              </div>
              <div class="tv-product-actions">
                <button class="tv-btn-sm" @click=${(e: Event) => { e.stopPropagation(); handleEdit(c); }}>✏️ Editar</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${(e: Event) => { e.stopPropagation(); handleDelete(c); }}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>

      <!-- Selected Customer Detail -->
      ${selected ? html`
        <div class="tv-panel" style="border-left: 3px solid var(--accent, #6B0F1A); margin-top: 1rem;">
          <h3 style="margin: 0 0 0.75rem; font-size: 1.1rem;">${selected.name}</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
            <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Telefone</span><br/><strong>${fullPhone(selected.phone)}</strong></div>
            <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Email</span><br/><strong>${selected.email || "—"}</strong></div>
            <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Tipo</span><br/><strong>${selected.type === "b2b" ? "Empresa (B2B)" : "Pessoa Fisica (B2C)"}</strong></div>
            ${selected.company_name ? html`<div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Empresa</span><br/><strong>${selected.company_name}</strong></div>` : nothing}
            <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Localidade</span><br/><strong>${selected.city || "—"}${selected.state ? `, ${selected.state}` : ""}</strong></div>
            <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Cadastrado em</span><br/><strong>${formatDate(selected.created_at)}</strong></div>
          </div>
          ${selected.notes ? html`
            <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px;">
              <span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Notas</span><br/>
              <span style="font-size: 0.85rem;">${selected.notes}</span>
            </div>
          ` : nothing}
        </div>
      ` : nothing}
      ` : nothing}

      ${activeSubTab === "conversas" ? html`
      <!-- Conversations Header -->
      <div class="tv-panel-header">
        <div class="tv-search-bar" style="flex:1;">
          <span style="font-size:1.1rem;font-weight:600;">Conversas</span>
        </div>
        <div class="tv-header-actions">
          ${conversationsLoading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">&#10227; Carregando...</span>` : nothing}
          ${conversationsError ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${conversationsError}>&#9888; Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${handleRefreshConversations}>&#128260; Atualizar</button>
        </div>
      </div>

      <!-- Conversations KPI -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">&#128172;</div>
          <div>
            <div class="tv-kpi-value">${conversations.length}</div>
            <div class="tv-kpi-label">Total Conversas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">&#9989;</div>
          <div>
            <div class="tv-kpi-value">${conversations.filter((c) => c.status === "open").length}</div>
            <div class="tv-kpi-label">Abertas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">&#9203;</div>
          <div>
            <div class="tv-kpi-value">${conversations.filter((c) => c.status === "pending").length}</div>
            <div class="tv-kpi-label">Pendentes</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">&#9989;</div>
          <div>
            <div class="tv-kpi-value">${conversations.filter((c) => c.status === "closed").length}</div>
            <div class="tv-kpi-label">Fechadas</div>
          </div>
        </div>
      </div>

      <!-- Conversations List -->
      ${conversations.length === 0 && !conversationsLoading ? html`
        <div class="tv-empty">Nenhuma conversa encontrada.</div>
      ` : nothing}

      <div class="tv-product-grid">
        ${conversations.map((conv) => html`
          <div class="tv-product-card ${selectedConversationId === conv.id ? "tv-card-selected" : ""}" @click=${handleSelectConversation(conv.id)}>
            <div class="tv-product-img" style="
              display: flex; align-items: center; justify-content: center;
              font-size: 2.5rem; background: rgba(107, 15, 26, 0.06);
            ">
              ${channelIcon(conv.channel)}
            </div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${conv.customer?.name || "Cliente desconhecido"}</strong>
                <span class="tv-badge tv-badge--category" style="
                  background: rgba(${conv.status === "open" ? "34,197,94" : conv.status === "pending" ? "245,158,11" : "107,114,128"}, 0.12);
                  color: ${statusColor(conv.status)};
                ">${statusLabel(conv.status)}</span>
              </div>
              <div class="tv-product-sku">
                ${channelIcon(conv.channel)} ${conv.channel || "—"}
                ${conv.customer?.phone ? html` &middot; ${maskPhone(conv.customer.phone)}` : nothing}
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
                <span style="font-size:0.72rem;color:var(--tv-text-muted)">Criada: ${formatDate(conv.created_at)}</span>
                <span style="font-size:0.72rem;color:var(--tv-text-muted)">Atualizada: ${timeAgo(conv.updated_at)}</span>
              </div>
            </div>
          </div>
        `)}
      </div>

      <!-- Message Thread -->
      ${selectedConversationId ? html`
        <div class="tv-panel" style="border-left: 3px solid var(--accent, #6B0F1A); margin-top: 1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:1.1rem;">
              Mensagens (${conversationMessages.length})
              ${messagesLoading ? html` <span style="font-size:0.8rem;color:var(--tv-text-muted);">(carregando...)</span>` : nothing}
            </h3>
            <!-- L3: Search in messages -->
            <input type="text" placeholder="Buscar mensagens..."
              .value=${messageSearchQuery}
              @input=${(e: Event) => { messageSearchQuery = (e.target as HTMLInputElement).value; triggerUpdate(state); }}
              style="font-size:0.8rem;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:inherit;max-width:200px;" />
          </div>
          ${conversationMessages.length === 0 && !messagesLoading ? html`
            <div class="tv-empty" style="padding:1rem 0;">Nenhuma mensagem nesta conversa.</div>
          ` : nothing}
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-height:400px;overflow-y:auto;padding-right:0.5rem;">
            ${(() => {
              // L3: Filter messages by search query
              let msgs = conversationMessages;
              if (messageSearchQuery.trim()) {
                const q = messageSearchQuery.toLowerCase();
                msgs = msgs.filter((m) => m.content.toLowerCase().includes(q));
              }
              // L4: Paginate messages
              const visibleMsgs = messagesShowAll ? msgs : msgs.slice(0, messagesPageSize);
              const hasMore = msgs.length > messagesPageSize && !messagesShowAll;
              return html`
                ${visibleMsgs.map((msg) => html`
              <div style="
                padding: 0.6rem 0.8rem;
                border-radius: 10px;
                background: ${msg.role === "assistant"
                  ? "rgba(107, 15, 26, 0.08)"
                  : msg.role === "system"
                    ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(59, 130, 246, 0.08)"};
                border: 1px solid ${msg.role === "assistant"
                  ? "rgba(107, 15, 26, 0.15)"
                  : msg.role === "system"
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(59, 130, 246, 0.15)"};
                align-self: ${msg.role === "user" ? "flex-end" : "flex-start"};
                max-width: 80%;
              ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
                  <span style="
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: ${msg.role === "assistant" ? "#6B0F1A" : msg.role === "system" ? "#f59e0b" : "#3b82f6"};
                  ">${msg.role === "assistant" ? "Troy Agent" : msg.role === "system" ? "Sistema" : "Cliente"}</span>
                  <span style="font-size:0.65rem;color:var(--tv-text-muted);">${formatDateTime(msg.created_at)}</span>
                </div>
                <div style="font-size:0.85rem;white-space:pre-wrap;word-break:break-word;">${msg.content}</div>
              </div>
            `)}
                ${hasMore ? html`
                  <button class="tv-btn-sm" style="align-self:center;margin-top:4px;" @click=${() => { messagesShowAll = true; triggerUpdate(state); }}>
                    Mostrar todas (${msgs.length - messagesPageSize} restantes)
                  </button>
                ` : nothing}
              `;
            })()}
          </div>
        </div>
      ` : nothing}
      ` : nothing}
    </div>
  `;
}
