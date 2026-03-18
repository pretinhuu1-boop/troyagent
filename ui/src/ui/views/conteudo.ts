import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  mountRichEditor,
  destroyRichEditor,
  toggleBold,
  toggleItalic,
  toggleStrike,
  toggleHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleBlockquote,
  toggleCodeBlock,
  insertHR,
  setLink,
  insertImage,
  undo,
  redo,
  isActive,
} from "../rich-editor.ts";

/* ── API Config (backend proxy) ───────────────────────────── */
const API_BASE = "/api";

/* ── Types ───────────────────────────────────────────────── */
interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "archived";
  body_html: string;
  meta_description: string | null;
  tags: string[];
  author: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarEntry {
  id: string;
  title: string;
  article_id: string | null;
  scheduled_date: string;
  status: "planned" | "writing" | "review" | "published";
  assigned_agent: string | null;
  notes: string | null;
  created_at: string;
}

interface ConteudoState {
  state: {
    requestUpdate?: () => void;
  };
  requestUpdate?: () => void;
}

/* ── State ───────────────────────────────────────────────── */
let articles: Article[] = [];
let calendar: CalendarEntry[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let activeSubTab: "artigos" | "calendario" | "sync" = "artigos";
let searchQuery = "";
let categoryFilter = "all";
let statusFilter: "all" | "draft" | "published" | "archived" = "all";

/* ── Calendar state ── */
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth(); // 0-indexed
let calSelectedDate: string | null = null; // "YYYY-MM-DD"
let calShowForm = false;
let calEditing: CalendarEntry | null = null;
let calFormFields = {
  title: "",
  article_id: "",
  scheduled_date: "",
  status: "planned" as CalendarEntry["status"],
  assigned_agent: "",
  notes: "",
};
let selectedArticle: Article | null = null;
let showForm = false;
let editing: Article | null = null;
let deleteTarget: Article | null = null;
let showSavedBadge = false;
let savedTimer: number | null = null;
let refreshInterval: number | null = null;
let editorMounted = false;

let formFields = {
  title: "",
  slug: "",
  category: "peptideos",
  status: "draft" as "draft" | "published" | "archived",
  body_html: "",
  meta_description: "",
  tags: "",
  author: "",
};

/* ── Trigger Update ──────────────────────────────────────── */
function triggerUpdate(s: ConteudoState) {
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

/* ── Load & Refresh ──────────────────────────────────────── */
async function loadArticles(state: ConteudoState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    articles = (await apiFetch("/articles")) || [];
    loaded = true;
  } catch (e: any) {
    // API might not exist yet — show empty state
    if (e.message?.includes("404") || e.message?.includes("405")) {
      articles = [];
      loaded = true;
    } else {
      error = e.message || "Erro ao carregar artigos";
      console.error("[conteudo] load error:", e);
    }
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

async function loadCalendar(state: ConteudoState) {
  try {
    calendar = (await apiFetch("/content-calendar")) || [];
  } catch {
    calendar = [];
  }
  triggerUpdate(state);
}

function startAutoRefresh(state: ConteudoState) {
  if (refreshInterval) return;
  refreshInterval = window.setInterval(() => {
    loadArticles(state, true);
  }, 30000);
}

/* ── Helpers ─────────────────────────────────────────────── */
function filteredArticles(): Article[] {
  let filtered = articles;
  if (statusFilter !== "all") {
    filtered = filtered.filter((a) => a.status === statusFilter);
  }
  if (categoryFilter !== "all") {
    filtered = filtered.filter((a) => a.category === categoryFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.meta_description || "").toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q)),
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function showFeedback(st: ConteudoState) {
  showSavedBadge = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    showSavedBadge = false;
    triggerUpdate(st);
  }, 2500);
}

function uniqueCategories(): string[] {
  return [...new Set(articles.map((a) => a.category).filter(Boolean))].sort();
}

/* ── Render ───────────────────────────────────────────────── */
export function renderConteudo(state: ConteudoState) {
  void loadArticles(state);
  startAutoRefresh(state);

  const filtered = filteredArticles();
  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.filter((a) => a.status === "draft").length;
  const categories = uniqueCategories();

  /* ── Handlers ── */
  const handleSearch = (e: Event) => {
    searchQuery = (e.target as HTMLInputElement).value;
    triggerUpdate(state);
  };

  const handleStatusFilter = (s: typeof statusFilter) => () => {
    statusFilter = s;
    triggerUpdate(state);
  };

  const handleSubTab = (tab: typeof activeSubTab) => () => {
    activeSubTab = tab;
    if (tab === "calendario" && calendar.length === 0) {
      loadCalendar(state);
    }
    triggerUpdate(state);
  };

  const handleAdd = () => {
    editing = null;
    formFields = {
      title: "",
      slug: "",
      category: "peptideos",
      status: "draft",
      body_html: "",
      meta_description: "",
      tags: "",
      author: "",
    };
    destroyRichEditor();
    editorMounted = false;
    showForm = true;
    triggerUpdate(state);
  };

  const handleEdit = (a: Article) => {
    editing = { ...a };
    formFields = {
      title: a.title,
      slug: a.slug,
      category: a.category,
      status: a.status,
      body_html: a.body_html,
      meta_description: a.meta_description || "",
      // M12: Normalize tags (handle both string and array from API)
      tags: Array.isArray(a.tags) ? a.tags.join(", ") : (a.tags || ""),
      author: a.author || "",
    };
    destroyRichEditor();
    editorMounted = false;
    showForm = true;
    triggerUpdate(state);
  };

  const onField = (field: keyof typeof formFields) => (e: Event) => {
    (formFields as any)[field] = (e.target as HTMLInputElement).value;
    if (field === "title" && !editing) {
      formFields.slug = slugify(formFields.title);
    }
  };

  const handleCancel = () => {
    destroyRichEditor();
    editorMounted = false;
    showForm = false;
    editing = null;
    triggerUpdate(state);
  };

  const handleSave = async () => {
    const title = formFields.title.trim();
    if (!title) return;

    const payload: any = {
      title,
      slug: formFields.slug || slugify(title),
      category: formFields.category,
      status: formFields.status,
      body_html: formFields.body_html,
      meta_description: formFields.meta_description || null,
      // M12: Normalize tags — always save as array
      tags: (typeof formFields.tags === "string" ? formFields.tags : String(formFields.tags))
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      author: formFields.author || null,
    };

    try {
      if (editing) {
        payload.updated_at = new Date().toISOString();
        const result = await apiFetch(`/articles/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const updated = result?.[0] ?? { ...editing, ...payload };
        const idx = articles.findIndex((a) => a.id === editing!.id);
        if (idx >= 0) {
          articles[idx] = updated;
        }
      } else {
        const result = await apiFetch("/articles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result?.[0]) {
          articles.unshift(result[0]);
        }
      }
      destroyRichEditor();
      editorMounted = false;
      showForm = false;
      editing = null;
      showFeedback(state);
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const handleDelete = (a: Article) => {
    deleteTarget = a;
    triggerUpdate(state);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/articles/${deleteTarget.id}`, { method: "DELETE" });
      articles = articles.filter((x) => x.id !== deleteTarget!.id);
      if (selectedArticle?.id === deleteTarget.id) selectedArticle = null;
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

  const handleSelect = (a: Article) => () => {
    selectedArticle = selectedArticle?.id === a.id ? null : a;
    triggerUpdate(state);
  };

  /* ── Sub-tab: Artigos ── */
  const renderArtigos = () => html`
    <!-- Status Filter Bar -->
    <div class="tv-category-bar">
      <button class="tv-cat-btn ${statusFilter === "all" ? "active" : ""}" @click=${handleStatusFilter("all")}>
        Todos <span class="tv-cat-count">${articles.length}</span>
      </button>
      <button class="tv-cat-btn ${statusFilter === "published" ? "active" : ""}" @click=${handleStatusFilter("published")}>
        Publicados <span class="tv-cat-count">${publishedCount}</span>
      </button>
      <button class="tv-cat-btn ${statusFilter === "draft" ? "active" : ""}" @click=${handleStatusFilter("draft")}>
        Rascunhos <span class="tv-cat-count">${draftCount}</span>
      </button>
      <button class="tv-cat-btn ${statusFilter === "archived" ? "active" : ""}" @click=${handleStatusFilter("archived")}>
        Arquivados <span class="tv-cat-count">${articles.filter((a) => a.status === "archived").length}</span>
      </button>
    </div>

    <!-- Delete Confirmation -->
    ${deleteTarget ? html`
      <div class="tv-confirm-bar">
        <span>Excluir <strong>${deleteTarget.title}</strong>?</span>
        <button class="tv-btn-danger" @click=${confirmDelete}>Confirmar</button>
        <button class="tv-btn-sm" @click=${cancelDelete}>Cancelar</button>
      </div>
    ` : nothing}

    <!-- Article Form -->
    ${showForm ? html`
      <div class="tv-panel tv-form-panel">
        <h3>${editing ? `Editar: ${editing.title}` : "Novo Artigo"}</h3>
        <div class="tv-form-grid">
          <div class="tv-config-field">
            <label>Titulo *</label>
            <input type="text" .value=${formFields.title} @input=${onField("title")} placeholder="Titulo do artigo" />
          </div>
          <div class="tv-config-field">
            <label>Slug</label>
            <input type="text" .value=${formFields.slug} @input=${onField("slug")} placeholder="slug-do-artigo" />
          </div>
          <div class="tv-config-field">
            <label>Categoria</label>
            <select .value=${formFields.category} @change=${onField("category")}>
              <option value="peptideos">Peptideos</option>
              <option value="saude">Saude</option>
              <option value="nutricao">Nutricao</option>
              <option value="estetica">Estetica</option>
              <option value="pesquisa">Pesquisa</option>
              <option value="guia">Guia</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div class="tv-config-field">
            <label>Status</label>
            <select .value=${formFields.status} @change=${onField("status")}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div class="tv-config-field">
            <label>Tags (separadas por virgula)</label>
            <input type="text" .value=${formFields.tags} @input=${onField("tags")} placeholder="semaglutida, glp-1, peptideo" />
          </div>
          <div class="tv-config-field">
            <label>Autor</label>
            <input type="text" .value=${formFields.author} @input=${onField("author")} placeholder="TAURA Editor" />
          </div>
          <div class="tv-config-field" style="grid-column: span 2;">
            <label>Meta Description (SEO)</label>
            <textarea rows="2" .value=${formFields.meta_description} @input=${onField("meta_description")} placeholder="Descricao para mecanismos de busca..."></textarea>
          </div>
          <div class="tv-config-field" style="grid-column: span 2;">
            <label>Conteudo</label>
            <div class="tv-rich-editor-wrap">
              <div class="tv-rich-editor-toolbar">
                <button title="Desfazer" @click=${() => { undo(); triggerUpdate(state); }}>↩</button>
                <button title="Refazer" @click=${() => { redo(); triggerUpdate(state); }}>↪</button>
                <span class="tv-toolbar-sep"></span>
                <button class="${isActive("bold") ? "active" : ""}" title="Negrito" @click=${() => { toggleBold(); triggerUpdate(state); }}><strong>B</strong></button>
                <button class="${isActive("italic") ? "active" : ""}" title="Italico" @click=${() => { toggleItalic(); triggerUpdate(state); }}><em>I</em></button>
                <button class="${isActive("strike") ? "active" : ""}" title="Tachado" @click=${() => { toggleStrike(); triggerUpdate(state); }}><s>S</s></button>
                <span class="tv-toolbar-sep"></span>
                <button class="${isActive("heading", { level: 2 }) ? "active" : ""}" title="Titulo H2" @click=${() => { toggleHeading(2); triggerUpdate(state); }}>H2</button>
                <button class="${isActive("heading", { level: 3 }) ? "active" : ""}" title="Titulo H3" @click=${() => { toggleHeading(3); triggerUpdate(state); }}>H3</button>
                <button class="${isActive("heading", { level: 4 }) ? "active" : ""}" title="Titulo H4" @click=${() => { toggleHeading(4); triggerUpdate(state); }}>H4</button>
                <span class="tv-toolbar-sep"></span>
                <button class="${isActive("bulletList") ? "active" : ""}" title="Lista" @click=${() => { toggleBulletList(); triggerUpdate(state); }}>&#8226; Lista</button>
                <button class="${isActive("orderedList") ? "active" : ""}" title="Lista numerada" @click=${() => { toggleOrderedList(); triggerUpdate(state); }}>1. Lista</button>
                <button class="${isActive("blockquote") ? "active" : ""}" title="Citacao" @click=${() => { toggleBlockquote(); triggerUpdate(state); }}>" Citar</button>
                <button class="${isActive("codeBlock") ? "active" : ""}" title="Bloco de codigo" @click=${() => { toggleCodeBlock(); triggerUpdate(state); }}>&lt;/&gt;</button>
                <span class="tv-toolbar-sep"></span>
                <button title="Link" @click=${() => { setLink(); triggerUpdate(state); }}>🔗</button>
                <button title="Imagem" @click=${() => { insertImage(); triggerUpdate(state); }}>🖼</button>
                <button title="Linha horizontal" @click=${() => { insertHR(); triggerUpdate(state); }}>—</button>
              </div>
              <div class="tv-rich-editor-container" id="conteudo-rich-editor"></div>
            </div>
          </div>
        </div>
        <div class="tv-config-actions">
          <button class="tv-btn-gold" @click=${handleSave}>${editing ? "Atualizar" : "Criar Artigo"}</button>
          <button class="tv-btn-outline" @click=${handleCancel}>Cancelar</button>
        </div>
      </div>
    ` : nothing}

    ${showForm && !editorMounted ? (() => {
      editorMounted = true;
      // Defer mount to next frame so the DOM element exists
      requestAnimationFrame(() => {
        const container = document.getElementById("conteudo-rich-editor");
        if (container) {
          mountRichEditor("conteudo-rich-editor", formFields.body_html, (h) => {
            formFields.body_html = h;
          });
        } else {
          // Container not found; retry once more after another frame
          requestAnimationFrame(() => {
            mountRichEditor("conteudo-rich-editor", formFields.body_html, (h) => {
              formFields.body_html = h;
            });
          });
        }
      });
      return nothing;
    })() : nothing}

    <!-- Article List -->
    ${filtered.length === 0 && !loading ? html`
      <div class="tv-empty">
        ${searchQuery || statusFilter !== "all"
          ? "Nenhum artigo encontrado com esse filtro."
          : "Nenhum artigo cadastrado. Clique em '+ Novo Artigo' para comecar ou aguarde a criacao das tabelas no Supabase."}
      </div>
    ` : nothing}

    <!-- Article Grid -->
    <div class="tv-product-grid">
      ${filtered.map((a) => html`
        <div class="tv-product-card ${selectedArticle?.id === a.id ? "tv-card-selected" : ""}" @click=${handleSelect(a)}>
          <div class="tv-product-img" style="
            display: flex; align-items: center; justify-content: center;
            font-size: 2.5rem; background: rgba(107, 15, 26, 0.06);
          ">
            ${a.status === "published" ? "📄" : a.status === "draft" ? "📝" : "📦"}
          </div>
          <div class="tv-product-body">
            <div class="tv-product-header">
              <strong>${a.title}</strong>
              <span class="tv-badge tv-badge--category" style="
                background: ${a.status === "published" ? "rgba(34, 197, 94, 0.12)" : a.status === "draft" ? "rgba(234, 179, 8, 0.12)" : "rgba(107, 114, 128, 0.12)"};
                color: ${a.status === "published" ? "#22c55e" : a.status === "draft" ? "#eab308" : "#6b7280"};
              ">${a.status === "published" ? "Publicado" : a.status === "draft" ? "Rascunho" : "Arquivado"}</span>
            </div>
            <div class="tv-product-sku">/${a.slug}</div>
            ${a.category ? html`<div class="tv-product-sku" style="color: var(--tv-lime-light, #8a1322);">${a.category}</div>` : nothing}
            ${a.meta_description ? html`<div class="tv-product-desc">${a.meta_description}</div>` : nothing}
            ${a.tags?.length ? html`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
              ${a.tags.map((tag) => html`<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(107,15,26,0.08);color:var(--tv-text-muted)">${tag}</span>`)}
            </div>` : nothing}
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
              <span style="font-size:0.72rem;color:var(--tv-text-muted)">Criado: ${formatDate(a.created_at)}</span>
              ${a.published_at ? html`<span style="font-size:0.72rem;color:var(--tv-text-muted)">Publicado: ${formatDate(a.published_at)}</span>` : nothing}
            </div>
            <div class="tv-product-actions">
              <button class="tv-btn-sm" @click=${(e: Event) => { e.stopPropagation(); handleEdit(a); }}>✏️ Editar</button>
              <button class="tv-btn-sm tv-btn-sm--danger" @click=${(e: Event) => { e.stopPropagation(); handleDelete(a); }}>🗑️</button>
            </div>
          </div>
        </div>
      `)}
    </div>

    <!-- Selected Article Preview -->
    ${selectedArticle ? html`
      <div class="tv-panel" style="border-left: 3px solid var(--accent, #6B0F1A); margin-top: 1rem;">
        <h3 style="margin: 0 0 0.75rem; font-size: 1.1rem;">${selectedArticle.title}</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
          <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Slug</span><br/><strong>/${selectedArticle.slug}</strong></div>
          <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Categoria</span><br/><strong>${selectedArticle.category}</strong></div>
          <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Status</span><br/><strong>${selectedArticle.status}</strong></div>
          <div><span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Autor</span><br/><strong>${selectedArticle.author || "—"}</strong></div>
        </div>
        ${selectedArticle.body_html ? html`
          <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; max-height: 300px; overflow-y: auto;">
            <span style="font-size:0.7rem;color:var(--tv-text-muted);text-transform:uppercase;">Preview</span><br/>
            <div style="font-size: 0.85rem; line-height: 1.6;">${unsafeHTML(selectedArticle.body_html)}</div>
          </div>
        ` : nothing}
      </div>
    ` : nothing}
  `;

  /* ── Sub-tab: Calendario ── */
  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const MONTH_NAMES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const CAL_STATUS_COLORS: Record<string, string> = {
    planned: "#3498db",
    writing: "#f39c12",
    review: "#9b59b6",
    published: "#22c55e",
  };

  function calDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
  function calFirstDayOfWeek(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
  }
  function calDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function calEntriesForDate(dateStr: string): CalendarEntry[] {
    return calendar.filter((c) => c.scheduled_date === dateStr);
  }

  const calPrevMonth = () => {
    calViewMonth--;
    if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
    triggerUpdate(state);
  };
  const calNextMonth = () => {
    calViewMonth++;
    if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
    triggerUpdate(state);
  };
  const calToday = () => {
    const now = new Date();
    calViewYear = now.getFullYear();
    calViewMonth = now.getMonth();
    triggerUpdate(state);
  };

  const calClickDate = (dateStr: string) => () => {
    calSelectedDate = calSelectedDate === dateStr ? null : dateStr;
    triggerUpdate(state);
  };

  const calAddEntry = (dateStr: string) => () => {
    calEditing = null;
    calFormFields = {
      title: "",
      article_id: "",
      scheduled_date: dateStr,
      status: "planned",
      assigned_agent: "",
      notes: "",
    };
    calShowForm = true;
    triggerUpdate(state);
  };

  const calEditEntry = (entry: CalendarEntry) => () => {
    calEditing = entry;
    calFormFields = {
      title: entry.title,
      article_id: entry.article_id || "",
      scheduled_date: entry.scheduled_date,
      status: entry.status,
      assigned_agent: entry.assigned_agent || "",
      notes: entry.notes || "",
    };
    calShowForm = true;
    triggerUpdate(state);
  };

  const calCancelForm = () => {
    calShowForm = false;
    calEditing = null;
    triggerUpdate(state);
  };

  const calSaveEntry = async () => {
    if (!calFormFields.title.trim()) return;
    const payload: Record<string, unknown> = {
      title: calFormFields.title.trim(),
      scheduled_date: calFormFields.scheduled_date,
      status: calFormFields.status,
      assigned_agent: calFormFields.assigned_agent || null,
      notes: calFormFields.notes || null,
      article_id: calFormFields.article_id || null,
    };
    try {
      if (calEditing) {
        const result = await apiFetch(`/content-calendar/${calEditing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const updated = result?.[0] ?? { ...calEditing, ...payload };
        const idx = calendar.findIndex((c) => c.id === calEditing!.id);
        if (idx >= 0) calendar[idx] = updated;
      } else {
        const result = await apiFetch("/content-calendar", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result?.[0]) calendar.push(result[0]);
      }
      calShowForm = false;
      calEditing = null;
      showFeedback(state);
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const calDeleteEntry = (entry: CalendarEntry) => async () => {
    try {
      await apiFetch(`/content-calendar/${entry.id}`, { method: "DELETE" });
      calendar = calendar.filter((c) => c.id !== entry.id);
      showFeedback(state);
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const calOnField = (field: keyof typeof calFormFields) => (e: Event) => {
    (calFormFields as any)[field] = (e.target as HTMLInputElement).value;
  };

  const todayStr = calDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const daysInMonth = calDaysInMonth(calViewYear, calViewMonth);
  const firstDay = calFirstDayOfWeek(calViewYear, calViewMonth);

  const renderCalendario = () => html`
    <!-- Calendar Form (modal-style) -->
    ${calShowForm ? html`
      <div class="tv-panel tv-form-panel" style="margin-bottom: 1rem; border-left: 3px solid var(--accent, #6B0F1A);">
        <h3>${calEditing ? "Editar Entrada" : "Nova Entrada"} — ${calFormFields.scheduled_date}</h3>
        <div class="tv-form-grid">
          <div class="tv-config-field">
            <label>Titulo *</label>
            <input type="text" .value=${calFormFields.title} @input=${calOnField("title")} placeholder="Titulo da entrada" />
          </div>
          <div class="tv-config-field">
            <label>Data</label>
            <input type="date" .value=${calFormFields.scheduled_date} @input=${calOnField("scheduled_date")} />
          </div>
          <div class="tv-config-field">
            <label>Status</label>
            <select .value=${calFormFields.status} @change=${calOnField("status")}>
              <option value="planned">Planejado</option>
              <option value="writing">Escrevendo</option>
              <option value="review">Revisao</option>
              <option value="published">Publicado</option>
            </select>
          </div>
          <div class="tv-config-field">
            <label>Agente</label>
            <input type="text" .value=${calFormFields.assigned_agent} @input=${calOnField("assigned_agent")} placeholder="content-editor" />
          </div>
          <div class="tv-config-field">
            <label>Artigo vinculado</label>
            <!-- M13: Autocomplete datalist instead of plain select -->
            <input type="text" list="conteudo-articles-datalist"
              .value=${calFormFields.article_id ? (articles.find((a) => a.id === calFormFields.article_id)?.title || calFormFields.article_id) : ""}
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                const match = articles.find((a) => a.title === val);
                calFormFields.article_id = match ? match.id : "";
              }}
              placeholder="Buscar artigo..." />
            <datalist id="conteudo-articles-datalist">
              ${articles.map((a) => html`<option value=${a.title}></option>`)}
            </datalist>
          </div>
          <div class="tv-config-field">
            <label>Notas</label>
            <input type="text" .value=${calFormFields.notes} @input=${calOnField("notes")} placeholder="Observacoes..." />
          </div>
        </div>
        <div class="tv-config-actions">
          <button class="tv-btn-gold" @click=${calSaveEntry}>${calEditing ? "Atualizar" : "Criar"}</button>
          <button class="tv-btn-outline" @click=${calCancelForm}>Cancelar</button>
        </div>
      </div>
    ` : nothing}

    <!-- Month Navigation -->
    <div class="tv-cal-nav">
      <button class="tv-btn-sm" @click=${calPrevMonth}>◀</button>
      <button class="tv-btn-sm" @click=${calToday}>Hoje</button>
      <span class="tv-cal-month-title">${MONTH_NAMES[calViewMonth]} ${calViewYear}</span>
      <button class="tv-btn-sm" @click=${calNextMonth}>▶</button>
    </div>

    <!-- Calendar Grid -->
    <div class="tv-cal-grid">
      ${WEEKDAYS.map((d) => html`<div class="tv-cal-weekday">${d}</div>`)}
      ${Array.from({ length: firstDay }, (_, i) => html`<div class="tv-cal-day tv-cal-day--empty" key="empty-${i}"></div>`)}
      ${Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = calDateStr(calViewYear, calViewMonth, day);
        const entries = calEntriesForDate(dateStr);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === calSelectedDate;
        return html`
          <div class="tv-cal-day ${isToday ? "tv-cal-day--today" : ""} ${isSelected ? "tv-cal-day--selected" : ""} ${entries.length > 0 ? "tv-cal-day--has-entries" : ""}" @click=${calClickDate(dateStr)}>
            <div class="tv-cal-day-num">${day}</div>
            ${entries.slice(0, 3).map((e) => html`
              <div class="tv-cal-entry" style="border-left-color: ${CAL_STATUS_COLORS[e.status] || "#888"};" title="${e.title} (${e.status})" @click=${(ev: Event) => { ev.stopPropagation(); calEditEntry(e)(); }}>
                ${e.title.length > 18 ? e.title.slice(0, 18) + "..." : e.title}
              </div>
            `)}
            ${entries.length > 3 ? html`<div class="tv-cal-more">+${entries.length - 3} mais</div>` : nothing}
          </div>
        `;
      })}
    </div>

    <!-- Selected Date Detail -->
    ${calSelectedDate ? html`
      <div class="tv-panel" style="margin-top: 1rem; border-left: 3px solid var(--accent, #6B0F1A);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1rem;">${calSelectedDate}</h3>
          <button class="tv-btn-sm" @click=${calAddEntry(calSelectedDate)}>+ Nova Entrada</button>
        </div>
        ${calEntriesForDate(calSelectedDate).length === 0 ? html`
          <div style="color: var(--tv-text-muted); font-size: 0.85rem;">Nenhuma entrada nesta data.</div>
        ` : html`
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${calEntriesForDate(calSelectedDate).map((entry) => html`
              <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                <div style="width: 4px; height: 32px; border-radius: 2px; background: ${CAL_STATUS_COLORS[entry.status] || "#888"};"></div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; font-size: 0.9rem;">${entry.title}</div>
                  <div style="font-size: 0.75rem; color: var(--tv-text-muted); display: flex; gap: 8px; flex-wrap: wrap;">
                    <span>${entry.status}</span>
                    ${entry.assigned_agent ? html`<span>👤 ${entry.assigned_agent}</span>` : nothing}
                    ${entry.notes ? html`<span>📝 ${entry.notes}</span>` : nothing}
                  </div>
                </div>
                <button class="tv-btn-sm" @click=${calEditEntry(entry)}>✏️</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${calDeleteEntry(entry)}>🗑️</button>
              </div>
            `)}
          </div>
        `}
      </div>
    ` : nothing}
  `;

  /* ── Sub-tab: Sync ── */
  const renderSync = () => html`
    <div class="tv-panel">
      <h3>Sincronizacao com Landing Page</h3>
      <p style="color: var(--tv-text-muted); font-size: 0.85rem;">
        Gera os arquivos <code>articles.js</code> e <code>peptides.js</code> usados pela landing page TAURA.
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📄</div>
          <div>
            <div class="tv-kpi-value">${articles.length}</div>
            <div class="tv-kpi-label">Total Artigos</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🟢</div>
          <div>
            <div class="tv-kpi-value">${publishedCount}</div>
            <div class="tv-kpi-label">Publicados</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📦</div>
          <div>
            <div class="tv-kpi-value">${categories.length}</div>
            <div class="tv-kpi-label">Categorias</div>
          </div>
        </div>
      </div>
      <div class="tv-config-actions" style="margin-top: 1rem;">
        <button class="tv-btn-gold" @click=${async () => {
          try {
            await apiFetch("/articles/sync", { method: "POST" });
            showFeedback(state);
          } catch (e: any) {
            error = e.message;
            triggerUpdate(state);
          }
        }}>Sincronizar Agora</button>
        <span style="font-size: 0.8rem; color: var(--tv-text-muted);">
          Gera articles.js + peptides.js para a landing page
        </span>
      </div>
    </div>
  `;

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📰</div>
          <div>
            <div class="tv-kpi-value">${articles.length}</div>
            <div class="tv-kpi-label">Total Artigos</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🟢</div>
          <div>
            <div class="tv-kpi-value">${publishedCount}</div>
            <div class="tv-kpi-label">Publicados</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📝</div>
          <div>
            <div class="tv-kpi-value">${draftCount}</div>
            <div class="tv-kpi-label">Rascunhos</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📂</div>
          <div>
            <div class="tv-kpi-value">${categories.length}</div>
            <div class="tv-kpi-label">Categorias</div>
          </div>
        </div>
      </div>

      <!-- Sub-tab Navigation -->
      <div class="tv-category-bar" style="margin-bottom: 0.5rem;">
        <button class="tv-cat-btn ${activeSubTab === "artigos" ? "active" : ""}" @click=${handleSubTab("artigos")}>
          📰 Artigos
        </button>
        <button class="tv-cat-btn ${activeSubTab === "calendario" ? "active" : ""}" @click=${handleSubTab("calendario")}>
          📅 Calendario
        </button>
        <button class="tv-cat-btn ${activeSubTab === "sync" ? "active" : ""}" @click=${handleSubTab("sync")}>
          🔄 Sincronizacao
        </button>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div class="tv-search-bar">
          <input
            type="text"
            placeholder="Buscar por titulo, slug, tag..."
            .value=${searchQuery}
            @input=${handleSearch}
          />
        </div>
        <div class="tv-header-actions">
          ${showSavedBadge ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${() => { loaded = false; loadArticles(state, true); }}>🔄 Atualizar</button>
          ${activeSubTab === "artigos" ? html`<button class="tv-btn-gold" @click=${handleAdd}>+ Novo Artigo</button>` : nothing}
        </div>
      </div>

      <!-- Active Sub-tab Content -->
      ${activeSubTab === "artigos" ? renderArtigos() : nothing}
      ${activeSubTab === "calendario" ? renderCalendario() : nothing}
      ${activeSubTab === "sync" ? renderSync() : nothing}
    </div>
  `;
}
