import { Logo } from "./Logo";
import { VersuniProductsLink } from "./VersuniProductsLink";

const STAGES = [
  { n: 1, world: "Products", q: "What does Versuni already have and know how to build?" },
  { n: 2, world: "Radar", q: "What are we actually seeing?" },
  { n: 3, world: "Paths", q: "Where is reality moving, and what does that mean?" },
  { n: 4, world: "Magic box", q: "What could exist because of what we now know?" },
  { n: 5, world: "Innovations", q: "Which possibilities are worth developing, and what should we learn next?" },
] as const;

// Criteria and the Causal map live inside Radar and Products respectively -
// each is reachable exactly where a reader is already looking for it,
// rather than as a separate top-level stop. Papers is the one item that
// earns a permanent place in the header: it is where the machine's own
// reasoning comes from, not a tool for reading one world's data.
export function ProcessRail({ active, onSelect, onGoHome }:
  { active: number; onSelect: (n: number) => void; onGoHome: () => void }) {
  return (
    <header
      style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)", alignItems: "center",
        padding: "10px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
        flexShrink: 0, gap: 12, maxWidth: "100vw",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "start", minWidth: 0 }}>
        <button onClick={onGoHome} title="Machine overview — home" aria-current={active === 0 ? "step" : undefined}
          style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 8, opacity: active === 0 ? 1 : 0.85 }}>
          <Logo />
        </button>
      </div>
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
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifySelf: "end", minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
        <button onClick={() => onSelect(10)} aria-current={active === 10 ? "page" : undefined}
          title="Papers — the three research papers this machine implements: theory, method, and build blueprint. Readable and downloadable."
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid",
            borderColor: active === 10 ? "var(--accent-blue)" : "var(--line)",
            background: active === 10 ? "var(--surface-2)" : "transparent",
            cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600,
            color: active === 10 ? "var(--accent-blue-ink)" : "var(--ink-dim)",
            transition: "background 120ms, border-color 120ms", flexShrink: 0,
          }}>
          ✦ Papers
        </button>
        <VersuniProductsLink />
      </div>
    </header>
  );
}

export { STAGES };
