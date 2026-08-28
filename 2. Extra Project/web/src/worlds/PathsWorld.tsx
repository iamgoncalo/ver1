import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useState as usePanelState } from "react";
import { Pill, SectionLabel } from "../components/ui";
import { TraceText } from "../components/TraceText";

// A real Path is a directional claim about where reality is moving - from
// one state toward another - carried by real evidence and owning its own
// driver, blocker, distortion and reversibility. Every row here comes from
// GET /api/funnel -> homepage_funnel.paths; nothing is authored in the UI.
interface PathData {
  id: string; kind: "TENSION" | "ASSUMPTION"; name: string; from: string; to: string;
  driver: string; blocker: string; what_opens: string; what_closes: string; distortion: string;
  evidence: string[]; nature_analogue: string; detail: string;
}

const KIND_META: Record<string, { tone: "rose" | "amber"; label: string; hint: string }> = {
  TENSION: { tone: "rose", label: "Tension", hint: "real evidence genuinely pulls in two directions" },
  ASSUMPTION: { tone: "amber", label: "Assumption", hint: "a category belief the evidence has started to move" },
};

function SourceNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 14, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
        {open ? "▾ source" : "▸ source"}
      </button>
      {open && <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 6 }}><TraceText text={text} /></p>}
    </div>
  );
}

function Trajectory({ p, active, onClick }: { p: PathData; active: boolean; onClick: () => void }) {
  const meta = KIND_META[p.kind];
  return (
    <button onClick={onClick} aria-current={active ? "true" : undefined}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
        background: active ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid", borderColor: active ? "var(--accent-blue)" : "var(--line)",
        borderRadius: 12, padding: "10px 14px", transition: "border-color 120ms, background 120ms",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Pill tone={meta.tone}>{meta.label}</Pill>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-dim)", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.from}>{p.from}</span>
        <svg width="46" height="10" viewBox="0 0 46 10" style={{ flexShrink: 0 }} aria-hidden>
          <line x1="0" y1="5" x2="38" y2="5" stroke="var(--accent-teal)" strokeWidth="1.6" />
          <polygon points="38,1.5 45,5 38,8.5" fill="var(--accent-teal)" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.to}>{p.to}</span>
      </div>
    </button>
  );
}

export function PathsWorld({ onGoToWorld }: { onGoToWorld: (n: number) => void }) {
  const [paths, setPaths] = useState<PathData[] | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    api.funnel().then((d: any) => {
      const ps = d?.homepage_funnel?.paths ?? [];
      setPaths(ps);
      if (ps.length) setFocusId(ps[0].id);
    }).catch(() => setPaths([]));
  }, []);

  const focus = useMemo(() => paths?.find((p) => p.id === focusId) ?? null, [paths, focusId]);
  const tensions = paths?.filter((p) => p.kind === "TENSION") ?? [];
  const assumptions = paths?.filter((p) => p.kind === "ASSUMPTION") ?? [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 28px", background: "var(--surface)", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>2 · Paths</div>
        <h1 style={{ fontSize: 22, marginTop: 2 }}>Where does reality appear to be moving?</h1>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
          {paths ? `${paths.length} real paths — ${tensions.length} tensions where evidence genuinely disagrees, ${assumptions.length} category assumptions in motion. Select one to see what it opens, what would falsify it, and the evidence behind it.` : "Loading real paths…"}
        </p>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 20, minHeight: 0 }}>
        <div className="scrollY" style={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, paddingRight: 6, alignContent: "start" }}>
          {paths?.map((p) => (
            <Trajectory key={p.id} p={p} active={p.id === focusId} onClick={() => setFocusId(p.id)} />
          ))}
          {paths && paths.length === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No paths available — run the pipeline to regenerate real state.</p>
          )}
        </div>

        <div className="scrollY" style={{ minHeight: 0, border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", background: "var(--bg)" }}>
          {focus ? (
            <>
              <Pill tone={KIND_META[focus.kind].tone}>{KIND_META[focus.kind].label}</Pill>
              <span style={{ fontSize: 10.5, color: "var(--ink-faint)", marginLeft: 8 }}>{KIND_META[focus.kind].hint}</span>
              <h2 style={{ fontSize: 16, margin: "10px 0 4px" }}>{focus.from} → {focus.to}</h2>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>{focus.detail}</p>
              <div style={{ marginTop: 2 }}>
                <SectionLabel>Consequences</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}><b>Opens:</b> {focus.what_opens}</p>
                <p style={{ fontSize: 12, color: "var(--rose)", lineHeight: 1.5, marginTop: 6 }}><b>Closes / would falsify:</b> {/^NO VERIFIED/i.test(focus.what_closes) ? "no falsifier established yet from the current evidence" : focus.what_closes}</p>
              </div>
              {focus.nature_analogue && !/^NO[ _]/.test(focus.nature_analogue) && (
                <div style={{ marginTop: 12 }}>
                  <SectionLabel>Verified mechanism analogue</SectionLabel>
                  <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.nature_analogue}</p>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <SectionLabel>Evidence (RP = peer-reviewed paper, TC = trend document)</SectionLabel>
                <p className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                  {focus.evidence.length ? focus.evidence.join(" · ") : "No direct evidence ids — treat as exploratory."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => onGoToWorld(1)} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", fontSize: 12 }}>← Radar evidence</button>
                <button onClick={() => onGoToWorld(3)} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Ground it in Field →</button>
              </div>
              <SourceNote text="GET /api/funnel -> homepage_funnel.paths - built by src/real/funnel_real.py from research_tensions.json + category_assumptions.json. Nothing here is authored in the interface." />
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Select a path to inspect its full anatomy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
