"""RESEARCH FOUNDATIONS - the three papers this machine implements.

EPISTEMIC CLASS: REFERENCE + JUDGMENT, declared. The three PDFs are real
documents authored by the case owner (verified on disk under
web/public/research-papers/); every description below was written after
reading the papers themselves - title pages, abstracts, one-page
summaries and tables of contents - never invented. The "how it relates"
readings are the case owner's own declared mapping from paper to product,
the same authored-judgment class as home_model_authored.py.

The chain the three papers form, and why the product starts from them:

    THEORY (AFI)  ->  METHOD (FPIM)  ->  BLUEPRINT (the Machine paper)
                                     ->  this running product

Run:  python3 src/real/research_papers_authored.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "processed", "research_papers.json")
PDF_DIR = os.path.join(ROOT, "web", "public", "research-papers")

PAPERS = [
    {
        "id": "afi",
        "layer": 1,
        "layer_label": "Theory",
        "title": "Why Must a Cause of All and a Law of All Be Related in a Universe?",
        "subtitle": "Freedom, Causation, and the General Problem of Navigability: Architecture of Freedom Intelligence",
        "author": "Gonçalo Melo de Magalhães",
        "year": "2026",
        "pages": 128,
        "file": "/research-papers/afi-cause-of-all-law-of-all.pdf",
        "role": "The theoretical foundation",
        "one_line": "Defines innovation itself: Freedom is the structured availability of a possible next state.",
        "why_not": [
            "The Law of Freedom is a declared candidate, not an established law - the paper itself withholds "
            "that word until wider testing.",
            "Of twenty-two stated falsification criteria, only two currently pass cleanly; most pass only "
            "partially, pending experiments the paper names but has not yet run.",
            "Whether Freedom and its law connect, or belong to separate registers entirely, is held open on "
            "purpose - the paper tests the question, it does not settle it.",
        ],
        "what_it_is": [
            "The foundational theory paper of the Architecture of Freedom "
            "Intelligence (AFI). It tests five hypotheses: Freedom is "
            "Passibility (the structured availability of possible "
            "continuation - the candidate Cause of All); the Law of Freedom "
            "(systems follow the lightest path according to their own "
            "perception of it - Freedom = (Perception / Distortion)^a, the "
            "candidate Law of All); the FLRP architecture (reality organised "
            "as Freedom, then Logic, then Relationships, then Physics); their "
            "Mutual Dependency; and Freedom Intelligence (a system improving "
            "its own Freedom over time).",
            "It is offered as a tested hypothesis, not an assumption: held "
            "against 52 independently verified 2025-2026 sources, forty "
            "counterfactual universes, and eight formal models, with "
            "twenty-two falsification criteria stated - two passing cleanly, "
            "most passing only partially, pending experiments named.",
        ],
        "how_it_relates": [
            "This is where the machine's core vocabulary comes from. "
            "\"Possibility\", \"path\", \"freedom created\", the L0-L6 causal "
            "chain ending in freedom, the autonomy ladder toward a home that "
            "removes burdens - all of it operationalises Freedom as path "
            "availability. When the Atlas asks what human burden a mechanism "
            "removes, it is asking, in product terms, which paths become "
            "passible.",
            "The Law of Freedom (perception over distortion) is the machine's "
            "epistemics: the Radar exists to raise perception, and the "
            "honesty rules - typed claims, declared judgments, evidence "
            "states - exist to lower distortion.",
        ],
        "why_key": [
            "Without this layer the machine's questions would be arbitrary. "
            "The theory says WHAT innovation fundamentally is: creating "
            "paths - changing which continuations are available to a "
            "household. Every table in this product inherits that definition.",
        ],
    },
    {
        "id": "fpim",
        "layer": 2,
        "layer_label": "Method",
        "title": "Creating Non-Obvious Innovations",
        "subtitle": "How to Escape the Faster-Horse Trap and Build an Innovation Machine for Products, Systems and Processes",
        "author": "Gonçalo Melo de Magalhães",
        "year": "2026",
        "pages": 97,
        "file": "/research-papers/creating-non-obvious-innovations-fpim.pdf",
        "role": "The operational method",
        "one_line": "A seven-step procedure that turns a faster-horse request into a non-obvious product.",
        "why_not": [
            "Run on six Versuni product families, the method produced four genuine hypotheses and two honest "
            "holds - cases where the candidate already exists among rivals.",
            "Its claim of superiority over TRIZ, jobs-to-be-done and LLM ideation is pre-registered but not "
            "yet run with blind raters - the comparison is designed, not concluded.",
            "It escapes design fixation by procedure, not by removing human judgment - the six dependency "
            "changes still need someone to apply them well.",
        ],
        "what_it_is": [
            "The method paper. It defines the faster-horse problem - people "
            "ask for improvements to the solution they already have - and "
            "shows design fixation measured in humans and, since 2025, inside "
            "generative systems. It then proposes the Freedom Path Innovation "
            "Method (FPIM): a seven-step causal-path procedure - map the use "
            "path and its dependencies; prune with eight counterfactual "
            "probes; fix the abstraction level with two decidable tests; "
            "generate by six dependency changes (substitute, collapse, "
            "prevent, delegate, transfer, limit); write a ledger of what each "
            "candidate frees, blocks and requires; compete on twelve ordinal "
            "dimensions; falsify with the cheapest killing test.",
            "It was run on six verified Versuni product families - four "
            "method-generated hypotheses, two honest holds - and ships with a "
            "pre-registered validation protocol against TRIZ, jobs-to-be-done, "
            "C-K theory and LLM ideation with blind raters.",
        ],
        "how_it_relates": [
            "FPIM is the Magic Box's intellectual ancestor. The operator "
            "vocabulary (remove, invert, predict, transfer...), the "
            "counterfactual questions, the kill-by-rule discipline, the "
            "what-it-frees / what-it-blocks framing, and the falsifier "
            "attached to every innovation candidate are this paper's seven "
            "steps turned into running code and data contracts.",
            "The de-embodiment move the Smart tables teach - \"a capsule is "
            "not coffee; it is a sealed standardised matter module\" - is "
            "FPIM's ladder of desired-state descriptions applied to the "
            "portfolio.",
        ],
        "why_key": [
            "Theory alone does not generate products. This paper is the "
            "bridge: a procedure with stop rules, executable by a person or a "
            "machine, that turns \"Freedom is path availability\" into "
            "concrete non-obvious product hypotheses - and says exactly what "
            "would prove it wrong.",
        ],
    },
    {
        "id": "machine",
        "layer": 3,
        "layer_label": "Blueprint",
        "title": "The Versuni Disruptive Innovation Machine",
        "subtitle": "How Can Great Innovation Never Stop? - Research Paper & Build Blueprint",
        "author": "Gonçalo Melo",
        "year": "2026",
        "pages": 60,
        "file": "/research-papers/versuni-disruptive-innovation-machine.pdf",
        "role": "The build blueprint for this product",
        "one_line": "Scores eight funnel architectures against nine criteria and specifies the winner in full.",
        "why_not": [
            "Its own status line reads \"proposed system\" - a specified blueprint, not yet a proven track "
            "record of shipped disruptive products.",
            "The 93/100 self-assessed quality score is the author's own scoring against the paper's own "
            "criteria, not an independent audit.",
            "The architecture choice rests on a nine-criteria comparison the paper designed itself - a "
            "different criteria set could rank the candidates differently.",
        ],
        "what_it_is": [
            "The blueprint this application implements. It answers one "
            "practical question - how does Versuni build and operate a "
            "machine that finds disruptive opportunities continuously - as a "
            "scored design decision, not a slogan: fifteen innovation methods "
            "compared, eight candidate architectures ranked against nine "
            "weighted criteria, with the loop-funnel hybrid first at 92/100.",
            "It specifies the whole machine in nine moves - Reality, See "
            "(Radar), See where it can move (Paths), Understand (Field), "
            "Escape the existing solution, Create possibilities (Magic Box), "
            "Break/evolve them, Build, Learn from reality again - plus stage "
            "contracts, a source/API registry, KPI families, a red-team test "
            "suite, an AI constitution, and a thirty-day build plan executed "
            "through bounded Claude Code tasks.",
        ],
        "how_it_relates": [
            "This product IS this paper, running. The five worlds in the rail "
            "- Products, Radar, Paths, Magic box, Innovations - are the "
            "paper's funnel stages; the criteria gates, the evidence-first "
            "rules, the graveyard, the lineage on every possibility, and the "
            "daily-loop posture all come from its stage contracts.",
            "Where the paper prescribes (\"every candidate carries full "
            "lineage\", \"kill the weak, evolve the survivors\"), the app's "
            "data structures comply - evidence_ids, parent paths, critic "
            "verdicts, honest holds.",
        ],
        "why_key": [
            "It is the accountability document: every architectural choice in "
            "this product can be checked against the argument that earned it. "
            "If the app ever drifts from the blueprint, one of them is wrong "
            "- and the paper says which tests decide.",
        ],
    },
]

WHY_PAPERS_FIRST = {
    "claim": "The papers are the machine's provenance, not its documentation.",
    "points": [
        {"q": "Why start from research papers?",
         "a": "Because the architecture was earned before it was coded. "
              "Each paper states its claims with evidence, comparisons and "
              "falsifiers; the code implements claims that already survived "
              "argument. Reading the papers first is reading the machine's "
              "own evidence trail to its root."},
        {"q": "Why not start from the GitHub repository?",
         "a": "The repository shows how the machine is built - it cannot say "
              "why it must be built this way. Code asserts; papers argue. A "
              "reader who starts at the code inherits every design decision "
              "as a given; a reader who starts at the papers can check each "
              "decision against the evidence and the stated alternatives, "
              "and knows what would falsify it."},
        {"q": "How do the three fit together?",
         "a": "One chain: the AFI paper defines what innovation is (creating "
              "passible paths); the FPIM paper turns that into a repeatable "
              "procedure with stop rules; the Machine paper turns the "
              "procedure into a continuously running system for Versuni - "
              "and this application is that system, live."},
    ],
}


def build():
    # Verify the PDFs really exist and record their true sizes - the table
    # never claims a file this build cannot serve.
    papers = []
    for p in PAPERS:
        disk = os.path.join(PDF_DIR, os.path.basename(p["file"]))
        entry = dict(p)
        entry["file_exists"] = os.path.exists(disk)
        entry["file_size_mb"] = round(os.path.getsize(disk) / 1e6, 1) if entry["file_exists"] else None
        papers.append(entry)

    doc = {
        "_provenance": (
            "The three research papers behind this machine, verified present "
            "on disk. Descriptions written from the papers' own title pages, "
            "abstracts and contents; the relation/why-key readings are the "
            "case owner's declared authored judgment (same class as "
            "home_model_authored.py). Built by "
            "src/real/research_papers_authored.py."),
        "generated_by": "src/real/research_papers_authored.py",
        "epistemic_type": "REFERENCE",
        "authored_by": "case owner",
        "papers": papers,
        "why_papers_first": WHY_PAPERS_FIRST,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    missing = [p["id"] for p in papers if not p["file_exists"]]
    print("wrote {} ({} papers, {} pages total{})".format(
        OUT, len(papers), sum(p["pages"] for p in papers),
        ", MISSING FILES: " + ", ".join(missing) if missing else ""))
    return doc


if __name__ == "__main__":
    build()
