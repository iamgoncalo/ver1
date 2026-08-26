# Connected Air Treatment — Innovation Recommendation
**Versuni Disruptive Innovation | Innovation AI Expert case study | 5 slides**

---

## Slide 1 — The recommendation

**Pursue: Ultra-Quiet Autonomous Night Air Purification.**
A firmware/hardware programme that lets connected purifiers run effectively
through the night without being switched off for noise, targeted first at the
existing 118,000-unit connected VS-AP-8000i install base.

Two spaces were seriously considered and rejected: **Voice-Driven Manual
Control** and **Outdoor Air App Integration**. Both are killed on the same
measure — see Slide 4.

Held constant throughout: **Friction Prevalence %**, **CSAT Impact**, **Financial
Value Proxy** (defined Slide 2).

---

## Slide 2 — Framing (Q1)

- **Category:** Connected Air Treatment (Smart Home), chosen because it is
  Versuni's fastest-growing connected segment (§Q5) and its review corpus
  carries an unusually clean signal: hardware/software frictions dominate over
  taste or aesthetic complaints.
- **Consumer group:** Owners of connected (Wi-Fi/app-enabled) purifiers in
  Western European bedroom/living-room use.
- **Three questions:** (1) What breaks the connected experience most often?
  (2) Which of those frictions would owners pay to fix? (3) Which opportunity
  is worth building next?
- **Three measures, fixed and unchanged from here on:**
  1. **Friction Prevalence %** — share of reviews carrying the friction.
  2. **CSAT Impact** — mean star rating of affected reviews minus corpus mean.
  3. **Financial Value Proxy** — EUR/year value at stake, anchored to a
     measured behavioural figure (Slide 3) and extrapolated under one stated
     assumption (Slide 5).

---

## Slide 3 — What the data shows (Q2–Q4)

**Data had to be cleaned first.** 3,500 raw reviews contained a 300-review,
3-day promotional burst on one SKU (detected as a 108x daily-volume spike vs.
that SKU's own median, peaking at 2026-03-16, plus duplicate text and near-sequential
reviewer IDs — all three signatures required together). Left uncaught, it
inflated that SKU's headline rating from **3.886★ to 4.399★** and its 5-star
share from 51.6% to 73.9%. 49 more reviews had a star rating that contradicted
their own text (49/50 recovered by detection, precision 1.00). 118 dates were
unparseable and were excluded from time-series work rather than guessed at.
Full accounting: [data_quality_report.md](data_quality_report.md).

**On the cleaned corpus (n=3,200; corpus mean 3.932★),** six frictions were
induced from review text itself (not from this brief's vocabulary — see
[technical_note.md](technical_note.md)):

| Theme | Prevalence % | CSAT Impact | Confidence |
|---|---:|---:|---|
| Connectivity & pairing loss | 6.66% | −2.376★ | medium |
| App & firmware quality | 6.50% | −2.241★ | high |
| **Noise at night** | **6.41%** | **−2.295★** | **high** |
| Filter cost & availability | 4.28% | −2.255★ | low |
| Sensor accuracy & trust | 3.28% | −2.493★ | low |
| Hardware reliability | 2.84% | −2.414★ | low |

Automated theme assignment agreed with a 50-review hand-labelled sample at
**82%** (Cohen's κ 0.77) — short of an 85% target we set ourselves; the gap is
implicit complaints with no literal keyword overlap ("average software"), a
named limit of a keyword classifier, not a hidden one.

**Willingness to pay (Q4)** has direct behavioural evidence for exactly one
friction: filter cost. Owners already vote with their wallet — a
category-weighted **46.8% replacement-filter churn rate** and **38.6%
third-party filter attachment rate**, worth an estimated **€64.98m/year** in
OEM filter revenue leaking to third parties across the EU connected install
base. No equivalent behavioural signal exists for the other five themes; this
is stated as a limitation, not smoothed over.

---

## Slide 4 — Why Ultra-Quiet Night wins, and what killed the other two

| Opportunity space | Friction Prevalence % | CSAT Impact | Financial Value Proxy |
|---|---:|---:|---:|
| **Ultra-Quiet Autonomous Night Purification** | **6.41%** | **−2.295★** | **€97.3m/yr** |
| Voice-Driven Manual Control | **0.00%** (0/3,500 reviews) | n/a | €0 |
| Outdoor Air App Integration | **0.00%** (0/3,500 reviews) | n/a | €0 |

**Killed — Voice-Driven Manual Control:** zero mentions of voice control, a
voice assistant, or manual-control friction in 3,500 reviews. Matter 1.4 makes
this technically easy to build; ease of build is not evidence of demand.

**Killed — Outdoor Air App Integration:** zero mentions of outdoor air
quality or relating indoor readings to outside conditions, in the same
corpus. This may partly reflect that review text cannot surface a need for a
feature nobody has been offered yet — a real limitation of the evidence, not
just of the idea — but on the only consumer-voice evidence assembled for this
exercise, the friction is not observed.

**Noise** is the only opportunity space with a friction that is present at
material prevalence, validated against hand-labelled ground truth (not
asserted), carries a large high-confidence CSAT penalty, and has a non-zero
financial value proxy.

---

## Slide 5 — Prize, first test, and what would change our mind

- **Directional prize:** €97.3m/year Financial Value Proxy, derived from the
  connected EU install base × noise friction prevalence × the EUR/affected-unit
  value measured for filter-cost switching behaviour — **an explicit
  assumption, not a second measurement**. This is the single assumption the
  recommendation is most sensitive to: if noise owners are worth less
  per-unit than filter-switching owners (plausible — defecting to a
  third-party filter is a smaller act than living with a loud purifier), the
  case for Ultra-Quiet Night still stands on Friction Prevalence and CSAT
  Impact alone, but the euro figure shrinks.
- **First experiment:** ship an opt-in "ultra-quiet mode" firmware update to
  the existing 118k-unit connected VS-AP-8000i base, trading purification
  speed for a measured dB reduction below current sleep-mode; measure opt-in
  rate and 30-day retention vs. a control group that gets the update without
  the prompt.
- **Abandon signal:** opt-in stays under 15% of the eligible base after 60
  days — treat the review-text signal as a vocal minority, not a majority
  preference, and stop.
- **What Q5's disagreeing market figures change:** using Statista's 11.2%
  CAGR instead of Euromonitor's 5.8% (§Q5) would make the category prize
  larger but does not change which opportunity space wins — the CAGR dispute
  is a category-sizing question, not a friction-ranking one.
