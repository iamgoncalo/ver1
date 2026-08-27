// Real evidence-chain resolution - no fabricated connective tissue. Every
// edge here is a genuine cross-reference that already exists in the real
// processed data (evidence_ids, signal-to-research links, design DNA,
// research tensions, category assumptions, decision-framework themes). If a
// link can't be resolved, it is reported as "NO VERIFIED LINK", never
// invented.

export interface TraceNode {
  id: string;
  kind: "signal" | "trend_doc" | "paper" | "keyword_search" | "tension" | "assumption" | "concept" | "bet" | "info" | "unresolved";
  label: string;
  detail: string;
  sourceType?: string;
  credibilityTier?: string;
  url?: string;
  children: TraceNode[];
}

export interface TraceCtx {
  signals: any[];
  research: any;
  tensions?: any[];
  assumptions?: any[];
  concepts?: any[];
}

export function traceEvidenceIds(evidenceIds: string[], ctx: TraceCtx): TraceNode[] {
  return evidenceIds.map((id) => resolveOne(id, ctx));
}

function resolveOne(id: string, ctx: TraceCtx): TraceNode {
  if (id.startsWith("taxonomy:")) {
    const signalId = id.split(":")[1];
    const signal = ctx.signals.find((s) => s.id === signalId);
    if (!signal) {
      return { id, kind: "unresolved", label: id, detail: "NO VERIFIED LINK - no matching signal found.", children: [] };
    }
    const children: TraceNode[] = (signal.research_support ?? []).map((r: any) =>
      resolveOne(r.research_id, ctx)
    );
    return {
      id, kind: "signal", label: signal.name,
      detail: `${signal.state.replace(/_/g, " ")} · prevalence ${signal.prevalence_pct ?? "n/a"}% · CSAT ${signal.csat_impact ?? "n/a"} · ${signal.n_reviews ?? 0} real reviews`,
      children,
    };
  }
  if (id.startsWith("TC-R")) {
    const research = ctx.research;
    const doc =
      (research?.existing_technical_regulatory ?? []).find((d: any) => d.article_id === id) ??
      (research?.existing_manufacturer_and_industry ?? []).find((d: any) => d.article_id === id);
    if (!doc) return { id, kind: "unresolved", label: id, detail: "NO VERIFIED LINK - document not found in corpus.", children: [] };
    return {
      id, kind: "trend_doc", label: doc.title,
      detail: `${doc.publisher} · ${doc.document_type?.replace(/_/g, " ")} · ${doc.credibility_tier?.replace(/_/g, " ")}`,
      sourceType: doc.document_type, credibilityTier: doc.credibility_tier, url: doc.url,
      children: [],
    };
  }
  if (id.startsWith("RP-")) {
    const paper = (ctx.research?.peer_reviewed_papers ?? []).find((p: any) => p.research_id === id);
    if (!paper) return { id, kind: "unresolved", label: id, detail: "NO VERIFIED LINK - paper not found in corpus.", children: [] };
    return {
      id, kind: "paper", label: paper.title,
      detail: `${paper.journal} · ${paper.year} · DOI ${paper.doi}`,
      url: `https://doi.org/${paper.doi}`, children: [],
    };
  }
  if (id.startsWith("T") && /^T\d+$/.test(id)) {
    return resolveTension(id, ctx);
  }
  if (id.startsWith("A") && /^A\d+$/.test(id)) {
    return resolveAssumption(id, ctx);
  }
  if (id.startsWith("keyword_search:")) {
    return { id, kind: "keyword_search", label: id, detail: "Keyword search across the real review corpus (no polarity gate) - a weaker evidence class than a taxonomy theme.", children: [] };
  }
  return { id, kind: "unresolved", label: id, detail: "NO VERIFIED LINK - unrecognized evidence ID format.", children: [] };
}

function resolveTension(tensionId: string, ctx: TraceCtx): TraceNode {
  const t = (ctx.tensions ?? []).find((x: any) => x.tension_id === tensionId);
  if (!t) return { id: tensionId, kind: "unresolved", label: tensionId, detail: "NO VERIFIED LINK - tension not found in research_tensions.json.", children: [] };
  return {
    id: tensionId, kind: "tension", label: t.name,
    detail: `${t.statement} — design consequence: ${t.design_consequence}`,
    children: (t.evidence_ids ?? []).map((eid: string) => resolveOne(eid, ctx)),
  };
}

function resolveAssumption(assumptionId: string, ctx: TraceCtx): TraceNode {
  const a = (ctx.assumptions ?? []).find((x: any) => x.assumption_id === assumptionId);
  if (!a) return { id: assumptionId, kind: "unresolved", label: assumptionId, detail: "NO VERIFIED LINK - assumption not found in criteria_real.json.", children: [] };
  return {
    id: assumptionId, kind: "assumption", label: a.text,
    detail: `${a.status} · ${a.evidence_for_prevalence} What if: "${a.counterfactual}"`,
    children: (a.real_evidence_that_bears_on_it ?? []).map((eid: string) => resolveOne(eid, ctx)),
  };
}

// A design-DNA slot that is real but not itself a citable document (economic
// exposure, Versuni capability, competitor gap, operator vocabulary) becomes
// an honest "info" leaf rather than a fabricated link.
function infoNode(letter: string, dnaSlot: any): TraceNode {
  const label = { E: "Economic condition", C: "Versuni capability", R: "Competitor gap", O: "Design operator" }[letter] ?? letter;
  return {
    id: `dna:${letter}`, kind: dnaSlot.status === "PRESENT" ? "info" : "unresolved",
    label,
    detail: dnaSlot.status === "PRESENT" ? dnaSlot.detail : `NOT YET EVIDENCED - ${dnaSlot.detail}`,
    children: [],
  };
}

// Forward chain for one concept (a criteria_real.json possibility): walks its
// design DNA out to signals→papers, tensions→papers, and category
// assumptions→papers. Skips F (consumer_friction) since it duplicates S
// (signal) - both point at the same real taxonomy theme.
export function traceConceptChain(concept: any, ctx: TraceCtx): TraceNode {
  const dna = concept.design_dna ?? {};
  const children: TraceNode[] = [];
  if (dna.S?.id) children.push(resolveOne(`taxonomy:${dna.S.id}`, ctx));
  if (dna.T?.status === "PRESENT") (dna.T.ids ?? []).forEach((tid: string) => children.push(resolveOne(tid, ctx)));
  if (dna.A?.status === "PRESENT") (dna.A.ids ?? []).forEach((aid: string) => children.push(resolveOne(aid, ctx)));
  (["E", "C", "R", "O"] as const).forEach((letter) => {
    if (dna[letter]) children.push(infoNode(letter, dna[letter]));
  });
  return {
    id: concept.id, kind: "concept", label: concept.name,
    detail: `${concept.friction_theme_name} × ${concept.operator} · evolution: ${concept.evolution_stage ?? "n/a"} · critic: ${concept.critic_overall ?? "n/a"}`,
    children,
  };
}

// Forward+backward chain for one bet (a decision_framework_real.json score,
// keyed OS-1/OS-2/OS-3): the theme it argues from, every criteria concept
// that shares that same real friction theme (the genuine cross-pipeline
// join - by theme, never by name), and its own flat evidence_ids.
export function traceBetChain(betId: string, betScore: any, theme: string | null, ctx: TraceCtx): TraceNode {
  const matchingConcepts = theme ? (ctx.concepts ?? []).filter((c: any) => c.friction_theme === theme) : [];
  const children: TraceNode[] = traceEvidenceIds(betScore.evidence_ids ?? [], ctx);
  if (matchingConcepts.length > 0) {
    children.push({
      id: `theme:${theme}`, kind: "info",
      label: `Criteria concepts sharing this real friction theme (${theme})`,
      detail: `${matchingConcepts.length} concept(s) in the Magic Box funnel are built on the same real friction theme this bet argues from - joined by theme_id, never by name.`,
      children: matchingConcepts.map((c: any) => traceConceptChain(c, ctx)),
    });
  }
  return {
    id: betId, kind: "bet", label: betScore.name,
    detail: `Real decision-framework candidate · feasibility ${betScore.feasibility_2_5y?.rating ?? "n/a"} · market exposure $${(betScore.economic_value ?? 0).toLocaleString()}`,
    children,
  };
}
