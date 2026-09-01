import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill, SectionLabel } from "./ui";

interface Paper { research_id: string; title: string; journal: string; year: number; doi: string; territories: string[] }
interface Territory { territory_id: string; name: string; member_ids: string[]; count: number }
interface ClusterB { cluster_id: number; members: string[]; dominant_territory: string | null; dominant_territory_share: number | null }
interface SimEdge { from: string; to: string; cosine_similarity: number }

const TERRITORY_COLOR: Record<string, string> = {
  R1: "var(--accent-blue)", R2: "var(--rose)", R3: "var(--amber)",
  R4: "var(--accent-teal)", R5: "#8B5CF6", R6: "#0E9C8C",
};

export function ScienceConstellation({ onPaperClick }: { onPaperClick: (id: string) => void }) {
  const [view, setView] = useState<"canonical" | "emergent">("canonical");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [modelB, setModelB] = useState<{ clusters: ClusterB[]; similarity_edges: SimEdge[]; method: string } | null>(null);

  useEffect(() => {
    api.research().then((r) => setPapers(r.peer_reviewed_papers)).catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/research/clusters").then((r) => r.json()).then((d) => {
      setTerritories(d.model_a_canonical_territories.filter((t: Territory) => t.member_ids.some((m) => m.startsWith("RP-"))));
      setModelB(d.model_b_emergent_textual_similarity);
    }).catch(() => {});
  }, []);

  const paperById = Object.fromEntries(papers.map((p) => [p.research_id, p]));

  function Node({ id }: { id: string }) {
    const p = paperById[id];
    if (!p) return null;
    const color = TERRITORY_COLOR[p.territories[0]] ?? "var(--ink-faint)";
    return (
      <button onClick={() => onPaperClick(id)} title={p.title}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 92,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: color, opacity: 0.85,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontFamily: "var(--font-mono)", color: "white", fontWeight: 700,
        }}>
          {id.replace("RP-", "")}
        </div>
        <div style={{ fontSize: 9.5, color: "var(--ink-dim)", textAlign: "center", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.title}
        </div>
      </button>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>Science constellation — {view === "canonical" ? "canonical territories (Model A)" : "emergent text similarity (Model B)"}</SectionLabel>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 8, padding: 3 }}>
          {(["canonical", "emergent"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                fontFamily: "var(--font-mono)", textTransform: "capitalize",
                background: view === v ? "var(--surface)" : "transparent", fontWeight: view === v ? 700 : 500,
                color: view === v ? "var(--ink)" : "var(--ink-faint)" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "canonical" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {territories.map((t) => (
            <div key={t.territory_id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: TERRITORY_COLOR[t.territory_id] }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.territory_id} — {t.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>({t.member_ids.filter((m) => paperById[m]).length} papers)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingLeft: 18 }}>
                {t.member_ids.filter((m) => paperById[m]).map((m) => <Node key={m} id={m} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 12, lineHeight: 1.5 }}>
            Papers grouped purely by similarity of their own wording ({modelB?.method}) — a cross-check
            against the canonical territories above, not a replacement. Text similarity and strategic
            territory are different axes and aren't expected to agree perfectly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(modelB?.clusters ?? []).map((c) => (
              <div key={c.cluster_id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Cluster {c.cluster_id}</span>
                  {c.dominant_territory && (
                    <Pill tone="teal">{Math.round((c.dominant_territory_share ?? 0) * 100)}% {c.dominant_territory}</Pill>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingLeft: 18 }}>
                  {c.members.map((m) => <Node key={m} id={m} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
