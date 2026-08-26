import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { MagicBoxResponse, Possibility } from "../lib/types";
import { Card, Pill, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, CounterfactualPrompt, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

export function MagicBoxWorld({ themeFilter }: { themeFilter: string | null }) {
  const [data, setData] = useState<MagicBoxResponse | null>(null);
  const [focus, setFocus] = useState<Possibility | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [mode, setMode] = useState<ViewMode>("distilled");

  useEffect(() => { api.magicBox().then(setData).catch(() => setData(null)); }, []);

  const possibilities = useMemo(() => {
    const all = data?.possibilities ?? [];
    if (!themeFilter) return all;
    const filtered = all.filter((p) => p.friction_theme === themeFilter);
    return filtered.length ? filtered : all;
  }, [data, themeFilter]);

  const finalistIds = new Set((data?.finalists ?? []).map((f) => f.id));
  const nonDominated = new Set(data?.non_dominated ?? []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            4 · WHAT IF — WHAT BECOMES POSSIBLE?
          </div>
          <h1 style={{ fontSize: 30 }}>What If?</h1>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", marginTop: -4, marginBottom: 8 }}>MAGIC BOX / COUNTERFACTUAL ENGINE</div>
          {themeFilter && (
            <div style={{ fontSize: 11.5, color: "var(--accent-teal)", marginTop: 4 }}>
              Filtered from Rivals white space → theme: <span className="mono">{themeFilter}</span>
            </div>
          )}
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {/* funnel */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
        {(data?.funnel ?? []).map((f, i) => (
          <div key={f.stage} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{f.count}</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</div>
            </div>
            {i < (data?.funnel.length ?? 0) - 1 && <div style={{ color: "var(--ink-faint)", padding: "0 4px", fontSize: 14 }}>→</div>}
          </div>
        ))}
      </div>

      {mode === "distilled" ? (
        <div className="scrollY" style={{ flex: 1 }}>
          <SectionLabel>Finalists — {data?.finalists.length ?? 0} of {data?.funnel[0]?.count ?? 0} generated survived gate → evidence → dominance</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignContent: "start", marginBottom: 8 }}>
            {(data?.finalists ?? []).map((p) => (
              <Card key={p.id} onClick={() => setFocus(p)} active>
                <Pill tone="good">FINALIST</Pill>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 10px" }}>
                  {p.friction_theme_name.split(" / ")[0]} × {p.operator}
                </div>
                <StatRow label="Economic value" value={`$${p.economic_value.toLocaleString()}`} />
                <StatRow label="Feasibility" value={p.feasibility_2_5y.rating} />
              </Card>
            ))}
            {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real Magic Box output…</div>}
          </div>
          <CounterfactualPrompt>What if the winning idea isn't the most powerful one, but the one competitors are least able to copy?</CounterfactualPrompt>
        </div>
      ) : (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
        <SectionLabel>{showRejected ? "Graveyard — killed candidates" : `Candidates — deterministic operator × friction combinations (${possibilities.length})`}</SectionLabel>
        <button onClick={() => setShowRejected((v) => !v)}
          style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer" }}>
          {showRejected ? "← View candidates" : `View rejected (${data?.graveyard.length ?? 0})`}
        </button>
      </div>

      <div className="scrollY" style={{ flex: 1 }}>
        {!showRejected ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, alignContent: "start" }}>
            {possibilities.map((p) => (
              <Card key={p.id} onClick={() => setFocus(p)} active={finalistIds.has(p.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  {finalistIds.has(p.id) && <Pill tone="good">FINALIST</Pill>}
                  {!finalistIds.has(p.id) && nonDominated.has(p.id) && <Pill tone="teal">non-dominated</Pill>}
                  {p.is_white_space && <Pill tone="amber">white space</Pill>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 10px" }}>
                  {p.friction_theme_name.split(" / ")[0]} × {p.operator}
                </div>
                <StatRow label="Economic value" value={`$${p.economic_value.toLocaleString()}`} />
                <StatRow label="Feasibility" value={p.feasibility_2_5y.rating} />
              </Card>
            ))}
            {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real Magic Box output…</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data?.graveyard ?? []).map((g) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>{g.kill_reason}</div>
                </div>
                <Pill tone="rose">{g.killed_by}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow={focus ? `${focus.friction_theme_name} × ${focus.operator}` : ""} title={focus?.name ?? ""}>
        {focus && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <TruthBadge truthClass={focus.truth_class} />
              {finalistIds.has(focus.id) && <Pill tone="good">FINALIST</Pill>}
              {focus.is_white_space && <Pill tone="amber">white space</Pill>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Derivation</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                Friction: <b style={{ color: "var(--ink)" }}>{focus.friction_theme_name}</b> (CSAT {focus.consumer_pain_csat}, {focus.consumer_pain_prevalence_pct}% of reviews)
                {" "}transformed by operator <b style={{ color: "var(--ink)" }}>{focus.operator}</b> — {focus.operator_definition}
                {focus.competitor_gap_brands.length > 0 && <> Rivals measurably weak here: {focus.competitor_gap_brands.join(", ")}.</>}
              </p>
            </div>
            <StatRow label="Gate passed (real pain evidence)" value={focus.gate_passed ? "yes" : "no"} />
            <StatRow label="Economic value" value={`$${focus.economic_value.toLocaleString()}`} />
            <StatRow label="Feasibility (2–5yr)" value={`${focus.feasibility_2_5y.rating} (rank ${focus.feasibility_2_5y.rank})`} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Why it may fail</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                {focus.is_white_space
                  ? "Even in white space, execution risk is real: the operator must actually resolve the friction in practice, not just on paper — this needs a first experiment before committing."
                  : "This candidate is not white space — either the friction isn't clearly worse for named rivals, or feasibility/economic evidence is thinner. Treat as exploratory, not committed."}
              </p>
            </div>
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
