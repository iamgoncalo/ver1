import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, DistilledRawToggle, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

interface Criterion {
  id: string; category: string; name: string; question: string; why_it_matters: string;
  how_tested: string; pass_condition: string; challenge_condition: string; kill_condition: string;
}
interface ConceptResult { id: string; name: string; criteria: Record<string, { status: string; note: string }> }
interface Graveyard { id: string; name: string; killed_by: string; kill_reason_class: string; why_did_this_die: string }
interface CriteriaDoc {
  criteria_library: Criterion[];
  funnel: Record<string, number | string>;
  concepts: ConceptResult[];
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

export function CriteriaWorld() {
  const [data, setData] = useState<CriteriaDoc | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("EVIDENCE");
  const [criterionFocus, setCriterionFocus] = useState<Criterion | null>(null);
  const [conceptFocus, setConceptFocus] = useState<ConceptResult | null>(null);
  const [graveFocus, setGraveFocus] = useState<Graveyard | null>(null);
  const [winFocus, setWinFocus] = useState(false);
  const [stageFocus, setStageFocus] = useState<string | null>(null);

  useEffect(() => { api.criteria().then(setData).catch(() => setData(null)); }, []);

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
            CRITERIA
          </div>
          <h1 style={{ fontSize: 30 }}>How Intelligence Decides</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>From evidence → to one defensible bet.</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: 6, letterSpacing: "0.04em" }}>
            CRITERIA ARE NOT SCORES. THEY ARE TESTS.
          </div>
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real criteria evaluation…</div>}
      {data && (
        <div className="scrollY" style={{ flex: 1 }}>
          {/* Funnel */}
          <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
            {FUNNEL_STAGES.map((s, i) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => setStageFocus(s.key)}
                  style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 10, padding: "8px 12px", minWidth: 88 }}>
                  <div className="mono" style={{ fontSize: s.key === "__bet" ? 11 : 18, fontWeight: 700, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.key === "__versuni_edge" ? "?" : s.key === "__bet" ? data.funnel.bet : data.funnel[s.key]}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>{s.label}</div>
                </button>
                {i < FUNNEL_STAGES.length - 1 && <span style={{ color: "var(--ink-faint)", padding: "0 3px" }}>→</span>}
              </div>
            ))}
          </div>

          {/* Versuni Edge compact area */}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 20 }}>
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

          {mode === "raw" && (
            <>
              <SectionLabel>Every concept, every criterion</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {data.concepts.map((c) => (
                  <div key={c.id} onClick={() => setConceptFocus(c)} role="button" tabIndex={0}
                    style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Object.entries(c.criteria).filter(([, r]) => r.status === "PASS" || r.status === "KILL").slice(0, 6).map(([cid, r]) => (
                        <span key={cid} title={`${cid}: ${r.status}`} style={{
                          width: 8, height: 8, borderRadius: "50%", background: r.status === "PASS" ? "var(--good)" : "var(--rose)",
                        }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionLabel>Rejected — why did each one die?</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.graveyard.map((g) => (
              <div key={g.id} onClick={() => setGraveFocus(g)} role="button" tabIndex={0}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{g.why_did_this_die}</div>
                </div>
                <Pill tone="rose">{g.kill_reason_class}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <SectionLabel>Current case result — real, across all 12 concepts</SectionLabel>
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

      <FocusPanel open={!!conceptFocus} onClose={() => setConceptFocus(null)} eyebrow="Concept — every criterion" title={conceptFocus?.name ?? ""}>
        {conceptFocus && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(conceptFocus.criteria).map(([cid, r]) => (
              <div key={cid} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ width: 100, flexShrink: 0 }}><Pill tone={STATUS_TONE[r.status]}>{cid} {r.status}</Pill></div>
                <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>{r.note}</div>
              </div>
            ))}
          </div>
        )}
      </FocusPanel>

      <FocusPanel open={!!graveFocus} onClose={() => setGraveFocus(null)} eyebrow="Rejected" title={graveFocus?.name ?? ""}>
        {graveFocus && (
          <>
            <Pill tone="rose">{graveFocus.kill_reason_class}</Pill>
            <div style={{ marginTop: 16 }}>
              <SectionLabel>Why did this die?</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{graveFocus.why_did_this_die}</p>
            </div>
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
              {stageFocus === "sources_admitted" && "Real sources currently tracked in the Sources dock (research, consumer, trend, market, economics families)."}
              {stageFocus === "signals_total" && `Real signals derived from the taxonomy + research corpus (${data.funnel.signals_converging} converging, ${data.funnel.signals_contested} contested).`}
              {stageFocus === "tensions" && "Real research tensions — genuine trade-offs found across two or more peer-reviewed papers."}
              {stageFocus === "assumptions" && "Real category assumptions mapped, each with real evidence for/against its prevalence."}
              {(stageFocus === "counterfactuals_generated" || stageFocus === "concept_seeds") && "Every (friction theme × design operator) combination the fixed Magic Box rule table generates — before any gate is applied."}
              {stageFocus === "__versuni_edge" && "Not a count — see the Versuni Edge section below the funnel. Every finalist's classification is honestly NEEDS_EVIDENCE."}
              {stageFocus === "critic_evaluated" && "Every concept the Critic has run SURVIVE/CHALLENGE/NEEDS_EVIDENCE/REJECT verdicts against — currently all of them."}
              {stageFocus === "finalists" && "Concepts that survived gate → evidence → Pareto dominance, ranked by Consumer Pain."}
              {stageFocus === "__bet" && "The current recommended concept from the live decision engine — never hardcoded."}
            </p>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
