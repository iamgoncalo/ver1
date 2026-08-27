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
interface MagicBoxData { count: number; possibilities: { id: string; name: string; friction_theme: string }[]; pattern_type_counts: Record<string, number> }
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
  { key: "radar", label: "RADAR", tagline: "See reality" },
  { key: "paths", label: "PATHS", tagline: "It's moving" },
  { key: "field", label: "FIELD", tagline: "World now" },
  { key: "magic_box", label: "MAGIC BOX", tagline: "Could exist" },
  { key: "innovations", label: "INNOVATIONS", tagline: "Being tested" },
  { key: "new_products", label: "NEW PRODUCTS", tagline: "Made real" },
];

// A world to jump to for each real RADAR family - not every family has one
// (ECONOMICS/PATENTS/NATURE have no dedicated page yet).
const FAMILY_WORLD: Record<string, number> = {
  RESEARCH: 2, TRENDS: 2, CONSUMERS: 2, MARKET: 2, TECHNOLOGY_AI: 2, PRODUCTS: 1, RIVALS: 2,
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

// Cuts real text to a short preview at a sentence/clause boundary - never
// paraphrased, the full untouched string is always one click away via
// <Expand>. Truncation is display-only, same convention as titles clipped
// elsewhere in this app (e.g. SignalCard).
function preview(text: string, max = 90) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" - "), cut.lastIndexOf(", "));
  return (boundary > 40 ? cut.slice(0, boundary) : cut) + "…";
}

function Expand({ label, text, tone = "dim" }: { label: string; text: string; tone?: "dim" | "rose" }) {
  const [open, setOpen] = useState(false);
  const short = preview(text);
  const truncated = short.length < text.length;
  return (
    <div style={{ marginBottom: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      <button onClick={() => truncated && setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: truncated ? "pointer" : "default", width: "100%" }}>
        <p style={{ fontSize: 12.5, color: tone === "rose" ? "var(--rose)" : "var(--ink-dim)", lineHeight: 1.5 }}>
          {open ? text : short}{truncated && <span style={{ color: "var(--accent-blue-ink)", fontWeight: 600 }}> {open ? " show less" : " more"}</span>}
        </p>
      </button>
    </div>
  );
}

function Source({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.04em" }}>
        {open ? "▾ source" : "▸ source"}
      </button>
      {open && <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 6 }}>{text}</p>}
    </div>
  );
}

function headline(hf: HomepageFunnel, key: FunnelStageKey): number | null {
  switch (key) {
    case "radar": return Object.values(hf.radar.families).reduce((a, b) => a + b, 0);
    case "paths": return hf.paths.length;
    case "field": return null;
    case "magic_box": return hf.magic_box.count;
    case "innovations": return hf.innovations.count;
    case "new_products": return hf.new_products.count;
  }
}

function StageTile({ stage, hf, status, onOpen }: { stage: typeof STAGES[number]; hf: HomepageFunnel; status: string; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const n = headline(hf, stage.key);
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${stage.label} — click for detail and trace`}
      style={{
        flex: "1 1 0", minWidth: 0, maxWidth: 190, height: 200, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 6, padding: "16px 10px", borderRadius: 20,
        border: "1px solid", overflow: "hidden", boxSizing: "border-box",
        borderColor: hover ? "var(--accent-teal)" : "var(--line)",
        background: "var(--surface)", cursor: "pointer", textAlign: "center",
        boxShadow: hover ? "var(--shadow)" : "none",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "border-color 160ms, box-shadow 160ms, transform 160ms",
      }}
    >
      <FunnelStageIcon stage={stage.key} size={40} />
      {n !== null
        ? <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--ink)" }}>{n}</div>
        : <Pill tone={status === "RUNNING" ? "good" : "rose"}>● LIVE</Pill>}
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{stage.label}</div>
      <div style={{ fontSize: 10.5, color: "var(--ink-dim)", fontStyle: "italic", whiteSpace: "nowrap" }}>{stage.tagline}</div>
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
  const goTo = (n: number) => { setOpenStage(null); onGoToWorld(n); };

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
                <StageTile stage={s} hf={hf} status={data!.machine_state.status} onOpen={() => setOpenStage(s.key)} />
                {i < STAGES.length - 1 && <FlowConnector />}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, flexShrink: 0 }}>
            {[["Products", 1], ["Signals", 2], ["Magic Box", 3], ["Criteria", 4], ["Innovations", 5]].map(([label, n]) => (
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
            {Object.entries(hf.radar.families).map(([k, v]) => {
              const world = FAMILY_WORLD[k];
              return (
                <button key={k} onClick={() => world && goTo(world)}
                  style={{ display: "block", width: "100%", background: "none", border: "none", padding: "8px 0", textAlign: "left", cursor: world ? "pointer" : "default" }}>
                  <StatRow label={k.replace(/_/g, " ") + (world ? " →" : "")} value={v} />
                  {hf.radar.notes[k] && <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4, marginTop: 2 }}>{hf.radar.notes[k]}</p>}
                </button>
              );
            })}
            <Source text="GET /api/funnel -> homepage_funnel.radar — src/real/funnel_real.py::compute_homepage_funnel()." />
          </>
        )}
      </FocusPanel>

      {/* PATHS */}
      <FocusPanel open={openStage === "paths"} onClose={() => setOpenStage(null)} eyebrow="PATHS — see where reality is moving" title={`${hf?.paths.length ?? 0} real paths`}>
        {hf && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hf.paths.map((p) => (
              <PathRow key={p.id} p={p} />
            ))}
          </div>
        )}
      </FocusPanel>

      {/* FIELD */}
      <FocusPanel open={openStage === "field"} onClose={() => setOpenStage(null)} eyebrow="FIELD — the emerging world, distilled" title={hf?.field.now ?? ""}>
        {hf && (
          <>
            <Expand label="Because" text={hf.field.because} />
            <Expand label="Moving — what flips it" text={hf.field.moving} />
            <Expand label="Opens" text={hf.field.opens} />
            <Expand label="Wrong if" text={hf.field.wrong_if} tone="rose" />
            {hf.field.blocked_by.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <SectionLabel>Blocked</SectionLabel>
                {hf.field.blocked_by.map((k) => <Expand key={k.name} label={k.name} text={k.reason} />)}
              </div>
            )}
            <button onClick={() => goTo(5)}
              style={{ marginTop: 8, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
            <Source text="GET /api/funnel -> homepage_funnel.field, a 1:1 relabelling of decision_framework_real.json[&quot;verdict&quot;] — src/real/decision_framework_real.py." />
          </>
        )}
      </FocusPanel>

      {/* MAGIC BOX */}
      <FocusPanel open={openStage === "magic_box"} onClose={() => setOpenStage(null)} eyebrow="MAGIC BOX — reveal what could exist" title={`${hf?.magic_box.count ?? 0} possibilities generated`}>
        {hf && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {hf.magic_box.possibilities.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{p.name}</span>
                  <span style={{ color: "var(--ink-faint)" }}>{p.friction_theme.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            <SectionLabel>Pattern types behind these</SectionLabel>
            {Object.entries(hf.magic_box.pattern_type_counts).map(([k, v]) => (
              <StatRow key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
            <button onClick={() => goTo(3)}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Magic Box →
            </button>
            <Source text="GET /api/funnel -> homepage_funnel.magic_box — src/real/magic_box_real.py, funnel stage 'generated'." />
          </>
        )}
      </FocusPanel>

      {/* INNOVATIONS */}
      <FocusPanel open={openStage === "innovations"} onClose={() => setOpenStage(null)} eyebrow="INNOVATIONS — non-dominated, still being tested" title={`${hf?.innovations.count ?? 0} real candidates`}>
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
            <button onClick={() => goTo(5)}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
            <Source text="GET /api/funnel -> homepage_funnel.innovations — magic_box_real.json[&quot;non_dominated&quot;] (Pareto survivors of the 12 generated), each joined to its Critic verdict." />
          </>
        )}
      </FocusPanel>

      {/* NEW PRODUCTS */}
      <FocusPanel open={openStage === "new_products"} onClose={() => setOpenStage(null)} eyebrow="NEW PRODUCTS — make possibility physical" title={`${hf?.new_products.count ?? 0} real finalists`}>
        {hf && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {hf.new_products.products.map((p) => (
                <div key={p.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{p.friction_theme_name} × {p.operator}</div>
                  <div style={{ marginTop: 6 }}>
                    <StatRow label="Price" value={p.typical_market_price_usd != null ? `$${p.typical_market_price_usd.toFixed(2)}` : "NO VERIFIED PRICE"} />
                    <StatRow label="Exposure" value={`$${p.economic_value.toLocaleString()}`} />
                    <StatRow label="Feasibility" value={p.feasibility} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Current bet (separate pipeline)</SectionLabel>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{hf.new_products.bet}</p>
            </div>
            <button onClick={() => goTo(5)}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Explore Innovations →
            </button>
            <Source text="GET /api/funnel -> homepage_funnel.new_products — magic_box_real.json[&quot;finalists&quot;]; bet from decision_framework_real.json (separate pipeline, not forced to match)." />
          </>
        )}
      </FocusPanel>
    </div>
  );
}

function PathRow({ p }: { p: PathData }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", cursor: "pointer" }}>
        <Pill tone={p.kind === "TENSION" ? "rose" : "amber"}>{p.kind}</Pill>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{p.from} → {p.to} {open ? "▾" : "▸"}</div>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginBottom: 8, lineHeight: 1.45 }}>{preview(p.detail, 160)}</p>
          <StatRow label="Opens" value={preview(p.what_opens, 60)} />
          <StatRow label="Closes" value={p.what_closes} />
          <StatRow label="Driver" value={p.driver} />
          <StatRow label="Blocker" value={p.blocker} />
          <StatRow label="Distortion" value={p.distortion} />
          <StatRow label="Nature" value={p.nature_analogue.split(" - ")[0]} />
          <StatRow label="Evidence" value={p.evidence.join(", ") || "—"} />
        </div>
      )}
    </div>
  );
}
