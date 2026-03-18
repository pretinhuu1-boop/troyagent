/**
 * B1: Shared API fetch utility for all TAURA views.
 * Centralizes fetch logic, headers, and error handling.
 */

export const API_BASE = "/api";

export async function apiFetch(path: string, options?: RequestInit) {
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

/**
 * Unwrap Supabase response — handles both array and object returns.
 * Supabase REST returns arrays; this normalizes to single item when needed.
 */
export function unwrapResult<T>(result: T | T[]): T | undefined {
  return Array.isArray(result) ? result[0] : result;
}
