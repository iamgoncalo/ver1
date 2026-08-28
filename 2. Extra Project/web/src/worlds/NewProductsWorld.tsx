import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel, StatRow, TruthBadge } from "../components/ui";
import { TraceText } from "../components/TraceText";
import { OperatorIcon } from "../components/OperatorIcon";

// New products = the product hypotheses concrete enough to meet reality:
// the machine's current priority-to-test set, each carrying its evidence,
// economics, first experiment and kill criterion. This is NOT the existing
// Versuni portfolio (that library lives in Product universe). Everything
// here is runtime state from /api/magic-box + /api/innovations.
interface Finalist {
  id: string; name: string; friction_theme: string; friction_theme_name: string;
  operator: string; operator_definition: string;
  consumer_pain_csat: number | null; consumer_pain_prevalence_pct: number | null;
  economic_value: number; typical_market_price_usd: number | null;
  feasibility_2_5y: { rating: string; rationale: string; evidence_ids: string[] };
  evidence_ids: string[]; truth_class: string; is_white_space: boolean;
}
interface Verdict {
  recommended: string | null; recommended_name?: string;
  first_experiment?: string; abandon_signal?: string; why?: string;
}
interface Scores { [id: string]: { name: string; usage_context: string; friction: string; evidence_ids?: string[]; assumptions?: string[]; uncertainty?: string[] } }

export function NewProductsWorld({ onGoToWorld }: { onGoToWorld: (n: number) => void }) {
  const [finalists, setFinalists] = useState<Finalist[] | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api.magicBox().then((d: any) => {
      setFinalists(d?.finalists ?? []);
      if (d?.finalists?.length) setOpenId(d.finalists[0].id);
    }).catch(() => setFinalists([]));
    api.innovationsScenario().then((d: any) => { setVerdict(d?.verdict ?? null); setScores(d?.scores ?? {}); }).catch(() => {});
  }, []);

  // The formal case's recommendation is a separate, explicitly-labelled
  // object: it may or may not coincide with the machine's own current
  // priority-to-test hypotheses (today it does not - stated, not smoothed
  // over). Its experiment and kill criterion render in their own band.
  const recScore = verdict?.recommended ? (scores as any)[verdict.recommended] : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 28px", background: "var(--surface)", minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>6 · New products</div>
          <h1 style={{ fontSize: 22, marginTop: 2 }}>Which product hypotheses are ready to meet reality?</h1>
          <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
            {finalists ? `${finalists.length} hypotheses currently priority to test — each passed the gate → evidence → dominance screening; differentiated by architecture, sharing one real friction evidence base.` : "Loading product hypotheses…"}
            {" "}Not the existing portfolio — that lives in <button onClick={() => onGoToWorld(7)} style={{ background: "none", border: "none", padding: 0, color: "var(--accent-blue-ink)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Product universe</button>.
          </p>
        </div>
      </div>

      <div className="scrollY" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
          {finalists?.map((f) => {
            const open = f.id === openId;
            return (
              <div key={f.id}
                style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", background: "var(--bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <OperatorIcon operator={f.operator} size={22} />
                    <h2 style={{ fontSize: 15, lineHeight: 1.3 }}>{f.name}</h2>
                  </div>
                  <TruthBadge truthClass={f.truth_class} />
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 10px" }}>
                  {f.friction_theme_name} × {f.operator.toLowerCase().replace(/_/g, " ")} ({f.operator_definition.toLowerCase().replace(/->/g, "→")})
                </p>
                <StatRow label="Changed problem" value={`${f.consumer_pain_prevalence_pct ?? "—"}% prevalence, ${f.consumer_pain_csat ?? "—"}★ impact`} />
                <StatRow label="Price context" value={f.typical_market_price_usd != null ? `$${f.typical_market_price_usd}` : "no verified price"} />
                <StatRow label="Price-weighted exposure" value={`$${f.economic_value.toLocaleString()}`} />
                <StatRow label="Feasibility (2–5y)" value={f.feasibility_2_5y.rating} />
                <button onClick={() => setOpenId(open ? null : f.id)}
                  style={{ marginTop: 10, width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-dim)", cursor: "pointer", fontSize: 11.5 }}>
                  {open ? "Hide the test plan ▾" : "How would we test it? ▸"}
                </button>
                {open && (
                  <div style={{ marginTop: 10 }}>
                    <SectionLabel>Feasibility grounding</SectionLabel>
                    <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.45 }}>{f.feasibility_2_5y.rationale}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.45 }}>
                      This hypothesis holds until evidence or priority changes — its full evaluation record lives in Innovations.
                    </p>
                    <div style={{ marginTop: 8 }}>
                      <SectionLabel>Evidence</SectionLabel>
                      <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-dim)" }}>{f.evidence_ids.map((e) => e.replace(/_/g, " ").replace(":", ": ")).join(" · ") || "—"} · feasibility: {f.feasibility_2_5y.evidence_ids.join(", ") || "judgment only"}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {verdict?.recommended_name && (
          <div style={{ marginTop: 16, border: "1px solid var(--accent-blue)", borderRadius: 14, padding: "14px 18px", maxWidth: 980 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Pill tone="blue">formal case recommendation</Pill>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{verdict.recommended_name}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: 8 }}>
              The case study's own recommendation, computed live in Innovations. It is a separate, explicitly-labelled
              decision — today it does not coincide with the machine's priority-to-test hypotheses above, and that
              divergence is shown rather than smoothed over.{recScore?.usage_context ? ` Context: ${recScore.usage_context}.` : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div><SectionLabel>First experiment</SectionLabel>
                <p style={{ fontSize: 11.5, color: "var(--ink)", lineHeight: 1.45 }}>{verdict.first_experiment}</p></div>
              <div><SectionLabel>Kill criterion</SectionLabel>
                <p style={{ fontSize: 11.5, color: "var(--rose)", lineHeight: 1.45 }}>{verdict.abandon_signal}</p></div>
            </div>
          </div>
        )}
        {finalists && finalists.length === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No hypothesis currently clears the evidence gates — an honest empty state, not an error.</p>
        )}
        <div style={{ marginTop: 16, maxWidth: 720 }}>
          <p className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5 }}>
            <TraceText text="GET /api/magic-box -> finalists (src/real/magic_box_real.py: gate -> evidence -> Pareto dominance) + GET /api/innovations -> verdict (src/real/decision_framework_real.py: first experiment / kill criterion). Recomputed by every pipeline run - add or remove evidence and this set changes." />
          </p>
        </div>
      </div>
    </div>
  );
}
