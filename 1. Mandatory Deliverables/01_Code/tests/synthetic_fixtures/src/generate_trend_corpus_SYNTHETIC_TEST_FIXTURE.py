"""Generate data/raw/trend_corpus.json - metadata for 15 industry / technology
articles framing the Connected Air Treatment category.

METADATA ONLY. No article body text is stored (copyright), and because this is a
synthetic fixture every `url` is a structurally-valid PLACEHOLDER that has not
been retrieved. `url_verified` is false on every record for exactly that reason:
before any of these are cited, the link must be resolved and the record
re-stamped against the real source.

Run:  python3 src/generate_trend_corpus.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "data", "raw", "trend_corpus.json")

# (id, title, publisher, domain, slug, pub_date, doc_type, tier, region,
#  themes, scope_note, paywalled)
A = [
 ("TC-001", "Indoor air quality moves from wellness trend to building requirement",
  "World Health Organization", "who.int", "indoor-air-quality-guidelines-update",
  "2026-02-11", "regulatory_guidance", "tier_1_authoritative", "Global",
  ["regulation", "health_evidence", "iaq_standards"],
  "WHO guideline revision; category demand driver, not market sizing.", False),

 ("TC-002", "EU Ecodesign review puts filter replaceability and repair scores on air treatment",
  "European Commission", "ec.europa.eu", "ecodesign-air-treatment-review-2026",
  "2026-01-29", "regulatory_guidance", "tier_1_authoritative", "EU",
  ["regulation", "sustainability", "right_to_repair", "aftermarket"],
  "Draft regulation affecting filter aftermarket economics in EU27.", False),

 ("TC-003", "Matter 1.4 adds air quality sensor and purifier device types",
  "Connectivity Standards Alliance", "csa-iot.org", "matter-1-4-air-quality-device-types",
  "2025-11-06", "technical_standard", "tier_1_authoritative", "Global",
  ["interoperability", "matter", "smart_home_platform", "connectivity"],
  "Standards release; direct relevance to app-disconnect complaint cluster.", False),

 ("TC-004", "Why smart home devices still fall off the network",
  "IEEE Spectrum", "spectrum.ieee.org", "smart-home-wifi-reliability-2-4ghz",
  "2025-09-18", "technology_analysis", "tier_2_trade_technical", "Global",
  ["connectivity", "wifi_reliability", "ux_friction", "band_steering"],
  "Engineering analysis of 2.4GHz band-steering failure modes.", False),

 ("TC-005", "Edge AI is quietly replacing threshold logic in consumer air sensors",
  "IEEE Spectrum", "spectrum.ieee.org", "edge-ai-consumer-air-quality-sensors",
  "2026-03-24", "technology_analysis", "tier_2_trade_technical", "Global",
  ["edge_ai", "sensor_fusion", "auto_mode", "product_technology"],
  "Technology scan; informs sensor-accuracy complaint theme.", False),

 ("TC-006", "Low-cost PM2.5 sensors: how far can you trust the number",
  "Nature Communications", "nature.com", "low-cost-pm25-sensor-accuracy-review",
  "2025-10-02", "peer_reviewed", "tier_1_authoritative", "Global",
  ["sensor_accuracy", "measurement_validity", "health_evidence"],
  "Peer-reviewed calibration study; evidence base for sensor claims.", True),

 ("TC-007", "Appliance makers bet on subscriptions as hardware margins compress",
  "Financial Times", "ft.com", "appliance-subscription-models-margin-shift",
  "2026-04-15", "business_press", "tier_2_trade_technical", "Global",
  ["business_model", "subscription", "aftermarket", "margin"],
  "Commercial context for filter-subscription attach rate.", True),

 ("TC-008", "Filter subscriptions are the new razor blades in home appliances",
  "The Wall Street Journal", "wsj.com", "filter-subscription-home-appliances",
  "2026-05-08", "business_press", "tier_2_trade_technical", "US",
  ["business_model", "subscription", "consumer_backlash", "aftermarket"],
  "Includes consumer pushback on consumable pricing.", True),

 ("TC-009", "Air treatment demand tracks wildfire smoke, not marketing calendars",
  "Reuters", "reuters.com", "wildfire-smoke-air-purifier-demand",
  "2025-08-27", "business_press", "tier_2_trade_technical", "Global",
  ["demand_seasonality", "climate", "external_shock"],
  "Demand-shock evidence; relevant to burst-volume interpretation.", False),

 ("TC-010", "Consumer smart home report: pairing is still the biggest drop-off point",
  "Parks Associates", "parksassociates.com", "smart-home-onboarding-dropoff-2026",
  "2026-02-03", "syndicated_research", "tier_2_trade_technical", "US",
  ["onboarding", "app_attach_rate", "ux_friction", "churn"],
  "Syndicated consumer survey; benchmark for app attach rate.", True),

 ("TC-011", "Smart home category outlook 2026",
  "CTA (Consumer Technology Association)", "cta.tech", "smart-home-outlook-2026",
  "2026-01-14", "syndicated_research", "tier_2_trade_technical", "US",
  ["market_sizing", "category_outlook", "smart_home"],
  "US-scope sizing; NOT directly comparable to Western Europe cuts.", True),

 ("TC-012", "European appliance shipments 2025: air treatment outperforms the category",
  "APPLiA Europe", "applia-europe.eu", "european-appliance-shipments-2025",
  "2026-03-05", "industry_association", "tier_2_trade_technical", "EU",
  ["shipments", "market_sizing", "europe"],
  "Shipment volumes, not retail value; different basis to Euromonitor.", False),

 ("TC-013", "Fake reviews: platforms remove record volume of incentivised posts",
  "Which?", "which.co.uk", "fake-reviews-marketplace-enforcement",
  "2025-12-09", "consumer_advocacy", "tier_2_trade_technical", "UK",
  ["review_integrity", "fake_reviews", "data_quality"],
  "Directly relevant to the duplicate-burst defect in the review corpus.", False),

 ("TC-014", "Detecting review bursts and coordinated posting at scale",
  "ACM Transactions on the Web", "dl.acm.org", "detecting-coordinated-review-bursts",
  "2025-07-21", "peer_reviewed", "tier_1_authoritative", "Global",
  ["review_integrity", "anomaly_detection", "methodology", "data_quality"],
  "Method reference for the burst-detection step in cleaning.", True),

 ("TC-015", "Noise is the number one reason people switch off their purifier at night",
  "Stiftung Warentest", "test.de", "luftreiniger-test-geraeusch-2026",
  "2026-06-17", "consumer_advocacy", "tier_2_trade_technical", "DE",
  ["noise", "usage_behaviour", "product_testing", "sleep_mode"],
  "Independent lab testing; corroborates noise complaint theme.", True),
]


def build():
    articles = []
    for (aid, title, pub, domain, slug, pdate, dtype, tier, region,
         themes, scope_note, paywalled) in A:
        articles.append({
            "article_id": aid,
            "title": title,
            "publisher": pub,
            "source_domain": domain,
            "url": "https://www.{}/{}".format(domain, slug),
            "url_verified": False,
            "url_status": "SYNTHETIC_PLACEHOLDER_NOT_RETRIEVED",
            "published_date": pdate,
            "retrieved_at": C.RETRIEVAL_TS,
            "retrieval_method": "synthetic_fixture",
            "document_type": dtype,
            "credibility_tier": tier,
            "geographic_scope": region,
            "themes": themes,
            "scope_note": scope_note,
            "paywalled": paywalled,
            "full_text_stored": False,
            "language": "de" if domain in ("test.de",) else "en",
            "category_relevance": C.CATEGORY,
        })
    return {
        "_provenance": C.PROVENANCE_BANNER,
        "_synthetic": True,
        "schema_version": "1.0.0",
        "corpus_name": "Connected Air Treatment - trend corpus",
        "category": C.CATEGORY,
        "business_unit": C.BUSINESS_UNIT,
        "compiled_at": C.RETRIEVAL_TS,
        "article_count": len(articles),
        "copyright_note": (
            "Metadata only - no article body text is stored or redistributed. "
            "Resolve and re-verify each URL against the licensed source before citing."
        ),
        "coverage": {
            "date_range": [min(a["published_date"] for a in articles),
                           max(a["published_date"] for a in articles)],
            "document_types": sorted({a["document_type"] for a in articles}),
            "credibility_tiers": sorted({a["credibility_tier"] for a in articles}),
            "regions": sorted({a["geographic_scope"] for a in articles}),
            "themes": sorted({t for a in articles for t in a["themes"]}),
            "paywalled_count": sum(1 for a in articles if a["paywalled"]),
        },
        "articles": articles,
    }


def main():
    doc = build()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} articles, {} themes)".format(
        OUT, doc["article_count"], len(doc["coverage"]["themes"])))


if __name__ == "__main__":
    main()
