import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill } from "./ui";

interface Source {
  id: string; name: string; category: string; status: string; contributes: string; method: string | null; last_verified: string | null;
}

const STATUS_TONE: Record<string, "good" | "amber" | "neutral" | "teal"> = {
  SNAPSHOT_VERIFIED_LIVE: "good", CONNECTED_DISCOVERY_ONLY: "good", RATE_LIMITED: "amber", FROZEN: "teal", MANUAL_IMPORT: "amber", NOT_IMPLEMENTED: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  SNAPSHOT_VERIFIED_LIVE: "snapshot — verified live at retrieval", CONNECTED_DISCOVERY_ONLY: "connected (discovery only)", RATE_LIMITED: "rate limited", FROZEN: "frozen archive",
  MANUAL_IMPORT: "manual import (by design)", NOT_IMPLEMENTED: "not implemented",
};

export function SourcesDock() {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [counts, setCounts] = useState<any>(null);

  useEffect(() => {
    api.sources().then((r) => { setSources(r.sources); setCounts(r.counts); }).catch(() => {});
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)} title="Click to see the real per-source verification status"
        style={{ fontSize: 11, color: "var(--ink-dim)", background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
        Sources{counts ? ` · ${Object.values(counts as Record<string, number>).reduce((a, b) => a + b, 0)}` : ""}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 60 }} />
          <div style={{
            position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width: "min(560px, 92vw)", maxHeight: "78vh",
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)",
            zIndex: 61, display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Sources</div>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, width: 28, height: 28, cursor: "pointer" }}>✕</button>
            </div>
            <div className="scrollY" style={{ padding: 16, flex: 1 }}>
              {(sources ?? []).map((s) => (
                <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    <Pill tone={STATUS_TONE[s.status] ?? "neutral"}>{STATUS_LABEL[s.status]}</Pill>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 4, lineHeight: 1.45 }}>{s.contributes}</p>
                  {s.last_verified && <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 2 }}>Last verified: {s.last_verified}</div>}
                </div>
              ))}
              {!sources && <div style={{ color: "var(--ink-faint)" }}>Loading…</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
