import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Card, Pill, SectionLabel, StatRow, TruthBadge, DistilledRawToggle, CounterfactualPrompt, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { FrictionIcon, ImageProvenance } from "../components/ThemeIcon";
import type { DesignDna } from "../lib/types";

interface Criterion {
  id: string; category: string; name: string; question: string; why_it_matters: string;
  how_tested: string; pass_condition: string; challenge_condition: string; kill_condition: string;
}
interface CriticDimension { verdict: string; reasoning: string }
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
}
interface Assumption {
  assumption_id: string; text: string; status: string; evidence_for_prevalence: string;
  real_evidence_that_bears_on_it: string[]; evidence_note: string; counterfactual: string;
}
interface Graveyard { id: string; name: string; killed_by: string; kill_reason_class: string; why_did_this_die: string }
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
const STAGE_TONE: Record<string, "neutral" | "amber" | "teal" | "good" | "rose"> = {
  SEED: "neutral", CHALLENGED: "amber", SURVIVOR: "teal", FINALIST: "good", REJECTED: "rose",
};
const VERDICT_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  SURVIVE: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", REJECT: "rose",
};
const DNA_LETTER_NAME: Record<string, string> = {
  F: "Friction", S: "Signal", T: "Tension", R: "Competitor gap",
  C: "Versuni capability", A: "Assumption", E: "Economic condition", O: "Design operator",
};
const DNA_ORDER = ["F", "S", "T", "R", "C", "A", "E", "O"] as const;
const CATEGORIES = ["EVIDENCE", "HUMAN", "DISRUPTION", "VERSUNI", "COMPETITION", "BEHAVIOR", "SPACE", "ECONOMICS", "FEASIBILITY"] as const;

const FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: "sources_admitted", label: "SOURCE" },
  { key: "signals_total", label: "SIGNAL" },
  { key: "tensions", label: "TENSION" },
  { key: "assumptions", label: "ASSUMPTION" },
  { key: "counterfactuals_generated", label: "COUNTERFACTUAL" },
  { key: "concept_seeds", label: "CONCEPT" },
  { key: "__versuni_edge", label: "VERSUNI EDGE" },
  { key: "critic_evaluated", label: "CRITIC" },
  { key: "finalists", label: "FINALISTS" },
  { key: "__bet", label: "BET" },
];

function DnaBadgeRow({ dna, compact }: { dna: DesignDna; compact?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {DNA_ORDER.map((letter) => {
        const p = dna[letter as keyof DesignDna];
        const present = p.status === "PRESENT";
        return (
          <span key={letter} title={`${DNA_LETTER_NAME[letter]}: ${present ? "present" : "missing / unverified"} — ${p.detail}`}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: compact ? 20 : 24, height: compact ? 20 : 24, borderRadius: 6,
              fontSize: compact ? 10 : 11, fontFamily: "var(--font-mono)", fontWeight: 700,
              color: present ? "var(--good)" : "var(--ink-faint)",
              background: present ? "rgba(47,143,91,0.12)" : "var(--surface-2)",
              border: `1px solid ${present ? "var(--good)" : "var(--line)"}`, opacity: present ? 1 : 0.6,
            }}>
            {letter}
          </span>
        );
      })}
    </div>
  );
}

function ConceptCard({ p, onClick }: { p: Concept; onClick: () => void }) {
  return (
    <Card onClick={onClick} active={p.is_finalist}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {p.evolution_stage && <Pill tone={STAGE_TONE[p.evolution_stage] ?? "neutral"}>{p.evolution_stage}</Pill>}
          {p.critic_overall && <Pill tone={VERDICT_TONE[p.critic_overall] ?? "neutral"}>CRITIC: {p.critic_overall.replace(/_/g, " ")}</Pill>}
          {p.is_white_space && <Pill tone="amber">competitors weak here</Pill>}
        </div>
        <FrictionIcon theme={p.friction_theme} size={28} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 8px" }}>
        {p.friction_theme_name.split(" / ")[0]} × {p.operator}
      </div>
      {p.typical_market_price_usd != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${p.typical_market_price_usd.toFixed(2)}</span>
          <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>typical real price today</span>
        </div>
      )}
      <StatRow label="Market exposure (price-weighted)" value={`$${p.economic_value.toLocaleString()}`} />
      <StatRow label="Feasibility" value={p.feasibility_2_5y.rating} />
      <div style={{ marginTop: 6 }}>
        <DnaBadgeRow dna={p.design_dna} compact />
      </div>
    </Card>
  );
}

export function CriteriaWorld({ themeFilter }: { themeFilter?: string | null }) {
  const [data, setData] = useState<CriteriaDoc | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("EVIDENCE");
  const [criterionFocus, setCriterionFocus] = useState<Criterion | null>(null);
  const [conceptFocus, setConceptFocus] = useState<Concept | null>(null);
  const [assumptionFocus, setAssumptionFocus] = useState<Assumption | null>(null);
  const [winFocus, setWinFocus] = useState(false);
  const [stageFocus, setStageFocus] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => { api.criteria().then(setData).catch(() => setData(null)); }, []);

  const conceptsFiltered = useMemo(() => {
    const all = data?.concepts ?? [];
    if (!themeFilter) return all;
    const filtered = all.filter((p) => p.friction_theme === themeFilter);
    return filtered.length ? filtered : all;
  }, [data, themeFilter]);
  const finalists = useMemo(() => (data?.concepts ?? []).filter((p) => p.is_finalist), [data]);

  const criteriaInCategory = useMemo(
    () => (data?.criteria_library ?? []).filter((c) => c.category === category),
    [data, category]
  );

  function aggregateFor(criterionId: string) {
    const counts: Record<string, number> = { PASS: 0, CHALLENGE: 0, NEEDS_EVIDENCE: 0, KILL: 0, "N/A": 0 };
    const passed: string[] = []; const failed: string[] = [];
    (data?.concepts ?? []).forEach((c) => {
      const r = c.criteria[criterionId];
      if (!r) return;
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === "PASS") passed.push(c.name);
      if (r.status === "KILL") failed.push(c.name);
    });
    return { counts, passed, failed };
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            4 · WHAT IF — HOW INTELLIGENCE DECIDES
          </div>
          <h1 style={{ fontSize: 30 }}>Criteria</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>From evidence → to one defensible bet.</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: 6, letterSpacing: "0.04em" }}>
            CRITERIA ARE NOT SCORES. THEY ARE TESTS.
          </div>
          {themeFilter && (
            <div style={{ fontSize: 11.5, color: "var(--accent-teal)", marginTop: 6 }}>
              Filtered from Competitors' white space → theme: <span className="mono">{themeFilter}</span>
            </div>
          )}
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real criteria evaluation…</div>}
      {data && (
        <div className="scrollY" style={{ flex: 1 }}>
          {/* Meta funnel */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
            {FUNNEL_STAGES.map((s, i) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => setStageFocus(s.key)}
                  style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 10, padding: "8px 12px", minWidth: 84 }}>
                  <div className="mono" style={{ fontSize: s.key === "__bet" ? 11 : 18, fontWeight: 700, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.key === "__versuni_edge" ? "?" : s.key === "__bet" ? data.funnel.bet : data.funnel[s.key]}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>{s.label}</div>
                </button>
                {i < FUNNEL_STAGES.length - 1 && <span style={{ color: "var(--ink-faint)", padding: "0 3px" }}>→</span>}
              </div>
            ))}
          </div>

          {mode === "distilled" && (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Category assumption map — click to break one</SectionLabel>
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

          {/* Magic Box sub-funnel */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
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

          {/* Concepts gallery */}
          {mode === "distilled" ? (
            <>
              <SectionLabel>Finalists — {finalists.length} of {data.magic_box_funnel[0]?.count ?? 0} generated survived gate → evidence → dominance</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignContent: "start", marginBottom: 8 }}>
                {finalists.map((p) => <ConceptCard key={p.id} p={p} onClick={() => setConceptFocus(p)} />)}
              </div>
              <CounterfactualPrompt>What if the winning idea isn't the most powerful one, but the one competitors are least able to copy?</CounterfactualPrompt>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <SectionLabel>{showRejected ? "Rejected — why did each one die?" : `Concepts — deterministic operator × friction combinations (${conceptsFiltered.length})`}</SectionLabel>
                <button onClick={() => setShowRejected((v) => !v)}
                  style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer" }}>
                  {showRejected ? "← View concepts" : `View rejected (${data.graveyard.length})`}
                </button>
              </div>
              {!showRejected ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, alignContent: "start", marginBottom: 20 }}>
                  {conceptsFiltered.map((p) => <ConceptCard key={p.id} p={p} onClick={() => setConceptFocus(p)} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {data.graveyard.map((g) => (
                    <div key={g.id} onClick={() => { const p = data.concepts.find((x) => x.id === g.id); if (p) setConceptFocus(p); }} role="button" tabIndex={0}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{g.why_did_this_die}</div>
                      </div>
                      <Pill tone="rose">{g.kill_reason_class}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Versuni Edge */}
          <div style={{ marginBottom: 18, padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12 }}>
            <SectionLabel>Versuni Edge — diagnostic, not a fourth score</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {data.criteria_library.filter((c) => c.category === "VERSUNI").map((c) => (
                <button key={c.id} onClick={() => setCriterionFocus(c)}
                  style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-dim)" }}>
                  {c.id} · {c.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>
              Every finalist's Versuni Edge classification is honestly NEEDS_EVIDENCE — no real Versuni
              internal-capability dataset exists in this pipeline. See any criterion above for the specific gap.
            </p>
          </div>

          {/* Why did this win */}
          <button onClick={() => setWinFocus(true)}
            style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 18, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--accent-blue)", borderRadius: 12 }}>
            <SectionLabel>Current Bet — why did this win?</SectionLabel>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{data.why_did_this_win.bet}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>Click for the full trace →</div>
          </button>

          {/* Criteria library */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
                  background: category === cat ? "var(--surface)" : "var(--surface-2)", fontWeight: category === cat ? 700 : 500,
                  boxShadow: category === cat ? "var(--shadow)" : "none" }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {criteriaInCategory.map((c) => {
              const agg = aggregateFor(c.id);
              const dominant = (["KILL", "CHALLENGE", "PASS", "NEEDS_EVIDENCE", "N/A"] as const).find((s) => agg.counts[s] > 0) ?? "N/A";
              return (
                <div key={c.id} onClick={() => setCriterionFocus(c)} role="button" tabIndex={0}
                  style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 12, padding: 14, background: "var(--surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{c.id}</span>
                    <Pill tone={STATUS_TONE[dominant]}>{agg.counts.PASS}P · {agg.counts.CHALLENGE}C · {agg.counts.NEEDS_EVIDENCE}NE · {agg.counts.KILL}K</Pill>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 4, lineHeight: 1.4 }}>{c.question}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Concept FocusPanel - merged Derivation + Design DNA + Critic + Criteria evaluation */}
      <FocusPanel open={!!conceptFocus} onClose={() => setConceptFocus(null)} eyebrow={conceptFocus ? `${conceptFocus.friction_theme_name} × ${conceptFocus.operator}` : ""} title={conceptFocus?.name ?? ""}>
        {conceptFocus && (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FrictionIcon theme={conceptFocus.friction_theme} size={36} />
              </div>
              <ImageProvenance state="EDITORIAL" />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <TruthBadge truthClass={conceptFocus.truth_class} />
              {conceptFocus.evolution_stage && <Pill tone={STAGE_TONE[conceptFocus.evolution_stage] ?? "neutral"}>{conceptFocus.evolution_stage}</Pill>}
              {conceptFocus.is_white_space && <Pill tone="amber">competitors weak here</Pill>}
            </div>

            {(() => {
              const grave = data?.graveyard.find((g) => g.id === conceptFocus.id);
              return grave ? (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(166,67,63,0.08)", border: "1px solid rgba(166,67,63,0.25)", borderRadius: 8 }}>
                  <SectionLabel>Why did this die?</SectionLabel>
                  <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.5 }}>{grave.why_did_this_die}</p>
                </div>
              ) : null;
            })()}

            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Derivation</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                Friction: <b style={{ color: "var(--ink)" }}>{conceptFocus.friction_theme_name}</b> (CSAT {conceptFocus.consumer_pain_csat}, {conceptFocus.consumer_pain_prevalence_pct}% of reviews)
                {" "}transformed by operator <b style={{ color: "var(--ink)" }}>{conceptFocus.operator}</b> — {conceptFocus.operator_definition}
                {conceptFocus.competitor_gap_brands.length > 0 && <> Competitors measurably weak here: {conceptFocus.competitor_gap_brands.join(", ")}.</>}
              </p>
              {conceptFocus.consumer_pain_methodology && (
                <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 8 }}>
                  <b>Consumer Pain source — </b>
                  WHO: real Amazon.com customers ({conceptFocus.consumer_pain_methodology.pct_verified_purchase}% verified purchase) ·
                  {" "}HOW MANY: {conceptFocus.consumer_pain_methodology.n_reviews} reviews across {conceptFocus.consumer_pain_methodology.n_distinct_products} real products ·
                  {" "}WHEN: {conceptFocus.consumer_pain_methodology.review_date_range?.[0]}–{conceptFocus.consumer_pain_methodology.review_date_range?.[1]} ·
                  {" "}WHAT STUDIES: none — {conceptFocus.consumer_pain_methodology.method}
                </p>
              )}
            </div>

            {conceptFocus.typical_market_price_usd != null && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${conceptFocus.typical_market_price_usd.toFixed(2)}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>typical real price in this segment today (median of {conceptFocus.typical_market_price_n_products} real products)</span>
              </div>
            )}
            <StatRow label="Gate passed (real pain evidence)" value={conceptFocus.gate_passed ? "yes" : "no"} />
            <StatRow label="Market exposure (price-weighted)" value={`$${conceptFocus.economic_value.toLocaleString()}`} />
            <StatRow label="Feasibility (2–5yr)" value={`${conceptFocus.feasibility_2_5y.rating} (rank ${conceptFocus.feasibility_2_5y.rank})`} />
            {conceptFocus.feasibility_2_5y.rationale && (
              <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 6 }}>{conceptFocus.feasibility_2_5y.rationale}</p>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Design DNA — genuine parent lineage only</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DNA_ORDER.map((letter) => {
                  const p = conceptFocus.design_dna[letter as keyof DesignDna];
                  const present = p.status === "PRESENT";
                  return (
                    <div key={letter} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700,
                        color: present ? "var(--good)" : "var(--ink-faint)",
                        background: present ? "rgba(47,143,91,0.12)" : "var(--surface-2)",
                        border: `1px solid ${present ? "var(--good)" : "var(--line)"}`,
                      }}>{letter}</span>
                      <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                        <b style={{ color: "var(--ink)" }}>{DNA_LETTER_NAME[letter]}</b>
                        {" — "}
                        <span style={{ color: present ? "var(--ink-dim)" : "var(--ink-faint)" }}>
                          {present ? p.detail : "MISSING / UNVERIFIED — " + p.detail}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {conceptFocus.critic_dimensions && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Critic — overall: {conceptFocus.critic_overall?.replace(/_/g, " ")}</SectionLabel>
                {Object.entries(conceptFocus.critic_dimensions).map(([dim, d]) => (
                  <div key={dim} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ width: 90, flexShrink: 0 }}><Pill tone={VERDICT_TONE[d.verdict] ?? "neutral"}>{dim}</Pill></div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>
                      <b style={{ color: "var(--ink)" }}>{d.verdict.replace(/_/g, " ")}</b> — {d.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Every criterion this concept was tested against</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(conceptFocus.criteria).map(([cid, r]) => (
                  <div key={cid} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ width: 110, flexShrink: 0 }}><Pill tone={STATUS_TONE[r.status]}>{cid} {r.status}</Pill></div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.4 }}>{r.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Evidence IDs</SectionLabel>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>{conceptFocus.evidence_ids.join(", ")}</div>
            </div>
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

      <FocusPanel open={!!criterionFocus} onClose={() => setCriterionFocus(null)} eyebrow={criterionFocus?.category} title={criterionFocus ? `${criterionFocus.id} · ${criterionFocus.name}` : ""}>
        {criterionFocus && (() => {
          const agg = aggregateFor(criterionFocus.id);
          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Question</SectionLabel>
                <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{criterionFocus.question}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Why this matters</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{criterionFocus.why_it_matters}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>How it is tested</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{criterionFocus.how_tested}</p>
              </div>
              <StatRow label="Pass condition" value={criterionFocus.pass_condition} />
              <StatRow label="Challenge condition" value={criterionFocus.challenge_condition} />
              <StatRow label="Kill condition" value={criterionFocus.kill_condition} />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Current case result — real, across all {data?.concepts.length ?? 0} concepts</SectionLabel>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {Object.entries(agg.counts).filter(([, n]) => n > 0).map(([status, n]) => (
                    <Pill key={status} tone={STATUS_TONE[status]}>{status}: {n}</Pill>
                  ))}
                </div>
                {agg.passed.length > 0 && <p style={{ fontSize: 12, color: "var(--good)", marginBottom: 6 }}><b>Passed:</b> {agg.passed.join(", ")}</p>}
                {agg.failed.length > 0 && <p style={{ fontSize: 12, color: "var(--rose)" }}><b>Killed on this:</b> {agg.failed.join(", ")}</p>}
              </div>
            </>
          );
        })()}
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
              {stageFocus === "__versuni_edge" && "Not a count — see the Versuni Edge section below the funnel. Every finalist's classification is honestly NEEDS_EVIDENCE."}
              {stageFocus === "critic_evaluated" && "Every concept the Critic has run SURVIVE/CHALLENGE/NEEDS_EVIDENCE/REJECT verdicts against — currently all of them."}
              {stageFocus === "finalists" && "Concepts that survived gate → evidence → Pareto dominance, ranked by Consumer Pain."}
              {stageFocus === "__bet" && "The current recommended concept from the live decision engine — never hardcoded."}
            </p>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
              TRACE — {{
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
              }[stageFocus]}
            </p>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
