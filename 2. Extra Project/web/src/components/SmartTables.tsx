import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, TruthBadge, CompactInspector, CompactRow, type InspectorPair, type InspectorTab } from "./ui";
import { FocusPanel } from "./FocusPanel";
import { DataTable, type Column, type GroupOption } from "./DataTable";

// SMART TABLES — the single analytical-table workspace of the product, living
// inside the Magic Box world. A 5-cluster × 20-slot registry with exactly one
// table active at a time; every cell traces to real computed pipeline data.
// Slots with no real backing dataset render an honest empty state — project
// policy: nothing is ever invented to fill a table.
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
interface TrendsDoc { article_count?: number; articles?: { article_id: string; themes?: string[] }[] }

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
// (duplicated from CompetitiveField.tsx)
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
// For rows that carry exactly one friction theme each (causal chain, magic
// possibilities): the most frequent theme in the selection — a deterministic
// count, not a score.
function mostFrequentTheme(themeIds: string[]): string | null {
  const counts = new Map<string, number>();
  for (const t of themeIds) counts.set(t, (counts.get(t) ?? 0) + 1);
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
// From InnovationsWorld's helper: an innovation's friction theme is the
// "taxonomy:<theme>" tag inside its real evidence_ids — never guessed.
function themeFromEvidenceIds(evidenceIds: string[]): string | null {
  const tax = evidenceIds.find((id) => id.startsWith("taxonomy:"));
  return tax ? tax.split(":")[1] : null;
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
const SELECT_STYLE = {
  fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--ink)", fontFamily: "var(--font-mono)",
} as const;

const COVERAGE_TONE: Record<string, "good" | "amber" | "rose" | "neutral" | "blue" | "teal"> = {
  STRONG: "good", SECONDARY: "teal", WEAK: "amber", NO_DATA: "neutral",
};
const INNOVATION_STATE_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  alive: "good", promoted: "good", challenged: "amber", killed: "rose", archived: "neutral",
};

// ---------------------------------------------------------------------------
// Registry — 5 clusters × 4 slots. `empty` marks a slot with no real dataset.

type TableKey =
  | "product_atlas" | "product_relationships" | "portfolio_clusters" | "product_performance"
  | "products_x_needs" | "need_coverage" | "human_burden" | "human_handoffs"
  | "causal_chain" | "causal_primitives" | "state_variables" | "capability_transfer"
  | "end_to_end_chains" | "autonomy" | "current_ideal_home" | "need_convergence"
  | "trends_x_products" | "trend_opportunities" | "magic_possibilities" | "innovation_portfolio";

interface TableDef { id: string; key: TableKey; label: string; empty?: string }
interface ClusterDef { key: string; label: string; tables: TableDef[] }

const NO_DATA = (what: string, fabricated: string) =>
  `No real dataset exists in this pipeline for ${what}. Building it would require fabricating ${fabricated} data; it stays empty until a real acquisition adds it.`;

const REGISTRY: ClusterDef[] = [
  {
    key: "PRODUCT", label: "Product", tables: [
      { id: "01", key: "product_atlas", label: "01 Product atlas" },
      { id: "02", key: "product_relationships", label: "02 Product relationships" },
      { id: "03", key: "portfolio_clusters", label: "03 Portfolio clusters" },
      { id: "04", key: "product_performance", label: "04 Product performance", empty: NO_DATA("product performance over time (sales, returns, in-use telemetry)", "performance") },
    ],
  },
  {
    key: "NEED", label: "Need", tables: [
      { id: "05", key: "products_x_needs", label: "05 Products × needs" },
      { id: "06", key: "need_coverage", label: "06 Need coverage" },
      { id: "07", key: "human_burden", label: "07 Human burden" },
      { id: "08", key: "human_handoffs", label: "08 Human handoffs", empty: NO_DATA("human-to-machine handoffs", "handoff/workflow") },
    ],
  },
  {
    key: "CAUSAL", label: "Causal", tables: [
      { id: "09", key: "causal_chain", label: "09 Causal chain" },
      { id: "10", key: "causal_primitives", label: "10 Causal primitives" },
      { id: "11", key: "state_variables", label: "11 State variables" },
      { id: "12", key: "capability_transfer", label: "12 Capability transfer" },
    ],
  },
  {
    key: "HOME", label: "Home", tables: [
      { id: "13", key: "end_to_end_chains", label: "13 End-to-end chains", empty: NO_DATA("end-to-end household task chains", "workflow-chain") },
      { id: "14", key: "autonomy", label: "14 Autonomy" },
      { id: "15", key: "current_ideal_home", label: "15 Current → ideal home", empty: NO_DATA("current-vs-ideal home state transitions", "home-state") },
      { id: "16", key: "need_convergence", label: "16 Need convergence" },
    ],
  },
  {
    key: "FUTURE", label: "Future", tables: [
      { id: "17", key: "trends_x_products", label: "17 Trends × products" },
      { id: "18", key: "trend_opportunities", label: "18 Trend opportunities", empty: NO_DATA("trend-derived opportunities", "trend-opportunity") },
      { id: "19", key: "magic_possibilities", label: "19 Magic possibilities" },
      { id: "20", key: "innovation_portfolio", label: "20 Innovation portfolio" },
    ],
  },
];

// Column lenses for the Product atlas — same rows, replaced column sets.
type AtlasLens = "overview" | "human" | "market" | "causal";
const ATLAS_LENSES: { key: AtlasLens; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "human", label: "Human" },
  { key: "market", label: "Market" },
  { key: "causal", label: "Causal" },
];

// ---------------------------------------------------------------------------
// Derived-row shapes (all client-side deterministic rollups of real data)

interface ClusterRollupRow {
  id: string; label: string; domain: string; n_products: number;
  total_reviews: number; top_need: string | null; top_need_reviews: number; top_mechanisms: string[];
}
interface RotationRow {
  id: string; value: string; n_products: number; domains: string[];
  top_needs: { need: string; reviews: number }[]; evidence_reviews: number;
}
interface ConvergenceRow {
  id: string; need_a: string; need_b: string; n_products: number;
  shared_mechanisms: string[]; evidence_reviews: number; product_names: string[];
}

function buildClusterRollup(products: AtlasProduct[]): ClusterRollupRow[] {
  // Air rolls up by real cluster_type; Floor has no cluster_type in the data,
  // so it rolls up as one honest domain-level row.
  const buckets = new Map<string, { label: string; domain: string; ps: AtlasProduct[] }>();
  for (const p of products) {
    const key = p.domain === "AIR" ? `AIR:${p.cluster_type ?? "unclustered"}` : `FLOOR:domain`;
    const label = p.domain === "AIR" ? clusterLabel(p.cluster_type) : "Floor care (no cluster data)";
    if (!buckets.has(key)) buckets.set(key, { label, domain: p.domain, ps: [] });
    buckets.get(key)!.ps.push(p);
  }
  const rows: ClusterRollupRow[] = [];
  for (const [key, b] of buckets) {
    let reviews = 0;
    const needTotals = new Map<string, number>();
    const mechCounts = new Map<string, number>();
    for (const p of b.ps) {
      reviews += p.n_real_reviews_in_corpus;
      for (const n of p.needs_touched) needTotals.set(n.need, (needTotals.get(n.need) ?? 0) + n.n_evidence_reviews);
      for (const t of p.transformations_touched) mechCounts.set(t, (mechCounts.get(t) ?? 0) + 1);
    }
    const topNeed = [...needTotals.entries()].sort((a, b2) => b2[1] - a[1])[0];
    rows.push({
      id: key, label: b.label, domain: b.domain, n_products: b.ps.length, total_reviews: reviews,
      top_need: topNeed ? topNeed[0] : null, top_need_reviews: topNeed ? topNeed[1] : 0,
      top_mechanisms: [...mechCounts.entries()].sort((a, b2) => b2[1] - a[1]).map(([m]) => m),
    });
  }
  return rows.sort((a, b) => b.total_reviews - a.total_reviews);
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

function buildConvergence(products: AtlasProduct[]): ConvergenceRow[] {
  // Deterministic set-intersection: for every pair of needs, which real
  // products carry evidence for BOTH, and which mechanisms those products
  // share. Nothing is scored or predicted.
  const allNeeds = [...new Set(products.flatMap((p) => p.needs_touched.map((n) => n.need)))].sort();
  const rows: ConvergenceRow[] = [];
  for (let i = 0; i < allNeeds.length; i++) {
    for (let j = i + 1; j < allNeeds.length; j++) {
      const a = allNeeds[i], b = allNeeds[j];
      const both = products.filter(
        (p) => p.needs_touched.some((n) => n.need === a) && p.needs_touched.some((n) => n.need === b)
      );
      if (!both.length) continue;
      const mechCounts = new Map<string, number>();
      let evidence = 0;
      for (const p of both) {
        for (const t of p.transformations_touched) mechCounts.set(t, (mechCounts.get(t) ?? 0) + 1);
        for (const n of p.needs_touched) if (n.need === a || n.need === b) evidence += n.n_evidence_reviews;
      }
      rows.push({
        id: `${a}::${b}`, need_a: a, need_b: b, n_products: both.length,
        shared_mechanisms: [...mechCounts.entries()].sort((x, y) => y[1] - x[1]).map(([m]) => m),
        evidence_reviews: evidence,
        product_names: both.map((p) => p.name),
      });
    }
  }
  return rows.sort((a, b) => b.n_products - a.n_products);
}

// ---------------------------------------------------------------------------

function EmptySlot({ label, reason }: { label: string; reason: string }) {
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: "20px 24px", maxWidth: 620, background: "var(--surface)" }}>
      <SectionLabel>Honest empty state — project policy, not a cop-out</SectionLabel>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{label}</div>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55 }}>{reason}</p>
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

interface InspectorState { eyebrow: string; title: string; summary: InspectorPair[]; tabs: InspectorTab[] }

// ---------------------------------------------------------------------------

export function SmartTables({ onSendToMagicBox }: { onSendToMagicBox: (themeId: string) => void }) {
  const [atlasDoc, setAtlasDoc] = useState<ProductAtlasResponse | null | undefined>(undefined);
  const [relDoc, setRelDoc] = useState<ProductRelationshipsResponse | null | undefined>(undefined);
  const [causalDoc, setCausalDoc] = useState<CausalAtlasResponse | null | undefined>(undefined);
  const [coverageDoc, setCoverageDoc] = useState<NeedCoverageResponse | null | undefined>(undefined);
  const [magicDoc, setMagicDoc] = useState<MagicBoxDoc | null | undefined>(undefined);
  const [innovDoc, setInnovDoc] = useState<InnovationObjectsResponse | null | undefined>(undefined);
  const [trendsDoc, setTrendsDoc] = useState<TrendsDoc | null | undefined>(undefined);

  const [clusterKey, setClusterKey] = useState("PRODUCT");
  const [tableKey, setTableKey] = useState<TableKey>("product_atlas");
  const [atlasLens, setAtlasLens] = useState<AtlasLens>("overview");
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
  }, []);

  const cluster = REGISTRY.find((c) => c.key === clusterKey) ?? REGISTRY[0];
  const tableDef = cluster.tables.find((t) => t.key === tableKey) ?? cluster.tables[0];

  function selectCluster(key: string) {
    setClusterKey(key);
    const c = REGISTRY.find((x) => x.key === key);
    if (c && !c.tables.some((t) => t.key === tableKey)) setTableKey(c.tables[0].key);
  }

  const products = useMemo(() => atlasDoc?.products ?? [], [atlasDoc]);
  const relationships = relDoc?.relationships ?? [];
  const causalRows = causalDoc?.rows ?? [];
  const coverageRows = coverageDoc?.rows ?? [];
  const possibilities = magicDoc?.possibilities ?? [];
  const innovations = innovDoc?.innovations ?? [];

  const clusterRollup = useMemo(() => buildClusterRollup(products), [products]);
  const primitiveRows = useMemo(() => buildRotation(products, "transformations_touched"), [products]);
  const stateVarRows = useMemo(() => buildRotation(products, "state_variables_touched"), [products]);
  const convergenceRows = useMemo(() => buildConvergence(products), [products]);
  const airIntelRows = useMemo(() => products.filter((p) => p.cluster_intelligence != null), [products]);
  const distinctNeeds = useMemo(
    () => [...new Set(products.flatMap((p) => p.needs_touched.map((n) => n.need)))],
    [products]
  );
  // Products × needs matrix keeps the column budget honest: top 6 needs by
  // total real evidence; the header note declares "top 6 of N".
  const topNeedKeys = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of products) for (const n of p.needs_touched) totals.set(n.need, (totals.get(n.need) ?? 0) + n.n_evidence_reviews);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [products]);
  const distinctBurdens = useMemo(
    () => [...new Set(products.flatMap((p) => p.burdens_touched))].sort(),
    [products]
  );

  // ------------------------------------------------------------- inspectors

  function openProductInspector(p: AtlasProduct) {
    setInspector({
      eyebrow: p.brand || DOMAIN_LABEL[p.domain] || "Product",
      title: p.name,
      summary: [
        { label: "Domain", value: DOMAIN_LABEL[p.domain] ?? p.domain },
        { label: "Brand", value: p.brand || "Unknown" },
        { label: "Price", value: p.price_usd != null ? `$${p.price_usd}` : "Unknown" },
        { label: "Rating", value: p.average_rating != null ? `★${p.average_rating}` : "Unknown" },
        { label: "Reviews", value: p.n_real_reviews_in_corpus },
        { label: "Cluster", value: clusterLabel(p.cluster_type) },
        { label: "Evidence state", value: p.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">No linked evidence</Pill> },
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
              Nothing on this record is invented; an empty field means no matching evidence exists yet.
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

  function openClusterInspector(row: ClusterRollupRow) {
    setInspector({
      eyebrow: DOMAIN_LABEL[row.domain] ?? row.domain,
      title: row.label,
      summary: [
        { label: "Products", value: row.n_products },
        { label: "Total corpus reviews", value: row.total_reviews.toLocaleString() },
        { label: "Top need", value: row.top_need ? `${needLabel(row.top_need)} (${row.top_need_reviews.toLocaleString()} evidence reviews)` : "—" },
        { label: "Mechanisms observed", value: row.top_mechanisms.length },
      ],
      tabs: [
        { key: "mechanisms", label: "Mechanisms", content: <PillWrap values={row.top_mechanisms} tone="teal" /> },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              Client-side rollup over GET /api/product-atlas: Air rows group by the real cluster_type field;
              Floor Care has no cluster_type in the data, so it appears as one domain-level row.
              Every value is a straight sum/count over that group's real product records — nothing scored.
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

  function openConvergenceInspector(row: ConvergenceRow) {
    setInspector({
      eyebrow: "Need convergence",
      title: `${needLabel(row.need_a)} × ${needLabel(row.need_b)}`,
      summary: [
        { label: "Need A", value: needLabel(row.need_a) },
        { label: "Need B", value: needLabel(row.need_b) },
        { label: "Products sharing both", value: row.n_products },
        { label: "Evidence reviews", value: row.evidence_reviews.toLocaleString() },
      ],
      tabs: [
        {
          key: "mechanisms", label: "Mechanisms",
          content: <PillWrap values={row.shared_mechanisms} tone="teal" />,
        },
        {
          key: "products", label: "Products",
          content: (
            <div>
              {row.product_names.slice(0, 30).map((n, i) => (
                <div key={i} style={{ fontSize: 11.5, color: "var(--ink-dim)", padding: "3px 0", borderBottom: "1px solid var(--line)" }}>{n}</div>
              ))}
              {row.product_names.length > 30 && (
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>+{row.product_names.length - 30} more real products</div>
              )}
            </div>
          ),
        },
        {
          key: "trace", label: "Trace",
          content: (
            <TracePara>
              METHOD — deterministic set-intersection over GET /api/product-atlas: a pair (need A, need B)
              appears when at least one real product carries classified review evidence for both needs.
              Mechanisms = transformations observed on those products, ordered by frequency. Evidence reviews =
              sum of the two needs' real evidence counts on those products. No prediction or scoring is involved.
            </TracePara>
          ),
        },
      ],
    });
  }

  function openPossibilityInspector(p: Possibility) {
    setInspector({
      eyebrow: `${p.friction_theme_name} × ${p.operator}`,
      title: p.name,
      summary: [
        { label: "Friction theme", value: p.friction_theme_name },
        { label: "Operator", value: `${p.operator} — ${p.operator_definition}` },
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

  // ------------------------------------------------------------- columns

  const atlasColumns: Column<AtlasProduct>[] = useMemo(() => {
    const name: Column<AtlasProduct> = { key: "name", label: "Product", width: "240px", render: (p) => p.name, sortValue: (p) => p.name };
    const evidence: Column<AtlasProduct> = {
      key: "evidence", label: "Evidence", width: "120px",
      render: (p) => (p.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">Unlinked</Pill>),
      sortValue: (p) => p.evidence_state,
    };
    if (atlasLens === "overview") return [
      name,
      { key: "domain", label: "Domain", width: "80px", render: (p) => DOMAIN_LABEL[p.domain] ?? p.domain, sortValue: (p) => p.domain },
      { key: "primary_need", label: "Primary need", width: "170px", render: (p) => (p.needs_touched[0] ? needLabel(p.needs_touched[0].need) : "—"), sortValue: (p) => p.needs_touched[0]?.need },
      { key: "mechanisms", label: "Mechanisms", width: "190px", render: (p) => dotJoin(p.transformations_touched) },
      evidence,
    ];
    if (atlasLens === "human") return [
      name,
      { key: "needs", label: "Needs", width: "230px", render: (p) => topNeedsCell(p.needs_touched) },
      { key: "burdens", label: "Burdens", width: "190px", render: (p) => dotJoin(p.burdens_touched) },
      evidence,
    ];
    if (atlasLens === "market") return [
      name,
      { key: "brand", label: "Brand", width: "110px", render: (p) => p.brand || "—", sortValue: (p) => p.brand },
      { key: "price", label: "Price", width: "70px", align: "right", render: (p) => (p.price_usd != null ? `$${p.price_usd}` : "—"), sortValue: (p) => p.price_usd ?? undefined },
      { key: "rating", label: "Rating", width: "64px", align: "right", render: (p) => (p.average_rating != null ? `★${p.average_rating}` : "—"), sortValue: (p) => p.average_rating ?? undefined },
      { key: "reviews", label: "Reviews", width: "76px", align: "right", render: (p) => p.n_real_reviews_in_corpus, sortValue: (p) => p.n_real_reviews_in_corpus },
    ];
    // causal lens
    return [
      name,
      { key: "n_mech", label: "Mechanisms", width: "90px", align: "right", render: (p) => p.transformations_touched.length, sortValue: (p) => p.transformations_touched.length },
      { key: "n_sv", label: "State variables", width: "100px", align: "right", render: (p) => p.state_variables_touched.length, sortValue: (p) => p.state_variables_touched.length },
      { key: "n_themes", label: "Linked themes", width: "100px", align: "right", render: (p) => p.linked_themes.length, sortValue: (p) => p.linked_themes.length },
      evidence,
    ];
  }, [atlasLens]);

  const atlasGroupOptions: GroupOption<AtlasProduct>[] = useMemo(() => [
    { key: "domain", label: "Domain", groupValue: (p) => DOMAIN_LABEL[p.domain] ?? p.domain },
    { key: "brand", label: "Brand", groupValue: (p) => p.brand || "" },
    { key: "cluster", label: "Cluster", groupValue: (p) => clusterLabel(p.cluster_type) },
  ], []);

  const relColumns: Column<ProductRelationship>[] = useMemo(() => [
    { key: "a", label: "Product A", width: "220px", render: (r) => r.product_a_name, sortValue: (r) => r.product_a_name },
    { key: "b", label: "Product B", width: "220px", render: (r) => r.product_b_name, sortValue: (r) => r.product_b_name },
    { key: "type", label: "Relation", width: "140px", render: (r) => toSentence(r.relationship_type), sortValue: (r) => r.relationship_type },
    {
      key: "shared", label: "Shared", width: "240px",
      render: (r) => dotJoin([...r.shared_needs.map(needLabel), ...r.shared_transformations.map(toSentence)], (s) => s),
    },
    { key: "strength", label: "Strength", width: "72px", align: "right", render: (r) => r.overlap_strength, sortValue: (r) => r.overlap_strength },
  ], []);

  const clusterColumns: Column<ClusterRollupRow>[] = useMemo(() => [
    { key: "label", label: "Cluster", width: "200px", render: (c) => <span style={{ fontWeight: 600 }}>{c.label}</span>, sortValue: (c) => c.label },
    { key: "products", label: "Products", width: "76px", align: "right", render: (c) => c.n_products, sortValue: (c) => c.n_products },
    { key: "reviews", label: "Total reviews", width: "96px", align: "right", render: (c) => c.total_reviews.toLocaleString(), sortValue: (c) => c.total_reviews },
    {
      key: "top_need", label: "Top need", width: "200px",
      render: (c) => (c.top_need
        ? <span title={`${c.top_need_reviews} evidence reviews`}>{needLabel(c.top_need)}</span>
        : "—"),
      sortValue: (c) => c.top_need_reviews,
    },
    { key: "mechs", label: "Top mechanisms", width: "200px", render: (c) => dotJoin(c.top_mechanisms) },
  ], []);

  const matrixColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "240px", render: (p) => p.name, sortValue: (p) => p.name } as Column<AtlasProduct>,
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
    { key: "name", label: "Product", width: "260px", render: (p) => p.name, sortValue: (p) => p.name } as Column<AtlasProduct>,
    ...distinctBurdens.map((b): Column<AtlasProduct> => ({
      key: `burden:${b}`, label: toSentence(b), width: "84px", align: "center",
      render: (p) => (p.burdens_touched.includes(b) ? "✓" : "—"),
      sortValue: (p) => (p.burdens_touched.includes(b) ? 1 : 0),
    })),
  ], [distinctBurdens]);

  const causalColumns: Column<CausalRow>[] = useMemo(() => [
    { key: "name", label: "Concept", width: "210px", render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span>, sortValue: (r) => r.name },
    { key: "problem", label: "Problem", width: "240px", render: (r) => r.L2_proximal_problem },
    { key: "need", label: "Need", width: "160px", render: (r) => needLabel(r.primary_need), sortValue: (r) => r.primary_need },
    { key: "mechanism", label: "Mechanism", width: "170px", render: (r) => r.L0_mechanism, sortValue: (r) => r.L0_mechanism },
    { key: "freedom", label: "Freedom", width: "240px", render: (r) => r.L5_freedom_created },
  ], []);

  const rotationColumns = (kindLabel: string): Column<RotationRow>[] => [
    { key: "value", label: kindLabel, width: "170px", render: (r) => <span style={{ fontWeight: 600 }}>{toSentence(r.value)}</span>, sortValue: (r) => r.value },
    { key: "products", label: "Products", width: "76px", align: "right", render: (r) => r.n_products, sortValue: (r) => r.n_products },
    { key: "domains", label: "Domains", width: "120px", render: (r) => r.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" · "), sortValue: (r) => r.domains.join() },
    { key: "needs", label: "Top needs", width: "240px", render: (r) => dotJoin(r.top_needs.map((n) => n.need), needLabel) },
    { key: "evidence", label: "Evidence reviews", width: "110px", align: "right", render: (r) => r.evidence_reviews.toLocaleString(), sortValue: (r) => r.evidence_reviews },
  ];
  const primitiveColumns = useMemo(() => rotationColumns("Primitive"), []);
  const stateVarColumns = useMemo(() => rotationColumns("State variable"), []);

  const autonomyColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "260px", render: (p) => p.name, sortValue: (p) => p.name },
    { key: "brand", label: "Brand", width: "110px", render: (p) => p.brand || "—", sortValue: (p) => p.brand },
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

  const convergenceColumns: Column<ConvergenceRow>[] = useMemo(() => [
    { key: "a", label: "Need A", width: "180px", render: (r) => needLabel(r.need_a), sortValue: (r) => r.need_a },
    { key: "b", label: "Need B", width: "180px", render: (r) => needLabel(r.need_b), sortValue: (r) => r.need_b },
    { key: "products", label: "Products sharing both", width: "130px", align: "right", render: (r) => r.n_products, sortValue: (r) => r.n_products },
    { key: "mechs", label: "Shared mechanisms", width: "210px", render: (r) => dotJoin(r.shared_mechanisms) },
    { key: "evidence", label: "Evidence reviews", width: "110px", align: "right", render: (r) => r.evidence_reviews.toLocaleString(), sortValue: (r) => r.evidence_reviews },
  ], []);

  const possibilityColumns: Column<Possibility>[] = useMemo(() => [
    { key: "name", label: "Possibility", width: "230px", render: (p) => <span style={{ fontWeight: 600 }}>{p.name}</span>, sortValue: (p) => p.name },
    { key: "friction", label: "Friction", width: "180px", render: (p) => p.friction_theme_name, sortValue: (p) => p.friction_theme_name },
    { key: "operator", label: "Operator", width: "110px", render: (p) => <Pill tone="teal">{p.operator}</Pill>, sortValue: (p) => p.operator },
    {
      key: "gate", label: "Gate", width: "80px",
      render: (p) => (p.gate_passed ? <Pill tone="good">Passed</Pill> : <Pill tone="neutral">Not passed</Pill>),
      sortValue: (p) => (p.gate_passed ? 1 : 0),
    },
    { key: "test", label: "Next test", width: "280px", render: (p) => p.test?.text ?? "—" },
  ], []);

  const innovationColumns: Column<InnovationObject>[] = useMemo(() => [
    { key: "name", label: "Innovation", width: "230px", render: (o) => <span style={{ fontWeight: 600 }}>{o.name}</span>, sortValue: (o) => o.name },
    {
      key: "state", label: "State", width: "100px",
      render: (o) => <Pill tone={INNOVATION_STATE_TONE[o.state] ?? "neutral"}>{toSentence(o.state)}</Pill>,
      sortValue: (o) => o.state,
    },
    {
      key: "friction", label: "Friction", width: "150px",
      render: (o) => {
        const t = themeFromEvidenceIds(o.evidence_ids ?? []);
        return t ? <span title={`from evidence tag taxonomy:${t}`}>{toSentence(t)}</span> : "—";
      },
      sortValue: (o) => themeFromEvidenceIds(o.evidence_ids ?? []) ?? undefined,
    },
    {
      key: "gates", label: "Gates", width: "100px",
      render: (o) => {
        const dims = Object.entries(o.critic_dimensions ?? {});
        if (!dims.length) return "—";
        const survive = dims.filter(([, d]) => d.verdict === "SURVIVE").length;
        const tip = dims.map(([k, d]) => `${k}: ${d.verdict}`).join("\n");
        return <span className="mono" title={tip}>{survive}/{dims.length} survive</span>;
      },
      sortValue: (o) => Object.values(o.critic_dimensions ?? {}).filter((d) => d.verdict === "SURVIVE").length,
    },
    {
      key: "econ", label: "Exposure", width: "100px", align: "right",
      render: (o) => (o.economics?.price_weighted_exposure_usd != null ? `$${o.economics.price_weighted_exposure_usd.toLocaleString()}` : "—"),
      sortValue: (o) => o.economics?.price_weighted_exposure_usd ?? undefined,
    },
  ], []);

  const domainGroup: GroupOption<AtlasProduct>[] = useMemo(() => [
    { key: "domain", label: "Domain", groupValue: (p) => DOMAIN_LABEL[p.domain] ?? p.domain },
    { key: "brand", label: "Brand", groupValue: (p) => p.brand || "" },
  ], []);

  // Selection → Magic Box action bar, shared by the theme-bearing tables.
  function sendSelectionAction(theme: string | null, n: number, clearSelection: () => void) {
    return (
      <button
        disabled={!theme}
        onClick={() => { if (theme) { onSendToMagicBox(theme); clearSelection(); } }}
        title={theme ? `Filters Magic Box (Discover) to the ${theme} friction theme` : "No row in this selection carries a real friction theme"}
        style={theme ? ACTION_BTN_STYLE : ACTION_BTN_DISABLED_STYLE}
      >
        {theme ? `Send ${n} to Magic Box` : "No friction theme in selection"}
      </button>
    );
  }

  // ------------------------------------------------------------- render

  function loadingOrError(doc: unknown, source: string): ReactNode | null {
    if (doc === undefined) return <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading real data from {source}…</p>;
    if (doc === null) return <p style={{ fontSize: 12, color: "var(--rose)" }}>Could not load {source} — no fallback data is shown, because none would be real.</p>;
    return null;
  }

  function activeRowCount(): number | null {
    switch (tableKey) {
      case "product_atlas": return products.length;
      case "product_relationships": return relationships.length;
      case "portfolio_clusters": return clusterRollup.length;
      case "products_x_needs": return products.length;
      case "need_coverage": return coverageRows.length;
      case "human_burden": return products.length;
      case "causal_chain": return causalRows.length;
      case "causal_primitives": return primitiveRows.length;
      case "state_variables": return stateVarRows.length;
      case "capability_transfer": return relationships.filter((r) => r.relationship_type === "CAPABILITY_TRANSFER_CANDIDATE").length;
      case "autonomy": return airIntelRows.length;
      case "need_convergence": return convergenceRows.length;
      case "magic_possibilities": return possibilities.length;
      case "innovation_portfolio": return innovations.length;
      default: return null;
    }
  }

  function renderTable(): ReactNode {
    if (tableDef.empty) return <EmptySlot label={tableDef.label} reason={tableDef.empty} />;

    switch (tableKey) {
      case "product_atlas": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <DataTable
            key="product_atlas"
            rows={products}
            columns={atlasColumns}
            getRowId={(p) => p.id}
            onRowClick={openProductInspector}
            groupOptions={atlasGroupOptions}
            defaultGroupKey="domain"
            searchable
            searchValue={(p) => `${p.name} ${p.brand}`}
            selectable
            selectionActions={(sel, clear) => sendSelectionAction(dominantTheme(sel), sel.length, clear)}
            emptyMessage="No products match."
          />
        );
      }
      case "product_relationships": {
        const gate = loadingOrError(relDoc, "/api/product-relationships");
        if (gate) return gate;
        return (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              Top {relDoc!.count.toLocaleString()} of {relDoc!.n_total_candidates_before_cap.toLocaleString()} real
              pairwise relationships by overlap strength{relDoc!.capped ? " (capped)" : ""}.
            </p>
            <DataTable
              key="product_relationships"
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
      case "portfolio_clusters": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <DataTable
            key="portfolio_clusters"
            rows={clusterRollup}
            columns={clusterColumns}
            getRowId={(c) => c.id}
            onRowClick={openClusterInspector}
            defaultSortKey="reviews"
            defaultSortDir="desc"
            emptyMessage="No clusters."
          />
        );
      }
      case "products_x_needs": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              Top {topNeedKeys.length} of {distinctNeeds.length} needs by total real evidence — each cell is the real
              count of this product's reviews classified into that need, "—" where none exist.
            </p>
            <DataTable
              key="products_x_needs"
              rows={products}
              columns={matrixColumns}
              getRowId={(p) => p.id}
              onRowClick={openProductInspector}
              groupOptions={domainGroup}
              defaultGroupKey="domain"
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No products."
            />
          </>
        );
      }
      case "need_coverage": {
        const gate = loadingOrError(coverageDoc, "/api/need-coverage");
        if (gate) return gate;
        return (
          <DataTable
            key="need_coverage"
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
      case "human_burden": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              The {distinctBurdens.length} real burden dimensions in the pipeline. ✓ = this product's classified review
              evidence touches that burden; a row of "—" means no linked evidence, not zero burden.
            </p>
            <DataTable
              key="human_burden"
              rows={products}
              columns={burdenColumns}
              getRowId={(p) => p.id}
              onRowClick={openProductInspector}
              groupOptions={domainGroup}
              defaultGroupKey="domain"
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No products."
            />
          </>
        );
      }
      case "causal_chain": {
        const gate = loadingOrError(causalDoc, "/api/causal-atlas");
        if (gate) return gate;
        return (
          <DataTable
            key="causal_chain"
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
      case "causal_primitives": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <DataTable
            key="causal_primitives"
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
      case "state_variables": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <DataTable
            key="state_variables"
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
      case "capability_transfer": {
        const gate = loadingOrError(relDoc, "/api/product-relationships");
        if (gate) return gate;
        const transfers = relationships.filter((r) => r.relationship_type === "CAPABILITY_TRANSFER_CANDIDATE");
        if (!transfers.length) {
          return (
            <EmptySlot
              label="12 Capability transfer"
              reason={`The relationship pipeline defines CAPABILITY_TRANSFER_CANDIDATE, but none appear in the top ${relDoc!.count.toLocaleString()} pairs served by /api/product-relationships (ranked by overlap strength, ${relDoc!.n_total_candidates_before_cap.toLocaleString()} candidates before the cap). Showing other relation types here would misrepresent them; this slot stays empty until transfer candidates surface in the served window.`}
            />
          );
        }
        return (
          <DataTable
            key="capability_transfer"
            rows={transfers}
            columns={relColumns}
            getRowId={(r) => `${r.product_a_id}::${r.product_b_id}`}
            onRowClick={openRelationshipInspector}
            searchable
            searchValue={(r) => `${r.product_a_name} ${r.product_b_name}`}
            defaultSortKey="strength"
            defaultSortDir="desc"
            emptyMessage="No transfer candidates."
          />
        );
      }
      case "autonomy": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              Honest proxy, clearly labelled: the real cluster_intelligence field classifies Air products by sensing
              intelligence (manual → reactive → connected → adaptive). It is NOT an autonomy measurement — no autonomy
              dataset exists in this pipeline. Floor Care products carry no value for this field and are not shown.
            </p>
            <DataTable
              key="autonomy"
              rows={airIntelRows}
              columns={autonomyColumns}
              getRowId={(p) => p.id}
              onRowClick={openProductInspector}
              groupOptions={[{ key: "intel", label: "Intelligence class", groupValue: (p) => toSentence(p.cluster_intelligence ?? "") }]}
              defaultGroupKey="intel"
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No Air products with an intelligence class."
            />
          </>
        );
      }
      case "need_convergence": {
        const gate = loadingOrError(atlasDoc, "/api/product-atlas");
        if (gate) return gate;
        return (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              Deterministic set-intersection: need pairs that co-occur on the same real products, with the mechanisms
              those products share. Method is spelled out in each row's Trace tab.
            </p>
            <DataTable
              key="need_convergence"
              rows={convergenceRows}
              columns={convergenceColumns}
              getRowId={(r) => r.id}
              onRowClick={openConvergenceInspector}
              defaultSortKey="products"
              defaultSortDir="desc"
              emptyMessage="No need pairs co-occur on any product."
            />
          </>
        );
      }
      case "trends_x_products": {
        const gate = loadingOrError(trendsDoc, "/api/trends");
        if (gate) return gate;
        const n = trendsDoc!.articles?.length ?? trendsDoc!.article_count ?? 0;
        return (
          <EmptySlot
            label="17 Trends × products"
            reason={`The trend corpus holds ${n} real archived documents, but their theme tags are the corpus's own vocabulary (regulation, iaq_standards, …) with no per-document link to friction themes or products. Joining them would be fabrication; this slot stays empty until a real trend→friction link is added to the pipeline.`}
          />
        );
      }
      case "magic_possibilities": {
        const gate = loadingOrError(magicDoc, "/api/magic-box");
        if (gate) return gate;
        return (
          <DataTable
            key="magic_possibilities"
            rows={possibilities}
            columns={possibilityColumns}
            getRowId={(p) => p.id}
            onRowClick={openPossibilityInspector}
            groupOptions={[{ key: "friction", label: "Friction theme", groupValue: (p) => p.friction_theme_name }]}
            selectable
            selectionActions={(sel, clear) => sendSelectionAction(mostFrequentTheme(sel.map((p) => p.friction_theme)), sel.length, clear)}
            defaultSortKey="gate"
            defaultSortDir="desc"
            emptyMessage="No possibilities."
          />
        );
      }
      case "innovation_portfolio": {
        const gate = loadingOrError(innovDoc, "/api/innovation-objects");
        if (gate) return gate;
        return (
          <DataTable
            key="innovation_portfolio"
            rows={innovations}
            columns={innovationColumns}
            getRowId={(o) => o.innovation_id ?? o.name}
            onRowClick={openInnovationInspector}
            groupOptions={[{ key: "state", label: "State", groupValue: (o) => toSentence(o.state) }]}
            defaultSortKey="econ"
            defaultSortDir="desc"
            emptyMessage="No innovation objects."
          />
        );
      }
      default:
        return null;
    }
  }

  const rowCount = tableDef.empty ? null : activeRowCount();

  return (
    <div data-testid="smart-tables">
      {/* Compact header — one control row, no hero */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <select value={clusterKey} onChange={(e) => selectCluster(e.target.value)} style={SELECT_STYLE} aria-label="Table cluster">
          {REGISTRY.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={tableKey} onChange={(e) => setTableKey(e.target.value as TableKey)} style={SELECT_STYLE} aria-label="Table">
          {cluster.tables.map((t) => (
            <option key={t.key} value={t.key}>{t.label}{t.empty ? " (no dataset)" : ""}</option>
          ))}
        </select>
        {tableKey === "product_atlas" && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
            {ATLAS_LENSES.map((l) => (
              <button key={l.key} onClick={() => setAtlasLens(l.key)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
                  background: atlasLens === l.key ? "var(--surface)" : "transparent",
                  fontWeight: atlasLens === l.key ? 700 : 500,
                  color: atlasLens === l.key ? "var(--ink)" : "var(--ink-faint)",
                  boxShadow: atlasLens === l.key ? "var(--shadow)" : "none" }}>
                {l.label}
              </button>
            ))}
          </div>
        )}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)" }}>
          {rowCount != null ? `${rowCount.toLocaleString()} rows` : "no dataset"}
        </span>
      </div>

      {renderTable()}

      <FocusPanel open={!!inspector} onClose={() => setInspector(null)} eyebrow={inspector?.eyebrow} title={inspector?.title ?? ""}>
        {inspector && <CompactInspector summary={inspector.summary} tabs={inspector.tabs} />}
      </FocusPanel>
    </div>
  );
}
