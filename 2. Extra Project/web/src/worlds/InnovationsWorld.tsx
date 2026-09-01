import { useEffect, useRef, useState } from "react";
import { getParam, useUrlParam } from "../lib/urlState";
import { api } from "../lib/api";
import type { InnovationsResponse } from "../lib/types";
import { Pill, StatRow, MiniBar, SectionLabel, DistilledRawToggle, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { Lab } from "../components/Lab";
import { traceBetChain } from "../lib/trace";
import { TraceTree, TraceLegend } from "../components/TraceTree";
import { FrictionIcon } from "../components/ThemeIcon";
import { toSentence } from "../lib/text";

function DocIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <path d="M6 2.5H14L19 7.5V21.5H6 Z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <path d="M14 2.5V7.5H19" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <line x1="9" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <line x1="9" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function themeFromEvidenceIds(evidenceIds: string[]): string | null {
  const tax = evidenceIds.find((id) => id.startsWith("taxonomy:"));
  return tax ? tax.split(":")[1] : null;
}

const DEFAULT_PRIORITY = "pain_feasibility_majority";
const PRIORITIES = [
  { key: DEFAULT_PRIORITY, label: "Pain + Feasibility majority (default)" },
  { key: "economic_value_override", label: "Economic Value override" },
];
const DECISION_TYPE_LABEL: Record<string, string> = {
  DOMINANT: "Dominates on all three measures",
  NON_DOMINATED_PLUS_JUDGMENT: "Judgment call",
};

type FetchStatus = "loading" | "success" | "empty" | "error" | "timeout";
const TIMEOUT_MS = 15000;

function InnovationCard({ i, onOpen }: { i: any; onOpen: () => void }) {
  const env = i.engineering_envelope ?? {};
  const cadr = env.performance_cadr_m3h;
  return (
    <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 12, cursor: "pointer" }}>
      <img src={`/concept-visuals/${i.innovation_id.replace(":", "_")}.svg`} alt={`${i.name} concept schematic`}
        style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)", marginBottom: 8, background: "white" }} />
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={i.name}>{i.name}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
        <Pill tone={i.state === "developing" || i.state === "ready_to_test" ? "good" : i.state === "rejected" ? "rose" : i.state === "challenged" ? "amber" : "neutral"}>{i.state.replace(/_/g, " ")}</Pill>
        <Pill tone="neutral">{i.prototype_state === "CONCEPT_VISUAL" ? "concept visual" : "no prototype"}</Pill>
        {i.lifecycle && i.lifecycle !== "active" && (
          <span title="Registry-derived lifecycle — data/processed/innovation_registry.json">
            <Pill tone={i.lifecycle === "new" ? "good" : i.lifecycle === "rejected" || i.lifecycle === "superseded" ? "rose" : "neutral"}>
              {i.lifecycle}
            </Pill>
          </span>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.4 }}>
        {cadr?.epistemic_type === "OBSERVED_COMPARABLE" ? `comparables: ${cadr.min}–${cadr.max} ${cadr.unit} (n=${cadr.n_comparables})` : "envelope: comparables pending"}
      </div>
    </div>
  );
}

function InnovationDetail({ i, navigate }: { i: any; navigate?: (n: number, params?: Record<string, string>) => void }) {
  const env = i.engineering_envelope ?? {};
  return (
    <div data-testid="innovation-detail">
      <img src={`/concept-visuals/${i.innovation_id.replace(":", "_")}.svg`} alt={`${i.name} concept schematic`}
        style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", background: "white", marginBottom: 6 }} />
      <p style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 12 }}>
        Concept visual — machine-composed schematic from this innovation's own data, not a design rendering.
      </p>

      <SectionLabel>What is it?</SectionLabel>
      <p style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5, marginBottom: 10 }}>{i.proposition}</p>

      <SectionLabel>Why does it exist?</SectionLabel>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}><b>Reality:</b> {i.why_here?.reality}</p>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 4 }}><b>Transformation:</b> {i.why_here?.transformation}</p>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 4, marginBottom: 10 }}><b>Consequence:</b> {i.why_here?.product_consequence}</p>

      <SectionLabel>Who / where (only what evidence supports)</SectionLabel>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{i.target_user_context?.evidence_based}</p>
      <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4, marginBottom: 10 }}>{i.target_user_context?.persona}</p>

      <SectionLabel>How big / heavy / expensive might it be?</SectionLabel>
      {Object.entries(env).map(([k, v]: [string, any]) => {
        if (typeof v === "string") return <p key={k} style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4 }}>{v}</p>;
        if (!v || typeof v !== "object") return null;
        const ENV_LABEL: Record<string, string> = {
          performance_cadr_m3h: "clean-air delivery rate (CADR)", room_coverage_m2: "room coverage",
          acoustic_min_dba: "minimum noise", target_mass_kg: "target mass", target_power_w: "target power",
          target_dimensions: "target dimensions", reference_market_price_usd: "reference market price",
        };
        const label = ENV_LABEL[k] ?? k.replace(/_/g, " ");
        if (v.epistemic_type === "OBSERVED_COMPARABLE") return <StatRow key={k} label={`${label} (observed, n=${v.n_comparables})`} value={`${v.min}–${v.max} ${v.unit}`} />;
        if (v.epistemic_type === "REFERENCE_MARKET_PRICE") return <StatRow key={k} label={`${label} (reference)`} value={`median $${v.median} (${v.n_comparables} products)`} />;
        return <StatRow key={k} label={label} value="unknown — no comparable publishes this" />;
      })}
      <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4, margin: "4px 0 10px" }}>{i.target_price_range?.note}</p>

      <SectionLabel>Evidence behind it</SectionLabel>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 6 }}>{i.problem}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {(i.parent_path_ids ?? []).map((pid: string) => (
          <button key={pid} onClick={() => navigate?.(3, { path: pid })} className="mono"
            style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", color: "var(--ink-dim)" }}>
            {pid} →
          </button>
        ))}
        {(i.evidence_ids ?? []).filter((e: string) => e.startsWith("RP-")).map((rid: string) => (
          <button key={rid} onClick={() => navigate?.(2, { paper: rid })} className="mono"
            style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", color: "var(--accent-blue-ink)" }}>
            {rid} →
          </button>
        ))}
        <button onClick={() => navigate?.(4, { possibility: i.innovation_id })} className="mono"
          style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--accent-blue)", background: "var(--surface)", cursor: "pointer", color: "var(--accent-blue-ink)" }}>
          magic possibility →
        </button>
      </div>

      <SectionLabel>Estimated vs unknown</SectionLabel>
      {(i.uncertainties ?? []).map((u: string, idx: number) => (
        <p key={idx} style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.45, marginBottom: 4 }}>{u}</p>
      ))}
      {i.contradictions && <p style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.45, marginBottom: 10 }}>Contradiction: {i.contradictions}</p>}

      <SectionLabel>What should be tested next?</SectionLabel>
      <p style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{i.next_experiment ?? "No machine-derivable next test for this state."}</p>
      <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.45, marginTop: 4, marginBottom: 10 }}>{i.kill_criterion}</p>
      <p style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.45, marginBottom: 10 }}><b>State:</b> {i.state.replace(/_/g, " ")} — {i.state_why}</p>

      {(i.artifacts ?? []).filter((a: any) => a.kind === "innovation_dossier").map((a: any) => (
        <a key={a.id} href={a.path} target="_blank" rel="noopener noreferrer"
          title="The full 10-section dossier behind this page's summary - what it is, why it exists, the evidence, and what could kill it"
          style={{
            marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 14px", borderRadius: 10, textDecoration: "none",
            background: "linear-gradient(120deg, var(--accent-blue) 0%, var(--accent-teal) 100%)",
            color: "#fff", fontSize: 12, fontWeight: 700,
          }}>
          <DocIcon /> Read the full innovation dossier (PDF) →
        </a>
      ))}
      <p className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
        GET /api/innovation-objects — src/real/innovations_real.py; state rule is a labelled METHOD_CHOICE;
        run {String(i.run_history?.magic_run_input_sha256 ?? "").slice(0, 12)}
      </p>
    </div>
  );
}

export function InnovationsWorld({ onData, onGoToWorld }: { onData: (d: InnovationsResponse) => void; onGoToWorld?: (n: number, params?: Record<string, string>) => void }) {
  const [data, setData] = useState<InnovationsResponse | null>(null);
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [signals, setSignals] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [tensions, setTensions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const deepLinkApplied = useRef(false);
  const [labId, setLabId] = useState<string | null>(null);
  // The developed-possibility population (Pass 3) - one Innovation per
  // Magic possibility, mechanical states, formal case kept separate.
  const [objects, setObjects] = useState<any>(null);
  const [innovFocus, setInnovFocus] = useState<any>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    fetch("/api/innovation-objects").then((r) => r.json()).then((d) => {
      setObjects(d);
      const id = getParam("innovation");
      if (id && id.includes(":")) {
        const hit = d.innovations?.find((x: any) => x.innovation_id === id);
        if (hit) setInnovFocus(hit);
      }
    }).catch(() => setObjects(null));
  }, []);

  useEffect(() => { api.signals().then((r) => setSignals(r.signals)).catch(() => {}); }, []);
  useEffect(() => { api.research().then(setResearch).catch(() => {}); }, []);
  useEffect(() => { api.researchTensions().then((r) => setTensions(r.tensions ?? [])).catch(() => {}); }, []);
  useEffect(() => { api.criteria().then(setCriteria).catch(() => {}); }, []);

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
      // Deep links, applied once on first load: ?lab=<id> opens the Lab
      // (taking precedence), else ?innovation=<id> opens the trace panel.
      if (!deepLinkApplied.current) {
        deepLinkApplied.current = true;
        const lab = getParam("lab");
        const innovation = getParam("innovation");
        if (lab && d.scores?.[lab]) setLabId(lab);
        else if (innovation && d.scores?.[innovation]) setTraceId(innovation);
      }
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
  const maxPain = data ? Math.max(...ids.map((id) => data.scores[id].consumer_pain.severity_csat).filter((v): v is number => v != null).map(Math.abs), 1) : 1;
  const winnerId = data?.verdict.recommended;

  // Keep the URL a refresh-safe record of the open panel (lab wins).
  useUrlParam("lab", labId);
  useUrlParam("innovation", labId ? null : (traceId ?? innovFocus?.innovation_id ?? null));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            5 · Innovations — which possibilities are becoming serious?
          </div>
          <h1 style={{ fontSize: 24 }}>Innovations</h1>
          <details style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2, maxWidth: 640 }}>
            <summary style={{ cursor: "pointer" }}>Every idea lives in the state its evidence earns ▸</summary>
            <p style={{ marginTop: 4, lineHeight: 1.5 }}>
              Every idea the machine developed lives here with the state its own evidence earns; ideas no
              rival concept beats on every measure ("non-dominated") stay in the running. The formal case's
              three evaluated bets follow below — each opens a full Lab.
            </p>
          </details>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {onGoToWorld && (
            <button onClick={() => onGoToWorld(8)} title="The criteria library every concept is evaluated against"
              style={{ fontSize: 11.5, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", whiteSpace: "nowrap" }}>
              How the machine decides →
            </button>
          )}
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

      <div className="scrollY" style={{ flex: 1, minHeight: 0 }}>

      {objects && (
        <div style={{ marginBottom: 18 }} data-testid="innovation-population">
          <details style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 10, lineHeight: 1.5, maxWidth: 760 }}>
            <summary style={{ cursor: "pointer" }}>{objects.innovations.length} developed possibilities, each in its evidence-earned state ▸</summary>
            <p style={{ marginTop: 4 }}>
              {objects.innovations.length} developed possibilities from the Magic box, each in the state its own
              evidence and Critic verdict earn (<span className="mono" style={{ fontSize: 10.5 }}>method rule, never a tournament</span>) —
              the formal case's evaluated bets and recommendation follow separately below.
            </p>
          </details>
          {objects.new_this_run_note && (
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 10, lineHeight: 1.4 }}>
              {objects.new_this_run_note}
            </div>
          )}
          {(["ready_to_test", "developing", "grounded", "exploratory", "challenged", "paused"] as const).map((st) => {
            const group = objects.innovations.filter((i: any) => i.state === st);
            if (!group.length) return null;
            return (
              <div key={st} style={{ marginBottom: 12 }}>
                <SectionLabel>{st.replace(/_/g, " ")} · {group.length}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                  {group.map((i: any) => <InnovationCard key={i.innovation_id} i={i} onOpen={() => setInnovFocus(i)} />)}
                </div>
              </div>
            );
          })}
          {(() => {
            const rejected = objects.innovations.filter((i: any) => i.state === "rejected");
            if (!rejected.length) return null;
            return (
              <div style={{ marginBottom: 6 }}>
                <button onClick={() => setShowRejected((v) => !v)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                  {showRejected ? "▾" : "▸"} rejected · {rejected.length} — killed by the funnel or the Critic
                </button>
                {showRejected && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10, marginTop: 8 }}>
                    {rejected.map((i: any) => <InnovationCard key={i.innovation_id} i={i} onOpen={() => setInnovFocus(i)} />)}
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
            const archived = objects.archived_innovations ?? [];
            if (!archived.length) return null;
            return (
              <div style={{ marginBottom: 6 }} data-testid="innovation-archive">
                <button onClick={() => setShowArchived((v) => !v)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                  {showArchived ? "▾" : "▸"} archive · {archived.length} — left the population, never deleted
                </button>
                {showArchived && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginTop: 8 }}>
                    {archived.map((a: any) => (
                      <div key={a.innovation_id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 10 }}>
                        <div className="mono" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{a.innovation_id}</div>
                        <p style={{ fontSize: 10.5, color: "var(--ink-dim)", lineHeight: 1.4, marginBottom: 4 }}>{a.reason}</p>
                        <p style={{ fontSize: 9.5, color: "var(--ink-faint)", lineHeight: 1.4 }}>
                          {a.run_id} · {a.date ? new Date(a.date).toLocaleDateString() : "—"}
                          {a.successor_id && <> · superseded by <span className="mono">{a.successor_id}</span></>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 12px" }}>
        <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.04em", color: "var(--accent-blue-ink)", fontWeight: 700 }}>
          Formal case recommendation
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
          the Air case's three bets — kept separate
        </span>
      </div>

      {status === "loading" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13 }}>
          Computing live decision from real evidence…
        </div>
      )}
      {status === "empty" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>
          No candidates cleared the evidence gate — an honest zero.
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
          <div>No response after {TIMEOUT_MS / 1000}s — the engine may be stuck.</div>
          <button onClick={() => setPriority((p) => p)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--amber)", background: "transparent", color: "var(--amber)", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}
      {status === "success" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignContent: "start" }}>
        {ids.map((id) => {
          const s = data!.scores[id];
          const isWinner = id === winnerId;
          return (
            <div key={id} onClick={() => setTraceId(id)}
              title="Click to trace this bet back to its real evidence"
              style={{
                background: "var(--surface)", borderRadius: 16, padding: 20, cursor: "pointer",
                border: "1px solid", borderColor: isWinner ? "var(--accent-blue)" : "var(--line)",
                boxShadow: isWinner ? "var(--shadow)" : "none", transition: "border-color 120ms, box-shadow 120ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-teal)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = isWinner ? "var(--accent-blue)" : "var(--line)"; e.currentTarget.style.boxShadow = isWinner ? "var(--shadow)" : "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill tone={isWinner ? "good" : s.consumer_pain.gate_passed ? "neutral" : "rose"}>
                    {isWinner ? "Current recommendation" : s.consumer_pain.gate_passed ? "Supported alternative" : "Evidence gap — gate not met"}
                  </Pill>
                  {mode === "raw" && <Pill>{id}</Pill>}
                </div>
                {themeFromEvidenceIds(s.evidence_ids) && <FrictionIcon theme={themeFromEvidenceIds(s.evidence_ids)!} size={32} />}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={s.name}>{s.name}</h3>
              <button onClick={(e) => { e.stopPropagation(); setLabId(id); }}
                style={{ marginBottom: 10, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}>
                Open Lab →
              </button>

              {s.typical_market_price_usd != null && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    ${s.typical_market_price_usd.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    comparable market median of {s.typical_market_price_n_products} real products — not a proposed price
                  </span>
                </div>
              )}

              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 14, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={s.friction}>{s.friction}</p>

              {s.consumer_pain.gate_passed ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Consumer Pain (average rating gap ★)</span><span className="mono">{s.consumer_pain.severity_csat}</span>
                    </div>
                    {s.consumer_pain.severity_csat != null ? <MiniBar value={s.consumer_pain.severity_csat} max={maxPain} tone="rose" /> : <p style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>no measured rating-gap signal — evidence gap, not zero</p>}
                    {s.consumer_pain.methodology && (
                      <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}
                        title="Keyword-classified real Amazon review text, not a survey or panel.">
                        {s.consumer_pain.methodology.pct_verified_purchase}% verified purchase · {s.consumer_pain.methodology.n_reviews} reviews,{" "}
                        {s.consumer_pain.methodology.n_distinct_products} products · {s.consumer_pain.methodology.review_date_range?.[0]}–{s.consumer_pain.methodology.review_date_range?.[1]}
                      </p>
                    )}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                      <span>Market exposure (price-weighted)</span><span className="mono">{s.economic_value != null ? `$${s.economic_value.toLocaleString()}` : "unknown — no priced reviews"}</span>
                    </div>
                    <MiniBar value={s.economic_value ?? 0} max={maxEcon} tone="teal" />
                    <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>
                      Sum of listed prices — relative indicator, not revenue.
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: 8, padding: "8px 12px", background: "rgba(166,67,63,0.08)", border: "1px solid rgba(166,67,63,0.25)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    title={s.decision_reason ?? "Consumer Pain evidence-sufficiency gate failed — no real rating-gap signal exists for this theme."}>
                    {s.decision_reason ?? "Consumer Pain evidence-sufficiency gate failed — no real rating-gap signal exists for this theme."}
                  </div>
                </div>
              )}
              <StatRow label="Feasibility (2–5yr)" value={`${s.feasibility_2_5y.rating} · ${s.feasibility_2_5y.rank}/3 (3 = easiest to build)`} />
              <StatRow label="Reviews supporting" value={s.n_reviews_supporting} />

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Feasibility rationale</SectionLabel>
                <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={s.feasibility_2_5y.rationale}>{s.feasibility_2_5y.rationale}</p>
              </div>

              <a
                href={`/innovation-disclosures/${id}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="A patent-style write-up of this concept's real evidence, mechanism, and evaluation — generated entirely from this pipeline's own computed data"
                style={{
                  marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "9px 14px", borderRadius: 10, textDecoration: "none",
                  background: "linear-gradient(120deg, var(--accent-blue) 0%, var(--accent-teal) 100%)",
                  color: "#fff", fontSize: 12, fontWeight: 700,
                }}
              >
                <DocIcon /> Read the Innovation Disclosure (PDF) →
              </a>

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
                  <button onClick={(e) => { e.stopPropagation(); setTraceId(id); }}
                    style={{ marginTop: 12, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                    Trace this innovation →
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
          <b style={{ color: "var(--ink)" }}>{DECISION_TYPE_LABEL[data.verdict.decision_type] ?? data.verdict.decision_type}.</b>{" "}
          {data.verdict.why}
          {mode === "raw" && (
            <>
              <div style={{ marginTop: 10 }}><b style={{ color: "var(--ink)" }}>Sensitivity: </b>{data.verdict.sensitivity}</div>
              <div style={{ marginTop: 10 }}><b style={{ color: "var(--ink)" }}>First experiment: </b>{data.verdict.first_experiment}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: "var(--ink)" }}>Abandon signal: </b>{data.verdict.abandon_signal}</div>
              {data.verdict.killed.map((k) => (
                <div key={k.id} style={{ marginTop: 10 }}>
                  <b style={{ color: "var(--rose)" }}>Killed — {k.name}: </b>{k.reason}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      </div>

      <FocusPanel open={!!innovFocus} onClose={() => setInnovFocus(null)}
        eyebrow={innovFocus ? `${toSentence(innovFocus.state)} · ${toSentence(innovFocus.target_category)}` : ""}
        title={innovFocus?.name ?? ""}>
        {innovFocus && <InnovationDetail i={innovFocus} navigate={onGoToWorld} />}
      </FocusPanel>

      <FocusPanel open={!!traceId} onClose={() => setTraceId(null)} eyebrow="Trace this bet — evidence, theme, and every concept built on it" title={traceId ? data?.scores[traceId]?.name ?? traceId : ""}>
        {traceId && data && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Every edge below is real evidence, genuinely linked.
            </p>
            <TraceLegend />
            <TraceTree nodes={[traceBetChain(
              traceId, data.scores[traceId], themeFromEvidenceIds(data.scores[traceId].evidence_ids),
              { signals, research, tensions, assumptions: criteria?.assumptions ?? [], concepts: criteria?.concepts ?? [] }
            )]} />
          </>
        )}
      </FocusPanel>
      {labId && data && (
        <Lab osId={labId} score={data.scores[labId]} scores={data.scores} verdict={data.verdict} onClose={() => setLabId(null)} />
      )}
    </div>
  );
}
