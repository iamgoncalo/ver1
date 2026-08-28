import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, Card } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { TraceText } from "../components/TraceText";

// Field grounds the Paths in what is actually true right now: the current
// field brief (what's true, what's moving, what would make it wrong), the
// real category assumptions with the evidence that bears on each, and the
// verified economic anchors. All runtime state - nothing authored here.
interface FieldBrief {
  now: string; moving: string; because: string; opens: string;
  blocked_by: { name: string; reason: string }[]; wrong_if: string;
}
interface Assumption {
  assumption_id: string; text: string; status: string;
  evidence_for_prevalence: string; real_evidence_that_bears_on_it: string[] | string;
  evidence_note: string; counterfactual: string;
}
interface Anchor { value: number; year: number; status: string; class: string; source: string; source_url: string; confidence: string }

const A_STATUS_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  SUPPORTED: "good", CONTESTED: "rose", MOVING: "amber", UNTESTED: "neutral",
};

function SourceNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
        {open ? "▾ source" : "▸ source"}
      </button>
      {open && <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 6 }}><TraceText text={text} /></p>}
    </div>
  );
}

export function FieldWorld({ onGoToWorld }: { onGoToWorld: (n: number) => void }) {
  const [brief, setBrief] = useState<FieldBrief | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});
  const [focus, setFocus] = useState<Assumption | null>(null);

  useEffect(() => {
    api.funnel().then((d: any) => setBrief(d?.homepage_funnel?.field ?? null)).catch(() => {});
    api.assumptions().then((d: any) => setAssumptions(d?.assumptions ?? [])).catch(() => {});
    api.economics().then((d: any) => setAnchors(d?.anchors ?? {})).catch(() => {});
  }, []);

  const anchorRows = Object.entries(anchors).slice(0, 6);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 28px", background: "var(--surface)", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>3 · Field</div>
        <h1 style={{ fontSize: 22, marginTop: 2 }}>What is actually true around these paths?</h1>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
          The current field brief, {assumptions.length} real category assumptions with their evidence, and verified economic anchors.
        </p>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr)", gap: 18, minHeight: 0 }}>
        {/* The field brief */}
        <div className="scrollY" style={{ minHeight: 0, border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", background: "var(--bg)" }}>
          <SectionLabel>Field brief — what is true now</SectionLabel>
          {brief ? (
            <>
              <h2 style={{ fontSize: 15.5, lineHeight: 1.35, marginBottom: 10 }}>{brief.now}</h2>
              <SectionLabel>Because</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 10 }}>{brief.because}</p>
              <SectionLabel>What is moving</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 10 }}>{brief.moving}</p>
              <SectionLabel>What this opens</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5, marginBottom: 4 }}>{brief.opens.split(" - ")[0].split(" (")[0]}.</p>
              <button onClick={() => onGoToWorld(6)} style={{ background: "none", border: "none", padding: 0, marginBottom: 10, color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 11.5, textDecoration: "underline" }}>
                Full experiment plan lives in New products →
              </button>
              {brief.blocked_by.length > 0 && (
                <>
                  <SectionLabel>Still blocked by</SectionLabel>
                  {brief.blocked_by.map((b) => (
                    <p key={b.name} style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.45, marginBottom: 6 }}><b>{b.name}:</b> {b.reason}</p>
                  ))}
                </>
              )}
              <SectionLabel>Wrong if</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--rose)", lineHeight: 1.5 }}>{brief.wrong_if}</p>
              <button onClick={() => onGoToWorld(4)} style={{ marginTop: 14, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Expand possibility in Magic box →
              </button>
            </>
          ) : <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading field brief…</p>}
        </div>

        {/* Assumption map */}
        <div className="scrollY" style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
          <SectionLabel>Category assumption map</SectionLabel>
          {assumptions.map((a) => (
            <Card key={a.assumption_id} onClick={() => setFocus(a)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, fontWeight: 500 }}>{a.text}</span>
                <Pill tone={A_STATUS_TONE[a.status] ?? "neutral"}>{a.status.toLowerCase().replace(/_/g, " ")}</Pill>
              </div>
            </Card>
          ))}
        </div>

        {/* Economic anchors */}
        <div className="scrollY" style={{ minHeight: 0, border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px" }}>
          <SectionLabel>Verified economic anchors (NL)</SectionLabel>
          {anchorRows.map(([k, a]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <StatRow label={k.replace(/_/g, " ").replace(" eur", " (€)")} value={a.value.toLocaleString()} />
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{a.source} · {a.year} · <span style={{ textTransform: "lowercase" }}>{a.class}</span></div>
            </div>
          ))}
          {anchorRows.length === 0 && <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Loading anchors…</p>}
          <SourceNote text="GET /api/economics -> data/processed/economics_real.json (src/real/economics_real.py, each anchor individually verified against its named public source)." />
        </div>
      </div>

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow="Category assumption" title={focus?.text ?? ""}>
        {focus && (
          <>
            <Pill tone={A_STATUS_TONE[focus.status] ?? "neutral"}>{focus.status.toLowerCase().replace(/_/g, " ")}</Pill>
            <div style={{ marginTop: 12 }}>
              <SectionLabel>Evidence for prevalence</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.evidence_for_prevalence}</p>
            </div>
            <div style={{ marginTop: 10 }}>
              <SectionLabel>Real evidence that bears on it</SectionLabel>
              <p className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                {Array.isArray(focus.real_evidence_that_bears_on_it) ? focus.real_evidence_that_bears_on_it.join(" · ") : focus.real_evidence_that_bears_on_it}
              </p>
            </div>
            {focus.evidence_note && (
              <div style={{ marginTop: 10 }}>
                <SectionLabel>Evidence note</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.evidence_note}</p>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <SectionLabel>Counterfactual — what if it's wrong?</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--rose)", lineHeight: 1.5 }}>{focus.counterfactual}</p>
            </div>
            <SourceNote text="GET /api/assumptions -> data/processed/category_assumptions.json (src/real/assumptions_real.py)." />
          </>
        )}
      </FocusPanel>
    </div>
  );
}
