import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  Pill, SectionLabel, StatRow, DistilledRawToggle, CounterfactualPrompt,
  CompactInspector, CompactRow, TruthBadge, type ViewMode,
} from "../components/ui";
import { DataTable, type Column, type GroupOption } from "../components/DataTable";
import { FocusPanel } from "../components/FocusPanel";
import { OPERATOR_TAGLINE, type OperatorId } from "../components/OperatorIcon";
import { traceConceptChain } from "../lib/trace";
import { TraceTree, TraceLegend } from "../components/TraceTree";
import { TraceText } from "../components/TraceText";
import type { DesignDna } from "../lib/types";
import { getParam, useUrlParam } from "../lib/urlState";

interface Criterion {
  id: string; category: string; name: string; question: string; why_it_matters: string;
  how_tested: string; pass_condition: string; challenge_condition: string; kill_condition: string;
}
interface CriticDimension { verdict: string; reasoning: string }
interface WhyHere { reality: string; transformation: string; product_consequence: string; consequence_basis: string }
interface TestSpec { type: string; derivation: string; text: string; derived_from: string[] }
interface Concept {
  id: string; name: string; friction_theme: string; friction_theme_name: string;
  operator: string; operator_definition: string; consumer_pain_csat: number; consumer_pain_prevalence_pct: number;
  consumer_pain_methodology: { method: string; n_reviews: number; n_distinct_products: number; review_date_range: [string, string] | null; pct_verified_purchase: number | null; source: string };
  gate_passed: boolean; economic_value: number; typical_market_price_usd: number | null; typical_market_price_n_products: number;
  feasibility_2_5y: { rating: string; rank: number; evidence_ids?: string[]; rationale?: string };
  is_white_space: boolean; competitor_gap_brands: string[]; evidence_ids: string[]; truth_class: string;
  design_dna: DesignDna; is_finalist: boolean; is_non_dominated: boolean;
  evolution_stage: string | null; critic_overall: string | null; critic_dimensions: Record<string, CriticDimension> | null;
  criteria: Record<string, { status: string; note: string }>;
  // Present in the real possibility objects (data/processed/magic_box_real.json)
  // but not part of the narrower critic-merged Concept shape above — kept
  // optional/typed here rather than sprinkling `as any` through the JSX.
  donor_state?: string | null;
  donor_capability_ids?: string[];
  source_evidence_ids?: string[];
  parent_path_ids?: string[];
  friction_ids?: string[];
  operator_origin?: string;
  why_here?: WhyHere;
  product_archetype?: Record<string, string>;
  engineering_envelope?: Record<string, any>;
  test?: TestSpec;
  unknowns?: string[];
  assumption_challenged?: { ids: string[]; note: string };
  comparable_market_median_n_products?: number;
}
interface Assumption {
  assumption_id: string; text: string; status: string; evidence_for_prevalence: string;
  real_evidence_that_bears_on_it: string[]; evidence_note: string; counterfactual: string;
}
interface Graveyard { id: string; name: string; killed_by: string; kill_reason_class: string; why_not_selected: string }
interface FunnelStage { stage: string; label: string; count: number }
interface CriteriaDoc {
  criteria_library: Criterion[];
  funnel: Record<string, number | string>;
  magic_box_funnel: FunnelStage[];
  assumptions: Assumption[];
  concepts: Concept[];
  graveyard: Graveyard[];
  why_did_this_win: {
    bet: string; decision_type: string; why: string; final_three_dimensions: string[];
    most_sensitive_assumption: string; first_experiment: string; kill_criterion: string;
    versuni_edge_classification: string; versuni_edge_note: string;
    what_competitors_cannot_easily_replicate: string;
  };
}

const STATUS_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  PASS: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", KILL: "rose", "N/A": "neutral",
};
const VERDICT_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  SURVIVE: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", REJECT: "rose",
};
const DNA_LETTER_NAME: Record<string, string> = {
  F: "Friction", S: "Signal", T: "Tension", R: "Competitor gap",
  C: "Versuni capability", A: "Assumption", E: "Economic condition", O: "Design operator",
};
const DNA_ORDER = ["F", "S", "T", "R", "C", "A", "E", "O"] as const;

// Evolution stage — the machine's own evidence-driven stage classification,
// never a card-layout invention. See src/real/critic_real.py::evolution_stage().
const STAGE_TONE: Record<string, "good" | "amber" | "neutral" | "rose" | "blue"> = {
  STRONG_SURVIVOR: "good", SURVIVOR: "blue", CHALLENGED: "amber", SEED: "neutral", REJECTED: "rose",
};
const STAGE_RANK: Record<string, number> = {
  REJECTED: -1, SEED: 0, CHALLENGED: 1, SURVIVOR: 2, STRONG_SURVIVOR: 3,
};

const FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: "sources_admitted", label: "Sources" },
  { key: "signals_total", label: "Signals" },
  { key: "tensions", label: "Tension" },
  { key: "assumptions", label: "Assumption" },
  { key: "counterfactuals_generated", label: "Counterfactuals" },
  { key: "concept_seeds", label: "Concepts" },
  { key: "__versuni_edge", label: "Versuni edge" },
  { key: "critic_evaluated", label: "Critic" },
  { key: "finalists", label: "Priority to test" },
  { key: "__bet", label: "BET" },
];

// Sentence-case any UNDERSCORE_ENUM or ALL-CAPS label — "STRONG_SURVIVOR" ->
// "Strong survivor", "PREDICT" -> "Predict". Never renders raw shouting text.
function sentenceCase(raw: string | null | undefined): string {
  if (!raw) return "—";
  const spaced = raw.toLowerCase().replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function operatorLabel(op: string): string {
  return sentenceCase(op);
}

function stageLabel(stage: string | null | undefined): string {
  return stage ? sentenceCase(stage) : "—";
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

function DnaBadgeRow({ dna, compact }: { dna: DesignDna; compact?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {DNA_ORDER.map((letter) => {
        const p = dna[letter as keyof DesignDna];
        const present = p.status === "PRESENT";
        const method = p.status === "METHOD_CHOICE";
        return (
          <span key={letter} title={`${DNA_LETTER_NAME[letter]}: ${method ? "method choice (authored, not evidence)" : present ? "present" : "missing / unverified"} — ${p.detail}`}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: compact ? 20 : 24, height: compact ? 20 : 24, borderRadius: 6,
              fontSize: compact ? 10 : 11, fontFamily: "var(--font-mono)", fontWeight: 700,
              color: method ? "var(--accent-blue-ink)" : present ? "var(--good)" : "var(--ink-faint)",
              background: method ? "rgba(58,110,165,0.10)" : present ? "rgba(47,143,91,0.12)" : "var(--surface-2)",
              border: method ? "1px dashed var(--accent-blue)" : `1px solid ${present ? "var(--good)" : "var(--line)"}`,
              opacity: present || method ? 1 : 0.6,
            }}>
            {letter}
          </span>
        );
      })}
    </div>
  );
}

// Table-first: the shared DataTable engine renders every possibility as a
// row, sortable/groupable/searchable for free. Columns and groups are module
// -level so they aren't recreated every render.
const CONCEPT_COLUMNS: Column<Concept>[] = [
  {
    key: "name", label: "Possibility", width: "220px",
    render: (p) => p.name,
    sortValue: (p) => p.name,
  },
  {
    key: "friction_theme_name", label: "Friction theme", width: "170px",
    render: (p) => p.friction_theme_name,
    sortValue: (p) => p.friction_theme_name,
  },
  {
    key: "operator", label: "Operator", width: "150px",
    render: (p) => operatorLabel(p.operator),
    sortValue: (p) => p.operator,
  },
  {
    key: "donor", label: "Donor domain", width: "150px",
    // Real data check: donor_capability_ids is empty for every possibility
    // in this pipeline (no verified donor-capability dataset exists), and
    // donor_state is only ever a fixed "no verified donor" disclosure for
    // CROSS_CATEGORY_TRANSFER operator possibilities — never an actual
    // donor-domain name. Rendering an invented donor domain would fabricate
    // data, so this column can only ever say "hypothesis" or "—".
    render: (p) => (p.donor_state ? <Pill tone="amber">Hypothesis — no donor</Pill> : "—"),
    sortValue: (p) => (p.donor_state ? 1 : 0),
  },
  {
    key: "economic_value", label: "Economic value", width: "130px", align: "right",
    render: (p) => formatCurrency(p.economic_value),
    sortValue: (p) => p.economic_value,
  },
  {
    key: "feasibility", label: "Feasibility", width: "110px",
    render: (p) => sentenceCase(p.feasibility_2_5y?.rating),
    sortValue: (p) => p.feasibility_2_5y?.rank ?? null,
  },
  {
    key: "gate", label: "Gate", width: "80px",
    render: (p) => <Pill tone={p.gate_passed ? "good" : "rose"}>{p.gate_passed ? "Pass" : "Fail"}</Pill>,
    sortValue: (p) => (p.gate_passed ? 1 : 0),
  },
  {
    key: "evidence", label: "Evidence", width: "110px",
    render: (p) => `${p.evidence_ids.length} source${p.evidence_ids.length === 1 ? "" : "s"}`,
    sortValue: (p) => p.evidence_ids.length,
  },
  {
    key: "stage", label: "Stage", width: "140px",
    render: (p) => <Pill tone={STAGE_TONE[p.evolution_stage ?? ""] ?? "neutral"}>{stageLabel(p.evolution_stage)}</Pill>,
    sortValue: (p) => STAGE_RANK[p.evolution_stage ?? ""] ?? -2,
  },
];

const CONCEPT_GROUP_OPTIONS: GroupOption<Concept>[] = [
  { key: "friction_theme_name", label: "Friction theme", groupValue: (p) => p.friction_theme_name },
  { key: "operator", label: "Operator", groupValue: (p) => operatorLabel(p.operator) },
  { key: "stage", label: "Stage", groupValue: (p) => stageLabel(p.evolution_stage) },
];

export function MagicBoxWorld({ themeFilter, onGoToWorld }: { themeFilter?: string | null; onGoToWorld?: (n: number, params?: Record<string, string>) => void }) {
  const [data, setData] = useState<CriteriaDoc | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [conceptFocus, setConceptFocus] = useState<Concept | null>(null);
  const [assumptionFocus, setAssumptionFocus] = useState<Assumption | null>(null);
  const [winFocus, setWinFocus] = useState(false);
  const [stageFocus, setStageFocus] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [conceptTraceFocus, setConceptTraceFocus] = useState<Concept | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [tensions, setTensions] = useState<any[]>([]);

  // Deep links: /magic-box?theme=<friction theme> filters exactly like
  // arriving from the Radar's "Send to Magic Box"; ?possibility=<id> opens
  // that concept once the corpus loads.
  const [urlTheme] = useState<string | null>(() => getParam("theme"));
  useEffect(() => {
    api.criteria().then((d) => {
      setData(d);
      const id = getParam("possibility");
      const c = id ? d.concepts?.find((x: Concept) => x.id === id) : null;
      if (c) setConceptFocus(c);
    }).catch(() => setData(null));
  }, []);
  useUrlParam("possibility", conceptFocus?.id ?? null);
  useEffect(() => { api.signals().then((r) => setSignals(r.signals)).catch(() => {}); }, []);
  useEffect(() => { api.research().then(setResearch).catch(() => {}); }, []);
  useEffect(() => { api.researchTensions().then((r) => setTensions(r.tensions ?? [])).catch(() => {}); }, []);

  const effectiveTheme = themeFilter ?? urlTheme;
  const conceptsFiltered = useMemo(() => {
    const all = data?.concepts ?? [];
    if (!effectiveTheme) return all;
    const filtered = all.filter((p) => p.friction_theme === effectiveTheme);
    return filtered.length ? filtered : all;
  }, [data, effectiveTheme]);
  const finalists = useMemo(() => (data?.concepts ?? []).filter((p) => p.is_finalist), [data]);

  const conceptsTable = (
    <DataTable<Concept>
      rows={conceptsFiltered}
      columns={CONCEPT_COLUMNS}
      getRowId={(p) => p.id}
      onRowClick={(p) => setConceptFocus(p)}
      groupOptions={CONCEPT_GROUP_OPTIONS}
      searchable
      searchValue={(p) => `${p.name} ${p.friction_theme_name}`}
      defaultSortKey="economic_value"
      defaultSortDir="desc"
      emptyMessage="No possibilities match the current filters."
    />
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            4 · Magic box — what could exist now?
          </div>
          <h1 style={{ fontSize: 24 }}>Magic box</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>Real frictions × a declared design method — every row opens with why it exists and its full lineage.</div>
          {effectiveTheme && (
            <div style={{ fontSize: 11.5, color: "var(--accent-teal)", marginTop: 6 }}>
              Filtered from Competitors' white space → theme: <span className="mono">{effectiveTheme}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {onGoToWorld && (
            <button onClick={() => onGoToWorld(8)}
              title="The criteria every concept here is tested against — the machine's governance layer"
              style={{ fontSize: 11.5, padding: "7px 12px", borderRadius: 8, border: "1px dashed var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", whiteSpace: "nowrap" }}>
              ⚖ How concepts are judged →
            </button>
          )}
          <DistilledRawToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real Magic Box state…</div>}
      {data && (
        <div className="scrollY" style={{ flex: 1 }}>
          {/* Possibilities table - the actual innovations, shown first, one row each */}
          {mode === "distilled" ? (
            <>
              <SectionLabel>{conceptsFiltered.length} concepts — {finalists.length} currently priority to test · click a row for the full evidence trail</SectionLabel>
              <div style={{ marginBottom: 8 }}>{conceptsTable}</div>
              <CounterfactualPrompt>What if the winning idea isn't the most powerful one, but the one competitors are least able to copy?</CounterfactualPrompt>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <SectionLabel>{showRejected ? "Not selected — why" : `Concepts — deterministic operator × friction combinations (${conceptsFiltered.length})`}</SectionLabel>
                <button onClick={() => setShowRejected((v) => !v)}
                  style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer" }}>
                  {showRejected ? "← View concepts" : `View rejected (${data.graveyard.length})`}
                </button>
              </div>
              {!showRejected ? (
                <div style={{ marginBottom: 20 }}>{conceptsTable}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {data.graveyard.map((g) => (
                    <div key={g.id} onClick={() => { const p = data.concepts.find((x) => x.id === g.id); if (p) setConceptFocus(p); }} role="button" tabIndex={0}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{g.why_not_selected}</div>
                      </div>
                      <Pill tone="rose">{g.kill_reason_class}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Why did this win */}
          <button onClick={() => setWinFocus(true)}
            style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 18, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--accent-blue)", borderRadius: 12 }}>
            <SectionLabel>Current bet — why did this win?</SectionLabel>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{data.why_did_this_win.bet}</div>
          </button>

          {mode === "distilled" && (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Assumptions this challenges — click to break one</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.assumptions.map((a) => (
                  <button key={a.assumption_id} onClick={() => setAssumptionFocus(a)}
                    style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-dim)" }}>
                    {a.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* How the machine got here - process detail, secondary to the concepts above */}
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--ink-faint)", letterSpacing: "0.02em" }}>How the machine got here</summary>
            <div style={{ display: "flex", gap: 6, marginTop: 10, marginBottom: 14, flexShrink: 0 }}>
              {data.magic_box_funnel.map((f, i) => (
                <div key={f.stage} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{f.count}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</div>
                  </div>
                  {i < data.magic_box_funnel.length - 1 && <div style={{ color: "var(--ink-faint)", padding: "0 4px", fontSize: 14 }}>→</div>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {FUNNEL_STAGES.map((s, i) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                  <button onClick={() => setStageFocus(s.key)}
                    style={{ textAlign: "left", cursor: "pointer", border: s.key === "__versuni_edge" ? "1px dashed var(--line)" : "1px solid var(--line)", background: "var(--surface)", borderRadius: 10, padding: "8px 12px", minWidth: 84 }}>
                    <div className="mono" style={{ fontSize: s.key === "__bet" ? 11 : 18, fontWeight: 700, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: s.key === "__versuni_edge" ? "var(--ink-faint)" : "var(--ink)" }}>
                      {s.key === "__versuni_edge" ? "N/A" : s.key === "__bet" ? data.funnel.bet : data.funnel[s.key]}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>{s.label}</div>
                  </button>
                  {i < FUNNEL_STAGES.length - 1 && <span style={{ color: "var(--ink-faint)", padding: "0 3px" }}>→</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Concept FocusPanel — CompactInspector: summary grid + tabs, replacing
          the old one-giant-card prose panel. */}
      <FocusPanel open={!!conceptFocus} onClose={() => setConceptFocus(null)} eyebrow={conceptFocus ? `${conceptFocus.friction_theme_name} × ${operatorLabel(conceptFocus.operator)}` : ""} title={conceptFocus?.name ?? ""}>
        {conceptFocus && (
          <div data-testid="concept-detail">
            <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: 12 }}>
              Generated by an analyst-designed deterministic rule (theme × operator), authored for air
              purification — a labelled method choice, not a category-general generator.
              {conceptFocus.donor_state && (
                <span style={{ color: "var(--amber)" }}> Donor capability: missing — the transfer is a hypothesis until a verified donor exists.</span>
              )}
            </p>

            <CompactInspector
              summary={[
                { label: "Friction theme", value: conceptFocus.friction_theme_name },
                { label: "Operator", value: <span title={OPERATOR_TAGLINE[conceptFocus.operator as OperatorId] ?? conceptFocus.operator_definition}>{operatorLabel(conceptFocus.operator)}</span> },
                { label: "Economic value", value: formatCurrency(conceptFocus.economic_value) },
                { label: "Feasibility", value: `${sentenceCase(conceptFocus.feasibility_2_5y?.rating)} (rank ${conceptFocus.feasibility_2_5y?.rank ?? "—"})` },
                { label: "Gate", value: <Pill tone={conceptFocus.gate_passed ? "good" : "rose"}>{conceptFocus.gate_passed ? "Pass" : "Fail"}</Pill> },
                { label: "Stage", value: <Pill tone={STAGE_TONE[conceptFocus.evolution_stage ?? ""] ?? "neutral"}>{stageLabel(conceptFocus.evolution_stage)}</Pill> },
                { label: "Evidence sources", value: `${conceptFocus.evidence_ids.length} source${conceptFocus.evidence_ids.length === 1 ? "" : "s"}` },
                { label: "Truth class", value: <TruthBadge truthClass={conceptFocus.truth_class} /> },
              ]}
              tabs={[
                {
                  key: "why-here", label: "Why here",
                  content: (
                    <div data-testid="why-here">
                      <CompactRow label="Reality" value={conceptFocus.why_here?.reality ?? "—"} title={conceptFocus.why_here?.reality} />
                      <CompactRow label="Transformation" value={conceptFocus.why_here?.transformation ?? "—"} title={conceptFocus.why_here?.transformation} />
                      <CompactRow label="Consequence" value={conceptFocus.why_here?.product_consequence ?? "—"} title={conceptFocus.why_here?.product_consequence} />
                      <CompactRow label="Consequence basis" value={conceptFocus.why_here?.consequence_basis ?? "—"} />
                      <CompactRow label="Rating gap" value={conceptFocus.consumer_pain_csat != null ? `${conceptFocus.consumer_pain_csat}★` : "unknown — evidence gap"} />
                      <CompactRow label="Reviews affected" value={`${conceptFocus.consumer_pain_prevalence_pct}% of reviews`} />
                      {conceptFocus.consumer_pain_methodology && (
                        <CompactRow
                          label="Methodology"
                          value={`${conceptFocus.consumer_pain_methodology.n_reviews} reviews, ${conceptFocus.consumer_pain_methodology.n_distinct_products} products, ${conceptFocus.consumer_pain_methodology.pct_verified_purchase}% verified`}
                          title={conceptFocus.consumer_pain_methodology.method}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: "physical", label: "Physical",
                  content: (
                    <div data-testid="physical">
                      {conceptFocus.product_archetype && (
                        <>
                          <SectionLabel>Product archetype — design-rule derived, never invented</SectionLabel>
                          {Object.entries(conceptFocus.product_archetype)
                            .filter(([k]) => k !== "epistemic_type")
                            .map(([k, v]) => (
                              <CompactRow key={k} label={k.replace(/_/g, " ")} value={v.startsWith("UNKNOWN") ? "—" : v} title={v} />
                            ))}
                        </>
                      )}
                      {conceptFocus.engineering_envelope && (
                        <>
                          <SectionLabel>Engineering envelope — comparables only, never invented</SectionLabel>
                          {conceptFocus.engineering_envelope.comparable_basis && (
                            <CompactRow label="Comparable basis" value={conceptFocus.engineering_envelope.comparable_basis} />
                          )}
                          {Object.entries(conceptFocus.engineering_envelope).map(([k, v]: [string, any]) => {
                            if (typeof v === "string") return null;
                            if (!v || typeof v !== "object") return null;
                            const label = k.replace(/_/g, " ");
                            if (v.epistemic_type === "OBSERVED_COMPARABLE")
                              return <CompactRow key={k} label={label} value={`${v.min}–${v.max} ${v.unit} (n=${v.n_comparables})`} />;
                            if (v.epistemic_type === "REFERENCE_MARKET_PRICE")
                              return <CompactRow key={k} label={label} value={`median $${v.median} (${v.n_comparables} products)`} />;
                            return <CompactRow key={k} label={label} value="unknown — no comparable publishes this" />;
                          })}
                        </>
                      )}
                    </div>
                  ),
                },
                {
                  key: "evidence", label: "Evidence",
                  content: (
                    <div data-testid="lineage">
                      <SectionLabel>Design DNA — genuine parent lineage only</SectionLabel>
                      <DnaBadgeRow dna={conceptFocus.design_dna} compact />
                      <div style={{ marginTop: 8, marginBottom: 14 }}>
                        {DNA_ORDER.map((letter) => {
                          const p = conceptFocus.design_dna[letter as keyof DesignDna];
                          const present = p.status === "PRESENT";
                          const method = p.status === "METHOD_CHOICE";
                          const detail = method ? `Method choice — ${p.detail}` : present ? p.detail : `Missing / unverified — ${p.detail}`;
                          return <CompactRow key={letter} label={DNA_LETTER_NAME[letter]} value={detail} title={detail} />;
                        })}
                      </div>

                      <SectionLabel>Lineage — every parent, clickable</SectionLabel>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {(conceptFocus.parent_path_ids ?? []).map((pid) => (
                          <button key={pid} onClick={() => onGoToWorld?.(3, { path: pid })} className="mono"
                            style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", color: "var(--ink-dim)" }}>
                            {pid} →
                          </button>
                        ))}
                        {(conceptFocus.source_evidence_ids ?? []).map((rid) => (
                          <button key={rid} onClick={() => rid.startsWith("RP-") && onGoToWorld?.(2, { paper: rid })} className="mono"
                            style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: rid.startsWith("RP-") ? "pointer" : "default", color: "var(--accent-blue-ink)" }}>
                            {rid}{rid.startsWith("RP-") ? " →" : ""}
                          </button>
                        ))}
                        {(conceptFocus.friction_ids ?? []).map((fid) => <Pill key={fid}>{fid}</Pill>)}
                      </div>
                      <CompactRow label="Evidence ids" value={conceptFocus.evidence_ids.join(", ") || "none"} />
                      <CompactRow label="Donor capabilities" value={(conceptFocus.donor_capability_ids ?? []).join(", ") || "none — no verified donor dataset"} />
                      {conceptFocus.operator_origin && <CompactRow label="Operator origin" value={conceptFocus.operator_origin} title={conceptFocus.operator_origin} />}

                      <button onClick={() => setConceptTraceFocus(conceptFocus)}
                        style={{ marginTop: 12, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                        Trace this concept →
                      </button>
                    </div>
                  ),
                },
                {
                  key: "decision", label: "Decision",
                  content: (
                    <div data-testid="decision">
                      {(() => {
                        const grave = data?.graveyard.find((g) => g.id === conceptFocus.id);
                        return grave ? (
                          <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(166,67,63,0.08)", border: "1px solid rgba(166,67,63,0.25)", borderRadius: 8 }}>
                            <SectionLabel>Why this wasn't selected</SectionLabel>
                            <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.5 }}>{grave.why_not_selected}</p>
                          </div>
                        ) : null;
                      })()}
                      <CompactRow label="Gate passed" value={conceptFocus.gate_passed ? "Yes — real pain evidence" : "No"} />
                      <CompactRow label="White space" value={conceptFocus.is_white_space ? "Yes — competitor gap" : "No"} />
                      <CompactRow label="Competitor gap brands" value={conceptFocus.competitor_gap_brands.join(", ") || "none identified"} title={conceptFocus.competitor_gap_brands.join(", ")} />
                      <CompactRow
                        label="Assumption challenged"
                        value={conceptFocus.assumption_challenged?.ids?.length ? conceptFocus.assumption_challenged.ids.join(", ") : (conceptFocus.assumption_challenged?.note ?? "—")}
                      />
                      {conceptFocus.test && <CompactRow label="Test" value={conceptFocus.test.text} title={conceptFocus.test.text} />}
                      <CompactRow label="Unknowns" value={(conceptFocus.unknowns?.length ? conceptFocus.unknowns.join("; ") : "—")} title={conceptFocus.unknowns?.join("; ")} />

                      {conceptFocus.critic_dimensions && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                          <SectionLabel>Critic — overall: {sentenceCase(conceptFocus.critic_overall)}</SectionLabel>
                          {Object.entries(conceptFocus.critic_dimensions).map(([dim, d]) => (
                            <CompactRow key={dim} label={sentenceCase(dim)}
                              value={<><Pill tone={VERDICT_TONE[d.verdict] ?? "neutral"}>{sentenceCase(d.verdict)}</Pill> {d.reasoning}</>}
                              title={d.reasoning} />
                          ))}
                        </div>
                      )}

                      <details style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                        <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>
                          Every criterion this concept was tested against ({Object.keys(conceptFocus.criteria).length})
                        </summary>
                        <div style={{ marginTop: 10 }}>
                          {Object.entries(conceptFocus.criteria).map(([cid, r]) => (
                            <CompactRow key={cid} label={cid}
                              value={<><Pill tone={STATUS_TONE[r.status]}>{sentenceCase(r.status)}</Pill> {r.note}</>}
                              title={r.note} />
                          ))}
                        </div>
                      </details>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </FocusPanel>

      <FocusPanel open={!!conceptTraceFocus} onClose={() => setConceptTraceFocus(null)} eyebrow="Trace this concept — signal, tension, and assumption down to their real papers" title={conceptTraceFocus?.name ?? ""}>
        {conceptTraceFocus && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Every edge below is a genuine cross-reference already present in the real data — nothing invented to
              make this look connected. Where the design DNA slot is real but not itself a citable document
              (economics, Versuni capability, competitor gap, operator), it is shown as such rather than forced
              into a fake link.
            </p>
            <TraceLegend />
            <TraceTree nodes={[traceConceptChain(conceptTraceFocus, { signals, research, tensions, assumptions: data?.assumptions ?? [] })]} />
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!assumptionFocus} onClose={() => setAssumptionFocus(null)} eyebrow={`Category assumption · ${assumptionFocus?.status}`} title={assumptionFocus?.text ?? ""}>
        {assumptionFocus && (
          <>
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>How entrenched is this, really?</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>{assumptionFocus.evidence_for_prevalence}</p>
            </div>
            <div style={{ marginBottom: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>What real evidence bears on it</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>{assumptionFocus.evidence_note}</p>
              {assumptionFocus.real_evidence_that_bears_on_it.length > 0 && (
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>{assumptionFocus.real_evidence_that_bears_on_it.join(", ")}</div>
              )}
            </div>
            <CounterfactualPrompt>{assumptionFocus.counterfactual}</CounterfactualPrompt>
          </>
        )}
      </FocusPanel>

      <FocusPanel open={winFocus} onClose={() => setWinFocus(false)} eyebrow="Current Bet" title="Why did this win?">
        {data && (
          <>
            <StatRow label="Bet" value={data.why_did_this_win.bet} />
            <StatRow label="Decision type" value={data.why_did_this_win.decision_type} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Why</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{data.why_did_this_win.why}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Final three dimensions — no fourth score</SectionLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {data.why_did_this_win.final_three_dimensions.map((d) => <Pill key={d} tone="blue">{d}</Pill>)}
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Most-sensitive assumption</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{data.why_did_this_win.most_sensitive_assumption}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>First experiment</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{data.why_did_this_win.first_experiment}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Kill criterion</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.5 }}>{data.why_did_this_win.kill_criterion}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Versuni Edge classification</SectionLabel>
              <Pill tone="neutral">{data.why_did_this_win.versuni_edge_classification}</Pill>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.5 }}>{data.why_did_this_win.versuni_edge_note}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>What competitors cannot easily replicate</SectionLabel>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>{data.why_did_this_win.what_competitors_cannot_easily_replicate}</p>
            </div>
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!stageFocus} onClose={() => setStageFocus(null)} eyebrow="Funnel stage" title={FUNNEL_STAGES.find((s) => s.key === stageFocus)?.label ?? ""}>
        {stageFocus && data && (
          <>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
              {stageFocus === "__versuni_edge" ? "N/A" : stageFocus === "__bet" ? "" : data.funnel[stageFocus]}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
              {stageFocus === "sources_admitted" && "Every real connector this case tracks — verified-live, frozen archive, manual-only-by-design, and honestly not-implemented (e.g. Google Trends)."}
              {stageFocus === "signals_total" && `Real signals derived from the taxonomy + research corpus (${data.funnel.signals_converging} converging, ${data.funnel.signals_contested} contested).`}
              {stageFocus === "tensions" && "Real research tensions — genuine trade-offs found across two or more peer-reviewed papers."}
              {stageFocus === "assumptions" && "Real category assumptions mapped, each with real evidence for/against its prevalence."}
              {(stageFocus === "counterfactuals_generated" || stageFocus === "concept_seeds") && "Every (friction theme × design operator) combination the fixed Magic Box rule table generates — before any gate is applied."}
              {stageFocus === "__versuni_edge" && "Not a count — see the Versuni Edge section on Criteria, where each finalist's classification is computed from the evidence actually available (missing Versuni-internal evidence shows as NEEDS_EVIDENCE, never scored)."}
              {stageFocus === "critic_evaluated" && "Every concept the Critic has run SURVIVE/CHALLENGE/NEEDS_EVIDENCE/REJECT verdicts against — the count shown is the live coverage."}
              {stageFocus === "finalists" && "Concepts that survived the evidence gate and dominance screening (kept unless another concept beats them on every measure), ranked by Consumer Pain."}
              {stageFocus === "__bet" && "The current recommended concept from the live decision engine — never hardcoded."}
            </p>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
              TRACE — <TraceText text={{
                sources_admitted: "len(data/processed/sources_real.json → \"sources\"), read live by src/real/criteria_real.py::compute_funnel_counts() on every GET /api/criteria.",
                signals_total: "data/processed/signals_real.json → \"count\" field, computed by src/real/signals_from_research_real.py.",
                tensions: "len(data/processed/research_tensions.json → \"tensions\"), computed by src/real/research_corpus_real.py.",
                assumptions: "len(data/processed/category_assumptions.json → \"assumptions\"), computed by src/real/assumptions_real.py.",
                counterfactuals_generated: "data/processed/magic_box_real.json → funnel[0].count, computed by src/real/magic_box_real.py::run_funnel().",
                concept_seeds: "data/processed/magic_box_real.json → funnel[0].count, computed by src/real/magic_box_real.py::run_funnel().",
                __versuni_edge: "No count field — this stage has no real Versuni-capability data to aggregate (see NO_VERSUNI_CAPABILITY_NOTE in src/real/criteria_real.py).",
                critic_evaluated: "len(data/processed/critic_real.json → \"concepts\"), computed by src/real/critic_real.py::build().",
                finalists: "len(data/processed/magic_box_real.json → \"finalists\"), computed by src/real/magic_box_real.py::run_funnel().",
                __bet: "data/processed/decision_framework_real.json → verdict.recommended_name, computed live by src/real/decision_framework_real.py::compute().",
              }[stageFocus] ?? ""} />
            </p>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
