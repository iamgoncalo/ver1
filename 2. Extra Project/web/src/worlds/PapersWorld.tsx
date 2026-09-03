import { useEffect, useState } from "react";
import { FocusPanel } from "../components/FocusPanel";
import { CompactInspector, Pill, SectionLabel } from "../components/ui";
import { api } from "../lib/api";

// The research foundations lens - the three papers this machine implements.
// High-visibility by design: three large layer cards (theory -> method ->
// blueprint), each scannable in seconds (one-line summary, a "why this
// matters" line, a "why not / limits" line, all visible without a click),
// with the full honest detail one click away in a row inspector. Content
// comes verbatim from /api/research-papers (authored, provenance-badged) -
// nothing is written here in the component.

interface Paper {
  id: string; layer: number; layer_label: string;
  title: string; subtitle: string; author: string; year: string;
  pages: number; file: string; role: string; one_line: string;
  file_exists: boolean; file_size_mb: number | null;
  what_it_is: string[]; how_it_relates: string[]; why_key: string[]; why_not: string[];
}

const LAYER_COLOR: Record<number, string> = { 1: "var(--accent-blue)", 2: "var(--accent-teal)", 3: "var(--amber)" };
const LAYER_TONE: Record<number, "blue" | "teal" | "amber"> = { 1: "blue", 2: "teal", 3: "amber" };

function Para({ children }: { children: string }) {
  return <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, marginBottom: 10 }}>{children}</p>;
}

function PaperCard({ p, onOpen }: { p: Paper; onOpen: () => void }) {
  const color = LAYER_COLOR[p.layer] ?? "var(--ink-faint)";
  return (
    <div
      onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      style={{
        border: "1px solid var(--line)", borderLeft: `4px solid ${color}`, borderRadius: 14,
        padding: "18px 20px", cursor: "pointer", background: "var(--surface)",
        transition: "box-shadow 140ms, transform 140ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {p.layer}
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.05em", color, fontWeight: 700 }}>{p.layer_label.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>{p.title}</div>
          </div>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", flexShrink: 0, whiteSpace: "nowrap" }}>{p.pages}p · {p.year}</span>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, lineHeight: 1.4, margin: "6px 0 12px 44px" }}>
        {p.one_line}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginLeft: 44 }}>
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--good) 8%, transparent)" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--good)", fontWeight: 700, marginBottom: 3 }}>WHY IT MATTERS</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>{p.why_key[0]}</div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--rose) 8%, transparent)" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--rose)", fontWeight: 700, marginBottom: 3 }}>WHY NOT / LIMITS</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>{p.why_not[0]}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, marginLeft: 44 }} onClick={(e) => e.stopPropagation()}>
        {p.file_exists ? (
          <>
            <a href={p.file} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: `1px solid ${color}`, color, textDecoration: "none" }}>
              Read →
            </a>
            <a href={`${p.file}?download=1`}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)", color: "var(--ink-dim)", textDecoration: "none" }}
              title={p.file_size_mb ? `PDF · ${p.file_size_mb} MB` : "PDF"}>
              Download
            </a>
            <button onClick={onOpen}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer" }}>
              Full detail →
            </button>
          </>
        ) : <Pill tone="rose">File missing</Pill>}
      </div>
    </div>
  );
}

export function PapersWorld() {
  const [doc, setDoc] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [focus, setFocus] = useState<Paper | null>(null);

  useEffect(() => { api.researchPapers().then(setDoc).catch(() => setErr(true)); }, []);

  if (err) return <div style={{ padding: 40, color: "var(--ink-faint)" }}>Papers unavailable — /api/research-papers failed.</div>;
  if (!doc) return <div style={{ padding: 40, color: "var(--ink-faint)" }}>Loading…</div>;

  const papers: Paper[] = doc.papers ?? [];
  const wpf = doc.why_papers_first;

  return (
    <div className="scrollY" style={{ height: "100%", padding: "26px 28px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>Research foundations</SectionLabel>
        <h1 style={{ fontSize: 30, fontFamily: "var(--font-display)", marginBottom: 6 }}>
          The three papers this machine implements
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-dim)", marginBottom: 20, maxWidth: 640 }}>
          Theory → method → blueprint → this running product. Every architectural choice in this app traces to
          one of these three.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
          {papers.map((p) => (
            <PaperCard key={p.id} p={p} onOpen={() => setFocus(p)} />
          ))}
        </div>

        <details style={{ maxWidth: 720 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-faint)", fontWeight: 600 }}>
            Why start from papers, not the GitHub repository? ▸
          </summary>
          <div style={{ marginTop: 10, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12 }}>
            <p style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600, marginBottom: 10 }}>{wpf?.claim}</p>
            {(wpf?.points ?? []).map((pt: any, i: number) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{pt.q}</div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{pt.a}</div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <FocusPanel open={!!focus} onClose={() => setFocus(null)}
        eyebrow={focus ? `Layer ${focus.layer} · ${focus.layer_label} · ${focus.author}, ${focus.year}` : ""}
        title={focus?.title ?? ""}>
        {focus && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic", marginBottom: 12 }}>{focus.subtitle}</p>
            <CompactInspector
              summary={[
                { label: "Role", value: focus.role },
                { label: "Pages", value: String(focus.pages) },
                { label: "Layer", value: `${focus.layer} of 3 — ${focus.layer_label}` },
                { label: "File", value: focus.file_exists ? `PDF · ${focus.file_size_mb} MB` : "Missing" },
              ]}
              defaultTab="what"
              tabs={[
                { key: "what", label: "What it is", content: <div>{focus.what_it_is.map((s, i) => <Para key={i}>{s}</Para>)}</div> },
                { key: "relates", label: "How it relates", content: <div>{focus.how_it_relates.map((s, i) => <Para key={i}>{s}</Para>)}</div> },
                { key: "why", label: "Why it is key", content: <div>{focus.why_key.map((s, i) => <Para key={i}>{s}</Para>)}</div> },
                { key: "why_not", label: "Why not", content: <div>{focus.why_not.map((s, i) => <Para key={i}>{s}</Para>)}</div> },
                {
                  key: "trace", label: "Trace", content: (
                    <p className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                      GET /api/research-papers — src/real/research_papers_authored.py. Descriptions written from the
                      papers' own title pages, abstracts and contents; relation and why-key/why-not readings are the
                      case owner's declared authored judgment. PDF verified on disk at {focus.file}.
                    </p>
                  ),
                },
              ]}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <a href={focus.file} target="_blank" rel="noreferrer"
                style={{ flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--accent-blue)", color: "var(--accent-blue-ink)", textDecoration: "none" }}>
                Read the paper →
              </a>
              <a href={`${focus.file}?download=1`}
                style={{ flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", color: "var(--ink-dim)", textDecoration: "none" }}>
                Download PDF
              </a>
            </div>
          </>
        )}
      </FocusPanel>
    </div>
  );
}
