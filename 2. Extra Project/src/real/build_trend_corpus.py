"""Build data/raw/trend_corpus.json from REAL, individually fetched and
archived documents (data/real_raw/trend_sources/*). Every URL below was
opened and its cited facts verified against the live page or PDF during this
repair.

This replaces the fully synthetic src/generate_trend_corpus.py output.
Twelve documents, not the earlier fabricated fifteen - fewer than the
brief's 12-20 guidance ceiling but each one individually verified, which the
brief explicitly values over volume ("We do not award credit for the number
of sources collected").

Run:  python3 src/real/build_trend_corpus.py
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "raw", "trend_corpus.json")
SRC_DIR = os.path.join(ROOT, "data", "real_raw", "trend_sources")

ACCESS_DATE = "2026-08-26"

DOCS = [
    dict(article_id="TC-R01",
         title="Air Cleaners and Air Filters in the Home",
         publisher="U.S. Environmental Protection Agency (EPA)",
         source_domain="epa.gov",
         url="https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
         published_date="2026-08-03",
         document_type="regulatory_guidance", credibility_tier="tier_1_authoritative",
         geographic_scope="US", themes=["regulation", "iaq_standards", "health_evidence"],
         scope_note=("EPA does not certify or recommend specific brands. Establishes that "
                     "portable air cleaners reduce but do not eliminate indoor pollution, and "
                     "that source control/ventilation are the primary levers - filtration is a "
                     "supplement. Supports category-relevance claims, not efficacy claims for "
                     "any specific product."),
         archive_file="epa_air_cleaners.html", paywalled=False),

    dict(article_id="TC-R02",
         title="Room Air Cleaners Key Product Criteria (ENERGY STAR)",
         publisher="U.S. EPA / ENERGY STAR", source_domain="energystar.gov",
         url="https://www.energystar.gov/products/air_purifiers_cleaners/key_product_criteria",
         published_date=None,
         document_type="technical_standard", credibility_tier="tier_1_authoritative",
         geographic_scope="US", themes=["regulation", "energy_efficiency", "iaq_standards"],
         scope_note=("Defines the CADR / Integrated Energy Factor / ozone-limit criteria a "
                     "device must meet to be ENERGY STAR certified. Supports claims about how "
                     "purifier performance and energy efficiency are formally measured; does "
                     "not itself establish market size or growth."),
         archive_file="energystar_criteria.html", paywalled=False),

    dict(article_id="TC-R03",
         title="Find a Certified Room Air Cleaner (AHAM Verifide directory)",
         publisher="Association of Home Appliance Manufacturers (AHAM)",
         source_domain="ahamverifide.org",
         url="https://ahamverifide.org/directory-of-air-cleaners/",
         published_date=None,
         document_type="industry_association", credibility_tier="tier_2_trade_technical",
         geographic_scope="US", themes=["certification", "cadr", "iaq_standards"],
         scope_note=("Industry-body-run, independent third-party CADR testing program. "
                     "Supports the claim that CADR is the standard cross-brand performance "
                     "metric; is an industry association, not a fully independent scientific "
                     "body - its members are the manufacturers being certified."),
         archive_file="aham_verifide.html", paywalled=False),

    dict(article_id="TC-R04",
         title="List of CARB-Certified Air Cleaning Devices",
         publisher="California Air Resources Board (CARB)", source_domain="ww2.arb.ca.gov",
         url="https://ww2.arb.ca.gov/list-carb-certified-air-cleaning-devices",
         published_date="2026-08-01",
         document_type="regulatory_guidance", credibility_tier="tier_1_authoritative",
         geographic_scope="US-CA", themes=["regulation", "ozone_safety", "iaq_standards"],
         scope_note=("California-specific mandatory certification since 2010; ozone limit "
                     "50 ppb. Explicitly does NOT evaluate overall pollutant-removal "
                     "effectiveness or declare devices 'safe' - supports a narrow safety claim "
                     "only, not a general efficacy claim."),
         archive_file="carb_certified.html", paywalled=False),

    dict(article_id="TC-R05",
         title="WHO Guidelines for Indoor Air Quality: Selected Pollutants",
         publisher="World Health Organization (WHO)", source_domain="who.int",
         url="https://www.who.int/publications/i/item/9789289002134",
         published_date="2010-01-01",
         document_type="regulatory_guidance", credibility_tier="tier_1_authoritative",
         geographic_scope="Global", themes=["health_evidence", "iaq_standards", "regulation"],
         scope_note=("Covers 9 indoor chemical pollutants (benzene, CO, formaldehyde, NO2, "
                     "PAHs, radon, etc.) for regulators and building professionals. Supports "
                     "the health-relevance framing of indoor air quality broadly; does not "
                     "evaluate or endorse any purifier product or technology. Note: 2010 "
                     "publication - the oldest source in this corpus; cited for enduring "
                     "pollutant-exposure framework, not for current market conditions."),
         archive_file="who_iaq_guidelines.html", paywalled=False),

    dict(article_id="TC-R06",
         title="Toward Better and Healthier Air Quality: Global PM2.5 and O3 Pollution "
               "Status and Risk Assessment Based on the New WHO Air Quality Guidelines for 2021",
         publisher="Global Challenges (Wiley) - Liu, He, Si, Li, Wu, Ni, Zhao, Hu, Du, Lu, "
                   "Jin, Xu (2024)",
         source_domain="pmc.ncbi.nlm.nih.gov",
         url="https://pmc.ncbi.nlm.nih.gov/articles/PMC11009431/",
         published_date="2024-03-26",
         document_type="peer_reviewed", credibility_tier="tier_1_authoritative",
         geographic_scope="Global", themes=["health_evidence", "measurement_validity",
                                            "regulation"],
         scope_note=("Observational analysis of daily air-quality monitoring data, 618 cities, "
                     "2019-2022. Finds only 10% of days globally met the WHO 2021 PM2.5 "
                     "guideline (<=15 ug/m3); >35% of cities show compound PM2.5-ozone "
                     "pollution. Supports the claim that ambient/indoor-relevant PM2.5 exposure "
                     "remains widespread against current WHO guidance - a demand-context claim, "
                     "not a purifier-efficacy claim."),
         archive_file="pmc_liu_2024_pm25_who.html", paywalled=False),

    dict(article_id="TC-R07",
         title="Philips Domestic Appliances launches first all-in-one air purifier with "
               "AI technology",
         publisher="Versuni Newsroom", source_domain="versuni.com",
         url="https://www.versuni.com/newsroom/philips-domestic-appliances-launches-first-"
             "all-in-one-air-purifier-with-ai-technology/",
         published_date="2022-11-14",
         document_type="manufacturer_primary", credibility_tier="tier_3_vendor_primary",
         geographic_scope="Global", themes=["product_technology", "ai_sensing",
                                            "connectivity", "smart_home_platform"],
         scope_note=("MANUFACTURER'S OWN PRESS RELEASE about the Philips Air Performer "
                     "3-in-1 - describes AI-driven sensing, Wi-Fi/app control (Air+ app), "
                     "NanoProtect HEPA. Treated as a primary product claim, not independent "
                     "validation of performance or of category-wide AI adoption - the brief's "
                     "own instruction to 'treat a vendor promoting its own product differently "
                     "from an industry body' applies directly here."),
         archive_file="versuni_ai_purifier.html", paywalled=False),

    dict(article_id="TC-R08",
         title="Air Quality Sensor (Matter device type specification)",
         publisher="Connectivity Standards Alliance (CSA-IOT)", source_domain="csa-iot.org",
         url="https://csa-iot.org/csa_product/air-quality-sensor/",
         published_date=None,
         document_type="technical_standard", credibility_tier="tier_1_authoritative",
         geographic_scope="Global", themes=["interoperability", "matter", "connectivity",
                                            "smart_home_platform"],
         scope_note=("Standards-body specification: Matter's Air Quality Sensor device type "
                     "(PM1/PM2.5/PM10/CO2/NO2/VOC/CO/Ozone/Radon/Formaldehyde clusters), added "
                     "as part of Matter 1.2's nine new device types. Corrects an earlier draft "
                     "of this corpus which mis-cited 'Matter 1.4' - the air-quality device type "
                     "was actually introduced in Matter 1.2, verified directly against this "
                     "page. Supports a connectivity-standardization claim, not an adoption-"
                     "rate claim."),
         archive_file="csa_iot_aq_sensor.html", paywalled=False),

    dict(article_id="TC-R09",
         title="Ecodesign for Sustainable Products Regulation - 2025-2030 working plan",
         publisher="European Commission (Directorate-General for Environment)",
         source_domain="green-forum.ec.europa.eu",
         url="https://green-forum.ec.europa.eu/news/2025-2030-working-plan-2025-07-11_en",
         published_date="2025-07-11",
         document_type="regulatory_guidance", credibility_tier="tier_1_authoritative",
         geographic_scope="EU", themes=["regulation", "sustainability", "right_to_repair"],
         scope_note=("Verified directly: this specific EU working plan names priority product "
                     "categories as steel/aluminium, textiles, furniture, tyres, mattresses and "
                     "'a number of energy-related products' - it does NOT name air treatment or "
                     "household appliances as a distinct 2025-2030 priority. Cited for the "
                     "broader Ecodesign/ESPR regulatory direction (repairability score, "
                     "recyclability requirements) that could reach the category later, not as "
                     "evidence air treatment is already a named priority - an honest scope "
                     "correction versus an earlier draft's unverified 'Ecodesign review' claim."),
         archive_file="eu_greenforum_plan.html", paywalled=False),

    dict(article_id="TC-R10",
         title="A Burning Issue: Wildfire Smoke Exposure, Retail Sales, and Demand for "
               "Adaptation in Healthcare",
         publisher="Environmental & Resource Economics, Vol. 87(11) - Han, Li, Wang (2024)",
         source_domain="ideas.repec.org",
         url="https://ideas.repec.org/a/kap/enreec/v87y2024i11d10.1007_s10640-024-00925-3.html",
         published_date="2024-01-01",
         document_type="peer_reviewed", credibility_tier="tier_1_authoritative",
         geographic_scope="US", themes=["demand_seasonality", "climate", "external_shock"],
         scope_note=("Peer-reviewed retail-scanner-data study: wildfire smoke exposure "
                     "increases sales of air purifiers, bottled water, cold/cough/nasal "
                     "remedies, with a documented lagged effect (prior weeks' smoke still "
                     "affects current sales). Directly supports treating a review-volume burst "
                     "coinciding with a wildfire event as a genuine demand signal rather than "
                     "an anomaly by default - relevant to Q2's burst-detection judgment calls."),
         archive_file="repec_han_wildfire_retail.html", paywalled=True),

    dict(article_id="TC-R11",
         title="Dyson launches air purifier with new sensing technology to destroy "
               "potentially dangerous indoor pollutants",
         publisher="Dyson Newsroom", source_domain="dyson.com.sg",
         url="https://www.dyson.com.sg/newsroom/new-air-purification",
         published_date="2021-04-22",
         document_type="manufacturer_primary", credibility_tier="tier_3_vendor_primary",
         geographic_scope="Global", themes=["product_technology", "sensor_accuracy",
                                            "competitor"],
         scope_note=("COMPETITOR'S OWN PRESS RELEASE: solid-state formaldehyde sensing, "
                     "claimed as more durable than gel-based sensors. A primary vendor claim "
                     "about a competing brand's technology, useful for competitive/technology "
                     "landscape context, not independently verified sensor-accuracy evidence."),
         archive_file="dyson_formaldehyde.html", paywalled=False),

    dict(article_id="TC-R12",
         title="The State of Home Connectivity 2025",
         publisher="TechSee", source_domain="techsee.com",
         url="https://techsee.com/wp-content/uploads/2025/09/TechSee_Survey-Report_Sep_25.pdf",
         published_date="2025-09-01",
         document_type="syndicated_research", credibility_tier="tier_2_trade_technical",
         geographic_scope="US", themes=["connectivity", "wifi_reliability", "ux_friction",
                                        "churn"],
         scope_note=("Census-weighted nationwide US survey, n=3,780 (3,606 complete), +/-1.6% "
                     "margin at 95% confidence, fielded August 2025. Reports 68% of households "
                     "had a Wi-Fi problem in the past 12 months, 18% daily. This is a GENERAL "
                     "home-connectivity survey, not purifier-specific - it can only support a "
                     "claim that home Wi-Fi reliability is a widespread category-agnostic "
                     "friction, not a claim specific to smart air purifiers."),
         archive_file="techsee_home_connectivity_2025.pdf", paywalled=False),
]


def build():
    articles = []
    for d in DOCS:
        archive_path = os.path.join(SRC_DIR, d["archive_file"])
        archived = os.path.exists(archive_path)
        articles.append({
            "article_id": d["article_id"],
            "title": d["title"],
            "publisher": d["publisher"],
            "source_domain": d["source_domain"],
            "url": d["url"],
            "url_verified": True,
            "url_status": "FETCHED_AND_ARCHIVED" if archived else "FETCHED_NOT_ARCHIVED",
            "published_date": d["published_date"],
            "retrieved_at": ACCESS_DATE,
            "retrieval_method": "webfetch_and_curl_archive",
            "archive_file": ("data/real_raw/trend_sources/" + d["archive_file"]) if archived else None,
            "document_type": d["document_type"],
            "credibility_tier": d["credibility_tier"],
            "geographic_scope": d["geographic_scope"],
            "themes": d["themes"],
            "scope_note": d["scope_note"],
            "paywalled": d["paywalled"],
            "full_text_stored": archived,
            "language": "en",
            "category_relevance": C.CATEGORY,
        })
    return {
        "_provenance": "REAL sources - each URL individually fetched and verified during "
                       "this repair (2026-08-26). Archived copies in "
                       "data/real_raw/trend_sources/. Superseded the fully synthetic "
                       "15-document placeholder corpus this file replaced.",
        "_synthetic": False,
        "schema_version": "2.0.0-real",
        "corpus_name": "Air Purification - trend corpus (real)",
        "category": C.CATEGORY,
        "business_unit": C.BUSINESS_UNIT,
        "compiled_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "article_count": len(articles),
        "copyright_note": ("Metadata + archived HTML/PDF copies where the source's terms "
                           "permit low-volume automated retrieval (all sources here are "
                           "public regulatory, standards-body, or newsroom pages; no login "
                           "or paywall was circumvented). One source (TC-R10) is a "
                           "peer-reviewed journal article behind a publisher paywall - only "
                           "its public abstract page was archived, consistent with 'do not "
                           "circumvent paywalls.'"),
        "coverage": {
            "date_range": [min(a["published_date"] for a in articles if a["published_date"]),
                           max(a["published_date"] for a in articles if a["published_date"])],
            "document_types": sorted({a["document_type"] for a in articles}),
            "credibility_tiers": sorted({a["credibility_tier"] for a in articles}),
            "regions": sorted({a["geographic_scope"] for a in articles}),
            "themes": sorted({t for a in articles for t in a["themes"]}),
            "paywalled_count": sum(1 for a in articles if a["paywalled"]),
        },
        "articles": articles,
        "what_this_corpus_cannot_establish": (
            "Twelve documents cannot establish that connectivity, AI-sensing, or any other "
            "trend is 'real' or 'growing' in a statistical sense - per the brief's own "
            "instruction. It establishes: (a) what regulators and standards bodies currently "
            "require or measure, (b) what two named manufacturers claim about their own "
            "products, (c) two peer-reviewed findings on PM2.5 exposure and wildfire-driven "
            "retail demand, and (d) one general (non-purifier-specific) home-connectivity "
            "reliability survey. Category-specific market growth is addressed separately and "
            "more rigorously in data/raw/market_metrics.json (Q5)."
        ),
    }


def main():
    doc = build()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} REAL articles, {} archived)".format(
        OUT, doc["article_count"], sum(1 for a in doc["articles"] if a["full_text_stored"])))


if __name__ == "__main__":
    main()
