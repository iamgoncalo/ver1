import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, TruthBadge, CompactInspector, CompactRow, type InspectorPair, type InspectorTab } from "./ui";
import { FocusPanel } from "./FocusPanel";
import { DataTable, type Column, type GroupOption } from "./DataTable";

// SMART TABLES — the single analytical-table workspace of the product, living
// inside the Magic Box world. Ten plain views, one active at a time; every
// cell traces to real computed pipeline data. Views with no real backing
// dataset render an honest empty state — project policy: nothing is ever
// invented to fill a table.
//
// The product universe here is ALWAYS Versuni + competitors together, with
// origin labelled on every row — competitors are never silently mixed in.
//
// Interfaces + humanizer helpers are duplicated from CompetitiveField.tsx by
// design (that file is under concurrent change; importing from it would couple
// the two).

// ---------------------------------------------------------------------------
// Types (verified against the live API on 2026-09-01)

interface LinkedTheme {
  friction_theme_id: string; friction_theme_name: string;
  n_evidence_reviews: number; atlas_row_ids: string[];
}
interface NeedTouch { need: string; n_evidence_reviews: number }
interface AtlasProduct {
  id: string; name: string; brand: string; domain: "AIR" | "FLOOR"; category: string;
  price_usd: number | null; average_rating: number | null; rating_number_lifetime: number | null;
  n_real_reviews_in_corpus: number; cluster_type: string | null; cluster_intelligence: string | null;
  truth_class: string; evidence_state: "LINKED" | "NO_LINKED_EVIDENCE";
  linked_themes: LinkedTheme[]; needs_touched: NeedTouch[];
  transformations_touched: string[]; state_variables_touched: string[]; burdens_touched: string[];
}
interface ProductAtlasResponse {
  _provenance: string; generated_by: string; n_products: number;
  n_products_linked: number; n_products_unlinked: number; count: number; products: AtlasProduct[];
}
interface ProductRelationship {
  product_a_id: string; product_a_name: string; product_a_domain: string;
  product_b_id: string; product_b_name: string; product_b_domain: string;
  relationship_type: string; cross_domain: boolean;
  shared_needs: string[]; shared_transformations: string[]; shared_burdens: string[]; shared_state_variables: string[];
  overlap_strength: number;
}
interface ProductRelationshipsResponse {
  _provenance: string; generated_by: string; n_total_candidates_before_cap: number;
  capped: boolean; count: number; relationships: ProductRelationship[];
}
interface CausalRow {
  id: string; name: string; category: string; home_domain: string;
  friction_theme_id: string; friction_theme_name: string;
  primary_need: string; L0_mechanism: string; L1_transformation: string;
  L2_proximal_problem: string; L3_human_need: string; L4_capability_created: string;
  L5_freedom_created: string; L6_ultimate_direction: string;
  causal_primitives: string[]; burden_dimensions_addressed: string[];
  current_state: string; desired_state: string;
  evidence_state: { gate_passed: boolean; truth_class: string; feasibility_2_5y_rating: string; is_white_space: boolean; critic_overall: string | null };
  evidence_ids: string[];
}
interface CausalAtlasResponse { _provenance: string; generated_by: string; count: number; rows: CausalRow[] }
interface CoverageRow {
  need: string; home_domain: string; state: string;
  n_themes_addressing: number; theme_ids: string[];
  worst_rating_gap: number | null; best_rating_gap: number | null;
  n_possibilities_targeting: number; is_white_space: boolean;
  evidence_ids: string[]; note: string | null;
}
interface NeedCoverageResponse { _provenance: string; generated_by: string; count: number; rows: CoverageRow[] }
interface Possibility {
  id: string; name: string; friction_theme: string; friction_theme_name: string;
  operator: string; operator_definition: string; gate_passed: boolean;
  economic_value: number; feasibility_2_5y: { rating: string; rank: number; rationale?: string };
  evidence_ids: string[]; truth_class: string;
  test: { type: string; text: string; derived_from?: string[] } | null;
  unknowns: string[];
  why_here: { reality: string; transformation: string; product_consequence: string; consequence_basis: string } | null;
}
interface MagicBoxDoc { _provenance: string; generated_by: string; possibilities: Possibility[] }
interface CriticDimension { verdict: string; reasoning: string }
interface InnovationObject {
  innovation_id?: string; name: string; state: string; target_category: string;
  evidence_ids: string[]; critic_dimensions: Record<string, CriticDimension> | null;
  economics: { price_weighted_exposure_usd: number | null } | null;
  next_experiment: string | null; state_why?: string; lifecycle?: string;
}
interface InnovationObjectsResponse { _provenance: string; generated_by: string; innovations: InnovationObject[] }
interface TrendArticle {
  article_id: string; title: string; publisher: string; source_domain: string;
  url: string; url_verified: boolean; url_status?: string;
  published_date: string; retrieved_at: string; document_type: string;
  credibility_tier: string; geographic_scope: string; themes: string[];
  scope_note: string; archive_file?: string;
}
interface TrendsDoc { article_count?: number; articles?: TrendArticle[]; what_this_corpus_cannot_establish?: string }
// /api/product-images — the 10 hand-verified official Versuni air purifiers.
interface VerifiedSpecs {
  cadr_m3h?: number | null; room_coverage_m2?: number | null; noise_min_dba?: number | null;
  filter_architecture?: string | null; connectivity?: string | null; sensors?: string | null;
  app?: boolean | null; confidence?: string;
}
interface VerifiedProduct {
  product_id: string; family: string; sku: string; official_name: string;
  official_url: string; image_url: string; local_asset: string | null;
  publisher: string; status: string; specs: VerifiedSpecs | null;
}
interface ProductImagesDoc { _provenance: string; products: VerifiedProduct[] }
// /api/rivals — per-brand measured complaint-rate gaps (Air, evidence-floored).
interface RivalThemeGap { theme: string; theme_name: string; brand_rate_pct: number; category_rate_pct: number; delta_pp: number }
interface RivalBrand {
  brand: string; n_reviews: number; n_products: number; mean_rating: number;
  theme_gaps: RivalThemeGap[]; biggest_weakness: RivalThemeGap | null; strongest_area: RivalThemeGap | null;
  evidence: string;
}
interface RivalsDoc { _provenance: string; min_reviews_floor: number; n_category_reviews: number; rivals: RivalBrand[] }
// /api/white-space — the real measured opportunities.
interface WhiteSpaceRow {
  opportunity_id: string; name: string; theme: string; consumer_pain_csat: number;
  feasibility: string; rivals_measurably_weak_here: string[]; is_white_space: boolean;
}
interface WhiteSpaceDoc { _provenance: string; spaces: WhiteSpaceRow[] }

// ---------------------------------------------------------------------------
// Humanizers (duplicated from CompetitiveField.tsx)

const NEED_LABEL: Record<string, string> = {
  RELIABILITY_LONGEVITY: "Reliability & longevity", QUIET_OPERATION: "Quiet operation",
  VERIFIED_EFFECTIVENESS: "Verified effectiveness", SERVICE_CONTINUITY_COST: "Service continuity & cost",
  ODOR_AIR_SAFETY: "Odor & air safety", CUSTOMER_SUPPORT_WARRANTY: "Customer support & warranty",
  VALUE_FOR_MONEY: "Value for money", BUILD_QUALITY_MATERIALS: "Build quality & materials",
};
const DOMAIN_LABEL: Record<string, string> = { AIR: "Air", FLOOR: "Floor care" };
const TYPE_LABEL: Record<string, string> = {
  standard_purifier: "Standard purifier", personal_portable: "Personal / portable",
  purifier_fan_combo: "Purifier + fan combo", purifier_humidifier_combo: "Purifier + humidifier combo",
};
function humanizeToken(s: string): string {
  return s.replace(/[._]/g, " ").trim().replace(/\s+/g, " ");
}
function toSentence(s: string): string {
  const h = humanizeToken(s).toLowerCase();
  return h ? h.charAt(0).toUpperCase() + h.slice(1) : s;
}
function needLabel(need: string): string {
  return NEED_LABEL[need] ?? toSentence(need);
}
function clusterLabel(clusterType: string | null): string {
  if (!clusterType) return "—";
  return TYPE_LABEL[clusterType] ?? toSentence(clusterType);
}
// Display-only brand casing: corpus stores some brands SHOUTING ("PHILIPS",
// "HATHASPACE"). All-caps words of 3+ letters get title case for display;
// mixed-case brands ("Rabbit Air", "balight") pass through verbatim. The raw
// value stays untouched for matching/logic.
function brandLabel(brand: string): string {
  if (!brand) return "—";
  return brand.split(/\s+/).map((w) =>
    /^[A-Z]{3,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w
  ).join(" ");
}
// Middle-dot join capped at 3 + "+N" — the smart-cell house style.
function dotJoin(arr: string[], labeler: (v: string) => string = toSentence, cap = 3): string {
  if (!arr.length) return "—";
  const top = arr.slice(0, cap).map(labeler);
  const extra = arr.length - top.length;
  return top.join(" · ") + (extra > 0 ? ` +${extra}` : "");
}
function topNeedsCell(needs: NeedTouch[], cap = 3): string {
  if (!needs.length) return "—";
  const sorted = [...needs].sort((a, b) => b.n_evidence_reviews - a.n_evidence_reviews);
  return dotJoin(sorted.map((n) => n.need), needLabel, cap);
}
// The friction theme with the most total evidence reviews inside a selection —
// the dominant real signal already present, never an invented ranking.
function dominantTheme(selected: AtlasProduct[]): string | null {
  const totals = new Map<string, number>();
  for (const p of selected) {
    for (const t of p.linked_themes) {
      totals.set(t.friction_theme_id, (totals.get(t.friction_theme_id) ?? 0) + t.n_evidence_reviews);
    }
  }
  if (!totals.size) return null;
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
// For rows that carry exactly one friction theme each: the most frequent theme
// in the selection — a deterministic count, not a score.
function mostFrequentTheme(themeIds: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const t of themeIds) if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
// An innovation's friction theme is the "taxonomy:<theme>" tag inside its real
// evidence_ids — never guessed.
function themeFromEvidenceIds(evidenceIds: string[]): string | null {
  const tax = evidenceIds.find((id) => id.startsWith("taxonomy:"));
  return tax ? tax.split(":")[1] : null;
}
// Trend-corpus theme tags carry acronyms toSentence would mangle ("iaq_standards").
function trendThemeLabel(s: string): string {
  return toSentence(s).replace(/\bIaq\b/g, "IAQ").replace(/\bIot\b/g, "IoT").replace(/\bCadr\b/g, "CADR");
}
function formatDelta(pp: number): string {
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(2)} pp`;
}
// "web/public/products/X.png" → the app-served "/products/X.png".
function servedAsset(localAsset: string | null): string | null {
  if (!localAsset) return null;
  return localAsset.replace(/^web\/public/, "");
}

const ACTION_BTN_STYLE = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--accent-blue)",
  background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer",
  fontSize: 11.5, fontWeight: 600,
} as const;
const ACTION_BTN_DISABLED_STYLE = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)",
  background: "transparent", color: "var(--ink-faint)", cursor: "not-allowed",
  fontSize: 11.5, fontWeight: 600,
} as const;

const COVERAGE_TONE: Record<string, "good" | "amber" | "rose" | "neutral" | "blue" | "teal"> = {
  STRONG: "good", SECONDARY: "teal", WEAK: "amber", NO_DATA: "neutral",
};
const INNOVATION_STATE_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  alive: "good", promoted: "good", challenged: "amber", killed: "rose", archived: "neutral",
};

// ---------------------------------------------------------------------------
// The 10-view selector — plain entries, no numbering, no clusters-of-clusters.

type ViewKey =
  | "products" | "needs" | "relationships" | "competition" | "causality"
  | "burden" | "handoffs" | "autonomy" | "trends" | "opportunities";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "needs", label: "Needs" },
  { key: "relationships", label: "Relationships" },
  { key: "competition", label: "Competition" },
  { key: "causality", label: "Causality" },
  { key: "burden", label: "Human burden" },
  { key: "handoffs", label: "Handoffs" },
  { key: "autonomy", label: "Autonomy" },
  { key: "trends", label: "Trends" },
  { key: "opportunities", label: "Opportunities" },
];

type ProductsLens = "overview" | "market" | "human" | "specs";
const PRODUCTS_LENSES: { key: ProductsLens; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "market", label: "Market" },
  { key: "human", label: "Human" }, { key: "specs", label: "Specs" },
];
type NeedsLens = "matrix" | "coverage";
const NEEDS_LENSES: { key: NeedsLens; label: string }[] = [
  { key: "matrix", label: "Products × needs" }, { key: "coverage", label: "Coverage" },
];
type CausalLens = "chain" | "primitives" | "statevars";
const CAUSAL_LENSES: { key: CausalLens; label: string }[] = [
  { key: "chain", label: "Chain" }, { key: "primitives", label: "Primitives" }, { key: "statevars", label: "State variables" },
];

// ---------------------------------------------------------------------------
// Derived-row shapes (all client-side deterministic joins of real data)

// One row of the merged product universe: the 10 verified official Versuni
// records + the 809 corpus products, origin always explicit.
interface UnifiedProduct {
  uid: string;
  origin: "Versuni" | "Competitor";
  name: string;
  brand: string;       // display casing
  brandRaw: string;    // raw corpus value, for matching
  domain: string;      // "AIR" | "FLOOR"
  atlas: AtlasProduct | null;      // corpus record (review-derived joins)
  verified: VerifiedProduct | null; // official-page record (real specs)
}
interface RotationRow {
  id: string; value: string; n_products: number; domains: string[];
  top_needs: { need: string; reviews: number }[]; evidence_reviews: number;
}
interface CompetitionRow {
  brand: string; n_reviews: number; n_products: number; mean_rating: number;
  weakest: RivalThemeGap | null;   // max delta_pp = their most over-indexed complaint theme
  angle: WhiteSpaceRow | null;     // real white-space naming this brand as measurably weak on that theme
  gaps: RivalThemeGap[];
}
type OppSource = "White space" | "Magic possibility" | "Innovation";
interface OpportunityRow {
  id: string; source: OppSource; name: string;
  themeId: string | null; frictionLabel: string;
  status: ReactNode; statusSort: string; valueUsd: number | null;
  ws?: WhiteSpaceRow; poss?: Possibility; innov?: InnovationObject;
}

function buildRotation(products: AtlasProduct[], dim: "transformations_touched" | "state_variables_touched"): RotationRow[] {
  const buckets = new Map<string, AtlasProduct[]>();
  for (const p of products) {
    for (const v of p[dim]) {
      if (!buckets.has(v)) buckets.set(v, []);
      buckets.get(v)!.push(p);
    }
  }
  const rows: RotationRow[] = [];
  for (const [value, ps] of buckets) {
    const domains = new Set<string>();
    const needTotals = new Map<string, number>();
    let evidence = 0;
    for (const p of ps) {
      domains.add(p.domain);
      for (const n of p.needs_touched) {
        needTotals.set(n.need, (needTotals.get(n.need) ?? 0) + n.n_evidence_reviews);
        evidence += n.n_evidence_reviews;
      }
    }
    rows.push({
      id: value, value, n_products: ps.length, domains: [...domains].sort(),
      top_needs: [...needTotals.entries()].sort((a, b) => b[1] - a[1]).map(([need, reviews]) => ({ need, reviews })),
      evidence_reviews: evidence,
    });
  }
  return rows.sort((a, b) => b.n_products - a.n_products);
}

// ---------------------------------------------------------------------------
// Small presentational pieces

// Honest note, folded — ≤9-word summary, the full method behind a disclosure.
function FoldNote({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details style={{ marginBottom: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.02em" }}>{summary}</summary>
      <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.55, padding: "6px 0 2px", maxWidth: 640 }}>{children}</div>
    </details>
  );
}

// Honest empty state — ≤9 visible words, full reason folded.
function EmptySlot({ label, summary, reason }: { label: string; summary: string; reason: string }) {
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: "20px 24px", maxWidth: 620, background: "var(--surface)" }}>
      <SectionLabel>Honest empty state</SectionLabel>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{label}</div>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, marginBottom: 6 }}>{summary}</p>
      <details>
        <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--ink-faint)" }}>Why this stays empty</summary>
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.55, marginTop: 6 }}>{reason}</p>
      </details>
    </div>
  );
}

function TracePara({ children }: { children: ReactNode }) {
  return <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.55 }}>{children}</p>;
}

function PillWrap({ values, tone, labeler = toSentence }: { values: string[]; tone: "blue" | "teal" | "amber" | "neutral"; labeler?: (v: string) => string }) {
  if (!values.length) return <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {values.map((v) => <Pill key={v} tone={tone}>{labeler(v)}</Pill>)}
    </div>
  );
}

function OriginPill({ origin }: { origin: "Versuni" | "Competitor" }) {
  return <Pill tone={origin === "Versuni" ? "blue" : "neutral"}>{origin}</Pill>;
}

// Cell with guaranteed ellipsis + full-text tooltip (fixes cryptic truncations
// like "RabbitAir MinusA2 …" collapsing into unreadable fragments).
function EllipsisCell({ text, title, bold }: { text: string; title?: string; bold?: boolean }) {
  return (
    <span title={title ?? text} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: bold ? 600 : undefined }}>
      {text}
    </span>
  );
}

interface InspectorState {
  eyebrow: string; title: string; summary: InspectorPair[]; tabs: InspectorTab[];
  image?: string | null;
  sendTheme: string | null;   // friction theme id the Send button uses
  sendReason?: string;        // honest reason when sendTheme is null
}

const VERSUNI_FIRST = (a: string, b: string) => {
  const av = a.startsWith("Versuni") ? 0 : 1;
  const bv = b.startsWith("Versuni") ? 0 : 1;
  return av !== bv ? av - bv : a.localeCompare(b);
};
const OPP_SOURCE_ORDER: Record<string, number> = { "White space": 0, "Magic possibility": 1, "Innovation": 2 };

// ---------------------------------------------------------------------------

export function SmartTables({ onSendToMagicBox }: { onSendToMagicBox: (themeId: string) => void }) {
  const [atlasDoc, setAtlasDoc] = useState<ProductAtlasResponse | null | undefined>(undefined);
  const [relDoc, setRelDoc] = useState<ProductRelationshipsResponse | null | undefined>(undefined);
  const [causalDoc, setCausalDoc] = useState<CausalAtlasResponse | null | undefined>(undefined);
  const [coverageDoc, setCoverageDoc] = useState<NeedCoverageResponse | null | undefined>(undefined);
  const [magicDoc, setMagicDoc] = useState<MagicBoxDoc | null | undefined>(undefined);
  const [innovDoc, setInnovDoc] = useState<InnovationObjectsResponse | null | undefined>(undefined);
  const [trendsDoc, setTrendsDoc] = useState<TrendsDoc | null | undefined>(undefined);
  const [imagesDoc, setImagesDoc] = useState<ProductImagesDoc | null | undefined>(undefined);
  const [rivalsDoc, setRivalsDoc] = useState<RivalsDoc | null | undefined>(undefined);
  const [wsDoc, setWsDoc] = useState<WhiteSpaceDoc | null | undefined>(undefined);

  const [view, setView] = useState<ViewKey>("products");
  const [productsLens, setProductsLens] = useState<ProductsLens>("overview");
  const [needsLens, setNeedsLens] = useState<NeedsLens>("matrix");
  const [causalLens, setCausalLens] = useState<CausalLens>("chain");
  const [compareRows, setCompareRows] = useState<UnifiedProduct[] | null>(null);
  const [inspector, setInspector] = useState<InspectorState | null>(null);

  useEffect(() => {
    api.productAtlas().then(setAtlasDoc).catch(() => setAtlasDoc(null));
    api.productRelationships().then(setRelDoc).catch(() => setRelDoc(null));
    api.causalAtlas().then(setCausalDoc).catch(() => setCausalDoc(null));
    api.needCoverage().then(setCoverageDoc).catch(() => setCoverageDoc(null));
    api.magicBox().then((d) => setMagicDoc(d as unknown as MagicBoxDoc)).catch(() => setMagicDoc(null));
    fetch("/api/innovation-objects")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setInnovDoc).catch(() => setInnovDoc(null));
    api.trends().then(setTrendsDoc).catch(() => setTrendsDoc(null));
    api.productImages().then((d) => setImagesDoc(d as ProductImagesDoc)).catch(() => setImagesDoc(null));
    api.rivals().then((d) => setRivalsDoc(d as unknown as RivalsDoc)).catch(() => setRivalsDoc(null));
    api.whiteSpace().then((d) => setWsDoc(d as unknown as WhiteSpaceDoc)).catch(() => setWsDoc(null));
  }, []);

  function selectView(key: ViewKey) {
    setView(key);
    setCompareRows(null);
  }

  const products = useMemo(() => atlasDoc?.products ?? [], [atlasDoc]);
  const relationships = useMemo(() => relDoc?.relationships ?? [], [relDoc]);
  const causalRows = causalDoc?.rows ?? [];
  const coverageRows = coverageDoc?.rows ?? [];
  const possibilities = useMemo(() => magicDoc?.possibilities ?? [], [magicDoc]);
  const innovations = useMemo(() => innovDoc?.innovations ?? [], [innovDoc]);
  const verifiedProducts = useMemo(() => imagesDoc?.products ?? [], [imagesDoc]);
  const rivals = useMemo(() => rivalsDoc?.rivals ?? [], [rivalsDoc]);
  const whiteSpaces = useMemo(() => (wsDoc?.spaces ?? []).filter((s) => s.is_white_space), [wsDoc]);
  const trendArticles = trendsDoc?.articles ?? [];

  // ---------------------------------------------------------------- unified product universe

  const unified = useMemo<UnifiedProduct[]>(() => {
    const rows: UnifiedProduct[] = [];
    for (const v of verifiedProducts) {
      rows.push({
        uid: `verified:${v.product_id}`, origin: "Versuni", name: v.official_name,
        brand: "Philips", brandRaw: "Philips", domain: "AIR", atlas: null, verified: v,
      });
    }
    for (const p of products) {
      rows.push({
        uid: p.id, origin: /philips/i.test(p.brand) ? "Versuni" : "Competitor",
        name: p.name, brand: brandLabel(p.brand), brandRaw: p.brand, domain: p.domain,
        atlas: p, verified: null,
      });
    }
    return rows;
  }, [products, verifiedProducts]);

  const primitiveRows = useMemo(() => buildRotation(products, "transformations_touched"), [products]);
  const stateVarRows = useMemo(() => buildRotation(products, "state_variables_touched"), [products]);
  const airIntelRows = useMemo(() => products.filter((p) => p.cluster_intelligence != null), [products]);
  const distinctNeeds = useMemo(
    () => [...new Set(products.flatMap((p) => p.needs_touched.map((n) => n.need)))],
    [products]
  );
  // Products × needs matrix keeps the column budget honest: top 6 needs by
  // total real evidence; a folded note declares "top 6 of N".
  const topNeedKeys = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of products) for (const n of p.needs_touched) totals.set(n.need, (totals.get(n.need) ?? 0) + n.n_evidence_reviews);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [products]);
  const distinctBurdens = useMemo(
    () => [...new Set(products.flatMap((p) => p.burdens_touched))].sort(),
    [products]
  );
  // The Air domain's top needs by real evidence — used to derive honest
  // "related competitors" for verified Versuni records (which carry official
  // specs, not review-theme joins).
  const airTopNeeds = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of products) if (p.domain === "AIR") for (const n of p.needs_touched) totals.set(n.need, (totals.get(n.need) ?? 0) + n.n_evidence_reviews);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }, [products]);

  // ---------------------------------------------------------------- competition rows

  const competitionRows = useMemo<CompetitionRow[]>(() => {
    return rivals.map((r) => {
      const weakest = r.biggest_weakness
        ?? ([...r.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp)[0] ?? null);
      const angle = weakest
        ? whiteSpaces.find((ws) => ws.theme === weakest.theme && ws.rivals_measurably_weak_here.includes(r.brand)) ?? null
        : null;
      return {
        brand: r.brand, n_reviews: r.n_reviews, n_products: r.n_products, mean_rating: r.mean_rating,
        weakest, angle, gaps: [...r.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp),
      };
    }).sort((a, b) => b.n_reviews - a.n_reviews);
  }, [rivals, whiteSpaces]);

  // ---------------------------------------------------------------- opportunities rows

  const opportunityRows = useMemo<OpportunityRow[]>(() => {
    const rows: OpportunityRow[] = [];
    for (const ws of whiteSpaces) {
      rows.push({
        id: `ws:${ws.opportunity_id}`, source: "White space", name: ws.name,
        themeId: ws.theme, frictionLabel: toSentence(ws.theme),
        status: `${toSentence(ws.feasibility)} feasibility · ${ws.rivals_measurably_weak_here.length} rivals weak`,
        statusSort: ws.feasibility, valueUsd: null, ws,
      });
    }
    for (const p of possibilities.filter((p) => p.gate_passed)) {
      rows.push({
        id: `poss:${p.id}`, source: "Magic possibility", name: p.name,
        themeId: p.friction_theme, frictionLabel: p.friction_theme_name,
        status: <Pill tone="teal">{toSentence(p.operator)}</Pill>,
        statusSort: p.operator, valueUsd: p.economic_value, poss: p,
      });
    }
    for (const o of innovations) {
      const t = themeFromEvidenceIds(o.evidence_ids ?? []);
      rows.push({
        id: `innov:${o.innovation_id ?? o.name}`, source: "Innovation", name: o.name,
        themeId: t, frictionLabel: t ? toSentence(t) : "—",
        status: <Pill tone={INNOVATION_STATE_TONE[o.state] ?? "neutral"}>{toSentence(o.state)}</Pill>,
        statusSort: o.state, valueUsd: o.economics?.price_weighted_exposure_usd ?? null, innov: o,
      });
    }
    return rows;
  }, [whiteSpaces, possibilities, innovations]);

  // ------------------------------------------------------------- inspectors

  function openUnifiedInspector(u: UnifiedProduct) {
    if (u.verified) openVerifiedInspector(u.verified);
    else if (u.atlas) openCorpusInspector(u.atlas, u.origin);
  }

  // Related tab for a corpus row — its real top relationship partners.
  function corpusRelatedContent(p: AtlasProduct): ReactNode {
    const rels = relationships
      .filter((r) => r.product_a_id === p.id || r.product_b_id === p.id)
      .sort((a, b) => b.overlap_strength - a.overlap_strength)
      .slice(0, 5);
    if (!rels.length) {
      return <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No pairs in the served top {relDoc?.count.toLocaleString() ?? ""} relationships include this product.</p>;
    }
    return (
      <div>
        {rels.map((r) => {
          const partner = r.product_a_id === p.id ? r.product_b_name : r.product_a_name;
          return (
            <CompactRow
              key={`${r.product_a_id}:${r.product_b_id}`}
              label={partner}
              value={`${toSentence(r.relationship_type)} · strength ${r.overlap_strength}`}
              title={partner}
            />
          );
        })}
        <TracePara>Top real pairwise partners from GET /api/product-relationships, ranked by overlap strength.</TracePara>
      </div>
    );
  }

  // Competition tab for a corpus (usually competitor) row — the verified
  // Versuni products in its domain, or an honest gap.
  function corpusCompetitionContent(p: AtlasProduct): ReactNode {
    if (p.domain !== "AIR") {
      return <p style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>No verified Versuni product in Floor care yet.</p>;
    }
    if (!verifiedProducts.length) {
      return <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Verified Versuni records not loaded.</p>;
    }
    return (
      <div>
        <SectionLabel>Verified Versuni products in Air</SectionLabel>
        {verifiedProducts.map((v) => (
          <CompactRow
            key={v.product_id}
            label={v.official_name}
            value={v.specs?.cadr_m3h != null ? `CADR ${v.specs.cadr_m3h} m³/h` : "specs in official record"}
            title={v.official_name}
          />
        ))}
        <TracePara>The 10 hand-verified official Versuni air purifiers from GET /api/product-images.</TracePara>
      </div>
    );
  }

  function openCorpusInspector(p: AtlasProduct, origin: "Versuni" | "Competitor") {
    const theme = dominantTheme([p]);
    setInspector({
      eyebrow: `${brandLabel(p.brand) || DOMAIN_LABEL[p.domain] || "Product"} · ${origin}`,
      title: p.name,
      sendTheme: theme,
      sendReason: theme ? undefined : "No review of this product was classified into a friction theme.",
      summary: [
        { label: "Brand", value: brandLabel(p.brand) || "Unknown" },
        { label: "Domain", value: DOMAIN_LABEL[p.domain] ?? p.domain },
        { label: "Origin", value: <OriginPill origin={origin} /> },
        { label: "Evidence state", value: p.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">No linked evidence</Pill> },
        { label: "Price", value: p.price_usd != null ? `$${p.price_usd}` : "Unknown" },
        { label: "Rating", value: p.average_rating != null ? `★${p.average_rating}` : "Unknown" },
        { label: "Reviews", value: p.n_real_reviews_in_corpus },
        { label: "Cluster", value: clusterLabel(p.cluster_type) },
        { label: "Truth class", value: <TruthBadge truthClass={p.truth_class} /> },
      ],
      tabs: [
        {
          key: "needs", label: "Needs",
          content: p.needs_touched.length ? (
            <div>
              {[...p.needs_touched].sort((a, b) => b.n_evidence_reviews - a.n_evidence_reviews).map((n) => (
                <CompactRow key={n.need} label={needLabel(n.need)} value={`${n.n_evidence_reviews} evidence reviews`} title={n.need} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No evidence-linked needs — no review of this product was classified into a friction theme yet.</p>
          ),
        },
        {
          key: "causality", label: "Causality",
          content: (
            <div>
              <SectionLabel>Mechanisms</SectionLabel>
              <div style={{ marginBottom: 14 }}><PillWrap values={p.transformations_touched} tone="teal" /></div>
              <SectionLabel>State variables</SectionLabel>
              <div style={{ marginBottom: 14 }}><PillWrap values={p.state_variables_touched} tone="blue" /></div>
              <SectionLabel>Burdens</SectionLabel>
              <PillWrap values={p.burdens_touched} tone="amber" />
            </div>
          ),
        },
        { key: "related", label: "Related", content: corpusRelatedContent(p) },
        { key: "competition", label: "Competition", content: corpusCompetitionContent(p) },
        {
          key: "evidence", label: "Evidence",
          content: p.linked_themes.length ? (
            <div>
              {p.linked_themes.map((t) => (
                <div key={t.friction_theme_id} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t.friction_theme_name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>{t.n_evidence_reviews} evidence reviews</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2, wordBreak: "break-word" }}>{t.atlas_row_ids.join(", ")}</div>
                  <button onClick={() => { setInspector(null); onSendToMagicBox(t.friction_theme_id); }} style={{ ...ACTION_BTN_STYLE, marginTop: 6 }}>
                    Send this friction to Magic Box →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No linked friction themes — honestly empty, no review of this product was classified into a theme.</p>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/product-atlas — built by src/real/product_causal_join.py from real review evidence
              joined by set-intersection against the causal atlas (data/processed/product_causal_join.json).
              Origin = "Versuni" when the corpus brand contains "Philips" (Philips-branded products are
              Versuni's), otherwise "Competitor". Nothing on this record is invented; an empty field means
              no matching evidence exists yet.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openVerifiedInspector(v: VerifiedProduct) {
    const specs = v.specs ?? {};
    setInspector({
      eyebrow: "Philips (Versuni) · verified official record",
      title: v.official_name,
      image: servedAsset(v.local_asset),
      sendTheme: null,
      sendReason: "Official-page record — no review-linked friction theme exists for it.",
      summary: [
        { label: "Brand", value: "Philips" },
        { label: "Domain", value: "Air" },
        { label: "Origin", value: <OriginPill origin="Versuni" /> },
        { label: "Record", value: <Pill tone="good">Verified official</Pill> },
        { label: "CADR", value: specs.cadr_m3h != null ? `${specs.cadr_m3h} m³/h` : "—" },
        { label: "Min noise", value: specs.noise_min_dba != null ? `${specs.noise_min_dba} dBA` : "—" },
        { label: "Coverage", value: specs.room_coverage_m2 != null ? `${specs.room_coverage_m2} m²` : "—" },
        { label: "App", value: specs.app === true ? "Yes" : specs.app === false ? "No" : "—" },
      ],
      tabs: [
        {
          key: "specs", label: "Specs",
          content: (
            <div>
              <CompactRow label="Family" value={v.family} title={v.family} />
              <CompactRow label="SKU" value={v.sku} />
              <CompactRow label="Filter architecture" value={specs.filter_architecture ?? "—"} title={specs.filter_architecture ?? undefined} />
              <CompactRow label="Sensors" value={specs.sensors ?? "—"} title={specs.sensors ?? undefined} />
              <CompactRow label="Connectivity" value={specs.connectivity ?? "—"} title={specs.connectivity ?? undefined} />
              <CompactRow label="Spec confidence" value={specs.confidence ?? "—"} title={specs.confidence ?? undefined} />
            </div>
          ),
        },
        {
          key: "related", label: "Related",
          content: (() => {
            // Honest derivation: the competitor Air products carrying the most
            // real evidence on the Air domain's top needs.
            const scored = products
              .filter((p) => p.domain === "AIR" && !/philips/i.test(p.brand))
              .map((p) => ({
                p,
                score: p.needs_touched.filter((n) => airTopNeeds.includes(n.need)).reduce((s, n) => s + n.n_evidence_reviews, 0),
              }))
              .filter((x) => x.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);
            if (!scored.length) return <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No competitor Air products carry evidence on the domain's top needs.</p>;
            return (
              <div>
                <SectionLabel>Competitors on Air's top needs</SectionLabel>
                {scored.map(({ p, score }) => (
                  <CompactRow key={p.id} label={p.name} value={`${score.toLocaleString()} evidence reviews`} title={p.name} />
                ))}
                <TracePara>
                  Derived: competitor Air corpus products ranked by their real evidence-review counts on the
                  Air domain's top needs ({airTopNeeds.map(needLabel).join(" · ")}). Verified official records
                  carry specs, not review joins, so relatedness is derived from the domain, never invented.
                </TracePara>
              </div>
            );
          })(),
        },
        {
          key: "competition", label: "Competition",
          content: rivals.length ? (
            <div>
              <SectionLabel>Top rival brands by review volume (Air)</SectionLabel>
              {[...rivals].sort((a, b) => b.n_reviews - a.n_reviews).slice(0, 5).map((r) => (
                <CompactRow
                  key={r.brand}
                  label={brandLabel(r.brand)}
                  value={`${r.n_reviews.toLocaleString()} reviews · weakest: ${r.biggest_weakness?.theme_name ?? "—"}`}
                  title={r.biggest_weakness?.theme_name}
                />
              ))}
              <TracePara>GET /api/rivals — brands above the evidence floor, with each brand's most over-indexed complaint theme.</TracePara>
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Rival evidence not loaded.</p>,
        },
        {
          key: "evidence", label: "Evidence",
          content: (
            <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
              This is a hand-verified official-page record (status {toSentence(v.status)}) — its evidence is the
              official product page itself, not corpus reviews. No review-theme join exists for it, so needs and
              frictions honestly show "—" in the tables.
            </p>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/product-images — 10 Versuni air purifiers verified against official Philips pages
              ({v.official_url}). Specs read directly off the official page; image archived at {v.local_asset ?? "—"}.
              Nothing here comes from the review corpus.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openRelationshipInspector(r: ProductRelationship) {
    setInspector({
      eyebrow: toSentence(r.relationship_type),
      title: `${r.product_a_name} ↔ ${r.product_b_name}`,
      sendTheme: null,
      sendReason: "Relationship pairs carry structure, not a friction theme.",
      summary: [
        { label: "Product A", value: `${r.product_a_name} (${DOMAIN_LABEL[r.product_a_domain] ?? r.product_a_domain})` },
        { label: "Product B", value: `${r.product_b_name} (${DOMAIN_LABEL[r.product_b_domain] ?? r.product_b_domain})` },
        { label: "Relation", value: toSentence(r.relationship_type) },
        { label: "Cross-domain", value: r.cross_domain ? "Yes" : "No" },
        { label: "Overlap strength", value: r.overlap_strength },
      ],
      tabs: [
        {
          key: "shared", label: "Shared structure",
          content: (
            <div>
              <SectionLabel>Shared needs</SectionLabel>
              <div style={{ marginBottom: 14 }}><PillWrap values={r.shared_needs} tone="blue" labeler={needLabel} /></div>
              <SectionLabel>Shared mechanisms</SectionLabel>
              <div style={{ marginBottom: 14 }}><PillWrap values={r.shared_transformations} tone="teal" /></div>
              <SectionLabel>Shared burdens</SectionLabel>
              <div style={{ marginBottom: 14 }}><PillWrap values={r.shared_burdens} tone="amber" /></div>
              <SectionLabel>Shared state variables</SectionLabel>
              <PillWrap values={r.shared_state_variables} tone="neutral" />
            </div>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/product-relationships — pairwise structural overlap computed deterministically from the
              real product-causal join (shared needs / transformations / burdens / state variables; overlap
              strength = count of shared elements). Top {relDoc?.count.toLocaleString()} of{" "}
              {relDoc?.n_total_candidates_before_cap.toLocaleString()} candidate pairs by strength{relDoc?.capped ? " (capped)" : ""}.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openCompetitionInspector(row: CompetitionRow) {
    setInspector({
      eyebrow: "Competitor brand · measured gaps",
      title: brandLabel(row.brand),
      sendTheme: row.weakest?.theme ?? null,
      sendReason: row.weakest ? undefined : "No measured theme gap exists for this brand.",
      summary: [
        { label: "Origin", value: <OriginPill origin="Competitor" /> },
        { label: "Reviews", value: row.n_reviews.toLocaleString() },
        { label: "Products in corpus", value: row.n_products },
        { label: "Mean rating", value: `★${row.mean_rating}` },
        { label: "Weakest theme", value: row.weakest ? row.weakest.theme_name : "—" },
        { label: "Versuni angle", value: row.angle ? row.angle.name : "—" },
      ],
      tabs: [
        {
          key: "gaps", label: "Theme gaps",
          content: row.gaps.length ? (
            <div>
              {row.gaps.map((g) => (
                <CompactRow
                  key={g.theme}
                  label={g.theme_name}
                  value={formatDelta(g.delta_pp)}
                  title={`Brand rate ${g.brand_rate_pct}% vs category ${g.category_rate_pct}% — positive = this brand's own reviews over-index on the complaint`}
                />
              ))}
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No theme gaps recorded.</p>,
        },
        {
          key: "versuni", label: "Versuni set",
          content: verifiedProducts.length ? (
            <div>
              <SectionLabel>Verified Versuni comparison set (Air)</SectionLabel>
              {verifiedProducts.map((v) => (
                <CompactRow
                  key={v.product_id}
                  label={v.official_name}
                  value={v.specs?.cadr_m3h != null ? `CADR ${v.specs.cadr_m3h} m³/h · ${v.specs?.noise_min_dba != null ? `${v.specs.noise_min_dba} dBA min` : "noise —"}` : "specs in official record"}
                  title={v.official_name}
                />
              ))}
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Verified Versuni records not loaded.</p>,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/rivals — computed by src/real/rivals_real.py over brands with ≥{rivalsDoc?.min_reviews_floor ?? "—"} real
              reviews ({rivalsDoc?.n_category_reviews.toLocaleString() ?? "—"} category reviews total). delta pp = the brand's own
              complaint rate for a theme minus the category's rate, in percentage points; positive = the brand's
              customers complain about it more than the category average. Nothing is judged better/worse — only
              measured rates. The Versuni angle appears only when a real white-space record names this brand as
              measurably weak on that same theme.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openCoverageInspector(row: CoverageRow) {
    setInspector({
      eyebrow: `Need coverage · ${toSentence(row.home_domain)}`,
      title: needLabel(row.need),
      sendTheme: row.theme_ids[0] ?? null,
      sendReason: row.theme_ids.length ? undefined : "No friction theme addresses this need in this domain.",
      summary: [
        { label: "Home domain", value: toSentence(row.home_domain) },
        { label: "Coverage", value: <Pill tone={COVERAGE_TONE[row.state] ?? "neutral"}>{toSentence(row.state)}</Pill> },
        { label: "Themes addressing", value: row.n_themes_addressing },
        { label: "Possibilities targeting", value: row.n_possibilities_targeting },
        { label: "Worst rating gap", value: row.worst_rating_gap != null ? `${row.worst_rating_gap}★` : "—" },
        { label: "White space", value: row.is_white_space ? "Yes" : "No" },
      ],
      tabs: [
        {
          key: "themes", label: "Themes",
          content: row.theme_ids.length
            ? <PillWrap values={row.theme_ids} tone="blue" />
            : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No friction theme addresses this need in this domain — an honest gap, not a zero.</p>,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <div>
              {row.note && <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 8 }}>{row.note}</p>}
              <TracePara>
                GET /api/need-coverage — one row per (need × home domain). Evidence IDs: {row.evidence_ids.length ? row.evidence_ids.join(", ") : "none"}.
                NO_DATA means the pipeline holds no evidence for this cell, never that the need is absent in reality.
              </TracePara>
            </div>
          ),
        },
      ],
    });
  }

  function openCausalInspector(row: CausalRow) {
    setInspector({
      eyebrow: `${row.friction_theme_name} · ${toSentence(row.home_domain)}`,
      title: row.name,
      sendTheme: row.friction_theme_id,
      summary: [
        { label: "Friction theme", value: row.friction_theme_name },
        { label: "Primary need", value: needLabel(row.primary_need) },
        { label: "Gate passed", value: row.evidence_state.gate_passed ? "Yes" : "No" },
        { label: "Feasibility 2–5y", value: row.evidence_state.feasibility_2_5y_rating },
        { label: "Primitives", value: dotJoin(row.causal_primitives, (s) => s) },
        { label: "Truth class", value: <TruthBadge truthClass={row.evidence_state.truth_class} /> },
      ],
      tabs: [
        {
          key: "chain", label: "Chain",
          content: (
            <div>
              <CompactRow label="L0 mechanism" value={row.L0_mechanism} title={row.L0_mechanism} />
              <CompactRow label="L2 problem" value={row.L2_proximal_problem} title={row.L2_proximal_problem} />
              <CompactRow label="L3 human need" value={row.L3_human_need} title={row.L3_human_need} />
              <CompactRow label="L4 capability" value={row.L4_capability_created} title={row.L4_capability_created} />
              <CompactRow label="L5 freedom" value={row.L5_freedom_created} title={row.L5_freedom_created} />
              <CompactRow label="L6 direction" value={row.L6_ultimate_direction} title={row.L6_ultimate_direction} />
            </div>
          ),
        },
        {
          key: "states", label: "States",
          content: (
            <div>
              <SectionLabel>Current state</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>{row.current_state}</p>
              <SectionLabel>Desired state (if realized)</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>{row.desired_state}</p>
              <SectionLabel>Burdens addressed</SectionLabel>
              <PillWrap values={row.burden_dimensions_addressed} tone="amber" />
            </div>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/causal-atlas — built by src/real/causal_atlas_real.py. The need mapping and operator
              assignment are declared METHOD_CHOICE mappings applied deterministically; the L2 problem and
              current state come from real review evidence. Evidence IDs: {row.evidence_ids.join(", ") || "none"}.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openRotationInspector(row: RotationRow, kind: "primitive" | "state variable") {
    setInspector({
      eyebrow: kind === "primitive" ? "Causal primitive" : "State variable",
      title: toSentence(row.value),
      sendTheme: null,
      sendReason: "Aggregated row — no single friction theme applies.",
      summary: [
        { label: "Products touching", value: row.n_products },
        { label: "Domains", value: row.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" · ") },
        { label: "Evidence reviews", value: row.evidence_reviews.toLocaleString() },
      ],
      tabs: [
        {
          key: "needs", label: "Needs",
          content: row.top_needs.length ? (
            <div>
              {row.top_needs.map((n) => (
                <CompactRow key={n.need} label={needLabel(n.need)} value={`${n.reviews.toLocaleString()} evidence reviews`} title={n.need} />
              ))}
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No evidence-linked needs for this {kind}.</p>,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              Client-side rotation of GET /api/product-atlas: one row per distinct {kind} value; products = real
              products whose {kind === "primitive" ? "transformations_touched" : "state_variables_touched"} contains it;
              evidence reviews = sum of those products' real needs_touched evidence counts. Deterministic aggregation, no scoring.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openPossibilityInspector(p: Possibility) {
    setInspector({
      eyebrow: `${p.friction_theme_name} × ${toSentence(p.operator)}`,
      title: p.name,
      sendTheme: p.friction_theme,
      summary: [
        { label: "Friction theme", value: p.friction_theme_name },
        { label: "Operator", value: `${toSentence(p.operator)} — ${p.operator_definition}` },
        { label: "Gate passed", value: p.gate_passed ? "Yes" : "No" },
        { label: "Market exposure", value: `$${p.economic_value.toLocaleString()}` },
        { label: "Feasibility 2–5y", value: `${p.feasibility_2_5y.rating} (rank ${p.feasibility_2_5y.rank})` },
        { label: "Truth class", value: <TruthBadge truthClass={p.truth_class} /> },
      ],
      tabs: [
        {
          key: "why", label: "Why here",
          content: p.why_here ? (
            <div>
              <CompactRow label="Reality" value={p.why_here.reality} title={p.why_here.reality} />
              <CompactRow label="Transformation" value={p.why_here.transformation} title={p.why_here.transformation} />
              <CompactRow label="Consequence" value={p.why_here.product_consequence} title={p.why_here.product_consequence} />
              <CompactRow label="Basis" value={toSentence(p.why_here.consequence_basis)} />
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No why-here record.</p>,
        },
        {
          key: "test", label: "Test & unknowns",
          content: (
            <div>
              <SectionLabel>Next test</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>{p.test?.text ?? "—"}</p>
              <SectionLabel>Unknowns</SectionLabel>
              {p.unknowns.length
                ? p.unknowns.map((u, i) => <p key={i} style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 6 }}>{u}</p>)
                : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>—</p>}
            </div>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/magic-box — generated by src/real/magic_box_real.py from an analyst-designed
              deterministic rule (friction theme × authored operator). The operator is a labelled METHOD_CHOICE,
              not discovered intelligence. Evidence IDs: {p.evidence_ids.join(", ") || "none"}.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openInnovationInspector(o: InnovationObject) {
    const dims = Object.entries(o.critic_dimensions ?? {});
    const survive = dims.filter(([, d]) => d.verdict === "SURVIVE").length;
    const themeId = themeFromEvidenceIds(o.evidence_ids ?? []);
    setInspector({
      eyebrow: `Innovation object · ${toSentence(o.target_category)}`,
      title: o.name,
      sendTheme: themeId,
      sendReason: themeId ? undefined : "No friction theme tag in this object's evidence.",
      summary: [
        { label: "State", value: <Pill tone={INNOVATION_STATE_TONE[o.state] ?? "neutral"}>{toSentence(o.state)}</Pill> },
        { label: "Friction theme", value: themeId ? toSentence(themeId) : "—" },
        { label: "Gates surviving", value: dims.length ? `${survive}/${dims.length}` : "—" },
        { label: "Market exposure", value: o.economics?.price_weighted_exposure_usd != null ? `$${o.economics.price_weighted_exposure_usd.toLocaleString()}` : "—" },
      ],
      tabs: [
        {
          key: "gates", label: "Gates",
          content: dims.length ? (
            <div>
              {dims.map(([dim, d]) => (
                <div key={dim} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <Pill tone={d.verdict === "SURVIVE" ? "good" : d.verdict === "CHALLENGE" ? "amber" : d.verdict === "REJECT" ? "rose" : "neutral"}>{toSentence(dim)}</Pill>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>
                    <b style={{ color: "var(--ink)" }}>{toSentence(d.verdict)}</b> — {d.reasoning}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No critic gates recorded for this object.</p>,
        },
        {
          key: "next", label: "Next experiment",
          content: <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{o.next_experiment ?? "—"}</p>,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/innovation-objects — the innovation lifecycle store. Friction theme derived from the
              real "taxonomy:&lt;theme&gt;" tag in evidence_ids ({(o.evidence_ids ?? []).join(", ") || "none"});
              gate count = SURVIVE verdicts among the {dims.length || 8} named critic dimensions. Exposure is the
              price-weighted exposure indicator, not a revenue estimate.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openWhiteSpaceInspector(ws: WhiteSpaceRow) {
    setInspector({
      eyebrow: "White space · measured opportunity",
      title: ws.name,
      sendTheme: ws.theme,
      summary: [
        { label: "Friction theme", value: toSentence(ws.theme) },
        { label: "Consumer pain (rating gap)", value: `${ws.consumer_pain_csat}★` },
        { label: "Feasibility", value: toSentence(ws.feasibility) },
        { label: "Rivals measurably weak", value: ws.rivals_measurably_weak_here.length },
      ],
      tabs: [
        {
          key: "rivals", label: "Rivals weak here",
          content: ws.rivals_measurably_weak_here.length ? (
            <PillWrap values={ws.rivals_measurably_weak_here} tone="amber" labeler={brandLabel} />
          ) : <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No rival is measurably weak here.</p>,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/white-space — {ws.opportunity_id}. A white space is a friction theme with real measured
              consumer pain where named rivals' own reviews over-index on the complaint (from the rivals gap
              analysis). Rivals listed are those measurably weak on this exact theme, never asserted weak.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openTrendInspector(a: TrendArticle) {
    setInspector({
      eyebrow: `Trend document · ${toSentence(a.document_type)}`,
      title: a.title,
      sendTheme: null,
      sendReason: "Corpus theme tags are not friction themes — no real join exists.",
      summary: [
        { label: "Publisher", value: a.publisher },
        { label: "Source", value: a.source_domain },
        { label: "Published", value: a.published_date || "—" },
        { label: "Retrieved", value: a.retrieved_at || "—" },
        { label: "Credibility", value: toSentence(a.credibility_tier) },
        { label: "Scope", value: a.geographic_scope || "—" },
        { label: "Link verified", value: a.url_verified ? "Yes" : "No" },
      ],
      tabs: [
        {
          key: "scope", label: "Scope note",
          content: <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55 }}>{a.scope_note || "—"}</p>,
        },
        {
          key: "themes", label: "Themes",
          content: <PillWrap values={a.themes} tone="blue" labeler={trendThemeLabel} />,
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              GET /api/trends — {a.article_id}, archived at {a.archive_file ?? "—"} ({a.url}). Theme tags are the
              trend corpus's own vocabulary; no per-document link to friction themes or products exists, so this
              document deliberately joins to nothing else in the tables.
            </TracePara>
          ),
        },
      ],
    });
  }

  // ------------------------------------------------------------- columns

  const unifiedName: Column<UnifiedProduct> = {
    key: "name", label: "Product", width: "250px",
    render: (u) => (
      <EllipsisCell
        text={u.name}
        title={u.verified ? `${u.name} — verified official record; specs in inspector` : u.name}
        bold={u.origin === "Versuni"}
      />
    ),
    sortValue: (u) => u.name,
  };
  const unifiedOrigin: Column<UnifiedProduct> = {
    key: "origin", label: "Origin", width: "104px",
    render: (u) => <OriginPill origin={u.origin} />,
    sortValue: (u) => u.origin,
  };
  const unifiedBrand: Column<UnifiedProduct> = {
    key: "brand", label: "Brand", width: "110px",
    render: (u) => u.brand || "—", sortValue: (u) => u.brand,
  };

  const productColumns: Column<UnifiedProduct>[] = useMemo(() => {
    if (productsLens === "overview") return [
      unifiedName,
      unifiedBrand,
      { key: "domain", label: "Domain", width: "84px", render: (u) => DOMAIN_LABEL[u.domain] ?? toSentence(u.domain), sortValue: (u) => u.domain },
      { key: "primary_need", label: "Main need", width: "170px", render: (u) => (u.atlas?.needs_touched[0] ? needLabel(u.atlas.needs_touched[0].need) : "—"), sortValue: (u) => u.atlas?.needs_touched[0]?.need },
      { key: "mechanisms", label: "Mechanisms", width: "180px", render: (u) => (u.atlas ? dotJoin(u.atlas.transformations_touched, toSentence, 2) : "—") },
      unifiedOrigin,
    ];
    if (productsLens === "market") return [
      unifiedName,
      unifiedBrand,
      { key: "price", label: "Price", width: "72px", align: "right", render: (u) => (u.atlas?.price_usd != null ? `$${u.atlas.price_usd}` : "—"), sortValue: (u) => u.atlas?.price_usd ?? undefined },
      { key: "rating", label: "Rating", width: "68px", align: "right", render: (u) => (u.atlas?.average_rating != null ? `★${u.atlas.average_rating}` : "—"), sortValue: (u) => u.atlas?.average_rating ?? undefined },
      { key: "reviews", label: "Reviews", width: "76px", align: "right", render: (u) => u.atlas?.n_real_reviews_in_corpus ?? "—", sortValue: (u) => u.atlas?.n_real_reviews_in_corpus ?? undefined },
      unifiedOrigin,
    ];
    if (productsLens === "human") return [
      unifiedName,
      { key: "needs", label: "Needs", width: "220px", render: (u) => (u.atlas ? topNeedsCell(u.atlas.needs_touched) : "—") },
      { key: "burdens", label: "Burdens", width: "180px", render: (u) => (u.atlas ? dotJoin(u.atlas.burdens_touched, toSentence, 2) : "—") },
      {
        key: "evidence", label: "Evidence", width: "120px",
        render: (u) => u.verified
          ? <Pill tone="good">Official record</Pill>
          : (u.atlas?.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">Unlinked</Pill>),
        sortValue: (u) => (u.verified ? "OFFICIAL" : u.atlas?.evidence_state),
      },
      unifiedOrigin,
    ];
    // specs lens — real official specs; only verified Versuni rows carry them.
    return [
      unifiedName,
      { key: "cadr", label: "CADR", width: "90px", align: "right", render: (u) => (u.verified?.specs?.cadr_m3h != null ? `${u.verified.specs.cadr_m3h} m³/h` : "—"), sortValue: (u) => u.verified?.specs?.cadr_m3h ?? undefined },
      { key: "coverage", label: "Coverage", width: "88px", align: "right", render: (u) => (u.verified?.specs?.room_coverage_m2 != null ? `${u.verified.specs.room_coverage_m2} m²` : "—"), sortValue: (u) => u.verified?.specs?.room_coverage_m2 ?? undefined },
      { key: "noise", label: "Min noise", width: "88px", align: "right", render: (u) => (u.verified?.specs?.noise_min_dba != null ? `${u.verified.specs.noise_min_dba} dBA` : "—"), sortValue: (u) => u.verified?.specs?.noise_min_dba ?? undefined },
      { key: "sensors", label: "Sensors", width: "170px", render: (u) => u.verified?.specs?.sensors ?? "—" },
      { key: "app", label: "App", width: "60px", align: "center", render: (u) => (u.verified?.specs?.app === true ? "Yes" : u.verified?.specs?.app === false ? "No" : "—"), sortValue: (u) => (u.verified?.specs?.app ? 1 : 0) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsLens]);

  const productGroupOptions: GroupOption<UnifiedProduct>[] = useMemo(() => [
    { key: "origin", label: "Origin", groupValue: (u) => (u.origin === "Versuni" ? "Versuni (Philips)" : "Competitor"), sortGroups: VERSUNI_FIRST },
    { key: "domain", label: "Domain", groupValue: (u) => DOMAIN_LABEL[u.domain] ?? toSentence(u.domain) },
    { key: "brand", label: "Brand", groupValue: (u) => u.brand || "" },
    { key: "need", label: "Main need", groupValue: (u) => (u.atlas?.needs_touched[0] ? needLabel(u.atlas.needs_touched[0].need) : "No linked need") },
  ], []);

  const relColumns: Column<ProductRelationship>[] = useMemo(() => [
    { key: "a", label: "Product A", width: "230px", render: (r) => <EllipsisCell text={r.product_a_name} />, sortValue: (r) => r.product_a_name },
    { key: "b", label: "Product B", width: "230px", render: (r) => <EllipsisCell text={r.product_b_name} />, sortValue: (r) => r.product_b_name },
    { key: "type", label: "Relation", width: "150px", render: (r) => toSentence(r.relationship_type), sortValue: (r) => r.relationship_type },
    {
      key: "shared", label: "Shared", width: "230px",
      render: (r) => dotJoin([...r.shared_needs.map(needLabel), ...r.shared_transformations.map(toSentence)], (s) => s),
    },
    { key: "strength", label: "Strength", width: "76px", align: "right", render: (r) => r.overlap_strength, sortValue: (r) => r.overlap_strength },
  ], []);

  const competitionColumns: Column<CompetitionRow>[] = useMemo(() => [
    { key: "brand", label: "Competitor", width: "140px", render: (c) => <EllipsisCell text={brandLabel(c.brand)} bold />, sortValue: (c) => c.brand },
    { key: "reviews", label: "Reviews", width: "80px", align: "right", render: (c) => c.n_reviews.toLocaleString(), sortValue: (c) => c.n_reviews },
    {
      key: "weakest", label: "Their weakest theme", width: "230px",
      render: (c) => (c.weakest
        ? <EllipsisCell text={c.weakest.theme_name} title={`${c.weakest.theme_name} — brand ${c.weakest.brand_rate_pct}% vs category ${c.weakest.category_rate_pct}%`} />
        : "—"),
      sortValue: (c) => c.weakest?.theme_name,
    },
    {
      key: "gap", label: "Gap", width: "76px", align: "right",
      render: (c) => (c.weakest
        ? <span className="mono" title="This brand's own complaint rate minus the category rate, percentage points">{formatDelta(c.weakest.delta_pp)}</span>
        : "—"),
      sortValue: (c) => c.weakest?.delta_pp ?? undefined,
    },
    {
      key: "angle", label: "Versuni angle", width: "210px",
      render: (c) => (c.angle
        ? <EllipsisCell text={c.angle.name} title={`Real white space ${c.angle.opportunity_id}: ${c.angle.name}`} />
        : "—"),
      sortValue: (c) => c.angle?.name,
    },
    {
      key: "send", label: "Opportunity", width: "140px",
      render: (c) => (c.weakest ? (
        <button
          onClick={(e) => { e.stopPropagation(); onSendToMagicBox(c.weakest!.theme); }}
          title={`Filters Magic Box (Discover) to the ${c.weakest.theme_name} friction`}
          style={ACTION_BTN_STYLE}
        >
          Send theme →
        </button>
      ) : "—"),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const matrixColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "250px", render: (p) => <EllipsisCell text={p.name} />, sortValue: (p) => p.name } as Column<AtlasProduct>,
    ...topNeedKeys.map((need): Column<AtlasProduct> => ({
      key: `need:${need}`, label: needLabel(need), width: "96px", align: "right",
      render: (p) => {
        const hit = p.needs_touched.find((n) => n.need === need);
        return hit ? hit.n_evidence_reviews : "—";
      },
      sortValue: (p) => p.needs_touched.find((n) => n.need === need)?.n_evidence_reviews,
    })),
  ], [topNeedKeys]);

  const coverageColumns: Column<CoverageRow>[] = useMemo(() => [
    { key: "need", label: "Need", width: "190px", render: (r) => needLabel(r.need), sortValue: (r) => r.need },
    { key: "domain", label: "Domain", width: "130px", render: (r) => toSentence(r.home_domain), sortValue: (r) => r.home_domain },
    {
      key: "state", label: "Coverage", width: "100px",
      render: (r) => <Pill tone={COVERAGE_TONE[r.state] ?? "neutral"}>{toSentence(r.state)}</Pill>,
      sortValue: (r) => r.state,
    },
    { key: "themes", label: "Themes", width: "68px", align: "right", render: (r) => (r.n_themes_addressing || "—"), sortValue: (r) => r.n_themes_addressing },
    { key: "gap", label: "Worst gap", width: "80px", align: "right", render: (r) => (r.worst_rating_gap != null ? `${r.worst_rating_gap}★` : "—"), sortValue: (r) => r.worst_rating_gap ?? undefined },
    { key: "white", label: "White space", width: "86px", render: (r) => (r.is_white_space ? "Yes" : "—"), sortValue: (r) => (r.is_white_space ? 1 : 0) },
  ], []);

  const burdenColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "260px", render: (p) => <EllipsisCell text={p.name} />, sortValue: (p) => p.name } as Column<AtlasProduct>,
    ...distinctBurdens.map((b): Column<AtlasProduct> => ({
      key: `burden:${b}`, label: toSentence(b), width: "84px", align: "center",
      render: (p) => (p.burdens_touched.includes(b) ? "✓" : "—"),
      sortValue: (p) => (p.burdens_touched.includes(b) ? 1 : 0),
    })),
  ], [distinctBurdens]);

  const causalColumns: Column<CausalRow>[] = useMemo(() => [
    { key: "name", label: "Concept", width: "210px", render: (r) => <EllipsisCell text={r.name} bold />, sortValue: (r) => r.name },
    { key: "problem", label: "Problem", width: "240px", render: (r) => r.L2_proximal_problem },
    { key: "need", label: "Need", width: "160px", render: (r) => needLabel(r.primary_need), sortValue: (r) => r.primary_need },
    { key: "mechanism", label: "Mechanism", width: "170px", render: (r) => r.L0_mechanism, sortValue: (r) => r.L0_mechanism },
    { key: "freedom", label: "Freedom", width: "240px", render: (r) => r.L5_freedom_created },
  ], []);

  const rotationColumns = (kindLabel: string): Column<RotationRow>[] => [
    { key: "value", label: kindLabel, width: "170px", render: (r) => <EllipsisCell text={toSentence(r.value)} bold />, sortValue: (r) => r.value },
    { key: "products", label: "Products", width: "76px", align: "right", render: (r) => r.n_products, sortValue: (r) => r.n_products },
    { key: "domains", label: "Domains", width: "120px", render: (r) => r.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" · "), sortValue: (r) => r.domains.join() },
    { key: "needs", label: "Top needs", width: "240px", render: (r) => dotJoin(r.top_needs.map((n) => n.need), needLabel) },
    { key: "evidence", label: "Evidence reviews", width: "110px", align: "right", render: (r) => r.evidence_reviews.toLocaleString(), sortValue: (r) => r.evidence_reviews },
  ];
  const primitiveColumns = useMemo(() => rotationColumns("Primitive"), []);
  const stateVarColumns = useMemo(() => rotationColumns("State variable"), []);

  const autonomyColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "260px", render: (p) => <EllipsisCell text={p.name} />, sortValue: (p) => p.name },
    { key: "brand", label: "Brand", width: "110px", render: (p) => brandLabel(p.brand) || "—", sortValue: (p) => p.brand },
    {
      key: "intel", label: "Intelligence class", width: "130px",
      render: (p) => <Pill tone={p.cluster_intelligence === "adaptive" ? "teal" : p.cluster_intelligence === "connected" ? "blue" : "neutral"}>{toSentence(p.cluster_intelligence ?? "")}</Pill>,
      sortValue: (p) => p.cluster_intelligence ?? undefined,
    },
    { key: "reviews", label: "Reviews", width: "76px", align: "right", render: (p) => p.n_real_reviews_in_corpus, sortValue: (p) => p.n_real_reviews_in_corpus },
    {
      key: "evidence", label: "Evidence", width: "110px",
      render: (p) => (p.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">Unlinked</Pill>),
      sortValue: (p) => p.evidence_state,
    },
  ], []);

  const trendColumns: Column<TrendArticle>[] = useMemo(() => [
    { key: "title", label: "Document", width: "280px", render: (a) => <EllipsisCell text={a.title} bold />, sortValue: (a) => a.title },
    { key: "publisher", label: "Publisher", width: "200px", render: (a) => <EllipsisCell text={a.publisher} />, sortValue: (a) => a.publisher },
    { key: "type", label: "Type", width: "140px", render: (a) => toSentence(a.document_type), sortValue: (a) => a.document_type },
    { key: "cred", label: "Credibility", width: "140px", render: (a) => toSentence(a.credibility_tier), sortValue: (a) => a.credibility_tier },
    { key: "themes", label: "Corpus themes", width: "180px", render: (a) => dotJoin(a.themes, trendThemeLabel, 2) },
  ], []);

  const opportunityColumns: Column<OpportunityRow>[] = useMemo(() => [
    { key: "name", label: "Opportunity", width: "260px", render: (o) => <EllipsisCell text={o.name} bold />, sortValue: (o) => o.name },
    {
      key: "source", label: "Source", width: "130px",
      render: (o) => (
        <Pill tone={o.source === "White space" ? "amber" : o.source === "Magic possibility" ? "teal" : "blue"}>{o.source}</Pill>
      ),
      sortValue: (o) => o.source,
    },
    { key: "friction", label: "Friction", width: "180px", render: (o) => <EllipsisCell text={o.frictionLabel} />, sortValue: (o) => o.frictionLabel },
    { key: "status", label: "Status", width: "180px", render: (o) => o.status, sortValue: (o) => o.statusSort },
    { key: "value", label: "Value", width: "110px", align: "right", render: (o) => (o.valueUsd != null ? `$${o.valueUsd.toLocaleString()}` : "—"), sortValue: (o) => o.valueUsd ?? undefined },
  ], []);

  const domainGroup: GroupOption<AtlasProduct>[] = useMemo(() => [
    { key: "domain", label: "Domain", groupValue: (p) => DOMAIN_LABEL[p.domain] ?? p.domain },
    { key: "brand", label: "Brand", groupValue: (p) => brandLabel(p.brand) },
  ], []);

  // Selection → Magic Box action, shared by the theme-bearing tables.
  function sendSelectionAction(theme: string | null, n: number, clearSelection: () => void) {
    return (
      <button
        key="send"
        disabled={!theme}
        onClick={() => { if (theme) { onSendToMagicBox(theme); clearSelection(); } }}
        title={theme ? `Filters Magic Box (Discover) to the ${theme} friction theme` : "No row in this selection carries a real friction theme"}
        style={theme ? ACTION_BTN_STYLE : ACTION_BTN_DISABLED_STYLE}
      >
        {theme ? `Send ${n} to Magic Box` : "No friction theme in selection"}
      </button>
    );
  }

  // ------------------------------------------------------------- compare mode

  function CompareView({ items, onBack }: { items: UnifiedProduct[]; onBack: () => void }) {
    const anySpecs = items.some((u) => u.verified?.specs);
    interface AttrRow { label: string; value: (u: UnifiedProduct) => ReactNode }
    const attrs: AttrRow[] = [
      { label: "Brand", value: (u) => u.brand || "—" },
      { label: "Domain", value: (u) => DOMAIN_LABEL[u.domain] ?? toSentence(u.domain) },
      { label: "Origin", value: (u) => <OriginPill origin={u.origin} /> },
      { label: "Price", value: (u) => (u.atlas?.price_usd != null ? `$${u.atlas.price_usd}` : "—") },
      { label: "Rating", value: (u) => (u.atlas?.average_rating != null ? `★${u.atlas.average_rating}` : "—") },
      { label: "Reviews", value: (u) => u.atlas?.n_real_reviews_in_corpus ?? "—" },
      { label: "Top need", value: (u) => (u.atlas?.needs_touched[0] ? needLabel(u.atlas.needs_touched[0].need) : "—") },
      { label: "Mechanisms", value: (u) => (u.atlas ? dotJoin(u.atlas.transformations_touched, toSentence, 2) : "—") },
      { label: "Burdens", value: (u) => (u.atlas ? dotJoin(u.atlas.burdens_touched, toSentence, 2) : "—") },
      ...(anySpecs ? [
        { label: "CADR", value: (u: UnifiedProduct) => (u.verified?.specs?.cadr_m3h != null ? `${u.verified.specs.cadr_m3h} m³/h` : "—") },
        { label: "Coverage", value: (u: UnifiedProduct) => (u.verified?.specs?.room_coverage_m2 != null ? `${u.verified.specs.room_coverage_m2} m²` : "—") },
        { label: "Min noise", value: (u: UnifiedProduct) => (u.verified?.specs?.noise_min_dba != null ? `${u.verified.specs.noise_min_dba} dBA` : "—") },
        { label: "Sensors", value: (u: UnifiedProduct) => u.verified?.specs?.sensors ?? "—" },
        { label: "App", value: (u: UnifiedProduct) => (u.verified?.specs?.app === true ? "Yes" : u.verified?.specs?.app === false ? "No" : "—") },
      ] : []),
    ];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button onClick={onBack} style={ACTION_BTN_STYLE}>← Back to table</button>
          <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Comparing {items.length} products — "—" is honest missing data</span>
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: 120, padding: "8px 10px", borderBottom: "1px solid var(--line)", background: "var(--surface)", textAlign: "left", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }} />
                {items.map((u) => (
                  <th key={u.uid} style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", background: "var(--surface)", textAlign: "left" }}>
                    <div title={u.name} style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                    <div style={{ marginTop: 4 }}><OriginPill origin={u.origin} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.map((attr) => (
                <tr key={attr.label}>
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{attr.label}</td>
                  {items.map((u) => {
                    const v = attr.value(u);
                    return (
                      <td key={u.uid} style={{ padding: "7px 10px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--ink-dim)" }}>
                        {typeof v === "string" || typeof v === "number"
                          ? <span title={String(v)} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                          : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FoldNote summary="Where these values come from">
          Price, rating, reviews, needs, mechanisms and burdens come from the real review corpus
          (GET /api/product-atlas); CADR, coverage, noise, sensors and app come from verified official
          Philips product pages (GET /api/product-images). "—" means the record honestly carries no
          value for that attribute — the two record types are never blended.
        </FoldNote>
      </div>
    );
  }

  // ------------------------------------------------------------- render

  function loadingOrError(doc: unknown, source: string): ReactNode | null {
    if (doc === undefined) return <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading real data from {source}…</p>;
    if (doc === null) return <p style={{ fontSize: 12, color: "var(--rose)" }}>Could not load {source} — no fallback data is shown, because none would be real.</p>;
    return null;
  }

  function activeRowCount(): number | null {
    switch (view) {
      case "products": return unified.length;
      case "needs": return needsLens === "matrix" ? products.length : coverageRows.length;
      case "relationships": return relationships.length;
      case "competition": return competitionRows.length;
      case "causality": return causalLens === "chain" ? causalRows.length : causalLens === "primitives" ? primitiveRows.length : stateVarRows.length;
      case "burden": return products.length;
      case "autonomy": return airIntelRows.length;
      case "trends": return trendArticles.length;
      case "opportunities": return opportunityRows.length;
      default: return null;
    }
  }

  function renderView(): ReactNode {
    switch (view) {
      case "products": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        if (compareRows) return <CompareView items={compareRows} onBack={() => setCompareRows(null)} />;
        return (
          <>
            {productsLens === "specs" && (
              <FoldNote summary="Official specs exist only for verified Versuni products">
                CADR, room coverage, minimum noise, sensors and app support are read directly off official
                Philips product pages for the 10 hand-verified Versuni air purifiers (GET /api/product-images).
                Corpus products have no verified official spec record in this pipeline, so their cells honestly
                show "—" instead of scraped or guessed numbers.
              </FoldNote>
            )}
            <DataTable
              key={`products-${productsLens}`}
              rows={unified}
              columns={productColumns}
              getRowId={(u) => u.uid}
              onRowClick={openUnifiedInspector}
              groupOptions={productGroupOptions}
              defaultGroupKey="origin"
              searchable
              searchValue={(u) => `${u.name} ${u.brand} ${u.brandRaw}`}
              selectable
              selectionActions={(sel, clear) => (
                <>
                  {sendSelectionAction(dominantTheme(sel.map((u) => u.atlas).filter((a): a is AtlasProduct => !!a)), sel.length, clear)}
                  <button
                    key="compare"
                    disabled={sel.length < 2 || sel.length > 5}
                    onClick={() => setCompareRows(sel)}
                    title={sel.length >= 2 && sel.length <= 5 ? "Side-by-side comparison of the selected products" : "Select 2–5 products to compare"}
                    style={sel.length >= 2 && sel.length <= 5 ? ACTION_BTN_STYLE : ACTION_BTN_DISABLED_STYLE}
                  >
                    Compare {sel.length >= 2 && sel.length <= 5 ? sel.length : ""}
                  </button>
                </>
              )}
              emptyMessage="No products match."
            />
          </>
        );
      }
      case "needs": {
        if (needsLens === "matrix") {
          const gate = loadingOrError(atlasDoc, "/api/product-atlas");
          if (gate) return gate;
          return (
            <>
              <FoldNote summary={`Top ${topNeedKeys.length} of ${distinctNeeds.length} needs shown`}>
                Columns are the top {topNeedKeys.length} needs by total real evidence across the corpus — the
                column budget stays honest instead of scrolling sideways. Each cell is the real count of this
                product's reviews classified into that need; "—" where none exist.
              </FoldNote>
              <DataTable
                key="needs-matrix"
                rows={products}
                columns={matrixColumns}
                getRowId={(p) => p.id}
                onRowClick={(p) => openCorpusInspector(p, /philips/i.test(p.brand) ? "Versuni" : "Competitor")}
                groupOptions={domainGroup}
                defaultGroupKey="domain"
                searchable
                searchValue={(p) => `${p.name} ${p.brand}`}
                emptyMessage="No products."
              />
            </>
          );
        }
        const gate = loadingOrError(coverageDoc, "/api/need-coverage");
        if (gate) return gate;
        return (
          <DataTable
            key="needs-coverage"
            rows={coverageRows}
            columns={coverageColumns}
            getRowId={(r) => `${r.need}::${r.home_domain}`}
            onRowClick={openCoverageInspector}
            groupOptions={[
              { key: "state", label: "Coverage state", groupValue: (r) => toSentence(r.state) },
              { key: "domain", label: "Home domain", groupValue: (r) => toSentence(r.home_domain) },
            ]}
            defaultGroupKey="state"
            emptyMessage="No coverage rows."
          />
        );
      }
      case "relationships": {
        const gate = loadingOrError(relDoc, "/api/product-relationships");
        if (gate) return gate;
        return (
          <>
            <FoldNote summary={`Top ${relDoc!.count.toLocaleString()} real pairs by overlap strength`}>
              {relDoc!.n_total_candidates_before_cap.toLocaleString()} candidate pairs exist before the cap
              {relDoc!.capped ? " (served list is capped)" : ""}; each pair's overlap strength is the count of
              genuinely shared needs, mechanisms, burdens and state variables — computed, never scored.
            </FoldNote>
            <DataTable
              key="relationships"
              rows={relationships}
              columns={relColumns}
              getRowId={(r) => `${r.product_a_id}::${r.product_b_id}`}
              onRowClick={openRelationshipInspector}
              groupOptions={[{ key: "type", label: "Relation type", groupValue: (r) => toSentence(r.relationship_type) }]}
              defaultGroupKey="type"
              searchable
              searchValue={(r) => `${r.product_a_name} ${r.product_b_name}`}
              defaultSortKey="strength"
              defaultSortDir="desc"
              emptyMessage="No relationships."
            />
          </>
        );
      }
      case "competition": {
        const gate = loadingOrError(rivalsDoc, "/api/rivals");
        if (gate) return gate;
        return (
          <>
            <FoldNote summary="Measured complaint-rate gaps, never invented judgments">
              One row per rival brand above the evidence floor (≥{rivalsDoc!.min_reviews_floor} real reviews).
              "Their weakest theme" is the friction their own customers' reviews over-index on most versus the
              category ({rivalsDoc!.n_category_reviews.toLocaleString()} reviews); the gap is in percentage
              points. The Versuni angle appears only where a real white-space record names that brand as
              measurably weak on that same theme — otherwise "—".
            </FoldNote>
            <DataTable
              key="competition"
              rows={competitionRows}
              columns={competitionColumns}
              getRowId={(c) => c.brand}
              onRowClick={openCompetitionInspector}
              groupOptions={[{ key: "weakest", label: "Weakest theme", groupValue: (c) => c.weakest?.theme_name ?? "" }]}
              defaultGroupKey="weakest"
              searchable
              searchValue={(c) => brandLabel(c.brand) + " " + c.brand}
              defaultSortKey="reviews"
              defaultSortDir="desc"
              emptyMessage="No rival brands above the evidence floor."
            />
          </>
        );
      }
      case "causality": {
        if (causalLens === "chain") {
          const gate = loadingOrError(causalDoc, "/api/causal-atlas");
          if (gate) return gate;
          return (
            <DataTable
              key="causal-chain"
              rows={causalRows}
              columns={causalColumns}
              getRowId={(r) => r.id}
              onRowClick={openCausalInspector}
              groupOptions={[
                { key: "domain", label: "Domain", groupValue: (r) => toSentence(r.home_domain) },
                { key: "need", label: "Need", groupValue: (r) => needLabel(r.primary_need) },
              ]}
              defaultGroupKey="domain"
              selectable
              selectionActions={(sel, clear) => sendSelectionAction(mostFrequentTheme(sel.map((r) => r.friction_theme_id)), sel.length, clear)}
              emptyMessage="No concepts."
            />
          );
        }
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        if (causalLens === "primitives") {
          return (
            <DataTable
              key="causal-primitives"
              rows={primitiveRows}
              columns={primitiveColumns}
              getRowId={(r) => r.id}
              onRowClick={(r) => openRotationInspector(r, "primitive")}
              defaultSortKey="products"
              defaultSortDir="desc"
              emptyMessage="No primitives."
            />
          );
        }
        return (
          <DataTable
            key="causal-statevars"
            rows={stateVarRows}
            columns={stateVarColumns}
            getRowId={(r) => r.id}
            onRowClick={(r) => openRotationInspector(r, "state variable")}
            defaultSortKey="products"
            defaultSortDir="desc"
            emptyMessage="No state variables."
          />
        );
      }
      case "burden": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <FoldNote summary={`✓ marks real review evidence per burden dimension`}>
              The {distinctBurdens.length} burden dimensions are the real ones in the pipeline. ✓ = this
              product's classified review evidence touches that burden; a row of "—" means no linked evidence,
              never zero burden.
            </FoldNote>
            <DataTable
              key="burden"
              rows={products}
              columns={burdenColumns}
              getRowId={(p) => p.id}
              onRowClick={(p) => openCorpusInspector(p, /philips/i.test(p.brand) ? "Versuni" : "Competitor")}
              groupOptions={domainGroup}
              defaultGroupKey="domain"
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No products."
            />
          </>
        );
      }
      case "handoffs":
        return (
          <EmptySlot
            label="Handoffs"
            summary="No real handoff dataset exists yet."
            reason="No real dataset exists in this pipeline for human-to-machine handoffs. Building this table would require fabricating handoff/workflow data; it stays honestly empty until a real acquisition adds it."
          />
        );
      case "autonomy": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <FoldNote summary="Honest proxy: sensing intelligence, not autonomy">
              The real cluster_intelligence field classifies Air products by sensing intelligence
              (manual → reactive → connected → adaptive). It is not an autonomy measurement — no autonomy
              dataset exists in this pipeline. Floor care products carry no value for this field and are not shown.
            </FoldNote>
            <DataTable
              key="autonomy"
              rows={airIntelRows}
              columns={autonomyColumns}
              getRowId={(p) => p.id}
              onRowClick={(p) => openCorpusInspector(p, /philips/i.test(p.brand) ? "Versuni" : "Competitor")}
              groupOptions={[{ key: "intel", label: "Intelligence class", groupValue: (p) => toSentence(p.cluster_intelligence ?? "") }]}
              defaultGroupKey="intel"
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No Air products with an intelligence class."
            />
          </>
        );
      }
      case "trends": {
        const gate = loadingOrError(trendsDoc, "/api/trends");
        if (gate) return gate;
        if (!trendArticles.length) {
          return (
            <EmptySlot
              label="Trends"
              summary="Trend corpus loaded, but holds no documents."
              reason="The trend corpus endpoint answered without any archived documents; nothing is shown because nothing real exists to show."
            />
          );
        }
        return (
          <>
            <FoldNote summary="Real archived documents — no product join exists">
              These are the {trendArticles.length} real archived trend documents. Their theme tags are the
              corpus's own vocabulary (regulation, iaq standards, …) with no per-document link to friction themes
              or products — joining them to products would be fabrication, so these rows deliberately stand alone.
            </FoldNote>
            <DataTable
              key="trends"
              rows={trendArticles}
              columns={trendColumns}
              getRowId={(a) => a.article_id}
              onRowClick={openTrendInspector}
              groupOptions={[{ key: "cred", label: "Credibility", groupValue: (a) => toSentence(a.credibility_tier) }]}
              searchable
              searchValue={(a) => `${a.title} ${a.publisher}`}
              emptyMessage="No documents."
            />
          </>
        );
      }
      case "opportunities": {
        const gates = [
          loadingOrError(wsDoc, "/api/white-space"),
          loadingOrError(magicDoc, "/api/magic-box"),
          loadingOrError(innovDoc, "/api/innovation-objects"),
        ].filter(Boolean);
        if (gates.length === 3) return gates[0];
        return (
          <>
            <FoldNote summary="Three real sources, one table, source always labelled">
              White spaces come from GET /api/white-space (measured pain + rivals measurably weak),
              magic possibilities from GET /api/magic-box (gate-passed only), innovations from
              GET /api/innovation-objects (the live lifecycle store). Rows never mix fields across sources —
              a value a source doesn't carry shows "—".
            </FoldNote>
            <DataTable
              key="opportunities"
              rows={opportunityRows}
              columns={opportunityColumns}
              getRowId={(o) => o.id}
              onRowClick={(o) => {
                if (o.ws) openWhiteSpaceInspector(o.ws);
                else if (o.poss) openPossibilityInspector(o.poss);
                else if (o.innov) openInnovationInspector(o.innov);
              }}
              groupOptions={[{
                key: "source", label: "Source", groupValue: (o) => o.source,
                sortGroups: (a, b) => (OPP_SOURCE_ORDER[a] ?? 9) - (OPP_SOURCE_ORDER[b] ?? 9),
              }]}
              defaultGroupKey="source"
              searchable
              searchValue={(o) => `${o.name} ${o.frictionLabel}`}
              selectable
              selectionActions={(sel, clear) => sendSelectionAction(mostFrequentTheme(sel.map((o) => o.themeId)), sel.length, clear)}
              defaultSortKey="value"
              defaultSortDir="desc"
              emptyMessage="No opportunities."
            />
          </>
        );
      }
      default:
        return null;
    }
  }

  const rowCount = view === "handoffs" ? null : activeRowCount();

  const lensButton = (active: boolean) => ({
    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
    background: active ? "var(--surface)" : "transparent",
    fontWeight: active ? 700 : 500,
    color: active ? "var(--ink)" : "var(--ink-faint)",
    boxShadow: active ? "var(--shadow)" : "none",
  } as const);

  return (
    <div data-testid="smart-tables">
      {/* View selector — 10 plain entries, sentence case, no numbering */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 12, padding: 4, flexWrap: "wrap" }}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => selectView(v.key)}
              data-testid={`smart-view-${v.key}`}
              style={{
                padding: "7px 13px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12,
                background: view === v.key ? "var(--surface)" : "transparent",
                fontWeight: view === v.key ? 700 : 500,
                color: view === v.key ? "var(--ink)" : "var(--ink-faint)",
                boxShadow: view === v.key ? "var(--shadow)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)" }}>
          {rowCount != null ? `${rowCount.toLocaleString()} rows` : "no dataset"}
        </span>
      </div>

      {/* Contextual lenses — segmented control REPLACING the column set */}
      {(view === "products" || view === "needs" || view === "causality") && (
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3, marginBottom: 12, width: "fit-content" }}>
          {view === "products" && PRODUCTS_LENSES.map((l) => (
            <button key={l.key} onClick={() => { setProductsLens(l.key); setCompareRows(null); }} style={lensButton(productsLens === l.key)}>{l.label}</button>
          ))}
          {view === "needs" && NEEDS_LENSES.map((l) => (
            <button key={l.key} onClick={() => setNeedsLens(l.key)} style={lensButton(needsLens === l.key)}>{l.label}</button>
          ))}
          {view === "causality" && CAUSAL_LENSES.map((l) => (
            <button key={l.key} onClick={() => setCausalLens(l.key)} style={lensButton(causalLens === l.key)}>{l.label}</button>
          ))}
        </div>
      )}

      {renderView()}

      <FocusPanel open={!!inspector} onClose={() => setInspector(null)} eyebrow={inspector?.eyebrow} title={inspector?.title ?? ""}>
        {inspector && (
          <>
            {inspector.image && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <img
                  src={inspector.image}
                  alt={inspector.title}
                  style={{ maxHeight: 140, maxWidth: "80%", objectFit: "contain", borderRadius: 12, background: "var(--surface-2)", padding: 8 }}
                />
              </div>
            )}
            <CompactInspector summary={inspector.summary} tabs={inspector.tabs} />
            <button
              disabled={!inspector.sendTheme}
              onClick={() => {
                if (inspector.sendTheme) {
                  const t = inspector.sendTheme;
                  setInspector(null);
                  onSendToMagicBox(t);
                }
              }}
              title={inspector.sendTheme
                ? `Filters Magic Box (Discover) to the ${inspector.sendTheme} friction theme`
                : inspector.sendReason ?? "No real friction theme on this record"}
              style={{
                ...(inspector.sendTheme ? ACTION_BTN_STYLE : ACTION_BTN_DISABLED_STYLE),
                display: "block", width: "100%", marginTop: 16, padding: "10px 14px", fontSize: 12.5,
              }}
            >
              {inspector.sendTheme ? "Send to Magic Box →" : "Send to Magic Box — no friction theme"}
            </button>
            {!inspector.sendTheme && inspector.sendReason && (
              <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.5 }}>{inspector.sendReason}</p>
            )}
          </>
        )}
      </FocusPanel>
    </div>
  );
}
