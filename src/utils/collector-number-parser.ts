export interface ParsedCollectorNumber {
  /** The collector number as a string, e.g. "123" */
  cn: string
  /** Total cards in the set if found, e.g. "204" */
  total: string | null
  /** The raw matched text from the OCR output */
  raw: string
}

/**
 * Extract a collector number from raw OCR text.
 *
 * Lorcana cards print the collector number in the format "123/204" at the
 * bottom of each card.  OCR output may include noise, spacing variations,
 * or common misreads (e.g. 'l' for '1', 'O' for '0').
 *
 * Returns the first valid collector number found, or null if none detected.
 */
export function parseCollectorNumber(ocrText: string): ParsedCollectorNumber | null {
  // Normalise common OCR substitutions before matching
  const cleaned = ocrText
    .replace(/[lI|]/g, '1')   // l, I, | → 1
    .replace(/[oO]/g, '0')    // o, O → 0 (only in numeric context — we rely on regex)
    .replace(/[sS]/g, '5')    // S → 5 in numeric context
    .replace(/[bB]/g, '8')    // b/B → 8

  // Primary: "123/204" or "123 / 204" or "123\204"
  const slashPattern = /(\d{1,3})\s*[\/\\]\s*(\d{2,3})/
  const slashMatch = cleaned.match(slashPattern)
  if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[0]) {
    const cn = normalise(slashMatch[1])
    if (cn) {
      return { cn, total: slashMatch[2], raw: slashMatch[0] }
    }
  }

  // Secondary: standalone number that looks like a collector number (1-3 digits)
  // Only match if it's reasonably isolated (word boundary or whitespace)
  const standalonePattern = /\b(\d{1,3})\b/g
  let best: ParsedCollectorNumber | null = null
  let match: RegExpExecArray | null
  while ((match = standalonePattern.exec(cleaned)) !== null) {
    const cn = match[1] ? normalise(match[1]) : null
    if (cn) {
      // Prefer larger numbers (more likely to be a collector number than a cost or other digit)
      if (!best || cn.length > best.cn.length) {
        best = { cn, total: null, raw: match[0] }
      }
    }
  }

  return best
}

/** Strip leading zeros and reject "0" */
function normalise(raw: string): string | null {
  const n = parseInt(raw, 10)
  if (n <= 0 || isNaN(n)) return null
  return String(n)
}
