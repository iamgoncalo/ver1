import type { ReactNode } from "react";

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "teal" | "amber" | "rose" | "good" }) {
  const colors: Record<string, string> = {
    neutral: "var(--ink-dim)", blue: "var(--accent-blue-ink)", teal: "var(--accent-teal)",
    amber: "var(--amber)", rose: "var(--rose)", good: "var(--good)",
  };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5,
        fontFamily: "var(--font-mono)", letterSpacing: "0.03em", padding: "2px 8px",
        borderRadius: 999, border: `1px solid ${colors[tone]}55`, color: colors[tone],
        background: `${colors[tone]}14`, whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const TRUTH_TONE: Record<string, "blue" | "teal" | "amber" | "neutral"> = {
  OBSERVED: "blue", DERIVED: "teal", DESIGN_POSSIBILITY: "amber", HYPOTHESIS: "amber",
};
export function TruthBadge({ truthClass }: { truthClass: string }) {
  return <Pill tone={TRUTH_TONE[truthClass] ?? "neutral"}>{truthClass.replace(/_/g, " ")}</Pill>;
}

export function MiniBar({ value, max, tone = "blue" }: { value: number; max: number; tone?: "blue" | "teal" | "amber" | "rose" }) {
  const pct = Math.max(0, Math.min(100, (Math.abs(value) / (max || 1)) * 100));
  const colorVar = { blue: "var(--accent-blue)", teal: "var(--accent-teal)", amber: "var(--amber)", rose: "var(--rose)" }[tone];
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: colorVar, borderRadius: 999 }} />
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: "var(--ink-dim)" }}>{label}</span>
      <span className="mono" style={{ color: "var(--ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 6, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

export function Card({ children, onClick, active }: { children: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      style={{
        background: "var(--surface)", border: "1px solid", borderColor: active ? "var(--accent-blue)" : "var(--line)",
        borderRadius: "var(--radius)", padding: 14, cursor: onClick ? "pointer" : "default",
        transition: "border-color 120ms, transform 120ms", boxShadow: active ? "var(--shadow)" : "none",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--accent-teal)"; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = active ? "var(--accent-blue)" : "var(--line)"; }}
    >
      {children}
    </div>
  );
}
