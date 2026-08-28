# research.md — Air Purification research truth layer

## PURPOSE

This file is the canonical account of the real research evidence behind
the Versuni Air Purification case. It exists because an earlier
pass left research under-visible, under-verified, and disconnected from
the design process. This pass corrects that: every peer-reviewed claim
below was verified against the PubMed API in-session (not accepted from
any prompt), and every technical/regulatory document was already
individually fetched and archived in an earlier real-data-repair session.

This is a **focused decision corpus**, not a literature review. It does
not claim to be exhaustive.

## SOURCE HIERARCHY

| Class | What it can establish alone |
|---|---|
| `PEER_REVIEWED` | A specific measured finding, in the study's own context |
| `GOVERNMENT / REGULATOR` | An official constraint, guideline, or certification requirement |
| `STANDARD / CERTIFICATION` | A defined technical criterion (e.g. CADR/W, IEF) |
| `INDUSTRY ASSOCIATION` | A certification/directory fact (e.g. "X is AHAM Verifide-listed") |
| `VERSUNI / MANUFACTURER` | What Versuni/a competitor *claims* about its own product |
| `COMPETITOR / MANUFACTURER` | What a competitor *claims* about its own product |

A manufacturer source establishes "brand X claims product Y does Z" — never
"technology Z improves health" on its own. A single PM-reduction paper
does not establish a clinical health benefit. These boundaries are kept
throughout `evidence_cards.json` and every downstream Signal.

## CORPUS SIZE

- **22 total accepted documents** (`data/processed/research_index.json`)
- **12 peer-reviewed** — 10 verified this session via PubMed, 2 already in
  the existing corpus (TC-R06, TC-R10)
- **7 authoritative technical/regulatory** — EPA, ENERGY STAR, AHAM,
  CARB, WHO, Matter (CSA-IOT), EU Ecodesign — all already fetched and
  archived in `data/real_raw/trend_sources/`
- **2 manufacturer primary** (Philips/Versuni newsroom, Dyson newsroom) —
  kept as manufacturer-claim evidence, not counted toward the
  peer-reviewed/technical corpus
- **1 industry survey** (TechSee, syndicated) — kept as industry context
- **0 quarantined** — every existing document from the prior session was
  already individually fetched with a working URL and a local archive
  file; nothing failed re-audit this pass (see `research-quality.md`)

## RESEARCH TERRITORIES

| ID | Territory | Papers |
|---|---|---|
| R1 | Real-world effectiveness + spatial performance | RP-01, RP-02, RP-06, RP-07 |
| R2 | Health outcomes + evidence limits | RP-03, RP-05, RP-08, TC-R05, TC-R06 |
| R3 | Behaviour + noise + adherence | RP-05, RP-07 |
| R4 | Sensing + automation + sensor trust | RP-09, RP-10, TC-R08 |
| R5 | Particle sources + spatial dynamics | RP-04, RP-06 |
| R6 | Energy + performance + standards | RP-06, RP-07, TC-R01, TC-R02, TC-R03, TC-R04, TC-R09 |

A paper may belong to more than one territory. Full membership:
`data/processed/research_clusters.json`.

## DOCUMENT TABLE (peer-reviewed, verified this session)

| ID | Title | Year | Journal | DOI |
|---|---|---|---|---|
| RP-01 | Real-World Effectiveness of Portable Air Cleaners in Reducing Home Particulate Matter Concentrations | 2023 | Aerosol and Air Quality Research | [10.4209/aaqr.230202](https://doi.org/10.4209/aaqr.230202) |
| RP-02 | Reduction of personal PM2.5 exposure via indoor air filtration systems in Detroit | 2018 | J Expo Sci Environ Epidemiol | [10.1038/s41370-018-0085-2](https://doi.org/10.1038/s41370-018-0085-2) |
| RP-03 | Effectiveness of portable HEPA air cleaners on reducing indoor PM2.5 and NH3 in an agricultural cohort of children with asthma | 2021 | Indoor Air | [10.1111/ina.12753](https://doi.org/10.1111/ina.12753) |
| RP-04 | PM10, PM2.5, PM1, and PM0.1 resuspension due to human walking | 2022 | Air Quality, Atmosphere & Health | [10.1007/s11869-022-01201-3](https://doi.org/10.1007/s11869-022-01201-3) |
| RP-05 | Self-reported health impacts of do-it-yourself air cleaner use in a smoke-impacted community | 2024 | Heliyon | [10.1016/j.heliyon.2024.e25225](https://doi.org/10.1016/j.heliyon.2024.e25225) |
| RP-06 | Analysis of sources and sinks of indoor particulate matter reveals insights into the real-world efficacy of portable air cleaners | 2025 | Science of the Total Environment | [10.1016/j.scitotenv.2025.180136](https://doi.org/10.1016/j.scitotenv.2025.180136) |
| RP-07 | The impact of portable air cleaners on indoor PM concentrations and perceptions of IAQ: a randomized crossover trial in three multifamily buildings | 2026 | J Expo Sci Environ Epidemiol | [10.1038/s41370-026-00894-3](https://doi.org/10.1038/s41370-026-00894-3) |
| RP-08 | Indoor environmental health and asthma relief: findings from a longitudinal HEPA filter trial | 2026 | J Environ Sci Health A | [10.1080/10934529.2026.2655125](https://doi.org/10.1080/10934529.2026.2655125) |
| RP-09 | Low-cost sensors for indoor air quality monitoring: a systematic review | 2026 | J Air & Waste Manag Assoc | [10.1080/10962247.2026.2624795](https://doi.org/10.1080/10962247.2026.2624795) |
| RP-10 | Validating the performance of low-cost IAQ sensors through co-location | 2025 | Journal of Building Physics | [10.1177/17442591251367436](https://doi.org/10.1177/17442591251367436) |

Full metadata (authors, PMID/PMCID, study design, limitations):
`data/processed/research_index.json`. Distilled evidence objects (question/
found/establishes/does-not-establish/tension/design consequence/
counterfactual): `data/processed/evidence_cards.json`.

## QUALITY / LIMITATION RULES

- No quantitative confidence percentages are invented. `research-quality.md`
  uses qualitative DIRECTNESS/QUALITY/TRANSFERABILITY states only.
- `RP-08` (the asthma RCT with a positive clinical result) is flagged
  explicitly as needing independent replication — one positive RCT in a
  niche journal is evidence, not proof, and it sits in direct tension with
  RP-03 and RP-05, which measured exposure/PM change without a matching
  symptom benefit (see `research_tensions.json`, tension T6).
- `RP-04` (floor resuspension) explicitly does NOT establish that a
  floor-level purifier would outperform a room-level one — no purifier was
  tested in that study. This distinction is preserved everywhere RP-04 is
  referenced.

## HOW RESEARCH FLOWS INTO SIGNALS

A Signal is only allowed to cite `research_id`s that appear in
`research_index.json`. `src/real/signals_from_research_real.py` rebuilds
`data/processed/signals_real.json` from the verified evidence in this
corpus plus the existing real consumer-review taxonomy — see
`research-clusters.md` for how territory membership maps to specific
signals, and `STATUS.md` for the rebuilt signal list.

## HOW RESEARCH DOES NOT DIRECTLY BECOME A TREND

A single cross-sectional paper is a **finding**, not a **trend**. This
corpus calls something a TREND only when there is real evidence of change
over time or directionality (e.g. TC-R09's regulatory working-plan
schedule, or a repeated pattern across multiple independent publication
years within one territory). Where no such directional evidence exists,
the corpus reports a **finding** or **signal**, never a trend — see
`FINDING` vs `SIGNAL` vs `TREND` distinction enforced in
`signals_from_research_real.py`.

## HOW RESEARCH FLOWS INTO COUNTERFACTUALS

Five real research → counterfactual chains are documented in
`research-clusters.md` §Counterfactual chains, following the required
OBSERVED → DERIVED → ASSUMPTION → COUNTERFACTUAL → CONCEPT → HYPOTHESIS →
REQUIRED TEST structure. The UI-level Counterfactual Engine that consumes
these chains was **not built this session** — a known, open gap.

## QUERY LOG (reproducibility)

The 10 new peer-reviewed papers were supplied as named candidate seeds
(title + PMID/PMCID) and verified, not discovered via a fresh keyword
search, using:

- `mcp__plugin_bio-research_pubmed__convert_article_ids` (PMCID → PMID/DOI)
  for RP-01, RP-02, RP-03, RP-04, RP-05, RP-06
- `mcp__plugin_bio-research_pubmed__get_article_metadata` for all 10,
  confirming title/authors/journal/year/abstract against the PMID given

No new discovery search (e.g. `"portable air cleaner HEPA indoor PM2.5
intervention"[Title/Abstract]`) was run this session — that is the
documented next step if the corpus needs to grow. This corpus is a
**focused decision corpus**, not an exhaustive systematic review.
