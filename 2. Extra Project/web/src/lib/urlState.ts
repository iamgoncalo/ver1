// Minimal URL-state sync - no router. Worlds stay the hand-rolled integer
// model; focus objects become shareable via query params. Focus writes use
// replaceState so browser Back keeps meaning "previous world", never
// "unwind my panel opens".
import { useEffect, useRef } from "react";

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

/** Mirror one value into a query param; null/undefined removes it.
 *
 * The first null is deliberately NOT written: focus state starts null while
 * the world's data is still loading, and its read-on-mount callback needs
 * the deep-link param to still be in the URL when the fetch resolves.
 * Deleting on the first render would race (and clobber) every deep link.
 * Once the value has been non-null - or any later change happens - the
 * param is fully owned and null removes it as before. */
export function useUrlParam(key: string, value: string | null | undefined): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (value == null) return;
    }
    patchParams({ [key]: value ?? null });
  }, [key, value]);
}
