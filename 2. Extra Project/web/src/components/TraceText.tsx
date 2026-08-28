import type { CSSProperties, ReactNode } from "react";

// Trace strings throughout this app cite real source files by path
// (e.g. "src/real/funnel_real.py") as plain prose. This finds every such
// path and renders it distinctly as code, so a reader can locate the exact
// file in the repository. (These used to be GitHub deep links; the
// repository is private per the case brief, so a public deployment must
// not ship links that 404 for every visitor.)
const FILE_PATTERN = /\b((?:src\/real|src\/[\w./-]+|scripts|api|web\/src\/[\w./-]+|data\/(?:processed|raw))\/[\w./-]+\.(?:py|json|tsx?|csv))\b/g;

export function TraceText({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  FILE_PATTERN.lastIndex = 0;
  while ((m = FILE_PATTERN.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const path = m[1];
    parts.push(
      <code key={m.index} className="mono" style={{ fontSize: "0.92em", color: "var(--accent-blue)" }}>{path}</code>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className} style={style}>{parts}</span>;
}
