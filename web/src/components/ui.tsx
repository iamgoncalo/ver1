import type { ReactNode } from "react";
import { FocusPanel } from "./FocusPanel";

export type ViewMode = "distilled" | "raw";

export function DistilledRawToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
      {(["distilled", "raw"] as ViewMode[]).map((m) => (
        <button key={m} onClick={() => onChange(m)}
          style={{
            padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
            fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase",
            background: mode === m ? "var(--surface)" : "transparent", fontWeight: mode === m ? 700 : 500,
            color: mode === m ? "var(--ink)" : "var(--ink-faint)",
            boxShadow: mode === m ? "var(--shadow)" : "none",
          }}>
          {m}
        </button>
      ))}
    </div>
  );
}

export function HeroMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

export interface MetricTrace { label: string; value: ReactNode; trace: string }

// Every visible number should be traceable to its real source, not just
// asserted - wrap any HeroMetric-style figure in this so a click reveals
// exactly which file/computation it came from.
export function TraceableMetric({ label, value, onClick }: { label: string; value: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Click to see where this number comes from"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
      <HeroMetric label={label} value={value} />
    </button>
  );
}

export function MetricFocusPanel({ metric, onClose }: { metric: MetricTrace | null; onClose: () => void }) {
  return (
    <FocusPanel open={!!metric} onClose={onClose} eyebrow="Metric" title={metric?.label ?? ""}>
      {metric && (
        <>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{metric.value}</div>
          <SectionLabel>Trace</SectionLabel>
          <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{metric.trace}</p>
        </>
      )}
    </FocusPanel>
  );
}

export function CounterfactualPrompt({ children }: { children: ReactNode }) {
  return (
    <div style={{
      marginTop: 24, padding: "18px 22px", borderRadius: 14,
      background: "linear-gradient(120deg, rgba(28,63,170,0.07), rgba(14,156,140,0.07))",
      border: "1px solid var(--line)", maxWidth: 640,
    }}>
      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 6 }}>
        WHAT IF?
      </div>
      <div style={{ fontSize: 16, fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.4 }}>
        {children}
      </div>
    </div>
  );
}

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
