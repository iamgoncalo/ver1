import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Product, ProductsResponse } from "../lib/types";
import { Card, Pill, StatRow, TruthBadge, SectionLabel, DistilledRawToggle, HeroMetric, CounterfactualPrompt, type ViewMode } from "../components/ui";
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

export function ProductsWorld() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [lensKey, setLensKey] = useState<keyof typeof LENS>("type");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<Product | null>(null);
  const [mode, setMode] = useState<ViewMode>("distilled");

  useEffect(() => { api.products().then(setData).catch(() => setData(null)); }, []);

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 40, marginBottom: 8 }}>
            <HeroMetric label="Real products" value={products.length || "…"} />
            <HeroMetric label="Connected / reactive share" value={`${connectedShare}%`} />
            <HeroMetric label="Price range" value={priceRange[1] ? `$${priceRange[0]}–${priceRange[1]}` : "…"} />
            <HeroMetric label="Real reviews behind this" value={products.reduce((a, p) => a + p.n_real_reviews_in_corpus, 0).toLocaleString() || "…"} />
          </div>
          <p style={{ fontSize: 15, color: "var(--ink)", maxWidth: 640, lineHeight: 1.55, marginTop: 28, fontFamily: "var(--font-display)" }}>
            The portfolio is moving from pure air-cleaning performance toward sensing and connectivity —
            but {100 - connectedShare}% of this real corpus is still fully manual, and CADR/room-coverage
            data isn't available to test whether performance itself has plateaued.
          </p>
          <CounterfactualPrompt>What if "air purifier" is the wrong unit of innovation?</CounterfactualPrompt>
        </div>
      ) : (
      <>
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
          </>
        )}
      </FocusPanel>
    </div>
  );
}
