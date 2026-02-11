import { html, nothing } from "lit";
import type { ChannelAccountSnapshot, TelegramStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { formatAgo } from "../format.ts";
import { renderChannelConfigSection } from "./channels.config.ts";

export function renderTelegramCard(params: {
  props: ChannelsProps;
  telegram?: TelegramStatus;
  telegramAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
}) {
  const { props, telegram, telegramAccounts, accountCountLabel } = params;
  const hasMultipleAccounts = telegramAccounts.length > 1;

  const renderAccountCard = (account: ChannelAccountSnapshot) => {
    const probe = account.probe as { bot?: { username?: string } } | undefined;
    const botUsername = probe?.bot?.username;
    const label = account.name || account.accountId;
    return html`
      <div class="account-card">
        <div class="account-card-header">
          <div class="account-card-title">
            ${botUsername ? `@${botUsername}` : label}
          </div>
          <div class="account-card-id">${account.accountId}</div>
        </div>
        <div class="status-list account-card-status">
          <div>
            <span class="label">Rodando</span>
            <span>${account.running ? "Sim" : "Não"}</span>
          </div>
          <div>
            <span class="label">Configurado</span>
            <span>${account.configured ? "Sim" : "Não"}</span>
          </div>
          <div>
            <span class="label">Última entrada</span>
            <span>${account.lastInboundAt ? formatAgo(account.lastInboundAt) : "n/a"}</span>
          </div>
          ${
            account.lastError
              ? html`
                <div class="account-card-error">
                  ${account.lastError}
                </div>
              `
              : nothing
          }
        </div>
      </div>
    `;
  };

  return html`
    <div class="card">
      <div class="card-title">Telegram</div>
      <div class="card-sub">Status do bot e configuração de canais.</div>
      ${accountCountLabel}

      ${
        hasMultipleAccounts
          ? html`
            <div class="account-card-list">
              ${telegramAccounts.map((account) => renderAccountCard(account))}
            </div>
          `
          : html`
            <div class="status-list" style="margin-top: 16px;">
              <div>
                <span class="label">Configurado</span>
                <span>${telegram?.configured ? "Sim" : "Não"}</span>
              </div>
              <div>
                <span class="label">Rodando</span>
                <span>${telegram?.running ? "Sim" : "Não"}</span>
              </div>
              <div>
                <span class="label">Modo</span>
                <span>${telegram?.mode ?? "n/a"}</span>
              </div>
              <div>
                <span class="label">Último início</span>
                <span>${telegram?.lastStartAt ? formatAgo(telegram.lastStartAt) : "n/a"}</span>
              </div>
              <div>
                <span class="label">Último probe</span>
                <span>${telegram?.lastProbeAt ? formatAgo(telegram.lastProbeAt) : "n/a"}</span>
              </div>
            </div>
          `
      }

      ${
        telegram?.lastError
          ? html`<div class="callout danger" style="margin-top: 12px;">
            ${telegram.lastError}
          </div>`
          : nothing
      }

      ${
        telegram?.probe
          ? html`<div class="callout" style="margin-top: 12px;">
            Probe ${telegram.probe.ok ? "ok" : "falhou"} ·
            ${telegram.probe.status ?? ""} ${telegram.probe.error ?? ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "telegram", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          Sondar
        </button>
      </div>
    </div>
  `;
}
