/**
 * C8-C10: Debounce utility for search inputs.
 * Prevents excessive re-filtering on every keystroke.
 */

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs = 300,
): T {
  let timer: number | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  }) as unknown as T;
}
