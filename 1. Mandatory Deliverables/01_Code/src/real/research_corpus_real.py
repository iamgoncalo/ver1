"""Real, individually-verified research corpus for the Connected Air
Treatment case - the "research truth" layer.

Two source families, kept structurally distinct (see <source_hierarchy> in
the governing brief):

1. PEER_REVIEWED papers - verified this session against the PubMed API
   (mcp__plugin_bio-research_pubmed) by PMID/PMCID -> DOI conversion +
   get_article_metadata, NOT accepted on the strength of any prompt or
   prior claim. Every title/author/journal/year/DOI below was read back
   from that API response, not assumed. See research.md for the query log.
2. TECHNICAL / REGULATORY / MANUFACTURER / INDUSTRY documents - reused
   from data/raw/trend_corpus.json, which was already individually
   fetched-and-archived in an earlier real-data-repair session (see
   data/real_raw/trend_sources/). Re-classified here into the six research
   territories; not re-fetched (their archive files already exist and are
   the proof).

This module writes:
  data/raw/research/research_manifest.csv   (flat, one row per document)
  data/processed/research_index.json        (full verified metadata)
  data/processed/evidence_cards.json        (distilled QUESTION/FOUND/... objects, peer-reviewed only)
  data/processed/research_clusters.json     (Model A: canonical territories only - Model B emergent
                                              TF-IDF clustering is NOT implemented this pass, see
                                              _provenance note in the output)
  data/processed/research_tensions.json     (evidence-grounded contradictions)

No network calls happen inside this script - verification already happened
via the PubMed MCP tool in-session; this module only encodes what that tool
returned, plus the existing real trend_corpus.json.
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "raw")
RESEARCH_RAW = os.path.join(RAW, "research")
PROC = os.path.join(ROOT, "data", "processed")

TERRITORIES = {
    "R1": "Real-world effectiveness + spatial performance",
    "R2": "Health outcomes + evidence limits",
    "R3": "Behaviour + noise + adherence",
    "R4": "Sensing + automation + sensor trust",
    "R5": "Particle sources + spatial dynamics",
    "R6": "Energy + performance + standards",
}

# Verified 2026-08-26 via mcp__plugin_bio-research_pubmed__convert_article_ids
# (PMCID -> PMID/DOI) and get_article_metadata (title/authors/journal/year
# read back from PubMed, not assumed from the candidate seed list). Every
# title below is the PubMed-returned title, byte-for-byte where feasible.
PEER_REVIEWED = [
    {
        "research_id": "RP-01",
        "title": "Real-World Effectiveness of Portable Air Cleaners in Reducing Home Particulate Matter Concentrations",
        "authors": "Lu FT, Laumbach RJ, Legard A, et al.",
        "journal": "Aerosol and Air Quality Research",
        "year": 2023,
        "pmid": "38618024",
        "pmcid": "PMC11014421",
        "doi": "10.4209/aaqr.230202",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11014421/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Single-blinded randomized cross-over intervention, 29 homes",
        "territories": ["R1"],
        "question": "Does a portable air cleaner's benefit reach rooms beyond the one it sits in?",
        "found": "PM2.5/PM10 fell 78.8%/63.9% in the primary room and 57.9%/60.4% in a secondary room during the filter condition vs. sham.",
        "establishes": "A single PAC measurably reduces PM in the room it occupies and, to a lesser degree, an adjacent room, especially with a central air handler running.",
        "does_not_establish": "That secondary-room reduction generalizes to homes without central air handling, or to non-COVID-positive households.",
        "tension": "Lab CADR ratings describe one sealed room; this trial shows real homes leak filtered benefit unevenly.",
        "design_consequence": "Room-sizing guidance should not assume the treated room is airtight from the rest of the home.",
        "counterfactual": "What if a purifier were rated by whole-home effect, not single-room CADR?",
        "limitations": "n=23-29 per measure; homes of COVID-positive adults only; secondary-room effect depended on HVAC use.",
    },
    {
        "research_id": "RP-02",
        "title": "Reduction of personal PM2.5 exposure via indoor air filtration systems in Detroit: an intervention study",
        "authors": "Maestas MM, Brook RD, Ziemba RA, et al.",
        "journal": "Journal of Exposure Science & Environmental Epidemiology",
        "year": 2018,
        "pmid": "30420725",
        "pmcid": "PMC7021209",
        "doi": "10.1038/s41370-018-0085-2",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7021209/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Double-blinded randomized crossover intervention, 40 senior participants",
        "territories": ["R1"],
        "question": "Do cheaper HEPA-type filters reduce personal PM2.5 exposure nearly as well as true-HEPA?",
        "found": "True-HEPA cut personal PM2.5 exposure 53% and indoor concentration 60%; a cheaper HEPA-type filter still cut exposure 31% and concentration 52%.",
        "establishes": "Both high- and low-efficiency portable filtration measurably reduce personal PM2.5 exposure for older adults, not just indoor air readings.",
        "does_not_establish": "That the gap between true-HEPA and HEPA-type performance is negligible for all pollutant sizes or health outcomes.",
        "tension": "A materially cheaper filter class still delivers most of the exposure reduction - performance may be commoditizing faster than price.",
        "design_consequence": "Filter-grade marketing claims should be checked against personal-exposure data, not indoor-concentration data alone.",
        "counterfactual": "What if Versuni competed on verified personal-exposure reduction instead of filter-grade branding?",
        "limitations": "n=40, Detroit seniors only; 3-day exposure windows per condition; no clinical outcome measured.",
    },
    {
        "research_id": "RP-03",
        "title": "Effectiveness of portable HEPA air cleaners on reducing indoor PM2.5 and NH3 in an agricultural cohort of children with asthma: A randomized intervention trial",
        "authors": "Riederer AM, Krenz JE, Tchong-French MI, et al.",
        "journal": "Indoor Air",
        "year": 2021,
        "pmid": "32996146",
        "pmcid": "PMC8641645",
        "doi": "10.1111/ina.12753",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8641645/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Randomized intervention trial, 71 households (36 HEPA, 35 control)",
        "territories": ["R1", "R2"],
        "question": "Do HEPA cleaners lower both PM2.5 and ammonia in farmworker children's homes with asthma?",
        "found": "HEPA homes had 60% lower sleeping-area and 42% lower living-area PM2.5 at one year; ammonia reductions were not observed.",
        "establishes": "Sustained (one-year) PM2.5 reduction is achievable with two placed units in real agricultural-community homes.",
        "does_not_establish": "That reduced PM2.5 translated into fewer asthma symptoms - no clinical/symptom endpoint was reported in this result.",
        "tension": "A pre-filter marketed to also cut ammonia measurably failed to do so, while PM2.5 reduction held - not every co-benefit claim survives a field trial.",
        "design_consequence": "Multi-pollutant marketing claims (e.g. 'also reduces odors/gases') need their own field evidence, not an inference from PM performance.",
        "counterfactual": "What if a product only claimed the pollutant classes it has field evidence for, by room?",
        "limitations": "No symptom/clinical outcome reported in this measure; single agricultural region; ammonia source strength not characterized.",
    },
    {
        "research_id": "RP-04",
        "title": "PM10, PM2.5, PM1, and PM0.1 resuspension due to human walking",
        "authors": "Benabed A, Boulbair A",
        "journal": "Air Quality, Atmosphere & Health",
        "year": 2022,
        "pmid": "35463201",
        "pmcid": "PMC9015701",
        "doi": "10.1007/s11869-022-01201-3",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9015701/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Full-scale laboratory chamber experiment, controlled carpet/dust loading",
        "territories": ["R5"],
        "question": "How much does ordinary walking resuspend settled particles back into room air?",
        "found": "10 minutes of walking measurably raised PM10/PM2.5/PM1/PM0.1 concentrations, with estimated resuspension rates reported per size fraction.",
        "establishes": "Human movement over a loaded carpet is a real, measurable indoor particle source, not just deposition.",
        "does_not_establish": "That a floor-level or mobile purifier would outperform a conventional room-level purifier - this study did not test any purifier placement.",
        "tension": "Standard room-level filtration treats air as the whole problem; this shows the floor is an active, re-triggered source, not a sink.",
        "design_consequence": "Spatial-source modeling for sizing/placement should not assume particles, once deposited, stay deposited.",
        "counterfactual": "What if treatment intervened closer to floor-level resuspension events, not just ambient room air?",
        "limitations": "Single controlled chamber, one carpet type and dust load; not a real-home field study; no purifier tested.",
    },
    {
        "research_id": "RP-05",
        "title": "Self-reported health impacts of do-it-yourself air cleaner use in a smoke-impacted community",
        "authors": "Turner MW, Prathibha P, Holder A, et al.",
        "journal": "Heliyon",
        "year": 2024,
        "pmid": "38375293",
        "pmcid": "PMC10875335",
        "doi": "10.1016/j.heliyon.2024.e25225",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10875335/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Pilot phased-intervention study, tribal community, n=10 (wildfire) + n=17 (wood stove)",
        "territories": ["R2", "R3"],
        "question": "Does using a low-cost DIY air cleaner during smoke events change self-reported symptoms?",
        "found": "No association was found between DIY air-cleaner usage and self-reported symptoms; usage itself was low, and loud operating noise was cited as a barrier to use.",
        "establishes": "In this small pilot, noise was a real, named reason people ran the device less than intended.",
        "does_not_establish": "That air cleaners don't help symptoms in general - the sample was too small and usage too inconsistent to draw a causal conclusion either way.",
        "tension": "A device only helps if it is actually run - noise-driven under-use can erase a filtration benefit that lab tests would predict.",
        "design_consequence": "Adherence (will the device actually stay on) is a design variable, not a footnote to filtration performance.",
        "counterfactual": "What if the product optimized for hours-actually-run under real noise tolerance, not peak CADR?",
        "limitations": "n=10 and n=17, self-reported symptoms, low DIY-unit usage limited statistical power; not generalizable beyond this community.",
    },
    {
        "research_id": "RP-06",
        "title": "Analysis of sources and sinks of indoor particulate matter reveals insights into the real-world efficacy of portable air cleaners in a randomized intervention trial",
        "authors": "Farhoodi S, Kang I, Jagota K, et al.",
        "journal": "Science of the Total Environment",
        "year": 2025,
        "pmid": "40737779",
        "pmcid": "PMC13224824",
        "doi": "10.1016/j.scitotenv.2025.180136",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13224824/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Randomized parallel-group intervention trial, year-long, ~55 Chicago homes analyzed to date",
        "territories": ["R1", "R5", "R6"],
        "question": "Do simple before/after PM averages correctly show whether a portable air cleaner is working?",
        "found": "Raw averages misleadingly showed higher PM in the active-filtration group (higher source strength homes); background-period PM was ~36% lower with active filtration, and loss rates rose ~15-130% with fan speed.",
        "establishes": "Fan-speed-dependent loss rates, not raw before/after averages, are the credible way to show PAC efficacy in an unbalanced real-home sample.",
        "does_not_establish": "That every home in the active group experienced the same benefit - source-strength imbalance between groups means simple averages cannot be trusted.",
        "tension": "Naive interpretation of real-world PM averages can make a working purifier look ineffective - the sizing/performance claim depends entirely on the analysis method.",
        "design_consequence": "Any real-world performance claim needs a source-adjusted or background-period analysis, not a raw before/after comparison.",
        "counterfactual": "What if the product reported its own loss-rate estimate instead of a single CADR number?",
        "limitations": "Interim analysis (55 of a larger planned sample); one US metro area (Chicago); veteran-population-skewed cohort.",
    },
    {
        "research_id": "RP-07",
        "title": "The impact of portable air cleaners on indoor particulate matter concentrations and perceptions of indoor air quality: a randomized crossover trial in three multifamily buildings",
        "authors": "Mendell AY, Lee S, Siegel JA",
        "journal": "Journal of Exposure Science & Environmental Epidemiology",
        "year": 2026,
        "pmid": "42014482",
        "pmcid": None,
        "doi": "10.1038/s41370-026-00894-3",
        "canonical_url": "https://doi.org/10.1038/s41370-026-00894-3",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Three-arm randomized crossover trial (placebo/constant/auto), 60 apartments, 3 Toronto buildings",
        "territories": ["R1", "R3", "R6"],
        "question": "Does automatic (threshold-triggered) operation clean as well as running a purifier constantly?",
        "found": "Constant operation cut weekly mean PM2.5 by 66% (95% CI 59-72%); auto operation cut it by 40% (95% CI 27-50%) but sharply reduced runtime.",
        "establishes": "Auto mode trades measurable filtration effectiveness for much less runtime; measured performance diverged from theoretical CADR-based sizing.",
        "does_not_establish": "That one control strategy (always-constant or always-auto) is optimal for every home - the paper explicitly says a universal strategy may not fit.",
        "tension": "Constant operation filters more air but runs longer (noise, energy); auto runs less (quieter, cheaper) but filters measurably less.",
        "design_consequence": "Sizing guidance built on theoretical CADR should be corrected against this measured constant-vs-auto gap, not assumed equivalent.",
        "counterfactual": "What if the 'right' operating mode were chosen per household noise tolerance rather than shipped as one factory default?",
        "limitations": "Multifamily buildings in one city (Toronto); one-week arms per condition; self-reported behaviour data alongside sensor data.",
    },
    {
        "research_id": "RP-08",
        "title": "Indoor environmental health and asthma relief: findings from a longitudinal HEPA filter trial",
        "authors": "Li L, Lv X, Jia H, et al.",
        "journal": "Journal of Environmental Science and Health, Part A",
        "year": 2026,
        "pmid": "41979079",
        "pmcid": None,
        "doi": "10.1080/10934529.2026.2655125",
        "canonical_url": "https://doi.org/10.1080/10934529.2026.2655125",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Randomized controlled trial, 100 adults with moderate-to-severe asthma, 8-month follow-up",
        "territories": ["R2"],
        "question": "Does 8 months of real HEPA H14 filtration measurably improve asthma control, not just air readings?",
        "found": "The active group gained +2.2 Asthma Control Test points and +27.7% symptom-free days versus placebo, alongside a 29.6 microg/m3 PM2.5 drop (all p<=0.004).",
        "establishes": "In this one RCT, sustained HEPA H14 filtration is associated with a measurable clinical asthma-control benefit, not only an air-quality change.",
        "does_not_establish": "That this specific effect size generalizes beyond this single trial - treat as a candidate finding requiring independent replication before treating as settled.",
        "tension": "This clinical result sits in tension with RP-03 and RP-05, where PM/exposure reduction did NOT translate into a measured symptom benefit - the literature is not unanimous on this link.",
        "design_consequence": "A health-outcome marketing claim needs its own replicated clinical evidence; PM-reduction evidence alone is insufficient (see science-says/does-not-say framing).",
        "counterfactual": "What if Versuni ran or co-funded an independent replication before making any asthma-relief claim?",
        "limitations": "Single-center trial, self-reported symptom-free days as one endpoint, needs independent replication; journal is a niche toxicology/engineering title, not a primary respiratory-medicine venue.",
    },
    {
        "research_id": "RP-09",
        "title": "Low-cost sensors for indoor air quality monitoring: A systematic review of accuracy, applications, and limitations",
        "authors": "Silva G, Duarte J, Baptista JS, Rufo JC",
        "journal": "Journal of the Air & Waste Management Association",
        "year": 2026,
        "pmid": "41615728",
        "pmcid": None,
        "doi": "10.1080/10962247.2026.2624795",
        "canonical_url": "https://doi.org/10.1080/10962247.2026.2624795",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "PRISMA systematic review, 24 studies screened from 2,736 identified",
        "territories": ["R4"],
        "question": "How accurate are the low-cost sensors that consumer air purifiers use to sense and react?",
        "found": "Many low-cost sensors correlate well with reference instruments under controlled conditions, but performance varies significantly with humidity, temperature, and pollutant source; most devices don't yet meet formal regulatory validation standards.",
        "establishes": "Low-cost PM/CO2 sensing is workable for consumer devices but context-dependent, and current products largely lack standardized validation.",
        "does_not_establish": "That any specific consumer purifier's onboard sensor is accurate enough to safely drive fully autonomous decisions in all conditions.",
        "tension": "More onboard sensing sounds like more intelligence, but this review's own finding is that sensor trust, not sensor presence, is the open problem.",
        "design_consequence": "A 'smart'/reactive control claim should disclose the conditions under which its sensor reading is and isn't trustworthy.",
        "counterfactual": "What if the most valuable smart feature is the product knowing when to distrust its own sensor?",
        "limitations": "Review of PM2.5/CO2 sensors specifically; heterogeneous underlying study methods; regional/device coverage bias noted by the authors themselves.",
    },
    {
        "research_id": "RP-10",
        "title": "Validating the performance of low-cost IAQ sensors through co-location",
        "authors": "Zaky N, Li T, Stopps H",
        "journal": "Journal of Building Physics",
        "year": 2025,
        "pmid": "42095132",
        "pmcid": "PMC13143174",
        "doi": "10.1177/17442591251367436",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13143174/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Co-location validation against reference instruments, 2 consumer-grade sensors",
        "territories": ["R4"],
        "question": "When two consumer-grade IAQ sensors are placed next to lab-grade references, how well do they agree?",
        "found": "One consumer sensor tracked relative CO2/PM changes well (higher correlation) but showed higher bias/RMSE (lower absolute accuracy) than the reference; averaging over longer intervals improved but did not eliminate the gap.",
        "establishes": "A consumer sensor can be precise (consistent, good for trends) while still being inaccurate (wrong absolute number) at the same time - these are different properties.",
        "does_not_establish": "That either tested sensor is reliable enough for uncalibrated absolute-concentration claims without in-situ calibration.",
        "tension": "A device can look 'smart' by tracking relative changes well while still reporting a materially wrong absolute air-quality number.",
        "design_consequence": "Any on-device number shown to a consumer should be understood (and ideally labelled) as relative-trend-grade or calibrated-absolute-grade, not treated as equivalent.",
        "counterfactual": "What if the UI showed confidence/trend instead of a bare number the sensor cannot actually guarantee?",
        "limitations": "Two specific consumer sensor models only; one co-location site; short 5-30 minute averaging windows tested.",
    },
    # RP-11/RP-12: verified 2026-08-27 via mcp__plugin_bio-research_pubmed.
    # Previously present only as TC-R06/TC-R10 inside trend_corpus.json
    # (document_type "peer_reviewed") - counted toward peer_reviewed_count
    # but never actually rendered as a full research card, so the UI's
    # "12 peer-reviewed papers" claim did not match the 10 cards a user
    # could actually open. Promoted here to the same full distillation
    # standard as RP-01..RP-10, closing that count/display gap honestly
    # instead of just lowering the displayed count.
    {
        "research_id": "RP-11",
        "title": "Toward Better and Healthier Air Quality: Global PM2.5 and O3 Pollution Status and Risk Assessment Based on the New WHO Air Quality Guidelines for 2021",
        "authors": "Liu J, He C, Si Y, et al.",
        "journal": "Global Challenges (Hoboken, NJ)",
        "year": 2024,
        "pmid": "38617028",
        "pmcid": "PMC11009431",
        "doi": "10.1002/gch2.202300258",
        "canonical_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11009431/",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Observational analysis of daily outdoor PM2.5/O3 monitoring data, 618 cities worldwide, 2019-2022, assessed against the WHO's 2021 Air Quality Guidelines",
        "territories": ["R2", "R5"],
        "question": "Against the WHO's tightened 2021 PM2.5/O3 guideline, how much of the world's urban population still lives with unhealthy ambient air, and where?",
        "found": "Across 618 cities (2019-2022), only ~10% of days globally met the new WHO PM2.5 guideline (<=15 ug/m3); over 35% of cities show compound PM2.5-O3 pollution; exposure-risk categories are markedly worse for cities in China/India than for economically developed cities.",
        "establishes": "Ambient/outdoor PM2.5 exposure against the tightened 2021 WHO guideline remains widespread globally - a demand-context fact (a large population is still exposed to guideline-exceeding outdoor air), not a claim about any indoor air cleaner's effectiveness.",
        "does_not_establish": "Anything about portable/indoor air cleaner performance, sales, or consumer behaviour - this is outdoor ambient monitoring-station data only, with no purifier or indoor-environment measurement.",
        "tension": "The scale of unmet WHO compliance globally could be used to over-claim indoor-purifier necessity, when this evidence only supports 'ambient air pollution is real and widespread', not 'a purifier fixes it'.",
        "design_consequence": "Category-relevance / demand-context evidence (why air treatment matters at all) should stay visibly separate from device-efficacy evidence (whether a specific purifier works) - this paper is the former, not the latter.",
        "counterfactual": "What if messaging clearly separated 'the outdoor air quality problem is real and global' from 'this specific product measurably fixes your indoor air' - conflating the two overclaims from evidence that only supports the first?",
        "limitations": "Outdoor monitoring-station data only, 618 cities, 2019-2022 - no indoor measurements, no purifier-brand data, no causal claim about any intervention.",
    },
    {
        "research_id": "RP-12",
        "title": "A Burning Issue: Wildfire Smoke Exposure, Retail Sales, and Demand for Adaptation in Healthcare",
        "authors": "Han J, Li S, Wang Z.",
        "journal": "Environmental & Resource Economics",
        "year": 2024,
        "pmid": None,
        "pmcid": None,
        "doi": "10.1007/s10640-024-00925-3",
        "canonical_url": "https://ideas.repec.org/a/kap/enreec/v87y2024i11d10.1007_s10640-024-00925-3.html",
        "source_type": "PEER_REVIEWED",
        "peer_reviewed": True,
        "study_design": "Retail-scanner-data econometric study linking local wildfire smoke exposure to retail purchases (air purifiers, bottled water, cold/cough/nasal remedies) with lagged effects. Economics journal - outside PubMed's biomedical scope, verified by direct fetch/archive rather than the PubMed API (see data/real_raw/trend_sources/repec_han_wildfire_retail.html).",
        "territories": ["R3"],
        "question": "When wildfire smoke hits an area, does that show up as a genuine, measurable bump in real retail demand for air purifiers - and how long does it last?",
        "found": "Wildfire smoke exposure increases retail sales of air purifiers, bottled water, and cold/cough/nasal remedies, with a documented lagged effect (smoke from prior weeks still elevates current-week sales).",
        "establishes": "A review-volume or sales burst coinciding with a wildfire event is a genuine, external-shock-driven demand signal, not a data anomaly to discount by default - directly relevant to how this project's own burst-detection judgment calls should treat wildfire-coincident spikes.",
        "does_not_establish": "Anything about product performance, review sentiment, or which brand/features people bought - this is an aggregate sales-volume study, not a product-quality or preference study.",
        "tension": "A demand spike caused by an external environmental shock (wildfire smoke) can look identical in the data to organic, sustained category growth, but the two have very different implications for forecasting.",
        "design_consequence": "External-shock-correlated demand bursts (wildfire smoke, and by analogy other acute pollution events) should be flagged and reasoned about separately from steady-state category trend, not folded into the same growth-rate estimate.",
        "counterfactual": "What if seasonal/event-driven demand forecasting explicitly modelled wildfire-smoke exposure as its own input, instead of treating all demand growth as one undifferentiated trend line?",
        "limitations": "US retail-scanner data only; sales volume is a purchase-intent proxy, not a satisfaction or efficacy measure; the paywalled full study was archived but only its accessible listing/abstract-level detail is used here.",
    },
]

# Re-used, already-verified technical/regulatory/manufacturer/industry
# documents from the existing real trend_corpus.json - re-classified into
# research territories here, not re-fetched.
#
# TC-R06 and TC-R10 are peer-reviewed papers that ALSO exist inside
# trend_corpus.json (an earlier session filed them there since that corpus
# predates this one splitting peer-reviewed papers out as first-class).
# They are now promoted to RP-11/RP-12 above with full distillation -
# excluded here (and from every count/bucket below) so each paper is
# counted and displayed exactly once, not as both a "trend document" and a
# "peer-reviewed paper".
PROMOTED_TREND_IDS = {"TC-R06", "TC-R10"}

EXISTING_TERRITORY_MAP = {
    "TC-R01": ["R6"],          # EPA Guide to Air Cleaners - sizing, source control, limits
    "TC-R02": ["R6"],          # ENERGY STAR Room Air Cleaners criteria - CADR/W, IEF, ozone
    "TC-R03": ["R6"],          # AHAM Verifide directory - CADR certification
    "TC-R04": ["R6"],          # CARB certified device list - ozone/regulatory constraint
    "TC-R05": ["R2"],          # WHO IAQ guidelines - health-evidence anchor
    "TC-R08": ["R4"],          # Matter Air Quality Sensor spec - connectivity/sensing standard
    "TC-R09": ["R6"],          # EU Ecodesign working plan - regulatory/energy direction
}


def load_existing_corpus():
    path = os.path.join(RAW, "trend_corpus.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def build_manifest_rows(existing):
    rows = []
    for p in PEER_REVIEWED:
        rows.append({
            "research_id": p["research_id"], "title": p["title"], "authors": p["authors"],
            "journal_or_publisher": p["journal"], "year": p["year"],
            "identifier": p["doi"], "pmid": p["pmid"] or "", "pmcid": p["pmcid"] or "",
            "canonical_url": p["canonical_url"], "source_type": p["source_type"],
            "peer_reviewed": p["peer_reviewed"], "territories": "|".join(p["territories"]),
            "retrieved_at": "2026-08-26", "verification_method": "pubmed_mcp_get_article_metadata",
        })
    for a in existing["articles"]:
        if a["article_id"] in PROMOTED_TREND_IDS:
            continue
        rows.append({
            "research_id": a["article_id"], "title": a["title"], "authors": a.get("publisher", ""),
            "journal_or_publisher": a["publisher"],
            "year": a["published_date"][:4] if a.get("published_date") else "UNDATED_LIVING_DOCUMENT",
            "identifier": a["url"], "pmid": "", "pmcid": "",
            "canonical_url": a["url"], "source_type": a["document_type"],
            "peer_reviewed": a["document_type"] == "peer_reviewed",
            "territories": "|".join(EXISTING_TERRITORY_MAP.get(a["article_id"], [])),
            "retrieved_at": a["retrieved_at"], "verification_method": a["retrieval_method"],
        })
    return rows


def build_research_index(existing):
    remaining = [a for a in existing["articles"] if a["article_id"] not in PROMOTED_TREND_IDS]
    n_peer = len(PEER_REVIEWED)
    n_existing_peer = sum(1 for a in remaining if a["document_type"] == "peer_reviewed")
    n_technical = sum(1 for a in remaining
                       if a["document_type"] in ("regulatory_guidance", "technical_standard", "industry_association"))
    n_manufacturer = sum(1 for a in remaining if a["document_type"] == "manufacturer_primary")
    n_industry_survey = sum(1 for a in remaining if a["document_type"] == "syndicated_research")

    territory_counts = {t: 0 for t in TERRITORIES}
    for p in PEER_REVIEWED:
        for t in p["territories"]:
            territory_counts[t] += 1
    for aid, ts in EXISTING_TERRITORY_MAP.items():
        for t in ts:
            territory_counts[t] += 1

    return {
        "_provenance": (
            "Peer-reviewed papers verified 2026-08-26 via the PubMed MCP tool "
            "(convert_article_ids + get_article_metadata) against real PMID/PMCID/DOI "
            "records - not accepted from any prompt-provided claim. Technical/regulatory/"
            "manufacturer documents reused from data/raw/trend_corpus.json, already "
            "individually fetched and archived in an earlier session "
            "(data/real_raw/trend_sources/). See research.md for the full query log."
        ),
        "generated_by": "src/real/research_corpus_real.py",
        "corpus_size": len(PEER_REVIEWED) + len(remaining),
        "peer_reviewed_count": n_peer + n_existing_peer,
        "technical_regulatory_count": n_technical,
        "manufacturer_count": n_manufacturer,
        "industry_survey_count": n_industry_survey,
        "quarantined_count": 0,
        "territories": TERRITORIES,
        "territory_counts": territory_counts,
        "peer_reviewed_papers": PEER_REVIEWED,
        "existing_technical_regulatory": [
            a for a in remaining
            if a["document_type"] in ("regulatory_guidance", "technical_standard", "industry_association")
        ],
        "existing_manufacturer_and_industry": [
            a for a in remaining
            if a["document_type"] in ("manufacturer_primary", "syndicated_research")
        ],
    }


def build_evidence_cards():
    return {
        "_provenance": "Distilled QUESTION/FOUND/ESTABLISHES/DOES_NOT_ESTABLISH/TENSION/"
                        "DESIGN_CONSEQUENCE/COUNTERFACTUAL objects for all {} peer-reviewed "
                        "papers verified this session (10 via PubMed API, 2 promoted from "
                        "trend_corpus.json - RP-11 via PubMed, RP-12 via direct fetch/archive, "
                        "outside PubMed's economics-excluded scope). Distillation authored from "
                        "each paper's real verified abstract, not generated independent of "
                        "source.".format(len(PEER_REVIEWED)),
        "generated_by": "src/real/research_corpus_real.py",
        "cards": [
            {
                "research_id": p["research_id"], "title": p["title"], "year": p["year"],
                "territories": p["territories"], "doi": p["doi"],
                "question": p["question"], "method": p["study_design"], "found": p["found"],
                "establishes": p["establishes"], "does_not_establish": p["does_not_establish"],
                "tension": p["tension"], "design_consequence": p["design_consequence"],
                "counterfactual": p["counterfactual"], "limitations": p["limitations"],
                "incoming_ids": [], "outgoing_ids": [],
            }
            for p in PEER_REVIEWED
        ],
    }


TENSIONS = [
    {
        "tension_id": "T1", "name": "Filtration vs. noise-driven adherence",
        "evidence_ids": ["RP-05", "RP-01", "RP-02"],
        "statement": "Higher measured filtration performance generally requires longer runtime, but RP-05 found noise was a named reason real users under-ran DIY cleaners - a device that filters best in the lab may filter worst in practice if nobody keeps it on.",
        "design_consequence": "Optimize for hours-actually-run under real noise tolerance, not peak lab CADR.",
    },
    {
        "tension_id": "T2", "name": "Constant vs. automatic operation",
        "evidence_ids": ["RP-07"],
        "statement": "RP-07's own three-arm trial shows constant operation removes more PM2.5 (66%) than auto mode (40%), but auto mode sharply cuts runtime/noise/energy - there is no operating mode that wins on both axes at once.",
        "design_consequence": "Ship the trade-off as a visible, explainable choice rather than a single hidden factory default.",
    },
    {
        "tension_id": "T3", "name": "CADR theory vs. real-home performance",
        "evidence_ids": ["RP-07", "RP-01", "RP-06"],
        "statement": "RP-07 explicitly reports a discrepancy between theoretical CADR-based sizing and measured performance; RP-01 shows lab-style single-room performance doesn't fully carry to a second room; RP-06 shows raw real-home averages can even look wrong unless corrected for source strength.",
        "design_consequence": "Any consumer-facing performance number sourced from CADR alone should be treated as a lab upper bound, not a real-home promise.",
    },
    {
        "tension_id": "T4", "name": "More sensing vs. sensor trust",
        "evidence_ids": ["RP-09", "RP-10"],
        "statement": "RP-09's systematic review and RP-10's co-location study both find that consumer-grade sensors can be precise (track relative change well) while still being inaccurate (wrong absolute value) - especially as humidity, temperature and pollutant source vary.",
        "design_consequence": "A 'smart' control claim needs an honest confidence signal, not just a raw sensor number.",
    },
    {
        "tension_id": "T5", "name": "Room-level cleaning vs. spatial/floor sources",
        "evidence_ids": ["RP-04"],
        "statement": "RP-04 shows ordinary walking measurably resuspends floor-deposited particles back into room air - a real spatial source the standard stationary-room-purifier model does not directly address. NOT ESTABLISHED: that a floor-level or mobile purifier would outperform a conventional purifier - RP-04 tested no purifier placement at all.",
        "design_consequence": "Spatial-source modeling should not assume deposited particles stay deposited, but no placement claim follows from this evidence alone.",
    },
    {
        "tension_id": "T6", "name": "Pollutant reduction vs. clinical outcome certainty",
        "evidence_ids": ["RP-08", "RP-03", "RP-05"],
        "statement": "RP-08 found a measurable asthma-control benefit (ACT score, symptom-free days) from real HEPA filtration in one RCT; RP-03 (ammonia) and RP-05 (self-reported symptoms) found PM/exposure changes did NOT correspond to the specific outcomes they measured. The real literature is not unanimous that pollutant reduction equals a felt health benefit.",
        "design_consequence": "Never assert a health-outcome claim from PM-reduction evidence alone; RP-08's result needs independent replication before being treated as settled.",
    },
]


def build_tensions():
    return {
        "_provenance": "Tensions accepted only where at least one verified evidence object "
                        "supports each side of the trade-off - see evidence_ids per tension.",
        "generated_by": "src/real/research_corpus_real.py",
        "tensions": TENSIONS,
    }


def build_clusters():
    territory_members = {t: [] for t in TERRITORIES}
    for p in PEER_REVIEWED:
        for t in p["territories"]:
            territory_members[t].append(p["research_id"])
    for aid, ts in EXISTING_TERRITORY_MAP.items():
        for t in ts:
            territory_members[t].append(aid)
    return {
        "_provenance": "MODEL A only (canonical, analyst-defined research territories). "
                        "MODEL B (emergent TF-IDF + cosine-similarity textual clustering) "
                        "is NOT implemented in this pass - deferred. "
                        "Do not present Model A as if it were machine-derived.",
        "generated_by": "src/real/research_corpus_real.py",
        "model_a_canonical_territories": [
            {"territory_id": t, "name": name, "member_ids": territory_members[t],
             "count": len(territory_members[t])}
            for t, name in TERRITORIES.items()
        ],
        "model_b_emergent_textual_similarity": {
            "status": "NOT_IMPLEMENTED",
            "reason": "Deferred this pass - requires a documented TF-IDF + cosine-similarity "
                      "+ deterministic agglomerative-clustering implementation over verified "
                      "titles/abstracts. A known, open limitation.",
        },
    }


def main():
    existing = load_existing_corpus()
    os.makedirs(RESEARCH_RAW, exist_ok=True)
    os.makedirs(PROC, exist_ok=True)

    rows = build_manifest_rows(existing)
    with open(os.path.join(RESEARCH_RAW, "research_manifest.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    index = build_research_index(existing)
    with open(os.path.join(PROC, "research_index.json"), "w", encoding="utf-8") as fh:
        json.dump(index, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    cards = build_evidence_cards()
    with open(os.path.join(PROC, "evidence_cards.json"), "w", encoding="utf-8") as fh:
        json.dump(cards, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    tensions = build_tensions()
    with open(os.path.join(PROC, "research_tensions.json"), "w", encoding="utf-8") as fh:
        json.dump(tensions, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    clusters = build_clusters()
    with open(os.path.join(PROC, "research_clusters.json"), "w", encoding="utf-8") as fh:
        json.dump(clusters, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("wrote research_manifest.csv ({} rows)".format(len(rows)))
    print("wrote research_index.json (peer_reviewed={}, technical/reg={}, manufacturer={})".format(
        index["peer_reviewed_count"], index["technical_regulatory_count"], index["manufacturer_count"]))
    print("wrote evidence_cards.json ({} cards)".format(len(cards["cards"])))
    print("wrote research_tensions.json ({} tensions)".format(len(tensions["tensions"])))
    print("wrote research_clusters.json (territories={}, Model B=NOT_IMPLEMENTED)".format(len(TERRITORIES)))
    return index


if __name__ == "__main__":
    main()
