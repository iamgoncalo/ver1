import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, MiniBar, CompactInspector, CompactRow } from "./ui";
import { FocusPanel } from "./FocusPanel";
import { DataTable, type Column, type GroupOption } from "./DataTable";

// COMPETITIVE FIELD — the competition, one brand per row. Lives inside the
// Radar's Competitors lens (raw mode). Every value is a straight aggregate
// over the real product<->causal-atlas join (src/real/product_causal_join.py):
// which real products each brand ships in the category corpora, how much
// review volume it owns, and which friction theme its OWN customers'
// classified reviews name most. Deep analytical tables (SKU atlas, matrices,
// pairwise relationships) live in Magic Box -> Smart tables, not here.
// Nothing is invented — a brand with no classified reviews shows an honest
// empty, never a guessed value.

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

type DomainFilter = "ALL" | "AIR" | "FLOOR";

const DOMAIN_LABEL: Record<string, string> = { AIR: "Air", FLOOR: "Floor care" };
const NEED_LABEL: Record<string, string> = {
  RELIABILITY_LONGEVITY: "Reliability & longevity", QUIET_OPERATION: "Quiet operation",
  VERIFIED_EFFECTIVENESS: "Verified effectiveness", SERVICE_CONTINUITY_COST: "Service continuity & cost",
  ODOR_AIR_SAFETY: "Odor & air safety", CUSTOMER_SUPPORT_WARRANTY: "Customer support & warranty",
  VALUE_FOR_MONEY: "Value for money", BUILD_QUALITY_MATERIALS: "Build quality & materials",
};
function toSentence(s: string): string {
  const h = s.replace(/[._]/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
  return h ? h.charAt(0).toUpperCase() + h.slice(1) : s;
}
function needLabel(need: string): string {
  return NEED_LABEL[need] ?? toSentence(need);
}

// One brand's competitive rollup — every number a straight sum/weighted mean
// over that brand's own real SKU records; nothing is scored or judged.
interface BrandRow {
  brand: string;
  domains: string[];
  n_products: number;
  corpus_reviews: number;
  weighted_rating: number | null;   // review-weighted mean of per-SKU Amazon ratings
  price_min: number | null;
  price_max: number | null;
  top_friction_need: string | null; // need with the most classified evidence reviews
  top_friction_reviews: number;
  need_totals: { need: string; n: number }[];
  products: AtlasProduct[];
}

function buildBrandRows(products: AtlasProduct[]): BrandRow[] {
  const byBrand = new Map<string, AtlasProduct[]>();
  for (const p of products) {
    const b = (p.brand ?? "").trim();
    if (!b) continue; // a SKU with no recorded store/brand cannot be attributed — omitted, never guessed
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b)!.push(p);
  }
  const rows: BrandRow[] = [];
  for (const [brand, ps] of byBrand) {
    let corpus = 0, ratingNum = 0, ratingDen = 0;
    let priceMin: number | null = null, priceMax: number | null = null;
    const needTotals = new Map<string, number>();
    const domains = new Set<string>();
    for (const p of ps) {
      corpus += p.n_real_reviews_in_corpus;
      domains.add(p.domain);
      if (p.average_rating != null) {
        const w = Math.max(1, p.n_real_reviews_in_corpus);
        ratingNum += p.average_rating * w;
        ratingDen += w;
      }
      if (p.price_usd != null) {
        priceMin = priceMin == null ? p.price_usd : Math.min(priceMin, p.price_usd);
        priceMax = priceMax == null ? p.price_usd : Math.max(priceMax, p.price_usd);
      }
      for (const n of p.needs_touched) needTotals.set(n.need, (needTotals.get(n.need) ?? 0) + n.n_evidence_reviews);
    }
    const sortedNeeds = [...needTotals.entries()].sort((a, b) => b[1] - a[1]);
    rows.push({
      brand, domains: [...domains].sort(), n_products: ps.length, corpus_reviews: corpus,
      weighted_rating: ratingDen ? Math.round((ratingNum / ratingDen) * 100) / 100 : null,
      price_min: priceMin, price_max: priceMax,
      top_friction_need: sortedNeeds[0]?.[0] ?? null,
      top_friction_reviews: sortedNeeds[0]?.[1] ?? 0,
      need_totals: sortedNeeds.map(([need, n]) => ({ need, n })),
      products: ps,
    });
  }
  return rows.sort((a, b) => b.corpus_reviews - a.corpus_reviews);
}

function priceRange(b: BrandRow): string {
  if (b.price_min == null) return "—";
  if (b.price_min === b.price_max) return `$${b.price_min}`;
  return `$${b.price_min}–$${b.price_max}`;
}

function HeroChip({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2, letterSpacing: "0.02em" }}>{label}</div>
    </div>
  );
}

export function CompetitiveField({ onOpenBrand }: {
  onOpenBrand?: (brand: string) => boolean; // returns true if a rival panel opened for this brand
}) {
  const [atlasDoc, setAtlasDoc] = useState<ProductAtlasResponse | null>(null);
  const [nRelationships, setNRelationships] = useState<number | null>(null);
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("ALL");
  const [brandFocus, setBrandFocus] = useState<BrandRow | null>(null);

  useEffect(() => {
    api.productAtlas().then(setAtlasDoc).catch(() => setAtlasDoc(null));
    api.productRelationships().then((d: any) => setNRelationships(d.n_total_candidates_before_cap)).catch(() => setNRelationships(null));
  }, []);

  const products = atlasDoc?.products ?? [];
  const filtered = useMemo(
    () => (domainFilter === "ALL" ? products : products.filter((p) => p.domain === domainFilter)),
    [products, domainFilter]
  );
  const brandRows = useMemo(() => buildBrandRows(filtered), [filtered]);
  const totalCorpusReviews = useMemo(() => filtered.reduce((a, p) => a + p.n_real_reviews_in_corpus, 0), [filtered]);
  const maxCorpus = brandRows[0]?.corpus_reviews ?? 1;

  const brandColumns: Column<BrandRow>[] = useMemo(() => [
    { key: "brand", label: "Brand", width: "24%", render: (b) => <span style={{ fontWeight: 600 }}>{b.brand}</span>, sortValue: (b) => b.brand },
    { key: "domains", label: "Domain", width: "10%", render: (b) => b.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" + "), sortValue: (b) => b.domains.join() },
    { key: "skus", label: "Products", width: "8%", align: "right", render: (b) => b.n_products, sortValue: (b) => b.n_products },
    {
      key: "reviews", label: "Review volume", width: "22%",
      render: (b) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}
          title={totalCorpusReviews ? `${Math.round((b.corpus_reviews / totalCorpusReviews) * 1000) / 10}% of all corpus reviews in this filter` : undefined}>
          <div style={{ width: 70, flexShrink: 0 }}><MiniBar value={b.corpus_reviews} max={maxCorpus} tone="blue" /></div>
          <span className="mono" style={{ fontSize: 11 }}>{b.corpus_reviews.toLocaleString()}</span>
          {totalCorpusReviews > 0 && (
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              {Math.round((b.corpus_reviews / totalCorpusReviews) * 1000) / 10}%
            </span>
          )}
        </div>
      ),
      sortValue: (b) => b.corpus_reviews,
    },
    { key: "rating", label: "★ avg", width: "8%", align: "right", render: (b) => (b.weighted_rating != null ? `★${b.weighted_rating}` : "—"), sortValue: (b) => b.weighted_rating ?? undefined },
    { key: "price", label: "Price range", width: "12%", align: "right", render: (b) => priceRange(b), sortValue: (b) => b.price_min ?? undefined },
    {
      key: "friction", label: "Customers complain most about", width: "16%",
      render: (b) => (b.top_friction_need
        ? <span title={`${b.top_friction_reviews} of this brand's own reviews were classified into this friction`}>
            <Pill tone="rose">{needLabel(b.top_friction_need)}</Pill>
          </span>
        : <span style={{ color: "var(--ink-faint)" }}>no classified friction yet</span>),
      sortValue: (b) => b.top_friction_reviews,
    },
  ], [maxCorpus, totalCorpusReviews]);

  const brandGroupOptions: GroupOption<BrandRow>[] = useMemo(() => [
    { key: "domain", label: "Domain", groupValue: (b) => b.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" + ") },
    { key: "friction", label: "Top friction", groupValue: (b) => (b.top_friction_need ? needLabel(b.top_friction_need) : "No classified friction") },
  ], []);

  return (
    <div data-testid="competitive-field">
      {/* The whole battlefield in one glance — every number real */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: 12, flexWrap: "wrap" }}>
        <HeroChip value={atlasDoc ? String(brandRows.length) : "…"} label="competitor brands" />
        <HeroChip value={atlasDoc ? String(filtered.length) : "…"} label="real products" />
        <HeroChip value={atlasDoc ? totalCorpusReviews.toLocaleString() : "…"} label="corpus reviews" />
        <HeroChip value={nRelationships != null ? nRelationships.toLocaleString() : "…"} label="structural relationships found" />
        <div style={{ flex: 1 }} />
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value as DomainFilter)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", alignSelf: "center" }}>
          <option value="ALL">All domains</option>
          <option value="AIR">Air</option>
          <option value="FLOOR">Floor care</option>
        </select>
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}
        title="The complaint column is the friction theme each brand's own reviews were classified into most — its softest flank, in its customers' words.">
        Complaints = each brand's most-classified friction theme. Deeper tables live in Magic box → Smart tables.
      </div>

      <div style={{ maxHeight: "56vh", overflowY: "auto", borderRadius: 12 }}>
        {!atlasDoc && <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading real competitive evidence…</p>}
        {atlasDoc && (
          <DataTable
            rows={brandRows}
            columns={brandColumns}
            getRowId={(b) => b.brand}
            onRowClick={(b) => {
              // A brand that cleared the rivals evidence floor gets the full
              // per-theme gap panel; anyone else gets the compact rollup.
              const opened = onOpenBrand ? onOpenBrand(b.brand) : false;
              if (!opened) setBrandFocus(b);
            }}
            groupOptions={brandGroupOptions}
            searchable
            searchValue={(b) => b.brand}
            defaultSortKey="reviews"
            defaultSortDir="desc"
            emptyMessage="No brands match."
          />
        )}
      </div>

      <FocusPanel open={!!brandFocus} onClose={() => setBrandFocus(null)} eyebrow="Competitor brand" title={brandFocus?.brand ?? ""}>
        {brandFocus && (
          <CompactInspector
            summary={[
              { label: "Domains", value: brandFocus.domains.map((d) => DOMAIN_LABEL[d] ?? d).join(" + ") },
              { label: "Products", value: brandFocus.n_products },
              { label: "Corpus reviews", value: brandFocus.corpus_reviews.toLocaleString() },
              { label: "★ avg (review-weighted)", value: brandFocus.weighted_rating != null ? `★${brandFocus.weighted_rating}` : "Unknown" },
              { label: "Price range", value: priceRange(brandFocus) },
              { label: "Top friction", value: brandFocus.top_friction_need ? needLabel(brandFocus.top_friction_need) : "None classified" },
            ]}
            tabs={[
              {
                key: "frictions", label: "Frictions",
                content: brandFocus.need_totals.length ? (
                  <div>
                    {brandFocus.need_totals.map((n) => (
                      <CompactRow key={n.need} label={needLabel(n.need)} value={`${n.n.toLocaleString()} reviews`} title={n.need} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>No review of this brand's products was classified into a friction theme yet — honestly empty.</p>
                ),
              },
              {
                key: "products", label: "Products",
                content: (
                  <div>
                    {[...brandFocus.products].sort((a, b) => b.n_real_reviews_in_corpus - a.n_real_reviews_in_corpus).map((p) => (
                      <CompactRow key={p.id} label={p.name} title={p.name}
                        value={`${p.n_real_reviews_in_corpus.toLocaleString()} reviews${p.average_rating != null ? ` · ★${p.average_rating}` : ""}${p.price_usd != null ? ` · $${p.price_usd}` : ""}`} />
                    ))}
                  </div>
                ),
              },
              {
                key: "trace", label: "Trace",
                content: (
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                    Aggregated live from data/processed/product_causal_join.json (src/real/product_causal_join.py):
                    straight sums and review-weighted means over this brand's own real SKU records. This brand is
                    below the rivals evidence floor for the full per-theme gap analysis (src/real/rivals_real.py),
                    so only these direct aggregates are shown — never an extrapolated gap.
                  </p>
                ),
              },
            ]}
          />
        )}
      </FocusPanel>
    </div>
  );
}
