/**
 * B3: Shared feedback badge utility for all TAURA views.
 * Manages the "Saved ✓" badge that appears after successful operations.
 */
import type { TauraViewState } from "./state.ts";
import { triggerUpdate } from "./state.ts";

let showSavedBadge = false;
let savedTimer: number | null = null;

/** Show a temporary "saved" badge for 2.5 seconds */
export function showFeedback(state: TauraViewState): void {
  showSavedBadge = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    showSavedBadge = false;
    triggerUpdate(state);
  }, 2500);
}

/** Check if the saved badge should be visible */
export function isFeedbackVisible(): boolean {
  return showSavedBadge;
}

/** Reset feedback state (for cleanup) */
export function resetFeedback(): void {
  showSavedBadge = false;
  if (savedTimer) {
    clearTimeout(savedTimer);
    savedTimer = null;
  }
}
