"""Shared constants for the Connected Air Treatment data-generation layer.

All raw datasets in this repository are SYNTHETIC fixtures generated from a
fixed seed. They exist to exercise the ingestion / cleaning / reconciliation
pipeline before licensed vendor feeds are wired in. Nothing here is real
vendor data and none of it may be quoted externally.
"""

SEED = 42            # fixture generation
RANDOM_STATE = 42    # every analysis-stage sample / shuffle
CATEGORY = "Connected Air Treatment"
BUSINESS_UNIT = "Versuni - Home Air"

# Corpus reference date: the day the synthetic "retrieval" is stamped as of.
RETRIEVAL_DATE = "2026-08-26"
RETRIEVAL_TS = "2026-08-26T09:00:00+02:00"

# Review corpus shape
N_REVIEWS_TOTAL = 3500
N_BURST_DUPLICATES = 300      # defect (a)
N_SENTIMENT_CONFLICTS = 50    # defect (b)
N_MALFORMED_DATES = 120       # defect (c)

# Defect (a) window - 3 consecutive days
BURST_WINDOW = ("2026-03-14", "2026-03-16")
BURST_SKU = "VS-AP-8000i"

REVIEW_PERIOD = ("2024-09-01", "2026-08-20")

PROVENANCE_BANNER = (
    "SYNTHETIC FIXTURE - generated locally with a fixed seed. Figures, URLs "
    "and vendor attributions are illustrative placeholders and must not be "
    "cited, published or treated as licensed vendor data."
)

PRODUCTS = [
    # (sku, product_name, brand, connected, msrp_eur)
    ("VS-AP-8000i", "Air Performer 8000i Series", "Philips", True, 599.0),
    ("VS-AP-4000i", "Air Purifier 4000i Series", "Philips", True, 349.0),
    ("VS-AP-3000i", "Air Purifier 3000i Series", "Philips", True, 249.0),
    ("VS-AP-2000",  "Air Purifier 2000 Series",  "Philips", False, 179.0),
    ("VS-AC-1000i", "Air Cleaner Compact 1000i", "Philips", True, 129.0),
    ("CP-DY-TP09",  "Purifier Cool Formaldehyde TP09", "Dyson", True, 649.0),
    ("CP-LV-C400S", "Core 400S Smart", "Levoit", True, 219.0),
    ("CP-XM-4PRO",  "Smart Air Purifier 4 Pro", "Xiaomi", True, 189.0),
    ("CP-BB-DM5440","DustMagnet 5440i", "Blueair", True, 299.0),
]

MARKETPLACES = [
    ("amazon_de", "DE", "de"), ("amazon_uk", "GB", "en"),
    ("amazon_fr", "FR", "fr"), ("amazon_nl", "NL", "nl"),
    ("mediamarkt_de", "DE", "de"), ("coolblue_nl", "NL", "nl"),
    ("bol_nl", "NL", "nl"), ("fnac_fr", "FR", "fr"),
    ("currys_uk", "GB", "en"), ("versuni_dtc", "EU", "en"),
]


# ---------------------------------------------------------------- Q1 measures
# The three measures fixed at Q1 and held unchanged through Q6.
# NOTE: these definitions describe the REAL-data pipeline (src/real/). The
# original synthetic-fixture phase used a different Financial Value Proxy
# definition (EUR-millions aftermarket revenue at risk) - that definition
# lives only in tests/synthetic_fixtures/ now and must not be shown as the
# current measure (caught via dashboard/app.py EXECUTIVE tab review).
DECISION_METRICS = [
    ("friction_prevalence_pct", "Friction Prevalence %",
     "Share of real reviews whose text carries the theme (polarity-gated)."),
    ("csat_impact", "CSAT Impact",
     "Mean star rating of real reviews carrying the theme minus corpus mean (stars)."),
    ("financial_value_proxy_usd", "Financial Value Proxy",
     "Price-Weighted Exposure (USD): sum of real observed listed prices across "
     "affected real reviews with a known price. A relative reach x price "
     "indicator, NOT a revenue, market-size, or WTP estimate."),
]

OPPORTUNITY_SPACES = [
    {
        "id": "OS-1",
        "name": "Ultra-Quiet Autonomous Night Air Purification",
        "usage_context": "Bedroom, overnight, sleeping households",
        "friction": "Units are switched off at night because they are audible, "
                    "so the hours of highest exposure benefit go unpurified",
        "enabling_trend": "Edge-AI sensor fusion + low-RPM aerodynamics (TC-005, TC-003)",
    },
    {
        "id": "OS-2",
        "name": "Voice-Driven Manual Control",
        "usage_context": "Living room, daytime, smart-speaker households",
        "friction": "Manual speed control via app is slow and fiddly",
        "enabling_trend": "Matter 1.4 voice assistant device types (TC-003)",
    },
    {
        "id": "OS-3",
        "name": "Outdoor Air App Integration",
        "usage_context": "Urban households in high-AQI cities",
        "friction": "Users cannot relate indoor readings to outdoor pollution",
        "enabling_trend": "Open AQI data feeds + app data layers (TC-001, TC-009)",
    },
]
