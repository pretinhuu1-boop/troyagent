import { html, nothing } from "lit";
import { apiFetch, API_BASE } from "../utils/api.ts";
import { triggerUpdate, type TauraViewState } from "../utils/state.ts";
import { showFeedback, isFeedbackVisible } from "../utils/feedback.ts";

/* ── Gerador AI — Studio de Criacao Visual ─────────────────
 * Integra o Gerador (AI Content Studio) ao painel TAURA.
 *
 * Modos:
 *   - Estudio (iframe) — React app completo com Image/Video/Tools
 *   - Galeria — Historico de geracoes salvas no Supabase
 *   - Config — Gemini API key, DNA settings, etc.
 *
 * APIs proxy:
 *   - POST /api/gerador/generate — Gera imagem via Gemini
 *   - GET /api/gerador/gallery — Lista geracoes salvas
 *   - DELETE /api/gerador/gallery/:id — Remove geracao
 * ──────────────────────────────────────────────────────────── */

/** Read Gerador frontend URL from saved config, with fallback. */
function getGeradorFrontendUrl(): string {
  try {
    const saved = localStorage.getItem("taura_gerador_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.frontend_url) return parsed.frontend_url;
    }
  } catch { /* ignore */ }
  return "http://localhost:5173";
}

/* ── Types ───────────────────────────────────────────────── */
interface GeradorGeneration {
  id: string;
  prompt: string;
  mode: "image" | "video" | "tools";
  result_url: string | null;
  result_base64: string | null;
  status: "pending" | "completed" | "failed";
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/* ── State ───────────────────────────────────────────────── */
let activeSubTab: "estudio" | "galeria" | "config" = "estudio";
let gallery: GeradorGeneration[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let generateForm = {
  prompt: "",
  mode: "image" as "image" | "video" | "tools",
  style: "default",
};
let generating = false;
let galleryPage = 0; // L6: Gallery pagination
const GALLERY_PAGE_SIZE = 12;
let configForm = {
  gemini_api_key: "",
  frontend_url: "",
};
let configLoaded = false; // L5: Prevent config reload on every render

/* ── Load Gallery ────────────────────────────────────────── */
async function loadGallery(state: TauraViewState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    const result = await apiFetch("/gerador/gallery");
    gallery = result || [];
    loaded = true;
  } catch (e: unknown) {
    // Gallery table might not exist yet — that's OK
    gallery = [];
    loaded = true;
    console.warn("[gerador] gallery load:", e instanceof Error ? e.message : String(e));
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeIcon(mode: string): string {
  switch (mode) {
    case "image": return "🖼️";
    case "video": return "🎬";
    case "tools": return "🔧";
    default: return "✨";
  }
}

/* ── Render ───────────────────────────────────────────────── */
export function renderGerador(state: TauraViewState) {
  void loadGallery(state);

  // L5: Load saved config from localStorage only once (not on every render)
  if (!configLoaded) {
    configLoaded = true;
    const saved = localStorage.getItem("taura_gerador_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        configForm = { ...configForm, ...parsed };
      } catch { /* ignore */ }
    }
  }

  const completedCount = gallery.filter((g) => g.status === "completed").length;
  const pendingCount = gallery.filter((g) => g.status === "pending").length;

  const handleSubTab = (tab: typeof activeSubTab) => () => {
    activeSubTab = tab;
    triggerUpdate(state);
  };

  /* ── Sub-tab: Estudio (iframe) ── */
  const renderEstudio = () => html`
    <div class="tv-panel" style="padding:0;overflow:hidden;border-radius:var(--tv-radius);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--tv-border);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.3rem;">✨</span>
          <strong>AI Content Studio</strong>
          <span style="font-size:0.75rem;color:var(--tv-text-muted);">powered by Gemini</span>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="${configForm.frontend_url || getGeradorFrontendUrl()}" target="_blank" class="tv-btn-sm" title="Abrir em nova aba">↗ Nova Aba</a>
          <button class="tv-btn-sm" @click=${() => {
            const iframe = document.getElementById("gerador-iframe") as HTMLIFrameElement | null;
            if (iframe) iframe.src = iframe.src;
          }}>🔄 Recarregar</button>
        </div>
      </div>
      <iframe
        id="gerador-iframe"
        src="${configForm.frontend_url || getGeradorFrontendUrl()}"
        style="width:100%;height:calc(100vh - 260px);min-height:500px;border:none;background:#131314;"
        allow="clipboard-write; clipboard-read"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      ></iframe>
    </div>
  `;

  /* ── Sub-tab: Quick Generate (sem iframe) ── */
  const renderQuickGenerate = () => html`
    <div class="tv-panel" style="margin-bottom:1rem;">
      <h3>Geracao Rapida</h3>
      <p style="color:var(--tv-text-muted);font-size:0.85rem;">
        Gere imagens ou videos diretamente via API Gemini sem abrir o estudio completo.
      </p>
      <div class="tv-form-grid" style="margin-top:1rem;">
        <div class="tv-config-field" style="grid-column: span 2;">
          <label>Prompt *</label>
          <textarea rows="3" .value=${generateForm.prompt}
            @input=${(e: Event) => { generateForm.prompt = (e.target as HTMLTextAreaElement).value; }}
            placeholder="Descreva a imagem ou video que deseja criar..."></textarea>
        </div>
        <div class="tv-config-field">
          <label>Modo</label>
          <select .value=${generateForm.mode} @change=${(e: Event) => { generateForm.mode = (e.target as HTMLSelectElement).value as "image" | "video" | "tools"; }}>
            <option value="image">🖼️ Imagem</option>
            <option value="video">🎬 Video</option>
            <option value="tools">🔧 Ferramentas</option>
          </select>
        </div>
        <div class="tv-config-field">
          <label>Estilo</label>
          <select .value=${generateForm.style} @change=${(e: Event) => { generateForm.style = (e.target as HTMLSelectElement).value; }}>
            <option value="default">Padrao</option>
            <option value="flyer">Flyer / Poster</option>
            <option value="social">Social Media Post</option>
            <option value="editorial">Editorial / Magazine</option>
            <option value="cinema">Cinema / Cinematico</option>
            <option value="trap">Trap / Urbano</option>
          </select>
        </div>
      </div>
      <div class="tv-config-actions">
        <button class="tv-btn-gold" ?disabled=${generating || !generateForm.prompt.trim()}
          @click=${async () => {
            if (!generateForm.prompt.trim()) return;
            generating = true;
            triggerUpdate(state);
            try {
              const result = await apiFetch("/gerador/generate", {
                method: "POST",
                body: JSON.stringify({
                  prompt: generateForm.prompt.trim(),
                  mode: generateForm.mode,
                  style: generateForm.style,
                }),
              });
              if (result) {
                gallery.unshift(result);
                showFeedback(state);
                generateForm.prompt = "";
              }
            } catch (e: unknown) {
              error = `Falha na geracao: ${e instanceof Error ? e.message : String(e)}`;
            }
            generating = false;
            triggerUpdate(state);
          }}>${generating ? "⏳ Gerando..." : "✨ Gerar"}</button>
      </div>
    </div>
  `;

  /* ── Sub-tab: Galeria ── */
  const renderGaleria = () => html`
    ${renderQuickGenerate()}

    <div class="tv-panel-header">
      <h3>Galeria de Geracoes (${gallery.length})</h3>
      <button class="tv-btn-sm" @click=${() => { loaded = false; loadGallery(state, true); }}>🔄 Atualizar</button>
    </div>

    ${gallery.length === 0 ? html`
      <div class="tv-empty">Nenhuma geracao salva ainda. Use o Estudio ou a Geracao Rapida para criar conteudo.</div>
    ` : html`
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:1rem;">
        ${gallery.slice(0, (galleryPage + 1) * GALLERY_PAGE_SIZE).map((g) => html`
          <div class="tv-product-card">
            <div class="tv-product-img" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:rgba(107,15,26,0.06);min-height:160px;overflow:hidden;">
              ${g.result_url ? html`
                <img src=${g.result_url} alt=${g.prompt} style="width:100%;height:100%;object-fit:cover;" />
              ` : g.result_base64 ? html`
                <img src="data:image/png;base64,${g.result_base64}" alt=${g.prompt} style="width:100%;height:100%;object-fit:cover;" />
              ` : html`
                <span>${modeIcon(g.mode)}</span>
              `}
            </div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong style="font-size:0.85rem;">${g.prompt.substring(0, 60)}${g.prompt.length > 60 ? "..." : ""}</strong>
                <span class="tv-badge" style="
                  background: ${g.status === "completed" ? "rgba(34,197,94,0.12)" : g.status === "pending" ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)"};
                  color: ${g.status === "completed" ? "#22c55e" : g.status === "pending" ? "#eab308" : "#ef4444"};
                ">${g.status}</span>
              </div>
              <div class="tv-product-sku">
                ${modeIcon(g.mode)} ${g.mode} | ${formatDate(g.created_at)}
              </div>
              <div class="tv-product-actions">
                ${g.result_url ? html`
                  <a href=${g.result_url} target="_blank" class="tv-btn-sm" download>⬇ Download</a>
                ` : nothing}
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${async () => {
                  try {
                    await apiFetch(`/gerador/gallery/${g.id}`, { method: "DELETE" });
                    gallery = gallery.filter((x) => x.id !== g.id);
                    showFeedback(state);
                  } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }
                  triggerUpdate(state);
                }}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>
      <!-- L6: Gallery pagination -->
      ${gallery.length > (galleryPage + 1) * GALLERY_PAGE_SIZE ? html`
        <div style="text-align:center;margin-top:1rem;">
          <button class="tv-btn-sm" @click=${() => { galleryPage++; triggerUpdate(state); }}>
            Carregar mais (${gallery.length - (galleryPage + 1) * GALLERY_PAGE_SIZE} restantes)
          </button>
        </div>
      ` : nothing}
    `}
  `;

  /* ── Sub-tab: Config ── */
  const renderConfig = () => html`
    <div class="tv-panel">
      <h3>Configuracoes do Gerador</h3>
      <p style="color:var(--tv-text-muted);font-size:0.85rem;">
        Configure a chave Gemini e a URL do estudio. As configuracoes sao salvas localmente.
      </p>
      <div class="tv-form-grid" style="margin-top:1rem;">
        <div class="tv-config-field" style="grid-column: span 2;">
          <label>Gemini API Key</label>
          <input type="password" .value=${"••••••••"} disabled
            placeholder="Gerenciada pelo backend" />
          <small style="color:var(--tv-text-muted);">🔒 A chave API e gerenciada pela variavel de ambiente <code>GEMINI_API_KEY</code> no backend — nao salva no navegador. Obtenha em <a href="https://aistudio.google.com/apikey" target="_blank" style="color:#3b82f6;">aistudio.google.com/apikey</a></small>
        </div>
        <div class="tv-config-field" style="grid-column: span 2;">
          <label>URL do Gerador Frontend</label>
          <input type="url" .value=${configForm.frontend_url}
            @input=${(e: Event) => { configForm.frontend_url = (e.target as HTMLInputElement).value; }}
            placeholder="http://localhost:5173" />
          <small style="color:var(--tv-text-muted);">URL onde o Gerador React esta rodando (Vite dev server ou build)</small>
        </div>
      </div>
      <div class="tv-config-actions" style="margin-top:1rem;">
        <button class="tv-btn-gold" @click=${() => {
          // A9: Only persist non-sensitive config — API key stays on backend only
          const safeConfig = { frontend_url: configForm.frontend_url };
          localStorage.setItem("taura_gerador_config", JSON.stringify(safeConfig));
          showFeedback(state);
          triggerUpdate(state);
        }}>Salvar Configuracoes</button>
      </div>
    </div>

    <div class="tv-panel" style="margin-top:1rem;">
      <h3>Sobre o Gerador</h3>
      <div style="color:var(--tv-text-muted);font-size:0.85rem;line-height:1.6;">
        <p>O <strong>AI Content Studio</strong> e um gerador de conteudo visual alimentado por Google Gemini.</p>
        <ul style="margin:0.5rem 0;padding-left:1.5rem;">
          <li><strong>Image Studio</strong> — Flyers, posters, cartoes, editorial, inpainting</li>
          <li><strong>Video Studio</strong> — Motion design, cinema, telao, decupagem, VFX</li>
          <li><strong>Tools Studio</strong> — Upscale, remocao fundo, ajustes, pipeline inteligente</li>
        </ul>
        <p>Repos: <code>pretinhuu1-boop/gerador</code> (frontend) + <code>gerador-backend</code> (API)</p>
      </div>
    </div>
  `;

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">✨</div>
          <div>
            <div class="tv-kpi-value">${gallery.length}</div>
            <div class="tv-kpi-label">Total Geracoes</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🖼️</div>
          <div>
            <div class="tv-kpi-value">${completedCount}</div>
            <div class="tv-kpi-label">Concluidas</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">⏳</div>
          <div>
            <div class="tv-kpi-value">${pendingCount}</div>
            <div class="tv-kpi-label">Pendentes</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🎨</div>
          <div>
            <div class="tv-kpi-value">3</div>
            <div class="tv-kpi-label">Estudios</div>
          </div>
        </div>
      </div>

      <!-- Sub-tab Navigation -->
      <div class="tv-category-bar" style="margin-bottom: 0.5rem;">
        <button class="tv-cat-btn ${activeSubTab === "estudio" ? "active" : ""}" @click=${handleSubTab("estudio")}>
          ✨ Estudio
        </button>
        <button class="tv-cat-btn ${activeSubTab === "galeria" ? "active" : ""}" @click=${handleSubTab("galeria")}>
          🖼️ Galeria
        </button>
        <button class="tv-cat-btn ${activeSubTab === "config" ? "active" : ""}" @click=${handleSubTab("config")}>
          ⚙️ Config
        </button>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div></div>
        <div class="tv-header-actions">
          ${isFeedbackVisible() ? html`<span class="tv-saved-badge">✓ Salvo</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
        </div>
      </div>

      <!-- Active Sub-tab Content -->
      ${activeSubTab === "estudio" ? renderEstudio() : nothing}
      ${activeSubTab === "galeria" ? renderGaleria() : nothing}
      ${activeSubTab === "config" ? renderConfig() : nothing}
    </div>
  `;
}
