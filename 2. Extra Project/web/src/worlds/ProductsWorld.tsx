import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, TruthBadge, CompactInspector, CompactRow } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";
import { DataTable, type Column, type GroupOption } from "../components/DataTable";
import { getParam, useUrlParam } from "../lib/urlState";

// Product Atlas — table-first replacement for the old card-grid Products
// world. Every product SKU (Air + Floor Care), joined to the causal atlas
// via its own real review evidence (src/real/product_causal_join.py).
// evidence_state === "NO_LINKED_EVIDENCE" rows are honest, not a bug: no
// review of that product happened to land in a classified friction theme.
// Nothing here is invented — missing renders as "—", never 0 or guessed.

interface LinkedTheme {
  friction_theme_id: string; friction_theme_name: string;
  n_evidence_reviews: number; atlas_row_ids: string[];
}
interface NeedTouch { need: string; n_evidence_reviews: number }
interface AtlasProduct {
  id: string; name: string; brand: string; domain: "AIR" | "FLOOR"; category: string;
  price_usd: number | null; average_rating: number | null; rating_number_lifetime: number | null;
  n_real_reviews_in_corpus: number; cluster_type: string | null; cluster_intelligence: string | null;
  truth_class: string; evidence_state: "LINKED" | "NO_LINKED_EVIDENCE";
  linked_themes: LinkedTheme[]; needs_touched: NeedTouch[];
  transformations_touched: string[]; state_variables_touched: string[]; burdens_touched: string[];
}
interface ProductAtlasResponse {
  _provenance: string; generated_by: string; n_products: number;
  n_products_linked: number; n_products_unlinked: number; count: number; products: AtlasProduct[];
}
interface ProductRelationship {
  product_a_id: string; product_a_name: string; product_a_domain: string;
  product_b_id: string; product_b_name: string; product_b_domain: string;
  relationship_type: string; cross_domain: boolean;
  shared_needs: string[]; shared_transformations: string[]; shared_burdens: string[]; shared_state_variables: string[];
  overlap_strength: number;
}
interface ProductRelationshipsResponse {
  _provenance: string; generated_by: string; n_total_candidates_before_cap: number;
  capped: boolean; count: number; relationships: ProductRelationship[];
}

type Tab = "table" | "matrix" | "relationships";
type DimensionKey = "needs" | "transformations" | "burdens" | "state_variables";
type DomainFilter = "ALL" | "AIR" | "FLOOR";

const DOMAIN_LABEL: Record<string, string> = { AIR: "Air", FLOOR: "Floor care" };
const TYPE_LABEL: Record<string, string> = {
  standard_purifier: "Standard purifier", personal_portable: "Personal / portable",
  purifier_fan_combo: "Purifier + fan combo", purifier_humidifier_combo: "Purifier + humidifier combo",
};
const INTEL_LABEL: Record<string, string> = {
  manual: "Manual", reactive: "Reactive (auto-sensor)", connected: "Connected (app/voice)", adaptive: "Adaptive (learns/predicts)",
};
const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "needs", label: "Needs" },
  { key: "transformations", label: "Transformations" },
  { key: "burdens", label: "Burdens" },
  { key: "state_variables", label: "State variables" },
];

// Humanizers — the SCREAMING_SNAKE_CASE / snake_case enum values from the
// real pipeline (src/real/causal_atlas_real.py, product_causal_join.py)
// are never shown raw in primary UI text; the raw value stays available in
// a title tooltip for power users.
// Same NEEDS enum as src/real/causal_atlas_real.py / AtlasWorld's
// NEED_LABEL — kept in sync so a need reads identically in both worlds.
const NEED_LABEL: Record<string, string> = {
  RELIABILITY_LONGEVITY: "Reliability & longevity", QUIET_OPERATION: "Quiet operation",
  VERIFIED_EFFECTIVENESS: "Verified effectiveness", SERVICE_CONTINUITY_COST: "Service continuity & cost",
  ODOR_AIR_SAFETY: "Odor & air safety", CUSTOMER_SUPPORT_WARRANTY: "Customer support & warranty",
  VALUE_FOR_MONEY: "Value for money", BUILD_QUALITY_MATERIALS: "Build quality & materials",
};
function humanizeToken(s: string): string {
  return s.replace(/[._]/g, " ").trim().replace(/\s+/g, " ");
}
function toSentence(s: string): string {
  const h = humanizeToken(s).toLowerCase();
  return h ? h.charAt(0).toUpperCase() + h.slice(1) : s;
}
function needLabel(need: string): string {
  return NEED_LABEL[need] ?? toSentence(need);
}
function toTitle(s: string): string {
  const h = humanizeToken(s).toLowerCase();
  return h.replace(/\b\w/g, (c) => c.toUpperCase());
}
function clusterLabel(clusterType: string | null): string {
  if (!clusterType) return "—";
  return TYPE_LABEL[clusterType] ?? toSentence(clusterType);
}
function intelligenceLabel(clusterIntelligence: string | null): string {
  if (!clusterIntelligence) return "—";
  return INTEL_LABEL[clusterIntelligence] ?? toSentence(clusterIntelligence);
}
function topNeeds(needs: NeedTouch[], n = 3): string {
  if (!needs.length) return "—";
  const sorted = [...needs].sort((a, b) => b.n_evidence_reviews - a.n_evidence_reviews);
  const top = sorted.slice(0, n).map((e) => needLabel(e.need));
  const extra = sorted.length - top.length;
  return top.join(", ") + (extra > 0 ? ` +${extra} more` : "");
}
function joinTruncate(arr: string[], n = 4, labeler: (v: string) => string = toSentence): string {
  if (!arr.length) return "—";
  const top = arr.slice(0, n).map(labeler);
  const extra = arr.length - top.length;
  return top.join(", ") + (extra > 0 ? ` +${extra} more` : "");
}
function dimensionValues(p: AtlasProduct, key: DimensionKey): string[] {
  if (key === "needs") return p.needs_touched.map((n) => n.need);
  if (key === "transformations") return p.transformations_touched;
  if (key === "burdens") return p.burdens_touched;
  return p.state_variables_touched;
}
// Picks the friction theme with the most total evidence reviews among a
// selection of products — real, not invented; just the dominant real
// signal already present in the selected rows' linked_themes.
function dominantTheme(selected: AtlasProduct[]): string | null {
  const totals = new Map<string, number>();
  for (const p of selected) {
    for (const t of p.linked_themes) {
      totals.set(t.friction_theme_id, (totals.get(t.friction_theme_id) ?? 0) + t.n_evidence_reviews);
    }
  }
  if (!totals.size) return null;
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const ACTION_BTN_STYLE = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--accent-blue)",
  background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer",
  fontSize: 11.5, fontWeight: 600,
} as const;
const ACTION_BTN_DISABLED_STYLE = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)",
  background: "transparent", color: "var(--ink-faint)", cursor: "not-allowed",
  fontSize: 11.5, fontWeight: 600,
} as const;

export function ProductsWorld({ onGoToWorld }: { onGoToWorld?: (n: number, params?: Record<string, string>) => void }) {
  const [atlasDoc, setAtlasDoc] = useState<ProductAtlasResponse | null>(null);
  const [relDoc, setRelDoc] = useState<ProductRelationshipsResponse | null>(null);
  const [tab, setTab] = useState<Tab>(() => (getParam("tab") as Tab) || "table");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("ALL");
  const [dimensionKey, setDimensionKey] = useState<DimensionKey>("needs");
  const [focus, setFocus] = useState<AtlasProduct | null>(null);
  const [focusTab, setFocusTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.productAtlas().then((d: ProductAtlasResponse) => {
      setAtlasDoc(d);
      const id = getParam("product");
      const p = id ? d.products.find((x) => x.id === id) : null;
      if (p) setFocus(p);
    }).catch(() => setAtlasDoc(null));
  }, []);
  useEffect(() => {
    api.productRelationships().then(setRelDoc).catch(() => setRelDoc(null));
  }, []);

  useUrlParam("tab", tab);
  useUrlParam("product", focus?.id ?? null);

  function openFocus(p: AtlasProduct, tabKey?: string) {
    setFocus(p);
    setFocusTab(tabKey);
  }

  const products = atlasDoc?.products ?? [];
  const filtered = useMemo(
    () => (domainFilter === "ALL" ? products : products.filter((p) => p.domain === domainFilter)),
    [products, domainFilter]
  );
  const relationships = relDoc?.relationships ?? [];
  const filteredRelationships = useMemo(
    () => (domainFilter === "ALL" ? relationships : relationships.filter((r) => r.product_a_domain === domainFilter || r.product_b_domain === domainFilter)),
    [relationships, domainFilter]
  );

  const tableColumns: Column<AtlasProduct>[] = useMemo(() => [
    { key: "name", label: "Product", width: "220px", render: (p) => p.name, sortValue: (p) => p.name },
    { key: "brand", label: "Brand", width: "100px", render: (p) => p.brand, sortValue: (p) => p.brand },
    { key: "domain", label: "Domain", width: "80px", render: (p) => <Pill tone="neutral">{DOMAIN_LABEL[p.domain] ?? p.domain}</Pill>, sortValue: (p) => p.domain },
    { key: "price", label: "Price", width: "70px", align: "right", render: (p) => (p.price_usd != null ? `$${p.price_usd}` : "—"), sortValue: (p) => p.price_usd ?? undefined },
    { key: "rating", label: "Rating", width: "60px", align: "right", render: (p) => (p.average_rating != null ? `★${p.average_rating}` : "—"), sortValue: (p) => p.average_rating ?? undefined },
    { key: "reviews", label: "Reviews", width: "70px", align: "right", render: (p) => p.n_real_reviews_in_corpus, sortValue: (p) => p.n_real_reviews_in_corpus },
    { key: "cluster", label: "Cluster", width: "150px", render: (p) => clusterLabel(p.cluster_type), sortValue: (p) => p.cluster_type ?? undefined },
    { key: "needs", label: "Needs", width: "220px", render: (p) => topNeeds(p.needs_touched) },
    { key: "transformations", label: "Transformations", width: "200px", render: (p) => joinTruncate(p.transformations_touched) },
    { key: "burdens", label: "Burdens", width: "160px", render: (p) => joinTruncate(p.burdens_touched) },
    {
      key: "evidence", label: "Evidence", width: "140px",
      render: (p) => (p.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">No linked evidence</Pill>),
      sortValue: (p) => p.evidence_state,
    },
  ], []);

  const tableGroupOptions: GroupOption<AtlasProduct>[] = useMemo(() => [
    { key: "domain", label: "Domain", groupValue: (p) => DOMAIN_LABEL[p.domain] ?? p.domain },
    { key: "brand", label: "Brand", groupValue: (p) => p.brand },
    { key: "cluster", label: "Cluster", groupValue: (p) => clusterLabel(p.cluster_type) },
    { key: "primary_need", label: "Primary need", groupValue: (p) => (p.needs_touched[0]?.need ? needLabel(p.needs_touched[0].need) : "Unclassified") },
  ], []);

  const dimensionColumnValues = useMemo(() => {
    const set = new Set<string>();
    for (const p of filtered) for (const v of dimensionValues(p, dimensionKey)) set.add(v);
    return [...set].sort();
  }, [filtered, dimensionKey]);

  const matrixColumns: Column<AtlasProduct>[] = useMemo(() => {
    const base: Column<AtlasProduct>[] = [
      { key: "product", label: "Product", width: "220px", render: (p) => p.name, sortValue: (p) => p.name },
      { key: "brand", label: "Brand", width: "100px", render: (p) => p.brand, sortValue: (p) => p.brand },
    ];
    const dimCols: Column<AtlasProduct>[] = dimensionColumnValues.map((val) => ({
      key: `dim:${val}`,
      label: toTitle(val),
      width: "88px",
      align: "right" as const,
      render: (p: AtlasProduct) => {
        if (dimensionKey === "needs") {
          const hit = p.needs_touched.find((n) => n.need === val);
          return hit ? hit.n_evidence_reviews : "—";
        }
        return dimensionValues(p, dimensionKey).includes(val) ? "✓" : "—";
      },
      sortValue: (p: AtlasProduct) => {
        if (dimensionKey === "needs") {
          const hit = p.needs_touched.find((n) => n.need === val);
          return hit ? hit.n_evidence_reviews : undefined;
        }
        return dimensionValues(p, dimensionKey).includes(val) ? 1 : undefined;
      },
    }));
    return [...base, ...dimCols];
  }, [dimensionColumnValues, dimensionKey]);

  const relationshipColumns: Column<ProductRelationship>[] = useMemo(() => [
    { key: "a", label: "Product A", width: "200px", render: (r) => r.product_a_name, sortValue: (r) => r.product_a_name },
    { key: "b", label: "Product B", width: "200px", render: (r) => r.product_b_name, sortValue: (r) => r.product_b_name },
    { key: "type", label: "Type", width: "170px", render: (r) => toSentence(r.relationship_type), sortValue: (r) => r.relationship_type },
    { key: "cross", label: "Cross-domain", width: "90px", render: (r) => (r.cross_domain ? "Yes" : "No"), sortValue: (r) => (r.cross_domain ? 1 : 0) },
    { key: "needs", label: "Shared needs", width: "220px", render: (r) => joinTruncate(r.shared_needs, 4, needLabel) },
    { key: "mechanisms", label: "Shared mechanisms", width: "220px", render: (r) => joinTruncate(r.shared_transformations) },
    { key: "overlap", label: "Overlap", width: "70px", align: "right", render: (r) => r.overlap_strength, sortValue: (r) => r.overlap_strength },
  ], []);

  const relationshipGroupOptions: GroupOption<ProductRelationship>[] = useMemo(() => [
    { key: "type", label: "Type", groupValue: (r) => toSentence(r.relationship_type) },
  ], []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            Product atlas — every real SKU, joined to the causal atlas via real review evidence
          </div>
          <h1 style={{ fontSize: 24 }}>
            {atlasDoc ? `${atlasDoc.n_products} products · ${atlasDoc.n_products_linked} evidence-linked` : "Product atlas"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
          {(["table", "matrix", "relationships"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                background: tab === t ? "var(--surface)" : "transparent", fontWeight: tab === t ? 700 : 500,
                boxShadow: tab === t ? "var(--shadow)" : "none", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value as DomainFilter)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, color: "var(--ink)" }}>
          <option value="ALL">All domains</option>
          <option value="AIR">Air</option>
          <option value="FLOOR">Floor care</option>
        </select>
        {tab === "matrix" && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
            {DIMENSIONS.map((d) => (
              <button key={d.key} onClick={() => setDimensionKey(d.key)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5,
                  background: dimensionKey === d.key ? "var(--surface)" : "transparent", fontWeight: dimensionKey === d.key ? 700 : 500 }}>
                {d.label}
              </button>
            ))}
          </div>
        )}
        {tab === "relationships" && relDoc && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            Showing top {relDoc.count.toLocaleString()} of {relDoc.n_total_candidates_before_cap.toLocaleString()} candidate pairs by overlap strength
            {relDoc.capped ? " (capped)" : ""}
          </span>
        )}
      </div>

      <div className="scrollY" style={{ flex: 1, minHeight: 0 }}>
        {!atlasDoc && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading real product evidence…</p>}

        {atlasDoc && tab === "table" && (
          <DataTable
            rows={filtered}
            columns={tableColumns}
            getRowId={(p) => p.id}
            onRowClick={(p) => openFocus(p, undefined)}
            groupOptions={tableGroupOptions}
            defaultGroupKey="domain"
            searchable
            searchValue={(p) => `${p.name} ${p.brand}`}
            selectable
            selectionActions={(selectedRows, clearSelection) => {
              const theme = dominantTheme(selectedRows);
              return (
                <button
                  disabled={!theme}
                  onClick={() => { if (theme && onGoToWorld) { onGoToWorld(4, { theme }); clearSelection(); } }}
                  title={theme ? `Filters Magic Box to the ${theme} friction theme` : "No products in this selection have evidence-linked friction themes yet"}
                  style={theme ? ACTION_BTN_STYLE : ACTION_BTN_DISABLED_STYLE}
                >
                  {theme ? `Send ${selectedRows.length} to Magic Box` : "No linked friction theme in selection"}
                </button>
              );
            }}
            emptyMessage="No products match."
          />
        )}

        {atlasDoc && tab === "matrix" && (
          <>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10 }}>
              {dimensionColumnValues.length} distinct {DIMENSIONS.find((d) => d.key === dimensionKey)?.label.toLowerCase()} observed across {filtered.length} products.
              {dimensionKey === "needs" ? " Cell = real evidence reviews behind that need for that product." : " ✓ = this product's evidence touches that value; no per-value review count exists beyond needs."}
            </p>
            <DataTable
              rows={filtered}
              columns={matrixColumns}
              getRowId={(p) => p.id}
              onRowClick={(p) => openFocus(p, dimensionKey === "needs" ? "needs" : "causality")}
              searchable
              searchValue={(p) => `${p.name} ${p.brand}`}
              emptyMessage="No products match."
            />
          </>
        )}

        {tab === "relationships" && (
          <DataTable
            rows={filteredRelationships}
            columns={relationshipColumns}
            getRowId={(r) => `${r.product_a_id}::${r.product_b_id}`}
            groupOptions={relationshipGroupOptions}
            defaultGroupKey="type"
            searchable
            searchValue={(r) => `${r.product_a_name} ${r.product_b_name}`}
            defaultSortKey="overlap"
            defaultSortDir="desc"
            emptyMessage={relDoc ? "No relationships match." : "Loading product relationships…"}
          />
        )}
      </div>

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow={focus?.brand} title={focus?.name ?? ""}>
        {focus && (
          <CompactInspector
            defaultTab={focusTab}
            summary={[
              { label: "Domain", value: DOMAIN_LABEL[focus.domain] ?? focus.domain },
              { label: "Brand", value: focus.brand },
              { label: "Price", value: focus.price_usd != null ? `$${focus.price_usd}` : "Unknown" },
              { label: "Rating", value: focus.average_rating != null ? `★${focus.average_rating}` : "Unknown" },
              { label: "Reviews", value: focus.n_real_reviews_in_corpus },
              { label: "Cluster", value: <span title={focus.cluster_intelligence ? intelligenceLabel(focus.cluster_intelligence) : undefined}>{clusterLabel(focus.cluster_type)}</span> },
              { label: "Evidence state", value: focus.evidence_state === "LINKED" ? <Pill tone="good">Linked</Pill> : <Pill tone="neutral">No linked evidence</Pill> },
              { label: "Truth class", value: <TruthBadge truthClass={focus.truth_class} /> },
            ]}
            tabs={[
              {
                key: "needs", label: "Needs",
                content: focus.needs_touched.length ? (
                  <div>
                    {[...focus.needs_touched].sort((a, b) => b.n_evidence_reviews - a.n_evidence_reviews).map((n) => (
                      <CompactRow key={n.need} label={needLabel(n.need)} value={n.n_evidence_reviews} title={n.need} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No evidence-linked needs — no review of this product was classified into a friction theme yet.</p>
                ),
              },
              {
                key: "causality", label: "Causality",
                content: (
                  <div>
                    <SectionLabel>Transformations</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                      {focus.transformations_touched.length
                        ? focus.transformations_touched.map((t) => <Pill key={t} tone="teal">{toSentence(t)}</Pill>)
                        : <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>—</span>}
                    </div>
                    <SectionLabel>State variables</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                      {focus.state_variables_touched.length
                        ? focus.state_variables_touched.map((v) => <Pill key={v} tone="blue">{toSentence(v)}</Pill>)
                        : <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>—</span>}
                    </div>
                    <SectionLabel>Burdens</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {focus.burdens_touched.length
                        ? focus.burdens_touched.map((b) => <Pill key={b} tone="amber">{toSentence(b)}</Pill>)
                        : <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>—</span>}
                    </div>
                  </div>
                ),
              },
              {
                key: "evidence", label: "Evidence",
                content: focus.linked_themes.length ? (
                  <div>
                    {focus.linked_themes.map((t) => (
                      <div key={t.friction_theme_id} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t.friction_theme_name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>{t.n_evidence_reviews} evidence reviews</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2, wordBreak: "break-word" }}>{t.atlas_row_ids.join(", ")}</div>
                        {onGoToWorld && (
                          <button onClick={() => onGoToWorld(9, { theme: t.friction_theme_id })}
                            style={{ ...ACTION_BTN_STYLE, marginTop: 6 }}>
                            Open in Atlas →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No linked friction themes — honestly empty, no review of this product was classified into a theme.</p>
                ),
              },
              {
                key: "trace", label: "Trace",
                content: (
                  <div>
                    <StatRow label="Truth class" value={focus.truth_class.replace(/_/g, " ").toLowerCase()} />
                    <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 10 }}>
                      Derived from real review evidence, joined by set-intersection against the causal atlas — see
                      data/processed/product_causal_join.json, built by src/real/product_causal_join.py. Nothing on
                      this record is invented; an empty field means no matching evidence exists yet.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        )}
      </FocusPanel>
    </div>
  );
}
