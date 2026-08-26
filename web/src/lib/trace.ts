// Real evidence-chain resolution - no fabricated connective tissue. Every
// edge here is a genuine cross-reference that already exists in the real
// processed data (evidence_ids, signal-to-research links, taxonomy
// membership). If a link can't be resolved, it is reported as
// "NO VERIFIED LINK", never invented.

export interface TraceNode {
  id: string;
  kind: "signal" | "trend_doc" | "paper" | "keyword_search" | "unresolved";
  label: string;
  detail: string;
  sourceType?: string;
  credibilityTier?: string;
  url?: string;
  children: TraceNode[];
}

export function traceEvidenceIds(
  evidenceIds: string[],
  ctx: { signals: any[]; research: any }
): TraceNode[] {
  return evidenceIds.map((id) => resolveOne(id, ctx));
}

function resolveOne(id: string, ctx: { signals: any[]; research: any }): TraceNode {
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
  if (id.startsWith("keyword_search:")) {
    return { id, kind: "keyword_search", label: id, detail: "Keyword search across the real review corpus (no polarity gate) - a weaker evidence class than a taxonomy theme.", children: [] };
  }
  return { id, kind: "unresolved", label: id, detail: "NO VERIFIED LINK - unrecognized evidence ID format.", children: [] };
}
