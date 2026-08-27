"""Honest source/connector status - what data family actually feeds this
app right now, and how. NOT a live connector registry (no OAuth, no
scheduled refresh, no health polling) - a truthful snapshot of what was
verified and how, so the UI never implies a capability that doesn't exist.

States: LIVE_VERIFIED_THIS_SESSION (web search/fetch or API call actually
made this session), FROZEN (archived real data, not re-fetched this
session), MANUAL_ONLY_BY_DESIGN (deliberately never automated), NOT_
IMPLEMENTED (no connector exists - honestly absent, not faked).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

SOURCES = [
    {
        "id": "pubmed", "name": "PubMed / PMC", "category": "research",
        "status": "LIVE_VERIFIED_THIS_SESSION",
        "contributes": "12 peer-reviewed papers - PMID/PMCID/DOI/title/authors/journal/year read back from the live NCBI-backed API this session.",
        "method": "mcp__plugin_bio-research_pubmed (convert_article_ids + get_article_metadata)",
        "last_verified": "2026-08-26",
    },
    {
        "id": "crossref", "name": "Crossref", "category": "research",
        "status": "NOT_IMPLEMENTED",
        "contributes": "Would provide DOI resolution / metadata cross-check.",
        "method": None, "last_verified": None,
    },
    {
        "id": "semantic_scholar", "name": "Semantic Scholar", "category": "research",
        "status": "NOT_IMPLEMENTED",
        "contributes": "Would provide citation graph / related-work discovery.",
        "method": None, "last_verified": None,
    },
    {
        "id": "google_scholar", "name": "Google Scholar", "category": "research",
        "status": "MANUAL_ONLY_BY_DESIGN",
        "contributes": "No official bulk API exists - used only as a manual cross-check link, never scraped.",
        "method": "manual", "last_verified": None,
    },
    {
        "id": "google_trends", "name": "Google Trends", "category": "trend",
        "status": "NOT_IMPLEMENTED",
        "contributes": "Would provide search-interest data (not sales/demand/WTP even if connected).",
        "method": None, "last_verified": None,
    },
    {
        "id": "cbs", "name": "CBS (Statistics Netherlands)", "category": "economics",
        "status": "LIVE_VERIFIED_THIS_SESSION",
        "contributes": "Mean disposable household income, mean equivalised income, private household count, energy bill anchor.",
        "method": "web search + direct page fetch (not the CBS OData API)",
        "last_verified": "2026-08-26",
    },
    {
        "id": "eurostat", "name": "Eurostat", "category": "economics",
        "status": "LIVE_VERIFIED_THIS_SESSION",
        "contributes": "Dutch household electricity price (2,500-5,000 kWh band), via a Statista-hosted Eurostat figure.",
        "method": "web search", "last_verified": "2026-08-26",
    },
    {
        "id": "applia", "name": "APPLiA Nederland", "category": "economics",
        "status": "LIVE_VERIFIED_THIS_SESSION",
        "contributes": "Dutch appliance-market turnover and unit-volume figures for 2024/2025, SDA premiumisation.",
        "method": "web search + direct page fetch", "last_verified": "2026-08-26",
    },
    {
        "id": "versuni_philips", "name": "Versuni / Philips official", "category": "products",
        "status": "LIVE_VERIFIED_THIS_SESSION",
        "contributes": "7 of ~20 candidate SKUs verified with real spec + real downloaded/hashed official image "
                       "(PureProtect 3200 AC3220/10, PureProtect Mini 900 AC0950/10, PureProtect Pro 4200 AC4220/12, "
                       "800i AC0850/41, 1000i AC1715/10, PureProtect Quiet 2200 AC2220/10, Air Performer 7000 AMF765/70). "
                       "The rest of the candidate SKU list is NOT yet verified - shown as UNKNOWN, not inferred.",
        "method": "web search + direct page fetch", "last_verified": "2026-08-26",
    },
    {
        "id": "reviews", "name": "Consumer reviews (McAuley-Lab Amazon-Reviews-2023)", "category": "consumer",
        "status": "FROZEN",
        "contributes": "10,529 real reviews, 237 real hand-validated products - the competitive/consumer corpus, NOT the official Versuni portfolio.",
        "method": "frozen archive, streamed from HuggingFace in an earlier session", "last_verified": "2026-08-26 (archive re-read, not re-fetched)",
    },
    {
        "id": "market_reports", "name": "Market reports (Mordor / IMARC)", "category": "market",
        "status": "FROZEN",
        "contributes": "2 real, individually archived, genuinely disagreeing category-sizing sources (Q5).",
        "method": "frozen archive from an earlier session", "last_verified": "2026-08-26 (archive re-read, not re-fetched)",
    },
]


def main():
    doc = {
        "_provenance": "Honest snapshot of what data actually feeds this app and how - not a live connector "
                       "registry with health polling. Recorded 2026-08-26.",
        "generated_by": "src/real/sources_real.py",
        "sources": SOURCES,
        "counts": {
            "live_verified_this_session": sum(1 for s in SOURCES if s["status"] == "LIVE_VERIFIED_THIS_SESSION"),
            "frozen": sum(1 for s in SOURCES if s["status"] == "FROZEN"),
            "manual_only": sum(1 for s in SOURCES if s["status"] == "MANUAL_ONLY_BY_DESIGN"),
            "not_implemented": sum(1 for s in SOURCES if s["status"] == "NOT_IMPLEMENTED"),
        },
    }
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "sources_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote sources_real.json: {}".format(doc["counts"]))
    return doc


if __name__ == "__main__":
    main()
