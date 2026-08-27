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
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
        flexShrink: 0, gap: 24,
      }}
    >
      <button onClick={onGoHome} title="Innovation Funnel — home" aria-current={active === 0 ? "step" : undefined}
        style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 8, opacity: active === 0 ? 1 : 0.85 }}>
        <Logo />
      </button>
      <nav aria-label="Five worlds" style={{ display: "flex", gap: 6 }}>
        {STAGES.map((s) => {
          const isActive = s.n === active;
          return (
            <button
              key={s.n}
              onClick={() => onSelect(s.n)}
              aria-current={isActive ? "step" : undefined}
              title={s.q}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                padding: "6px 14px", borderRadius: 10, border: "1px solid",
                borderColor: isActive ? "var(--accent-blue)" : "transparent",
                background: isActive ? "var(--surface-2)" : "transparent",
                cursor: "pointer", minWidth: 108, textAlign: "left",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.06em" }}>
                {s.n} · {s.process}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent-blue-ink)" : "var(--ink)" }}>
                {s.world}
              </span>
            </button>
          );
        })}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <HowWeGotHere />
        <SourcesDock />
        <a href="http://localhost:8501" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--ink-dim)", textDecoration: "none", border: "1px solid var(--line)", padding: "6px 10px", borderRadius: 8 }}>
          Analyst Mode →
        </a>
        <span style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
          SPACE&nbsp;ask
        </span>
      </div>
    </header>
  );
}

export { STAGES };
