import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcessRail } from "./components/ProcessRail";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HowWeGotHere } from "./components/HowWeGotHere";
import { SourcesDock } from "./components/SourcesDock";
import { WorldPad } from "./components/WorldPad";
import { AskShell } from "./components/AskShell";
import { CategoryGate } from "./components/CategoryGate";
import { ProductsWorld } from "./worlds/ProductsWorld";
import { SignalsWorld } from "./worlds/SignalsWorld";
import { PathsWorld } from "./worlds/PathsWorld";
import { MagicBoxWorld } from "./worlds/MagicBoxWorld";
import { InnovationsWorld } from "./worlds/InnovationsWorld";
import { CriteriaWorld } from "./worlds/CriteriaWorld";
import { FunnelWorld } from "./worlds/FunnelWorld";
import { api } from "./lib/api";
import type { InnovationsResponse, MagicBoxResponse, RivalsResponse, WhiteSpaceResponse } from "./lib/types";

// The canonical machine - exactly five principal worlds:
// 1 Product universe · 2 Radar · 3 Paths (Field grounded inside) ·
// 4 Magic box · 5 Innovations (Lab inside). Overview is home, Criteria is
// a reference view inside Innovations. Old routes redirect into the five.
const WORLD_PATH: Record<number, string> = {
  0: "/", 1: "/products", 2: "/radar", 3: "/paths", 4: "/magic-box",
  5: "/innovations", 8: "/criteria",
};
const PATH_WORLD: Record<string, number> = {
  "/": 0, "/products": 1, "/radar": 2, "/paths": 3, "/magic-box": 4,
  "/innovations": 5, "/criteria": 8,
  // legacy routes fold into their canonical worlds
  "/field": 3, "/new-products": 5,
};

export type CategoryId = "AIR_PURIFICATION" | "FLOOR_CARE";

export default function App() {
  const [world, setWorld] = useState(() => PATH_WORLD[window.location.pathname] ?? 0);
  const [askOpen, setAskOpen] = useState(false);
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>("AIR_PURIFICATION");

  const [innovations, setInnovations] = useState<InnovationsResponse | undefined>();
  const [magicBox, setMagicBox] = useState<MagicBoxResponse | undefined>();
  const [rivals, setRivals] = useState<RivalsResponse | undefined>();
  const [whiteSpace, setWhiteSpace] = useState<WhiteSpaceResponse | undefined>();

  useEffect(() => {
    api.magicBox().then(setMagicBox).catch(() => {});
    api.rivals().then(setRivals).catch(() => {});
    api.whiteSpace().then(setWhiteSpace).catch(() => {});
  }, []);

  useEffect(() => {
    const target = WORLD_PATH[world] ?? "/";
    // Only push when the PATH differs - never clobber query params that a
    // cross-world navigate() just pushed for this same world.
    if (window.location.pathname !== target) window.history.pushState({}, "", target);
  }, [world]);

  // Cross-world navigation that can carry object focus params
  // (e.g. /radar?lens=research&paper=RP-05). Pushes path+query THEN sets
  // the world, so the world-sync effect sees a matching pathname and
  // leaves the params intact for the target world's read-on-mount.
  const navigate = useCallback((n: number, params?: Record<string, string>) => {
    const target = WORLD_PATH[n] ?? "/";
    const qs = params && Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString() : "";
    window.history.pushState({}, "", target + qs);
    setWorld(n);
  }, []);

  useEffect(() => {
    function onPop() { setWorld(PATH_WORLD[window.location.pathname] ?? 0); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goSendToMagicBox = useCallback((theme: string) => {
    setThemeFilter(theme);
    navigate(4, { theme });
  }, [navigate]);

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const tag = (el as HTMLElement)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "0") { setWorld(0); return; }
      if (e.key >= "1" && e.key <= "5") { setWorld(Number(e.key)); return; }
      if (e.key === "ArrowRight") { setWorld((w) => (w >= 1 && w < 5 ? w + 1 : w)); return; }
      if (e.key === "ArrowLeft") { setWorld((w) => (w > 1 && w <= 5 ? w - 1 : w)); return; }
      if (e.key === " ") { e.preventDefault(); setAskOpen((v) => !v); return; }
      if (e.key === "Escape") { setAskOpen(false); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const worldEl = useMemo(() => {
    // A non-runnable category shows its honest live eligibility state in
    // every world - never another category's data under this label.
    if (category !== "AIR_PURIFICATION" && world >= 1 && world <= 5) {
      return <CategoryGate key={`gate-${category}-${world}`} category={category} world={world} onBackToAir={() => setCategory("AIR_PURIFICATION")} />;
    }
    switch (world) {
      case 0: return <FunnelWorld key="overview" onGoToWorld={navigate} navigate={navigate} />;
      case 1: return <ProductsWorld key="products" />;
      case 2: return <SignalsWorld key="radar" onSendToMagicBox={goSendToMagicBox} />;
      case 3: return <PathsWorld key="paths" onGoToWorld={navigate} />;
      case 4: return <MagicBoxWorld key="magic_box" themeFilter={themeFilter} onGoToWorld={navigate} />;
      case 5: return <InnovationsWorld key="innovations" onData={setInnovations} onGoToWorld={navigate} />;
      case 8: return <CriteriaWorld key="criteria" />;
      default: return null;
    }
  }, [world, themeFilter, goSendToMagicBox, category, navigate]);

  return (
    <div style={{ height: "100dvh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ProcessRail active={world} onSelect={setWorld} onGoHome={() => setWorld(0)}
        category={category} onCategoryChange={setCategory} />
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div key={`${world}-${category}`} className="world-enter" style={{ position: "absolute", inset: 0 }}>
          <ErrorBoundary key={`${world}-${category}`}>{worldEl}</ErrorBoundary>
        </div>
      </main>
      <footer style={{ flexShrink: 0, padding: "6px 22px", borderTop: "1px solid var(--line)", background: "var(--surface)", fontSize: 10.5, color: "var(--ink-faint)", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)", alignItems: "center", gap: 12, maxWidth: "100vw" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Versuni Intelligence Machine — Amsterdam</span>
        <WorldPad world={world} onSelect={setWorld} onGoHome={() => setWorld(0)} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifySelf: "end", overflowX: "auto", maxWidth: "100%" }}>
          <HowWeGotHere />
          <SourcesDock />
        </div>
      </footer>
      <AskShell open={askOpen} onClose={() => setAskOpen(false)} ctx={{ innovations, magicBox, rivals, whiteSpace }} />
    </div>
  );
}
