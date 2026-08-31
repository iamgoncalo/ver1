import { useEffect, useMemo, useState } from "react";
import type { InnovationsResponse, MagicBoxResponse, RivalsResponse, WhiteSpaceResponse } from "../lib/types";

export interface AskContext {
  innovations?: InnovationsResponse;
  magicBox?: MagicBoxResponse;
  rivals?: RivalsResponse;
  whiteSpace?: WhiteSpaceResponse;
}

function buildAnswers(ctx: AskContext): { q: string; a: string }[] {
  const v = ctx.innovations?.verdict;
  const scores = ctx.innovations?.scores;
  const answers: { q: string; a: string }[] = [];

  answers.push({
    q: "Why is the current winner winning?",
    a: v
      ? `${v.recommended} — ${v.recommended_name}. ${v.why}`
      : "Innovations data has not loaded yet.",
  });

  answers.push({
    q: "What would flip the winner?",
    a: v ? v.sensitivity : "Innovations data has not loaded yet.",
  });

  answers.push({
    q: "Show evidence against this",
    a: v && scores
      ? v.killed.map((k) => `${k.name}: ${k.reason}`).join(" | ") || "No candidates were killed at this decision_priority."
      : "Innovations data has not loaded yet.",
  });

  const topPossibility = ctx.magicBox?.finalists?.[0];
  answers.push({
    q: "Why did the top Magic Box idea appear?",
    a: topPossibility
      ? `"${topPossibility.name}" = friction "${topPossibility.friction_theme_name}" (Consumer Pain rating gap ${topPossibility.consumer_pain_csat}★) transformed by the ${topPossibility.operator} operator (${topPossibility.operator_definition}). Economic Value $${topPossibility.economic_value.toLocaleString()} (price-weighted exposure - a relative indicator, not revenue), Feasibility ${topPossibility.feasibility_2_5y.rating}.`
      : "Magic Box data has not loaded yet.",
  });

  const spaces = ctx.whiteSpace?.spaces?.filter((s) => s.is_white_space) ?? [];
  answers.push({
    q: "Where is the white space?",
    a: spaces.length
      ? spaces.map((s) => `${s.name} (theme: ${s.theme}) — ${s.rivals_measurably_weak_here.length} real rivals measurably weaker here.`).join(" | ")
      : "Rivals data has not loaded yet.",
  });

  answers.push({
    q: "How is the competitive field structured?",
    a: ctx.rivals
      ? `${ctx.rivals.rivals.length} real brands analysed from ${ctx.rivals.n_category_reviews.toLocaleString()} category reviews (min. ${ctx.rivals.min_reviews_floor} reviews/brand floor).`
      : "Rivals data has not loaded yet.",
  });

  return answers;
}

export function AskShell({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx: AskContext }) {
  const answers = useMemo(() => buildAnswers(ctx), [ctx]);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => { if (!open) setActive(null); }, [open]);
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
          position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 50,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      />
      <div
        aria-hidden={!open}
        style={{
          position: "fixed", right: 24, bottom: 24, width: "min(480px, 92vw)", maxHeight: "70vh",
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16,
          boxShadow: "var(--shadow)", zIndex: 51, display: "flex", flexDirection: "column", overflow: "hidden",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transform: open ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Ask</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
                  Deterministic assistant — no AI model connected this session
                </div>
              </div>
              <button onClick={onClose} aria-label="Close (Esc)" style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, width: 28, height: 28, cursor: "pointer" }}>✕</button>
            </div>
            <div className="scrollY" style={{ padding: 12, flex: 1 }}>
              {active === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {answers.map((qa, i) => (
                    <button
                      key={qa.q} onClick={() => setActive(i)}
                      style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer", fontSize: 13, color: "var(--ink)" }}
                    >
                      {qa.q}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setActive(null)} style={{ background: "none", border: "none", color: "var(--accent-blue)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10 }}>
                    ← back
                  </button>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{answers[active].q}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-dim)" }}>{answers[active].a}</div>
                </div>
              )}
            </div>
          </div>
    </>
  );
}
