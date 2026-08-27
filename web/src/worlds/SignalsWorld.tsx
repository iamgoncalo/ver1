import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Signal, SignalsResponse } from "../lib/types";
import { Card, Pill, MiniBar, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, TraceableMetric, MetricFocusPanel, CounterfactualPrompt, type ViewMode, type MetricTrace } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { ScienceConstellation } from "../components/ScienceConstellation";
import { TerritoryIcon, FrictionIcon, FamilyIcon, ImageProvenance } from "../components/ThemeIcon";

interface ResearchPaper {
  research_id: string; title: string; journal: string; year: number; doi: string; pmid: string | null;
  study_design: string; territories: string[]; found: string; does_not_establish: string; limitations: string;
}
interface ResearchIndex { peer_reviewed_count: number; technical_regulatory_count: number; peer_reviewed_papers: ResearchPaper[] }
interface TrendDoc {
  article_id: string; title: string; publisher: string; url: string; published_date: string | null;
  document_type: string; credibility_tier: string; geographic_scope: string; themes: string[]; scope_note: string;
}
interface TrendCorpus { article_count: number; articles: TrendDoc[] }

const STATE_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  CONVERGING: "good", SINGLE_SOURCE_FAMILY: "amber", CONTESTED: "rose",
};
const STATE_LABEL: Record<string, string> = {
  CONVERGING: "Converging — two or more independent evidence families agree",
  SINGLE_SOURCE_FAMILY: "Single source family — real, but not yet independently corroborated",
  CONTESTED: "Contested — real evidence genuinely disagrees; not resolved either way",
};
const DOC_TYPE_LABEL: Record<string, string> = {
  regulatory_guidance: "Regulatory guidance", technical_standard: "Technical standard",
  industry_association: "Industry association", manufacturer_primary: "Manufacturer statement",
  syndicated_research: "Syndicated market research", peer_reviewed: "Peer-reviewed (see Research tab)",
};
const TIER_TONE: Record<string, "good" | "amber" | "neutral"> = {
  tier_1_authoritative: "good", tier_2_trade_technical: "amber", tier_3_vendor_primary: "neutral",
};
type Tab = "consumers" | "research" | "trends" | "market";
const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "consumers", label: "CONSUMERS", hint: "real Amazon review text" },
  { key: "research", label: "RESEARCH", hint: "peer-reviewed papers" },
  { key: "trends", label: "TRENDS", hint: "regulatory / standards / industry" },
  { key: "market", label: "MARKET", hint: "syndicated market sizing" },
];

export function SignalsWorld() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [focus, setFocus] = useState<Signal | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [tab, setTab] = useState<Tab>("consumers");
  const [research, setResearch] = useState<ResearchIndex | null>(null);
  const [paperFocus, setPaperFocus] = useState<ResearchPaper | null>(null);
  const [trends, setTrends] = useState<TrendCorpus | null>(null);
  const [trendFocus, setTrendFocus] = useState<TrendDoc | null>(null);
  const [market, setMarket] = useState<any>(null);
  const [metricFocus, setMetricFocus] = useState<MetricTrace | null>(null);

  useEffect(() => { api.signals().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => { api.research().then(setResearch).catch(() => setResearch(null)); }, []);
  useEffect(() => { api.trends().then(setTrends).catch(() => setTrends(null)); }, []);
  useEffect(() => { api.market().then(setMarket).catch(() => setMarket(null)); }, []);

  const signals = data?.signals ?? [];
  const withPrevalence = signals.filter((s) => s.prevalence_pct !== null);
  const researchOnly = signals.filter((s) => s.prevalence_pct === null);
  const maxPrevalence = Math.max(...withPrevalence.map((s) => s.prevalence_pct as number), 1);
  const counts = {
    converging: signals.filter((s) => s.state === "CONVERGING").length,
    single: signals.filter((s) => s.state === "SINGLE_SOURCE_FAMILY").length,
    contested: signals.filter((s) => s.state === "CONTESTED").length,
  };
  const trendGroups = trends
    ? trends.articles.reduce((acc: Record<string, TrendDoc[]>, a) => {
        (acc[a.document_type] ??= []).push(a);
        return acc;
      }, {})
    : {};

  function SignalCard({ s }: { s: Signal }) {
    return (
      <Card onClick={() => setFocus(s)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FrictionIcon theme={s.id} size={22} />
            <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{s.name}</div>
          </div>
          <TruthBadge truthClass={s.truth_class} />
        </div>
        <Pill tone={STATE_TONE[s.state] ?? "neutral"}>{s.state.replace(/_/g, " ")}</Pill>
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", margin: "10px 0 0", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {s.meaning}
        </p>
        {s.prevalence_pct !== null ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
              <span>prevalence</span><span className="mono">{s.prevalence_pct}%</span>
            </div>
            <MiniBar value={s.prevalence_pct} max={maxPrevalence} tone="blue" />
            <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-dim)" }}>
              CSAT <span className="mono" style={{ color: (s.csat_impact ?? 0) < 0 ? "var(--rose)" : "var(--good)" }}>{s.csat_impact}</span>
              {" · "}n={s.n_reviews} · {s.source_families.join(" + ")}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-dim)" }}>
            {s.n_independent_studies} peer-reviewed {s.n_independent_studies === 1 ? "study" : "studies"} · {s.source_families.join(" + ")}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
          2 · WHAT CHANGES — WHAT IS CHANGING?
        </div>
        <h1 style={{ fontSize: 30 }}>Signals</h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0, gap: 12 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.hint}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                background: tab === t.key ? "var(--surface)" : "transparent", fontWeight: tab === t.key ? 600 : 400,
                boxShadow: tab === t.key ? "var(--shadow)" : "none" }}>
              <FamilyIcon family={t.label} size={16} />
              {t.label}
            </button>
          ))}
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>
      {tab === "consumers" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 40, marginBottom: 16 }}>
            <TraceableMetric label="Converging signals" value={counts.converging}
              onClick={() => setMetricFocus({ label: "Converging signals", value: counts.converging,
                trace: "GET /api/signals -> count of data/processed/signals_real.json[\"signals\"] where state === \"CONVERGING\": two or more independent real evidence families (consumer reviews, research, trends, market) agree on the same tension, computed by src/real/signals_from_research_real.py." })} />
            <TraceableMetric label="Single-source" value={counts.single}
              onClick={() => setMetricFocus({ label: "Single-source", value: counts.single,
                trace: "GET /api/signals -> count of data/processed/signals_real.json[\"signals\"] where state === \"SINGLE_SOURCE_FAMILY\": real evidence exists but from only one evidence family so far, not yet independently corroborated." })} />
            <TraceableMetric label="Contested" value={counts.contested}
              onClick={() => setMetricFocus({ label: "Contested", value: counts.contested,
                trace: "GET /api/signals -> count of data/processed/signals_real.json[\"signals\"] where state === \"CONTESTED\": real evidence from different families genuinely disagrees; the pipeline reports the conflict rather than resolving it either way." })} />
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 640, lineHeight: 1.5 }}>
            Real Amazon.com review text, keyword-classified — not a survey or panel.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start" }}>
            {withPrevalence.map((s) => <SignalCard key={s.id} s={s} />)}
          </div>
          {!data && <div style={{ color: "var(--ink-faint)", marginTop: 12 }}>Loading real signal evidence…</div>}
          <CounterfactualPrompt>What if the most important smart feature is knowing when not to trust the sensor?</CounterfactualPrompt>
        </div>
      )}

      {tab === "research" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: 40, marginBottom: 12 }}>
            <TraceableMetric label="Peer-reviewed papers" value={research?.peer_reviewed_count ?? "…"}
              onClick={() => setMetricFocus({ label: "Peer-reviewed papers", value: research?.peer_reviewed_count ?? "NO VERIFIED DATA",
                trace: "GET /api/research -> data/processed/research_index.json[\"peer_reviewed_count\"] == len(peer_reviewed_papers): each paper individually verified live against the PubMed API (PMID/PMCID -> DOI) or by direct publisher/PMC fetch, built by src/real/research_corpus_real.py." })} />
            <TraceableMetric label="Research-grounded signals" value={researchOnly.length}
              onClick={() => setMetricFocus({ label: "Research-grounded signals", value: researchOnly.length,
                trace: "count of data/processed/signals_real.json[\"signals\"] where prevalence_pct === null: real signals whose evidence comes only from peer-reviewed research, with no consumer-review analogue to compute a prevalence rate from." })} />
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 640, lineHeight: 1.5 }}>
            Peer-reviewed literature, each paper verified live — every one below has a real DOI you can open.
          </p>
          {mode === "raw" && research && (
            <div style={{ marginBottom: 24 }}>
              <ScienceConstellation onPaperClick={(id) => {
                const p = research.peer_reviewed_papers.find((x) => x.research_id === id);
                if (p) setPaperFocus(p);
              }} />
            </div>
          )}
          {researchOnly.length > 0 && (
            <>
              <SectionLabel>Signals grounded only in research (no consumer-review analogue)</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start", marginBottom: 20 }}>
                {researchOnly.map((s) => <SignalCard key={s.id} s={s} />)}
              </div>
            </>
          )}
          <SectionLabel>All papers ({research?.peer_reviewed_papers.length ?? 0})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(research?.peer_reviewed_papers ?? []).map((p) => (
              <div key={p.research_id} onClick={() => setPaperFocus(p)} role="button" tabIndex={0}
                style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TerritoryIcon territory={p.territories[0]} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>{p.journal} · {p.year} · {p.study_design}</div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-start", flexShrink: 0 }}>
                  {p.territories.map((t) => <Pill key={t}>{t}</Pill>)}
                </div>
              </div>
            ))}
            {!research && <div style={{ color: "var(--ink-faint)" }}>Loading raw research corpus…</div>}
          </div>
        </div>
      )}

      {tab === "trends" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
            <TraceableMetric label="Trend documents" value={trends?.article_count ?? "…"}
              onClick={() => setMetricFocus({ label: "Trend documents", value: trends?.article_count ?? "NO VERIFIED DATA",
                trace: "GET /api/trends -> data/processed/trend_corpus.json[\"article_count\"] == len(articles): real regulatory, technical-standard, industry-association, manufacturer, and syndicated-research documents individually fetched and archived by src/real/research_discovery_real.py, each with a credibility tier." })} />
            <button onClick={() => setMetricFocus({ label: "Google Trends (search interest)", value: "NOT IMPLEMENTED",
                trace: "GET /api/sources -> data/processed/sources_real.json: the google_trends source is honestly recorded with status \"NOT_IMPLEMENTED\" - no search-interest connector exists in this pipeline. Shown as a real absence rather than faked or omitted." })}
              title="Click for why" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <Pill tone="neutral">Google Trends: not connected</Pill>
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 680, lineHeight: 1.5 }}>
            Regulatory, standards, industry, and syndicated-research documents — not search-interest data.
          </p>
          {Object.entries(trendGroups).map(([docType, docs]) => (
            <div key={docType} style={{ marginBottom: 18 }}>
              <SectionLabel>{DOC_TYPE_LABEL[docType] ?? docType} · {docs.length}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {docs.map((d) => (
                  <Card key={d.article_id} onClick={() => setTrendFocus(d)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <Pill tone={TIER_TONE[d.credibility_tier] ?? "neutral"}>{d.credibility_tier.replace(/_/g, " ")}</Pill>
                      <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{d.geographic_scope}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>{d.publisher}</div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {!trends && <div style={{ color: "var(--ink-faint)" }}>Loading real trend corpus…</div>}
        </div>
      )}

      {tab === "market" && (
        <div className="scrollY" style={{ flex: 1 }}>
          {market ? (
            <>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 680, lineHeight: 1.5 }}>
                Two real syndicated vendors, shown side by side rather than averaged — they disagree.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 20 }}>
                {market.sources.map((s: any) => (
                  <div key={s.source_id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{s.vendor}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.metric.value}%</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 10 }}>
                      CAGR, {s.metric.period.start_year}–{s.metric.period.end_year} ({s.metric.basis}, {s.metric.currency})
                    </div>
                    <StatRow label="Base value" value={`$${s.market_size.base_value_usd_b}B (${s.market_size.base_year})`} />
                    <StatRow label="Forecast value" value={`$${s.market_size.forecast_value_usd_b}B (${s.market_size.forecast_year})`} />
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, display: "inline-block", marginTop: 8 }}>source →</a>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12 }}>
                <SectionLabel>Why they disagree — {market.conflict_summary.spread_pp}pp spread</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55 }}>{market.conflict_summary.headline}</p>
                <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>{market.conflict_summary.note_on_realism}</p>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--ink-faint)" }}>Loading real market data…</div>
          )}
        </div>
      )}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow="Signal" title={focus?.name ?? ""}>
        {focus && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <TruthBadge truthClass={focus.truth_class} />
              <Pill tone={STATE_TONE[focus.state] ?? "neutral"}>{focus.state.replace(/_/g, " ")}</Pill>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 16, lineHeight: 1.5 }}>{focus.meaning}</p>
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 16 }}>{STATE_LABEL[focus.state]}</p>

            {focus.prevalence_pct !== null && (
              <>
                <StatRow label="Prevalence in real corpus" value={`${focus.prevalence_pct}%`} />
                <StatRow label="Real reviews mentioning this" value={focus.n_reviews} />
                <StatRow label="CSAT impact" value={focus.csat_impact} />
              </>
            )}
            <StatRow label="Source families" value={focus.source_families.join(", ")} />
            <StatRow label="Direction" value={focus.direction} />

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Design consequence</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.design_consequence}</p>
            </div>

            {focus.contradictions !== "None identified." && focus.contradictions !== "None identified" && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Contradictions</SectionLabel>
                <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.5 }}>{focus.contradictions}</p>
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>What does NOT follow</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.limitations}</p>
            </div>

            {focus.research_support.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Evidence chain: paper → signal</SectionLabel>
                {focus.research_support.map((r) => (
                  <div key={r.research_id} style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 10, lineHeight: 1.45 }}>
                    <span className="mono" style={{ color: "var(--ink)" }}>{r.research_id}</span> — {r.title}
                    <br /><span style={{ color: "var(--ink-faint)" }}>{r.found}</span>
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

      <FocusPanel open={!!paperFocus} onClose={() => setPaperFocus(null)} eyebrow={paperFocus ? `${paperFocus.journal} · ${paperFocus.year}` : ""} title={paperFocus?.title ?? ""}>
        {paperFocus && (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TerritoryIcon territory={paperFocus.territories[0]} size={36} />
              </div>
              <ImageProvenance state="EDITORIAL" />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {paperFocus.territories.map((t) => <Pill key={t} tone="blue">{t}</Pill>)}
            </div>
            <StatRow label="Method" value={paperFocus.study_design} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Found</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{paperFocus.found}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Does NOT establish</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--rose)", lineHeight: 1.5 }}>{paperFocus.does_not_establish}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Limitations</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{paperFocus.limitations}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Source</SectionLabel>
              <StatRow label="DOI" value={paperFocus.doi} />
              {paperFocus.pmid && <StatRow label="PMID" value={paperFocus.pmid} />}
              <a href={`https://doi.org/${paperFocus.doi}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, display: "inline-block", marginTop: 8 }}>
                View source →
              </a>
            </div>
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!trendFocus} onClose={() => setTrendFocus(null)} eyebrow={trendFocus ? DOC_TYPE_LABEL[trendFocus.document_type] ?? trendFocus.document_type : ""} title={trendFocus?.title ?? ""}>
        {trendFocus && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <Pill tone={TIER_TONE[trendFocus.credibility_tier] ?? "neutral"}>{trendFocus.credibility_tier.replace(/_/g, " ")}</Pill>
              {trendFocus.themes.map((t) => <Pill key={t} tone="blue">{t}</Pill>)}
            </div>
            <StatRow label="Publisher" value={trendFocus.publisher} />
            <StatRow label="Geographic scope" value={trendFocus.geographic_scope} />
            {trendFocus.published_date && <StatRow label="Published" value={trendFocus.published_date} />}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Scope note</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{trendFocus.scope_note}</p>
            </div>
            <a href={trendFocus.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, display: "inline-block", marginTop: 16 }}>
              View source →
            </a>
          </>
        )}
      </FocusPanel>

      <MetricFocusPanel metric={metricFocus} onClose={() => setMetricFocus(null)} />
    </div>
  );
}
