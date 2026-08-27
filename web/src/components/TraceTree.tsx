import { Pill } from "./ui";
import type { TraceNode } from "../lib/trace";

const KIND_LABEL: Record<string, string> = {
  signal: "SIGNAL", trend_doc: "TREND DOC", paper: "PEER-REVIEWED PAPER",
  keyword_search: "KEYWORD SEARCH", tension: "RESEARCH TENSION", assumption: "CATEGORY ASSUMPTION",
  concept: "CONCEPT", bet: "BET", info: "REAL, NOT A DOCUMENT", unresolved: "UNRESOLVED",
};
const KIND_ICON: Record<string, string> = {
  signal: "◆", trend_doc: "▲", paper: "●", keyword_search: "○", tension: "⇌",
  assumption: "?", concept: "◈", bet: "★", info: "·", unresolved: "✕",
};
const KIND_TONE: Record<string, "neutral" | "blue" | "teal" | "amber" | "rose" | "good"> = {
  signal: "blue", trend_doc: "amber", paper: "good", keyword_search: "neutral",
  tension: "rose", assumption: "amber", concept: "teal", bet: "blue", info: "neutral", unresolved: "rose",
};
const KIND_COLOR_VAR: Record<string, string> = {
  blue: "var(--accent-blue)", teal: "var(--accent-teal)", amber: "var(--amber)",
  rose: "var(--rose)", good: "var(--good)", neutral: "var(--ink-dim)",
};

export function TraceLegend({ kinds }: { kinds?: string[] }) {
  const shown = kinds ?? Object.keys(KIND_LABEL);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
      {shown.map((kind) => (
        <div key={kind} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--ink-dim)" }}>
          <span style={{ color: KIND_COLOR_VAR[KIND_TONE[kind]] }}>{KIND_ICON[kind]}</span>
          {KIND_LABEL[kind]}
        </div>
      ))}
    </div>
  );
}

export function TraceTree({ nodes, depth = 0 }: { nodes: TraceNode[]; depth?: number }) {
  return (
    <div style={{ marginLeft: depth * 18 }}>
      {nodes.map((n) => (
        <div key={`${n.kind}:${n.id}`} style={{ marginBottom: 10, paddingLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? "2px solid var(--line)" : "none" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone={KIND_TONE[n.kind] ?? "neutral"}>{KIND_ICON[n.kind]} {KIND_LABEL[n.kind] ?? n.kind}</Pill>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{n.id}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
            {n.url ? <a href={n.url} target="_blank" rel="noopener noreferrer">{n.label}</a> : n.label}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{n.detail}</div>
          {n.children.length > 0 && <TraceTree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}
