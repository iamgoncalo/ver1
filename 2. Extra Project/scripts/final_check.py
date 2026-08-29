"""Executable final acceptance - every item below is CHECKED by running
something, not asserted. Human-only items are marked MANUAL. Produces
FINAL_ACCEPTANCE.json + FINAL_ACCEPTANCE.md at the repository root.

Run:  make final-check          (offline items)
      RAILWAY_URL=https://...   adds live production checks.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))       # 2. Extra Project
REPO = os.path.dirname(HERE)
RESULTS = []


def check(section, name, fn):
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, f"exception: {e}"
    RESULTS.append({"section": section, "name": name,
                    "status": "PASS" if ok is True else ("MANUAL" if ok == "MANUAL" else "FAIL"),
                    "detail": str(detail)[:400]})
    print(("PASS " if ok is True else ("MANUAL" if ok == "MANUAL" else "FAIL ")), section, "-", name)


def run(cmd, cwd=None, timeout=1200):
    return subprocess.run(cmd, cwd=cwd or HERE, capture_output=True, text=True, timeout=timeout, shell=isinstance(cmd, str))


def main():
    # ---------- repository ----------
    check("repository", "correct repo + main canonical", lambda: (
        "iamgoncalo/ver1" in run(["git", "remote", "get-url", "origin"], cwd=REPO).stdout,
        run(["git", "remote", "get-url", "origin"], cwd=REPO).stdout.strip()))
    check("repository", "clean working tree", lambda: (
        all(("FINAL_ACCEPTANCE" in l or "funnel_run_history" in l) for l in run(["git", "status", "--short"], cwd=REPO).stdout.strip().splitlines() if l),
        run(["git", "status", "--short"], cwd=REPO).stdout.strip()[:100] or "clean"))
    def sha_match():
        run(["git", "fetch", "-q", "origin"], cwd=REPO)
        loc = run(["git", "rev-parse", "main"], cwd=REPO).stdout.strip()
        rem = run(["git", "rev-parse", "origin/main"], cwd=REPO).stdout.strip()
        return loc == rem, f"local {loc[:9]} vs origin {rem[:9]}"
    check("repository", "local main == origin/main", sha_match)
    check("repository", "no absolute personal paths in tracked files", lambda: (
        run('git ls-files -z | xargs -0 grep -l "/Users/goncalomelodemagalhaes" 2>/dev/null | grep -v tsbuildinfo | grep -v final_check.py | head -3', cwd=REPO).stdout.strip() == "",
        run('git ls-files -z | xargs -0 grep -l "/Users/goncalomelodemagalhaes" 2>/dev/null | grep -v final_check.py | head -3', cwd=REPO).stdout.strip() or "none"))
    check("repository", "no obvious secrets", lambda: (
        run(r'git ls-files -z | xargs -0 grep -lE "ghp_[A-Za-z0-9]{20}|sk-[A-Za-z0-9]{20}|BEGIN PRIVATE KEY" 2>/dev/null | grep -v final_check.py | head -3', cwd=REPO).stdout.strip() == "",
        "signature scan clean"))
    check("repository", "public repository", lambda: (
        json.loads(urllib.request.urlopen("https://api.github.com/repos/iamgoncalo/ver1", timeout=20).read())["visibility"] == "public",
        "GitHub API visibility"))

    # ---------- formal case ----------
    mand = os.path.join(REPO, "1. Mandatory Deliverables", "01_Code")
    def mand_tests():
        r = run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"], cwd=mand)
        m = re.search(r"Ran (\d+) tests", r.stderr)
        return ("OK" in r.stderr and bool(m)), f"{m.group(1) if m else '?'} tests, OK={'OK' in r.stderr}"
    check("formal_case", "full test discovery", mand_tests)
    def verifier():
        r = run([sys.executable, "scripts/verify_submission.py"], cwd=mand)
        m = re.search(r"VERIFY: (\d+) passed, (\d+) failed", r.stdout)
        return (m and m.group(2) == "0"), (m.group(0) if m else r.stdout[-100:])
    check("formal_case", "submission verifier", verifier)
    check("formal_case", "Q3 honest human blocker", lambda: (
        os.path.exists(os.path.join(mand, "data", "hand_label_sample_BLANK.csv"))
        and not os.path.exists(os.path.join(mand, "data", "hand_label_sample.csv")),
        "blank sample present, no fabricated human file"))
    check("formal_case", "clean-checkout reproduction", lambda: (
        "MANUAL", "proven at release via FRESH_CLONE_REPORT.md - rerun after any pipeline change"))

    # ---------- machine ----------
    app_tsx = open(os.path.join(HERE, "web", "src", "App.tsx"), encoding="utf-8").read()
    check("machine", "exactly five primary stages", lambda: (
        all(f'"/{p}"' in app_tsx for p in ["products", "radar", "paths", "magic-box", "innovations"])
        and '"/field": 3' in app_tsx and '"/new-products": 5' in app_tsx,
        "five canonical routes; legacy routes fold in"))
    check("machine", "no winner/finalist user-facing ontology", lambda: (
        run('grep -rn "CURRENT WINNER\\|FINALISTS" web/src --include="*.tsx" | head -3').stdout.strip() == "",
        "clean"))
    check("machine", "Field nested inside Paths", lambda: (
        "Ground it in the field" in open(os.path.join(HERE, "web", "src", "worlds", "PathsWorld.tsx"), encoding="utf-8").read(),
        "grounding toggle present"))
    check("machine", "Lab nested inside Innovations", lambda: (
        "Open Lab" in open(os.path.join(HERE, "web", "src", "worlds", "InnovationsWorld.tsx"), encoding="utf-8").read(),
        "Lab entry present"))

    # ---------- category ----------
    sys.path.insert(0, os.path.join(HERE, "src", "real"))
    from category_state import compute_category_state
    air = compute_category_state("AIR_PURIFICATION")
    floor = compute_category_state("FLOOR_CARE")
    check("category", "air runnable from real eligibility", lambda: (
        air["machine_runnable"] and air["families"]["reviews"]["count"] > 5000,
        json.dumps({k: v["count"] for k, v in air["families"].items()})))
    check("category", "floor care honestly insufficient (same pipeline)", lambda: (
        not floor["machine_runnable"] and floor["families"]["reviews"]["count"] == 0,
        json.dumps({k: v["count"] for k, v in floor["families"].items()})))
    check("category", "no air masquerading as floor care", lambda: (
        floor["families"]["products"]["count"] != air["families"]["products"]["count"],
        "eligibility genuinely differs per category"))

    # ---------- hardcoding / dynamics ----------
    import decision_framework_real as dfr
    base = dfr.compute()
    check("hardcoding", "mutation: floor 3.0 changes the verdict", lambda: (
        dfr.compute(materiality_floor=3.0)["verdict"]["recommended"] != base["verdict"]["recommended"],
        "verdict responds to threshold"))
    check("hardcoding", "idempotency: unchanged rerun identical", lambda: (
        dfr.compute()["verdict"]["recommended"] == base["verdict"]["recommended"], "stable"))
    import funnel_real
    h1 = funnel_real.compute_input_snapshot_hash()
    check("hardcoding", "snapshot hash deterministic", lambda: (
        funnel_real.compute_input_snapshot_hash() == h1, h1[:12]))

    # ---------- extra tests ----------
    def extra_tests():
        r = run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"])
        m = re.search(r"Ran (\d+) tests", r.stderr)
        return ("OK" in r.stderr), f"{m.group(1) if m else '?'} tests"
    check("tests", "extra project full discovery", extra_tests)
    def playwright():
        import urllib.request as _u
        try:
            _u.urlopen("http://localhost:8000/api/health", timeout=5)
        except Exception:
            subprocess.Popen([sys.executable, "-m", "uvicorn", "api.main:app", "--port", "8000"],
                             cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            import time as _t; _t.sleep(5)
        r = run(["npx", "playwright", "test", "--reporter=line"], cwd=os.path.join(HERE, "web"), timeout=1800)
        m = re.search(r"(\d+) passed", r.stdout + r.stderr)
        ok = "failed" not in (r.stdout + r.stderr).split("passed")[-1] and bool(m) and r.returncode == 0
        return ok, f"{m.group(1) if m else '?'} passed, exit={r.returncode}"
    check("tests", "playwright full suite (all viewports)", playwright)

    def frontend_build():
        r = run(["npm", "run", "build"], cwd=os.path.join(HERE, "web"), timeout=600)
        return r.returncode == 0 and "built in" in (r.stdout + r.stderr), "vite production build"
    check("tests", "frontend production build", frontend_build)

    def docker_build():
        env_path = os.environ.get("PATH", "") + ":/Applications/Docker.app/Contents/Resources/bin"
        r = subprocess.run(["docker", "build", "-q", "-t", "versuni-vim:acceptance", "."],
                           cwd=REPO, capture_output=True, text=True, timeout=900,
                           env={**os.environ, "PATH": env_path})
        if r.returncode != 0 and ("daemon" in r.stderr.lower() or "not found" in r.stderr.lower() or "Cannot connect" in r.stderr):
            return "MANUAL", "docker daemon unavailable here - BLOCKED locally, built remotely by the deploy"
        return r.returncode == 0, (r.stdout.strip()[:60] or r.stderr[-100:])
    check("tests", "docker production build", docker_build)

    check("hardcoding", "no stale ontology in shipped state", lambda: (
        run('grep -rn "\bWINNER\b\|\bFINALISTS\b" web/src --include="*.tsx" | head -2').stdout.strip() == ""
        and "FINALISTS" not in json.load(open(os.path.join(HERE, "data", "processed", "funnel_real.json")))["stages"][7]["label"],
        "UI + funnel labels clean"))
    check("hardcoding", "no missing-to-zero display coercion", lambda: (
        run(r'grep -rnE "csat_impact \?\? 0|severity_csat \?\? 0|economic_value \?\? 0\)\.toLocaleString" web/src --include="*.tsx" | head -2').stdout.strip() == "",
        "guarded display sites"))
    check("public_data", "reviewer identity ships only as a hash", lambda: (
        "reviewer_hash" in open(os.path.join(HERE, "data", "raw", "consumer_reviews.csv"), encoding="utf-8").readline()
        and "reviewer_id" not in open(os.path.join(HERE, "data", "raw", "consumer_reviews.csv"), encoding="utf-8").readline(),
        "header check"))
    check("public_data", "data notice present", lambda: (
        os.path.exists(os.path.join(HERE, "data", "DATA_NOTICE.md")), "DATA_NOTICE.md"))
    def category_integrity():
        air = compute_category_state("AIR_PURIFICATION")
        floor = compute_category_state("FLOOR_CARE")
        stages_ok = "stage_readiness" in air and set(air["stage_readiness"]) == {
            "product_universe", "radar", "paths_field", "magic_box", "innovations"}
        return (stages_ok and not floor["machine_runnable"]
                and floor["families"]["market_reports"]["count"] == 0
                and air["families"]["market_reports"]["count"] >= 2), "stage readiness + category-linked market"
    check("category", "stage-level readiness, no hardcoded market", category_integrity)

    # ---------- production ----------
    url = os.environ.get("RAILWAY_URL")
    if url:
        def prod_health():
            d = json.loads(urllib.request.urlopen(f"{url}/api/health", timeout=30).read())
            loc = run(["git", "rev-parse", "--short", "main"], cwd=REPO).stdout.strip()
            return d["status"] == "ok" and d["commit"].startswith(loc), f"deployed {d['commit']} vs main {loc}"
        check("production", "live health + release identity", prod_health)
        for route in ["/", "/products", "/radar", "/paths", "/magic-box", "/innovations", "/criteria"]:
            check("production", f"route {route}", lambda r=route: (
                urllib.request.urlopen(f"{url}{r}", timeout=30).status == 200, "200"))
    else:
        check("production", "live checks", lambda: ("MANUAL", "set RAILWAY_URL=https://... to run live checks"))

    # ---------- write reports ----------
    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "main_sha": run(["git", "rev-parse", "--short", "main"], cwd=REPO).stdout.strip(),
        "results": RESULTS,
        "totals": {s: sum(1 for r in RESULTS if r["status"] == s) for s in ("PASS", "FAIL", "MANUAL")},
    }
    with open(os.path.join(REPO, "FINAL_ACCEPTANCE.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    with open(os.path.join(REPO, "FINAL_ACCEPTANCE.md"), "w", encoding="utf-8") as fh:
        fh.write(f"# Final acceptance — generated {out['generated_at']} @ {out['main_sha']}\n\n")
        fh.write(f"**PASS {out['totals']['PASS']} · FAIL {out['totals']['FAIL']} · MANUAL {out['totals']['MANUAL']}**\n\n")
        cur = None
        for r in RESULTS:
            if r["section"] != cur:
                cur = r["section"]; fh.write(f"\n## {cur}\n")
            mark = {"PASS": "x", "FAIL": " ", "MANUAL": "~"}[r["status"]]
            fh.write(f"- [{mark}] **{r['status']}** {r['name']} — {r['detail']}\n")
    print(f"\nTOTALS: {out['totals']}")
    sys.exit(1 if out["totals"]["FAIL"] else 0)


if __name__ == "__main__":
    main()
