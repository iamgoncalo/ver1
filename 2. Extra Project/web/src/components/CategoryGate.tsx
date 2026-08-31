import { useEffect, useState } from "react";
import { Pill, SectionLabel, StatRow } from "./ui";

// Honest category state, per stage: each world under a non-formal category
// shows ITS OWN stage's real evidence (or its real absence) - never one
// generic gate blocking everything, never another category's data under
// this label, never authored placeholder results.
interface FamilyState { count: number; state: string }
interface CategoryState {
  category: string; label: string; families: Record<string, FamilyState>;
  stage_readiness: Record<string, string>;
  machine_runnable: boolean; honest_note: string | null;
}

const WORLD_NAME: Record<number, string> = {
  1: "Product universe", 2: "Radar", 3: "Paths", 4: "Magic box", 5: "Innovations",
};
const WORLD_STAGE: Record<number, string> = {
  1: "product_universe", 2: "radar", 3: "paths_field", 4: "magic_box", 5: "innovations",
};
const STATE_TONE: Record<string, "good" | "amber" | "rose"> = {
  SUFFICIENT: "good", PARTIAL: "amber", INSUFFICIENT: "rose",
};

export function CategoryGate({ category, world, onBackToAir }: { category: string; world: number; onBackToAir: () => void }) {
  const [state, setState] = useState<CategoryState | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`/api/category-state?category=${encodeURIComponent(category)}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setState).catch(() => setErr(true));
    fetch(`/api/category-data?category=${encodeURIComponent(category)}`)
      .then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  }, [category]);

  const readiness = state?.stage_readiness?.[WORLD_STAGE[world]] ?? null;
  const themes: any[] = data?.themes?.themes
    ? (Array.isArray(data.themes.themes) ? data.themes.themes : Object.values(data.themes.themes))
    : [];
  const topThemes = [...themes].sort((a, b) => (b.prevalence_pct ?? 0) - (a.prevalence_pct ?? 0)).slice(0, 8);
  const rivals: any[] = (data?.rivals?.rivals ?? data?.rivals ?? []).slice ? (data?.rivals?.rivals ?? data?.rivals ?? []) : [];
  const topRivals = [...rivals].sort((a: any, b: any) => (b.n_reviews ?? 0) - (a.n_reviews ?? 0)).slice(0, 8);
  const possibilities: any[] = data?.possibilities?.possibilities ?? data?.possibilities ?? [];
  const candidates: any[] = data?.research_candidates?.candidates ?? [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--surface)", padding: "18px 28px", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 19 }}>{state?.label ?? category} — {WORLD_NAME[world] ?? "this world"}</h2>
          {readiness && <Pill tone={STATE_TONE[readiness] ?? "amber"}>{readiness.toLowerCase()} evidence for this stage</Pill>}
          {state && !state.machine_runnable && <Pill tone="neutral">full machine not runnable yet</Pill>}
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 4, maxWidth: 780 }}>
          Everything below is this category's OWN evidence, acquired by the machine and derived from the reviews themselves — the same
          method stages as air purification, run on an independently-acquired corpus. A stage with no real
          evidence says so; nothing borrows from another category.
        </p>
      </div>

      <div className="scrollY" style={{ flex: 1, minHeight: 0 }} data-testid={`category-stage-${WORLD_STAGE[world]}`}>
        {err && <p style={{ fontSize: 13, color: "var(--rose)" }}>Category state could not be computed — the API returned an error rather than a silent fallback.</p>}
        {!state && !err && <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Computing live category eligibility…</p>}

        {world === 1 && data && (
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: "flex", gap: 32, marginBottom: 12 }}>
              <StatRow label="Frozen validated products" value={state?.families?.products?.count?.toLocaleString() ?? "…"} />
              <StatRow label="Real reviews in corpus" value={state?.families?.reviews?.count?.toLocaleString() ?? "…"} />
            </div>
            <SectionLabel>Sample of the real frozen corpus (top by lifetime ratings)</SectionLabel>
            {(data.products_sample ?? []).map((p: any) => (
              <div key={p.parent_asin} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.title}>{p.title}</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", flexShrink: 0 }}>
                  {p.store} · ★{p.average_rating} · {Number(p.rating_number).toLocaleString()} ratings
                </span>
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>
              Frozen by src/real/freeze_floor_care_products.py — declared evidence floor rating_number ≥ 500;
              acquired by streaming the real Amazon-Reviews-2023 metadata (see data/real_raw/floor_care_*.log).
            </p>
          </div>
        )}

        {world === 2 && data && (
          <div style={{ maxWidth: 820 }}>
            <SectionLabel>Complaint themes learned from the reviews themselves (labels are machine-generated, validation pending human labels)</SectionLabel>
            {topThemes.map((t: any) => (
              <div key={t.theme_id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{t.theme_name}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {t.prevalence_pct}% share (lower bound) · n={Number(t.n_reviews).toLocaleString()} · gap {t.rating_gap_vs_corpus_mean}★
                </span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <SectionLabel>Real competitor brands ({rivals.length} with ≥ 40 reviews)</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topRivals.map((r: any) => (
                  <Pill key={r.brand} tone="neutral">{r.brand} · {Number(r.n_reviews).toLocaleString()}</Pill>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <SectionLabel>Research — live PubMed discovery, CANDIDATE only</SectionLabel>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>
                {candidates.length} real candidate papers retrieved live from PubMed for this category's research
                terms — never promoted to an accepted corpus without the evidence-card reading step.
              </p>
            </div>
            <div style={{ marginTop: 14, border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                <b>Honestly missing:</b> trend documents (0) and market reports (0) — no fetcher exists for these
                families; they require real desk research and archiving, not automation.
              </p>
            </div>
          </div>
        )}

        {world === 3 && (
          <div style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
              No paths exist for this category yet — a tension needs an accepted research corpus (the {candidates.length}
              PubMed candidates are unread), an assumption map needs its own authored reading, and a trajectory
              needs temporal evidence no corpus here contains. Each would be earned by real work, never relabelled
              from air purification.
            </p>
          </div>
        )}

        {world === 4 && data && (
          <div style={{ maxWidth: 820 }}>
            <SectionLabel>Exploratory possibilities — machine-induced cross-product, none yet promoted to an innovation</SectionLabel>
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: 10 }}>
              The 12 authored design operators (category-independent vocabulary) crossed with every induced theme
              clearing the same materiality floor (the minimum complaint share a theme must reach to count) the Air case uses. Labels are machine-generated; nothing here is
              a recommendation.
            </p>
            {possibilities.slice(0, 12).map((x: any) => (
              <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{x.name}</span>
                <Pill tone="neutral">exploratory · not promoted</Pill>
              </div>
            ))}
            {possibilities.length > 12 && <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>+{possibilities.length - 12} more in the raw store.</p>}
          </div>
        )}

        {world === 5 && (
          <div style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
              No innovations are promoted for this category — promotion requires feasibility evidence (trend/market
              families are honestly empty) and criteria evaluation over an accepted research corpus. The
              {" "}{possibilities.length} exploratory possibilities live in the Magic box stage, clearly not yet promoted.
            </p>
          </div>
        )}

        {state && (
          <div style={{ maxWidth: 720, marginTop: 16 }}>
            <SectionLabel>Eligible evidence, by family (live)</SectionLabel>
            {Object.entries(state.families).map(([k, f]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 12 }}>{f.count.toLocaleString()}</span>
                  <Pill tone={STATE_TONE[f.state] ?? "amber"}>{f.state.toLowerCase()}</Pill>
                </span>
              </div>
            ))}
            {state.honest_note && (
              <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 10 }}>{state.honest_note}</p>
            )}
          </div>
        )}
      </div>

      <button onClick={onBackToAir}
        style={{ flexShrink: 0, marginTop: 12, alignSelf: "flex-start", padding: "9px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
        Back to air purification →
      </button>
    </div>
  );
}
