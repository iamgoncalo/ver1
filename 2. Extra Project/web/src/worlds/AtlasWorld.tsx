import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, CompactInspector, CompactRow } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { getParam, useUrlParam } from "../lib/urlState";

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Pass 4 (Causal Foundation) - the causal intelligence layer, exposed as a
// cross-cutting analytical lens (System tools, world 9), not a seventh
// funnel stage. Every row is a real Magic Box possibility (Air or Floor
// Care); the L0-L6 causal chain, need mapping and burden dimensions are a
// structured re-expression of already-real fields plus declared
// METHOD_CHOICE derivations - see src/real/causal_atlas_real.py. Nothing
// here is invented per possibility.

interface AtlasRow {
  id: string; category: string; home_domain: string; name: string;
  friction_theme_id: string; friction_theme_name: string;
  primary_need: string; primary_need_epistemic_type: string;
  L0_mechanism: string; L1_transformation: string; L2_proximal_problem: string;
  L3_human_need: string; L4_capability_created: string; L5_freedom_created: string;
  L6_ultimate_direction: string;
  state_variables: string[]; causal_primitives: string[];
  burden_dimensions_addressed: string[];
  current_state: string; desired_state: string;
  form_factor: string | null;
  evidence_state: Record<string, unknown>;
  parent_path_ids: string[]; evidence_ids: string[];
  epistemic_type: string; epistemic_note: string;
}
interface CoverageRow {
  need: string; home_domain: string; state: "STRONG" | "SECONDARY" | "WEAK" | "NO_DATA";
  n_themes_addressing: number; theme_ids: string[];
  worst_rating_gap: number | null; best_rating_gap: number | null;
  n_possibilities_targeting: number; is_white_space: boolean | null;
  evidence_ids: string[];
}

const DOMAIN_LABEL: Record<string, string> = {
  AIR: "Air", FLOOR: "Floor care", FOOD: "Food", BEVERAGE: "Beverage",
  THERMAL_COMFORT: "Thermal comfort", WATER: "Water", GARMENT: "Garment",
  CLEANLINESS: "Cleanliness", SECURITY: "Security", CARE: "Care", PET: "Pet",
  GARDEN: "Garden", SLEEP: "Sleep", RESOURCES: "Resources", KNOWLEDGE: "Knowledge",
  HOME_COORDINATION: "Home coordination",
};
// Sentence-case display for the NEEDS enum (src/real/causal_atlas_real.py) -
// the enum value itself is never rendered raw.
const NEED_LABEL: Record<string, string> = {
  RELIABILITY_LONGEVITY: "Reliability & longevity", QUIET_OPERATION: "Quiet operation",
  VERIFIED_EFFECTIVENESS: "Verified effectiveness", SERVICE_CONTINUITY_COST: "Service continuity & cost",
  ODOR_AIR_SAFETY: "Odor & air safety", CUSTOMER_SUPPORT_WARRANTY: "Customer support & warranty",
  VALUE_FOR_MONEY: "Value for money", BUILD_QUALITY_MATERIALS: "Build quality & materials",
};
function needLabel(need: string): string {
  return NEED_LABEL[need] ?? need.toLowerCase().replace(/_/g, " ");
}
const COVERAGE_TONE: Record<string, "good" | "amber" | "rose" | "neutral"> = {
  STRONG: "good", SECONDARY: "amber", WEAK: "rose", NO_DATA: "neutral",
};
type View = "atlas" | "coverage";
type GroupBy = "none" | "home_domain" | "primary_need";

export function AtlasWorld({ navigate }: { navigate: (n: number, params?: Record<string, string>) => void }) {
  const [atlasDoc, setAtlasDoc] = useState<{ rows: AtlasRow[] } | null>(null);
  const [coverageDoc, setCoverageDoc] = useState<{ rows: CoverageRow[] } | null>(null);
  const [view, setView] = useState<View>(() => (getParam("view") === "coverage" ? "coverage" : "atlas"));
  const [groupBy, setGroupBy] = useState<GroupBy>("home_domain");
  const [domainFilter, setDomainFilter] = useState<string>("ALL");
  const [needFilter, setNeedFilter] = useState<string>("ALL");
  const [focus, setFocus] = useState<AtlasRow | null>(null);
  const [coverageFocus, setCoverageFocus] = useState<CoverageRow | null>(null);

  useEffect(() => {
    api.causalAtlas().then((d) => {
      setAtlasDoc(d);
      const id = getParam("row");
      const hit = id ? d.rows?.find((r: AtlasRow) => r.id === id) : null;
      if (hit) setFocus(hit);
    }).catch(() => setAtlasDoc(null));
    api.needCoverage().then(setCoverageDoc).catch(() => setCoverageDoc(null));
  }, []);

  useUrlParam("view", view);
  useUrlParam("row", focus?.id ?? null);

  const rows = atlasDoc?.rows ?? [];
  const realDomains = useMemo(() => {
    const s = new Set(rows.map((r) => r.home_domain));
    return Array.from(s);
  }, [rows]);
  const needs = useMemo(() => Array.from(new Set(rows.map((r) => r.primary_need))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (domainFilter === "ALL" || r.home_domain === domainFilter) &&
    (needFilter === "ALL" || r.primary_need === needFilter)
  ), [rows, domainFilter, needFilter]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [["All possibilities", filtered]] as [string, AtlasRow[]][];
    const key = (r: AtlasRow) => (groupBy === "home_domain" ? (DOMAIN_LABEL[r.home_domain] ?? r.home_domain) : needLabel(r.primary_need));
    const m = new Map<string, AtlasRow[]>();
    for (const r of filtered) {
      const k = key(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy]);

  const coverageRows = (coverageDoc?.rows ?? []).filter((r) => r.state !== "NO_DATA" || domainFilter === "ALL" || r.home_domain === domainFilter);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 28px", background: "var(--surface)", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>Cross-cutting lens</div>
        <h1 style={{ fontSize: 22, marginTop: 2 }}>Causal map — the causal relationships behind every friction</h1>
        <details style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4, maxWidth: 800 }}>
          <summary style={{ cursor: "pointer" }}>Every possibility read through one causal structure ▸</summary>
          <p style={{ marginTop: 4 }}>
            Every real Magic Box possibility (Air and Floor care), read through one causal structure: what mechanism it
            uses, which need it serves, what human burden it could remove, and how far it is from real. Every field
            traces to a real number or a declared method choice — never invented.
          </p>
        </details>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
          {(["atlas", "coverage"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                background: view === v ? "var(--surface)" : "transparent", fontWeight: view === v ? 600 : 400,
                boxShadow: view === v ? "var(--shadow)" : "none" }}>
              {v === "atlas" ? "Causal atlas" : "Need coverage"}
            </button>
          ))}
        </div>
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, color: "var(--ink)" }}>
          <option value="ALL">All domains</option>
          {realDomains.map((d) => <option key={d} value={d}>{DOMAIN_LABEL[d] ?? d}</option>)}
        </select>
        {view === "atlas" && (
          <>
            <select value={needFilter} onChange={(e) => setNeedFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, color: "var(--ink)" }}>
              <option value="ALL">All needs</option>
              {needs.map((n) => <option key={n} value={n}>{needLabel(n)}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
              {(["home_domain", "primary_need", "none"] as GroupBy[]).map((g) => (
                <button key={g} onClick={() => setGroupBy(g)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
                    background: groupBy === g ? "var(--surface)" : "transparent", fontWeight: groupBy === g ? 600 : 400 }}>
                  {g === "home_domain" ? "Group: domain" : g === "primary_need" ? "Group: need" : "No grouping"}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{filtered.length} possibilities</span>
          </>
        )}
      </div>

      {view === "atlas" && (
        <div className="scrollY" style={{ flex: 1, minHeight: 0 }} data-testid="atlas-table">
          {!atlasDoc && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading the causal atlas…</p>}
          {grouped.map(([label, groupRows]) => (
            <div key={label} style={{ marginBottom: 18 }}>
              {groupBy !== "none" && <SectionLabel>{label} · {groupRows.length}</SectionLabel>}
              <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {["Possibility", "Domain", "Need", "Mechanism (L0)", "Freedom created (L5)", "State", "Form"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((r) => (
                      <tr key={r.id} onClick={() => setFocus(r)} style={{ cursor: "pointer" }}>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{r.name}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11 }}><Pill tone="neutral">{DOMAIN_LABEL[r.home_domain] ?? r.home_domain}</Pill></td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11.5, color: "var(--ink-dim)" }}>{needLabel(r.primary_need)}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-faint)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.L0_mechanism}>{r.L0_mechanism}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-faint)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.L5_freedom_created}>{(r.burden_dimensions_addressed ?? []).join(", ") || "none derivable"}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5 }}>{String((r.evidence_state as any)?.state ?? (r.evidence_state as any)?.status ?? "—").replace(/_/g, " ")}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--ink-faint)" }}>{r.form_factor ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "coverage" && (
        <div className="scrollY" style={{ flex: 1, minHeight: 0 }} data-testid="coverage-table">
          {!coverageDoc && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading need coverage…</p>}
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Need", "Domain", "Coverage", "Themes", "Rating gap range", "Possibilities targeting it"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverageRows.map((r, i) => (
                  <tr key={r.need + r.home_domain + i} onClick={() => setCoverageFocus(r)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{needLabel(r.need)}</td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11 }}><Pill tone="neutral">{DOMAIN_LABEL[r.home_domain] ?? r.home_domain}</Pill></td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11 }}><Pill tone={COVERAGE_TONE[r.state]}>{r.state === "NO_DATA" ? "no data" : r.state.toLowerCase()}</Pill></td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-dim)" }}>{r.n_themes_addressing}</td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-dim)" }}>
                      {r.worst_rating_gap != null ? `${r.worst_rating_gap}★ … ${r.best_rating_gap}★` : "—"}
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-dim)" }}>{r.n_possibilities_targeting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow={focus ? `${DOMAIN_LABEL[focus.home_domain] ?? focus.home_domain} · ${needLabel(focus.primary_need)}` : ""} title={focus?.name ?? ""}>
        {focus && (
          <div data-testid="atlas-row-detail">
            <CompactInspector
              summary={[
                { label: "Current state", value: <span title={focus.current_state}>{truncate(focus.current_state, 70)}</span> },
                { label: "Desired state", value: <span title={focus.desired_state}>{truncate(focus.desired_state, 70)}</span> },
                { label: "Mechanism (L0)", value: focus.L0_mechanism.split(":")[0] },
                { label: "Need (L3)", value: needLabel(focus.primary_need) },
                { label: "Burden addressed", value: (focus.burden_dimensions_addressed ?? []).join(", ") || "none derivable" },
                { label: "Evidence state", value: String((focus.evidence_state as any)?.state ?? (focus.evidence_state as any)?.status ?? "—").replace(/_/g, " ") },
              ]}
              tabs={[
                {
                  key: "causality", label: "Causality",
                  content: (
                    <div>
                      <CompactRow label="L0 Mechanism" value={focus.L0_mechanism} />
                      <CompactRow label="L1 Transformation" value={focus.L1_transformation} title={focus.L1_transformation} />
                      <CompactRow label="L2 Proximal problem" value={focus.L2_proximal_problem} title={focus.L2_proximal_problem} />
                      <CompactRow label="L4 Capability" value={focus.L4_capability_created} title={focus.L4_capability_created} />
                      <CompactRow label="L5 Freedom created" value={focus.L5_freedom_created} title={focus.L5_freedom_created} />
                      <CompactRow label="L6 Direction" value={focus.L6_ultimate_direction} title={focus.L6_ultimate_direction} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                        {(focus.state_variables ?? []).map((v) => <Pill key={v} tone="blue">{v}</Pill>)}
                        {(focus.causal_primitives ?? []).map((v) => <Pill key={v} tone="teal">{v.toLowerCase().replace(/_/g, " ")}</Pill>)}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "relationships", label: "Relationships",
                  content: (
                    <div>
                      <CompactRow label="Friction theme" value={focus.friction_theme_name} />
                      <CompactRow label="Form factor" value={focus.form_factor ?? "not classified"} />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => navigate(4, { possibility: focus.id })}
                          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}>
                          Open in Magic Box →
                        </button>
                        {focus.parent_path_ids?.[0] && (
                          <button onClick={() => navigate(3, { path: focus.parent_path_ids[0] })}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", fontSize: 11.5 }}>
                            Open parent path →
                          </button>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "evidence", label: "Evidence",
                  content: (
                    <div>
                      <CompactRow label="Evidence ids" value={(focus.evidence_ids ?? []).join(", ") || "none"} />
                      <CompactRow label="Parent paths" value={(focus.parent_path_ids ?? []).join(", ") || "none — see Trace"} />
                    </div>
                  ),
                },
                {
                  key: "trace", label: "Trace",
                  content: (
                    <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>{focus.epistemic_note}</p>
                  ),
                },
              ]}
            />
          </div>
        )}
      </FocusPanel>

      <FocusPanel open={!!coverageFocus} onClose={() => setCoverageFocus(null)} eyebrow={coverageFocus ? DOMAIN_LABEL[coverageFocus.home_domain] ?? coverageFocus.home_domain : ""} title={coverageFocus ? needLabel(coverageFocus.need) : ""}>
        {coverageFocus && (
          <>
            <StatRow label="Coverage" value={coverageFocus.state.toLowerCase().replace(/_/g, " ")} />
            <StatRow label="Themes addressing this need" value={coverageFocus.theme_ids.join(", ") || "none"} />
            <StatRow label="Worst rating gap" value={coverageFocus.worst_rating_gap != null ? `${coverageFocus.worst_rating_gap}★` : "unknown"} />
            <StatRow label="Best rating gap" value={coverageFocus.best_rating_gap != null ? `${coverageFocus.best_rating_gap}★` : "unknown"} />
            <StatRow label="Possibilities targeting it" value={coverageFocus.n_possibilities_targeting} />
            {coverageFocus.is_white_space != null && <StatRow label="White space (Air only)" value={coverageFocus.is_white_space ? "yes — real competitor gap" : "no"} />}
            <div style={{ marginTop: 14 }}>
              <button onClick={() => { setCoverageFocus(null); setView("atlas"); setNeedFilter(coverageFocus.need); }}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                See possibilities for this need →
              </button>
            </div>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
