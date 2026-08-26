import type {
  ProductsResponse, SignalsResponse, RivalsResponse, WhiteSpaceResponse,
  MagicBoxResponse, InnovationsResponse,
} from "./types";

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  products: () => j<ProductsResponse>("/api/products"),
  signals: () => j<SignalsResponse>("/api/signals"),
  rivals: () => j<RivalsResponse>("/api/rivals"),
  whiteSpace: () => j<WhiteSpaceResponse>("/api/white-space"),
  magicBox: () => j<MagicBoxResponse>("/api/magic-box"),
  research: () => j<any>("/api/research"),
  economics: () => j<any>("/api/economics"),
  researchTensions: () => j<any>("/api/research/tensions"),
  innovationsFrozen: () => j<InnovationsResponse>("/api/innovations"),
  innovationsScenario: (marketScenario = "mordor", decisionPriority = "pain_feasibility_majority") =>
    j<InnovationsResponse>(
      `/api/innovations/scenario?market_scenario=${encodeURIComponent(marketScenario)}&decision_priority=${encodeURIComponent(decisionPriority)}`
    ),
  health: () => j<{ status: string; commit: string }>("/api/health"),
};
