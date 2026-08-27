// Editorial line-icon system for the 12 fixed design operators (MOVE, MERGE,
// REMOVE, INVERT, DISTRIBUTE, CONCENTRATE, PREDICT, PERSONALISE, AMBIENT,
// TEMPORAL_SHIFT, CROSS_CATEGORY_TRANSFER, MATERIALISE - see
// src/real/magic_box_real.py::OPERATORS). Hand-authored abstract diagrams of
// what each operator DOES to a system, not a photo or a render of any real
// product - each operator is applied to real friction themes as declared
// design judgment, never asserted as evidence.

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const DASH = { ...STROKE, strokeDasharray: "3 3" };

export type OperatorId =
  | "MOVE" | "MERGE" | "REMOVE" | "INVERT" | "DISTRIBUTE" | "CONCENTRATE"
  | "PREDICT" | "PERSONALISE" | "AMBIENT" | "TEMPORAL_SHIFT"
  | "CROSS_CATEGORY_TRANSFER" | "MATERIALISE";

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 40 40" style={{ display: "block" }}>
      {children}
    </svg>
  );
}

const OPERATOR_ICON: Record<OperatorId, React.ReactNode> = {
  MOVE: (
    <IconFrame>
      <circle cx="9" cy="20" r="4.5" {...DASH} />
      <path d="M15 20 H29" {...STROKE} />
      <path d="M23 14 L29 20 L23 26" {...STROKE} />
      <circle cx="31.5" cy="20" r="4.5" {...STROKE} />
    </IconFrame>
  ),
  MERGE: (
    <IconFrame>
      <circle cx="13" cy="14" r="7" {...STROKE} />
      <circle cx="13" cy="26" r="7" {...STROKE} />
      <circle cx="28" cy="20" r="8.5" {...STROKE} />
      <path d="M19 17 L23 20 L19 23" {...STROKE} />
    </IconFrame>
  ),
  REMOVE: (
    <IconFrame>
      <circle cx="14" cy="20" r="8" {...STROKE} />
      <circle cx="30" cy="20" r="5.5" {...DASH} />
      <path d="M27 17 L33 23 M33 17 L27 23" {...STROKE} />
    </IconFrame>
  ),
  INVERT: (
    <IconFrame>
      <path d="M9 13 H31" {...STROKE} />
      <path d="M9 27 H31" {...STROKE} />
      <path d="M13 8 L9 13 L13 18" {...STROKE} />
      <path d="M27 22 L31 27 L27 32" {...STROKE} />
    </IconFrame>
  ),
  DISTRIBUTE: (
    <IconFrame>
      <circle cx="8" cy="20" r="4.5" {...STROKE} />
      <path d="M12.5 20 H17 M17 20 L27 9 M17 20 L27 20 M17 20 L27 31" {...STROKE} />
      <circle cx="30" cy="9" r="3.2" {...STROKE} />
      <circle cx="30" cy="20" r="3.2" {...STROKE} />
      <circle cx="30" cy="31" r="3.2" {...STROKE} />
    </IconFrame>
  ),
  CONCENTRATE: (
    <IconFrame>
      <circle cx="9" cy="9" r="3.2" {...STROKE} />
      <circle cx="9" cy="20" r="3.2" {...STROKE} />
      <circle cx="9" cy="31" r="3.2" {...STROKE} />
      <path d="M12 9 L22 20 M12 20 H22 M12 31 L22 20" {...STROKE} />
      <circle cx="27" cy="20" r="5.5" {...STROKE} />
    </IconFrame>
  ),
  PREDICT: (
    <IconFrame>
      <path d="M7 30 H33" {...DASH} />
      <circle cx="12" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="16" r="2" fill="currentColor" stroke="none" />
      <path d="M25 10 L33 10 L33 18" {...STROKE} />
      <path d="M12 24 L19 16 L26 11" {...DASH} />
      <path d="M26 11 L33 10" {...STROKE} />
    </IconFrame>
  ),
  PERSONALISE: (
    <IconFrame>
      <rect x="6" y="6" width="28" height="20" rx="3" {...DASH} />
      <circle cx="20" cy="29" r="4.5" {...STROKE} />
      <path d="M13 39 C13 33.5 16 31 20 31 C24 31 27 33.5 27 39" {...STROKE} />
    </IconFrame>
  ),
  AMBIENT: (
    <IconFrame>
      <circle cx="20" cy="22" r="4" {...STROKE} />
      <path d="M20 22 V30" {...STROKE} />
      <path d="M13 10 A10 10 0 0 1 27 10" {...DASH} />
      <path d="M9 6 A15.5 15.5 0 0 1 31 6" {...DASH} />
    </IconFrame>
  ),
  TEMPORAL_SHIFT: (
    <IconFrame>
      <circle cx="20" cy="21" r="13" {...STROKE} />
      <path d="M20 13 V21 L26 25" {...STROKE} />
      <path d="M9 5 L5 9 M31 5 L35 9" {...STROKE} />
    </IconFrame>
  ),
  CROSS_CATEGORY_TRANSFER: (
    <IconFrame>
      <rect x="4" y="12" width="13" height="16" rx="2.5" {...STROKE} />
      <circle cx="30" cy="20" r="8" {...DASH} />
      <path d="M18.5 20 H26" {...STROKE} />
      <path d="M22.5 16 L26 20 L22.5 24" {...STROKE} />
    </IconFrame>
  ),
  MATERIALISE: (
    <IconFrame>
      <rect x="5" y="13" width="12" height="14" rx="2" {...DASH} />
      <path d="M20 20 H25" {...STROKE} />
      <path d="M22.5 16 L26 20 L22.5 24" {...STROKE} />
      <rect x="27" y="10" width="12" height="20" rx="2" {...STROKE} />
    </IconFrame>
  ),
};

export function OperatorIcon({ operator, size = 32 }: { operator: OperatorId | string; size?: number }) {
  const node = OPERATOR_ICON[operator as OperatorId];
  if (!node) return null;
  return <span style={{ display: "inline-flex", width: size, height: size, color: "var(--accent-teal)", flexShrink: 0 }}>{node}</span>;
}

export const OPERATOR_TAGLINE: Record<OperatorId, string> = {
  MOVE: "Change where it happens.",
  MERGE: "Combine two jobs into one.",
  REMOVE: "Delete the interaction entirely.",
  INVERT: "Act before, not after.",
  DISTRIBUTE: "One system becomes several.",
  CONCENTRATE: "Several systems become one.",
  PREDICT: "Reactive becomes anticipatory.",
  PERSONALISE: "Room becomes individual.",
  AMBIENT: "Explicit becomes invisible.",
  TEMPORAL_SHIFT: "Move the job earlier or later.",
  CROSS_CATEGORY_TRANSFER: "Borrow a proven capability.",
  MATERIALISE: "Turn a signal into a thing.",
};
