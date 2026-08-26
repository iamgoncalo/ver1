import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Signal, SignalsResponse } from "../lib/types";
import { Card, Pill, MiniBar, StatRow, TruthBadge, SectionLabel } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

const STATE_TONE: Record<string, "good" | "amber" | "neutral"> = {
  CONVERGING: "good", SINGLE_SOURCE_FAMILY: "amber",
};
const STATE_LABEL: Record<string, string> = {
  CONVERGING: "Converging — consumer + trend evidence agree",
  SINGLE_SOURCE_FAMILY: "Single source family — no matching trend doc yet",
};

export function SignalsWorld() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [focus, setFocus] = useState<Signal | null>(null);

  useEffect(() => { api.signals().then(setData).catch(() => setData(null)); }, []);
  const signals = data?.signals ?? [];
  const maxPrevalence = Math.max(...signals.map((s) => s.prevalence_pct), 1);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
          2 · DISTILL — WHAT IS CHANGING?
        </div>
        <h1 style={{ fontSize: 30 }}>Signals</h1>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>
          The same six real taxonomy themes used throughout, joined against a 12-document real trend corpus. A signal is only
          marked converging when a real trend document actually supports it — never asserted.
        </p>
      </div>

      <div className="scrollY" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start" }}>
        {signals.map((s) => (
          <Card key={s.id} onClick={() => setFocus(s)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{s.name}</div>
              <TruthBadge truthClass={s.truth_class} />
            </div>
            <Pill tone={STATE_TONE[s.state] ?? "neutral"}>{s.state.replace(/_/g, " ")}</Pill>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                <span>prevalence</span><span className="mono">{s.prevalence_pct}%</span>
              </div>
              <MiniBar value={s.prevalence_pct} max={maxPrevalence} tone="blue" />
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-dim)" }}>
              CSAT impact <span className="mono" style={{ color: s.csat_impact < 0 ? "var(--rose)" : "var(--good)" }}>{s.csat_impact}</span>
              {" · "}n={s.n_reviews} · {s.source_families.join(" + ")}
            </div>
          </Card>
        ))}
        {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real signal evidence…</div>}
      </div>

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow="Signal" title={focus?.name ?? ""}>
        {focus && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <TruthBadge truthClass={focus.truth_class} />
              <Pill tone={STATE_TONE[focus.state] ?? "neutral"}>{focus.state.replace(/_/g, " ")}</Pill>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 16 }}>{STATE_LABEL[focus.state]}</p>
            <StatRow label="Prevalence in real corpus" value={`${focus.prevalence_pct}%`} />
            <StatRow label="Real reviews mentioning this" value={focus.n_reviews} />
            <StatRow label="CSAT impact" value={focus.csat_impact} />
            <StatRow label="Source families" value={focus.source_families.join(", ")} />

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>What does NOT follow</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                {focus.state === "CONVERGING"
                  ? "Convergence means a real trend document and real consumer complaints point the same direction — it does not by itself prove causation, market size, or willingness to pay."
                  : "This theme has real consumer evidence only. Absence of a matching trend document does not mean the theme is false — it means no independently-sourced document in this corpus corroborates it yet."}
              </p>
            </div>

            {focus.related_trend_docs.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Evidence chain: raw source → signal</SectionLabel>
                {focus.related_trend_docs.map((d, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 6 }}>
                    <span className="mono">{d.id}</span> — {d.title}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Evidence IDs</SectionLabel>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>{focus.evidence_ids.join(", ")}</div>
            </div>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
