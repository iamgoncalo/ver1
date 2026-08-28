# Versuni — Innovation AI Expert case study

**Live website:** https://versuni-intelligence-machine-production.up.railway.app
(the Versuni Intelligence Machine — deployed from this repository's
`Dockerfile`; run locally with `docker build -t vim . && docker run -p 8000:8000 vim`)

This repository is **private**, per the case brief. To grant an evaluator
read access: GitHub → Settings → Collaborators → *Add people* → enter the
evaluator's GitHub username → role **Read** (or run
`gh api -X PUT repos/iamgoncalo/ver1/collaborators/<username> -f permission=pull`).
The live website above is public and needs no access grant.

This repository contains two things, in this order:

## 1. Mandatory Deliverables/

**This is the official case study submission** for the assessed category
**Air Purification** (residential air purifiers). Everything the brief
requires: real raw data with a provenance manifest, the analysis code and
tests, and the five required deliverables (Insight Pack, Technical Note,
Evidence Table, Data Quality Report, AI Use Log). Start here — see
[`1. Mandatory Deliverables/README.md`](<1. Mandatory Deliverables/README.md>)
for the one-command reproduction and a map of every deliverable.

## 2. Extra Project/

A wider, self-directed exploration built on the same real evidence base —
the **Versuni Intelligence Machine**: a live decision-engine API and a
five-world React/TypeScript web app (Products / Signals / Magic Box /
Criteria / Innovations) that lets you interactively explore the same
reasoning the case answers describe. Supplementary, not required by the
brief, and never a source of truth for the formal case. See
[`2. Extra Project/README.md`](<2. Extra Project/README.md>) to run it.
