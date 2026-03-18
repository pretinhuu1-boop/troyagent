import { html, nothing } from "lit";
import { apiFetch, API_BASE, unwrapResult } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";
import { showFeedback, isFeedbackVisible } from "../utils/feedback.ts";

/* ── Types ───────────────────────────────────────────────── */
interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  account_id: string | null;
  status: "connected" | "disconnected" | "expired";
  access_token: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  start_date: string;
  end_date: string | null;
  platforms: string[];
  created_at: string;
  updated_at: string;
}

interface ScheduledPost {
  id: string;
  campaign_id: string | null;
  platform: string;
  content: string;
  media_url: string | null;
  scheduled_for: string;
  status: "scheduled" | "published" | "failed" | "draft";
  published_at: string | null;
  error: string | null;
  created_at: string;
}

/* ── State ───────────────────────────────────────────────── */
let accounts: SocialAccount[] = [];
let campaigns: Campaign[] = [];
let posts: ScheduledPost[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let activeSubTab: "dashboard" | "campanhas" | "calendario" | "contas" = "dashboard";
let showCampaignForm = false;
let showPostForm = false;
let editingCampaign: Campaign | null = null;
let editingPost: ScheduledPost | null = null;
let refreshInterval: number | null = null;
let publishingPostId: string | null = null;
let showConnectForm = false;
let connectPlatform: typeof PLATFORMS[number] | null = null;
let connectForm = {
  account_name: "",
  access_token: "",
  account_id: "",
};

let campaignForm = {
  title: "",
  description: "",
  status: "draft" as "draft" | "active" | "paused" | "completed",
  start_date: "",
  end_date: "",
  platforms: [] as string[],
};

let postForm = {
  campaign_id: "",
  platform: "instagram",
  content: "",
  media_url: "",
  scheduled_for: "",
  status: "draft" as "scheduled" | "published" | "failed" | "draft",
};

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "x", name: "X (Twitter)", icon: "𝕏" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "youtube", name: "YouTube", icon: "📺" },
  { id: "pinterest", name: "Pinterest", icon: "📌" },
  { id: "threads", name: "Threads", icon: "🧵" },
];

/* ── Load & Refresh ──────────────────────────────────────── */
async function loadSocial(state: TauraViewState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    const [accts, camps, schPosts] = await Promise.allSettled([
      apiFetch("/social/accounts"),
      apiFetch("/social/campaigns"),
      apiFetch("/social/posts"),
    ]);
    accounts = accts.status === "fulfilled" && accts.value ? accts.value : [];
    campaigns = camps.status === "fulfilled" && camps.value ? camps.value : [];
    posts = schPosts.status === "fulfilled" && schPosts.value ? schPosts.value : [];
    loaded = true;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Erro ao carregar dados sociais";
    console.error("[social] load error:", e);
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

function startAutoRefresh(state: TauraViewState) {
  if (refreshInterval) return;
  refreshInterval = window.setInterval(() => {
    loadSocial(state, true);
  }, 30000);
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function platformIcon(platform: string): string {
  return PLATFORMS.find((p) => p.id === platform)?.icon || "🌐";
}

/* ── Render ───────────────────────────────────────────────── */
export function renderSocial(state: TauraViewState) {
  void loadSocial(state);
  startAutoRefresh(state);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const scheduledPosts = posts.filter((p) => p.status === "scheduled").length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const connectedAccounts = accounts.filter((a) => a.status === "connected").length;

  const handleSubTab = (tab: typeof activeSubTab) => () => {
    activeSubTab = tab;
    triggerUpdate(state);
  };

  /* ── Sub-tab: Dashboard ── */
  const renderDashboard = () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
      <!-- Connected Accounts -->
      <div class="tv-panel">
        <h3>Contas Conectadas</h3>
        ${accounts.length === 0 ? html`
          <div class="tv-empty">Nenhuma conta conectada. Va em "Contas" para configurar.</div>
        ` : html`
          ${accounts.map((a) => html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="font-size:1.5rem">${platformIcon(a.platform)}</span>
              <div style="flex:1">
                <strong>${a.account_name}</strong>
                <div style="font-size:0.75rem;color:var(--tv-text-muted)">${a.platform}</div>
              </div>
              <span class="tv-badge" style="
                background: ${a.status === "connected" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"};
                color: ${a.status === "connected" ? "#22c55e" : "#ef4444"};
              ">${a.status}</span>
            </div>
          `)}
        `}
      </div>

      <!-- Recent Posts -->
      <div class="tv-panel">
        <h3>Posts Recentes</h3>
        ${posts.length === 0 ? html`
          <div class="tv-empty">Nenhum post agendado. Crie uma campanha para comecar.</div>
        ` : html`
          ${posts.slice(0, 5).map((p) => html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="font-size:1.2rem">${platformIcon(p.platform)}</span>
              <div style="flex:1">
                <div style="font-size:0.85rem;">${p.content.substring(0, 60)}${p.content.length > 60 ? "..." : ""}</div>
                <div style="font-size:0.72rem;color:var(--tv-text-muted)">${formatDateTime(p.scheduled_for)}</div>
              </div>
              <span class="tv-badge" style="
                background: ${p.status === "published" ? "rgba(34,197,94,0.12)" : p.status === "scheduled" ? "rgba(59,130,246,0.12)" : p.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)"};
                color: ${p.status === "published" ? "#22c55e" : p.status === "scheduled" ? "#3b82f6" : p.status === "failed" ? "#ef4444" : "#eab308"};
              ">${p.status}</span>
            </div>
          `)}
        `}
      </div>

      <!-- Active Campaigns -->
      <div class="tv-panel">
        <h3>Campanhas Ativas</h3>
        ${campaigns.filter((c) => c.status === "active").length === 0 ? html`
          <div class="tv-empty">Nenhuma campanha ativa.</div>
        ` : html`
          ${campaigns.filter((c) => c.status === "active").map((c) => html`
            <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <strong>${c.title}</strong>
              <div style="font-size:0.75rem;color:var(--tv-text-muted)">
                ${formatDate(c.start_date)} ${c.end_date ? `- ${formatDate(c.end_date)}` : ""} |
                ${c.platforms.map((p) => platformIcon(p)).join(" ")}
              </div>
            </div>
          `)}
        `}
      </div>
    </div>
  `;

  /* ── Sub-tab: Campanhas ── */
  const renderCampanhas = () => html`
    <div class="tv-panel-header">
      <h3>Campanhas</h3>
      <button class="tv-btn-gold" @click=${() => {
        editingCampaign = null;
        campaignForm = { title: "", description: "", status: "draft", start_date: "", end_date: "", platforms: [] };
        showCampaignForm = true;
        triggerUpdate(state);
      }}>+ Nova Campanha</button>
    </div>

    ${showCampaignForm ? html`
      <div class="tv-panel tv-form-panel">
        <h3>${editingCampaign ? "Editar Campanha" : "Nova Campanha"}</h3>
        <div class="tv-form-grid">
          <div class="tv-config-field">
            <label>Titulo *</label>
            <input type="text" .value=${campaignForm.title} @input=${(e: Event) => { campaignForm.title = (e.target as HTMLInputElement).value; }} placeholder="Campanha Marco 2026" />
          </div>
          <div class="tv-config-field">
            <label>Status</label>
            <select .value=${campaignForm.status} @change=${(e: Event) => { campaignForm.status = (e.target as HTMLSelectElement).value as Campaign["status"]; }}>
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluida</option>
            </select>
          </div>
          <div class="tv-config-field">
            <label>Data Inicio</label>
            <input type="date" .value=${campaignForm.start_date} @input=${(e: Event) => { campaignForm.start_date = (e.target as HTMLInputElement).value; }} />
          </div>
          <div class="tv-config-field">
            <label>Data Fim</label>
            <input type="date" .value=${campaignForm.end_date} @input=${(e: Event) => { campaignForm.end_date = (e.target as HTMLInputElement).value; }} />
          </div>
          <div class="tv-config-field" style="grid-column: span 2;">
            <label>Descricao</label>
            <textarea rows="3" .value=${campaignForm.description} @input=${(e: Event) => { campaignForm.description = (e.target as HTMLTextAreaElement).value; }} placeholder="Objetivo e estrategia da campanha..."></textarea>
          </div>
          <div class="tv-config-field" style="grid-column: span 2;">
            <label>Plataformas</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${PLATFORMS.map((p) => html`
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:4px 8px;border-radius:6px;background:${campaignForm.platforms.includes(p.id) ? "rgba(107,15,26,0.15)" : "rgba(255,255,255,0.03)"};border:1px solid ${campaignForm.platforms.includes(p.id) ? "rgba(107,15,26,0.4)" : "rgba(255,255,255,0.06)"};">
                  <input type="checkbox" .checked=${campaignForm.platforms.includes(p.id)} @change=${(e: Event) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    if (checked) campaignForm.platforms.push(p.id);
                    else campaignForm.platforms = campaignForm.platforms.filter((x) => x !== p.id);
                    triggerUpdate(state);
                  }} style="display:none;" />
                  <span>${p.icon}</span>
                  <span style="font-size:0.8rem;">${p.name}</span>
                </label>
              `)}
            </div>
          </div>
        </div>
        <div class="tv-config-actions">
          <button class="tv-btn-gold" @click=${async () => {
            if (!campaignForm.title.trim()) return;
            const payload: Record<string, unknown> = {
              title: campaignForm.title.trim(),
              description: campaignForm.description || null,
              status: campaignForm.status,
              start_date: campaignForm.start_date || new Date().toISOString().split("T")[0],
              end_date: campaignForm.end_date || null,
              platforms: campaignForm.platforms,
            };
            try {
              if (editingCampaign) {
                const result = await apiFetch(`/social/campaigns/${editingCampaign.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                });
                // M14: Standardize response unwrap (array vs single object)
                const item = unwrapResult(result);
                const updated = item ?? { ...editingCampaign, ...payload };
                const idx = campaigns.findIndex((c) => c.id === editingCampaign!.id);
                if (idx >= 0) campaigns[idx] = updated;
              } else {
                const result = await apiFetch("/social/campaigns", {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                const item = unwrapResult(result);
                if (item) campaigns.unshift(item);
              }
              showCampaignForm = false;
              editingCampaign = null;
              showFeedback(state);
            } catch (e: unknown) {
              error = e instanceof Error ? e.message : String(e);
            }
            triggerUpdate(state);
          }}>${editingCampaign ? "Atualizar" : "Criar"}</button>
          <button class="tv-btn-outline" @click=${() => { showCampaignForm = false; editingCampaign = null; triggerUpdate(state); }}>Cancelar</button>
        </div>
      </div>
    ` : nothing}

    ${campaigns.length === 0 ? html`
      <div class="tv-empty">Nenhuma campanha criada. As tabelas Supabase precisam ser criadas primeiro.</div>
    ` : html`
      <div class="tv-product-grid">
        ${campaigns.map((c) => html`
          <div class="tv-product-card">
            <div class="tv-product-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;background:rgba(107,15,26,0.06);">
              ${c.status === "active" ? "🚀" : c.status === "paused" ? "⏸️" : c.status === "completed" ? "✅" : "📋"}
            </div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${c.title}</strong>
                <span class="tv-badge tv-badge--category" style="
                  background: ${c.status === "active" ? "rgba(34,197,94,0.12)" : c.status === "paused" ? "rgba(234,179,8,0.12)" : "rgba(107,114,128,0.12)"};
                  color: ${c.status === "active" ? "#22c55e" : c.status === "paused" ? "#eab308" : "#6b7280"};
                ">${c.status}</span>
              </div>
              ${c.description ? html`<div class="tv-product-desc">${c.description}</div>` : nothing}
              <div class="tv-product-sku">
                ${formatDate(c.start_date)} ${c.end_date ? `- ${formatDate(c.end_date)}` : ""}
              </div>
              <div style="display:flex;gap:4px;margin-top:4px;">
                ${(c.platforms || []).map((p) => html`<span title=${p}>${platformIcon(p)}</span>`)}
              </div>
              <div class="tv-product-actions">
                <button class="tv-btn-sm" @click=${() => {
                  editingCampaign = { ...c };
                  campaignForm = {
                    title: c.title,
                    description: c.description || "",
                    status: c.status,
                    start_date: c.start_date,
                    end_date: c.end_date || "",
                    platforms: c.platforms || [],
                  };
                  showCampaignForm = true;
                  triggerUpdate(state);
                }}>✏️ Editar</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${async () => {
                  try {
                    await apiFetch(`/social/campaigns/${c.id}`, { method: "DELETE" });
                    campaigns = campaigns.filter((x) => x.id !== c.id);
                    showFeedback(state);
                  } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
                  triggerUpdate(state);
                }}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>
    `}
  `;

  /* ── Sub-tab: Calendario ── */
  const renderCalendario = () => {
    const sortedPosts = [...posts].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    return html`
      <div class="tv-panel-header">
        <h3>Posts Agendados</h3>
        <button class="tv-btn-gold" @click=${() => {
          editingPost = null;
          postForm = { campaign_id: "", platform: "instagram", content: "", media_url: "", scheduled_for: "", status: "draft" };
          showPostForm = true;
          triggerUpdate(state);
        }}>+ Novo Post</button>
      </div>

      ${showPostForm ? html`
        <div class="tv-panel tv-form-panel">
          <h3>${editingPost ? "Editar Post" : "Novo Post"}</h3>
          <div class="tv-form-grid">
            <div class="tv-config-field">
              <label>Plataforma</label>
              <select .value=${postForm.platform} @change=${(e: Event) => { postForm.platform = (e.target as HTMLSelectElement).value; }}>
                ${PLATFORMS.map((p) => html`<option value=${p.id}>${p.icon} ${p.name}</option>`)}
              </select>
            </div>
            <div class="tv-config-field">
              <label>Campanha</label>
              <select .value=${postForm.campaign_id} @change=${(e: Event) => { postForm.campaign_id = (e.target as HTMLSelectElement).value; }}>
                <option value="">— Sem campanha —</option>
                ${campaigns.map((c) => html`<option value=${c.id}>${c.title}</option>`)}
              </select>
            </div>
            <div class="tv-config-field">
              <label>Data/Hora</label>
              <input type="datetime-local" .value=${postForm.scheduled_for} @input=${(e: Event) => { postForm.scheduled_for = (e.target as HTMLInputElement).value; }} />
            </div>
            <div class="tv-config-field">
              <label>Status</label>
              <select .value=${postForm.status} @change=${(e: Event) => { postForm.status = (e.target as HTMLSelectElement).value as ScheduledPost["status"]; }}>
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendado</option>
              </select>
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Conteudo *</label>
              <textarea rows="4" .value=${postForm.content} @input=${(e: Event) => { postForm.content = (e.target as HTMLTextAreaElement).value; }} placeholder="Texto do post..."></textarea>
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>URL da Midia</label>
              <input type="url" .value=${postForm.media_url} @input=${(e: Event) => { postForm.media_url = (e.target as HTMLInputElement).value; }} placeholder="https://..." />
            </div>
          </div>
          <div class="tv-config-actions">
            <button class="tv-btn-gold" @click=${async () => {
              if (!postForm.content.trim()) return;
              const payload: Record<string, unknown> = {
                platform: postForm.platform,
                campaign_id: postForm.campaign_id || null,
                content: postForm.content.trim(),
                media_url: postForm.media_url || null,
                scheduled_for: postForm.scheduled_for || new Date().toISOString(),
                status: postForm.status,
              };
              try {
                if (editingPost) {
                  const result = await apiFetch(`/social/posts/${editingPost.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  });
                  // M14: Standardize response unwrap
                  const item = unwrapResult(result);
                  const updated = item ?? { ...editingPost, ...payload };
                  const idx = posts.findIndex((p) => p.id === editingPost!.id);
                  if (idx >= 0) posts[idx] = updated;
                } else {
                  const result = await apiFetch("/social/posts", {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  const item = unwrapResult(result);
                  if (item) posts.unshift(item);
                }
                showPostForm = false;
                editingPost = null;
                showFeedback(state);
              } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
              triggerUpdate(state);
            }}>${editingPost ? "Atualizar" : "Agendar"}</button>
            <button class="tv-btn-outline" @click=${() => { showPostForm = false; editingPost = null; triggerUpdate(state); }}>Cancelar</button>
          </div>
        </div>
      ` : nothing}

      ${sortedPosts.length === 0 ? html`
        <div class="tv-empty">Nenhum post agendado. As tabelas Supabase precisam ser criadas primeiro.</div>
      ` : html`
        <div class="tv-table-wrap">
          <table class="tv-table">
            <thead><tr><th>Plat.</th><th>Conteudo</th><th>Data</th><th>Campanha</th><th>Status</th><th>Acoes</th></tr></thead>
            <tbody>
              ${sortedPosts.map((p) => html`
                <tr>
                  <td style="font-size:1.2rem">${platformIcon(p.platform)}</td>
                  <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.content}</td>
                  <td>${formatDateTime(p.scheduled_for)}</td>
                  <td>${p.campaign_id ? campaigns.find((c) => c.id === p.campaign_id)?.title || "—" : "—"}</td>
                  <td><span class="tv-badge tv-badge--${p.status}">${p.status}</span></td>
                  <td>
                    ${p.status !== "published" ? html`
                      <button class="tv-btn-sm" title="Publicar agora" style="color:#22c55e;"
                        ?disabled=${publishingPostId === p.id}
                        @click=${async () => {
                        publishingPostId = p.id;
                        triggerUpdate(state);
                        try {
                          const result = await apiFetch(`/social/posts/${p.id}/publish`, { method: "POST" });
                          if (result?.success) {
                            const idx = posts.findIndex((x) => x.id === p.id);
                            if (idx >= 0) {
                              posts[idx] = { ...posts[idx], status: "published", published_at: result.published_at };
                            }
                            showFeedback(state);
                          } else {
                            error = result?.error || "Falha ao publicar";
                          }
                        } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
                        publishingPostId = null;
                        triggerUpdate(state);
                      }}>${publishingPostId === p.id ? "⏳" : "🚀"}</button>
                    ` : nothing}
                    <button class="tv-btn-sm" @click=${() => {
                      editingPost = { ...p };
                      postForm = {
                        campaign_id: p.campaign_id || "",
                        platform: p.platform,
                        content: p.content,
                        media_url: p.media_url || "",
                        scheduled_for: p.scheduled_for?.replace("Z", "").split(".")[0] || "",
                        status: p.status as ScheduledPost["status"],
                      };
                      showPostForm = true;
                      triggerUpdate(state);
                    }}>✏️</button>
                    <button class="tv-btn-sm tv-btn-sm--danger" @click=${async () => {
                      try {
                        await apiFetch(`/social/posts/${p.id}`, { method: "DELETE" });
                        posts = posts.filter((x) => x.id !== p.id);
                        showFeedback(state);
                      } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
                      triggerUpdate(state);
                    }}>🗑️</button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      `}
    `;
  };

  /* ── Sub-tab: Contas ── */
  const renderContas = () => html`
    <div class="tv-panel">
      <h3>Contas de Redes Sociais</h3>
      <p style="color: var(--tv-text-muted); font-size: 0.85rem;">
        Conecte suas contas para publicar conteudo automaticamente. Use as APIs de cada plataforma.
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
        ${PLATFORMS.map((p) => {
          const acct = accounts.find((a) => a.platform === p.id);
          return html`
            <div class="tv-panel" style="padding:1rem;border:1px solid ${acct?.status === "connected" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)"};">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:2rem">${p.icon}</span>
                <div>
                  <strong>${p.name}</strong>
                  ${acct ? html`
                    <div style="font-size:0.75rem;color:${acct.status === "connected" ? "#22c55e" : "#ef4444"};">${acct.account_name} (${acct.status})</div>
                  ` : html`
                    <div style="font-size:0.75rem;color:var(--tv-text-muted);">Nao conectado</div>
                  `}
                </div>
              </div>
              ${acct ? html`
                <button class="tv-btn-sm tv-btn-sm--danger" style="width:100%;" @click=${async () => {
                  try {
                    await apiFetch(`/social/accounts/${acct.id}`, { method: "DELETE" });
                    accounts = accounts.filter((a) => a.id !== acct.id);
                    showFeedback(state);
                  } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
                  triggerUpdate(state);
                }}>Desconectar</button>
              ` : html`
                <button class="tv-btn-sm" style="width:100%;" @click=${() => {
                  connectPlatform = p;
                  connectForm = { account_name: "", access_token: "", account_id: "" };
                  showConnectForm = true;
                  triggerUpdate(state);
                }}>Conectar ${p.name}</button>
              `}
            </div>
          `;
        })}
      </div>

      <!-- Connect Account Modal/Form -->
      ${showConnectForm && connectPlatform ? html`
        <div class="tv-modal-backdrop" @click=${(e: Event) => {
          if ((e.target as HTMLElement).classList.contains("tv-modal-backdrop")) {
            showConnectForm = false;
            connectPlatform = null;
            triggerUpdate(state);
          }
        }}>
          <div class="tv-modal">
            <div class="tv-modal-header">
              <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
                <span style="font-size:1.5rem">${connectPlatform.icon}</span>
                Conectar ${connectPlatform.name}
              </h3>
              <button class="tv-btn-sm" @click=${() => {
                showConnectForm = false;
                connectPlatform = null;
                triggerUpdate(state);
              }}>✕</button>
            </div>
            <div class="tv-modal-body">
              <p style="color:var(--tv-text-muted);font-size:0.85rem;margin:0 0 1rem;">
                Insira as credenciais da API do ${connectPlatform.name}. Voce pode obter o token de acesso
                no painel de desenvolvedor da plataforma.
              </p>
              <div class="tv-form-grid" style="grid-template-columns:1fr;">
                <div class="tv-config-field">
                  <label>Nome da Conta *</label>
                  <input type="text" .value=${connectForm.account_name}
                    @input=${(e: Event) => { connectForm.account_name = (e.target as HTMLInputElement).value; }}
                    placeholder="@minha_conta ou Nome do Perfil" />
                </div>
                <div class="tv-config-field">
                  <label>ID da Conta</label>
                  <input type="text" .value=${connectForm.account_id}
                    @input=${(e: Event) => { connectForm.account_id = (e.target as HTMLInputElement).value; }}
                    placeholder="ID numerico (opcional)" />
                </div>
                <div class="tv-config-field">
                  <label>Token de Acesso / API Key *</label>
                  <input type="password" .value=${connectForm.access_token}
                    @input=${(e: Event) => { connectForm.access_token = (e.target as HTMLInputElement).value; }}
                    placeholder="Bearer token ou API key" />
                </div>
              </div>
              <div style="margin-top:0.75rem;padding:0.75rem;border-radius:8px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);font-size:0.78rem;color:var(--tv-text-muted);">
                <strong style="color:#3b82f6;">ℹ Dica:</strong> Para ${connectPlatform.name}, acesse
                ${connectPlatform.id === "instagram" || connectPlatform.id === "facebook" ? "developers.facebook.com" :
                  connectPlatform.id === "x" ? "developer.x.com" :
                  connectPlatform.id === "tiktok" ? "developers.tiktok.com" :
                  connectPlatform.id === "linkedin" ? "developer.linkedin.com" :
                  connectPlatform.id === "youtube" ? "console.cloud.google.com (YouTube Data API)" :
                  connectPlatform.id === "pinterest" ? "developers.pinterest.com" :
                  connectPlatform.id === "threads" ? "developers.facebook.com (Threads API)" :
                  "o painel de desenvolvedor da plataforma"}
                para gerar seu token de acesso.
              </div>
            </div>
            <div class="tv-modal-footer">
              <button class="tv-btn-outline" @click=${() => {
                showConnectForm = false;
                connectPlatform = null;
                triggerUpdate(state);
              }}>Cancelar</button>
              <button class="tv-btn-gold" @click=${async () => {
                if (!connectForm.account_name.trim() || !connectForm.access_token.trim()) return;
                const platform = connectPlatform!;
                try {
                  const payload = {
                    platform: platform.id,
                    account_name: connectForm.account_name.trim(),
                    account_id: connectForm.account_id.trim() || null,
                    access_token: connectForm.access_token.trim(),
                    status: "connected",
                  };
                  const result = await apiFetch("/social/accounts", {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  // M14: Standardize response unwrap
                  const item = unwrapResult(result);
                  if (item) {
                    accounts.push(item);
                  } else {
                    // Optimistic: add locally
                    accounts.push({
                      id: crypto.randomUUID(),
                      platform: platform.id,
                      account_name: connectForm.account_name.trim(),
                      account_id: connectForm.account_id.trim() || null,
                      status: "connected",
                      access_token: connectForm.access_token.trim(),
                      created_at: new Date().toISOString(),
                    });
                  }
                  showConnectForm = false;
                  connectPlatform = null;
                  showFeedback(state);
                } catch (e: unknown) {
                  error = e instanceof Error ? e.message : String(e);
                }
                triggerUpdate(state);
              }}>Conectar</button>
            </div>
          </div>
        </div>
      ` : nothing}
    </div>
  `;

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📱</div>
          <div>
            <div class="tv-kpi-value">${connectedAccounts}</div>
            <div class="tv-kpi-label">Contas Conectadas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🚀</div>
          <div>
            <div class="tv-kpi-value">${activeCampaigns}</div>
            <div class="tv-kpi-label">Campanhas Ativas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📅</div>
          <div>
            <div class="tv-kpi-value">${scheduledPosts}</div>
            <div class="tv-kpi-label">Posts Agendados</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">✅</div>
          <div>
            <div class="tv-kpi-value">${publishedPosts}</div>
            <div class="tv-kpi-label">Publicados</div>
          </div>
        </div>
      </div>

      <!-- Sub-tab Navigation -->
      <div class="tv-category-bar" style="margin-bottom: 0.5rem;">
        <button class="tv-cat-btn ${activeSubTab === "dashboard" ? "active" : ""}" @click=${handleSubTab("dashboard")}>
          📊 Dashboard
        </button>
        <button class="tv-cat-btn ${activeSubTab === "campanhas" ? "active" : ""}" @click=${handleSubTab("campanhas")}>
          🚀 Campanhas
        </button>
        <button class="tv-cat-btn ${activeSubTab === "calendario" ? "active" : ""}" @click=${handleSubTab("calendario")}>
          📅 Calendario
        </button>
        <button class="tv-cat-btn ${activeSubTab === "contas" ? "active" : ""}" @click=${handleSubTab("contas")}>
          🔗 Contas
        </button>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div></div>
        <div class="tv-header-actions">
          ${isFeedbackVisible() ? html`<span class="tv-saved-badge">✓ Salvo</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${() => { loaded = false; loadSocial(state, true); }}>🔄 Atualizar</button>
        </div>
      </div>

      <!-- Active Sub-tab Content -->
      ${activeSubTab === "dashboard" ? renderDashboard() : nothing}
      ${activeSubTab === "campanhas" ? renderCampanhas() : nothing}
      ${activeSubTab === "calendario" ? renderCalendario() : nothing}
      ${activeSubTab === "contas" ? renderContas() : nothing}
    </div>
  `;
}
