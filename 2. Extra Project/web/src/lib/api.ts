import type {
  ProductsResponse, SignalsResponse, RivalsResponse, WhiteSpaceResponse,
  MagicBoxResponse, InnovationsResponse,
} from "./types";

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

// Builds a "?k=v&..." query string, skipping undefined/null/empty values.
function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}

export const api = {
  products: () => j<ProductsResponse>("/api/products"),
  signals: () => j<SignalsResponse>("/api/signals"),
  rivals: () => j<RivalsResponse>("/api/rivals"),
  whiteSpace: () => j<WhiteSpaceResponse>("/api/white-space"),
  magicBox: () => j<MagicBoxResponse>("/api/magic-box"),
  research: () => j<any>("/api/research"),
  market: () => j<any>("/api/market"),
  trends: () => j<any>("/api/trends"),
  economics: () => j<any>("/api/economics"),
  assumptions: () => j<any>("/api/assumptions"),
  sources: () => j<any>("/api/sources"),
  howWeGotHere: () => j<any>("/api/how-we-got-here"),
  critic: () => j<any>("/api/critic"),
  criteria: () => j<any>("/api/criteria"),
  funnel: () => j<any>("/api/funnel"),
  productImages: () => j<any>("/api/product-images"),
  researchTensions: () => j<any>("/api/research/tensions"),
  innovationsFrozen: () => j<InnovationsResponse>("/api/innovations"),
  innovationsScenario: (marketScenario = "mordor", decisionPriority = "pain_feasibility_majority") =>
    j<InnovationsResponse>(
      `/api/innovations/scenario?market_scenario=${encodeURIComponent(marketScenario)}&decision_priority=${encodeURIComponent(decisionPriority)}`
    ),
  health: () => j<{ status: string; commit: string }>("/api/health"),
  causalAtlas: () => j<any>("/api/causal-atlas"),
  needCoverage: () => j<any>("/api/need-coverage"),
  homeModel: () => j<any>("/api/home-model"),
  productAtlas: (params?: { domain?: string; evidence_state?: string }) => j<any>(`/api/product-atlas${qs(params)}`),
  productRelationships: (params?: { domain?: string; relationship_type?: string; cross_domain?: boolean }) =>
    j<any>(`/api/product-relationships${qs(params)}`),
};
