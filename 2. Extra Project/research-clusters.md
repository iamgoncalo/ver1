# research-clusters.md — two distinct clustering models

Do not confuse these two models. Model A is an analyst-defined taxonomy.
Model B is what the text itself suggests. They are allowed to disagree.

## MODEL A — canonical research territories

Six fixed territories, defined by the strategic questions they answer
(not by keyword similarity). Full source: `research_corpus_real.py::TERRITORIES`,
machine-readable: `data/processed/research_clusters.json::model_a_canonical_territories`.

### R1 — Real-world effectiveness + spatial performance
**Members:** RP-01, RP-02, RP-06, RP-07
**Questions:** How much does portable filtration actually reduce indoor PM?
Does performance transfer beyond the room containing the cleaner? How
different is real-world performance from theoretical sizing?
**What the evidence actually shows:** Real reductions are large (42-79%
depending on room/pollutant) but consistently smaller and more variable
than lab CADR numbers would suggest, and secondary-room benefit depends on
HVAC (RP-01). RP-06 shows naive real-world averaging can even make an
effective device look ineffective.

### R2 — Health outcomes + evidence limits
**Members:** RP-03, RP-05, RP-08, TC-R05, TC-R06
**Questions:** When does pollutant reduction correspond to measured health
change? Which health outcomes have trial evidence? Where is evidence
insufficient?
**Conservative reading required:** Only RP-08 (one RCT, needs replication)
found a positive symptom/clinical-score result. RP-03 found PM reduction
without a measured symptom benefit; RP-05 found no association between
usage and self-reported symptoms in a small pilot. Do not average these
into "filtration improves health" — report the split honestly (tension T6).

### R3 — Behaviour + noise + adherence
**Members:** RP-05, RP-07
**Questions:** Do people actually run the cleaner? At which fan setting?
What makes them switch it off? How does noise interact with filtration
performance? Does automation increase useful adherence?
**What the evidence actually shows:** Noise is a named, real barrier to
use (RP-05). Automation genuinely trades filtration effectiveness for
runtime/noise reduction — not a free win (RP-07).

### R4 — Sensing + automation + sensor trust
**Members:** RP-09, RP-10, TC-R08
**Questions:** Can consumer-grade sensors reliably drive control? How
context-sensitive are measurements? What is the difference between
SENSING / CONNECTED / REACTIVE / ADAPTIVE / PREDICTIVE?
**What the evidence actually shows:** Consumer sensors can be precise
(good at relative trends) while inaccurate (wrong absolute numbers), and
performance is sensitive to humidity, temperature, and pollutant source
(RP-09 systematic review of 24 studies; RP-10 co-location test).

### R5 — Particle sources + spatial dynamics
**Members:** RP-04, RP-06
**Questions:** Where does indoor PM originate? How do cooking, movement,
cleaning and floor resuspension affect PM? Does room-level treatment
assume the correct spatial model?
**What the evidence actually shows:** Walking measurably resuspends
floor-deposited particles (RP-04) — a real spatial source. This does
**not** establish that a floor-level purifier would perform better; RP-04
tested no purifier at all.

### R6 — Energy + performance + standards
**Members:** RP-06, RP-07, TC-R01 (EPA), TC-R02 (ENERGY STAR), TC-R03
(AHAM), TC-R04 (CARB), TC-R09 (EU Ecodesign)
**Questions:** How does CADR trade against power? What happens at lower
fan speeds? What does continuous operation cost? What do CADR/CADR-W/IEF
actually measure? What technical constraints do standards impose?
**What the evidence actually shows:** RP-06's fan-speed loss-rate analysis
and RP-07's constant-vs-auto trial both quantify the CADR-vs-runtime
trade directly; TC-R01/02/03/04/09 supply the regulatory/certification
frame those numbers sit inside.

## MODEL B — emergent textual similarity

**Status: NOT IMPLEMENTED this pass.** The brief calls for a reproducible
TF-IDF + cosine-similarity + fixed-parameter agglomerative clustering over
verified titles/abstracts, with no external embedding API or LLM. That
requires a scikit-learn (or equivalent pure-Python) implementation and a
documented similarity threshold, which was not built this session — see
`data/processed/research_clusters.json::model_b_emergent_textual_similarity`
records this status machine-readably rather than faking a result.

## COUNTERFACTUAL CHAINS (5 real examples)

Each follows OBSERVED → DERIVED → ASSUMPTION → COUNTERFACTUAL → CONCEPT →
HYPOTHESIS → REQUIRED TEST.

**1. Floor resuspension (RP-04)**
OBSERVED: human walking measurably resuspends floor-deposited particles.
DERIVED: some pollutant dynamics are spatial/surface-coupled, not just
ambient-room-level. ASSUMPTION: a stationary room-level box is always the
optimal intervention architecture. COUNTERFACTUAL: what if treatment moved
closer to spatial sources? CONCEPT: floor-proximate or mobile
intervention. HYPOTHESIS: could improve source-proximity capture.
REQUIRED TEST: compare exposure reduction vs. a conventional room purifier
— not established by RP-04 alone.

**2. Constant-vs-auto trade (RP-07)**
OBSERVED: auto mode cuts runtime substantially but removes less PM2.5
(40% vs 66%) than constant mode. DERIVED: there is no operating mode that
maximizes both filtration and quiet/low-energy operation simultaneously.
ASSUMPTION: one factory-default control strategy suits every household.
COUNTERFACTUAL: what if the operating mode were chosen per household noise
tolerance? CONCEPT: user-selectable or context-learned operating profile.
HYPOTHESIS: matching mode to household tolerance improves realized
(not just theoretical) exposure reduction. REQUIRED TEST: A/B realized
exposure reduction across chosen-profile vs. fixed-default households.

**3. Sensor precision vs. accuracy (RP-10, RP-09)**
OBSERVED: a consumer sensor can track relative change well while reporting
a biased absolute number. DERIVED: "the sensor said X ppm" is not the same
claim as "the room is at X ppm." ASSUMPTION: an onboard sensor reading is
displayed and trusted as an absolute measurement. COUNTERFACTUAL: what if
the product showed confidence/trend instead of a bare number? CONCEPT:
trend-first, confidence-qualified display. HYPOTHESIS: users make better
decisions from a qualified trend than an unqualified absolute number.
REQUIRED TEST: usability comparison of raw-number vs. confidence-banded UI.

**4. Real-home averaging can mislead (RP-06)**
OBSERVED: naive before/after PM averages showed the active-filtration
group with *higher* PM than the sham group, due to unbalanced indoor
source strength. DERIVED: a single "% PM reduced" claim can be an artifact
of the measurement method, not the device. ASSUMPTION: a real-world
percentage-reduction claim is a stable device property. COUNTERFACTUAL:
what if performance were reported as a loss-rate curve instead of a single
percentage? CONCEPT: fan-speed-indexed loss-rate disclosure. HYPOTHESIS:
a loss-rate metric is more robust to home-to-home variation than a single
percentage. REQUIRED TEST: compare consumer comprehension/trust of a
loss-rate curve vs. a single percentage claim.

**5. Health claims outrun the evidence split (RP-08 vs. RP-03/RP-05)**
OBSERVED: one RCT (RP-08) found a real, statistically significant asthma
symptom improvement; two other real studies (RP-03, RP-05) measuring
related pollutants/symptoms found no such association. DERIVED: the
peer-reviewed evidence base on filtration-to-symptom benefit is currently
split, not settled. ASSUMPTION: any HEPA product may lean on "filtration
improves health" as an established fact. COUNTERFACTUAL: what if no
health-outcome claim were made until independent replication exists?
CONCEPT: a verified-clean/verified-performance claim instead of a health
claim. HYPOTHESIS: an outcome-agnostic, mechanism-verified claim is more
defensible than a symptom claim. REQUIRED TEST: none needed to adopt this
concept — it is a claims-discipline decision, not an experiment.
