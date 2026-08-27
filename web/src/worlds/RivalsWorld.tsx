import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Rival, RivalsResponse, WhiteSpaceResponse } from "../lib/types";
import { Card, Pill, StatRow, SectionLabel, DistilledRawToggle, TraceableMetric, MetricFocusPanel, CounterfactualPrompt, type ViewMode, type MetricTrace } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

export function RivalsWorld({ onSendToCriteria }: { onSendToCriteria: (theme: string) => void }) {
  const [data, setData] = useState<RivalsResponse | null>(null);
  const [whiteSpace, setWhiteSpace] = useState<WhiteSpaceResponse | null>(null);
  const [focus, setFocus] = useState<Rival | null>(null);
  const [metricFocus, setMetricFocus] = useState<MetricTrace | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [showWhiteSpace, setShowWhiteSpace] = useState(true);

  useEffect(() => {
    api.rivals().then(setData).catch(() => setData(null));
    api.whiteSpace().then(setWhiteSpace).catch(() => setWhiteSpace(null));
  }, []);

  const sorted = useMemo(() => [...(data?.rivals ?? [])].sort((a, b) => b.n_reviews - a.n_reviews), [data]);
  const spaces = whiteSpace?.spaces?.filter((s) => s.is_white_space) ?? [];
  const showBrandGrid = mode === "raw" && !showWhiteSpace;

  function weakestTheme(r: Rival) {
    return [...r.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp)[0];
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            3 · WHAT'S MISSING — WHERE IS EVERYONE ELSE?
          </div>
          <h1 style={{ fontSize: 30 }}>Competitors</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {mode === "raw" && (
            <button
              onClick={() => setShowWhiteSpace((v) => !v)}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: "linear-gradient(120deg, var(--accent-blue), var(--accent-teal))", color: "white" }}
            >
              {showWhiteSpace ? "← Back to brands" : "Show white space"}
            </button>
          )}
          <DistilledRawToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {mode === "distilled" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 40, marginBottom: 20 }}>
            <TraceableMetric label="Real competitors analysed" value={sorted.length || "…"}
              onClick={() => setMetricFocus({ label: "Real competitors analysed", value: sorted.length,
                trace: "GET /api/rivals -> len(data/processed/rivals_real.json[\"rivals\"]), built by src/real/rivals_real.py: real Amazon-review competitor brands with >= min_reviews_floor real reviews in the same real category corpus." })} />
            <TraceableMetric label="Real white-space opportunities" value={spaces.length}
              onClick={() => setMetricFocus({ label: "Real white-space opportunities", value: spaces.length,
                trace: "GET /api/white-space -> count of data/processed/white_space_real.json[\"spaces\"] where is_white_space === true, built by src/real/rivals_real.py. Requires all three, real: a Consumer Pain gate pass, >=2 real competitors measurably weaker on that theme, and real 2-5yr feasibility evidence - never inferred from an absence of online evidence." })} />
            <TraceableMetric label="Category reviews" value={data?.n_category_reviews.toLocaleString() ?? "…"}
              onClick={() => setMetricFocus({ label: "Category reviews", value: data?.n_category_reviews.toLocaleString() ?? "NO VERIFIED DATA",
                trace: "GET /api/rivals -> data/processed/rivals_real.json[\"n_category_reviews\"]: real count of Amazon reviews in the full purifier category corpus, used as the denominator for every real per-brand theme rate." })} />
            <TraceableMetric label="Min. reviews/brand floor" value={data?.min_reviews_floor ?? "…"}
              onClick={() => setMetricFocus({ label: "Min. reviews/brand floor", value: data?.min_reviews_floor ?? "NO VERIFIED DATA",
                trace: "GET /api/rivals -> data/processed/rivals_real.json[\"min_reviews_floor\"]: a fixed evidence-sufficiency floor declared in src/real/rivals_real.py - a brand with fewer real reviews than this is excluded from competitor analysis rather than analysed on thin evidence." })} />
          </div>
          {spaces.map((s) => (
            <div key={s.opportunity_id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, marginBottom: 12, maxWidth: 640 }}>
              <Pill tone="good">WHITE SPACE · {s.opportunity_id}</Pill>
              <h3 style={{ fontSize: 18, marginTop: 8 }}>{s.name}</h3>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 6 }}>
                {s.rivals_measurably_weak_here.length} real competitors measurably weaker here · feasibility {s.feasibility}
              </div>
              <button onClick={() => onSendToCriteria(s.theme)}
                style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Send to Criteria →
              </button>
            </div>
          ))}
          <CounterfactualPrompt>What if the category's weakest capability is the one Versuni could own outright?</CounterfactualPrompt>
        </div>
      )}

      {mode === "raw" && (showBrandGrid ? (
        <>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 12, flexShrink: 0 }}>
            {sorted.length} real competitors, ≥{data?.min_reviews_floor ?? 40} reviews each, from {data?.n_category_reviews.toLocaleString()} category reviews.
            Weakness = the theme each brand under-performs the category average on the most.
          </div>
          <div className="scrollY" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, alignContent: "start" }}>
            {sorted.map((r) => {
              const w = weakestTheme(r);
              return (
                <Card key={r.brand} onClick={() => setFocus(r)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.brand}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>★{r.mean_rating}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 10px" }}>
                    {r.n_reviews.toLocaleString()} reviews · {r.n_products} product{r.n_products !== 1 ? "s" : ""}
                  </div>
                  {w && (
                    <Pill tone={w.delta_pp > 0 ? "rose" : "good"}>
                      {w.delta_pp > 0 ? "weak" : "strong"}: {w.theme_name.split(" / ")[0]} ({w.delta_pp > 0 ? "+" : ""}{w.delta_pp}pp)
                    </Pill>
                  )}
                </Card>
              );
            })}
            {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real competitive evidence…</div>}
          </div>
        </>
      ) : (
        <div className="scrollY" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
            White space requires all three, real: a Consumer Pain gate pass, ≥2 real competitors measurably weaker on that theme, and
            real 2–5yr feasibility evidence.
          </div>
          {spaces.map((s) => (
            <div key={s.opportunity_id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Pill tone="good">WHITE SPACE · {s.opportunity_id}</Pill>
                  <h3 style={{ fontSize: 19, marginTop: 8 }}>{s.name}</h3>
                </div>
                <button
                  onClick={() => onSendToCriteria(s.theme)}
                  style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                >
                  Send to Criteria →
                </button>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                <StatRow label="Consumer pain CSAT" value={s.consumer_pain_csat} />
                <StatRow label="Feasibility (2–5yr)" value={s.feasibility} />
              </div>
              <div style={{ marginTop: 8 }}>
                <SectionLabel>Competitors measurably weak here ({s.rivals_measurably_weak_here.length})</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.rivals_measurably_weak_here.map((b) => <Pill key={b}>{b}</Pill>)}
                </div>
              </div>
            </div>
          ))}
          {!whiteSpace && <div style={{ color: "var(--ink-faint)" }}>Loading white space evidence…</div>}
        </div>
      ))}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow="Competitor brand" title={focus?.brand ?? ""}>
        {focus && (
          <>
            <StatRow label="Real reviews" value={focus.n_reviews.toLocaleString()} />
            <StatRow label="Products in corpus" value={focus.n_products} />
            <StatRow label="Mean rating" value={focus.mean_rating} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Theme gaps vs. category average</SectionLabel>
              {[...focus.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp).map((g) => (
                <div key={g.theme} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ color: "var(--ink-dim)" }}>{g.theme_name}</span>
                  <span className="mono" style={{ color: g.delta_pp > 0 ? "var(--rose)" : "var(--good)" }}>
                    {g.brand_rate_pct}% vs {g.category_rate_pct}% ({g.delta_pp > 0 ? "+" : ""}{g.delta_pp}pp)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </FocusPanel>

      <MetricFocusPanel metric={metricFocus} onClose={() => setMetricFocus(null)} />
    </div>
  );
}
