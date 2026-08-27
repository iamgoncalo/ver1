import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcessRail } from "./components/ProcessRail";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HowWeGotHere } from "./components/HowWeGotHere";
import { AskShell } from "./components/AskShell";
import { ProductsWorld } from "./worlds/ProductsWorld";
import { SignalsWorld } from "./worlds/SignalsWorld";
import { MagicBoxWorld } from "./worlds/MagicBoxWorld";
import { InnovationsWorld } from "./worlds/InnovationsWorld";
import { CriteriaWorld } from "./worlds/CriteriaWorld";
import { FunnelWorld } from "./worlds/FunnelWorld";
import { api } from "./lib/api";
import type { InnovationsResponse, MagicBoxResponse, RivalsResponse, WhiteSpaceResponse } from "./lib/types";

export default function App() {
  const [world, setWorld] = useState(() => (window.location.pathname === "/criteria" ? 4 : 0));
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
    const target = world === 4 ? "/criteria" : "/";
    if (window.location.pathname !== target) window.history.pushState({}, "", target);
  }, [world]);

  useEffect(() => {
    function onPop() { setWorld(window.location.pathname === "/criteria" ? 4 : 0); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goSendToMagicBox = useCallback((theme: string) => {
    setThemeFilter(theme);
    setWorld(3);
  }, []);

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const tag = (el as HTMLElement)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    }
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "0") { setWorld(0); return; }
      if (e.key >= "1" && e.key <= "5") { setWorld(Number(e.key)); return; }
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
      case 0: return <FunnelWorld key="funnel" onGoToWorld={setWorld} />;
      case 1: return <ProductsWorld key="products" />;
      case 2: return <SignalsWorld key="signals" onSendToMagicBox={goSendToMagicBox} />;
      case 3: return <MagicBoxWorld key="magic_box" themeFilter={themeFilter} />;
      case 4: return <CriteriaWorld key="criteria" />;
      case 5: return <InnovationsWorld key="innovations" onData={setInnovations} />;
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
      <footer style={{ flexShrink: 0, padding: "6px 22px", borderTop: "1px solid var(--line)", background: "var(--surface)", fontSize: 10.5, color: "var(--ink-faint)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span>Versuni — Disruptive Innovation Team, Amsterdam</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <HowWeGotHere />
          <a href="http://localhost:8501" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-faint)" }}>
            Analyst Mode →
          </a>
          <span title="← → move between worlds · 0 home · 1–5 jump to a world · SPACE ask · ESC close" style={{ cursor: "default" }}>Shortcuts</span>
        </div>
      </footer>
      <AskShell open={askOpen} onClose={() => setAskOpen(false)} ctx={{ innovations, magicBox, rivals, whiteSpace }} />
    </div>
  );
}
