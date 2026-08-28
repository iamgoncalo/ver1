import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcessRail } from "./components/ProcessRail";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HowWeGotHere } from "./components/HowWeGotHere";
import { SourcesDock } from "./components/SourcesDock";
import { WorldPad } from "./components/WorldPad";
import { AskShell } from "./components/AskShell";
import { ProductsWorld } from "./worlds/ProductsWorld";
import { SignalsWorld } from "./worlds/SignalsWorld";
import { PathsWorld } from "./worlds/PathsWorld";
import { FieldWorld } from "./worlds/FieldWorld";
import { MagicBoxWorld } from "./worlds/MagicBoxWorld";
import { InnovationsWorld } from "./worlds/InnovationsWorld";
import { NewProductsWorld } from "./worlds/NewProductsWorld";
import { CriteriaWorld } from "./worlds/CriteriaWorld";
import { FunnelWorld } from "./worlds/FunnelWorld";
import { api } from "./lib/api";
import type { InnovationsResponse, MagicBoxResponse, RivalsResponse, WhiteSpaceResponse } from "./lib/types";

// The canonical machine: Overview -> Radar -> Paths -> Field -> Magic box ->
// Innovations -> New products, plus two library views (the existing Product
// Universe, and Criteria - how the machine decides) reachable from within
// the machine, not part of the primary sequence.
const WORLD_PATH: Record<number, string> = {
  0: "/", 1: "/radar", 2: "/paths", 3: "/field", 4: "/magic-box",
  5: "/innovations", 6: "/new-products", 7: "/products", 8: "/criteria",
};
const PATH_WORLD: Record<string, number> = Object.fromEntries(
  Object.entries(WORLD_PATH).map(([n, p]) => [p, Number(n)]));

export default function App() {
  const [world, setWorld] = useState(() => PATH_WORLD[window.location.pathname] ?? 0);
  const [askOpen, setAskOpen] = useState(false);
  const [themeFilter, setThemeFilter] = useState<string | null>(null);

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
    if (window.location.pathname !== target) window.history.pushState({}, "", target);
  }, [world]);

  useEffect(() => {
    function onPop() { setWorld(PATH_WORLD[window.location.pathname] ?? 0); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goSendToMagicBox = useCallback((theme: string) => {
    setThemeFilter(theme);
    setWorld(4);
  }, []);

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const tag = (el as HTMLElement)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    }
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "0") { setWorld(0); return; }
      if (e.key >= "1" && e.key <= "6") { setWorld(Number(e.key)); return; }
      if (e.key === "ArrowRight") { setWorld((w) => (w >= 1 && w < 6 ? w + 1 : w)); return; }
      if (e.key === "ArrowLeft") { setWorld((w) => (w > 1 && w <= 6 ? w - 1 : w)); return; }
      if (e.key === " ") { e.preventDefault(); setAskOpen((v) => !v); return; }
      if (e.key === "Escape") { setAskOpen(false); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const worldEl = useMemo(() => {
    switch (world) {
      case 0: return <FunnelWorld key="overview" onGoToWorld={setWorld} />;
      case 1: return <SignalsWorld key="radar" onSendToMagicBox={goSendToMagicBox} />;
      case 2: return <PathsWorld key="paths" onGoToWorld={setWorld} />;
      case 3: return <FieldWorld key="field" onGoToWorld={setWorld} />;
      case 4: return <MagicBoxWorld key="magic_box" themeFilter={themeFilter} />;
      case 5: return <InnovationsWorld key="innovations" onData={setInnovations} onGoToWorld={setWorld} />;
      case 6: return <NewProductsWorld key="new_products" onGoToWorld={setWorld} />;
      case 7: return <ProductsWorld key="products" />;
      case 8: return <CriteriaWorld key="criteria" />;
      default: return null;
    }
  }, [world, themeFilter, goSendToMagicBox]);

  return (
    <div style={{ height: "100dvh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ProcessRail active={world} onSelect={setWorld} onGoHome={() => setWorld(0)} />
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div key={world} className="world-enter" style={{ position: "absolute", inset: 0 }}>
          <ErrorBoundary key={world}>{worldEl}</ErrorBoundary>
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
