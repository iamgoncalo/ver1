// Large editorial line-motifs for the six homepage funnel stages - same
// hand-authored abstract style as ThemeIcon.tsx (no photography, no
// AI-generated renders of any real product), sized up for "large imagery"
// on the homepage tiles rather than the small per-item icons elsewhere.

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type FunnelStageKey = "radar" | "paths" | "field" | "magic_box" | "innovations" | "new_products";

const MOTIF: Record<FunnelStageKey, React.ReactNode> = {
  radar: (
    <>
      <circle cx="32" cy="32" r="26" {...STROKE} opacity={0.35} />
      <circle cx="32" cy="32" r="17" {...STROKE} opacity={0.55} />
      <circle cx="32" cy="32" r="8" {...STROKE} />
      <path d="M32 32 L50 14" {...STROKE} />
      <circle cx="32" cy="32" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  paths: (
    <>
      <circle cx="10" cy="32" r="3.2" fill="currentColor" stroke="none" />
      <path d="M13 32 C 24 32, 24 16, 35 16" {...STROKE} />
      <path d="M13 32 C 24 32, 24 48, 35 48" {...STROKE} />
      <path d="M13 32 C 22 32, 24 32, 35 32" {...STROKE} opacity={0.5} />
      <circle cx="38" cy="16" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="38" cy="32" r="2.6" fill="currentColor" stroke="none" opacity={0.6} />
      <circle cx="38" cy="48" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  field: (
    <>
      <path d="M6 44 C 16 34, 24 34, 32 40 C 40 46, 48 40, 58 30" {...STROKE} />
      <path d="M6 52 H 58" {...STROKE} opacity={0.4} />
      <circle cx="32" cy="40" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  magic_box: (
    <>
      <path d="M32 8 L54 20 V44 L32 56 L10 44 V20 Z" {...STROKE} />
      <path d="M10 20 L32 32 L54 20" {...STROKE} />
      <path d="M32 32 V56" {...STROKE} />
      <path d="M32 32 L20 26" {...STROKE} opacity={0.5} />
    </>
  ),
  innovations: (
    <>
      <path d="M32 8 C 22 8, 16 16, 16 24 C 16 31, 20 34, 23 38 V44 H41 V38 C 44 34, 48 31, 48 24 C 48 16, 42 8, 32 8 Z" {...STROKE} />
      <path d="M25 50 H39" {...STROKE} />
      <path d="M27 56 H37" {...STROKE} />
      <path d="M32 20 L27 28 H32 L28 36" {...STROKE} opacity={0.6} />
    </>
  ),
  new_products: (
    <>
      <path d="M32 6 L56 18 V46 L32 58 L8 46 V18 Z" {...STROKE} />
      <path d="M8 18 L32 30 L56 18" {...STROKE} />
      <path d="M32 30 V58" {...STROKE} />
      <path d="M24 41 L30 47 L42 33" {...STROKE} />
    </>
  ),
};

export function FunnelStageIcon({ stage, size = 56 }: { stage: FunnelStageKey; size?: number }) {
  return (
    <span style={{ display: "inline-flex", width: size, height: size, color: "var(--accent-blue-ink)", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }}>
        {MOTIF[stage]}
      </svg>
    </span>
  );
}
