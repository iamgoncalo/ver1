import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel } from "../components/ui";
import { TraceText } from "../components/TraceText";
import { FocusPanel } from "../components/FocusPanel";
import { getParam, useUrlParam } from "../lib/urlState";

// Pass 2 epistemic ontology - three explicit object classes, never
// collapsed. Everything here comes from GET /api/funnel ->
// homepage_funnel.paths + path_ontology; nothing is authored in the UI.
interface PathTest {
  type: "FALSIFIER" | "RESOLUTION_QUESTION" | "CHALLENGE_TEST" | "TEST_PROPOSAL";
  derivation: string; text: string; derived_from?: string[];
  source_quotes?: Record<string, string>; verification_state?: string;
  proposed_by?: string; why_not_deterministic?: string;
  current_value?: string; threshold?: string;
}
interface FieldFriction {
  theme: string; theme_name: string; n_reviews: number; detected_share_pct: number | null;
  avg_rating_gap: number | null; mean_rating: number | null; pct_verified_purchase: number | null;
  review_date_range: [string, string] | null;
  classifier_validation: { raw_agreement_pct: number | null; n_labelled: number | null; note: string };
}
interface PathField {
  supporting_evidence?: { research_id: string; title: string; year: number; doi: string; found: string; does_not_establish: string }[];
  friction?: FieldFriction[];
  products?: { id: string; name: string; brand: string; price_usd: number | null; n_theme_reviews: number; theme: string }[];
  economics?: { theme: string; theme_name: string; n_reviews_affected: number; n_affected_with_known_real_price: number; price_weighted_exposure_usd: number; caveat: string | null }[];
  competitors?: { brand: string; n_reviews: number; brand_rate_pct: number; category_rate_pct: number; delta_pp: number; theme: string }[];
  contradictions?: { signal: string; text: string }[];
  unknowns?: { signal: string; text: string }[];
  signals?: string[];
  unavailable: Record<string, string>;
  no_evidence?: string;
}
interface PathData {
  id: string; epistemic_class: "TRAJECTORY" | "TENSION" | "ASSUMPTION_TO_TEST";
  name: string; relation: "TRADE_OFF" | "BELIEF_TO_QUESTION"; from: string; to: string;
  what_opens: string; evidence: string[]; evidence_state: string;
  causal_drivers_verified: boolean; test: PathTest | null; detail: string;
  reclassified_from?: string; reclassification_why?: string;
  field: PathField;
}
interface TrajectoryNote { count: number; statement: string; why: string[]; what_would_create_one: string }
interface PathOntology { classes: Record<string, number>; trajectory_note: TrajectoryNote; method: string }

const CLASS_META: Record<string, { tone: "rose" | "amber" | "teal"; label: string; hint: string }> = {
  TENSION: { tone: "rose", label: "Tension", hint: "credible evidence genuinely pulls in different directions" },
  ASSUMPTION_TO_TEST: { tone: "amber", label: "Assumption to test", hint: "the category behaves as though this were true - we test what changes if it is not" },
  TRAJECTORY: { tone: "teal", label: "Trajectory", hint: "reality verifiably moving - requires temporal + directional evidence" },
};
const TEST_LABEL: Record<string, string> = {
  FALSIFIER: "What would falsify this",
  RESOLUTION_QUESTION: "What evidence would resolve this tension?",
  CHALLENGE_TEST: "What test would challenge this assumption?",
  TEST_PROPOSAL: "Proposed test — machine proposal, unverified",
};

function SourceNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 14, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
        {open ? "▾ source" : "▸ source"}
      </button>
      {open && <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5, marginTop: 6 }}><TraceText text={text} /></p>}
    </div>
  );
}

// Tensions are trade-offs (a two-way pull), assumptions are a belief and
// the question that challenges it - the glyph never asserts movement the
// data does not contain.
function TradeOffGlyph() {
  return (
    <svg width="46" height="12" viewBox="0 0 46 12" style={{ flexShrink: 0 }} aria-hidden>
      <line x1="8" y1="6" x2="38" y2="6" stroke="var(--rose)" strokeWidth="1.6" />
      <polygon points="8,2.5 1,6 8,9.5" fill="var(--rose)" />
      <polygon points="38,2.5 45,6 38,9.5" fill="var(--rose)" />
    </svg>
  );
}
function QuestionGlyph() {
  return (
    <svg width="46" height="12" viewBox="0 0 46 12" style={{ flexShrink: 0 }} aria-hidden>
      <line x1="0" y1="6" x2="34" y2="6" stroke="var(--amber, #b98a2f)" strokeWidth="1.6" strokeDasharray="4 3" />
      <text x="38" y="10" fontSize="11" fill="var(--amber, #b98a2f)">?</text>
    </svg>
  );
}

function PathRow({ p, active, onClick }: { p: PathData; active: boolean; onClick: () => void }) {
  const meta = CLASS_META[p.epistemic_class];
  return (
    <button onClick={onClick} aria-current={active ? "true" : undefined}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
        background: active ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid", borderColor: active ? "var(--accent-blue)" : "var(--line)",
        borderRadius: 12, padding: "10px 14px", transition: "border-color 120ms, background 120ms",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
        <Pill tone={meta.tone === "teal" ? "good" : meta.tone}>{meta.label}</Pill>
        <Pill tone="neutral">{p.evidence_state}</Pill>
        {p.reclassified_from && <Pill tone="neutral">was: tension</Pill>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-dim)", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.from}>{p.from}</span>
        {p.relation === "TRADE_OFF" ? <TradeOffGlyph /> : <QuestionGlyph />}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.to}>{p.to}</span>
      </div>
    </button>
  );
}

function FieldBlock({ field, onOpenReviews, navigate }: {
  field: PathField;
  onOpenReviews: (theme: string, themeName: string) => void;
  navigate: (n: number, params?: Record<string, string>) => void;
}) {
  const [showUnavailable, setShowUnavailable] = useState(false);
  if (field.no_evidence) {
    return (
      <p style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>{field.no_evidence}</p>
    );
  }
  return (
    <div data-testid="path-field">
      {field.supporting_evidence && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>This path's own evidence</SectionLabel>
          {field.supporting_evidence.map((c) => (
            <div key={c.research_id} style={{ marginBottom: 8 }}>
              <button onClick={() => navigate(2, { paper: c.research_id })}
                style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontSize: 11.5, lineHeight: 1.45 }}>
                <b className="mono">{c.research_id}</b> · {c.title} ({c.year}) →
              </button>
              <p style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.45 }}>{c.found}</p>
              <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4 }}>Does not establish: {c.does_not_establish}</p>
            </div>
          ))}
        </div>
      )}
      {field.friction && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Friction — click for the real reviews</SectionLabel>
          {field.friction.map((f) => (
            <button key={f.theme} data-testid="field-friction" onClick={() => onOpenReviews(f.theme, f.theme_name)}
              style={{ display: "block", width: "100%", background: "none", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", textAlign: "left", cursor: "pointer", marginBottom: 6, color: "var(--ink)" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{f.theme_name} →</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 2 }}>
                {f.n_reviews.toLocaleString()} real reviews · detected share {f.detected_share_pct}% (lower bound) ·
                rating gap {f.avg_rating_gap != null ? `${f.avg_rating_gap}★` : "not measured"} · {f.pct_verified_purchase}% verified purchase
              </div>
            </button>
          ))}
        </div>
      )}
      {field.products && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Products carrying this friction</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {field.products.slice(0, 6).map((pr) => (
              <button key={pr.id + pr.theme} onClick={() => navigate(1, { product: pr.id })}
                title={`${pr.name} — ${pr.n_theme_reviews} reviews on this theme`}
                style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", color: "var(--ink-dim)" }}>
                {pr.brand} →
              </button>
            ))}
          </div>
        </div>
      )}
      {field.economics && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Economics — this friction's own exposure</SectionLabel>
          {field.economics.map((e) => (
            <div key={e.theme} style={{ fontSize: 11.5, color: "var(--ink-dim)", marginBottom: 4 }}>
              {e.theme_name}: <span className="mono">${e.price_weighted_exposure_usd.toLocaleString()}</span>
              {" "}across {e.n_affected_with_known_real_price} priced of {e.n_reviews_affected} affected reviews
              <span title={e.caveat ?? ""} style={{ cursor: "help", color: "var(--ink-faint)" }}> (relative indicator, not revenue ⓘ)</span>
            </div>
          ))}
        </div>
      )}
      {field.competitors && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Competitors measurably weaker here</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {field.competitors.slice(0, 6).map((c) => (
              <button key={c.brand + c.theme} onClick={() => navigate(2, { rival: c.brand })}
                title={`${c.brand_rate_pct}% vs category ${c.category_rate_pct}% (+${c.delta_pp}pp)`}
                style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", color: "var(--rose)" }}>
                {c.brand} +{c.delta_pp}pp →
              </button>
            ))}
          </div>
        </div>
      )}
      {field.contradictions && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Contradictions</SectionLabel>
          {field.contradictions.map((c) => (
            <button key={c.signal} onClick={() => navigate(2, { signal: c.signal })}
              style={{ display: "block", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 11, color: "var(--rose)", lineHeight: 1.45, marginBottom: 4 }}>
              {c.text} →
            </button>
          ))}
        </div>
      )}
      {field.unknowns && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Unknowns</SectionLabel>
          {field.unknowns.map((u) => (
            <button key={u.signal} onClick={() => navigate(2, { signal: u.signal })}
              style={{ display: "block", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.45, marginBottom: 4 }}>
              {u.text} →
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setShowUnavailable((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
        {showUnavailable ? "▾" : "▸"} what this field honestly cannot say
      </button>
      {showUnavailable && Object.entries(field.unavailable).map(([k, v]) => (
        <p key={k} style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.45, marginTop: 4 }}>
          <b>{k.replace(/_/g, " ")}:</b> {v}
        </p>
      ))}
    </div>
  );
}

export function PathsWorld({ onGoToWorld }: { onGoToWorld: (n: number, params?: Record<string, string>) => void }) {
  const [paths, setPaths] = useState<PathData[] | null>(null);
  const [ontology, setOntology] = useState<PathOntology | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  const [reviewFocus, setReviewFocus] = useState<{ theme: string; themeName: string } | null>(null);
  const [reviews, setReviews] = useState<any>(null);

  useEffect(() => {
    api.funnel().then((d: any) => {
      const ps = d?.homepage_funnel?.paths ?? [];
      setPaths(ps);
      setOntology(d?.homepage_funnel?.path_ontology ?? null);
      // Deep link: /paths?path=<id> overrides the default first-path focus.
      const wanted = getParam("path");
      const hit = wanted ? ps.find((p: PathData) => p.id === wanted) : null;
      if (hit) setFocusId(hit.id);
      else if (ps.length) setFocusId(ps[0].id);
    }).catch(() => setPaths([]));
  }, []);

  // Keep the URL a refresh-safe record of the focused path.
  useUrlParam("path", focusId);

  useEffect(() => {
    if (!reviewFocus) { setReviews(null); return; }
    fetch(`/api/reviews?theme=${encodeURIComponent(reviewFocus.theme)}&limit=12`)
      .then((r) => r.json()).then(setReviews).catch(() => setReviews(null));
  }, [reviewFocus]);

  const focus = useMemo(() => paths?.find((p) => p.id === focusId) ?? null, [paths, focusId]);
  const tensions = paths?.filter((p) => p.epistemic_class === "TENSION") ?? [];
  const assumptions = paths?.filter((p) => p.epistemic_class === "ASSUMPTION_TO_TEST") ?? [];
  const trajectories = paths?.filter((p) => p.epistemic_class === "TRAJECTORY") ?? [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 28px", background: "var(--surface)", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>3 · Paths</div>
        <h1 style={{ fontSize: 22, marginTop: 2 }}>Where is reality actually moving?</h1>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
          {paths && ontology
            ? `${trajectories.length} verified trajectories · ${tensions.length} open tensions · ${assumptions.length} assumptions worth challenging.`
            : "Loading the paths…"}
        </p>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 20, minHeight: 0 }}>
        <div className="scrollY" style={{ minHeight: 0, paddingRight: 6 }}>
          <SectionLabel>Trajectories — where reality is verifiably moving · {trajectories.length}</SectionLabel>
          {trajectories.length === 0 && ontology && (
            <div data-testid="trajectory-empty" style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{ontology.trajectory_note.statement}</p>
              <button onClick={() => setTrajectoryOpen((v) => !v)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, color: "var(--accent-blue-ink)", marginTop: 4 }}>
                {trajectoryOpen ? "▾ why, exactly" : "▸ why, exactly"}
              </button>
              {trajectoryOpen && (
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {ontology.trajectory_note.why.map((w, i) => (
                    <li key={i} style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>{w}</li>
                  ))}
                  <li style={{ fontSize: 10.5, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 4 }}>
                    <b>What would create one:</b> {ontology.trajectory_note.what_would_create_one}
                  </li>
                </ul>
              )}
            </div>
          )}
          {trajectories.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
              {trajectories.map((p) => <PathRow key={p.id} p={p} active={p.id === focusId} onClick={() => setFocusId(p.id)} />)}
            </div>
          )}

          <SectionLabel>Open tensions — evidence pulls both ways · {tensions.length}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
            {tensions.map((p) => <PathRow key={p.id} p={p} active={p.id === focusId} onClick={() => setFocusId(p.id)} />)}
          </div>

          <SectionLabel>Assumptions worth challenging · {assumptions.length}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {assumptions.map((p) => <PathRow key={p.id} p={p} active={p.id === focusId} onClick={() => setFocusId(p.id)} />)}
          </div>
          {paths && paths.length === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No paths available — rerun the pipeline.</p>
          )}
        </div>

        <div className="scrollY" style={{ minHeight: 0, border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", background: "var(--bg)" }}>
          {focus ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Pill tone={CLASS_META[focus.epistemic_class].tone === "teal" ? "good" : CLASS_META[focus.epistemic_class].tone}>{CLASS_META[focus.epistemic_class].label}</Pill>
                <Pill tone="neutral">{focus.evidence_state}</Pill>
                <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{CLASS_META[focus.epistemic_class].hint}</span>
              </div>
              {focus.reclassification_why && (
                <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.45 }}>
                  Reclassified from tension: {focus.reclassification_why}
                </p>
              )}
              <h2 style={{ fontSize: 16, margin: "10px 0 4px" }}>
                {focus.relation === "TRADE_OFF" ? `${focus.from} ⇄ ${focus.to}` : focus.from}
              </h2>
              {focus.relation === "BELIEF_TO_QUESTION" && (
                <p style={{ fontSize: 12, color: "var(--amber, #b98a2f)", lineHeight: 1.5, marginBottom: 4 }}>
                  Counterfactual question (not observed movement): {focus.to}
                </p>
              )}
              {!focus.causal_drivers_verified && (
                <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
                  No verified causal mechanism — evidence reported, driver unproven.
                </p>
              )}
              <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginBottom: 12 }}>{focus.detail}</p>

              <div style={{ marginTop: 2 }}>
                <SectionLabel>Consequences</SectionLabel>
                <p style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}><b>Opens:</b> {focus.what_opens}</p>
              </div>

              {focus.test && (
                <div style={{ marginTop: 12 }} data-testid="path-test">
                  <SectionLabel>{TEST_LABEL[focus.test.type] ?? "Test"}</SectionLabel>
                  <p style={{ fontSize: 12, color: focus.test.type === "TEST_PROPOSAL" ? "var(--ink-dim)" : "var(--rose)", lineHeight: 1.5 }}>{focus.test.text}</p>
                  {focus.test.current_value && (
                    <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4 }}>
                      now: {focus.test.current_value} · trips at: {focus.test.threshold}
                    </p>
                  )}
                  {focus.test.type === "TEST_PROPOSAL" && (
                    <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.45 }}>
                      {focus.test.proposed_by} — {focus.test.why_not_deterministic}
                    </p>
                  )}
                  {focus.test.derived_from && focus.test.derivation === "DETERMINISTIC_FROM_STORED_FIELDS" && (
                    <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                      derived from: {focus.test.derived_from.join(" · ")}
                    </p>
                  )}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <SectionLabel>Evidence (RP = peer-reviewed paper)</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {focus.evidence.length ? focus.evidence.map((e) => (
                    <button key={e} onClick={() => e.startsWith("RP-") && onGoToWorld(2, { paper: e })}
                      className="mono"
                      style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", cursor: e.startsWith("RP-") ? "pointer" : "default", color: "var(--ink-dim)" }}>
                      {e}{e.startsWith("RP-") ? " →" : ""}
                    </button>
                  )) : <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>No direct evidence ids — treat as exploratory.</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => onGoToWorld(2, { lens: "research" })} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", fontSize: 12 }}>← Radar evidence</button>
                <button onClick={() => setFieldOpen((v) => !v)} aria-expanded={fieldOpen}
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--accent-blue)", background: fieldOpen ? "var(--surface-2)" : "transparent", color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {fieldOpen ? "Hide field grounding ▾" : "Ground it in the field ▸"}
                </button>
              </div>

              {fieldOpen && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <SectionLabel>Field — what this path means in the real world</SectionLabel>
                  <FieldBlock field={focus.field} navigate={onGoToWorld}
                    onOpenReviews={(theme, themeName) => setReviewFocus({ theme, themeName })} />
                </div>
              )}
              <SourceNote text="GET /api/funnel -> homepage_funnel.paths + path_ontology - built by src/real/funnel_real.py (epistemic classes cross-checked against signals_real.json) with per-path field grounding from src/real/field_grounding_real.py. Nothing here is authored in the interface." />
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Select a path to inspect its full anatomy.</p>
          )}
        </div>
      </div>

      <FocusPanel open={!!reviewFocus} onClose={() => setReviewFocus(null)}
        eyebrow="Real reviews behind this friction" title={reviewFocus?.themeName ?? ""}>
        {reviewFocus && (
          <>
            {reviews ? (
              <>
                <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                  {reviews.n_total?.toLocaleString?.() ?? reviews.n_total} trusted, de-duplicated real reviews carry this theme —
                  the {reviews.reviews?.length} below are excerpts of real Amazon.com customer text, never paraphrased.
                </p>
                {(reviews.reviews ?? []).map((r: any) => (
                  <div key={r.review_id} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.title || "(untitled review)"}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", flexShrink: 0 }}>
                        ★{r.rating} · {r.review_date}{r.verified_purchase === "true" ? " · verified" : ""}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 2 }}>{r.excerpt}</p>
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{r.review_id} · {r.product_sku}</span>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading real reviews…</p>
            )}
          </>
        )}
      </FocusPanel>
    </div>
  );
}
