import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Signal, SignalsResponse, Rival, RivalsResponse, WhiteSpace, WhiteSpaceResponse } from "../lib/types";
import { Card, Pill, MiniBar, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, TraceableMetric, MetricFocusPanel, CounterfactualPrompt, type ViewMode, type MetricTrace } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { ScienceConstellation } from "../components/ScienceConstellation";
import { TerritoryIcon, FrictionIcon, FamilyIcon, ImageProvenance } from "../components/ThemeIcon";
import { getParam, useUrlParam } from "../lib/urlState";

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
type Tab = "overview" | "consumers" | "research" | "trends" | "market" | "competitors" | "sources";
const TABS: { key: Tab; label: string; fam: string; hint: string }[] = [
  { key: "overview", label: "Overview", fam: "OVERVIEW", hint: "the whole radar at a glance — every number traceable" },
  { key: "consumers", label: "Consumer", fam: "CONSUMERS", hint: "real Amazon review text" },
  { key: "research", label: "Research", fam: "RESEARCH", hint: "peer-reviewed papers" },
  { key: "trends", label: "Trends", fam: "TRENDS", hint: "regulatory / standards / industry" },
  { key: "market", label: "Market", fam: "MARKET", hint: "syndicated market sizing" },
  { key: "competitors", label: "Competitors", fam: "COMPETITORS", hint: "real Amazon competitor brands" },
  { key: "sources", label: "Coverage", fam: "TECHNOLOGY_AI", hint: "what the machine captures - and what it does not" },
];
const TAB_KEYS = TABS.map((t) => t.key) as string[];

// Shared raw-table cell styles - the Raw view of every lens is a flat,
// exhaustive record table, structurally different from the Distilled cards.
const TH: CSSProperties = { textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const TD: CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11.5, color: "var(--ink-dim)", verticalAlign: "top" };

function RawTable({ cols, testid, children }: { cols: string[]; testid: string; children: ReactNode }) {
  return (
    <div data-testid={testid} style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr>{cols.map((c) => <th key={c} style={TH}>{c}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ratingGapText(gap: number) {
  return `${gap < 0 ? "▼" : "▲"} ${Math.abs(gap).toFixed(3)}★`;
}

export function SignalsWorld({ onSendToMagicBox }: { onSendToMagicBox: (theme: string) => void }) {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [focus, setFocus] = useState<Signal | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  // Deep links: /radar?lens=… picks the lens; an object param (signal /
  // paper / item / rival / space) both opens that object once its corpus
  // loads and implies its lens when none was given.
  const [tab, setTab] = useState<Tab>(() => {
    const l = getParam("lens");
    if (l && TAB_KEYS.includes(l)) return l as Tab;
    if (getParam("signal")) return "consumers";
    if (getParam("paper")) return "research";
    if (getParam("item")) return "trends";
    if (getParam("rival") || getParam("space")) return "competitors";
    return "overview";
  });
  const [research, setResearch] = useState<ResearchIndex | null>(null);
  const [paperFocus, setPaperFocus] = useState<ResearchPaper | null>(null);
  const [trends, setTrends] = useState<TrendCorpus | null>(null);
  const [trendFocus, setTrendFocus] = useState<TrendDoc | null>(null);
  const [market, setMarket] = useState<any>(null);
  const [metricFocus, setMetricFocus] = useState<MetricTrace | null>(null);
  const [rivals, setRivals] = useState<RivalsResponse | null>(null);
  const [whiteSpace, setWhiteSpace] = useState<WhiteSpaceResponse | null>(null);
  const [rivalFocus, setRivalFocus] = useState<Rival | null>(null);
  const [spaceFocus, setSpaceFocus] = useState<WhiteSpace | null>(null);
  const [showWhiteSpace, setShowWhiteSpace] = useState(true);
  const [sourceReg, setSourceReg] = useState<any>(null);
  const [corpus, setCorpus] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);

  useEffect(() => {
    api.signals().then((d) => {
      setData(d);
      const id = getParam("signal");
      const s = id ? d.signals.find((x: Signal) => x.id === id) : null;
      if (s) setFocus(s);
    }).catch(() => setData(null));
  }, []);
  useEffect(() => {
    api.research().then((d) => {
      setResearch(d);
      const id = getParam("paper");
      const p = id ? d.peer_reviewed_papers.find((x: ResearchPaper) => x.research_id === id) : null;
      if (p) setPaperFocus(p);
    }).catch(() => setResearch(null));
  }, []);
  useEffect(() => {
    api.trends().then((d) => {
      setTrends(d);
      const id = getParam("item");
      const t = id ? d.articles.find((x: TrendDoc) => x.article_id === id) : null;
      if (t) setTrendFocus(t);
    }).catch(() => setTrends(null));
  }, []);
  useEffect(() => { api.market().then(setMarket).catch(() => setMarket(null)); }, []);
  useEffect(() => {
    api.rivals().then((d) => {
      setRivals(d);
      const b = getParam("rival");
      const r = b ? d.rivals.find((x: Rival) => x.brand === b) : null;
      if (r) { setRivalFocus(r); setShowWhiteSpace(false); setMode("raw"); }
    }).catch(() => setRivals(null));
  }, []);
  useEffect(() => {
    api.whiteSpace().then((d) => {
      setWhiteSpace(d);
      const id = getParam("space");
      const s = id ? d.spaces.find((x: WhiteSpace) => x.opportunity_id === id) : null;
      if (s) setSpaceFocus(s);
    }).catch(() => setWhiteSpace(null));
  }, []);
  useEffect(() => { api.sources().then(setSourceReg).catch(() => setSourceReg(null)); }, []);
  useEffect(() => { fetch("/api/consumer-corpus").then((r) => r.json()).then(setCorpus).catch(() => setCorpus(null)); }, []);
  useEffect(() => { api.funnel().then(setFunnel).catch(() => setFunnel(null)); }, []);

  // Keep the URL a faithful, refresh-safe record of what is on screen.
  useUrlParam("lens", tab);
  useUrlParam("signal", focus?.id ?? null);
  useUrlParam("paper", paperFocus?.research_id ?? null);
  useUrlParam("item", trendFocus?.article_id ?? null);
  useUrlParam("rival", rivalFocus?.brand ?? null);
  useUrlParam("space", spaceFocus?.opportunity_id ?? null);

  const signals = data?.signals ?? [];
  const withPrevalence = signals.filter((s) => s.prevalence_pct !== null);
  const researchOnly = signals.filter((s) => s.prevalence_pct === null);
  const maxPrevalence = Math.max(...withPrevalence.map((s) => s.prevalence_pct as number), 1);
  const counts = {
    converging: signals.filter((s) => s.state === "CONVERGING").length,
    single: signals.filter((s) => s.state === "SINGLE_SOURCE_FAMILY").length,
    contested: signals.filter((s) => s.state === "CONTESTED").length,
  };
  const cls = corpus?.classifier;
  const corpusMean = cls?.corpus_mean_rating_trusted as number | undefined;
  const themeMean = (id: string): number | undefined => cls?.themes?.[id]?.mean_rating;
  const trendGroups = trends
    ? trends.articles.reduce((acc: Record<string, TrendDoc[]>, a) => {
        (acc[a.document_type] ??= []).push(a);
        return acc;
      }, {})
    : {};
  const sortedRivals = useMemo(() => [...(rivals?.rivals ?? [])].sort((a, b) => b.n_reviews - a.n_reviews), [rivals]);
  const spaces = whiteSpace?.spaces?.filter((s) => s.is_white_space) ?? [];
  function weakestTheme(r: Rival) {
    return [...r.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp)[0];
  }

  function SignalCard({ s }: { s: Signal }) {
    const tm = themeMean(s.id);
    return (
      <Card onClick={() => setFocus(s)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FrictionIcon theme={s.id} size={22} />
            <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3, overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={s.name}>
              {s.name.replace(/\s*\(weak real signal\)/i, "")}
              {/\(weak real signal\)/i.test(s.name) && <span style={{ marginLeft: 6 }}><Pill tone="amber">weak signal</Pill></span>}
            </div>
          </div>
          <TruthBadge truthClass={s.truth_class} />
        </div>
        <Pill tone={STATE_TONE[s.state] ?? "neutral"}>{s.state.replace(/_/g, " ").toLowerCase()}</Pill>
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", margin: "10px 0 0", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={s.meaning}>
          {s.meaning}
        </p>
        {s.prevalence_pct !== null ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
              <span title="Share of retained reviews whose text matches this theme's keywords - a conservative lower bound, not a population rate.">detected complaint share (lower bound)</span><span className="mono">{s.prevalence_pct}%</span>
            </div>
            <MiniBar value={s.prevalence_pct} max={maxPrevalence} tone="blue" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>average rating gap</span>
              {s.csat_impact != null ? (
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: s.csat_impact < 0 ? "var(--rose)" : "var(--good)" }}>
                  {ratingGapText(s.csat_impact)}
                </span>
              ) : <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>not measured</span>}
            </div>
            {s.csat_impact != null && tm != null && corpusMean != null && (
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
                {tm.toFixed(2)}★ theme avg vs {corpusMean.toFixed(2)}★ corpus avg
              </div>
            )}
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4 }}>
              {(s.n_reviews ?? 0).toLocaleString()} real reviews · {s.source_families.join(" + ")}
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

  // The classifier's own measured limits - shown wherever its numbers are.
  function ClassifierHonesty() {
    if (!cls) return null;
    const v = cls.validation ?? {};
    return (
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 760, lineHeight: 1.6, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
        <b style={{ color: "var(--ink-dim)" }}>Classifier honesty:</b> deterministic keyword classifier — {cls.unassigned_pct}% of retained
        reviews match no theme keyword, so every "detected complaint share" is a conservative lower bound, never a population rate.
        Corpus mean rating {corpusMean?.toFixed(3)}★ across {Number(cls.n_reviews_classified ?? 0).toLocaleString()} classified reviews.
        {v.raw_agreement_pct != null && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: "pointer", color: "var(--ink-dim)" }}>
              Blind second reading: {v.raw_agreement_pct}% raw agreement on {v.n_labelled} sampled reviews ({v.status?.toLowerCase().replace(/_/g, " ")}) — what that means ▸
            </summary>
            <p style={{ marginTop: 4, lineHeight: 1.5 }}>{v.interpretation}</p>
          </details>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
          1 · Radar — what are we observing?
        </div>
        <h1 style={{ fontSize: 24 }}>Radar</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 14, flexShrink: 0, gap: 12 }}>
        <div />
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3, justifySelf: "center" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.hint}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                background: tab === t.key ? "var(--surface)" : "transparent", fontWeight: tab === t.key ? 600 : 400,
                boxShadow: tab === t.key ? "var(--shadow)" : "none" }}>
              <FamilyIcon family={t.fam} size={20} />
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ justifySelf: "end" }}>
          <DistilledRawToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {tab === "overview" && (
        <div className="scrollY" style={{ flex: 1 }}>
          {mode === "distilled" ? (
            <div data-testid="radar-distilled-overview">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 36, marginBottom: 16 }}>
                <TraceableMetric label="Reviews retained" value={corpus ? Number(corpus.records_after_dq).toLocaleString() : "…"}
                  onClick={() => setMetricFocus({ label: "Reviews retained", value: Number(corpus?.records_after_dq ?? 0).toLocaleString(),
                    trace: "GET /api/consumer-corpus -> records_after_dq: real Amazon reviews surviving data-quality screening (data/processed/defect_detection_report_real.json[\"output_rows\"]), from the McAuley-Lab Amazon-Reviews-2023 snapshot recorded in data/manifest.json." })} />
                <TraceableMetric label="Peer-reviewed papers" value={research?.peer_reviewed_count ?? "…"}
                  onClick={() => setMetricFocus({ label: "Peer-reviewed papers", value: research?.peer_reviewed_count ?? "…",
                    trace: "GET /api/research -> data/processed/research_index.json[\"peer_reviewed_count\"]: each paper individually verified live (PubMed API / publisher fetch) by src/real/research_corpus_real.py." })} />
                <TraceableMetric label="Trend documents" value={trends?.article_count ?? "…"}
                  onClick={() => setMetricFocus({ label: "Trend documents", value: trends?.article_count ?? "…",
                    trace: "GET /api/trends -> data/processed/trend_corpus.json[\"article_count\"]: regulatory / standards / industry / syndicated documents individually fetched and archived by src/real/research_discovery_real.py." })} />
                <TraceableMetric label="Competitor brands" value={sortedRivals.length || "…"}
                  onClick={() => setMetricFocus({ label: "Competitor brands", value: sortedRivals.length,
                    trace: "GET /api/rivals -> len(data/processed/rivals_real.json[\"rivals\"]): real Amazon competitor brands with enough real reviews to clear the declared evidence floor (src/real/rivals_real.py)." })} />
                <TraceableMetric label="Market sources" value={market ? market.sources.length : "…"}
                  onClick={() => setMetricFocus({ label: "Market sources", value: market?.sources.length ?? "…",
                    trace: "GET /api/market -> data/processed/market_metrics.json[\"sources\"]: real syndicated vendors shown side by side (they disagree by " + (market?.conflict_summary?.spread_pp ?? "…") + "pp) rather than averaged - src/real/market_metrics builder." })} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 36, marginBottom: 16 }}>
                <TraceableMetric label="Converging signals" value={counts.converging}
                  onClick={() => setMetricFocus({ label: "Converging signals", value: counts.converging,
                    trace: "GET /api/signals -> count where state === \"CONVERGING\": two or more independent real evidence families agree (src/real/signals_from_research_real.py)." })} />
                <TraceableMetric label="Single-source" value={counts.single}
                  onClick={() => setMetricFocus({ label: "Single-source", value: counts.single,
                    trace: "GET /api/signals -> count where state === \"SINGLE_SOURCE_FAMILY\": real, but only one evidence family so far." })} />
                <TraceableMetric label="Contested" value={counts.contested}
                  onClick={() => setMetricFocus({ label: "Contested", value: counts.contested,
                    trace: "GET /api/signals -> count where state === \"CONTESTED\": real evidence genuinely disagrees; the machine reports the conflict, it does not resolve it." })} />
                {funnel?.machine_state && (
                  <TraceableMetric label="Snapshot" value={funnel.machine_state.input_snapshot_hash?.slice(0, 10) ?? "…"}
                    onClick={() => setMetricFocus({ label: "Snapshot", value: funnel.machine_state.input_snapshot_hash?.slice(0, 10),
                      trace: "GET /api/funnel -> machine_state.input_snapshot_hash: content hash over the canonical processed inputs - the exact evidence state every number on this page was computed from." })} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
                {([
                  ["consumers", `${withPrevalence.length} consumer signals from ${corpus ? Number(corpus.records_after_dq).toLocaleString() : "…"} retained real reviews`, "Detected complaint shares are conservative lower bounds - see Classifier honesty."],
                  ["research", `${research?.peer_reviewed_count ?? "…"} verified peer-reviewed papers`, "Every paper has a real DOI you can open."],
                  ["trends", `${trends?.article_count ?? "…"} regulatory / standards / industry documents`, "Documents, not search-interest data - Google Trends is honestly not connected."],
                  ["market", `${market ? market.sources.length : "…"} syndicated market sources - shown disagreeing`, market ? `${market.conflict_summary.spread_pp} percentage-point (pp) spread in growth estimates, reported, not averaged.` : ""],
                  ["competitors", `${sortedRivals.length || "…"} competitor brands · ${spaces.length} white-space opportunities`, "White space needs pain + measurable competitor weakness + feasibility, all real."],
                  ["sources", "Full source coverage - and honest gaps", "A connector that does not exist says so."],
                ] as [Tab, string, string][]).map(([k, head, note]) => (
                  <Card key={k} onClick={() => setTab(k)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <FamilyIcon family={TABS.find((t) => t.key === k)!.fam} size={22} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{TABS.find((t) => t.key === k)!.label} →</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>{head}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>{note}</div>
                  </Card>
                ))}
              </div>

              <ClassifierHonesty />

              <div style={{ fontSize: 11, color: "var(--ink-faint)", maxWidth: 760, lineHeight: 1.6, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <b style={{ color: "var(--ink-dim)" }}>Change over time:</b> no validated time-series exists in this corpus. Every number on
                this radar is a snapshot with a retrieval date — the machine does not claim trends over time from evidence
                that cannot support them.
              </div>
              <CounterfactualPrompt>What if the most valuable observation is the one no connected source can currently make?</CounterfactualPrompt>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10, maxWidth: 720, lineHeight: 1.5 }}>
                Every headline number on the Overview, with its exact data path and builder — the raw ledger behind the distilled view.
              </p>
              <RawTable testid="radar-raw-overview" cols={["number", "value", "data path", "builder"]}>
                {[
                  ["Reviews retained", corpus ? Number(corpus.records_after_dq).toLocaleString() : "…", "defect_detection_report_real.json → output_rows", "src/real (Q2 defect screen)"],
                  ["Reviews normalized", corpus ? Number(corpus.records_normalized).toLocaleString() : "…", "data/manifest.json → consumer_reviews.csv record_count", "fetch + normalize"],
                  ["Distinct products", corpus?.distinct_products ?? "…", "data/manifest.json → distinct_real_products", "src/real/filter_purifier_products.py"],
                  ["Peer-reviewed papers", research?.peer_reviewed_count ?? "…", "research_index.json → peer_reviewed_count", "src/real/research_corpus_real.py"],
                  ["Trend documents", trends?.article_count ?? "…", "trend_corpus.json → article_count", "src/real/research_discovery_real.py"],
                  ["Competitor brands", sortedRivals.length || "…", "rivals_real.json → len(rivals)", "src/real/rivals_real.py"],
                  ["White-space opportunities", spaces.length, "white_space_real.json → is_white_space === true", "src/real/rivals_real.py"],
                  ["Market sources", market?.sources.length ?? "…", "market_metrics.json → sources", "market metrics builder"],
                  ["Market spread", market ? `${market.conflict_summary.spread_pp}pp` : "…", "market_metrics.json → conflict_summary.spread_pp", "reported, never averaged"],
                  ["Signals converging / single / contested", `${counts.converging} / ${counts.single} / ${counts.contested}`, "signals_real.json → state", "src/real/signals_from_research_real.py"],
                  ["Corpus mean rating (trusted)", corpusMean != null ? `${corpusMean}★` : "…", "taxonomy_themes_real.json → corpus_mean_rating_trusted", "src/real/taxonomy_real.py"],
                  ["Unassigned review share", cls ? `${cls.unassigned_pct}%` : "…", "taxonomy_themes_real.json → unassigned_pct", "src/real/taxonomy_real.py"],
                  ["Input snapshot", funnel?.machine_state?.input_snapshot_hash?.slice(0, 12) ?? "…", "funnel → machine_state.input_snapshot_hash", "src/real/funnel_real.py"],
                ].map(([label, value, path, builder]) => (
                  <tr key={label as string}>
                    <td style={{ ...TD, color: "var(--ink)", fontWeight: 500 }}>{label}</td>
                    <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{value as any}</td>
                    <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{path}</td>
                    <td style={{ ...TD, fontSize: 10.5 }}>{builder}</td>
                  </tr>
                ))}
              </RawTable>
              <div style={{ marginTop: 14 }}>
                <SectionLabel>Source registry states</SectionLabel>
                <RawTable testid="radar-raw-overview-sources" cols={["source", "status", "contributes"]}>
                  {(sourceReg?.sources ?? []).map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ ...TD, color: "var(--ink)", fontWeight: 500 }}>{s.name}</td>
                      <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{s.status}</td>
                      <td style={TD}>{s.contributes}</td>
                    </tr>
                  ))}
                </RawTable>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "consumers" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 16 }}>
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
          {corpus && (
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 760, lineHeight: 1.6, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
              <b style={{ color: "var(--ink-dim)" }}>Corpus provenance:</b> {corpus.source} · retrieved {corpus.retrieved_at} · {corpus.market} ·{" "}
              {Number(corpus.records_normalized).toLocaleString()} reviews normalized → {Number(corpus.records_after_dq).toLocaleString()} retained
              ({corpus.removed_empty_text} empty removed, {corpus.quarantined_rating_conflicts} rating-conflicts quarantined) · {corpus.distinct_products} products.
              <span style={{ display: "block", marginTop: 4 }}><b style={{ color: "var(--ink-dim)" }}>Who is missing:</b> {corpus.who_is_missing}</span>
            </div>
          )}
          <ClassifierHonesty />
          {mode === "distilled" ? (
            <div data-testid="radar-distilled-consumers">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start" }}>
                {withPrevalence.map((s) => <SignalCard key={s.id} s={s} />)}
              </div>
              {!data && <div style={{ color: "var(--ink-faint)", marginTop: 12 }}>Loading real signal evidence…</div>}
              <CounterfactualPrompt>What if the most important smart feature is knowing when not to trust the sensor?</CounterfactualPrompt>
            </div>
          ) : (
            <RawTable testid="radar-raw-consumers" cols={["signal", "state", "share (lower bound)", "n reviews", "theme avg ★", "corpus avg ★", "gap ★", "families", "evidence ids"]}>
              {signals.map((s) => (
                <tr key={s.id} onClick={() => setFocus(s)} style={{ cursor: "pointer" }}>
                  <td style={{ ...TD, color: "var(--ink)", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{s.state}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{s.prevalence_pct != null ? `${s.prevalence_pct}%` : "—"}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{s.n_reviews?.toLocaleString() ?? "—"}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{themeMean(s.id)?.toFixed(3) ?? "—"}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{s.csat_impact != null && corpusMean != null ? corpusMean.toFixed(3) : "—"}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", color: s.csat_impact != null && s.csat_impact < 0 ? "var(--rose)" : s.csat_impact != null ? "var(--good)" : "var(--ink-faint)" }}>{s.csat_impact ?? "—"}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>{s.source_families.join(", ")}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>{s.evidence_ids.join(", ")}</td>
                </tr>
              ))}
            </RawTable>
          )}
        </div>
      )}

      {tab === "research" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 12 }}>
            <TraceableMetric label="Peer-reviewed papers" value={research?.peer_reviewed_count ?? "…"}
              onClick={() => setMetricFocus({ label: "Peer-reviewed papers", value: research?.peer_reviewed_count ?? "no verified data",
                trace: "GET /api/research -> data/processed/research_index.json[\"peer_reviewed_count\"] == len(peer_reviewed_papers): each paper individually verified live against the PubMed API (PMID/PMCID -> DOI) or by direct publisher/PMC fetch, built by src/real/research_corpus_real.py." })} />
            <TraceableMetric label="Research-grounded signals" value={researchOnly.length}
              onClick={() => setMetricFocus({ label: "Research-grounded signals", value: researchOnly.length,
                trace: "count of data/processed/signals_real.json[\"signals\"] where prevalence_pct === null: real signals whose evidence comes only from peer-reviewed research, with no consumer-review analogue to compute a prevalence rate from." })} />
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 640, lineHeight: 1.5 }}>
            Peer-reviewed literature, each paper verified live — every one below has a real DOI you can open.
          </p>
          {mode === "distilled" ? (
            <div data-testid="radar-distilled-research">
              {research && (
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
                  <Card key={p.research_id} onClick={() => setPaperFocus(p)}
                    style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between", padding: "12px 16px", borderRadius: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <TerritoryIcon territory={p.territories[0]} size={24} />
                    </div>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={p.title}>{p.title}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3, overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={`${p.journal} · ${p.year} · ${p.study_design}`}>{p.journal} · {p.year} · {p.study_design}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-start", flexShrink: 0 }}>
                      {p.territories.map((t) => <Pill key={t}>{t}</Pill>)}
                    </div>
                  </Card>
                ))}
                {!research && <div style={{ color: "var(--ink-faint)" }}>Loading raw research corpus…</div>}
              </div>
            </div>
          ) : (
            <RawTable testid="radar-raw-research" cols={["id", "year", "journal", "design", "territories", "DOI", "PMID"]}>
              {(research?.peer_reviewed_papers ?? []).map((p) => (
                <tr key={p.research_id} onClick={() => setPaperFocus(p)} style={{ cursor: "pointer" }}>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{p.research_id}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{p.year}</td>
                  <td style={{ ...TD, color: "var(--ink)" }}>{p.journal}</td>
                  <td style={TD}>{p.study_design}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>{p.territories.join(", ")}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                    <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{p.doi}</a>
                  </td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>{p.pmid ?? "—"}</td>
                </tr>
              ))}
            </RawTable>
          )}
        </div>
      )}

      {tab === "trends" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
            <TraceableMetric label="Trend documents" value={trends?.article_count ?? "…"}
              onClick={() => setMetricFocus({ label: "Trend documents", value: trends?.article_count ?? "no verified data",
                trace: "GET /api/trends -> data/processed/trend_corpus.json[\"article_count\"] == len(articles): real regulatory, technical-standard, industry-association, manufacturer, and syndicated-research documents individually fetched and archived by src/real/research_discovery_real.py, each with a credibility tier." })} />
            <button onClick={() => setMetricFocus({ label: "Google Trends (search interest)", value: "Not implemented",
                trace: "GET /api/sources -> data/processed/sources_real.json: the google_trends source is honestly recorded with status \"NOT_IMPLEMENTED\" - no search-interest connector exists in this pipeline. Shown as a real absence rather than faked or omitted." })}
              title="Click for why" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <Pill tone="neutral">Google Trends: not connected</Pill>
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 680, lineHeight: 1.5 }}>
            Regulatory, standards, industry, and syndicated-research documents — not search-interest data.
          </p>
          {mode === "distilled" ? (
            <div data-testid="radar-distilled-trends">
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
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={d.title}>{d.title}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>{d.publisher}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {!trends && <div style={{ color: "var(--ink-faint)" }}>Loading real trend corpus…</div>}
            </div>
          ) : (
            <RawTable testid="radar-raw-trends" cols={["id", "type", "tier", "publisher", "published", "scope", "source"]}>
              {(trends?.articles ?? []).map((d) => (
                <tr key={d.article_id} onClick={() => setTrendFocus(d)} style={{ cursor: "pointer" }}>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{d.article_id}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>{DOC_TYPE_LABEL[d.document_type] ?? d.document_type}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>{d.credibility_tier}</td>
                  <td style={{ ...TD, color: "var(--ink)" }}>{d.publisher}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{d.published_date ?? "—"}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>{d.geographic_scope}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>open →</a>
                  </td>
                </tr>
              ))}
            </RawTable>
          )}
        </div>
      )}

      {tab === "market" && (
        <div className="scrollY" style={{ flex: 1 }}>
          {market ? (
            <>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 14, maxWidth: 680, lineHeight: 1.5 }}>
                Two real syndicated vendors, shown side by side rather than averaged — they disagree.
              </p>
              {mode === "distilled" ? (
                <div data-testid="radar-distilled-market">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 20 }}>
                    {market.sources.map((s: any) => (
                      <div key={s.source_id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{s.vendor}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.metric.value}%</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 10 }}>
                          compound annual growth rate (CAGR), {s.metric.period.start_year}–{s.metric.period.end_year} ({s.metric.basis}, {s.metric.currency})
                        </div>
                        <StatRow label="Base value" value={`$${s.market_size.base_value_usd_b}B (${s.market_size.base_year})`} />
                        <StatRow label="Forecast value" value={`$${s.market_size.forecast_value_usd_b}B (${s.market_size.forecast_year})`} />
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, display: "inline-block", marginTop: 8 }}>source →</a>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "14px 18px", background: "var(--surface-2)", borderRadius: 12 }}>
                    <SectionLabel>Why they disagree — a {market.conflict_summary.spread_pp} percentage-point (pp) spread</SectionLabel>
                    <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{market.conflict_summary.headline}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{market.conflict_summary.note_on_realism}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <RawTable testid="radar-raw-market" cols={["vendor", "growth (CAGR)", "period", "basis", "currency", "base", "forecast", "source"]}>
                    {market.sources.map((s: any) => (
                      <tr key={s.source_id}>
                        <td style={{ ...TD, color: "var(--ink)", fontWeight: 500 }}>{s.vendor}</td>
                        <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>{s.metric.value}%</td>
                        <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{s.metric.period.start_year}–{s.metric.period.end_year}</td>
                        <td style={{ ...TD, fontSize: 10.5 }}>{s.metric.basis}</td>
                        <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{s.metric.currency}</td>
                        <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>${s.market_size.base_value_usd_b}B ({s.market_size.base_year})</td>
                        <td style={{ ...TD, fontFamily: "var(--font-mono)" }}>${s.market_size.forecast_value_usd_b}B ({s.market_size.forecast_year})</td>
                        <td style={TD}><a href={s.url} target="_blank" rel="noopener noreferrer">open →</a></td>
                      </tr>
                    ))}
                  </RawTable>
                  <div style={{ marginTop: 14, padding: "14px 18px", border: "1px solid var(--line)", borderRadius: 12 }}>
                    <SectionLabel>Conflict record, in full — {market.conflict_summary.spread_pp}pp spread</SectionLabel>
                    <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55 }}>{market.conflict_summary.headline}</p>
                    <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 8, lineHeight: 1.55 }}>{market.conflict_summary.note_on_realism}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--ink-faint)" }}>Loading real market data…</div>
          )}
        </div>
      )}

      {tab === "sources" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--ink-dim)", maxWidth: 680, lineHeight: 1.55, marginBottom: 14 }}>
            Everything the machine currently captures, by source family — and, just as deliberately, what it does not
            capture. A snapshot is labelled a snapshot; a connector that does not exist says so.
          </p>
          {mode === "distilled" ? (
            <div data-testid="radar-distilled-sources" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10, alignContent: "start" }}>
              {(sourceReg?.sources ?? []).map((s: any) => (
                <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    <Pill tone={["SNAPSHOT_VERIFIED_LIVE", "CONNECTED_DISCOVERY_ONLY"].includes(s.status) ? "good" : s.status === "FROZEN" ? "teal" : ["MANUAL_IMPORT", "RATE_LIMITED"].includes(s.status) ? "amber" : "neutral"}>
                      {s.status === "SNAPSHOT_VERIFIED_LIVE" ? "snapshot (verified at retrieval)" : s.status === "CONNECTED_DISCOVERY_ONLY" ? "connected (discovery only)" : s.status.toLowerCase().replace(/_/g, " ")}
                    </Pill>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.45, marginTop: 6 }}>{s.contributes}</p>
                  {s.honest_note && <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4, marginTop: 4 }}>{s.honest_note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <RawTable testid="radar-raw-sources" cols={["id", "source", "status (raw)", "contributes", "honest note"]}>
              {(sourceReg?.sources ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>{s.id}</td>
                  <td style={{ ...TD, color: "var(--ink)", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 10 }}>{s.status}</td>
                  <td style={TD}>{s.contributes}</td>
                  <td style={{ ...TD, fontSize: 10.5 }}>{s.honest_note ?? "—"}</td>
                </tr>
              ))}
            </RawTable>
          )}
          {!sourceReg && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading the source registry…</p>}
        </div>
      )}
      {tab === "competitors" && (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 16 }}>
            <TraceableMetric label="Real competitors analysed" value={sortedRivals.length || "…"}
              onClick={() => setMetricFocus({ label: "Real competitors analysed", value: sortedRivals.length,
                trace: "GET /api/rivals -> len(data/processed/rivals_real.json[\"rivals\"]), built by src/real/rivals_real.py: real Amazon-review competitor brands with >= min_reviews_floor real reviews in the same real category corpus." })} />
            <TraceableMetric label="Real white-space opportunities" value={spaces.length}
              onClick={() => setMetricFocus({ label: "Real white-space opportunities", value: spaces.length,
                trace: "GET /api/white-space -> count of data/processed/white_space_real.json[\"spaces\"] where is_white_space === true, built by src/real/rivals_real.py. Requires all three, real: a Consumer Pain gate pass, >=2 real competitors measurably weaker on that theme, and real 2-5yr feasibility evidence - never inferred from an absence of online evidence." })} />
            <TraceableMetric label="Category reviews" value={rivals?.n_category_reviews.toLocaleString() ?? "…"}
              onClick={() => setMetricFocus({ label: "Category reviews", value: rivals?.n_category_reviews.toLocaleString() ?? "no verified data",
                trace: "GET /api/rivals -> data/processed/rivals_real.json[\"n_category_reviews\"]: real count of Amazon reviews in the full purifier category corpus, used as the denominator for every real per-brand theme rate." })} />
            <TraceableMetric label="Min. reviews/brand floor" value={rivals?.min_reviews_floor ?? "…"}
              onClick={() => setMetricFocus({ label: "Min. reviews/brand floor", value: rivals?.min_reviews_floor ?? "no verified data",
                trace: "GET /api/rivals -> data/processed/rivals_real.json[\"min_reviews_floor\"]: a fixed evidence-sufficiency floor declared in src/real/rivals_real.py - a brand with fewer real reviews than this is excluded from competitor analysis rather than analysed on thin evidence." })} />
          </div>

          {mode === "distilled" ? (
            <div data-testid="radar-distilled-competitors">
              {spaces.map((s) => (
                <Card key={s.opportunity_id} onClick={() => setSpaceFocus(s)} focusable={false} style={{ marginBottom: 12, maxWidth: 640 }}>
                  <Pill tone="good">WHITE SPACE · {s.opportunity_id}</Pill>
                  <h3 style={{ fontSize: 18, marginTop: 8 }}>{s.name}</h3>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 6 }}>
                    {s.rivals_measurably_weak_here.length} real competitors measurably weaker here · feasibility {s.feasibility}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onSendToMagicBox(s.theme); }}
                    style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Send to Magic Box →
                  </button>
                </Card>
              ))}
              <CounterfactualPrompt>What if the category's weakest capability is the one Versuni could own outright?</CounterfactualPrompt>
            </div>
          ) : (
            <div data-testid="radar-raw-competitors">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  onClick={() => setShowWhiteSpace((v) => !v)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: "linear-gradient(120deg, var(--accent-blue), var(--accent-teal))", color: "white" }}
                >
                  {showWhiteSpace ? "← Back to brands" : "Show white space"}
                </button>
              </div>
              {showWhiteSpace ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, alignContent: "start" }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                    White space requires all three, real: a Consumer Pain gate pass, ≥2 real competitors measurably weaker on that theme, and
                    real 2–5yr feasibility evidence.
                  </div>
                  {spaces.map((s) => (
                    <Card key={s.opportunity_id} onClick={() => setSpaceFocus(s)} focusable={false}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <Pill tone="good">WHITE SPACE · {s.opportunity_id}</Pill>
                          <h3 style={{ fontSize: 19, marginTop: 8 }}>{s.name}</h3>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSendToMagicBox(s.theme); }}
                          style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                        >
                          Send to Magic Box →
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                        <StatRow label="Consumer pain — average rating gap (★)" value={s.consumer_pain_csat} />
                        <StatRow label="Feasibility (2–5yr)" value={s.feasibility} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <SectionLabel>Competitors measurably weak here ({s.rivals_measurably_weak_here.length})</SectionLabel>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {s.rivals_measurably_weak_here.map((b) => <Pill key={b}>{b}</Pill>)}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!whiteSpace && <div style={{ color: "var(--ink-faint)" }}>Loading white space evidence…</div>}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 12 }}>
                    {sortedRivals.length} real competitors, ≥{rivals?.min_reviews_floor ?? "…"} reviews each, from {rivals?.n_category_reviews.toLocaleString()} category reviews.
                    Weakness = the theme each brand under-performs the category average on the most.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, alignContent: "start" }}>
                    {sortedRivals.map((r) => {
                      const w = weakestTheme(r);
                      return (
                        <Card key={r.brand} onClick={() => setRivalFocus(r)}>
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
                    {!rivals && <div style={{ color: "var(--ink-faint)" }}>Loading real competitive evidence…</div>}
                  </div>
                </>
              )}
            </div>
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
                <StatRow label="Detected complaint share (conservative lower bound)" value={`${focus.prevalence_pct}%`} />
                <StatRow label="Real reviews mentioning this (n)" value={focus.n_reviews} />
              </>
            )}
            <StatRow label="Source families" value={focus.source_families.join(", ")} />
            <StatRow label="Direction" value={focus.direction} />

            {focus.csat_impact != null && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <SectionLabel>Average rating gap — how it is computed</SectionLabel>
                {themeMean(focus.id) != null && <StatRow label="Theme mean rating" value={`${themeMean(focus.id)!.toFixed(3)}★`} />}
                {corpusMean != null && <StatRow label="Corpus mean rating" value={`${corpusMean.toFixed(3)}★`} />}
                <StatRow label="Difference" value={ratingGapText(focus.csat_impact)} />
                {focus.n_reviews != null && <StatRow label="n (reviews in theme)" value={focus.n_reviews.toLocaleString()} />}
                <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 8 }}>
                  Method: this theme's mean real star rating minus the corpus-wide mean, both over trusted retained reviews.
                  Themes come from a deterministic keyword classifier{cls ? ` that leaves ${cls.unassigned_pct}% of reviews unassigned` : ""},
                  so the share is a conservative lower bound — this is a rating gap, not a satisfaction survey.
                </p>
              </div>
            )}

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

      <FocusPanel open={!!rivalFocus} onClose={() => setRivalFocus(null)} eyebrow="Competitor brand" title={rivalFocus?.brand ?? ""}>
        {rivalFocus && (
          <>
            <StatRow label="Real reviews" value={rivalFocus.n_reviews.toLocaleString()} />
            <StatRow label="Products in corpus" value={rivalFocus.n_products} />
            <StatRow label="Mean rating" value={rivalFocus.mean_rating} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Theme gaps vs. category average</SectionLabel>
              {[...rivalFocus.theme_gaps].sort((a, b) => b.delta_pp - a.delta_pp).map((g) => (
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

      <FocusPanel open={!!spaceFocus} onClose={() => setSpaceFocus(null)} eyebrow={spaceFocus ? `White space · ${spaceFocus.opportunity_id}` : ""} title={spaceFocus?.name ?? ""}>
        {spaceFocus && (
          <>
            <StatRow label="Consumer pain — average rating gap (★)" value={spaceFocus.consumer_pain_csat} />
            <StatRow label="Feasibility (2–5yr)" value={spaceFocus.feasibility} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Competitors measurably weak here ({spaceFocus.rivals_measurably_weak_here.length})</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {spaceFocus.rivals_measurably_weak_here.map((b) => <Pill key={b}>{b}</Pill>)}
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Trace</SectionLabel>
              <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                GET /api/white-space -&gt; data/processed/white_space_real.json["spaces"], built by src/real/rivals_real.py.
                Requires all three, real: a Consumer Pain gate pass, &gt;=2 real competitors measurably weaker on theme "{spaceFocus.theme}",
                and real 2-5yr feasibility evidence - never inferred from an absence of online evidence.
              </p>
            </div>
          </>
        )}
      </FocusPanel>

      <MetricFocusPanel metric={metricFocus} onClose={() => setMetricFocus(null)} />
    </div>
  );
}
