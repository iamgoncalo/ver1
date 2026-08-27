import { Logo } from "./Logo";
import { SourcesDock } from "./SourcesDock";
import { HowWeGotHere } from "./HowWeGotHere";

const STAGES = [
  { n: 1, process: "WHAT IS", world: "PRODUCTS", q: "What exists?" },
  { n: 2, process: "WHAT CHANGES", world: "SIGNALS", q: "What is changing, and where is everyone else?" },
  { n: 3, process: "WHAT COULD EXIST", world: "MAGIC BOX", q: "Which real concepts did the machine generate?" },
  { n: 4, process: "WHAT IF", world: "CRITERIA", q: "By what test does a concept survive?" },
  { n: 5, process: "WHAT'S NEXT", world: "INNOVATIONS", q: "What should Versuni build?" },
] as const;

export function ProcessRail({ active, onSelect, onGoHome }: { active: number; onSelect: (n: number) => void; onGoHome: () => void }) {
  return (
    <header
      style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        padding: "12px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
        flexShrink: 0, gap: 12,
      }}
    >
      <button onClick={onGoHome} title="Innovation Funnel — home" aria-current={active === 0 ? "step" : undefined}
        style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 8, opacity: active === 0 ? 1 : 0.85, justifySelf: "start" }}>
        <Logo />
      </button>
      <nav aria-label="Five worlds" style={{ display: "flex", gap: 4, justifySelf: "center" }}>
        {STAGES.map((s) => {
          const isActive = s.n === active;
          return (
            <button
              key={s.n}
              onClick={() => onSelect(s.n)}
              aria-current={isActive ? "step" : undefined}
              title={s.q}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid",
                borderColor: isActive ? "var(--accent-blue)" : "transparent",
                background: isActive ? "var(--surface-2)" : "transparent",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent-blue-ink)" : "var(--ink)" }}>
                {s.n} · {s.world}
              </span>
            </button>
          );
        })}
      </nav>
      <div style={{ justifySelf: "end" }}>
        <SourcesDock />
      </div>
    </header>
  );
}

export { STAGES };
