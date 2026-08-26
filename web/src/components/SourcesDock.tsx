import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill } from "./ui";

interface Source {
  id: string; name: string; category: string; status: string; contributes: string; method: string | null; last_verified: string | null;
}

const STATUS_TONE: Record<string, "good" | "amber" | "neutral" | "teal"> = {
  LIVE_VERIFIED_THIS_SESSION: "good", FROZEN: "teal", MANUAL_ONLY_BY_DESIGN: "amber", NOT_IMPLEMENTED: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  LIVE_VERIFIED_THIS_SESSION: "verified live this session", FROZEN: "frozen archive",
  MANUAL_ONLY_BY_DESIGN: "manual only (by design)", NOT_IMPLEMENTED: "not implemented",
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
      <button onClick={() => setOpen(true)}
        style={{ fontSize: 11, color: "var(--ink-dim)", background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
        SOURCES{counts ? ` · ${counts.live_verified_this_session} VERIFIED · ${counts.frozen} FROZEN · ${counts.not_implemented} N/A` : ""}
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
