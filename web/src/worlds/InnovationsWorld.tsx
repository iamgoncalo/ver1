import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { InnovationsResponse } from "../lib/types";
import { Pill, StatRow, MiniBar, SectionLabel, DistilledRawToggle, type ViewMode } from "../components/ui";

const PRIORITIES = [
  { key: "pain_feasibility_majority", label: "Pain + Feasibility majority (default)" },
  { key: "economic_value_override", label: "Economic Value override" },
];

export function InnovationsWorld({ onData }: { onData: (d: InnovationsResponse) => void }) {
  const [data, setData] = useState<InnovationsResponse | null>(null);
  const [priority, setPriority] = useState("pain_feasibility_majority");
  const [baseline, setBaseline] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ViewMode>("distilled");

  useEffect(() => {
    setLoading(true);
    api.innovationsScenario("mordor", priority).then((d) => {
      setData(d);
      onData(d);
      if (baseline === null) setBaseline(d.verdict.recommended);
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority]);

  const ids = data ? Object.keys(data.scores) : [];
  const maxEcon = data ? Math.max(...ids.map((id) => data.scores[id].economic_value ?? 0), 1) : 1;
  const maxPain = data ? Math.max(...ids.map((id) => Math.abs(data.scores[id].consumer_pain.severity_csat ?? 0)), 1) : 1;
  const winnerId = data?.verdict.recommended;
  const changed = baseline !== null && winnerId !== null && baseline !== winnerId;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            5 · WHAT WINS — WHAT SHOULD VERSUNI TEST?
          </div>
          <h1 style={{ fontSize: 30 }}>What Wins?</h1>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: -4, marginBottom: 8 }}>BETS</div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
            {PRIORITIES.map((p) => (
              <button key={p.key} onClick={() => setPriority(p.key)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                  background: priority === p.key ? "var(--surface)" : "transparent", fontWeight: priority === p.key ? 600 : 400,
                  boxShadow: priority === p.key ? "var(--shadow)" : "none", maxWidth: 220 }}>
                {p.label}
              </button>
            ))}
          </div>
          <DistilledRawToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {changed && (
        <div style={{ marginBottom: 10, fontSize: 12.5, color: "var(--amber)", background: "rgba(185,112,42,0.1)", border: "1px solid rgba(185,112,42,0.3)", borderRadius: 10, padding: "8px 14px" }}>
          WINNER CHANGED — baseline {baseline} → now {winnerId}. This decision priority genuinely flips the recommendation.
        </div>
      )}

      <div className="scrollY" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignContent: "start", opacity: loading ? 0.6 : 1 }}>
        {ids.map((id) => {
          const s = data!.scores[id];
          const isWinner = id === winnerId;
          return (
            <div key={id} style={{
              background: "var(--surface)", borderRadius: 16, padding: 20,
              border: "1px solid", borderColor: isWinner ? "var(--accent-blue)" : "var(--line)",
              boxShadow: isWinner ? "var(--shadow)" : "none",
            }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <Pill tone={isWinner ? "good" : s.consumer_pain.gate_passed ? "neutral" : "rose"}>
                  {isWinner ? "CURRENT WINNER" : s.consumer_pain.gate_passed ? "ALTERNATIVE" : "GATE FAILED"}
                </Pill>
                <Pill>{id}</Pill>
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 10, lineHeight: 1.3 }}>{s.name}</h3>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 14, lineHeight: 1.5 }}>{s.friction}</p>

              {s.consumer_pain.gate_passed ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Consumer Pain (CSAT)</span><span className="mono">{s.consumer_pain.severity_csat}</span>
                    </div>
                    <MiniBar value={s.consumer_pain.severity_csat ?? 0} max={maxPain} tone="rose" />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Economic Value (price-weighted exposure)</span><span className="mono">${(s.economic_value ?? 0).toLocaleString()}</span>
                    </div>
                    <MiniBar value={s.economic_value ?? 0} max={maxEcon} tone="teal" />
                    <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>
                      Sum of real listed prices across reviews affected by this friction — a relative
                      indicator of which friction touches pricier products, not a revenue or market-size estimate.
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: 8, padding: "8px 12px", background: "rgba(166,67,63,0.08)", border: "1px solid rgba(166,67,63,0.25)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.5 }}>
                    {s.decision_reason ?? "Consumer Pain evidence-sufficiency gate failed — no real CSAT signal exists for this theme."}
                  </div>
                </div>
              )}
              <StatRow label="Feasibility (2–5yr)" value={`${s.feasibility_2_5y.rating} (rank ${s.feasibility_2_5y.rank})`} />
              <StatRow label="Reviews supporting" value={s.n_reviews_supporting} />

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Feasibility rationale</SectionLabel>
                <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{s.feasibility_2_5y.rationale}</p>
              </div>
              {mode === "raw" && (
                <>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <SectionLabel>Assumptions</SectionLabel>
                    {s.assumptions.map((a, i) => <p key={i} style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 4 }}>• {a}</p>)}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <SectionLabel>Uncertainty</SectionLabel>
                    {s.uncertainty.map((u, i) => <p key={i} style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.5, marginBottom: 4 }}>• {u}</p>)}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <SectionLabel>Evidence IDs</SectionLabel>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>{s.evidence_ids.join(", ")}</div>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {!data && <div style={{ color: "var(--ink-faint)" }}>Computing live decision from real evidence…</div>}
      </div>

      {data && (
        <div style={{ flexShrink: 0, marginTop: 12, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 12, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>
          <b style={{ color: "var(--ink)" }}>Decision type: {data.verdict.decision_type}.</b> No overall innovation score — no candidate dominates on all
          three real dimensions. {data.verdict.why}
          {mode === "raw" && (
            <>
              <div style={{ marginTop: 10 }}><b style={{ color: "var(--ink)" }}>Sensitivity: </b>{data.verdict.sensitivity}</div>
              <div style={{ marginTop: 10 }}><b style={{ color: "var(--ink)" }}>First experiment: </b>{data.verdict.first_experiment}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: "var(--ink)" }}>Abandon signal: </b>{data.verdict.abandon_signal}</div>
              {data.verdict.killed.map((k) => (
                <div key={k.id} style={{ marginTop: 10 }}>
                  <b style={{ color: "var(--rose)" }}>Killed — {k.id}: </b>{k.reason}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
