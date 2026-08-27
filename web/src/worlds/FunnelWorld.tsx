import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { FunnelStageIcon, type FunnelStageKey } from "../components/FunnelIcons";

interface RadarData { families: Record<string, number>; notes: Record<string, string> }
interface PathData {
  id: string; kind: "TENSION" | "ASSUMPTION"; name: string; from: string; to: string;
  driver: string; blocker: string; what_opens: string; what_closes: string; distortion: string;
  evidence: string[]; nature_analogue: string; detail: string;
}
interface FieldData {
  now: string; moving: string; because: string; opens: string;
  blocked_by: { name: string; reason: string }[]; wrong_if: string;
}
interface MagicBoxData { count: number; pattern_type_counts: Record<string, number> }
interface InnovationCandidate { id: string; name: string; friction_theme: string; typical_market_price_usd: number | null; critic_overall: string | null }
interface InnovationsData { count: number; candidates: InnovationCandidate[] }
interface NewProduct { id: string; name: string; friction_theme_name: string; operator: string; typical_market_price_usd: number | null; economic_value: number; feasibility: string }
interface NewProductsData { count: number; products: NewProduct[]; bet: string }
interface HomepageFunnel {
  radar: RadarData; paths: PathData[]; field: FieldData; magic_box: MagicBoxData;
  innovations: InnovationsData; new_products: NewProductsData;
}
interface FunnelDoc {
  machine_state: {
    status: string; last_run_started_at: string; input_snapshot_hash: string;
    changed_since_last_run: boolean; new_since_last_run?: Record<string, number>;
  };
  homepage_funnel: HomepageFunnel;
}

const STAGES: { key: FunnelStageKey; label: string; tagline: string }[] = [
  { key: "radar", label: "RADAR", tagline: "See reality." },
  { key: "paths", label: "PATHS", tagline: "See where reality is moving." },
  { key: "field", label: "FIELD", tagline: "Understand the emerging world." },
  { key: "magic_box", label: "MAGIC BOX", tagline: "Reveal what could exist." },
  { key: "innovations", label: "INNOVATIONS", tagline: "Build and test possibilities." },
  { key: "new_products", label: "NEW PRODUCTS", tagline: "Make possibility physical." },
];

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function headline(hf: HomepageFunnel, key: FunnelStageKey): { big: string; unit: string } {
  switch (key) {
    case "radar": return { big: String(Object.values(hf.radar.families).reduce((a, b) => a + b, 0)), unit: "real evidence items" };
    case "paths": return { big: String(hf.paths.length), unit: "real paths" };
    case "field": return { big: "1", unit: "current bet, distilled" };
    case "magic_box": return { big: String(hf.magic_box.count), unit: "real patterns" };
    case "innovations": return { big: String(hf.innovations.count), unit: "real candidates" };
    case "new_products": return { big: String(hf.new_products.count), unit: "real finalists" };
  }
}

function StageTile({ stage, hf, onOpen }: { stage: typeof STAGES[number]; hf: HomepageFunnel; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const h = headline(hf, stage.key);
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${stage.label} — click for inputs, outputs, and trace`}
      style={{
        flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10, padding: "22px 12px", borderRadius: 20, border: "1px solid",
        borderColor: hover ? "var(--accent-teal)" : "var(--line)",
        background: "var(--surface)", cursor: "pointer", textAlign: "center",
        boxShadow: hover ? "var(--shadow)" : "none",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "border-color 160ms, box-shadow 160ms, transform 160ms",
      }}
    >
      <FunnelStageIcon stage={stage.key} size={52} />
      <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "var(--ink)" }}>{h.big}</div>
      <div style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: "0.03em" }}>{h.unit}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "0.06em", marginTop: 4 }}>{stage.label}</div>
      <div style={{ fontSize: 11, color: "var(--ink-dim)", fontStyle: "italic", lineHeight: 1.3 }}>{stage.tagline}</div>
    </button>
  );
}

function FlowConnector() {
  return (
    <div style={{ position: "relative", width: 28, height: 2, background: "var(--line)", flexShrink: 0, alignSelf: "center", overflow: "visible" }}>
      <span className="flow-pulse" style={{ position: "absolute", top: -2.5, width: 6, height: 6, borderRadius: "50%", background: "var(--accent-teal)" }} />
    </div>
  );
}

export function FunnelWorld({ onGoToWorld }: { onGoToWorld: (n: number) => void }) {
  const [data, setData] = useState<FunnelDoc | null>(null);
  const [openStage, setOpenStage] = useState<FunnelStageKey | null>(null);

  useEffect(() => { api.funnel().then(setData).catch(() => setData(null)); }, []);

  const hf = data?.homepage_funnel;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "22px 32px", background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.1em" }}>VERSUNI</div>
          <h1 style={{ fontSize: 32, marginTop: 2 }}>Innovation Machine</h1>
          <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 4, fontStyle: "italic" }}>Evidence in. Better bets out.</div>
        </div>
        {data && (
          <div style={{ textAlign: "right" }}>
            <Pill tone={data.machine_state.status === "RUNNING" ? "good" : "rose"}>● {data.machine_state.status}</Pill>
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
              LAST RUN {timeAgo(data.machine_state.last_run_started_at)} · SNAPSHOT {data.machine_state.input_snapshot_hash.slice(0, 10)}
            </div>
          </div>
        )}
      </div>

      {!hf && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)" }}>Loading real funnel state…</div>}

      {hf && (
        <>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, minHeight: 0 }}>
            {STAGES.map((s, i) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", flex: "1 1 0", minWidth: 0 }}>
                <StageTile stage={s} hf={hf} onOpen={() => setOpenStage(s.key)} />
                {i < STAGES.length - 1 && <FlowConnector />}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, flexShrink: 0 }}>
            {[["Products", 1], ["Signals", 2], ["Competitors", 3], ["Criteria", 4], ["Innovations", 5]].map(([label, n]) => (
              <button key={label as string} onClick={() => onGoToWorld(n as number)}
                style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer" }}>
                {label} →
              </button>
            ))}
          </div>
        </>
      )}

      {/* RADAR */}
      <FocusPanel open={openStage === "radar"} onClose={() => setOpenStage(null)} eyebrow="RADAR — see reality" title="Evidence families">
        {hf && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Every real evidence family this pipeline has. Where none exists, it's a real zero with a note — never padded.
            </p>
            {Object.entries(hf.radar.families).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <StatRow label={k.replace(/_/g, " ")} value={v} />
                {hf.radar.notes[k] && <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4, marginTop: 2 }}>{hf.radar.notes[k]}</p>}
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Trace</SectionLabel>
              <p className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                GET /api/funnel -&gt; homepage_funnel.radar, computed live by src/real/funnel_real.py::compute_homepage_funnel() from
                signals_real.json, products_real.json, rivals_real.json, and economics_real.json. Outputs to PATHS, FIELD, MAGIC BOX.
              </p>
            </div>
          </>
        )}
      </FocusPanel>

      {/* PATHS */}
      <FocusPanel open={openStage === "paths"} onClose={() => setOpenStage(null)} eyebrow="PATHS — see where reality is moving" title={`${hf?.paths.length ?? 0} real paths`}>
        {hf && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Two real kinds, kept apart: a research TENSION ("X vs. Y", parsed from its own real name) and a category
              ASSUMPTION (current state → its own real counterfactual). Driver, blocker, what-closes, distortion, and a
              Nature analogue have no real source anywhere in this pipeline — reported honestly, not invented.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hf.paths.map((p) => (
                <div key={p.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <Pill tone={p.kind === "TENSION" ? "rose" : "amber"}>{p.kind}</Pill>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{p.from} → {p.to}</div>
                  <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 4, lineHeight: 1.45 }}>{p.detail}</p>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                    <StatRow label="What opens" value={p.what_opens} />
                    <StatRow label="What closes" value={p.what_closes} />
                    <StatRow label="Driver" value={p.driver} />
                    <StatRow label="Blocker" value={p.blocker} />
                    <StatRow label="Distortion" value={p.distortion} />
                    <StatRow label="Nature analogue" value={p.nature_analogue} />
                    <StatRow label="Evidence" value={p.evidence.join(", ") || "—"} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </FocusPanel>

      {/* FIELD */}
      <FocusPanel open={openStage === "field"} onClose={() => setOpenStage(null)} eyebrow="FIELD — understand the emerging world" title="Distilled current state">
        {hf && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              A 1:1 relabelling of the real live decision engine's verdict — nothing synthesized here. See Innovations for the
              interactive version (decision-priority toggle).
            </p>
            <SectionLabel>Now</SectionLabel>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{hf.field.now}</p>
            <SectionLabel>Because</SectionLabel>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 14 }}>{hf.field.because}</p>
            <SectionLabel>Moving — what would flip it</SectionLabel>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 14 }}>{hf.field.moving}</p>
            <SectionLabel>Opens — next real experiment</SectionLabel>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 14 }}>{hf.field.opens}</p>
            <SectionLabel>Wrong if</SectionLabel>
            <p style={{ fontSize: 12, color: "var(--rose)", lineHeight: 1.5, marginBottom: 14 }}>{hf.field.wrong_if}</p>
            {hf.field.blocked_by.length > 0 && (
              <>
                <SectionLabel>Blocked by</SectionLabel>
                {hf.field.blocked_by.map((k) => (
                  <div key={k.name} style={{ marginBottom: 8 }}>
                    <b style={{ fontSize: 12 }}>{k.name}</b>
                    <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.45 }}>{k.reason}</p>
                  </div>
                ))}
              </>
            )}
            <button onClick={() => { setOpenStage(null); onGoToWorld(5); }}
              style={{ marginTop: 8, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
          </>
        )}
      </FocusPanel>

      {/* MAGIC BOX */}
      <FocusPanel open={openStage === "magic_box"} onClose={() => setOpenStage(null)} eyebrow="MAGIC BOX — reveal what could exist" title={`${hf?.magic_box.count ?? 0} real patterns`}>
        {hf && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              9 pattern types, each a real reclassification of already-computed objects. A type with no real verified
              instance is an honest zero.
            </p>
            {Object.entries(hf.magic_box.pattern_type_counts).map(([k, v]) => (
              <StatRow key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
            <button onClick={() => { setOpenStage(null); onGoToWorld(4); }}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Criteria →
            </button>
          </>
        )}
      </FocusPanel>

      {/* INNOVATIONS */}
      <FocusPanel open={openStage === "innovations"} onClose={() => setOpenStage(null)} eyebrow="INNOVATIONS — build and test possibilities" title={`${hf?.innovations.count ?? 0} real candidates`}>
        {hf && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hf.innovations.candidates.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{c.friction_theme.replace(/_/g, " ")}</div>
                  </div>
                  {c.critic_overall && <Pill tone={c.critic_overall === "SURVIVE" ? "good" : c.critic_overall === "REJECT" ? "rose" : "amber"}>{c.critic_overall.replace(/_/g, " ")}</Pill>}
                </div>
              ))}
            </div>
            <button onClick={() => { setOpenStage(null); onGoToWorld(5); }}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
          </>
        )}
      </FocusPanel>

      {/* NEW PRODUCTS */}
      <FocusPanel open={openStage === "new_products"} onClose={() => setOpenStage(null)} eyebrow="NEW PRODUCTS — make possibility physical" title={`${hf?.new_products.count ?? 0} real finalists`}>
        {hf && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Only the real concepts that survived the full funnel — never a single hardcoded winner.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {hf.new_products.products.map((p) => (
                <div key={p.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{p.friction_theme_name} × {p.operator}</div>
                  <div style={{ marginTop: 6 }}>
                    <StatRow label="Typical price" value={p.typical_market_price_usd != null ? `$${p.typical_market_price_usd.toFixed(2)}` : "NO VERIFIED PRICE"} />
                    <StatRow label="Market exposure" value={`$${p.economic_value.toLocaleString()}`} />
                    <StatRow label="Feasibility" value={p.feasibility} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Current Bet (separate decision pipeline)</SectionLabel>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{hf.new_products.bet}</p>
              <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.4 }}>
                Computed by a separate, related decision pipeline (OS-1/OS-2/OS-3) — not literally one of the finalists
                above. Both are real; shown honestly rather than forced to match.
              </p>
            </div>
            <button onClick={() => { setOpenStage(null); onGoToWorld(5); }}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
