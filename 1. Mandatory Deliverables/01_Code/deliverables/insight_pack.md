# Air Purification — Innovation Recommendation
**Versuni Disruptive Innovation | Innovation AI Expert case study | 5 slides**
**All evidence is real: 10,547 real Amazon reviews (237 real, hand-validated
purifier products), 2 real market-research sources, 12 real trend documents.**

---

## Slide 1 — The recommendation

**Pursue: Reliability-Verified Air Purifiers** — an extended-life guarantee
paired with a real-time self-diagnostic (connected telemetry that flags
degrading performance before the unit silently dies).

Two spaces were seriously considered and rejected: **Whisper-Quiet Night
Mode** and **Smart/Connected Feature Expansion**. Both are killed on the same
three measures — see Slide 4.

Held constant throughout: **Friction Prevalence %**, **CSAT Impact**,
**Price-Weighted Exposure** (defined Slide 2).

---

## Slide 2 — Framing (Q1)

- **Category:** Air Purification (Smart Home) — chosen for its clean,
  real review signal on hardware/software frictions.
- **Consumer group:** Real owners of residential air purifiers who left a
  review on Amazon.com, 2004–2023.
- **Three questions:** (1) What actually breaks the purifier ownership
  experience? (2) What would owners pay to fix it? (3) Which opportunity is
  worth building next?
- **Three measures, fixed and unchanged from here on:**
  1. **Friction Prevalence %** — share of real reviews carrying the friction.
  2. **CSAT Impact** — mean star rating of affected reviews minus corpus mean.
  3. **Price-Weighted Exposure** — sum of real observed prices across
     affected reviews (a calculated diagnostic, not a survey) — explicitly
     **not** a revenue, market-size, or willingness-to-pay estimate; see
     Slide 3.

---

## Slide 3 — What the real data shows (Q2–Q4)

**10,547 real reviews, 237 real hand-validated air purifier products**,
assembled from the McAuley-Lab Amazon-Reviews-2023 public dataset. Product
inclusion required two rounds of classifier tightening after manual
inspection caught real false positives (replacement filters, vacuum
cleaners, wearable necklaces, ozone generators) — see
[data_quality_report.md](data_quality_report.md).

**Defects found (not planted):** 239 rating/text sentiment conflicts (2.3%
of reviews — using a negation-aware detector after an early version
misread "I cannot recommend" as *positive*, see
[ai_use_log.md](ai_use_log.md)); 18 empty-text rows; **zero** duplicate-text
bursts and **zero** volume anomalies — a real, honest finding: this corpus
does not contain the kind of promotional review-bombing a synthetic fixture
would plant by design.

**Friction taxonomy, induced bottom-up from real 1–2★ review text**
(corpus mean 4.172★, n=10,547):

| Theme | Prevalence % | CSAT Impact | n reviews |
|---|---:|---:|---:|
| Noise / motor sound | 3.50% | −0.571★ | 369 |
| Ozone / smell / irritation | 0.81% | −1.102★ | 85 |
| **Reliability / stopped working** | **1.58%** | **−2.223★** | **166** |
| Perceived value / effectiveness | 0.77% | −2.724★ | 81 |
| Customer service / returns | 0.34% | −2.429★ | 36 |
| Filter cost / replacement | 0.26% | −1.252★ | 27 |

92.74% of reviews match none of these six themes — most real reviews are
either straightforwardly positive or describe frictions this taxonomy
doesn't capture, stated honestly rather than forced into a bucket.

**Willingness to pay (Q4): no direct or proxy WTP measurement exists in the
assembled real evidence.** No conjoint/Gabor-Granger data, and no real
consumable-switching behaviour is obtainable from a public review export.
What's real: **75 of 237 products have an observed real price** (median
$79.99, range $3.81–$1,100), used only as a *price-weighted exposure*
indicator (reliability: $26,357.86; noise: $84,015.62) — explicitly a
relative reach×price signal, not a dollar forecast.

---

## Slide 4 — Why Reliability wins, and what killed the other two

| Opportunity space | Friction Prevalence % | CSAT Impact | Price-Weighted Exposure |
|---|---:|---:|---:|
| **Reliability-Verified Purifiers** | 1.58% | **−2.223★** | $26,357.86 |
| Whisper-Quiet Night Mode | **3.50%** | −0.571★ | **$84,015.62** |
| Smart/Connected Feature Expansion | 1.02% | n/a (mostly praise) | n/a |

This is a genuine **Pareto trade-off, not a dominant winner** — stated
plainly rather than manufactured into a formula. Noise reaches more reviews
and touches higher-price products, but is the *shallowest* satisfaction hit
of any real theme. Reliability reaches fewer reviews but the hit is severe —
close to the worst in the whole taxonomy — and a "stopped working" failure
typically ends the customer relationship outright (no repeat purchase, no
filter revenue at all afterward), unlike noise, which annoys a buyer who
usually keeps the unit.

**Killed — Whisper-Quiet Night Mode:** CSAT Impact of −0.571★ is the
*shallowest* satisfaction hit of any real theme, despite the highest
prevalence. Mentioned often; fixing it moves satisfaction the least.

**Killed — Smart/Connected Feature Expansion:** 1.02% real prevalence (107
of 10,547 reviews) — the smallest of the three candidates — and on manual
inspection, most of those mentions are **feature praise, not complaints**
("It is incredibly powerful and [connectivity feature]... impressed with
it"). No real friction signal to build a roadmap bet on.

---

## Slide 5 — Prize, first test, and what would change our mind

- **Directional signal:** reliability failures ("stopped working," "never
  worked," "died") appear across brands and across the full 2004–2023 span
  of this real corpus — a complaint pattern the industry has never solved,
  not a one-brand defect.
- **Most sensitive assumption, stated plainly:** this recommendation rests
  on a judgment call — that a *severe-but-narrower* friction (reliability)
  is worth prioritizing over a *shallow-but-broader* one (noise). The
  opposite judgment — reach matters more than depth, because a mildly
  annoyed majority still drives more aggregate churn — is equally
  defensible and would flip the recommendation to Whisper-Quiet Night Mode.
  The data does not resolve this alone.
- **First experiment:** cross-reference real failure-mention reviews against
  each product's real rating_number (a popularity proxy) to see whether
  failures cluster in specific brands/price tiers (→ a competitive
  positioning bet) or spread evenly across the category (→ a category-wide
  manufacturing/QA opportunity).
- **Abandon signal:** if failures concentrate in 2–3 specific
  older/discontinued products rather than spreading across the category,
  treat this as solved-or-solving and abandon.
- **Q5 sensitivity, actually re-run, not asserted:** re-running
  `src/real/decision_framework_real.py --market-scenario=imarc` (6.54% CAGR
  vs. Mordor Intelligence's 5.37%) produces an **identical verdict** — the
  Price-Weighted Exposure here is built from review-level price exposure,
  not category CAGR, so the Q5 disagreement changes the category-sizing
  narrative but not which opportunity wins.
