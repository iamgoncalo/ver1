export interface Product {
  id: string; name: string; brand: string; price_usd: number | null;
  average_rating: number | null; rating_number_lifetime: number | null;
  n_real_reviews_in_corpus: number; mean_rating_in_corpus: number;
  cluster_type: string; cluster_intelligence: string; evidence: string; truth_class: string;
}
export interface ProductsResponse { _provenance: string; products: Product[] }

export interface Signal {
  id: string; name: string; prevalence_pct: number; csat_impact: number; n_reviews: number;
  source_families: string[]; state: string; related_trend_docs: { id?: string; title?: string; url?: string }[];
  evidence_ids: string[]; truth_class: string;
}
export interface SignalsResponse { _provenance: string; signals: Signal[] }

export interface ThemeGap { theme: string; theme_name: string; brand_rate_pct: number; category_rate_pct: number; delta_pp: number }
export interface Rival { brand: string; n_reviews: number; n_products: number; mean_rating: number; theme_gaps: ThemeGap[] }
export interface RivalsResponse {
  _provenance: string; min_reviews_floor: number; n_category_reviews: number;
  category_theme_rates_pct: Record<string, number>; rivals: Rival[];
}
export interface WhiteSpace {
  opportunity_id: string; name: string; theme: string; consumer_pain_csat: number;
  feasibility: string; rivals_measurably_weak_here: string[]; is_white_space: boolean;
}
export interface WhiteSpaceResponse { _provenance: string; spaces: WhiteSpace[] }

export interface Possibility {
  id: string; name: string; friction_theme: string; friction_theme_name: string;
  operator: string; operator_definition: string; consumer_pain_csat: number;
  consumer_pain_prevalence_pct: number; gate_passed: boolean; economic_value: number;
  feasibility_2_5y: { rating: string; rank: number };
  is_white_space: boolean; competitor_gap_brands: string[]; evidence_ids: string[]; truth_class: string;
}
export interface Graveyard { id: string; name: string; killed_by: string; kill_reason: string }
export interface FunnelStage { stage: string; label: string; count: number }
export interface MagicBoxResponse {
  _provenance: string; funnel: FunnelStage[]; possibilities: Possibility[];
  finalists: Possibility[]; non_dominated: string[]; graveyard: Graveyard[];
  operators: Record<string, string>;
}

export interface OpportunityScore {
  name: string; usage_context: string; friction: string;
  consumer_pain: { severity_csat: number | null; prevalence_pct: number; gate_passed: boolean };
  economic_value: number | null;
  feasibility_2_5y: { rating: string; rank: number; evidence_ids: string[]; rationale: string };
  n_reviews_supporting: number; evidence_ids: string[]; assumptions: string[]; uncertainty: string[];
  dominance_status?: string; decision_reason?: string;
}
export interface Verdict {
  recommended: string; recommended_name: string; decision_type: string; decision_priority_used: string;
  why: string; killed: { id: string; name: string; killing_metric: string; reason: string }[];
  sensitivity: string; first_experiment: string; abandon_signal: string;
}
export interface InnovationsResponse {
  market_scenario_used: string; scenario_cagr_pct: number; decision_priority_used: string;
  scores: Record<string, OpportunityScore>; verdict: Verdict;
}
