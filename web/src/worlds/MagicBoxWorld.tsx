import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { MagicBoxResponse, Possibility } from "../lib/types";
import { Card, Pill, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, CounterfactualPrompt, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import type { DesignDna } from "../lib/types";
import { FrictionIcon, ImageProvenance } from "../components/ThemeIcon";

interface CategoryAssumption {
  assumption_id: string; text: string; status: string; evidence_for_prevalence: string;
  real_evidence_that_bears_on_it: string[]; evidence_note: string; counterfactual: string;
}
interface CriticDimension { verdict: string; reasoning: string }
interface CriticConcept {
  possibility_id: string; name: string; evolution_stage: string; critic_overall: string;
  critic_dimensions: Record<string, CriticDimension>;
  why_it_existed?: string; what_killed_it?: string;
}

const STAGE_TONE: Record<string, "neutral" | "amber" | "teal" | "good" | "rose"> = {
  SEED: "neutral", CHALLENGED: "amber", SURVIVOR: "teal", FINALIST: "good", REJECTED: "rose",
};
const VERDICT_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  SURVIVE: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", REJECT: "rose",
};
const DNA_LETTER_NAME: Record<string, string> = {
  F: "Friction", S: "Signal", T: "Tension", R: "Rival gap",
  C: "Versuni capability", A: "Assumption", E: "Economic condition", O: "Design operator",
};
const DNA_ORDER = ["F", "S", "T", "R", "C", "A", "E", "O"] as const;

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

export function MagicBoxWorld({ themeFilter }: { themeFilter: string | null }) {
  const [data, setData] = useState<MagicBoxResponse | null>(null);
  const [focus, setFocus] = useState<Possibility | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [assumptions, setAssumptions] = useState<CategoryAssumption[] | null>(null);
  const [assumptionFocus, setAssumptionFocus] = useState<CategoryAssumption | null>(null);
  const [critic, setCritic] = useState<CriticConcept[] | null>(null);

  useEffect(() => { api.magicBox().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => { api.assumptions().then((r) => setAssumptions(r.assumptions)).catch(() => setAssumptions(null)); }, []);
  useEffect(() => { api.critic().then((r) => setCritic(r.concepts)).catch(() => setCritic(null)); }, []);

  const criticOf = (id: string) => critic?.find((c) => c.possibility_id === id) ?? null;

  const possibilities = useMemo(() => {
    const all = data?.possibilities ?? [];
    if (!themeFilter) return all;
    const filtered = all.filter((p) => p.friction_theme === themeFilter);
    return filtered.length ? filtered : all;
  }, [data, themeFilter]);

  const finalistIds = new Set((data?.finalists ?? []).map((f) => f.id));
  const nonDominated = new Set(data?.non_dominated ?? []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            4 · WHAT IF — WHAT BECOMES POSSIBLE?
          </div>
          <h1 style={{ fontSize: 30 }}>What If?</h1>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: -4, marginBottom: 8 }}>
            {mode === "raw" ? "MAGIC BOX / COUNTERFACTUAL ENGINE" : "NEW PRODUCT CONCEPTS"}
          </div>
          {themeFilter && (
            <div style={{ fontSize: 11.5, color: "var(--accent-teal)", marginTop: 4 }}>
              Filtered from Rivals white space → theme: <span className="mono">{themeFilter}</span>
            </div>
          )}
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "distilled" && (
        <div style={{ marginBottom: 14, flexShrink: 0 }}>
          <SectionLabel>Category assumption map — click to break one</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(assumptions ?? []).map((a) => (
              <button key={a.assumption_id} onClick={() => setAssumptionFocus(a)}
                style={{
                  fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                  border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-dim)",
                }}>
                {a.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* funnel */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
        {(data?.funnel ?? []).map((f, i) => (
          <div key={f.stage} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{f.count}</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</div>
            </div>
            {i < (data?.funnel.length ?? 0) - 1 && <div style={{ color: "var(--ink-faint)", padding: "0 4px", fontSize: 14 }}>→</div>}
          </div>
        ))}
      </div>

      {mode === "distilled" ? (
        <div className="scrollY" style={{ flex: 1 }}>
          <SectionLabel>Finalists — {data?.finalists.length ?? 0} of {data?.funnel[0]?.count ?? 0} generated survived gate → evidence → dominance</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignContent: "start", marginBottom: 8 }}>
            {(data?.finalists ?? []).map((p) => {
              const c = criticOf(p.id);
              return (
                <Card key={p.id} onClick={() => setFocus(p)} active>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Pill tone="good">FINALIST</Pill>
                      {c && <Pill tone={VERDICT_TONE[c.critic_overall] ?? "neutral"}>CRITIC: {c.critic_overall.replace(/_/g, " ")}</Pill>}
                    </div>
                    <FrictionIcon theme={p.friction_theme} size={32} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 8px" }}>
                    {p.friction_theme_name.split(" / ")[0]} × {p.operator}
                  </div>
                  {p.typical_market_price_usd != null && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        ${p.typical_market_price_usd.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>typical real price today</span>
                    </div>
                  )}
                  <StatRow label="Market exposure (price-weighted)" value={`$${p.economic_value.toLocaleString()}`} />
                  <StatRow label="Feasibility" value={p.feasibility_2_5y.rating} />
                  <div style={{ marginTop: 8 }}>
                    <DnaBadgeRow dna={p.design_dna} compact />
                  </div>
                </Card>
              );
            })}
            {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real Magic Box output…</div>}
          </div>
          <CounterfactualPrompt>What if the winning idea isn't the most powerful one, but the one competitors are least able to copy?</CounterfactualPrompt>
        </div>
      ) : (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
        <SectionLabel>{showRejected ? "Graveyard — killed candidates" : `Candidates — deterministic operator × friction combinations (${possibilities.length})`}</SectionLabel>
        <button onClick={() => setShowRejected((v) => !v)}
          style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer" }}>
          {showRejected ? "← View candidates" : `View rejected (${data?.graveyard.length ?? 0})`}
        </button>
      </div>

      <div className="scrollY" style={{ flex: 1 }}>
        {!showRejected ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, alignContent: "start" }}>
            {possibilities.map((p) => {
              const c = criticOf(p.id);
              return (
              <Card key={p.id} onClick={() => setFocus(p)} active={finalistIds.has(p.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 4 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {c && <Pill tone={STAGE_TONE[c.evolution_stage] ?? "neutral"}>{c.evolution_stage}</Pill>}
                    {p.is_white_space && <Pill tone="amber">rivals weak here</Pill>}
                  </div>
                  <FrictionIcon theme={p.friction_theme} size={28} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 8px" }}>
                  {p.friction_theme_name.split(" / ")[0]} × {p.operator}
                </div>
                {p.typical_market_price_usd != null && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      ${p.typical_market_price_usd.toFixed(2)}
                    </span>
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
            })}
            {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real Magic Box output…</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data?.graveyard ?? []).map((g) => (
              <div key={g.id} onClick={() => { const p = data?.possibilities.find((x) => x.id === g.id); if (p) setFocus(p); }} role="button" tabIndex={0}
                style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{g.kill_reason}</div>
                </div>
                <Pill tone="rose">{g.killed_by}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow={focus ? `${focus.friction_theme_name} × ${focus.operator}` : ""} title={focus?.name ?? ""}>
        {focus && (() => {
          const c = criticOf(focus.id);
          return (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FrictionIcon theme={focus.friction_theme} size={36} />
              </div>
              <ImageProvenance state="EDITORIAL" />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <TruthBadge truthClass={focus.truth_class} />
              {c && <Pill tone={STAGE_TONE[c.evolution_stage] ?? "neutral"}>{c.evolution_stage}</Pill>}
              {focus.is_white_space && <Pill tone="amber">rivals weak here</Pill>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Derivation</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                Friction: <b style={{ color: "var(--ink)" }}>{focus.friction_theme_name}</b> (CSAT {focus.consumer_pain_csat}, {focus.consumer_pain_prevalence_pct}% of reviews)
                {" "}transformed by operator <b style={{ color: "var(--ink)" }}>{focus.operator}</b> — {focus.operator_definition}
                {focus.competitor_gap_brands.length > 0 && <> Rivals measurably weak here: {focus.competitor_gap_brands.join(", ")}.</>}
              </p>
              {focus.consumer_pain_methodology && (
                <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 8 }}>
                  <b>Consumer Pain source — </b>
                  WHO: real Amazon.com customers ({focus.consumer_pain_methodology.pct_verified_purchase}% verified purchase) ·
                  {" "}HOW MANY: {focus.consumer_pain_methodology.n_reviews} reviews across {focus.consumer_pain_methodology.n_distinct_products} real products ·
                  {" "}WHEN: {focus.consumer_pain_methodology.review_date_range?.[0]}–{focus.consumer_pain_methodology.review_date_range?.[1]} ·
                  {" "}WHAT STUDIES: none — {focus.consumer_pain_methodology.method}
                </p>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Design DNA — genuine parent lineage only</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DNA_ORDER.map((letter) => {
                  const p = focus.design_dna[letter as keyof typeof focus.design_dna];
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
            {focus.typical_market_price_usd != null && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  ${focus.typical_market_price_usd.toFixed(2)}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  typical real price in this segment today (median of {focus.typical_market_price_n_products} real products)
                </span>
              </div>
            )}
            <StatRow label="Gate passed (real pain evidence)" value={focus.gate_passed ? "yes" : "no"} />
            <StatRow label="Market exposure (price-weighted)" value={`$${focus.economic_value.toLocaleString()}`} />
            <StatRow label="Feasibility (2–5yr)" value={`${focus.feasibility_2_5y.rating} (rank ${focus.feasibility_2_5y.rank})`} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Why it may fail</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                {focus.is_white_space
                  ? "Even in white space, execution risk is real: the operator must actually resolve the friction in practice, not just on paper — this needs a first experiment before committing."
                  : "This candidate is not white space — either the friction isn't clearly worse for named rivals, or feasibility/economic evidence is thinner. Treat as exploratory, not committed."}
              </p>
            </div>
            {c && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Critic — overall: {c.critic_overall.replace(/_/g, " ")}</SectionLabel>
                {Object.entries(c.critic_dimensions).map(([dim, d]) => (
                  <div key={dim} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <Pill tone={VERDICT_TONE[d.verdict] ?? "neutral"}>{dim}</Pill>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>
                      <b style={{ color: "var(--ink)" }}>{d.verdict.replace(/_/g, " ")}</b> — {d.reasoning}
                    </div>
                  </div>
                ))}
                {c.what_killed_it && (
                  <p style={{ fontSize: 12, color: "var(--rose)", marginTop: 10, lineHeight: 1.5 }}>
                    <b>What killed it:</b> {c.what_killed_it}
                  </p>
                )}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Evidence IDs</SectionLabel>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>{focus.evidence_ids.join(", ")}</div>
            </div>
          </>
          );
        })()}
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
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                  {assumptionFocus.real_evidence_that_bears_on_it.join(", ")}
                </div>
              )}
            </div>
            <CounterfactualPrompt>{assumptionFocus.counterfactual}</CounterfactualPrompt>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
