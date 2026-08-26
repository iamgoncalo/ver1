import { Logo } from "./Logo";

const STAGES = [
  { n: 1, process: "OBSERVE", world: "PRODUCTS", q: "What exists?" },
  { n: 2, process: "DISTILL", world: "SIGNALS", q: "What is changing?" },
  { n: 3, process: "COMPARE", world: "RIVALS", q: "Where is everyone else?" },
  { n: 4, process: "CREATE", world: "MAGIC BOX", q: "What becomes possible?" },
  { n: 5, process: "DECIDE", world: "INNOVATIONS", q: "What should Versuni test?" },
] as const;

export function ProcessRail({ active, onSelect }: { active: number; onSelect: (n: number) => void }) {
  return (
    <header
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
        flexShrink: 0, gap: 24,
      }}
    >
      <Logo />
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
