// Sentence-case display for raw data enums reaching the UI
// (e.g. "NEEDS_EVIDENCE" -> "Needs evidence", "AIR_PURIFICATION" ->
// "Air purification"). Genuine acronyms keep their casing. Never applied
// to code identifiers inside mono/trace contexts - those render verbatim.
const ACRONYMS = new Set(["ai", "api", "cadr", "doi", "pdf", "usd"]);

export function toSentence(value: string | null | undefined): string {
  if (!value) return "";
  const words = value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLowerCase();
      return ACRONYMS.has(lower) ? lower.toUpperCase() : lower;
    });
  if (words.length && !ACRONYMS.has(words[0].toLowerCase())) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  return words.join(" ");
}
