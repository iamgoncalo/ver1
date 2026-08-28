import { useEffect, useState } from "react";
import { Pill, SectionLabel, StatRow } from "./ui";

// Honest category state: when a registered category's evidence base cannot
// run the machine, every world shows this live eligibility computation -
// real counts from the real stores, never another category's data under
// this label, never authored placeholder results.
interface FamilyState { count: number; state: string }
interface CategoryState {
  category: string; label: string; families: Record<string, FamilyState>;
  machine_runnable: boolean; honest_note: string | null;
}

const WORLD_NAME: Record<number, string> = {
  1: "Product universe", 2: "Radar", 3: "Paths", 4: "Magic box", 5: "Innovations",
};
const STATE_TONE: Record<string, "good" | "amber" | "rose"> = {
  SUFFICIENT: "good", PARTIAL: "amber", INSUFFICIENT: "rose",
};

export function CategoryGate({ category, world, onBackToAir }: { category: string; world: number; onBackToAir: () => void }) {
  const [state, setState] = useState<CategoryState | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`/api/category-state?category=${encodeURIComponent(category)}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setState).catch(() => setErr(true));
  }, [category]);

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", padding: 28 }}>
      <div style={{ maxWidth: 620, width: "100%", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 28px", background: "var(--bg)" }}>
        {err && <p style={{ fontSize: 13, color: "var(--rose)" }}>Category state could not be computed — the API returned an error rather than a silent fallback.</p>}
        {!state && !err && <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Computing live category eligibility…</p>}
        {state && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 18 }}>{state.label} — {WORLD_NAME[world] ?? "this world"}</h2>
              <Pill tone={state.machine_runnable ? "good" : "rose"}>
                {state.machine_runnable ? "machine runnable" : "insufficient evidence"}
              </Pill>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, marginBottom: 14 }}>
              This is the live eligibility computation for {state.label.toLowerCase()} — the same filters, over the
              same real evidence stores, that power the air-purification machine. Nothing below is authored.
            </p>
            <SectionLabel>Eligible evidence, by family</SectionLabel>
            {Object.entries(state.families).map(([k, f]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 12.5 }}>{f.count.toLocaleString()}</span>
                  <Pill tone={STATE_TONE[f.state] ?? "amber"}>{f.state.toLowerCase()}</Pill>
                </span>
              </div>
            ))}
            {state.honest_note && (
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, marginTop: 14 }}>{state.honest_note}</p>
            )}
            <button onClick={onBackToAir}
              style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              Back to air purification →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
