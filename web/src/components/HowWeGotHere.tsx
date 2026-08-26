import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Stage { id: string; label: string; count: number | null }

export function HowWeGotHere() {
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [betName, setBetName] = useState<string | null>(null);

  useEffect(() => {
    if (!open || stages) return;
    api.howWeGotHere().then((r) => { setStages(r.stages); setBetName(r.bet_name); }).catch(() => {});
  }, [open, stages]);

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ fontSize: 11, color: "var(--ink-dim)", background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
        HOW WE GOT HERE
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 60 }} />
          <div style={{
            position: "fixed", top: "8vh", left: "50%", transform: "translateX(-50%)", width: "min(720px, 94vw)", maxHeight: "82vh",
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)",
            zIndex: 61, display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>How we got here</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>Live counts from the same files the rest of the app reads — nothing is a hardcoded example.</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, width: 28, height: 28, cursor: "pointer" }}>✕</button>
            </div>
            <div className="scrollY" style={{ padding: 20, flex: 1 }}>
              {(stages ?? []).map((s, i) => (
                <div key={s.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="mono" style={{ fontSize: 24, fontWeight: 700, width: 64, textAlign: "right", color: s.count === null ? "var(--ink-faint)" : "var(--ink)" }}>
                      {s.count === null ? "—" : s.count}
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>
                      {s.label}
                      {s.count === null && <span style={{ color: "var(--rose)" }}> (source unavailable)</span>}
                    </div>
                  </div>
                  {i < (stages?.length ?? 0) - 1 && (
                    <div style={{ marginLeft: 32, height: 18, borderLeft: "2px solid var(--line)" }} />
                  )}
                </div>
              ))}
              {stages && betName && (
                <div style={{ marginTop: 12, padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12, fontSize: 13 }}>
                  <b>Current bet:</b> {betName}
                </div>
              )}
              {!stages && <div style={{ color: "var(--ink-faint)" }}>Loading…</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
