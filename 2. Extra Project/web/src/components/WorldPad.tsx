function Triangle({ dir }: { dir: "left" | "right" }) {
  const points = dir === "left" ? "10,3 10,13 3,8" : "6,3 6,13 13,8";
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <polygon points={points} fill="currentColor" />
    </svg>
  );
}

function PadButton({ dir, onClick, disabled }: { dir: "left" | "right"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous world" : "Next world"}
      style={{
        width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--line)",
        background: "var(--surface)", color: disabled ? "var(--ink-faint)" : "var(--ink-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "color 120ms, border-color 120ms, transform 120ms",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.color = "var(--accent-blue-ink)"; e.currentTarget.style.borderColor = "var(--accent-blue)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.color = disabled ? "var(--ink-faint)" : "var(--ink-dim)"; e.currentTarget.style.borderColor = "var(--line)"; }}
    >
      <Triangle dir={dir} />
    </button>
  );
}

// A small "gameboy d-pad" echo of the app's own keyboard shortcuts (Left/Right
// step between the five machine worlds, the center pill is Home/world "0" - same
// arrow-key and "0" behavior already wired in App.tsx's onKey handler, just
// given a visible, clickable form for anyone not using the keyboard.
export function WorldPad({ world, onSelect, onGoHome }: { world: number; onSelect: (n: number) => void; onGoHome: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: 3, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)" }}>
      <PadButton dir="left" disabled={world <= 1 || world > 5} onClick={() => onSelect(Math.max(1, world - 1))} />
      <button
        onClick={onGoHome}
        title="Jump to the machine overview"
        aria-label="Home"
        className="mono"
        style={{
          minWidth: 40, height: 22, borderRadius: 999, border: "1px solid var(--line)",
          background: "var(--surface)", color: world === 0 ? "var(--accent-blue-ink)" : "var(--ink-faint)",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", cursor: "pointer",
          padding: "0 8px",
        }}
      >
        {world === 0 ? "Home" : world > 5 ? "Home" : `${world}/5`}
      </button>
      <PadButton dir="right" disabled={world >= 5} onClick={() => onSelect(Math.min(5, world + 1))} />
    </div>
  );
}
