import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Product, ProductsResponse } from "../lib/types";
import { Card, Pill, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, TraceableMetric, MetricFocusPanel, CounterfactualPrompt, type ViewMode, type MetricTrace } from "../components/ui";
import { FocusPanel } from "../components/FocusPanel";

const LENS = {
  type: { key: "cluster_type" as const, label: "ARCHITECTURE (type)" },
  intelligence: { key: "cluster_intelligence" as const, label: "INTELLIGENCE" },
};

const TYPE_LABEL: Record<string, string> = {
  standard_purifier: "Standard purifier", personal_portable: "Personal / portable",
  purifier_fan_combo: "Purifier + fan combo", purifier_humidifier_combo: "Purifier + humidifier combo",
};
const INTEL_LABEL: Record<string, string> = {
  manual: "Manual", reactive: "Reactive (auto-sensor)", connected: "Connected (app/voice)", adaptive: "Adaptive (learns/predicts)",
};
// Raw pipeline status codes are internal jargon - never shown verbatim.
const PRODUCT_STATUS_DETAIL: Record<string, string> = {
  EXACT_VERIFIED: "Exact match to the official product page.",
};

export function ProductsWorld() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [lensKey, setLensKey] = useState<keyof typeof LENS>("type");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<Product | null>(null);
  const [officialFocus, setOfficialFocus] = useState<any | null>(null);
  const [metricFocus, setMetricFocus] = useState<MetricTrace | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");
  const [econ, setEcon] = useState<any>(null);
  const [officialProducts, setOfficialProducts] = useState<any[] | null>(null);
  const [showAllOfficial, setShowAllOfficial] = useState(false);

  useEffect(() => { api.products().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => { api.economics().then(setEcon).catch(() => setEcon(null)); }, []);
  useEffect(() => { api.productImages().then((r) => setOfficialProducts(r.products)).catch(() => setOfficialProducts(null)); }, []);

  function dutchWallet(priceUsd: number) {
    if (!econ) return null;
    const fx = econ.anchors.eur_usd_spot_rate.eur_per_usd;
    const priceEur = Math.round(priceUsd * fx * 100) / 100;
    const wage = econ.anchors.median_gross_hourly_wage_eur.value;
    const meanIncome = econ.anchors.mean_disposable_household_income_eur.value;
    return {
      priceEur, fx,
      workHours: Math.round((priceEur / wage) * 10) / 10,
      shareOfIncomePct: Math.round((priceEur / meanIncome) * 1000) / 10,
    };
  }

  const products = data?.products ?? [];
  const connectedShare = products.length
    ? Math.round((products.filter((p) => p.cluster_intelligence !== "manual").length / products.length) * 100)
    : 0;
  const pricesKnown = products.filter((p) => p.price_usd).map((p) => p.price_usd as number);
  const priceRange = pricesKnown.length ? [Math.min(...pricesKnown), Math.max(...pricesKnown)] : [0, 0];
  const filtered = useMemo(
    () => products.filter((p) => (query ? (p.name + p.brand).toLowerCase().includes(query.toLowerCase()) : true)),
    [products, query]
  );
  const lens = LENS[lensKey];
  const labelMap = lensKey === "type" ? TYPE_LABEL : INTEL_LABEL;
  const groups = useMemo(() => {
    const m = new Map<string, Product[]>();
    for (const p of filtered) {
      const k = p[lens.key];
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, lens]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", letterSpacing: "0.06em", marginBottom: 4 }}>
            1 · WHAT IS — WHAT EXISTS?
          </div>
          <h1 style={{ fontSize: 30 }}>Products</h1>
        </div>
        <DistilledRawToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "distilled" ? (
        <div className="scrollY" style={{ flex: 1 }}>
          {officialProducts && officialProducts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                <SectionLabel>Verified official portfolio — not the Amazon corpus below</SectionLabel>
                {officialProducts.length > 4 && (
                  <button onClick={() => setShowAllOfficial(true)}
                    style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                      border: "1px solid var(--accent-blue)", background: "transparent", color: "var(--accent-blue-ink)", cursor: "pointer" }}>
                    +{officialProducts.length - 4} more →
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", maxWidth: 640, lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                Versuni/Philips sells ~20 real air-purifier families. {officialProducts.length} have been checked this session
                against their own official page — the other ~{20 - officialProducts.length} aren't shown or guessed at, genuinely unverified.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {officialProducts.slice(0, 4).map((p) => (
                  <OfficialProductCard key={p.product_id} p={p} onClick={() => setOfficialFocus(p)} />
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 8 }}>
            <TraceableMetric label="Real products" value={products.length || "…"}
              onClick={() => setMetricFocus({ label: "Real products", value: products.length,
                trace: "GET /api/products -> len(data/processed/products_real.json[\"products\"]), built by src/real/products_signals_real.py from the real, hand-validated 237-product Amazon purifier corpus (McAuley-Lab Amazon-Reviews-2023, filtered by src/real/filter_purifier_products.py)." })} />
            <TraceableMetric label="Connected / reactive share" value={`${connectedShare}%`}
              onClick={() => setMetricFocus({ label: "Connected / reactive share", value: `${connectedShare}%`,
                trace: "Computed live in ProductsWorld.tsx from data/processed/products_real.json: count of products where cluster_intelligence !== \"manual\", divided by total real products. cluster_intelligence itself is assigned by src/real/products_signals_real.py from each real product's title/description keywords." })} />
            <TraceableMetric label="Price range" value={priceRange[1] ? `$${priceRange[0]}–${priceRange[1]}` : "…"}
              onClick={() => setMetricFocus({ label: "Price range", value: priceRange[1] ? `$${priceRange[0]}–${priceRange[1]}` : "NO VERIFIED DATA",
                trace: "Computed live from data/processed/products_real.json: min/max of price_usd across all real products with a known observed price (75 of 237 have one - McAuley-Lab product metadata). Products with no listed price are excluded, not assumed." })} />
            <TraceableMetric label="Real reviews behind this" value={products.reduce((a, p) => a + p.n_real_reviews_in_corpus, 0).toLocaleString() || "…"}
              onClick={() => setMetricFocus({ label: "Real reviews behind this", value: products.reduce((a, p) => a + p.n_real_reviews_in_corpus, 0).toLocaleString(),
                trace: "Computed live from data/processed/products_real.json: sum of n_real_reviews_in_corpus across all 237 real products - the real, hand-validated Amazon review count each product's evidence is drawn from (src/real/build_reviews_csv.py)." })} />
          </div>
          <p style={{ fontSize: 15, color: "var(--ink)", maxWidth: 640, lineHeight: 1.55, marginTop: 28, fontFamily: "var(--font-display)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            The portfolio is moving from air-cleaning toward sensing and connectivity — but {100 - connectedShare}%
            of this real corpus is still fully manual.
          </p>
          {econ && (
            <div style={{ marginTop: 20, padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, maxWidth: 640 }}>
              <SectionLabel>Dutch household context (real, verified)</SectionLabel>
              <div style={{ display: "flex", gap: 32 }}>
                <StatRow label="Mean household disposable income" value={`€${econ.anchors.mean_disposable_household_income_eur.value.toLocaleString()}/yr (2024)`} />
                <StatRow label="Appliance-market turnover/household" value={`€${econ.derived.appliance_market_turnover_per_household_eur} (2025)`} />
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>Click any product for its own affordability context.</p>
            </div>
          )}
          <CounterfactualPrompt>What if "air purifier" is the wrong unit of innovation?</CounterfactualPrompt>
        </div>
      ) : (
      <>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--rose)", letterSpacing: "0.04em", marginBottom: 10, flexShrink: 0 }}>
        CONSUMER REVIEW CORPUS — real competitor brands from Amazon reviews. This is evidence, not Versuni's official portfolio (see the verified official product above in Distilled).
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 237 products…"
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, width: 220, color: "var(--ink)" }}
          />
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
            {(Object.keys(LENS) as (keyof typeof LENS)[]).map((k) => (
              <button key={k} onClick={() => setLensKey(k)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                  background: lensKey === k ? "var(--surface)" : "transparent", fontWeight: lensKey === k ? 600 : 400,
                  boxShadow: lensKey === k ? "var(--shadow)" : "none" }}>
                {LENS[k].label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
            {filtered.length} real, hand-validated products. Two verified cluster lenses — Performance/Context/Generation
            omitted: no real CADR/room-coverage/generation-lineage evidence exists. Missing stays missing, never inferred.
          </span>
      </div>

      <div className="scrollY" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map(([key, items]) => (
          <div key={key}>
            <SectionLabel>{labelMap[key] ?? key} · {items.length}</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {items.slice(0, 60).map((p) => (
                <Card key={p.id} onClick={() => setFocus(p)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>{p.brand}</span>
                    <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
                      {p.average_rating ? `★${p.average_rating}` : "—"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, margin: "6px 0 8px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill>{p.price_usd ? `$${p.price_usd}` : "price unknown"}</Pill>
                    <Pill tone="teal">{p.n_real_reviews_in_corpus} reviews</Pill>
                  </div>
                </Card>
              ))}
              {items.length > 60 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 12 }}>
                  +{items.length - 60} more (search to narrow)
                </div>
              )}
            </div>
          </div>
        ))}
        {!data && <div style={{ color: "var(--ink-faint)" }}>Loading real product evidence…</div>}
      </div>
      </>
      )}

      <FocusPanel open={!!focus} onClose={() => setFocus(null)} eyebrow={focus?.brand} title={focus?.name ?? ""}>
        {focus && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <TruthBadge truthClass={focus.truth_class} />
              <Pill>{TYPE_LABEL[focus.cluster_type] ?? focus.cluster_type}</Pill>
              <Pill tone="teal">{INTEL_LABEL[focus.cluster_intelligence] ?? focus.cluster_intelligence}</Pill>
            </div>
            <StatRow label="Price (observed)" value={focus.price_usd ? `$${focus.price_usd}` : "UNKNOWN"} />
            <StatRow label="Average rating (lifetime)" value={focus.average_rating ?? "UNKNOWN"} />
            <StatRow label="Ratings (lifetime, all Amazon)" value={focus.rating_number_lifetime?.toLocaleString() ?? "UNKNOWN"} />
            <StatRow label="Reviews in this corpus" value={focus.n_real_reviews_in_corpus} />
            <StatRow label="Mean rating in this corpus" value={focus.mean_rating_in_corpus} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Evidence</SectionLabel>
              <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{focus.evidence}</p>
            </div>
            {focus.price_usd && econ && (() => {
              const w = dutchWallet(focus.price_usd as number);
              if (!w) return null;
              return (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <SectionLabel>Dutch Wallet — affordability context, not WTP</SectionLabel>
                  <StatRow label="Price (EUR, modelled from real spot rate)" value={`€${w.priceEur}`} />
                  <StatRow label="Median gross work hours" value={w.workHours} />
                  <StatRow label="Share of mean household disposable income" value={`${w.shareOfIncomePct}%`} />
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 8 }}>
                    Wage anchor €{econ.anchors.median_gross_hourly_wage_eur.value}/hr (2025, {econ.anchors.median_gross_hourly_wage_eur.confidence} confidence
                    — see economics.md for a documented cross-source conflict on this figure). Income anchor €{econ.anchors.mean_disposable_household_income_eur.value.toLocaleString()}
                    /household (CBS, 2024 preliminary). This is affordability context, never willingness to pay.
                  </p>
                </div>
              );
            })()}
          </>
        )}
      </FocusPanel>

      <FocusPanel open={!!officialFocus} onClose={() => setOfficialFocus(null)} eyebrow={officialFocus ? `${officialFocus.family} — official Versuni/Philips` : ""} title={officialFocus?.official_name ?? ""}>
        {officialFocus && (
          <>
            <img src={`/products/${officialFocus.local_asset.split("/").pop()}`} alt={officialFocus.official_name}
              style={{ width: "100%", maxWidth: 220, objectFit: "contain", display: "block", margin: "0 auto 16px" }} />
            {PRODUCT_STATUS_DETAIL[officialFocus.status] && (
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 16 }}>{PRODUCT_STATUS_DETAIL[officialFocus.status]}</p>
            )}
            <StatRow label="SKU" value={officialFocus.sku} />
            <StatRow label="Region verified" value={officialFocus.region} />
            <StatRow label="Publisher" value={officialFocus.publisher} />
            <StatRow label="Retrieved" value={officialFocus.retrieved_at} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Specs (official page)</SectionLabel>
              <StatRow label="Clean-air delivery rate" value={`${officialFocus.specs.cadr_m3h} m³/h`} />
              <StatRow label="Room coverage" value={`${officialFocus.specs.room_coverage_m2} m²`} />
              <StatRow label="Min. noise" value={`${officialFocus.specs.noise_min_dba} dBA`} />
              <StatRow label="Filter architecture" value={officialFocus.specs.filter_architecture} />
              <StatRow label="Connectivity" value={officialFocus.specs.connectivity} />
              <StatRow label="Sensors" value={officialFocus.specs.sensors} />
              <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>{officialFocus.specs.confidence}</p>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <SectionLabel>Provenance</SectionLabel>
              <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, wordBreak: "break-all" }}>
                sha256: {officialFocus.sha256}
              </p>
              <a href={officialFocus.official_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>official source →</a>
            </div>
          </>
        )}
      </FocusPanel>

      <MetricFocusPanel metric={metricFocus} onClose={() => setMetricFocus(null)} />

      {showAllOfficial && officialProducts && (
        <>
          <div onClick={() => setShowAllOfficial(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,12,16,0.42)", zIndex: 60 }} />
          <div style={{
            position: "fixed", top: "8vh", left: "50%", transform: "translateX(-50%)", width: "min(920px, 94vw)", maxHeight: "84vh",
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)",
            zIndex: 61, display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <SectionLabel>Verified official portfolio</SectionLabel>
                <div style={{ fontWeight: 600, fontSize: 17, marginTop: 4 }}>All {officialProducts.length} checked products</div>
              </div>
              <button onClick={() => setShowAllOfficial(false)} style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>✕</button>
            </div>
            <div className="scrollY" style={{ padding: 20, flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {officialProducts.map((p) => (
                  <OfficialProductCard key={p.product_id} p={p} onClick={() => { setOfficialFocus(p); setShowAllOfficial(false); }} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OfficialProductCard({ p, onClick }: { p: any; onClick: () => void }) {
  return (
    <Card onClick={onClick} focusable={false}
      style={{ display: "flex", gap: 16, alignItems: "center", padding: "14px 18px", borderColor: "var(--accent-blue)", borderRadius: 16, boxSizing: "border-box" }}>
      <img src={`/products/${p.local_asset.split("/").pop()}`} alt={p.official_name}
        style={{ width: 70, height: 70, objectFit: "contain", flexShrink: 0 }} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--accent-blue-ink)", letterSpacing: "0.03em" }}>{p.sku}</div>
        <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4, lineHeight: 1.3, overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={p.official_name}>{p.official_name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2, overflowWrap: "break-word" }}>
          {p.specs.cadr_m3h} m³/h · {p.specs.room_coverage_m2} m²
        </div>
        <a href={p.official_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11 }}>official source →</a>
      </div>
    </Card>
  );
}
