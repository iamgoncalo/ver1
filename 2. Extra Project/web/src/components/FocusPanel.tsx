import type { ReactNode } from "react";
import { useEffect } from "react";

export function FocusPanel({ open, onClose, title, eyebrow, children }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{
          position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 40,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      />
      <aside
        aria-hidden={!open}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={title || eyebrow || "Detail panel"}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 92vw)",
          background: "var(--surface)", borderLeft: "1px solid var(--line)", zIndex: 41,
          display: "flex", flexDirection: "column", boxShadow: "-24px 0 48px -24px rgba(0,0,0,0.35)",
          transform: open ? "translateX(0)" : "translateX(100%)", pointerEvents: open ? "auto" : "none",
          transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {eyebrow && (
              <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 4, textTransform: "uppercase" }}>
                {eyebrow}
              </div>
            )}
            <h2 style={{ fontSize: 20 }}>{title}</h2>
          </div>
          <button
            onClick={onClose} aria-label="Close (Esc)"
            style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "var(--ink-dim)" }}
          >
            ✕
          </button>
        </div>
        <div className="scrollY" style={{ padding: 22, flex: 1 }}>{open ? children : null}</div>
      </aside>
    </>
  );
}
