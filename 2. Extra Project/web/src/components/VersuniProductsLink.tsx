import { useState } from "react";

// Hand-authored line icon (matches FunnelIcons.tsx's stroke convention) -
// a stack of photo frames, standing in for "the real product photo catalog"
// this link goes to. No photography, no AI-rendered product art.
function PhotoStackIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6.5" y="3.5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth={1.6} opacity={0.5} />
      <rect x="3.5" y="7.5" width="14" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth={1.6} />
      <circle cx="7.6" cy="11.6" r="1.15" stroke="currentColor" strokeWidth={1.5} />
      <path d="M4.3 17.6 L9.2 13.2 L12 15.6 L14.6 12.9 L17.7 17.6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Served locally from this same app/port (see web/public/verinfo/ and the
// /verinfo mount in api/main.py) - not an external GitHub Pages dependency,
// so it works fully offline / on localhost.
const PRODUCTS_CATALOG_URL = "/verinfo/";

// A plain, direct link - clicking it navigates straight to the real
// product-photo catalog in the same tab. No popup, no new tab, no overlay.
export function VersuniProductsLink() {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={PRODUCTS_CATALOG_URL}
      title="Go to the Versuni product-photo catalog"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 7, textDecoration: "none",
        padding: "6px 12px 6px 9px", borderRadius: 9,
        border: "1px solid transparent",
        background: "linear-gradient(120deg, var(--accent-blue) 0%, var(--accent-teal) 100%)",
        boxShadow: hover ? "0 8px 20px -8px var(--accent-blue)" : "0 2px 8px -4px var(--accent-blue)",
        transform: hover ? "translateY(-1px)" : "none",
        transition: "box-shadow 160ms, transform 160ms",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "#fff", display: "flex" }}>
        <PhotoStackIcon />
      </span>
      <span
        className="mono"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#fff" }}
      >
        VERSUNI PRODUCTS
      </span>
    </a>
  );
}
