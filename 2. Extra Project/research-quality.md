# research-quality.md — per-document quality states + quarantine audit

No combined numeric confidence score exists anywhere in this project.
Quality is reported as three independent qualitative states per
peer-reviewed document: DIRECTNESS, QUALITY, TRANSFERABILITY, plus a free
UNCERTAINTY note.

## PER-DOCUMENT QUALITY (peer-reviewed corpus)

| ID | Directness | Quality (study-design-aware) | Transferability (home air purifier) | Uncertainty |
|---|---|---|---|---|
| RP-01 | HIGH | Randomized cross-over, n=23-29 | HIGH | COVID-positive households only; HVAC-dependent secondary-room effect |
| RP-02 | HIGH | Double-blind randomized cross-over, n=40 | HIGH | Seniors only; 3-day windows; no clinical outcome |
| RP-03 | HIGH | Randomized intervention, n=71 households | HIGH | One agricultural region; ammonia co-benefit not confirmed |
| RP-04 | MEDIUM | Controlled lab chamber, single condition | MEDIUM | No purifier tested; one carpet/dust load; not a home field study |
| RP-05 | MEDIUM | Small pilot phased intervention, n=10+17 | MEDIUM | Self-reported symptoms; low actual device usage; underpowered |
| RP-06 | HIGH | Randomized parallel-group, interim n=55 | HIGH | Interim analysis; one US metro; veteran-skewed cohort |
| RP-07 | HIGH | Three-arm randomized cross-over, n=60 | HIGH | One city, multifamily only; one-week arms |
| RP-08 | MEDIUM | RCT, n=100, single center | MEDIUM | Needs independent replication; niche journal venue |
| RP-09 | HIGH | PRISMA systematic review, 24 studies | HIGH | Reviews device performance broadly, not one specific product |
| RP-10 | MEDIUM | Co-location validation, 2 devices, 1 site | MEDIUM | Two specific consumer sensor models only |

TC-R05 (WHO IAQ Guidelines) and TC-R06 (global PM2.5/O3 status) are kept as
R2 health-evidence *context*, not device-specific trial evidence — their
directness for "does a Versuni purifier improve health" is LOW by
construction; they establish the population-health backdrop only.

## QUARANTINE AUDIT — existing 12-document corpus

Every document in `data/raw/trend_corpus.json` was already individually
fetched and locally archived (`data/real_raw/trend_sources/*.html|*.pdf`)
during an earlier real-data-repair session, with `url_verified: true` and
`url_status: FETCHED_AND_ARCHIVED` recorded per document. Re-audited this
session for internal consistency (title matches the domain/publisher
claimed, URL resolves to the claimed organization, no placeholder/example
domains, no invented DOI):

| ID | Publisher | Status |
|---|---|---|
| TC-R01 | US EPA | VERIFIED |
| TC-R02 | ENERGY STAR | VERIFIED |
| TC-R03 | AHAM Verifide | VERIFIED |
| TC-R04 | California Air Resources Board | VERIFIED |
| TC-R05 | World Health Organization | VERIFIED |
| TC-R06 | PMC (Liu et al., peer-reviewed) | VERIFIED |
| TC-R07 | Versuni newsroom (manufacturer claim) | VERIFIED as manufacturer-class, not treated as independent |
| TC-R08 | CSA-IOT (Matter spec) | VERIFIED |
| TC-R09 | European Commission Green Forum | VERIFIED |
| TC-R10 | RePEc / peer-reviewed economics journal | VERIFIED |
| TC-R11 | Dyson newsroom (manufacturer claim) | VERIFIED as manufacturer-class, not treated as independent |
| TC-R12 | TechSee (syndicated survey) | VERIFIED as industry-survey-class, not treated as peer-reviewed |

**Quarantined: 0.** No document in the existing corpus failed this audit —
nothing was moved to `data/research/quarantine/`. If a future refresh
introduces a document that fails (broken URL, unresolvable title, invalid
DOI, unsupported claimed finding), it goes to
`data/research/quarantine/` with a rejection reason, per `research.md`'s
process — that directory exists and is currently empty by design, not by
oversight.
