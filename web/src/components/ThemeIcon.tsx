// Editorial line-icon system for friction themes and research territories.
// These are hand-authored abstract illustrations, not photographs and not
// AI-generated renders of any real product - each is explicitly labelled
// EDITORIAL wherever it appears (see ImageProvenance below), never implied
// to be a real product photo.

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type FrictionThemeId = "reliability" | "noise" | "value_effectiveness" | "customer_service" | "filter_cost" | "ozone_odor_safety";
export type TerritoryId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";

function IconFrame({ children, size = 40 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
      {children}
    </svg>
  );
}

const FRICTION_ICON: Record<FrictionThemeId, React.ReactNode> = {
  reliability: (
    <IconFrame>
      <path d="M20 6 L32 11 V19 C32 27 26.5 32.5 20 34.5 C13.5 32.5 8 27 8 19 V11 Z" {...STROKE} />
      <path d="M20 15 V22" {...STROKE} />
      <circle cx="20" cy="27" r="1.3" fill="currentColor" stroke="none" />
    </IconFrame>
  ),
  noise: (
    <IconFrame>
      <path d="M8 16 H14 L21 9 V31 L14 24 H8 Z" {...STROKE} />
      <path d="M26 14 C29 16.5 29 23.5 26 26" {...STROKE} />
      <path d="M30.5 10 C35.5 14.5 35.5 25.5 30.5 30" {...STROKE} />
    </IconFrame>
  ),
  value_effectiveness: (
    <IconFrame>
      <path d="M20 7 V33" {...STROKE} />
      <path d="M8 13 H32" {...STROKE} />
      <path d="M8 13 L4 22 A5 4 0 0 0 12 22 Z" {...STROKE} />
      <path d="M32 13 L28 22 A5 4 0 0 0 36 22 Z" {...STROKE} />
      <path d="M14 33 H26" {...STROKE} />
    </IconFrame>
  ),
  customer_service: (
    <IconFrame>
      <path d="M9 21 V18 A11 11 0 0 1 31 18 V21" {...STROKE} />
      <rect x="6.5" y="21" width="5" height="8" rx="2" {...STROKE} />
      <rect x="28.5" y="21" width="5" height="8" rx="2" {...STROKE} />
      <path d="M28.5 29 V30 A5 5 0 0 1 20 33.5" {...STROKE} />
    </IconFrame>
  ),
  filter_cost: (
    <IconFrame>
      <path d="M7 9 H33 L22 21 V31 L18 33 V21 Z" {...STROKE} />
    </IconFrame>
  ),
  ozone_odor_safety: (
    <IconFrame>
      <circle cx="20" cy="14" r="4.2" {...STROKE} />
      <circle cx="10" cy="26" r="4.2" {...STROKE} />
      <circle cx="30" cy="26" r="4.2" {...STROKE} />
      <path d="M16.8 17.2 L13.2 22.8" {...STROKE} />
      <path d="M23.2 17.2 L26.8 22.8" {...STROKE} />
      <path d="M14.2 26 H25.8" {...STROKE} />
    </IconFrame>
  ),
};

const TERRITORY_ICON: Record<TerritoryId, React.ReactNode> = {
  R1: (
    <IconFrame>
      <circle cx="20" cy="20" r="13" {...STROKE} />
      <circle cx="20" cy="20" r="7" {...STROKE} />
      <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </IconFrame>
  ),
  R2: (
    <IconFrame>
      <path d="M20 32 C10 25 6 18.5 6 13.5 A6.5 6.5 0 0 1 20 11 A6.5 6.5 0 0 1 34 13.5 C34 18.5 30 25 20 32 Z" {...STROKE} />
      <path d="M14 19 H18 L20 15 L23 23 L25 19 H27" {...STROKE} />
    </IconFrame>
  ),
  R3: (
    <IconFrame>
      <circle cx="20" cy="20" r="13" {...STROKE} />
      <path d="M20 12 V20 L26 24" {...STROKE} />
    </IconFrame>
  ),
  R4: (
    <IconFrame>
      <path d="M5 20 C10 11 30 11 35 20 C30 29 10 29 5 20 Z" {...STROKE} />
      <circle cx="20" cy="20" r="5" {...STROKE} />
    </IconFrame>
  ),
  R5: (
    <IconFrame>
      <rect x="6" y="8" width="28" height="24" rx="2" {...STROKE} />
      <circle cx="14" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="27" cy="21" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="24" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="26" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="25" r="1.2" fill="currentColor" stroke="none" />
    </IconFrame>
  ),
  R6: (
    <IconFrame>
      <path d="M21 6 L10 22 H18 L16 34 L30 16 H22 Z" {...STROKE} />
    </IconFrame>
  ),
};

export function FrictionIcon({ theme, size = 40 }: { theme: FrictionThemeId | string; size?: number }) {
  const node = FRICTION_ICON[theme as FrictionThemeId];
  if (!node) return null;
  return <span style={{ display: "inline-flex", width: size, height: size, color: "var(--accent-blue-ink)" }}>{node}</span>;
}

export function TerritoryIcon({ territory, size = 40 }: { territory: TerritoryId | string; size?: number }) {
  const node = TERRITORY_ICON[territory as TerritoryId];
  if (!node) return null;
  return <span style={{ display: "inline-flex", width: size, height: size, color: "var(--accent-teal)" }}>{node}</span>;
}

export type FamilyId = "CONSUMERS" | "RESEARCH" | "TRENDS" | "MARKET" | "TECHNOLOGY_AI";

const FAMILY_ICON: Record<FamilyId, React.ReactNode> = {
  CONSUMERS: (
    <IconFrame>
      <path d="M8 10 H32 A2 2 0 0 1 34 12 V24 A2 2 0 0 1 32 26 H18 L12 32 V26 H8 A2 2 0 0 1 6 24 V12 A2 2 0 0 1 8 10 Z" {...STROKE} />
      <path d="M13 16 H27" {...STROKE} />
      <path d="M13 20 H22" {...STROKE} />
    </IconFrame>
  ),
  RESEARCH: (
    <IconFrame>
      <path d="M20 12 C17 9.5 12 9 7 10 V29 C12 28 17 28.5 20 31 C23 28.5 28 28 33 29 V10 C28 9 23 9.5 20 12 Z" {...STROKE} />
      <path d="M20 12 V31" {...STROKE} />
    </IconFrame>
  ),
  TRENDS: (
    <IconFrame>
      <path d="M11 6 H26 L31 11 V34 H11 Z" {...STROKE} />
      <path d="M26 6 V11 H31" {...STROKE} />
      <circle cx="20" cy="21.5" r="5" {...STROKE} />
      <path d="M17.5 21.5 L19 23.2 L23 19" {...STROKE} />
    </IconFrame>
  ),
  MARKET: (
    <IconFrame>
      <path d="M7 33 H33" {...STROKE} />
      <rect x="9" y="23" width="6" height="10" {...STROKE} />
      <rect x="17" y="17" width="6" height="16" {...STROKE} />
      <rect x="25" y="11" width="6" height="22" {...STROKE} />
    </IconFrame>
  ),
  TECHNOLOGY_AI: (
    <IconFrame>
      <rect x="13" y="13" width="14" height="14" rx="2" {...STROKE} />
      <path d="M20 6 V13 M20 27 V34 M6 20 H13 M27 20 H34" {...STROKE} />
    </IconFrame>
  ),
};

export function FamilyIcon({ family, size = 40 }: { family: FamilyId | string; size?: number }) {
  const node = FAMILY_ICON[family as FamilyId];
  if (!node) return null;
  return <span style={{ display: "inline-flex", width: size, height: size, color: "var(--accent-blue-ink)" }}>{node}</span>;
}

export function ImageProvenance({ state }: { state: "OFFICIAL" | "EDITORIAL" | "CONCEPT" | "GENERATED" | "FAMILY" | "UNVERIFIED" }) {
  const COLOR: Record<string, string> = {
    OFFICIAL: "var(--good)", EDITORIAL: "var(--accent-teal)", CONCEPT: "var(--accent-blue-ink)",
    GENERATED: "var(--amber)", FAMILY: "var(--amber)", UNVERIFIED: "var(--rose)",
  };
  return (
    <span style={{
      fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.05em", padding: "1px 6px",
      borderRadius: 999, color: COLOR[state], border: `1px solid ${COLOR[state]}55`, background: `${COLOR[state]}14`,
    }}>
      {state}
    </span>
  );
}
