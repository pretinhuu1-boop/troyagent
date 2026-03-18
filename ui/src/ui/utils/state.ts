/**
 * B2: Shared state update utility for all TAURA views.
 * Triggers Lit re-render from module-scoped state changes.
 */

/** Generic state shape used by all TAURA views */
export interface TauraViewState {
  state?: { requestUpdate?: () => void };
  requestUpdate?: () => void;
}

/** Request a Lit re-render from module-scoped state */
export function triggerUpdate(s: TauraViewState): void {
  if (typeof s.requestUpdate === "function") {
    s.requestUpdate();
  } else if (s.state && typeof s.state.requestUpdate === "function") {
    s.state.requestUpdate();
  }
}
