import { Logo } from "./Logo";
import { VersuniProductsLink } from "./VersuniProductsLink";

const STAGES = [
  { n: 1, world: "Radar", q: "What are we observing?" },
  { n: 2, world: "Paths", q: "Where does reality appear to be moving?" },
  { n: 3, world: "Field", q: "What is actually true around those paths?" },
  { n: 4, world: "Magic box", q: "What could exist now that didn't make sense before?" },
  { n: 5, world: "Innovations", q: "Which possibilities are becoming serious?" },
  { n: 6, world: "New products", q: "Which product hypotheses are ready to meet reality?" },
] as const;

export function ProcessRail({ active, onSelect, onGoHome }: { active: number; onSelect: (n: number) => void; onGoHome: () => void }) {
  return (
    <header
      style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)", alignItems: "center",
        padding: "10px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
        flexShrink: 0, gap: 12, maxWidth: "100vw",
      }}
    >
      <button onClick={onGoHome} title="Machine overview — home" aria-current={active === 0 ? "step" : undefined}
        style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 8, opacity: active === 0 ? 1 : 0.85, justifySelf: "start" }}>
        <Logo />
      </button>
      <nav aria-label="The machine" style={{ display: "flex", gap: 2, justifySelf: "center", overflowX: "auto", maxWidth: "100%" }}>
        {STAGES.map((s) => {
          const isActive = s.n === active;
          return (
            <button
              key={s.n}
              onClick={() => onSelect(s.n)}
              aria-current={isActive ? "step" : undefined}
              title={s.q}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid",
                borderColor: isActive ? "var(--accent-blue)" : "transparent",
                background: isActive ? "var(--surface-2)" : "transparent",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? "var(--accent-blue-ink)" : "var(--ink)" }}>
                {s.world}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => onSelect(7)}
          aria-current={active === 7 ? "step" : undefined}
          title="Product Universe — the verified existing-product intelligence library"
          style={{
            padding: "6px 10px", borderRadius: 8, border: "1px solid",
            borderColor: active === 7 ? "var(--accent-blue)" : "transparent",
            background: active === 7 ? "var(--surface-2)" : "transparent",
            cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8,
            transition: "background 120ms, border-color 120ms",
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 500, color: active === 7 ? "var(--accent-blue-ink)" : "var(--ink-dim)" }}>
            ⌸ Product universe
          </span>
        </button>
      </nav>
      <div style={{ justifySelf: "end" }}>
        <VersuniProductsLink />
      </div>
    </header>
  );
}

export { STAGES };
