"""DISCOVER + FETCH stage of the Intelligence Fabric refresh pipeline -
live, real, incremental research discovery against PubMed E-utilities and
Crossref's public REST API (stdlib HTTP only, no new dependency).

Every result here is a genuinely live API response, verified by the
network call itself - nothing in this module is simulated, cached-forever,
or invented. Discovered items are written as CANDIDATE documents
(data/processed/research_candidates.json) and NEVER silently promoted
into the reproducible accepted corpus (research_index.json /
research_corpus_real.py::PEER_REVIEWED) - see DATA_FABRIC.md "Candidate
vs accepted".

Google Scholar is explicitly NOT queried here (manual-only by design,
matches sources_real.json's existing google_scholar entry).
Semantic Scholar is attempted but its public (no-API-key) endpoint is
aggressively rate-limited (429) - a real failure is recorded in the run
manifest's "errors" list rather than silently skipped or faked.

Run:  python3 src/real/research_discovery_real.py
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
CANDIDATES_PATH = os.path.join(PROC, "research_candidates.json")
CHECKPOINT_PATH = os.path.join(PROC, "research_discovery_checkpoint.json")

USER_AGENT = "VersuniDisruptiveInnovationCaseStudy/1.0 (research; contact: case-study-non-commercial)"

# Several focused queries, not one giant query - each maps to a real topic
# from DATA_FABRIC.md's requested coverage list. date filter: 2025+ only,
# per "Prefer 2025+ for fast-moving research."
PUBMED_QUERIES = [
    {"query_id": "pm-portable-cleaner", "topic": "portable air cleaners", "term": "\"portable air cleaner\"[Title/Abstract]"},
    {"query_id": "pm-iaq", "topic": "indoor air quality", "term": "\"indoor air quality\"[Title/Abstract] AND (purifier OR cleaner)[Title/Abstract]"},
    {"query_id": "pm-pm-exposure", "topic": "PM exposure", "term": "\"PM2.5 exposure\"[Title/Abstract] AND indoor[Title/Abstract]"},
    {"query_id": "pm-health-outcomes", "topic": "health outcomes / limits", "term": "\"air purifier\"[Title/Abstract] AND (asthma OR \"health outcome\")[Title/Abstract]"},
    {"query_id": "pm-noise-adherence", "topic": "noise / adherence", "term": "\"air cleaner\"[Title/Abstract] AND (noise OR adherence)[Title/Abstract]"},
    {"query_id": "pm-sensor-trust", "topic": "sensor accuracy / trust", "term": "\"air quality sensor\"[Title/Abstract] AND (accuracy OR validation)[Title/Abstract]"},
    {"query_id": "pm-automation", "topic": "automation", "term": "\"indoor air quality\"[Title/Abstract] AND (automation OR \"automatic control\")[Title/Abstract]"},
    {"query_id": "pm-spatial", "topic": "spatial particle dynamics", "term": "\"particulate matter\"[Title/Abstract] AND (resuspension OR spatial)[Title/Abstract]"},
    {"query_id": "pm-energy-standards", "topic": "energy / standards", "term": "\"air cleaner\"[Title/Abstract] AND (energy OR standard OR CADR)[Title/Abstract]"},
    {"query_id": "pm-ai-adaptive", "topic": "AI / adaptive environmental control", "term": "\"indoor air quality\"[Title/Abstract] AND (\"machine learning\" OR \"artificial intelligence\" OR adaptive)[Title/Abstract]"},
]
CROSSREF_QUERIES = [
    {"query_id": "cr-ai-adaptive", "topic": "AI / adaptive environmental control", "term": "adaptive indoor air quality machine learning control"},
    {"query_id": "cr-energy-standards", "topic": "energy / standards", "term": "portable air cleaner energy standard CADR"},
    {"query_id": "cr-sensor-trust", "topic": "sensor accuracy / trust", "term": "low-cost air quality sensor accuracy validation trust"},
]

ACCEPTED_PMIDS_DOIS_PATH = os.path.join(PROC, "research_index.json")


def _http_get_json(url, headers=None, timeout=20, retries=2):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8")), None
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
            last_err = str(e)
            if attempt < retries:
                time.sleep(1.5)
    return None, last_err


def load_accepted_identifiers():
    with open(ACCEPTED_PMIDS_DOIS_PATH, encoding="utf-8") as fh:
        idx = json.load(fh)
    pmids = {p["pmid"] for p in idx["peer_reviewed_papers"] if p.get("pmid")}
    dois = {p["doi"].lower() for p in idx["peer_reviewed_papers"] if p.get("doi")}
    return pmids, dois


def normalize_title(title):
    return re.sub(r"[^a-z0-9]+", " ", (title or "").lower()).strip()


def discover_pubmed(query, accepted_pmids, errors):
    term = "{} AND 2025:2026[dp]".format(query["term"])
    esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" + urllib.parse.urlencode({
        "db": "pubmed", "term": term, "retmax": "8", "retmode": "json", "datetype": "pdat",
    })
    data, err = _http_get_json(esearch_url)
    if err:
        errors.append({"connector": "pubmed", "query_id": query["query_id"], "error": err})
        return {"query_id": query["query_id"], "connector": "pubmed", "topic": query["topic"], "term": term,
                "n_results": 0, "items": []}
    idlist = data.get("esearchresult", {}).get("idlist", [])
    total = int(data.get("esearchresult", {}).get("count", 0))
    time.sleep(0.4)
    new_ids = [i for i in idlist if i not in accepted_pmids]
    items = []
    if new_ids:
        esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?" + urllib.parse.urlencode({
            "db": "pubmed", "id": ",".join(new_ids), "retmode": "json",
        })
        summ, err2 = _http_get_json(esummary_url)
        time.sleep(0.4)
        if err2:
            errors.append({"connector": "pubmed", "query_id": query["query_id"], "error": err2})
        elif summ:
            result = summ.get("result", {})
            for pmid in new_ids:
                rec = result.get(pmid)
                if not rec:
                    continue
                doi = next((aid["value"] for aid in rec.get("articleids", []) if aid.get("idtype") == "doi"), None)
                items.append({
                    "pmid": pmid, "doi": doi, "title": rec.get("title", "").rstrip("."),
                    "journal": rec.get("fulljournalname") or rec.get("source"),
                    "pubdate": rec.get("pubdate"), "authors": [a.get("name") for a in rec.get("authors", [])][:5],
                })
    return {"query_id": query["query_id"], "connector": "pubmed", "topic": query["topic"], "term": term,
            "n_results": total, "items": items}


def discover_crossref(query, accepted_dois, errors):
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode({
        "query": query["term"], "filter": "from-pub-date:2025-01-01,type:journal-article", "rows": "6",
        "select": "DOI,title,container-title,published,author",
    })
    data, err = _http_get_json(url)
    time.sleep(0.5)
    if err:
        errors.append({"connector": "crossref", "query_id": query["query_id"], "error": err})
        return {"query_id": query["query_id"], "connector": "crossref", "topic": query["topic"], "term": query["term"],
                "n_results": 0, "items": []}
    msg = data.get("message", {})
    total = msg.get("total-results", 0)
    items = []
    for w in msg.get("items", []):
        doi = (w.get("DOI") or "").lower()
        if not doi or doi in accepted_dois:
            continue
        title = (w.get("title") or [""])[0]
        journal = (w.get("container-title") or [""])[0]
        pub = w.get("published", {}).get("date-parts", [[None]])[0]
        items.append({
            "doi": doi, "pmid": None, "title": title, "journal": journal,
            "pubdate": "-".join(str(p) for p in pub if p), "authors": [a.get("family") for a in w.get("author", [])][:5] if w.get("author") else [],
        })
    return {"query_id": query["query_id"], "connector": "crossref", "topic": query["topic"], "term": query["term"],
            "n_results": total, "items": items}


def discover_semantic_scholar(errors):
    """Attempted for completeness (DATA_FABRIC.md lists it as preferred) -
    the public no-key endpoint is real but aggressively rate-limited from
    this environment; the real 429 is recorded honestly, not hidden."""
    url = ("https://api.semanticscholar.org/graph/v1/paper/search?"
          + urllib.parse.urlencode({"query": "indoor air quality sensor trust", "year": "2025-2026", "limit": "5", "fields": "title,year,externalIds"}))
    data, err = _http_get_json(url, retries=1)
    if err:
        errors.append({"connector": "semantic_scholar", "query_id": "s2-sensor-trust", "error": err})
        return []
    return data.get("data", []) if data else []


def dedupe_candidates(items, seen_pmids, seen_dois, seen_titles):
    """Real dedup order: PMID -> DOI -> normalized title. Returns
    (kept, duplicate_count)."""
    kept, dup_count = [], 0
    for it in items:
        pmid = it.get("pmid")
        doi = (it.get("doi") or "").lower() or None
        norm_title = normalize_title(it.get("title"))
        if (pmid and pmid in seen_pmids) or (doi and doi in seen_dois) or (norm_title and norm_title in seen_titles):
            dup_count += 1
            continue
        if pmid:
            seen_pmids.add(pmid)
        if doi:
            seen_dois.add(doi)
        if norm_title:
            seen_titles.add(norm_title)
        kept.append(it)
    return kept, dup_count


def quality_filter(items):
    """Real, simple, transparent admission bar - not a hidden heuristic:
    must have a real title and (PMID or DOI). No abstract-quality scoring
    is invented here."""
    accepted, rejected = [], []
    for it in items:
        if it.get("title") and (it.get("pmid") or it.get("doi")):
            accepted.append(it)
        else:
            rejected.append(it)
    return accepted, rejected


def run_discovery():
    started_at = datetime.now(timezone.utc).isoformat()
    accepted_pmids, accepted_dois = load_accepted_identifiers()
    errors = []
    query_results = []

    for q in PUBMED_QUERIES:
        query_results.append(discover_pubmed(q, accepted_pmids, errors))
    for q in CROSSREF_QUERIES:
        query_results.append(discover_crossref(q, accepted_dois, errors))
    s2_raw = discover_semantic_scholar(errors)

    seen_pmids, seen_dois, seen_titles = set(accepted_pmids), set(accepted_dois), set()
    # also load previously-discovered candidates so reruns don't re-add them
    prior_candidates = []
    if os.path.exists(CANDIDATES_PATH):
        with open(CANDIDATES_PATH, encoding="utf-8") as fh:
            prior_candidates = json.load(fh).get("candidates", [])
    for c in prior_candidates:
        if c.get("pmid"):
            seen_pmids.add(c["pmid"])
        if c.get("doi"):
            seen_dois.add(c["doi"].lower())
        seen_titles.add(normalize_title(c.get("title")))

    all_new_items = [it for qr in query_results for it in qr["items"]]
    admitted, rejected = quality_filter(all_new_items)
    kept, duplicate_count = dedupe_candidates(admitted, seen_pmids, seen_dois, seen_titles)

    now = datetime.now(timezone.utc).isoformat()
    new_candidates = [{
        **it,
        "candidate_id": "CAND-{}".format(abs(hash((it.get("pmid"), it.get("doi"), it.get("title")))) % 100000),
        "status": "CANDIDATE",
        "discovered_at": now,
        "source_family": "RESEARCH",
    } for it in kept]

    all_candidates = prior_candidates + new_candidates
    with open(CANDIDATES_PATH, "w", encoding="utf-8") as fh:
        json.dump({
            "_provenance": ("Real live discovery results from PubMed E-utilities and Crossref's public REST API - "
                           "never auto-promoted to the accepted, reproducible research corpus. Status stays "
                           "CANDIDATE until a human explicitly reviews and promotes an item."),
            "generated_by": "src/real/research_discovery_real.py",
            "candidates": all_candidates,
        }, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    run_manifest = {
        "run_id": "discovery-{}".format(int(datetime.now(timezone.utc).timestamp())),
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "connectors": ["pubmed", "crossref", "semantic_scholar"],
        "query_ids": [q["query_id"] for q in query_results],
        "queries": query_results,
        "new_items": len(new_candidates),
        "updated_items": 0,
        "duplicates": duplicate_count,
        "rejected_items": len(rejected),
        "accepted_candidates": 0,
        "semantic_scholar_raw_hits": len(s2_raw),
        "errors": errors,
        "last_success_checkpoint": now,
    }
    with open(CHECKPOINT_PATH, "w", encoding="utf-8") as fh:
        json.dump(run_manifest, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    return run_manifest, all_candidates


def main():
    manifest, candidates = run_discovery()
    print("Research discovery run {}: {} new candidates, {} duplicates, {} rejected, {} total candidates on file, {} errors".format(
        manifest["run_id"], manifest["new_items"], manifest["duplicates"], manifest["rejected_items"],
        len(candidates), len(manifest["errors"])))
    for e in manifest["errors"]:
        print("  ERROR[{}/{}]: {}".format(e["connector"], e["query_id"], e["error"]))
    return manifest


if __name__ == "__main__":
    main()
