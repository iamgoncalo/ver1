import { useEffect, useState } from "react";
import { FocusPanel } from "../components/FocusPanel";
import { CompactInspector, Pill, SectionLabel } from "../components/ui";
import { api } from "../lib/api";

// The research foundations lens - the three papers this machine implements,
// shown as a compact table (one row = one paper) with read/download actions
// and a row inspector. Descriptions come verbatim from
// /api/research-papers (authored, provenance-badged) - nothing is written
// here in the component.

interface Paper {
  id: string; layer: number; layer_label: string;
  title: string; subtitle: string; author: string; year: string;
  pages: number; file: string; role: string;
  file_exists: boolean; file_size_mb: number | null;
  what_it_is: string[]; how_it_relates: string[]; why_key: string[];
}

const LAYER_TONE: Record<number, "blue" | "teal" | "amber"> = { 1: "blue", 2: "teal", 3: "amber" };

function Para({ children }: { children: string }) {
  return <p style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, marginBottom: 10 }}>{children}</p>;
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

  const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid var(--line)", fontSize: 12.5, verticalAlign: "top" };
  const th: React.CSSProperties = { ...cell, fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", color: "var(--ink-faint)", position: "sticky", top: 0, background: "var(--surface)" };

  return (
    <div className="scrollY" style={{ height: "100%", padding: "22px 28px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionLabel>Research foundations — the papers this machine implements</SectionLabel>
        <h1 style={{ fontSize: 26, fontFamily: "var(--font-display)", marginBottom: 4 }}>Papers</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 6 }}>
          Theory → method → blueprint → this running product.
        </p>
        <details style={{ marginBottom: 16, maxWidth: 720 }}>
          <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--ink-faint)" }}>
            Why the machine starts from papers, not code ▸
          </summary>
          <div style={{ marginTop: 8, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, marginBottom: 8 }}>{wpf?.claim}</p>
            {(wpf?.points ?? []).map((pt: any, i: number) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{pt.q}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>{pt.a}</div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 70, textAlign: "left" }}>Layer</th>
                <th style={{ ...th, textAlign: "left" }}>Paper</th>
                <th style={{ ...th, width: 190, textAlign: "left" }}>Role</th>
                <th style={{ ...th, width: 60, textAlign: "right" }}>Pages</th>
                <th style={{ ...th, width: 170, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id} onClick={() => setFocus(p)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={cell}><Pill tone={LAYER_TONE[p.layer] ?? "neutral"}>{p.layer} · {p.layer_label}</Pill></td>
                  <td style={{ ...cell, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.title}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.subtitle}>
                      {p.author} · {p.year}
                    </div>
                  </td>
                  <td style={{ ...cell, color: "var(--ink-dim)" }}>{p.role}</td>
                  <td style={{ ...cell, textAlign: "right" }} className="mono">{p.pages}</td>
                  <td style={cell} onClick={(e) => e.stopPropagation()}>
                    {p.file_exists ? (
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <a href={p.file} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--accent-blue)", color: "var(--accent-blue-ink)", textDecoration: "none" }}>
                          Read →
                        </a>
                        <a href={`${p.file}?download=1`}
                          style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--line)", color: "var(--ink-dim)", textDecoration: "none" }}
                          title={p.file_size_mb ? `PDF · ${p.file_size_mb} MB` : "PDF"}>
                          Download
                        </a>
                      </span>
                    ) : <Pill tone="rose">File missing</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 8 }}>
          One row = one paper. Click a row for what it is and how it relates.
        </p>
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
                {
                  key: "trace", label: "Trace", content: (
                    <p className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                      GET /api/research-papers — src/real/research_papers_authored.py. Descriptions written from the
                      papers' own title pages, abstracts and contents; relation and why-key readings are the case
                      owner's declared authored judgment. PDF verified on disk at {focus.file}.
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
