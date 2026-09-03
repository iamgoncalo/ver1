import { Logo } from "./Logo";
import { VersuniProductsLink } from "./VersuniProductsLink";
import type { CategoryId } from "../App";

const STAGES = [
  { n: 1, world: "Products", q: "What does Versuni already have and know how to build?" },
  { n: 2, world: "Radar", q: "What are we actually seeing?" },
  { n: 3, world: "Paths", q: "Where is reality moving, and what does that mean?" },
  { n: 4, world: "Magic box", q: "What could exist because of what we now know?" },
  { n: 5, world: "Innovations", q: "Which possibilities are worth developing, and what should we learn next?" },
] as const;

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "AIR_PURIFICATION", label: "Air" },
  { id: "FLOOR_CARE", label: "Floor care" },
];

export function ProcessRail({ active, onSelect, onGoHome, category, onCategoryChange }:
  { active: number; onSelect: (n: number) => void; onGoHome: () => void;
    category: CategoryId; onCategoryChange: (c: CategoryId) => void }) {
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
        <div role="group" aria-label="Category" style={{ display: "flex", gap: 2, background: "var(--surface-2)", borderRadius: 8, padding: 2 }}>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => onCategoryChange(c.id)}
              title={`Switch the machine to ${c.label.toLowerCase()} — a real computation input, not a filter`}
              style={{
                padding: "4px 9px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                background: category === c.id ? "var(--surface)" : "transparent",
                fontWeight: category === c.id ? 700 : 400,
                color: category === c.id ? "var(--ink)" : "var(--ink-faint)",
                boxShadow: category === c.id ? "var(--shadow)" : "none",
              }}>
              {c.label}
            </button>
          ))}
        </div>
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
        <div role="group" aria-label="System tools" style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 10, borderRight: "1px solid var(--line)", flexShrink: 0 }}>
          <button onClick={() => onSelect(8)} aria-current={active === 8 ? "page" : undefined}
            title="Criteria — how the machine decides what is credible, important, generative, testable or rejectable. A system-wide governance layer, not a sixth stage."
            style={{
              padding: "5px 10px", borderRadius: 8, border: "1px dashed",
              borderColor: active === 8 ? "var(--accent-blue)" : "var(--line)",
              background: active === 8 ? "var(--surface-2)" : "transparent",
              cursor: "pointer", whiteSpace: "nowrap", fontSize: 11.5,
              color: active === 8 ? "var(--accent-blue-ink)" : "var(--ink-dim)",
              transition: "background 120ms, border-color 120ms",
            }}>
            ⚖ Criteria
          </button>
          <button onClick={() => onSelect(9)} aria-current={active === 9 ? "page" : undefined}
            title="Atlas — the causal relationships behind every friction: which need it serves, what mechanism addresses it, what human burden it could remove. A cross-cutting analytical lens, not a seventh stage."
            style={{
              padding: "5px 10px", borderRadius: 8, border: "1px dashed",
              borderColor: active === 9 ? "var(--accent-blue)" : "var(--line)",
              background: active === 9 ? "var(--surface-2)" : "transparent",
              cursor: "pointer", whiteSpace: "nowrap", fontSize: 11.5,
              color: active === 9 ? "var(--accent-blue-ink)" : "var(--ink-dim)",
              transition: "background 120ms, border-color 120ms",
            }}>
            ◈ Atlas
          </button>
          <button onClick={() => onSelect(10)} aria-current={active === 10 ? "page" : undefined}
            title="Papers — the research foundations this machine implements: theory (AFI), method (FPIM), and the build blueprint. Readable and downloadable."
            style={{
              padding: "5px 10px", borderRadius: 8, border: "1px dashed",
              borderColor: active === 10 ? "var(--accent-blue)" : "var(--line)",
              background: active === 10 ? "var(--surface-2)" : "transparent",
              cursor: "pointer", whiteSpace: "nowrap", fontSize: 11.5,
              color: active === 10 ? "var(--accent-blue-ink)" : "var(--ink-dim)",
              transition: "background 120ms, border-color 120ms",
            }}>
            ✧ Papers
          </button>
        </div>
        <VersuniProductsLink />
      </div>
    </header>
  );
}

export { STAGES };
