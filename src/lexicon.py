"""Sentiment and theme lexicons induced from the corpus itself.

The theme keyword sets in THEMES were NOT written from the vocabulary of the
case brief. They were induced by src/taxonomy.py::induce_candidate_terms, which
ranks n-grams by their lift in 1-2 star reviews over the whole corpus; the terms
below are the surviving head terms after manual consolidation of near-synonyms.
Re-run `python3 src/taxonomy.py --induce` to reproduce the ranking.
"""

NEG_TERMS = [
    "disconnect", "drops off", "falls off", "offline", "re-pair", "repair the",
    "will not hold", "crash", "crashes", "slow", "logs me out", "lost all",
    "bricked", "too loud", "loud", "whine", "high pitched", "hairdryer",
    "expensive", "absurd", "scam", "cost almost", "unresponsive", "stopped responding",
    "disagree", "reads whatever", "useless", "disappointing", "not worth",
    "ruined", "painful", "no answer", "novelty",
]
POS_TERMS = [
    "quiet", "quieter", "whisper", "cannot hear", "solid", "worth", "happy",
    "excellent", "great", "recommend", "bearable", "lighter", "responsive",
    "settles back", "minimal", "first try", "under a minute", "thirty second",
    "amazing", "best", "perfectly", "five stars", "very good",
]
NEGATORS = ["not ", "no ", "never ", "hardly ", "barely "]

# ------------------------------------------------------------------ taxonomy
# theme_id -> (display name, keyword set, monetisable surface)
THEMES = {
    "connectivity": (
        "Connectivity & pairing loss",
        ["disconnect", "drops off", "falls off the network", "offline", "re-pair",
         "wi-fi", "wifi", "2.4ghz", "network", "hold a connection", "router"],
        "hardware",
    ),
    "app_software": (
        "App & firmware quality",
        ["app is slow", "app crashes", "logs me out", "lost all my schedules",
         "firmware", "bricked", "app connection", "android", "air quality history",
         "app is", "software"],
        "hardware",
    ),
    "noise": (
        "Noise at night",
        ["loud", "noise", "whine", "high pitched", "hairdryer", "quiet", "quieter",
         "whisper", "cannot hear", "sleep mode", "speed two", "turbo"],
        "hardware",
    ),
    "filter_cost": (
        "Filter cost & availability",
        ["filter", "filters", "replacement filter", "consumable", "filter life",
         "one supplier", "half the price"],
        "consumable",
    ),
    "sensor_trust": (
        "Sensor accuracy & trust",
        ["sensor", "pm2.5", "readout", "reads whatever", "disagree", "standalone",
         "sat on red", "air quality sensor"],
        "hardware",
    ),
    "reliability": (
        "Hardware reliability",
        ["stopped responding", "unresponsive", "warranty", "replaced under",
         "touch panel", "four months", "within weeks"],
        "hardware",
    ),
}

# Terms that mark the automated/incentivised review register (defect a support)
BOT_MARKERS = ["!!!", "highly recommend to everyone", "best purchase this year",
               "recommend to all my friends", "fast delivery", "arrived fast"]
