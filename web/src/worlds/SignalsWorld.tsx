import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Signal, SignalsResponse } from "../lib/types";
import { Card, Pill, MiniBar, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, HeroMetric, CounterfactualPrompt, type ViewMode } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { ScienceConstellation } from "../components/ScienceConstellation";

interface ResearchPaper {
  research_id: string; title: string; journal: string; year: number; doi: string; pmid: string | null;
  study_design: string; territories: string[]; found: string; does_not_establish: string; limitations: string;
}
interface ResearchIndex { peer_reviewed_count: number; technical_regulatory_count: number; peer_reviewed_papers: ResearchPaper[] }

const STATE_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  CONVERGING: "good", SINGLE_SOURCE_FAMILY: "amber", CONTESTED: "rose",
};
const STATE_LABEL: Record<string, string> = {
  CONVERGING: "Converging — two or more independent evidence families agree",
  SINGLE_SOURCE_FAMILY: "Single source family — real, but not yet independently corroborated",
  CONTESTED: "Contested — real evidence genuinely disagrees; not resolved either way",
};

export function SignalsWorld() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [focus, setFocus] = useState<Signal | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [research, setResearch] = useState<ResearchIndex | null>(null);
  const [paperFocus, setPaperFocus] = useState<ResearchPaper | null>(null);

  useEffect(() => { api.signals().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => { api.research().then(setResearch).catch(() => setResearch(null)); }, []);
  const signals = data?.signals ?? [];
  const withPrevalence = signals.filter((s) => s.prevalence_pct !== null);
  const researchOnly = signals.filter((s) => s.prevalence_pct === null);
  const maxPrevalence = Math.max(...withPrevalence.map((s) => s.prevalence_pct as number), 1);
  const counts = {
    converging: signals.filter((s) => s.state === "CONVERGING").length,
    single: signals.filter((s) => s.state === "SINGLE_SOURCE_FAMILY").length,
    contested: signals.filter((s) => s.state === "CONTESTED").length,
  };

  function SignalCard({ s }: { s: Signal }) {
    return (
      <Card onClick={() => setFocus(s)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{s.name}</div>
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
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
          2 · WHAT CHANGES — WHAT IS CHANGING?
        </div>
        <h1 style={{ fontSize: 30 }}>Signals</h1>
      </div>
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "distilled" ? (
        <div className="scrollY" style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 40, marginBottom: 20 }}>
            <HeroMetric label="Converging signals" value={counts.converging} />
            <HeroMetric label="Single-source" value={counts.single} />
            <HeroMetric label="Contested" value={counts.contested} />
            <HeroMetric label="Peer-reviewed papers" value={research?.peer_reviewed_count ?? "…"} />
          </div>
          <SectionLabel>Consumer + research (taxonomy-grounded)</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start", marginBottom: 20 }}>
            {withPrevalence.map((s) => <SignalCard key={s.id} s={s} />)}
          </div>
          {researchOnly.length > 0 && (
            <>
              <SectionLabel>Research-only (no consumer-taxonomy analogue)</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignContent: "start" }}>
                {researchOnly.map((s) => <SignalCard key={s.id} s={s} />)}
              </div>
            </>
          )}
          {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real signal evidence…</div>}
          <CounterfactualPrompt>What if the most important smart feature is knowing when not to trust the sensor?</CounterfactualPrompt>
        </div>
      ) : (
        <div className="scrollY" style={{ flex: 1 }}>
          {research && (
            <div style={{ marginBottom: 24 }}>
              <ScienceConstellation onPaperClick={(id) => {
                const p = research.peer_reviewed_papers.find((x) => x.research_id === id);
                if (p) setPaperFocus(p);
              }} />
            </div>
          )}
          <SectionLabel>Full table ({research?.peer_reviewed_papers.length ?? 0} papers, {research?.technical_regulatory_count ?? 0} technical/regulatory sources not shown here — see research.md)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(research?.peer_reviewed_papers ?? []).map((p) => (
              <div key={p.research_id} onClick={() => setPaperFocus(p)} role="button" tabIndex={0}
                style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 16px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", cursor: "pointer" }}>
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
    </div>
  );
}
