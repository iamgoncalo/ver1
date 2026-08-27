# economics.md — Dutch economic truth layer

Economics is not a separate dashboard here — it feeds Products (price/
affordability/TCO), Research (energy/filter/runtime consequences), Rivals
(economic position where verified), Counterfactuals (economic conditions),
and Bets (Economic Value). This file is the canonical source for every
Dutch economic anchor used anywhere in the case.

## SOURCE HIERARCHY

| Class | What it establishes |
|---|---|
| `OBSERVED` | A figure read directly off a named, dated, primary source (CBS, APPLiA, Eurostat) |
| `DERIVED` | A ratio or computation from two or more OBSERVED figures, with the formula shown |
| `MODELLED` | A projection built on explicit, stated assumptions (e.g. a TCO estimate) |
| `COUNTERFACTUAL` | A "what if" scenario — never a forecast, always labelled as such |

## DUTCH ANCHORS — VERIFIED 2026-08-26 (live web search + fetch, this session)

| Anchor | Value | Year | Class | Source | Confidence |
|---|---|---|---|---|---|
| Mean disposable household income | €60,200 / household | 2024 (preliminary) | OBSERVED | [CBS — Financial position of households](https://www.cbs.nl/en-gb/figures/detail/83739eng) | HIGH — read directly off the CBS table |
| Mean **equivalised** disposable income | €41,900 / household | 2024 (preliminary) | OBSERVED | same CBS table | HIGH |
| Prior-year confirmed (not preliminary) | €57,600 mean / €40,000 mean equivalised | 2023 | OBSERVED | same CBS table | HIGH |
| Median household income (likely equivalised — not confirmed on the same page as the mean figures above) | ≈€36,500 | 2024 | OBSERVED, flagged | CBS, via secondary aggregation | MEDIUM — needs direct StatLine confirmation that this is the *equivalised* median, not raw median |
| Private households | 8.4 million | 1 Jan 2025 | OBSERVED | [CBS — Huishoudens nu](https://www.cbs.nl/nl-nl/visualisaties/dashboard-bevolking/woonsituatie/huishoudens-nu) | HIGH |
| Dutch appliance-market turnover | €3.712bn (2024) → €3.759bn (2025), +1.3% | 2024–2025 | OBSERVED | [APPLiA Nederland — Jaarcijfers 2025](https://applianederland.nl/applia-nederland-jaarcijfers-2025/) | HIGH — exact figures quoted directly from the trade association's own release |
| MDA (large appliance) unit volume | −0.4% | 2025 vs 2024 | OBSERVED | same APPLiA release | HIGH |
| SDA (small appliance) units vs. revenue | units −2.2%, revenue **+5%** — real premiumisation | 2025 vs 2024 | OBSERVED | same APPLiA release | HIGH — direct quote: "Consumenten kiezen bij kleine huishoudelijke apparaten (SDA) vaker voor gemak en premiumproducten," driven by robot vacuums (+61% revenue) and premium coffee machines (+7%) |
| Household electricity price, 2,500–5,000 kWh band | €0.2342/kWh | H1 2025 | OBSERVED | Eurostat, via [Statista](https://www.statista.com/statistics/418106/electricity-prices-for-households-in-netherlands/) | MEDIUM-HIGH — Eurostat-harmonized figure, not a raw CBS StatLine row; directionally cross-checked against CBS's own average annual energy bill figure below |
| Average annual household energy bill | €2,065/year (elec + gas) at Jan-2025 prices; avg. consumption 1,706 kWh electricity + 987 m³ gas | Jan 2025 | OBSERVED | [CBS — De energierekening januari 2025](https://www.cbs.nl/nl-nl/longread/aanvullende-statistische-diensten/2025/de-energierekening-januari-2025) | HIGH — direct CBS figure, different framing (annual bill, not per-kWh price) used as a cross-check |
| Median gross hourly wage | ≈€23.51/hour | 2025 | OBSERVED, **flagged — needs direct re-verification** | CBS-attributed, via secondary aggregation (not independently re-confirmed on a single primary CBS page this session) | MEDIUM — see note below |
| Mean gross hourly wage | ≈€26.59/hour (one source) vs. €30/hour (another CBS dashboard) | 2025 | OBSERVED, **contradictory across sources** | CBS (two different CBS-attributed pages gave two different mean figures) | LOW-MEDIUM — see note below |
| Mean hourly wage by gender | men €31.79, women €28.71 | 2025 | OBSERVED | [CBS — Loonverschil tussen mannen en vrouwen](https://www.cbs.nl/nl-nl/nieuws/2025/18/loonverschil-tussen-mannen-en-vrouwen-steeds-kleiner) | HIGH — direct quote, though this specific page's underlying data year is 2024 (published 29 Apr 2025) |

### Honest note on the hourly-wage anchor

This is exactly the trap the brief warned about: **two different CBS-attributed pages gave two different "mean hourly wage" figures for the same year** (€26.59 vs. €30), and neither was independently confirmed against a single, directly-fetched CBS StatLine table row. The €30/hour figure appears on a CAO-wage dashboard, which likely covers a different population (CAO-covered full-time-equivalent wages) than the €26.59/€23.51 pair (all employees, all contract types). **Do not treat either number as frozen.** The candidate value from the original brief (€26.90/hour) sits almost exactly between the two mean figures found — plausible, but not independently reconstructed from a primary source this session.

**Decision for this pass:** the Dutch Wallet (below) uses the **median, €23.51/hour**, as the "gross work hours" anchor — median is the right measure for a "typical worker" affordability frame (robust to high-earner skew, and the brief itself asks for median where available) — but this number carries a MEDIUM confidence flag and should be re-verified against a direct CBS StatLine query (`Werknemers; uurloon en beroep`, table 85517NED or 86355NED) before being treated as final for a live interview.

## AFFORDABILITY DEFINITIONS (never called WTP)

```
GROSS WORK HOURS = price / median gross hourly wage (€23.51, 2025, flagged)
SHARE OF MEAN HOUSEHOLD DISPOSABLE INCOME = price / €60,200 (2024, mean, per household)
SHARE OF MEAN EQUIVALISED INCOME = price / €41,900 (2024, mean, equivalised per household)
```

These are **affordability context**, never willingness-to-pay. A consumer
who can "afford" 12 hours of work has said nothing about whether they
would actually pay that price for this product.

## TCO MODEL (MODELLED — every assumption stated)

```
YEAR-1 TCO = observed_price_eur + (annual_filter_cost, if known) + estimated_annual_energy_cost_eur
3-YEAR TCO = observed_price_eur + 3 × (filter_cost + energy_cost)
estimated_annual_energy_cost_eur = (max_power_w / 1000) × assumed_daily_hours × 365 × €0.2342/kWh
```

`assumed_daily_hours` must be shown wherever displayed (this repo assumes
8h/day continuous-equivalent unless a product specifies otherwise — this
is a MODELLED assumption, not observed usage). Filter cost uses the
product's own `replacement_filter_price_eur` /
`filter_replacement_interval_months` where known; otherwise `UNKNOWN`.

## CATEGORY ECONOMICS (DERIVED)

```
Appliance-market turnover per household ≈ €3,759,000,000 / 8,400,000 households ≈ €448/household/year (2025)
```

This derived ratio is category **context**, not a claim that each
household spends exactly €448/year — it is the appliance-market pie
divided evenly, nothing more.

## INNOVATION ECONOMICS

Economic Value in the Bets world (`decision_framework_real.py`) is a
**price-weighted exposure** metric computed from real product prices and
real review-derived friction prevalence — not derived from any figure in
this file. This file's numbers feed **affordability/TCO display only**,
never the Q6 decision engine itself (no duplicate logic — the production
Python function remains the single source of truth for the decision).

## COUNTERFACTUAL ECONOMICS

See `products-clusters.md` §11 for the six economic counterfactuals
(price compression, filter-cost removal, energy shock, subscription,
category-budget competition, time-price). Each is executable only where
current product/price data permits — none of the six were built into an
interactive UI this session (see NEXT_ACTION.md).

## WHAT THIS FILE DOES NOT DO

It does not compute WTP. It does not claim any single household's actual
spending. It does not treat a MODELLED TCO as OBSERVED spend. It does not
average the two conflicting hourly-wage figures into a false-precision
single number — the conflict is reported, not resolved by fiat.
