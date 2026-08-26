export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/brand/versuni-logo.png" alt="Versuni" style={{ height: compact ? 18 : 22, width: "auto", display: "block" }} />
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontSize: 11, color: "var(--ink)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", fontWeight: 600 }}>
            DISRUPTIVE INNOVATION
          </span>
          <span style={{ fontSize: 9, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.03em" }}>
            FROM WHAT IS TO WHAT COULD REPLACE IT
          </span>
        </div>
      )}
    </div>
  );
}
