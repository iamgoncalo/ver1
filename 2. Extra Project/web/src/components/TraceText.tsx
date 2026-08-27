import type { CSSProperties, ReactNode } from "react";
import { githubFileUrl } from "../lib/github";

// Trace strings throughout this app cite real source files by path
// (e.g. "src/real/funnel_real.py") as plain prose. This finds every such
// path in a string and turns it into a real, live link to that exact file
// on GitHub - the same file path already named, not a guess or a rebuild.
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
      <a key={m.index} href={githubFileUrl(path)} target="_blank" rel="noopener noreferrer">{path}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className} style={style}>{parts}</span>;
}
