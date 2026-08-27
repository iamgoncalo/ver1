export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/brand/versuni-logo.png" alt="Versuni" style={{ height: compact ? 18 : 22, width: "auto", display: "block" }} />
      {!compact && (
        <span style={{ fontSize: 11, color: "var(--ink)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", fontWeight: 600 }}>
          DISRUPTIVE INNOVATION
        </span>
      )}
    </div>
  );
}
