import { html } from "lit";
import type { GatewayHelloOk } from "../gateway.ts";
import type { UiSettings } from "../storage.ts";
import { formatAgo, formatDurationMs } from "../format.ts";
import { formatNextRun } from "../presenter.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs ? `${snapshot.policy.tickIntervalMs}ms` : "n/a";
  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          Este gateway requer autenticação. Adicione um token ou senha e clique em Conectar.
          <div style="margin-top: 6px">
            <span class="mono">troyvape dashboard --no-open</span> → abrir UI de Controle<br />
            <span class="mono">troyvape doctor --generate-gateway-token</span> → definir token
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="Documentação de autenticação (abre em nova aba)"
              >Docs: Autenticação UI</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        Falha na autenticação. Atualize o token ou a senha nas configurações e clique em Conectar.
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="Documentação de autenticação (abre em nova aba)"
            >Docs: Autenticação UI</a
          >
        </div>
      </div>
    `;
  })();
  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        Esta página é HTTP, então o navegador bloqueia identidade de dispositivo. Use HTTPS (Tailscale Serve) ou abra
        <span class="mono">http://127.0.0.1:18789</span> no host do gateway.
        <div style="margin-top: 6px">
          Se precisar usar HTTP, defina
          <span class="mono">gateway.controlUi.allowInsecureAuth: true</span> (apenas token).
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="Docs Tailscale Serve"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="Docs HTTP Inseguro"
            >Docs: HTTP Inseguro</a
          >
        </div>
      </div>
    `;
  })();

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">Acesso ao Gateway</div>
        <div class="card-sub">Onde o painel se conecta e autentica.</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>URL do WebSocket</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, gatewayUrl: v });
    }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          <label class="field">
            <span>Token do Gateway</span>
            <input
              .value=${props.settings.token}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, token: v });
    }}
              placeholder="OPENCLAW_GATEWAY_TOKEN"
            />
          </label>
          <label class="field">
            <span>Senha (não salva)</span>
            <input
              type="password"
              .value=${props.password}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onPasswordChange(v);
    }}
              placeholder="senha do sistema ou compartilhada"
            />
          </label>
          <label class="field">
            <span>Chave de Sessão Padrão</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSessionKeyChange(v);
    }}
            />
          </label>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn" @click=${() => props.onConnect()}>Conectar</button>
          <button class="btn" @click=${() => props.onRefresh()}>Atualizar</button>
          <span class="muted">Clique em Conectar para aplicar as alterações.</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Resumo</div>
        <div class="card-sub">Informações do último handshake do gateway.</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Status</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? "Conectado" : "Desconectado"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Tempo Ativo</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Intervalo de Tick</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Última Atualização de Canais</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : "n/a"}
            </div>
          </div>
        </div>
        ${props.lastError
      ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${props.lastError}</div>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
      : html`
                <div class="callout" style="margin-top: 14px">
                  Use Canais para vincular WhatsApp, Telegram, Discord, Signal ou iMessage.
                </div>
              `
    }
      </div>
    </section>

    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card">
        <div class="stat-label">Instâncias</div>
        <div class="stat-value">${props.presenceCount}</div>
        <div class="muted">Beacons de presença nos últimos 5 minutos.</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Sessões</div>
        <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
        <div class="muted">Chaves de sessão recentes rastreadas pelo gateway.</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Cron (Agendamento)</div>
        <div class="stat-value">
          ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? "Ativado" : "Desativado"}
        </div>
        <div class="muted">Próximo despertar ${formatNextRun(props.cronNext)}</div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">Notas</div>
      <div class="card-sub">Lembretes rápidos para controle remoto.</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">Tailscale serve</div>
          <div class="muted">
            Prefira o modo serve para manter o gateway em loopback com autenticação tailnet.
          </div>
        </div>
        <div>
          <div class="note-title">Higiene de sessão</div>
          <div class="muted">Use /new ou sessions.patch para redefinir o contexto.</div>
        </div>
        <div>
          <div class="note-title">Lembretes do Cron</div>
          <div class="muted">Use sessões isoladas para execuções recorrentes.</div>
        </div>
      </div>
    </section>
  `;
}
