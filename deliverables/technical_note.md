# Technical Note — Connected Air Treatment
Method, assumptions, limitations, and what was cut. Companion to
[insight_pack.md](insight_pack.md). Max 2 pages.

## Data and pipeline
Three raw sources, `data/raw/`: 3,500 consumer reviews (`consumer_reviews.csv`),
9-SKU aftermarket behaviour (`aftermarket_signals.csv`), two conflicting market
sizing figures (`market_metrics.json`), plus a 15-document trend corpus
(`trend_corpus.json`). Origin, counts and SHA-256 checksums for every file are
in `data/manifest.json`. All raw material in this repository is **synthetic** —
generated locally with `random_state=42` because no licensed panel or scrape was
available inside the exercise's constraints — and is marked as such in every
file's `_provenance` field. Section "What was cut" explains why real data was
not substituted, and what would change if it were.

Pipeline: `src/generate_*.py` (raw layer) → `src/detect_defects.py` (Q2) →
`src/taxonomy.py` (Q3) → `src/willingness_to_pay.py` (Q4) →
`src/decision_framework.py` (Q6) → `src/build_deliverables.py` (evidence
table). One command, `bash run_pipeline.sh`, regenerates everything from
scratch. Nothing in `data/raw/` is ever edited in place; cleaning writes to
`data/processed/` and the manifest checksum gate proves the raw layer is
unchanged after any run.

## Q2 — defect detection method
Detection runs **blind**: each detector uses only signal from the raw rows
(volume anomalies, exact duplicate text, promotional-register phrasing,
polarity-vs-rating disagreement, strict ISO-8601 parse failure) and the
ground-truth label file is opened only afterward, to score precision/recall —
never to tune thresholds. The burst detector requires three independent
signatures to intersect (SKU-level daily volume anomaly by median-absolute-
deviation z-score ≥5, exact duplicate text ≥10 occurrences, promotional
phrasing) specifically so a genuine viral product launch would not be
misclassified as fraud. Remedies differ by defect and the difference is
deliberate: burst rows are **removed** (no information to recover); rating/text
conflicts are **quarantined** (`rating_trusted=false` — the text is real
experience, only the star label is untrusted); malformed dates are **retained**
but excluded from time-series aggregation, never coerced by a permissive
parser. Full results: [data_quality_report.md](data_quality_report.md).

## Q3 — taxonomy method and its ceiling
Themes were induced bottom-up: `taxonomy.py --induce` ranks n-grams by their
lift in 1–2 star reviews over their corpus base rate; the six themes in
`src/lexicon.py` are a manual consolidation of the head terms that ranking
produced, not a transcription of this brief's own vocabulary. Classification
applies two rules learned from a v1 failure, both kept in the code comments as
a record of what didn't work: (1) a **polarity gate** — a keyword only counts
inside a negative-polarity sentence, because topic *mention* is not friction
*presence* (v1 scored "whisper quiet" as a noise friction and produced a
positive CSAT impact for a friction theme, which is incoherent); (2) a
**first-mention tie-break** for the primary theme when several frictions
appear in one review, matching the hand-labelling codebook's own rule. Fixing
these raised hand-label agreement from 60% to 82% (κ 0.53 → 0.77). 82% is
reported as the final number, not tuned further to clear the 85% target we
set ourselves — the residual disagreement is implicit complaints with no
literal keyword overlap ("average software," "filter life indicator reset
itself"), which is a real ceiling on a keyword classifier and is named as one
rather than closed by fitting keywords to the 50-review validation set itself.

## Q4 — the proxy, named as a proxy
No stated-preference instrument (conjoint, Gabor-Granger, purchase-intent
survey) exists in this repository. `willingness_to_pay.py` uses observed
filter-repurchase and third-party-attach behaviour as a **revealed-preference
proxy for willingness to defect from OEM economics** — not willingness to pay
for a friction to be solved. It directly ranks exactly one friction
(filter_cost, €64.98m/yr revenue at risk). The other five themes have no
behavioural WTP signal at all; Q6's Financial Value Proxy extrapolates the
filter_cost EUR/affected-unit figure to them under one explicit, named
assumption (equal value-at-stake per affected unit), which is also the single
assumption the Q6 recommendation is most sensitive to (see insight_pack Slide
5). A conjoint study, a priced pilot, or support-cost-linked churn data would
each remove a piece of this proxy; none is in scope here.

## Q5 — the market-figure disagreement
`data/raw/market_metrics.json` carries two sourced CAGR figures for what both
label "air treatment": Euromonitor 5.8% (Western Europe, connected +
non-connected, hardware only, constant prices) vs. Statista 11.2% (worldwide,
connected-only, hardware + aftermarket, current prices). The 5.4pp spread is
explained, not treated as an error: connectivity scope, geography, price
basis and aftermarket inclusion each contribute (`reconciliation.
divergence_axes`, same file). Planning basis used elsewhere in this pack: a
derived 8.9% (Euromonitor's geography/price basis, Statista's connectivity/
aftermarket scope) — explicitly flagged `derivation: "Derived, not
vendor-published"` in the file itself. Using Statista's 11.2% instead would
scale the category prize up but does not change which opportunity space wins
(insight_pack Slide 5) — the CAGR question sizes the market, it does not rank
frictions within it.

## What was deliberately not built
- **No stated-preference WTP measurement** — named above as the largest gap.
- **No cross-category comparison** — scope was held to Connected Air
  Treatment throughout, per the brief's own scope guidance.
- **Financial Value Proxy for OS-2/OS-3 is set to zero**, not modelled, because
  zero reviews support either friction; modelling a number on top of zero
  evidence would manufacture false precision.
- **Sensor-accuracy and reliability themes were scored but not pursued** —
  both have low corpus support (<6% prevalence, `confidence: low`) and were
  screened out at Q6 before reaching the three-way comparison; they are
  visible in `data/processed/taxonomy_themes.json` for anyone who wants to
  re-open that call.
- **No paid tooling, subscription data, or specialised hardware** — the whole
  pipeline is Python 3.9 standard library (`csv`, `json`, `re`, `random`,
  `hashlib`, `datetime`) and runs on an ordinary laptop.
