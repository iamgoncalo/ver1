# PROJECT 1 — PERMANENT CHECKLIST

## 0. PRE-TASK

[ ] Read CLAUDE.md.
[ ] Read STATUS.md.
[ ] Read CHECKLIST.md.
[ ] Read relevant CASE_REQUIREMENTS.yaml entries.
[ ] Confirm current Git branch and HEAD.
[ ] State exactly what this task is allowed to change.
[ ] State exactly what this task must NOT change.
[ ] Confirm no unresolved higher-priority blocker is being hidden.
[ ] Record baseline tests relevant to this task.


## 1. BRIEF INTEGRITY

[ ] One product category remains the assessed category.
[ ] Q1–Q6 remain explicitly addressed.
[ ] Exactly three final attractiveness dimensions remain:
    Consumer Pain
    Economic Value
    2–5 Year Feasibility.
[ ] One current recommendation exists.
[ ] Two serious alternatives/rejections exist.
[ ] First experiment exists.
[ ] Kill criterion exists.
[ ] Single most-sensitive assumption exists.
[ ] Current decision can change when evidence/assumption changes.
[ ] No hardcoded winner exists.
[ ] No arbitrary hidden weighted master score exists.


## 2. DATA TRUTH

[ ] Final consumer evidence is real.
[ ] Final research/trend evidence is real.
[ ] Final market evidence is real.
[ ] Product specifications shown as facts have source provenance.
[ ] Competitor specifications shown as facts have source provenance.
[ ] Source URLs resolve or archived copies exist where required.
[ ] Retrieval dates exist.
[ ] Manifest coverage is complete.
[ ] Raw evidence is frozen/immutable for submission mode.
[ ] Synthetic data exists only as explicitly isolated test fixtures.
[ ] Synthetic final-evidence count = 0.
[ ] No placeholder URLs exist in final evidence.
[ ] No fabricated sources exist.
[ ] Missing values remain missing rather than guessed.


## 3. CONSUMER / HUMAN VALIDATION

[ ] Review corpus is the real approved corpus.
[ ] Product inclusion/exclusion logic is reproducible.
[ ] Taxonomy derives from real review text.
[ ] Real raw examples exist for every claimed theme.
[ ] Prevalence is calculated from current rows.
[ ] Satisfaction relationship is calculated from current rows.
[ ] Human-validation sample contains real reviews.
[ ] Human labels were entered by human_user.
[ ] Automated labels were hidden before human judgment.
[ ] No AI-generated label is represented as human.
[ ] Agreement metrics are calculated only after human labels exist.
[ ] Classifier was not tuned against the final validation sample.
[ ] If it was tuned, a new untouched validation sample was created.


## 4. DATA QUALITY

[ ] Every reported defect actually exists in real data.
[ ] Detector code exists independently of remediation.
[ ] Representative affected rows can be opened.
[ ] Before/after effect exists for at least one real defect.
[ ] No planted synthetic defect appears as real evidence.
[ ] Zero detected anomalies are reported honestly where applicable.


## 5. MARKET / ECONOMIC / WTP

[ ] Q5 uses two genuine published disagreeing sources.
[ ] Both source copies/archives are retained.
[ ] Exact locations are recorded.
[ ] Scope/geography/time differences are explained.
[ ] Primary source choice is explicit.
[ ] Alternative market scenario is executable.
[ ] WTP is never claimed without direct evidence.
[ ] WTP proxy is explicitly labelled proxy.
[ ] Observed price is not presented as WTP.
[ ] Price exposure is not presented as revenue.
[ ] TCO is not presented as WTP.
[ ] Economic Value terminology matches what the metric actually measures.


## 6. EVIDENCE TRACEABILITY

[ ] Every final quantitative claim has an evidence-table row.
[ ] Every evidence path exists.
[ ] Source location is specific.
[ ] Transformation is documented.
[ ] Code reference exists.
[ ] Output reference exists.
[ ] Claim → output → transformation → code → raw → source works.
[ ] At least 10 sampled traces pass.
[ ] No final claim traces to synthetic fixture data.


## 7. DECISION ENGINE

[ ] Opportunity profiles are recomputed from current evidence.
[ ] Candidate ordering cannot determine winner.
[ ] Winner is not a literal hardcoded ID.
[ ] Decision priority is validated.
[ ] Invalid priority raises a clear error.
[ ] Pareto/dominance status is computed.
[ ] Business judgment is labelled as judgment, not measurement.
[ ] Key trade-off is visible.
[ ] Flip assumption is runnable.
[ ] Opposite assumption flips winner where claimed.
[ ] Scenario execution cannot mutate frozen evidence.


## 8. PRODUCTS

[ ] Every visible Versuni product is verified.
[ ] Exact SKU/model identity is verified.
[ ] Regional variants are not conflated.
[ ] Official source is retained.
[ ] Official image provenance exists where used.
[ ] CADR is sourced.
[ ] Room coverage is sourced.
[ ] Noise is sourced where shown.
[ ] Power is sourced where shown.
[ ] Filter architecture is sourced.
[ ] Sensors are sourced.
[ ] Connectivity/app claims are sourced.
[ ] AI/adaptive claims are sourced.
[ ] Missing specifications are not invented.
[ ] Architecture cluster is rule-based.
[ ] Performance cluster is transparent.
[ ] Consumer-context cluster is defensible.
[ ] Intelligence cluster has documented rules.
[ ] Generation/evolution relationship is evidence-backed.


## 9. SIGNALS / RESEARCH DISTILLATION

[ ] Raw source → Evidence Card works.
[ ] Evidence Card → Signal works.
[ ] Signal → Pattern works.
[ ] Pattern → Possibility works.
[ ] Every compression step is reversible.
[ ] Signal is not created from vendor marketing alone where independence is required.
[ ] Scientific evidence is not overstated.
[ ] Pollutant reduction is not represented as clinical outcome without evidence.
[ ] "Emerging" has evidence beyond popularity.
[ ] Contradictory evidence remains visible.
[ ] Distillation is short enough to understand rapidly.


## 10. COMPETITORS

[ ] Every competitor shown has relevant verified evidence.
[ ] Manufacturer claim is visually/structurally distinguishable from independent evidence.
[ ] Competitive-map axes are documented.
[ ] No arbitrary chart placement is presented as analytical truth.
[ ] White space requires consumer need + enabler + competitor gap.
[ ] Empty chart space alone is never labelled white space.


## 11. MAGIC BOX

[ ] Every possibility stores its derivation.
[ ] Every possibility distinguishes evidence from design transformation.
[ ] Design operators never masquerade as evidence.
[ ] Generation uses actual current inputs.
[ ] Duplicate/nonsensical ideas are filtered.
[ ] Critic evaluates surviving possibilities.
[ ] Contradicting evidence is preserved.
[ ] Physical/logical feasibility is challenged.
[ ] Why Versuni? is answered.
[ ] Why now? is answered.
[ ] Missing evidence is explicit.
[ ] Cheap first test exists where appropriate.
[ ] Kill reason exists for rejected ideas.
[ ] Graveyard is preserved.
[ ] Funnel counts are generated, not hardcoded.
[ ] No arbitrary "innovation score" exists.


## 12. AGENTIC AI

[ ] Agents have narrow named responsibilities.
[ ] Agents return structured outputs.
[ ] Agents do not decide truth by voting.
[ ] Portfolio Agent cannot invent specifications.
[ ] Signal Agent cannot upgrade weak evidence silently.
[ ] Rival Agent separates claim vs independent validation.
[ ] Pattern Agent records connected evidence.
[ ] Magic Box Agent records derivations.
[ ] Critic Agent can reject ideas.
[ ] Orchestrator does not bypass evidence gates.
[ ] Agent failure cannot silently become PASS.


## 13. LLM

[ ] Core website works without LLM/API.
[ ] API key is server-side only.
[ ] No browser-exposed secret exists.
[ ] LLM accesses allowlisted tools.
[ ] LLM does not receive unnecessary entire raw corpora.
[ ] Factual LLM output cites internal evidence IDs.
[ ] Observed / Derived / Inference / Possibility are distinguished.
[ ] Missing evidence becomes HYPOTHESIS.
[ ] Prompt injection from retrieved content is treated as untrusted input.
[ ] LLM cannot mutate frozen evidence.
[ ] LLM cannot fill human labels.
[ ] LLM cannot invent product/market/paper facts.


## 14. VISUAL EXPERIENCE

[ ] Experience is visually understandable within ~2 seconds.
[ ] Current process stage is obvious.
[ ] OBSERVE → DISTILL → COMPARE → CREATE → DECIDE is always legible.
[ ] Products → Signals → Rivals → Magic Box → Innovations is obvious.
[ ] One dominant visual idea exists per primary world.
[ ] Primary worlds do not look like BI dashboards.
[ ] Primary worlds do not look like generic AI templates.
[ ] No traditional sidebar dominates the experience.
[ ] No unnecessary explanatory paragraph exists.
[ ] Primary screen uses progressive disclosure.
[ ] Hover reveals useful intelligence.
[ ] Selected/focus state reduces surrounding noise.
[ ] Product imagery is legitimate.
[ ] Versuni logo is official and provenance-recorded.
[ ] Pokémon inspiration is interaction/discovery, not imitation.
[ ] Netflix inspiration is focus/navigation, not imitation.


## 15. NO-SCROLL / NAVIGATION

[ ] 1440×900: no primary-world vertical scroll.
[ ] 1366×768: no primary-world vertical scroll.
[ ] 1280×720: no primary-world vertical scroll.
[ ] No primary-world horizontal scroll.
[ ] 1 → Products.
[ ] 2 → Signals.
[ ] 3 → Rivals.
[ ] 4 → Magic Box.
[ ] 5 → Innovations.
[ ] Left/right navigation works.
[ ] Enter opens.
[ ] Escape closes/goes back.
[ ] Space opens Ask.
[ ] Visible focus states exist.
[ ] prefers-reduced-motion works.


## 16. UI STATES

[ ] Default state works.
[ ] Hover state works.
[ ] Focus state works.
[ ] Selected state works.
[ ] Loading state works.
[ ] Empty state works.
[ ] Error state works.
[ ] Disabled state works where relevant.
[ ] No console errors.
[ ] No broken local assets.
[ ] No stale frontend field references.


## 17. ANALYST MODE

[ ] Detailed control room remains accessible.
[ ] Raw reviews can be opened.
[ ] Real defects can be inspected.
[ ] Human-labelling workflow remains blinded.
[ ] Q5 sources can be opened.
[ ] Scenario Lab works.
[ ] Evidence trace works.
[ ] System health is visible.
[ ] Analyst mode and executive mode use the same analytical functions.


## 18. REPRODUCIBILITY

[ ] make refresh has explicit network semantics.
[ ] make all is submission-safe and offline.
[ ] make test passes.
[ ] make verify passes.
[ ] make live-check passes.
[ ] make app works.
[ ] Frozen inputs are not regenerated during make all.
[ ] Random seeds are fixed where relevant.
[ ] Manifest integrity is based on content hashes.
[ ] Volatile timestamps do not create false integrity failures.
[ ] Generated outputs can be cleanly rebuilt.


## 19. TESTING

[ ] Analytical tests pass.
[ ] Verification tests pass.
[ ] API tests pass where applicable.
[ ] Frontend unit tests pass.
[ ] Playwright passes.
[ ] Negative tests exist.
[ ] Hardcoded-winner regression test exists.
[ ] Scenario non-mutation test exists.
[ ] Human-label leakage test exists.
[ ] Synthetic-final-evidence test exists.
[ ] Claim-trace test exists.
[ ] Offline-build test exists.
[ ] Browser opened manually after automated tests.


## 20. VISUAL QA

[ ] Screenshot: Products.
[ ] Screenshot: Signals.
[ ] Screenshot: Rivals.
[ ] Screenshot: Magic Box.
[ ] Screenshot: Innovations.
[ ] Screenshot: focused product.
[ ] Screenshot: focused signal.
[ ] Screenshot: Magic Box possibility.
[ ] Screenshot: Ask overlay.
[ ] Review screenshots at 1280×720.
[ ] Review screenshots at 1440×900.
[ ] No clipped text.
[ ] No unreadably small type.
[ ] No meaningless empty space.
[ ] No crowded screen.
[ ] No visual element whose meaning cannot be explained.


## 21. LIVE INTERVIEW

[ ] 5-minute recommendation can be delivered without slides.
[ ] Open real raw review in seconds.
[ ] Run actual defect detector.
[ ] Trace arbitrary claim.
[ ] Open both Q5 sources.
[ ] Switch market scenario.
[ ] Exclude product.
[ ] Exclude source.
[ ] Change threshold.
[ ] Change sensitive decision assumption.
[ ] Predict direction BEFORE rerun.
[ ] Rerun.
[ ] Explain why recommendation changed/did not change.
[ ] Show rejected AI suggestion from real AI log.
[ ] Website can fail gracefully if external LLM/API is unavailable.


## 22. SECURITY

[ ] No API keys committed.
[ ] .env is ignored.
[ ] .env.example contains no secret.
[ ] LLM key remains backend-only.
[ ] No destructive API available from chat/LLM.
[ ] Frozen evidence is read-only to scenarios/LLM.
[ ] Retrieved external content is treated as untrusted.
[ ] Output schemas are validated.
[ ] No personal reviewer/customer data is unnecessarily exposed.


## 23. GITHUB / RELEASE

[ ] Working tree state understood.
[ ] No accidental generated junk.
[ ] Meaningful local commit exists.
[ ] Git history not rewritten.
[ ] CI workflow exists.
[ ] CI uses frozen inputs.
[ ] CI does not require private runtime secrets for core verification.
[ ] Repository is PRIVATE before final push/submission.
[ ] Submission access is configured.
[ ] Fresh clone succeeds.
[ ] make all succeeds from fresh clone.
[ ] make test succeeds from fresh clone.
[ ] make verify succeeds from fresh clone.
[ ] make app succeeds from fresh clone.


## 24. POST-TASK GATE

[ ] Run all tests relevant to the task.
[ ] Run make verify if analytical/evidence/release behavior changed.
[ ] Open browser if UI changed.
[ ] Inspect actual output, not only tests.
[ ] Run at least one negative/adversarial check.
[ ] Run an independent reviewer for major tasks.
[ ] Fix legitimate findings.
[ ] Re-run checks.
[ ] Update STATUS.md using actual results.
[ ] Update CASE_REQUIREMENTS.yaml if requirement state changed.
[ ] Record Git commit/dirty state.
[ ] Explicitly state remaining blockers.
[ ] Explicitly state ONE next action.
[ ] DO NOT begin the next major stage automatically.
