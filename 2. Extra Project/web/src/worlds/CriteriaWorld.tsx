import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, DistilledRawToggle, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

interface Criterion {
  id: string; category: string; name: string; question: string; why_it_matters: string;
  how_tested: string; pass_condition: string; challenge_condition: string; kill_condition: string;
  epistemic_type?: string; threshold_origin?: string; code_reference?: string; missing_data_behavior?: string;
}
interface Concept { name: string; criteria: Record<string, { status: string; note: string }> }
interface CriteriaDoc {
  criteria_library: Criterion[];
  concepts: Concept[];
}

const STATUS_TONE: Record<string, "good" | "amber" | "neutral" | "rose"> = {
  PASS: "good", CHALLENGE: "amber", NEEDS_EVIDENCE: "neutral", KILL: "rose", "N/A": "neutral",
};
const CATEGORIES = ["EVIDENCE", "HUMAN", "DISRUPTION", "VERSUNI", "COMPETITION", "BEHAVIOR", "SPACE", "ECONOMICS", "FEASIBILITY"] as const;

export function CriteriaWorld() {
  const [data, setData] = useState<CriteriaDoc | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("EVIDENCE");
  const [criterionFocus, setCriterionFocus] = useState<Criterion | null>(null);

  useEffect(() => { api.criteria().then(setData).catch(() => setData(null)); }, []);

  const criteriaInCategory = useMemo(
    () => (data?.criteria_library ?? []).filter((c) => c.category === category),
    [data, category]
  );

  function aggregateFor(criterionId: string) {
    const counts: Record<string, number> = { PASS: 0, CHALLENGE: 0, NEEDS_EVIDENCE: 0, KILL: 0, "N/A": 0 };
    const passed: string[] = []; const failed: string[] = [];
    (data?.concepts ?? []).forEach((c) => {
      const r = c.criteria[criterionId];
      if (!r) return;
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === "PASS") passed.push(c.name);
      if (r.status === "KILL") failed.push(c.name);
    });
    return { counts, passed, failed };
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            Criteria — how the machine decides
          </div>
          <h1 style={{ fontSize: 24 }}>Criteria</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>Gates and diagnostics — never a fourth score.</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: 6, letterSpacing: "0.04em" }}>
            Criteria are not scores. They are tests.
          </div>
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real criteria evaluation…</div>}
      {data && (
        <div className="scrollY" style={{ flex: 1 }}>
          {/* Versuni Edge */}
          <div style={{ marginBottom: 18, padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12 }}>
            <SectionLabel>Versuni Edge — diagnostic, not a fourth score</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {data.criteria_library.filter((c) => c.category === "VERSUNI").map((c) => (
                <button key={c.id} onClick={() => setCriterionFocus(c)}
                  style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-dim)" }}>
                  {c.id} · {c.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>
              Versuni Edge classifications are computed per criterion from the real evidence available — and
              because no real Versuni internal-capability dataset exists in this pipeline, gaps show
              honestly as NEEDS_EVIDENCE rather than being scored. See any criterion above for its specific gap.
            </p>
          </div>

          {/* Criteria library */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
                  background: category === cat ? "var(--surface)" : "var(--surface-2)", fontWeight: category === cat ? 700 : 500,
                  boxShadow: category === cat ? "var(--shadow)" : "none" }}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {criteriaInCategory.map((c) => {
              const agg = aggregateFor(c.id);
              const dominant = (["KILL", "CHALLENGE", "PASS", "NEEDS_EVIDENCE", "N/A"] as const).find((s) => agg.counts[s] > 0) ?? "N/A";
              return (
                <div key={c.id} onClick={() => setCriterionFocus(c)} role="button" tabIndex={0}
                  style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 12, padding: 14, background: "var(--surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{c.id}</span>
                    <Pill tone={STATUS_TONE[dominant]}>{agg.counts.PASS}P · {agg.counts.CHALLENGE}C · {agg.counts.NEEDS_EVIDENCE}NE · {agg.counts.KILL}K</Pill>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 4, lineHeight: 1.4 }}>{c.question}</div>
                </div>
              );
            })}
          </div>
          {mode === "raw" && (
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 16, lineHeight: 1.5 }}>
              Full concept-by-concept detail (Design DNA, Critic, the funnel that generated these) lives on Magic Box.
            </p>
          )}
        </div>
      )}

      <FocusPanel open={!!criterionFocus} onClose={() => setCriterionFocus(null)} eyebrow={criterionFocus?.category} title={criterionFocus ? `${criterionFocus.id} · ${criterionFocus.name}` : ""}>
        {criterionFocus && (() => {
          const agg = aggregateFor(criterionFocus.id);
          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Question</SectionLabel>
                <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{criterionFocus.question}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Why this matters</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{criterionFocus.why_it_matters}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>How it is tested</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{criterionFocus.how_tested}</p>
              </div>
              <div style={{ marginBottom: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <SectionLabel>Provenance — where this rule comes from</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                  <b>Threshold origin:</b> {criterionFocus.threshold_origin ?? "not recorded"}
                </p>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 4 }}>
                  <b>Epistemic type:</b> {(criterionFocus.epistemic_type ?? "").replace(/_/g, " ").toLowerCase() || "not recorded"} ·{" "}
                  <b>Missing data:</b> {criterionFocus.missing_data_behavior ?? "NEEDS_EVIDENCE"}
                </p>
                <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4 }}>{criterionFocus.code_reference}</p>
              </div>
              <StatRow label="Pass condition" value={criterionFocus.pass_condition} />
              <StatRow label="Challenge condition" value={criterionFocus.challenge_condition} />
              <StatRow label="Kill condition" value={criterionFocus.kill_condition} />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Current case result — real, across all {data?.concepts.length ?? 0} concepts</SectionLabel>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {Object.entries(agg.counts).filter(([, n]) => n > 0).map(([status, n]) => (
                    <Pill key={status} tone={STATUS_TONE[status]}>{status}: {n}</Pill>
                  ))}
                </div>
                {agg.passed.length > 0 && <p style={{ fontSize: 12, color: "var(--good)", marginBottom: 6 }}><b>Passed:</b> {agg.passed.join(", ")}</p>}
                {agg.failed.length > 0 && <p style={{ fontSize: 12, color: "var(--rose)" }}><b>Killed on this:</b> {agg.failed.join(", ")}</p>}
              </div>
            </>
          );
        })()}
      </FocusPanel>
    </div>
  );
}
