import { html, nothing } from "lit";

/* ── Content Intelligence Dashboard — Troy Creative ─────────
 * Editorial calendar, approval queue, weekly metrics,
 * and creative insights panel for the TAURA content agent.
 *
 * Data sources:
 *   - Content posts: localStorage (troy_content_posts)
 *   - Insights: GET /api/insights?insight_type=content_suggestion
 *   - Metrics: computed from posts data
 * ──────────────────────────────────────────────────────────── */

/* ── Storage Keys ────────────────────────────────────────── */
const CONTENT_POSTS_KEY = "troy_content_posts";
const CONTENT_INSIGHTS_KEY = "troy_content_insights";
const CONTENT_METRICS_KEY = "troy_content_metrics";

/* ── Types ───────────────────────────────────────────────── */
type PostState = "idea" | "draft" | "review" | "approved" | "scheduled" | "published" | "analyzed";
type Pillar = "educacional" | "produto" | "social_proof" | "lifestyle" | "bastidores";
type Channel =
  | "instagram_feed"
  | "instagram_reels"
  | "instagram_stories"
  | "whatsapp_status"
  | "facebook"
  | "blog";

interface ContentPost {
  id: string;
  title: string;
  pillar: Pillar;
  channel: Channel;
  state: PostState;
  createdAt: number;
  scheduledAt?: number;
  publishedAt?: number;
  rejectionReason?: string;
}

interface ContentInsight {
  id: string;
  type: "content_suggestion" | "content_gap" | "content_performance";
  content: string;
  createdAt: number;
  agentName: string;
}

interface WeekMetrics {
  postsProduced: number;
  postsGoal: number;
  pillarsCovered: number;
  pillarsTotal: number;
  approvalRate: number;
  blogArticles: number;
  activeChannels: number;
}

/* ── Constants ───────────────────────────────────────────── */
const PILLAR_LABELS: Record<Pillar, string> = {
  educacional: "Educacional",
  produto: "Produto",
  social_proof: "Social Proof",
  lifestyle: "Lifestyle",
  bastidores: "Bastidores",
};

const PILLAR_SHORT: Record<Pillar, string> = {
  educacional: "EDU",
  produto: "PRO",
  social_proof: "SOC",
  lifestyle: "LIF",
  bastidores: "BAS",
};

const PILLAR_COLORS: Record<Pillar, string> = {
  educacional: "#6B0F1A",
  produto: "#8a1322",
  social_proof: "#D4A54A",
  lifestyle: "#34D399",
  bastidores: "#C4C4C4",
};

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram_feed: "IG Feed",
  instagram_reels: "IG Reels",
  instagram_stories: "IG Stories",
  whatsapp_status: "WhatsApp",
  facebook: "Facebook",
  blog: "Blog",
};

const STATE_LABELS: Record<PostState, string> = {
  idea: "Ideia",
  draft: "Rascunho",
  review: "Revis\u00e3o",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
  analyzed: "Analisado",
};

const STATE_COLORS: Record<PostState, string> = {
  idea: "#666",
  draft: "#C4C4C4",
  review: "#D4A54A",
  approved: "#34D399",
  scheduled: "#6B0F1A",
  published: "#8a1322",
  analyzed: "#F2EFE9",
};

/* Calendar: pillar expected per day of week (0=Sun..6=Sat) */
const CALENDAR_PILLARS: Record<number, { pillar: Pillar; type: string }> = {
  1: { pillar: "educacional", type: "Artigo curto" },
  2: { pillar: "produto", type: "Editorial + copy" },
  3: { pillar: "social_proof", type: "Depoimento" },
  4: { pillar: "educacional", type: "Dica r\u00e1pida" },
  5: { pillar: "lifestyle", type: "Tend\u00eancia" },
  6: { pillar: "bastidores", type: "Behind-the-scenes" },
  0: { pillar: "lifestyle", type: "Engajamento" },
};

/* ── Data Loading ────────────────────────────────────────── */

function loadPosts(): ContentPost[] {
  try {
    const raw = localStorage.getItem(CONTENT_POSTS_KEY);
    return raw ? (JSON.parse(raw) as ContentPost[]) : [];
  } catch {
    return [];
  }
}

function loadInsights(): ContentInsight[] {
  try {
    const raw = localStorage.getItem(CONTENT_INSIGHTS_KEY);
    return raw ? (JSON.parse(raw) as ContentInsight[]) : [];
  } catch {
    return [];
  }
}

function loadMetrics(): WeekMetrics {
  try {
    const raw = localStorage.getItem(CONTENT_METRICS_KEY);
    if (raw) {
      return JSON.parse(raw) as WeekMetrics;
    }
  } catch {
    /* ignore */
  }
  return {
    postsProduced: 0,
    postsGoal: 12,
    pillarsCovered: 0,
    pillarsTotal: 5,
    approvalRate: 0,
    blogArticles: 0,
    activeChannels: 0,
  };
}

/* ── Helpers ─────────────────────────────────────────────── */

function getWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"];

function postsForDay(posts: ContentPost[], date: Date): ContentPost[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return posts.filter((p) => {
    const ts = p.publishedAt || p.scheduledAt || p.createdAt;
    return ts >= startMs && ts <= endMs;
  });
}

function dayStatus(posts: ContentPost[]): "empty" | "in_progress" | "published" {
  if (posts.length === 0) {
    return "empty";
  }
  if (posts.some((p) => p.state === "published" || p.state === "analyzed")) {
    return "published";
  }
  return "in_progress";
}

/* ── Render Helpers ──────────────────────────────────────── */

function renderCalendarDay(date: Date, posts: ContentPost[]) {
  const dayOfWeek = date.getDay();
  const expected = CALENDAR_PILLARS[dayOfWeek];
  const status = dayStatus(posts);
  const dayNum = date.getDate();
  const dayName = DAY_NAMES[dayOfWeek];
  const isToday = new Date().toDateString() === date.toDateString();

  const statusIcon = status === "published" ? "\u2713" : status === "in_progress" ? "\u25CF" : "";
  const statusClass =
    status === "published"
      ? "cnt-cal-day--done"
      : status === "in_progress"
        ? "cnt-cal-day--wip"
        : "";

  return html`
    <div class="cnt-cal-day ${statusClass} ${isToday ? "cnt-cal-day--today" : ""}">
      <div class="cnt-cal-day__header">
        <span class="cnt-cal-day__name">${dayName}</span>
        <span class="cnt-cal-day__num">${dayNum}</span>
      </div>
      ${
        expected
          ? html`
            <div class="cnt-cal-day__pillar" style="border-left: 3px solid ${PILLAR_COLORS[expected.pillar]}">
              <span class="cnt-cal-day__pillar-label">${PILLAR_SHORT[expected.pillar]}</span>
              <span class="cnt-cal-day__type">${expected.type}</span>
            </div>
          `
          : nothing
      }
      ${statusIcon ? html`<span class="cnt-cal-day__status">${statusIcon}</span>` : nothing}
      ${
        posts.length > 0
          ? html`<div class="cnt-cal-day__count">${posts.length} post${posts.length > 1 ? "s" : ""}</div>`
          : nothing
      }
    </div>
  `;
}

function renderQueueItem(post: ContentPost) {
  const pillarColor = PILLAR_COLORS[post.pillar];
  const channelLabel = CHANNEL_LABELS[post.channel];
  const pillarLabel = PILLAR_LABELS[post.pillar];

  return html`
    <div class="cnt-queue-item">
      <div class="cnt-queue-item__pillar" style="background: ${pillarColor}">
        ${PILLAR_SHORT[post.pillar]}
      </div>
      <div class="cnt-queue-item__content">
        <div class="cnt-queue-item__title">${post.title}</div>
        <div class="cnt-queue-item__meta">
          ${pillarLabel} \u00B7 ${channelLabel}
        </div>
      </div>
      <div class="cnt-queue-item__actions">
        <button class="cmd-btn cmd-btn--approve" title="Aprovar">\u2713</button>
        <button class="cmd-btn" title="Editar">\u270E</button>
        <button class="cmd-btn cmd-btn--reject" title="Rejeitar">\u2717</button>
      </div>
    </div>
  `;
}

function renderInsightItem(insight: ContentInsight) {
  const typeIcon =
    insight.type === "content_gap"
      ? "\u26A0"
      : insight.type === "content_suggestion"
        ? "\uD83D\uDCA1"
        : "\uD83D\uDCCA";
  const time = new Date(insight.createdAt);
  const dateStr = `${String(time.getDate()).padStart(2, "0")}/${String(time.getMonth() + 1).padStart(2, "0")}`;

  return html`
    <div class="cnt-insight-item">
      <span class="cnt-insight-item__icon">${typeIcon}</span>
      <div class="cnt-insight-item__content">${insight.content}</div>
      <span class="cnt-insight-item__date">${dateStr}</span>
    </div>
  `;
}

function renderMetricCard(label: string, value: string | number, suffix?: string, warn?: boolean) {
  return html`
    <div class="cmd-metric-card ${warn ? "cmd-metric-card--warn" : ""}">
      <div class="cmd-metric-card__value">${value}${suffix ? html`<small>${suffix}</small>` : nothing}</div>
      <div class="cmd-metric-card__label">${label}</div>
    </div>
  `;
}

function renderPillarCoverage(posts: ContentPost[]) {
  const pillars: Pillar[] = ["educacional", "produto", "social_proof", "lifestyle", "bastidores"];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentPosts = posts.filter((p) => (p.publishedAt || p.createdAt) >= weekAgo);

  return html`
    <div class="cnt-pillars-coverage">
      ${pillars.map((pillar) => {
        const count = recentPosts.filter((p) => p.pillar === pillar).length;
        const covered = count > 0;
        return html`
          <div class="cnt-pillar-badge ${covered ? "cnt-pillar-badge--covered" : "cnt-pillar-badge--gap"}"
               style="border-color: ${PILLAR_COLORS[pillar]}">
            <span class="cnt-pillar-badge__label">${PILLAR_SHORT[pillar]}</span>
            <span class="cnt-pillar-badge__count">${count}</span>
          </div>
        `;
      })}
    </div>
  `;
}

/* ── Agent Badge ─────────────────────────────────────────── */

export function renderAgentBadge(agentName: string, emoji: string) {
  return html`
    <span class="cnt-agent-badge">
      <span class="cnt-agent-badge__emoji">${emoji}</span>
      ${agentName}
    </span>
  `;
}

/* ── Main Render ─────────────────────────────────────────── */

export function renderConteudo({ state }: { state: { connected: boolean } }) {
  const posts = loadPosts();
  const insights = loadInsights();
  const metrics = loadMetrics();
  const weekDates = getWeekDates();
  const isLive = state.connected;

  const reviewPosts = posts.filter((p) => p.state === "review");
  const pillarsCovered = new Set(
    posts
      .filter((p) => {
        const ts = p.publishedAt || p.createdAt;
        return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
      })
      .map((p) => p.pillar),
  ).size;
  const postsThisWeek = posts.filter((p) => {
    const ts = p.publishedAt || p.createdAt;
    return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  return html`
    <div class="tv-dashboard cnt-center">
      <!-- Header -->
      <div class="cmd-header">
        <div class="cmd-header__title">
          ${renderAgentBadge("Troy Creative", "\u2728")}
          CONTE\u00daDO
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
      <div class="cnt-grid">
        <!-- Calendar + Queue Row -->
        <div class="cnt-top-row">
          <!-- Editorial Calendar -->
          <div class="tv-panel cmd-panel cnt-calendar">
            <h3 class="tv-panel__title">\uD83D\uDCC5 CALEND\u00c1RIO EDITORIAL</h3>
            <div class="cnt-cal-grid">
              ${weekDates.map((date) => renderCalendarDay(date, postsForDay(posts, date)))}
            </div>
            <div class="cnt-cal-legend">
              <span>\u25CF = em produ\u00e7\u00e3o</span>
              <span>\u2713 = publicado</span>
            </div>
          </div>

          <!-- Approval Queue -->
          <div class="tv-panel cmd-panel cnt-queue">
            <h3 class="tv-panel__title">\uD83D\uDCCB FILA DE APROVA\u00c7\u00c3O
              ${
                reviewPosts.length > 0
                  ? html`<span class="cnt-queue-count">${reviewPosts.length}</span>`
                  : nothing
              }
            </h3>
            ${
              reviewPosts.length === 0
                ? html`
                    <div class="cmd-empty">Nenhum conte\u00fado aguardando aprova\u00e7\u00e3o</div>
                  `
                : html`<div class="cnt-queue-list">${reviewPosts.map((p) => renderQueueItem(p))}</div>`
            }
          </div>
        </div>

        <!-- Bottom Row: Metrics + Insights -->
        <div class="cnt-bottom-row">
          <!-- Weekly Metrics -->
          <div class="tv-panel cmd-panel cnt-metrics">
            <h3 class="tv-panel__title">\uD83D\uDCCA M\u00c9TRICAS DA SEMANA</h3>
            <div class="cmd-metrics-grid">
              ${renderMetricCard("Posts", `${postsThisWeek}/${metrics.postsGoal}`)}
              ${renderMetricCard("Pilares", `${pillarsCovered}/5`, undefined, pillarsCovered < 5)}
              ${renderMetricCard("Aprova\u00e7\u00e3o", `${metrics.approvalRate}`, "%")}
              ${renderMetricCard("Blog", metrics.blogArticles)}
              ${renderMetricCard("Canais", `${metrics.activeChannels}/6`)}
            </div>
            <div class="cnt-pillar-section">
              <h4 class="cnt-pillar-section__title">Cobertura de Pilares</h4>
              ${renderPillarCoverage(posts)}
            </div>
          </div>

          <!-- Creative Insights -->
          <div class="tv-panel cmd-panel cnt-insights">
            <h3 class="tv-panel__title">\uD83D\uDCA1 INSIGHTS DO CREATIVE</h3>
            ${
              insights.length === 0
                ? html`
                    <div class="cmd-empty">Troy Creative ainda n\u00e3o gerou insights</div>
                  `
                : html`<div class="cnt-insights-list">${insights.slice(0, 10).map((i) => renderInsightItem(i))}</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}
