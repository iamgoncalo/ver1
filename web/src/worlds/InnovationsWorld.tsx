import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { InnovationsResponse } from "../lib/types";
import { Pill, StatRow, MiniBar, SectionLabel, DistilledRawToggle, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { traceBetChain } from "../lib/trace";
import { TraceTree, TraceLegend } from "../components/TraceTree";
import { FrictionIcon } from "../components/ThemeIcon";

function themeFromEvidenceIds(evidenceIds: string[]): string | null {
  const tax = evidenceIds.find((id) => id.startsWith("taxonomy:"));
  return tax ? tax.split(":")[1] : null;
}

const DEFAULT_PRIORITY = "pain_feasibility_majority";
const PRIORITIES = [
  { key: DEFAULT_PRIORITY, label: "Pain + Feasibility majority (default)" },
  { key: "economic_value_override", label: "Economic Value override" },
];

type FetchStatus = "loading" | "success" | "empty" | "error" | "timeout";
const TIMEOUT_MS = 15000;

export function InnovationsWorld({ onData }: { onData: (d: InnovationsResponse) => void }) {
  const [data, setData] = useState<InnovationsResponse | null>(null);
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [signals, setSignals] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [tensions, setTensions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any>(null);
  const [traceId, setTraceId] = useState<string | null>(null);

  useEffect(() => { api.signals().then((r) => setSignals(r.signals)).catch(() => {}); }, []);
  useEffect(() => { api.research().then(setResearch).catch(() => {}); }, []);
  useEffect(() => { api.researchTensions().then((r) => setTensions(r.tensions ?? [])).catch(() => {}); }, []);
  useEffect(() => { api.criteria().then(setCriteria).catch(() => {}); }, []);

  // Baseline is fetched ONCE, independently of whatever priority the user is
  // currently toggling to - if it were set from "whichever priority request
  // resolves first", a fast toggle before the default request lands would
  // set baseline from the OVERRIDE result instead, making baseline===winnerId
  // and permanently hiding the WINNER CHANGED banner.
  useEffect(() => {
    api.innovationsScenario("mordor", DEFAULT_PRIORITY).then((d) => setBaseline(d.verdict.recommended)).catch(() => {});
  }, []);

  useEffect(() => {
    let stale = false;
    setStatus("loading");
    const timeoutId = setTimeout(() => { if (!stale) setStatus("timeout"); }, TIMEOUT_MS);
    api.innovationsScenario("mordor", priority).then((d) => {
      if (stale) return; // a newer request for a different priority already landed - ignore this out-of-order response
      clearTimeout(timeoutId);
      setData(d);
      onData(d);
      setStatus(Object.keys(d.scores ?? {}).length > 0 ? "success" : "empty");
    }).catch(() => {
      if (stale) return;
      clearTimeout(timeoutId);
      setStatus("error");
    });
    return () => { stale = true; clearTimeout(timeoutId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority]);

  const loading = status === "loading";
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
            5 · WHAT'S NEXT — WHAT SHOULD VERSUNI TEST?
          </div>
          <h1 style={{ fontSize: 30 }}>Innovations</h1>
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

      {status === "loading" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13 }}>
          Computing live decision from real evidence…
        </div>
      )}
      {status === "empty" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>
          No candidates cleared the evidence gate for this scenario — the decision engine ran but found nothing to recommend.
        </div>
      )}
      {status === "error" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--rose)", fontSize: 13, textAlign: "center", padding: 20 }}>
          <div>Couldn't load the live decision — the API request failed.</div>
          <button onClick={() => setPriority((p) => p)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--rose)", background: "transparent", color: "var(--rose)", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}
      {status === "timeout" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--amber)", fontSize: 13, textAlign: "center", padding: 20 }}>
          <div>Still no response after {TIMEOUT_MS / 1000}s — the live decision engine may be stuck.</div>
          <button onClick={() => setPriority((p) => p)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--amber)", background: "transparent", color: "var(--amber)", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}
      {status === "success" && (
      <div className="scrollY" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignContent: "start" }}>
        {ids.map((id) => {
          const s = data!.scores[id];
          const isWinner = id === winnerId;
          return (
            <div key={id} style={{
              background: "var(--surface)", borderRadius: 16, padding: 20,
              border: "1px solid", borderColor: isWinner ? "var(--accent-blue)" : "var(--line)",
              boxShadow: isWinner ? "var(--shadow)" : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill tone={isWinner ? "good" : s.consumer_pain.gate_passed ? "neutral" : "rose"}>
                    {isWinner ? "CURRENT WINNER" : s.consumer_pain.gate_passed ? "ALTERNATIVE" : "GATE FAILED"}
                  </Pill>
                  {mode === "raw" && <Pill>{id}</Pill>}
                </div>
                {themeFromEvidenceIds(s.evidence_ids) && <FrictionIcon theme={themeFromEvidenceIds(s.evidence_ids)!} size={32} />}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6, lineHeight: 1.3 }}>{s.name}</h3>

              {s.typical_market_price_usd != null && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    ${s.typical_market_price_usd.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    typical real price in this segment today (median of {s.typical_market_price_n_products} real products)
                  </span>
                </div>
              )}

              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 14, lineHeight: 1.5 }}>{s.friction}</p>

              {s.consumer_pain.gate_passed ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Consumer Pain (CSAT)</span><span className="mono">{s.consumer_pain.severity_csat}</span>
                    </div>
                    <MiniBar value={s.consumer_pain.severity_csat ?? 0} max={maxPain} tone="rose" />
                    {s.consumer_pain.methodology && (
                      <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>
                        WHO: real Amazon.com customers ({s.consumer_pain.methodology.pct_verified_purchase}% verified
                        purchase) · HOW MANY: {s.consumer_pain.methodology.n_reviews} reviews across{" "}
                        {s.consumer_pain.methodology.n_distinct_products} real products · WHEN:{" "}
                        {s.consumer_pain.methodology.review_date_range?.[0]}–{s.consumer_pain.methodology.review_date_range?.[1]} ·
                        WHAT STUDIES: none — this is deterministic keyword classification of real review text, not a survey or panel.
                      </p>
                    )}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Market exposure (price-weighted)</span><span className="mono">${(s.economic_value ?? 0).toLocaleString()}</span>
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
                  <button onClick={() => setTraceId(id)}
                    style={{ marginTop: 12, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                    TRACE THIS INNOVATION →
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      )}

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

      <FocusPanel open={!!traceId} onClose={() => setTraceId(null)} eyebrow="Trace this bet — evidence, theme, and every concept built on it" title={traceId ? data?.scores[traceId]?.name ?? traceId : ""}>
        {traceId && data && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Every edge below is a genuine cross-reference already present in the real data — signal → paper,
              tension → paper, assumption → paper, and every Magic Box concept that argues from this bet's same
              real friction theme (joined by theme_id, never by name). Where no link exists, it says so.
            </p>
            <TraceLegend />
            <TraceTree nodes={[traceBetChain(
              traceId, data.scores[traceId], themeFromEvidenceIds(data.scores[traceId].evidence_ids),
              { signals, research, tensions, assumptions: criteria?.assumptions ?? [], concepts: criteria?.concepts ?? [] }
            )]} />
          </>
        )}
      </FocusPanel>
    </div>
  );
}
