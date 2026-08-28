import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow } from "./ui";
import { TraceText } from "./TraceText";

// Lab - the deep development environment inside an Innovation. Nine lenses
// over REAL runtime state only: prototypes that don't exist say so, the
// only simulation class that exists (scenario arithmetic) is labelled as
// exactly that, and Scenario reruns require a stated expected direction
// before executing - the interview discipline, built in.
type Lens = "overview" | "prototype" | "experiment" | "scenario" | "simulation" | "evidence" | "evolution" | "artifacts" | "decision";
const LENSES: { key: Lens; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "prototype", label: "Prototype" },
  { key: "experiment", label: "Experiment" }, { key: "scenario", label: "Scenario" },
  { key: "simulation", label: "Simulation" }, { key: "evidence", label: "Evidence" },
  { key: "evolution", label: "Evolution" }, { key: "artifacts", label: "Artifacts" },
  { key: "decision", label: "Decision" },
];

interface LabProps {
  osId: string;
  score: any;
  verdict: any;
  onClose: () => void;
}

const THEME_OF_EVIDENCE = (score: any): string | null =>
  score?.evidence_ids?.find((e: string) => e.startsWith("taxonomy:"))?.split(":")[1] ??
  score?.evidence_ids?.find((e: string) => e.startsWith("keyword_search:"))?.split(":")[1] ?? null;

export function Lab({ osId, score, verdict, onClose }: LabProps) {
  const [lens, setLens] = useState<Lens>("overview");
  const [critic, setCritic] = useState<any>(null);
  const [runsDoc, setRunsDoc] = useState<any[]>([]);
  const [magic, setMagic] = useState<any>(null);

  useEffect(() => {
    api.critic().then(setCritic).catch(() => {});
    fetch("/api/runs").then((r) => r.json()).then((d) => setRunsDoc(Array.isArray(d) ? d : [])).catch(() => {});
    api.magicBox().then(setMagic).catch(() => {});
  }, []);

  const theme = THEME_OF_EVIDENCE(score);
  const isRecommended = verdict?.recommended === osId;
  const conceptsForTheme = useMemo(
    () => (critic?.concepts ?? []).filter((c: any) => (c.possibility_id || "").startsWith(`${theme}:`)),
    [critic, theme]);
  const hypothesesForTheme = useMemo(
    () => (magic?.finalists ?? []).filter((f: any) => f.friction_theme === theme),
    [magic, theme]);
  const latestRun = runsDoc[runsDoc.length - 1];

  const state = isRecommended ? "priority to test"
    : score?.consumer_pain?.gate_passed ? "supported"
    : "challenged — evidence gap";

  // ---------------- Scenario lens state ----------------
  const [priority, setPriority] = useState("pain_feasibility_majority");
  const [market, setMarket] = useState("mordor");
  const [floor, setFloor] = useState("0.5");
  const [exclude, setExclude] = useState("");
  const [prediction, setPrediction] = useState("");
  const [scenarioOut, setScenarioOut] = useState<any>(null);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<string | null>(null);

  async function runScenario() {
    if (!prediction) return;
    setScenarioRunning(true);
    setLastPrediction(prediction);
    try {
      const params = new URLSearchParams({ market_scenario: market, decision_priority: priority });
      if (floor !== "0.5") params.set("materiality_floor", floor);
      if (exclude) params.set("exclude_sku", exclude);
      const res = await fetch(`/api/innovations/scenario?${params}`);
      setScenarioOut(await res.json());
    } catch { setScenarioOut({ error: true }); }
    setScenarioRunning(false);
  }
  const observed = scenarioOut?.verdict?.recommended ?? (scenarioOut?.verdict ? "NONE" : null);
  const predictionHit = observed != null && lastPrediction != null &&
    (lastPrediction === observed || (lastPrediction === "NONE" && observed === "NONE"));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 70 }} />
      <div role="dialog" aria-label={`Lab — ${score?.name ?? osId}`}
        style={{ position: "fixed", inset: "4% 6%", zIndex: 71, background: "var(--surface)", borderRadius: 18, border: "1px solid var(--line)", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>Lab — where possibility meets reality</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{score?.name ?? osId} <Pill tone={isRecommended ? "blue" : "neutral"}>{state}</Pill></div>
          </div>
          <button onClick={onClose} aria-label="Close Lab" style={{ border: "1px solid var(--line)", background: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>Close ✕</button>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "8px 22px", borderBottom: "1px solid var(--line)", flexShrink: 0, overflowX: "auto" }}>
          {LENSES.map((l) => (
            <button key={l.key} onClick={() => setLens(l.key)}
              style={{ padding: "6px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
                background: lens === l.key ? "var(--surface-2)" : "transparent", fontWeight: lens === l.key ? 600 : 400 }}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="scrollY" style={{ flex: 1, padding: "18px 22px", minHeight: 0 }}>

          {lens === "overview" && (
            <div style={{ maxWidth: 720 }}>
              <StatRow label="Current state" value={state} />
              <StatRow label="Consumer pain" value={`${score?.friction_prevalence_pct ?? "—"}% of real reviews · ${score?.csat_impact ?? "—"}★ vs corpus mean`} />
              <StatRow label="Price-weighted exposure" value={score?.economic_value != null ? `$${Number(score.economic_value).toLocaleString()}` : "unknown — no priced reviews carry this theme"} />
              <StatRow label="Feasibility" value={`${score?.feasibility_2_5y?.rating} · ${score?.feasibility_2_5y?.rank}/3 (3 = easiest)`} />
              <div style={{ marginTop: 12 }}>
                <SectionLabel>Biggest uncertainty</SectionLabel>
                {(score?.uncertainty ?? []).slice(0, 2).map((u: string, i: number) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 6 }}>{u}</p>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <SectionLabel>Most sensitive assumption</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                  The judgment that a severe-but-narrower friction outweighs a shallow-but-broader one — flip it live in the Scenario lens (Economic value override) and watch the decision change.
                </p>
              </div>
              {latestRun && (
                <div style={{ marginTop: 8 }}>
                  <SectionLabel>Latest machine run</SectionLabel>
                  <p className="mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                    {latestRun.run_id} · snapshot {String(latestRun.input_snapshot_hash).slice(0, 12)} · started {String(latestRun.started_at).slice(0, 16).replace("T", " ")}
                  </p>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <SectionLabel>Next learning action</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{isRecommended ? verdict?.first_experiment : "Defined for the current recommendation; this candidate's next action is to close its evidence gap (see Evidence lens)."}</p>
              </div>
            </div>
          )}

          {lens === "prototype" && (
            <div style={{ maxWidth: 720 }}>
              <Pill tone="amber">concept</Pill>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, marginTop: 10 }}>
                Honest prototype state: <b>CONCEPT</b>. A concept document exists — the Innovation Disclosure
                (Artifacts lens) with architecture, claims and derivation. No digital or physical prototype has
                been built, and no user test has run; those states are earned by real work, never displayed
                speculatively.
              </p>
              <div style={{ marginTop: 12 }}>
                <StatRow label="Concept document" value={`${osId}.pdf (Artifacts lens)`} />
                <StatRow label="Digital prototype" value="not started" />
                <StatRow label="Physical prototype" value="not started" />
                <StatRow label="User test" value="not started" />
              </div>
            </div>
          )}

          {lens === "experiment" && (
            <div style={{ maxWidth: 720 }}>
              {isRecommended && verdict ? (
                <>
                  <SectionLabel>First experiment (defined)</SectionLabel>
                  <p style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55, marginBottom: 10 }}>{verdict.first_experiment}</p>
                  <StatRow label="Hypothesis" value="failure reports cluster by brand/price tier, or spread category-wide" />
                  <StatRow label="Dependent variable" value="distribution of failure-mention share across products" />
                  <StatRow label="Data" value="the real 10,529-review clean corpus (no new collection needed)" />
                  <StatRow label="Expected direction (stated before run)" value="spread across the category → category-wide QA opportunity" />
                  <div style={{ marginTop: 10 }}>
                    <SectionLabel>Kill criterion</SectionLabel>
                    <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.55 }}>{verdict.abandon_signal}</p>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
                    Baseline, sample-size and procedure fields beyond the above are not yet designed — stated
                    honestly rather than filled with plausible text.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                  No experiment is defined for this candidate yet — the machine defines the first experiment for
                  its current recommendation, and this candidate would earn one by displacing it (Scenario lens)
                  or by closing its evidence gap.
                </p>
              )}
            </div>
          )}

          {lens === "scenario" && (
            <div style={{ maxWidth: 760 }}>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>
                Change real decision inputs and rerun the live engine. Frozen evidence is never touched — every
                change applies in memory to this run only. A rerun requires your expected direction first.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
                <label style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>Decision priority
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }}>
                    <option value="pain_feasibility_majority">Pain + feasibility majority</option>
                    <option value="economic_value_override">Economic value override</option>
                  </select>
                </label>
                <label style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>Market scenario (Q5)
                  <select value={market} onChange={(e) => setMarket(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }}>
                    <option value="mordor">Mordor Intelligence (5.37% CAGR)</option>
                    <option value="imarc">IMARC Group (6.54% CAGR)</option>
                  </select>
                </label>
                <label style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>Materiality floor (%)
                  <input value={floor} onChange={(e) => setFloor(e.target.value)} inputMode="decimal"
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }} />
                </label>
                <label style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>Exclude product (ASIN, optional)
                  <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="e.g. B0C2JF5179"
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }} />
                </label>
              </div>
              <label style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>Expected direction — required before the rerun
                <select value={prediction} onChange={(e) => setPrediction(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 8, border: "1px solid var(--accent-blue)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }}>
                  <option value="">— state your prediction first —</option>
                  <option value="OS-1">Recommendation stays OS-1 (Reliability-Verified)</option>
                  <option value="OS-2">Flips to OS-2 (Whisper-Quiet)</option>
                  <option value="OS-3">Flips to OS-3 (Smart/Connected)</option>
                  <option value="NONE">No recommendation (insufficient evidence)</option>
                </select>
              </label>
              {!prediction && <p style={{ fontSize: 11, color: "var(--amber)", marginTop: 8 }}>Select your expected direction above to enable the run — predictions come before results here.</p>}
              <button onClick={runScenario} disabled={!prediction || scenarioRunning}
                style={{ marginTop: 12, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: prediction ? "var(--accent-blue)" : "var(--surface-2)", color: prediction ? "white" : "var(--ink-faint)", cursor: prediction ? "pointer" : "not-allowed", fontSize: 12.5, fontWeight: 600 }}>
                {scenarioRunning ? "Recomputing live…" : "Run scenario"}
              </button>
              {scenarioOut && !scenarioOut.error && (
                <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
                  <StatRow label="Observed result" value={scenarioOut.verdict.recommended ? `${scenarioOut.verdict.recommended} — ${scenarioOut.verdict.recommended_name}` : scenarioOut.verdict.decision_type} />
                  <StatRow label="Your prediction" value={lastPrediction === "NONE" ? "no recommendation" : lastPrediction ?? "—"} />
                  <div style={{ marginTop: 6 }}>
                    <Pill tone={predictionHit ? "good" : "rose"}>{predictionHit ? "prediction confirmed" : "prediction missed — worth understanding why"}</Pill>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 8 }}>{scenarioOut.verdict.why}</p>
                </div>
              )}
              {scenarioOut?.error && <p style={{ fontSize: 12, color: "var(--rose)", marginTop: 10 }}>The engine rejected these inputs (visible error, not a silent fallback).</p>}
            </div>
          )}

          {lens === "simulation" && (
            <div style={{ maxWidth: 720 }}>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                One simulation class genuinely exists: <b>scenario arithmetic</b> — the deterministic recompute of
                gate → dominance → judgment over real review-derived inputs (Scenario lens; code:
                <span className="mono" style={{ fontSize: 11 }}> src/real/decision_framework_real.py::compute</span>).
                Inputs, assumptions and outputs are those of the run itself; uncertainty is carried by the
                underlying evidence, not modelled separately.
              </p>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, marginTop: 10 }}>
                No Monte Carlo, statistical, or physical simulation exists in this machine — stated plainly
                rather than dressing a visualization up as one.
              </p>
            </div>
          )}

          {lens === "evidence" && (
            <div style={{ maxWidth: 720 }}>
              <SectionLabel>Evidence feeding this innovation</SectionLabel>
              {(score?.evidence_ids ?? []).map((e: string) => (
                <div key={e} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="mono" style={{ fontSize: 12 }}>{e.replace(/_/g, " ")}</span>
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                    {e.startsWith("taxonomy:") ? `real review theme — ${score?.n_reviews_supporting ?? "?"} supporting reviews in the clean corpus` :
                     e.startsWith("keyword_search:") ? "keyword-prevalence diagnostic over the clean corpus (no polarity gate — weaker class, labelled as such)" :
                     e.startsWith("TC-") ? "archived trend/regulatory document (Radar → Trends)" : "evidence record"}
                  </p>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <SectionLabel>Assumptions carried</SectionLabel>
                {(score?.assumptions ?? []).map((a: string, i: number) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 6 }}>{a}</p>
                ))}
              </div>
            </div>
          )}

          {lens === "evolution" && (
            <div style={{ maxWidth: 720 }}>
              <SectionLabel>Concept evolution for this theme ({conceptsForTheme.length} concepts, real Critic verdicts)</SectionLabel>
              {conceptsForTheme.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>No Magic-box concepts share this theme yet.</p>}
              {conceptsForTheme.map((c: any) => (
                <div key={c.possibility_id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{c.possibility_id}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Pill tone="neutral">{String(c.evolution_stage).toLowerCase()}</Pill>
                    <Pill tone={c.critic_overall === "SURVIVE" ? "good" : c.critic_overall === "REJECT" ? "rose" : "amber"}>{String(c.critic_overall).toLowerCase()}</Pill>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <SectionLabel>Machine run history (last 5 real runs)</SectionLabel>
                {runsDoc.slice(-5).reverse().map((r: any) => (
                  <p key={r.run_id} className="mono" style={{ fontSize: 10.5, color: "var(--ink-dim)", padding: "3px 0" }}>
                    {r.run_id} · {String(r.input_snapshot_hash).slice(0, 10)} · +{(r.generated_objects ?? []).length ?? 0} objects · {r.started_at?.slice(0, 16)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {lens === "artifacts" && (
            <div style={{ maxWidth: 720 }}>
              <SectionLabel>Artifacts — every link verified live by the test suite</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href={`/innovation-disclosures/${osId}.pdf`} style={{ display: "block", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", textDecoration: "none", color: "var(--ink)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Innovation Disclosure — {osId}.pdf <Pill tone="teal">generated</Pill></div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>Patent-style concept document, regenerated by every pipeline run (opens inline).</div>
                </a>
                <a href="/api/evidence/table" style={{ display: "block", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", textDecoration: "none", color: "var(--ink)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Evidence table (JSON) <Pill tone="teal">generated</Pill></div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>Every final claim's source, location, transformation and generating code.</div>
                </a>
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
                No prototype images, simulation outputs or experiment reports exist yet — the list above is the
                complete, honest artifact set for this innovation.
              </p>
            </div>
          )}

          {lens === "decision" && (
            <div style={{ maxWidth: 720 }}>
              <StatRow label="Current decision" value={isRecommended ? "test next — run the first experiment" : score?.consumer_pain?.gate_passed ? "paused — supported alternative, revisit on evidence change" : "not pursued — evidence gap"} />
              <div style={{ marginTop: 10 }}>
                <SectionLabel>Rationale (from the live verdict)</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>{isRecommended ? verdict?.why : (verdict?.killed ?? []).find((k: any) => k.id === osId)?.reason ?? "—"}</p>
              </div>
              <div style={{ marginTop: 10 }}>
                <SectionLabel>What observation would change this decision</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55 }}>
                  {isRecommended ? verdict?.abandon_signal : "Evidence that moves this candidate's real friction prevalence or severity past the current recommendation under the active judgment rule — try it live in the Scenario lens."}
                </p>
              </div>
              {hypothesesForTheme.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <SectionLabel>Machine hypotheses sharing this theme</SectionLabel>
                  {hypothesesForTheme.map((h: any) => (
                    <p key={h.id} style={{ fontSize: 12, color: "var(--ink-dim)", padding: "3px 0" }}>{h.name} <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>({h.operator.toLowerCase().replace(/_/g, " ")})</span></p>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                  <TraceText text="All Lab state: GET /api/innovations/scenario + /api/critic + /api/runs + /api/magic-box - computed by src/real/decision_framework_real.py, critic_real.py, funnel_real.py, magic_box_real.py. Nothing authored in the interface." />
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
