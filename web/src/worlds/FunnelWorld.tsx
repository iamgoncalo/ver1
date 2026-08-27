import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { FamilyIcon } from "../components/ThemeIcon";

interface Stage {
  id: string; label: string; count: number;
  inputs?: string[]; outputs_to?: string[]; trace?: string; bet?: string;
  families?: Record<string, number>; pattern_type_counts?: Record<string, number>;
  concepts_evaluated?: number; verdict_counts?: Record<string, number>;
  verified_strategic_rivals?: number; parity_insight?: string;
  strongest_patterns?: { type: string; example: string }[];
  why_ideas_are_dying?: { name: string; reason: string }[];
  finalist_names?: string[];
  candidates_preview?: { id: string; name: string; friction_theme: string; typical_market_price_usd: number | null }[];
}
interface SignalFamily { count: number; ids: string[]; source: string; plus_research_grounded_signals?: string[] }
interface PatternInstance { id: string; name: string; parent_ids: string[]; detail: string }
interface FunnelDoc {
  machine_state: {
    status: string; last_run_id: string; last_run_started_at: string; last_run_finished_at?: string; last_checked_at: string;
    check_count: number; input_snapshot_hash: string; changed_since_last_run: boolean;
    new_since_last_run?: Record<string, number>; total_runs_recorded: number; errors?: string[];
  };
  stages: Stage[];
  signal_families: Record<string, SignalFamily>;
  patterns: Record<string, PatternInstance[]>;
}

const PATTERN_ORDER = ["CONVERGENCE", "TENSION", "CONTRADICTION", "ASSUMPTION", "CAPABILITY_TRANSFER", "WHITE_SPACE", "ANOMALY", "TEMPORAL_SHIFT", "CROSS_SCALE_LINK"] as const;
const PATTERN_HINT: Record<string, string> = {
  CONVERGENCE: "different evidence families point to the same thing",
  TENSION: "two desirable things conflict",
  CONTRADICTION: "evidence disagrees",
  ASSUMPTION: "the category repeatedly treats something as fixed",
  CAPABILITY_TRANSFER: "Versuni knows how to do X elsewhere",
  WHITE_SPACE: "real need + poor current solution + credible capability",
  ANOMALY: "one product/behaviour is surprisingly different",
  TEMPORAL_SHIFT: "something is genuinely changing over time",
  CROSS_SCALE_LINK: "a personal/zone problem may be solved at room scale",
};
const FAMILY_ORDER = ["RESEARCH", "TRENDS", "CONSUMERS", "MARKET", "TECHNOLOGY_AI"] as const;
const PATTERN_TRACE: Record<string, string> = {
  CONVERGENCE: "signals_real.json[\"signals\"] where state == \"CONVERGING\" — src/real/funnel_real.py::compute_patterns().",
  TENSION: "research_tensions.json[\"tensions\"] (all real entries) — src/real/research_corpus_real.py + funnel_real.py.",
  CONTRADICTION: "signals_real.json[\"signals\"] where state == \"CONTESTED\" — src/real/funnel_real.py::compute_patterns().",
  ASSUMPTION: "category_assumptions.json[\"assumptions\"] (all real entries) — src/real/assumptions_real.py + funnel_real.py.",
  CAPABILITY_TRANSFER: "magic_box_real.json[\"possibilities\"] where operator == \"CROSS_CATEGORY_TRANSFER\" — src/real/funnel_real.py::compute_patterns().",
  WHITE_SPACE: "white_space_real.json[\"spaces\"] where is_white_space == true — src/real/white_space_real.py + funnel_real.py.",
  ANOMALY: "defect_detection_report_real.json[\"defects_found\"][\"product_daily_volume_anomalies\"][\"evidence\"] (MAD z-score >= 5.0 burst detector) — src/real/detect_defects_real.py.",
  TEMPORAL_SHIFT: "magic_box_real.json[\"possibilities\"] where operator == \"TEMPORAL_SHIFT\" — src/real/funnel_real.py::compute_patterns().",
  CROSS_SCALE_LINK: "signals_real.json[\"signals\"] id == \"spatial_resuspension\" (backed by RP-04) — src/real/funnel_real.py::compute_patterns().",
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function FunnelWorld({ onGoToWorld }: { onGoToWorld: (n: number) => void }) {
  const [data, setData] = useState<FunnelDoc | null>(null);
  const [stageFocus, setStageFocus] = useState<Stage | null>(null);
  const [familyFocus, setFamilyFocus] = useState<{ key: string; f: SignalFamily } | null>(null);
  const [patternFocus, setPatternFocus] = useState<{ type: string; items: PatternInstance[] } | null>(null);

  useEffect(() => { api.funnel().then(setData).catch(() => setData(null)); }, []);

  const stageById = (id: string) => data?.stages.find((s) => s.id === id);
  const products = stageById("products"), signals = stageById("signals"), competitors = stageById("competitors");
  const magicBox = stageById("magic_box"), criteria = stageById("criteria"), innovations = stageById("innovations");
  const critic = stageById("critic"), finalists = stageById("finalists");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "24px 32px", background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.1em" }}>VERSUNI</div>
          <h1 style={{ fontSize: 34, marginTop: 2 }}>Innovation Funnel</h1>
          <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 4, fontStyle: "italic" }}>Evidence in. Better bets out.</div>
        </div>
        {data && (
          <div style={{ textAlign: "right" }}>
            <Pill tone={data.machine_state.status === "RUNNING" ? "good" : "rose"}>● {data.machine_state.status}</Pill>
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
              LAST RUN {timeAgo(data.machine_state.last_run_started_at)}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
              SNAPSHOT {data.machine_state.input_snapshot_hash.slice(0, 10)} · {data.machine_state.changed_since_last_run ? "CHANGED" : "UNCHANGED"} SINCE LAST RUN
            </div>
            {data.machine_state.new_since_last_run && Object.keys(data.machine_state.new_since_last_run).length > 0 && (
              <div style={{ fontSize: 10.5, color: "var(--accent-teal)", fontFamily: "var(--font-mono)" }}>
                NEW SINCE LAST RUN: {Object.entries(data.machine_state.new_since_last_run).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real funnel state…</div>}
      {data && (
        <div className="scrollY" style={{ flex: 1 }}>
          {/* Inputs row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 4, maxWidth: 760, margin: "0 auto 4px" }}>
            {[products, signals, competitors].map((s) => s && (
              <button key={s.id} onClick={() => setStageFocus(s)} style={stageBoxStyle(false)}>
                <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.count}</div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-dim)" }}>{s.label}</div>
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 20, maxWidth: 760, margin: "0 auto" }}>↓</div>

          {/* Magic Box */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <button onClick={() => magicBox && setStageFocus(magicBox)} style={{ ...stageBoxStyle(true), width: 260 }}>
              <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{magicBox?.count}</div>
              <div style={{ fontSize: 12, letterSpacing: "0.04em", fontWeight: 600 }}>MAGIC BOX</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>PATTERN INTELLIGENCE</div>
            </button>
          </div>
          <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 20 }}>↓</div>

          {/* Pattern types */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6, maxWidth: 760, margin: "0 auto 14px" }}>
            {PATTERN_ORDER.map((p) => {
              const items = data.patterns[p] ?? [];
              return (
                <button key={p} onClick={() => setPatternFocus({ type: p, items })}
                  title={PATTERN_HINT[p]}
                  style={{ ...stageBoxStyle(false), padding: "8px 10px", opacity: items.length ? 1 : 0.55 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{items.length}</div>
                  <div style={{ fontSize: 9, letterSpacing: "0.04em", color: "var(--ink-faint)" }}>{p.replace(/_/g, " ")}</div>
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 20 }}>↓</div>

          {/* Criteria -> Innovations -> Critic -> Finalists */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {[criteria, innovations, critic, finalists].map((s, i, arr) => s && (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setStageFocus(s)} style={stageBoxStyle(s.id === "finalists")}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {s.id === "finalists" ? s.count : s.count}
                  </div>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.05em", color: "var(--ink-dim)" }}>{s.label}</div>
                </button>
                {i < arr.length - 1 && <span style={{ color: "var(--ink-faint)" }}>→</span>}
              </div>
            ))}
          </div>

          {finalists?.bet && (
            <div style={{ maxWidth: 640, margin: "0 auto 24px", padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12, textAlign: "center" }}>
              <SectionLabel>Current Bet</SectionLabel>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{finalists.bet}</div>
            </div>
          )}

          {/* Signal families */}
          <SectionLabel>Signal families</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {FAMILY_ORDER.map((k) => {
              const f = data.signal_families[k];
              if (!f) return null;
              return (
                <button key={k} onClick={() => setFamilyFocus({ key: k, f })}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" }}>
                  <FamilyIcon family={k} size={16} />
                  <b>{f.count}</b> {k.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["Products", 1], ["Signals", 2], ["Competitors", 3], ["Criteria", 4], ["Innovations", 5]].map(([label, n]) => (
              <button key={label as string} onClick={() => onGoToWorld(n as number)}
                style={{ fontSize: 12, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer" }}>
                Explore {label} →
              </button>
            ))}
          </div>
        </div>
      )}

      <FocusPanel open={!!stageFocus} onClose={() => setStageFocus(null)} eyebrow="Funnel stage" title={stageFocus?.label ?? ""}>
        {stageFocus && (
          <>
            <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 10 }}>{stageFocus.count}</div>
            {stageFocus.trace && <StatRow label="Trace" value={stageFocus.trace} />}
            {stageFocus.concepts_evaluated != null && <StatRow label="Concepts evaluated" value={stageFocus.concepts_evaluated} />}
            {stageFocus.bet && <StatRow label="Bet" value={stageFocus.bet} />}
            {stageFocus.inputs && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Inputs</SectionLabel>
                {stageFocus.inputs.map((i, idx) => <p key={idx} style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 4 }}>• {i}</p>)}
              </div>
            )}
            {stageFocus.outputs_to && stageFocus.outputs_to.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Outputs to</SectionLabel>
                <div style={{ display: "flex", gap: 6 }}>{stageFocus.outputs_to.map((o) => <Pill key={o}>{o}</Pill>)}</div>
              </div>
            )}
            {stageFocus.families && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Families</SectionLabel>
                {Object.entries(stageFocus.families).map(([k, v]) => <StatRow key={k} label={k} value={v} />)}
              </div>
            )}
            {stageFocus.pattern_type_counts && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Pattern types</SectionLabel>
                {Object.entries(stageFocus.pattern_type_counts).map(([k, v]) => <StatRow key={k} label={k} value={v} />)}
              </div>
            )}
            {stageFocus.verdict_counts && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Critic verdicts</SectionLabel>
                {Object.entries(stageFocus.verdict_counts).map(([k, v]) => <StatRow key={k} label={k} value={v} />)}
              </div>
            )}
            {stageFocus.parity_insight && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Verified strategic rivals — parity insight</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{stageFocus.parity_insight}</p>
              </div>
            )}
            {stageFocus.strongest_patterns && stageFocus.strongest_patterns.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Strongest current patterns</SectionLabel>
                {stageFocus.strongest_patterns.map((p) => (
                  <div key={p.type} style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 4 }}>
                    <b style={{ color: "var(--ink)" }}>{p.type.replace(/_/g, " ")}</b> — {p.example}
                  </div>
                ))}
              </div>
            )}
            {stageFocus.why_ideas_are_dying && stageFocus.why_ideas_are_dying.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Why ideas are dying</SectionLabel>
                {stageFocus.why_ideas_are_dying.map((g) => (
                  <div key={g.name} style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6, lineHeight: 1.4 }}>
                    <b style={{ color: "var(--rose)" }}>{g.name}</b> — {g.reason}
                  </div>
                ))}
              </div>
            )}
            {stageFocus.finalist_names && stageFocus.finalist_names.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Several surviving Magic Box concepts — no hardcoded winner</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {stageFocus.finalist_names.map((n) => (
                    <div key={n} style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>· {n}</div>
                  ))}
                </div>
                <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.4 }}>
                  The Current Bet below is computed by a separate, related decision pipeline
                  (OS-1/OS-2/OS-3 in decision_framework_real.py) - it is not literally one of these
                  three Magic Box concept names. Both are real and non-hardcoded; they are not yet
                  the same unified pipeline, shown honestly rather than forced to match.
                </p>
              </div>
            )}
            {stageFocus.candidates_preview && stageFocus.candidates_preview.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Candidate objects</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stageFocus.candidates_preview.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-dim)" }}>
                      <span>{c.name}</span>
                      <span className="mono">{c.typical_market_price_usd != null ? `$${c.typical_market_price_usd.toFixed(2)}` : "NO VERIFIED PRICE"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!familyFocus} onClose={() => setFamilyFocus(null)} eyebrow="Signal family" title={familyFocus?.key ?? ""}>
        {familyFocus && (
          <>
            <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 10 }}>{familyFocus.f.count}</div>
            <StatRow label="Source" value={familyFocus.f.source} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Real IDs</SectionLabel>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.6 }}>{familyFocus.f.ids.join(", ") || "—"}</div>
            </div>
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!patternFocus} onClose={() => setPatternFocus(null)} eyebrow={patternFocus ? PATTERN_HINT[patternFocus.type] : ""} title={patternFocus?.type.replace(/_/g, " ") ?? ""}>
        {patternFocus && (
          <>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: 14, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
              TRACE — {PATTERN_TRACE[patternFocus.type]}
            </p>
            {patternFocus.items.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                No real instance of this pattern exists in the current data. Reported honestly as zero — never padded to look populated.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {patternFocus.items.map((it) => (
                  <div key={it.id} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4, lineHeight: 1.45 }}>{it.detail}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6 }}>parents: {it.parent_ids.join(", ")}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </FocusPanel>
    </div>
  );
}

function stageBoxStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
    textAlign: "center", cursor: "pointer", padding: "12px 16px", borderRadius: 14,
    border: "1px solid", borderColor: active ? "var(--accent-blue)" : "var(--line)",
    background: active ? "var(--surface-2)" : "var(--surface)",
    boxShadow: active ? "var(--shadow)" : "none",
  };
}
