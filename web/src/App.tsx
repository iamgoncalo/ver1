import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcessRail } from "./components/ProcessRail";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AskShell } from "./components/AskShell";
import { ProductsWorld } from "./worlds/ProductsWorld";
import { SignalsWorld } from "./worlds/SignalsWorld";
import { RivalsWorld } from "./worlds/RivalsWorld";
import { MagicBoxWorld } from "./worlds/MagicBoxWorld";
import { InnovationsWorld } from "./worlds/InnovationsWorld";
import { CriteriaWorld } from "./worlds/CriteriaWorld";
import { api } from "./lib/api";
import type { InnovationsResponse, MagicBoxResponse, RivalsResponse, WhiteSpaceResponse } from "./lib/types";

export default function App() {
  const [world, setWorld] = useState(() => (window.location.pathname === "/criteria" ? 6 : 1));
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
    const target = world === 6 ? "/criteria" : "/";
    if (window.location.pathname !== target) window.history.pushState({}, "", target);
  }, [world]);

  useEffect(() => {
    function onPop() { setWorld(window.location.pathname === "/criteria" ? 6 : 1); }
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
      if (e.key >= "1" && e.key <= "6") { setWorld(Number(e.key)); return; }
      if (e.key === "ArrowRight") { setWorld((w) => Math.min(5, w + 1)); return; }
      if (e.key === "ArrowLeft") { setWorld((w) => Math.max(1, w - 1)); return; }
      if (e.key === " ") { e.preventDefault(); setAskOpen((v) => !v); return; }
      if (e.key === "Escape") { setAskOpen(false); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const worldEl = useMemo(() => {
    switch (world) {
      case 1: return <ProductsWorld key="products" />;
      case 2: return <SignalsWorld key="signals" />;
      case 3: return <RivalsWorld key="rivals" onSendToMagicBox={goSendToMagicBox} />;
      case 4: return <MagicBoxWorld key="magicbox" themeFilter={themeFilter} />;
      case 5: return <InnovationsWorld key="innovations" onData={setInnovations} />;
      case 6: return <CriteriaWorld key="criteria" />;
      default: return null;
    }
  }, [world, themeFilter, goSendToMagicBox]);

  return (
    <div style={{ height: "100dvh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ProcessRail active={world} onSelect={setWorld} />
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div key={world} className="world-enter" style={{ position: "absolute", inset: 0 }}>
          <ErrorBoundary key={world}>{worldEl}</ErrorBoundary>
        </div>
      </main>
      <footer style={{ flexShrink: 0, padding: "6px 22px", borderTop: "1px solid var(--line)", background: "var(--surface)", fontSize: 10.5, color: "var(--ink-faint)", display: "flex", justifyContent: "space-between" }}>
        <span>Versuni — Disruptive Innovation Team, Amsterdam</span>
        <span>← → worlds · 1–6 jump · SPACE ask · ESC close</span>
      </footer>
      <AskShell open={askOpen} onClose={() => setAskOpen(false)} ctx={{ innovations, magicBox, rivals, whiteSpace }} />
    </div>
  );
}
