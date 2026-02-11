import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.ts";

export function renderGatewayUrlConfirmation(state: AppViewState) {
  const { pendingGatewayUrl } = state;
  if (!pendingGatewayUrl) {
    return nothing;
  }

  return html`
    <div class="exec-approval-overlay" role="dialog" aria-modal="true" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">Alterar URL do Gateway</div>
            <div class="exec-approval-sub">Isso irá reconectar a um servidor de gateway diferente</div>
          </div>
        </div>
        <div class="exec-approval-command mono">${pendingGatewayUrl}</div>
        <div class="callout danger" style="margin-top: 12px;">
          Confirme apenas se confiar nesta URL. URLs maliciosas podem comprometer seu sistema.
        </div>
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            @click=${() => state.handleGatewayUrlConfirm()}
          >
            Confirmar
          </button>
          <button
            class="btn"
            @click=${() => state.handleGatewayUrlCancel()}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;
}
