// Minimal URL-state sync - no router. Worlds stay the hand-rolled integer
// model; focus objects become shareable via query params. Focus writes use
// replaceState so browser Back keeps meaning "previous world", never
// "unwind my panel opens".
import { useEffect } from "react";

export function getParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

export function patchParams(patch: Record<string, string | null>): void {
  const qs = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") qs.delete(k);
    else qs.set(k, v);
  }
  const s = qs.toString();
  window.history.replaceState({}, "", window.location.pathname + (s ? `?${s}` : ""));
}

/** Mirror one value into a query param; null/undefined removes it. */
export function useUrlParam(key: string, value: string | null | undefined): void {
  useEffect(() => { patchParams({ [key]: value ?? null }); }, [key, value]);
}
