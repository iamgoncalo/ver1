import { useEffect, useMemo, useRef, useState } from "react";
import { getParam, useUrlParam } from "../lib/urlState";
import { api } from "../lib/api";
import type { InnovationsResponse } from "../lib/types";
import { Pill, StatRow, MiniBar, SectionLabel, DistilledRawToggle, CompactInspector, CompactRow, type ViewMode } from "../components/ui";
import { DataTable, type Column, type GroupOption } from "../components/DataTable";
import { FocusPanel } from "../components/FocusPanel";
import { Lab } from "../components/Lab";
import { traceBetChain } from "../lib/trace";
import { TraceTree, TraceLegend } from "../components/TraceTree";
import { FrictionIcon } from "../components/ThemeIcon";

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

// --- Innovation list table: helpers -----------------------------------
// Sentence-case a raw snake_case value for display (e.g. "ready_to_test"
// -> "Ready to test") — never show raw snake_case or ALL-CAPS to the user.
function sentenceCase(s: string): string {
  if (!s) return "—";
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function stateTone(state: string | undefined): "good" | "rose" | "amber" | "neutral" {
  if (state === "developing" || state === "ready_to_test") return "good";
  if (state === "rejected") return "rose";
  if (state === "challenged") return "amber";
  return "neutral";
}

// The "need" a row addresses is the taxonomy tag carried in its own real
// evidence_ids (e.g. "taxonomy:reliability" -> "reliability") — the exact
// same theme the formal-case cards below derive via themeFromEvidenceIds.
// Archived rows don't carry evidence_ids (see build_archive_list in
// innovations_real.py) but do carry the theme directly as
// previous_evidence.friction_theme — both are real, neither is invented.
function needTheme(row: any): string | null {
  const fromEvidence = themeFromEvidenceIds(row.evidence_ids ?? []);
  if (fromEvidence) return fromEvidence;
  return row.previous_evidence?.friction_theme ?? null;
}

// Real evidence-item count: the innovation's own evidence_ids minus the
// leading taxonomy tag (which names the theme, not a piece of evidence).
// Archived rows fall back to their previous_evidence.source_evidence_ids —
// the one real evidence-shaped field that survives archival.
function evidenceCount(row: any): number {
  const ids: string[] = row.evidence_ids ?? row.previous_evidence?.source_evidence_ids ?? [];
  return ids.filter((id) => !id.startsWith("taxonomy:")).length;
}

// critic_dimensions: 8 named per-innovation gates (decision_framework_real.py
// / criteria_real.py lineage), each SURVIVE/CHALLENGE/NEEDS_EVIDENCE/REJECT —
// genuinely present at the innovation-object level, not fabricated.
const GATE_LABEL: Record<string, string> = {
  EVIDENCE: "Evid", ECONOMIC: "Econ", COMPETITIVE: "Comp", HUMAN: "Human",
  PHYSICAL: "Phys", VERSUNI_FIT: "Fit", TIMING: "Timing", ROBUSTNESS: "Robust",
};
const GATE_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  SURVIVE: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", REJECT: "rose",
};

const innovationColumns: Column<any>[] = [
  {
    key: "name",
    label: "Innovation",
    render: (row) => row.name ?? row.innovation_id,
    sortValue: (row) => row.name ?? row.innovation_id,
    width: "220px",
  },
  {
    key: "state",
    label: "State",
    render: (row) => <Pill tone={stateTone(row.state)}>{sentenceCase(row.state)}</Pill>,
    sortValue: (row) => row.state ?? "",
    width: "130px",
  },
  {
    key: "need",
    label: "Need",
    render: (row) => { const t = needTheme(row); return t ? sentenceCase(t) : "—"; },
    sortValue: (row) => needTheme(row) ?? "",
    width: "160px",
  },
  {
    key: "domain",
    label: "Domain",
    render: (row) => (row.target_category ? sentenceCase(row.target_category) : "—"),
    sortValue: (row) => row.target_category ?? "",
    width: "150px",
  },
  {
    key: "evidence",
    label: "Evidence",
    render: (row) => { const n = evidenceCount(row); return n > 0 ? `${n} evidence item${n === 1 ? "" : "s"}` : "—"; },
    sortValue: (row) => evidenceCount(row),
    width: "150px",
  },
  {
    key: "gates",
    label: "Gates",
    render: (row) => {
      const dims = row.critic_dimensions;
      if (!dims) return "—";
      return (
        <div style={{ display: "flex", gap: 3 }}>
          {Object.entries(dims).map(([k, v]: [string, any]) => (
            <span key={k} title={`${sentenceCase(k)}: ${v.verdict}${v.reasoning ? " — " + v.reasoning : ""}`}>
              <Pill tone={GATE_TONE[v.verdict] ?? "neutral"}>{GATE_LABEL[k] ?? sentenceCase(k)}</Pill>
            </span>
          ))}
        </div>
      );
    },
    width: "400px",
  },
  {
    key: "economic_value",
    label: "Economic value",
    render: (row) => (row.economics?.price_weighted_exposure_usd != null
      ? `$${row.economics.price_weighted_exposure_usd.toLocaleString()}` : "—"),
    sortValue: (row) => row.economics?.price_weighted_exposure_usd ?? null,
    align: "right",
    width: "140px",
  },
];

const innovationGroupOptions: GroupOption<any>[] = [
  { key: "state", label: "State", groupValue: (row) => sentenceCase(row.state ?? "") },
  { key: "need", label: "Need", groupValue: (row) => { const t = needTheme(row); return t ? sentenceCase(t) : ""; } },
  { key: "domain", label: "Domain", groupValue: (row) => (row.target_category ? sentenceCase(row.target_category) : "") },
];
// --- end innovation list table helpers ----------------------------------

function truncate(s: string | undefined, n: number): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const ENV_LABEL: Record<string, string> = {
  performance_cadr_m3h: "clean-air delivery rate (CADR)", room_coverage_m2: "room coverage",
  acoustic_min_dba: "minimum noise", target_mass_kg: "target mass", target_power_w: "target power",
  target_dimensions: "target dimensions", reference_market_price_usd: "reference market price",
};

function InnovationDetail({ i, navigate }: { i: any; navigate?: (n: number, params?: Record<string, string>) => void }) {
  const env = i.engineering_envelope ?? {};
  const dossier = (i.artifacts ?? []).find((a: any) => a.kind === "innovation_dossier");
  return (
    <div data-testid="innovation-detail">
      <CompactInspector
        summary={[
          { label: "Current state", value: <span title={i.why_here?.reality}>{truncate(i.why_here?.reality, 70)}</span> },
          { label: "Desired state", value: <span title={i.why_here?.product_consequence}>{truncate(i.why_here?.product_consequence, 70)}</span> },
          { label: "Problem", value: <span title={i.problem}>{truncate(i.problem, 60)}</span> },
          { label: "Theme", value: i.name?.split(" ").slice(0, 4).join(" ") ?? "—" },
          { label: "Mechanism", value: i.mechanism?.operator ?? "—" },
          { label: "State", value: <>{String(i.state).replace(/_/g, " ")}</> },
        ]}
        tabs={[
          {
            key: "physical", label: "Physical",
            content: (
              <div>
                <img src={`/concept-visuals/${i.innovation_id.replace(":", "_")}.svg`} alt={`${i.name} concept schematic`}
                  style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)", background: "white", marginBottom: 8 }} />
                {Object.entries(env).map(([k, v]: [string, any]) => {
                  if (typeof v === "string") return <CompactRow key={k} label={k.replace(/_/g, " ")} value={v} />;
                  if (!v || typeof v !== "object") return null;
                  const label = ENV_LABEL[k] ?? k.replace(/_/g, " ");
                  if (v.epistemic_type === "OBSERVED_COMPARABLE") return <CompactRow key={k} label={label} value={`${v.min}–${v.max} ${v.unit} (n=${v.n_comparables})`} />;
                  if (v.epistemic_type === "REFERENCE_MARKET_PRICE") return <CompactRow key={k} label={label} value={`median $${v.median} (${v.n_comparables} products)`} />;
                  return <CompactRow key={k} label={label} value="unknown — no comparable publishes this" />;
                })}
              </div>
            ),
          },
          {
            key: "causality", label: "Causality",
            content: (
              <div>
                <CompactRow label="Reality" value={i.why_here?.reality} title={i.why_here?.reality} />
                <CompactRow label="Transformation" value={i.why_here?.transformation} title={i.why_here?.transformation} />
                <CompactRow label="Consequence" value={i.why_here?.product_consequence} title={i.why_here?.product_consequence} />
                <CompactRow label="Who / where" value={i.target_user_context?.evidence_based} title={i.target_user_context?.evidence_based} />
                <CompactRow label="Persona" value={i.target_user_context?.persona} title={i.target_user_context?.persona} />
              </div>
            ),
          },
          {
            key: "evidence", label: "Evidence",
            content: (
              <div>
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
                {(i.uncertainties ?? []).map((u: string, idx: number) => <CompactRow key={idx} label="Uncertainty" value={u} title={u} />)}
                {i.contradictions && <CompactRow label="Contradiction" value={i.contradictions} title={i.contradictions} />}
              </div>
            ),
          },
          {
            key: "decision", label: "Decision",
            content: (
              <div>
                <CompactRow label="Next experiment" value={i.next_experiment ?? "No machine-derivable next test for this state."} title={i.next_experiment} />
                <CompactRow label="Kill criterion" value={i.kill_criterion} title={i.kill_criterion} />
                <CompactRow label="Why this state" value={i.state_why} title={i.state_why} />
                {dossier && (
                  <a href={dossier.path} target="_blank" rel="noopener noreferrer"
                    title="The full 10-section dossier behind this summary - what it is, why it exists, the evidence, and what could kill it"
                    style={{
                      marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "9px 14px", borderRadius: 10, textDecoration: "none",
                      background: "linear-gradient(120deg, var(--accent-blue) 0%, var(--accent-teal) 100%)",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                    }}>
                    <DocIcon /> Read the full innovation dossier (PDF) →
                  </a>
                )}
              </div>
            ),
          },
          {
            key: "trace", label: "Trace",
            content: (
              <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                GET /api/innovation-objects — src/real/innovations_real.py; state rule is a labelled METHOD_CHOICE;
                run {String(i.run_history?.magic_run_input_sha256 ?? "").slice(0, 12)}. Concept visual is a machine-composed
                schematic from this innovation's own data, not a design rendering.
              </p>
            ),
          },
        ]}
      />
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
  // One table, every developed possibility as an ordinary row (state
  // distinguishes rejected; archived rows — genuinely a different real
  // data shape, see build_archive_list in innovations_real.py — get a real
  // state of "archived" and their innovation_id standing in for name, so
  // the row-click -> InnovationDetail path below never sees an undefined
  // .state to .replace() on).
  const allInnovationRows = useMemo(() => {
    if (!objects) return [];
    const archived = (objects.archived_innovations ?? []).map((a: any) => ({ ...a, name: a.innovation_id, state: "archived" }));
    return [...(objects.innovations ?? []), ...archived];
  }, [objects]);
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
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2 }}>
            Every idea the machine developed lives here with the state its own evidence earns; ideas no
            rival concept beats on every measure ("non-dominated") stay in the running. The formal case's
            three evaluated bets follow below — each opens a full Lab.
          </p>
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
          <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 10, lineHeight: 1.5, maxWidth: 760 }}>
            {objects.innovations.length} developed possibilities from the Magic box, each in the state its own
            evidence and Critic verdict earn (<span className="mono" style={{ fontSize: 10.5 }}>method rule, never a tournament</span>) —
            the formal case's evaluated bets and recommendation follow separately below.
          </div>
          {objects.new_this_run_note && (
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 10, lineHeight: 1.4 }}>
              {objects.new_this_run_note}
            </div>
          )}
          <DataTable
            rows={allInnovationRows}
            columns={innovationColumns}
            getRowId={(row) => row.innovation_id}
            onRowClick={(row) => setInnovFocus(row)}
            groupOptions={innovationGroupOptions}
            defaultGroupKey="state"
            searchable
            searchValue={(row) => row.name ?? row.innovation_id}
            emptyMessage="No developed possibilities yet."
          />
          {(objects.archived_innovations ?? []).length > 0 && (
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.4 }}>
              Includes {objects.archived_innovations.length} archived — rejected, superseded, or stale past the
              grace period; left the active population but kept visible here, never deleted (state "Archived").
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 12px" }}>
        <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.04em", color: "var(--accent-blue-ink)", fontWeight: 700 }}>
          Formal case recommendation
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
          the Air case's three evaluated bets — separate from the population above
        </span>
      </div>

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
                    comparable market median — what {s.typical_market_price_n_products} real products in this segment cost today, never a proposed price for this concept
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
                      Sum of real listed prices on affected reviews — a relative indicator, not a revenue estimate.
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
        eyebrow={innovFocus ? `${innovFocus.state.replace(/_/g, " ")} · ${innovFocus.target_category}` : ""}
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
