// Shared helpers for locating things in the pdf.js review pane (accuracy + completeness).

// A single, distinctive token to search for — long quotes/sentences can't match across
// the pdf.js text layer's per-span boundaries, but one number/word reliably can.
export function searchSnippet(raw: string): string {
  const clean = raw.replace(/^[">\s]+/, "").replace(/\s+/g, " ").trim();
  const tokens = clean.match(/[A-Za-z0-9][\w.%-]*[A-Za-z0-9]|[A-Za-z0-9]/g) ?? [];
  const num =
    tokens.find((t) => /\d\.\d/.test(t)) || // decimals: 2.26, 0.94
    tokens.find((t) => /^\d{3,}$/.test(t)) || // 1662, 7386
    tokens.find((t) => /\d/.test(t)); // 30-day, 23%
  if (num) return num.replace(/[.,;:]+$/, "");
  const words = tokens.filter((t) => /^[A-Za-z]/.test(t) && t.length > 5);
  return words.sort((a, b) => b.length - a.length)[0] ?? clean.slice(0, 24);
}

// "Table 2" / "Figure 1" from a grounding crop filename, to locate its caption.
export function figureLabel(image: string | null): string | null {
  const m = image?.match(/-(table|fig)(\d+)\.png$/i);
  if (!m) return null;
  return `${m[1].toLowerCase() === "table" ? "Table" : "Fig"} ${m[2]}`;
}
