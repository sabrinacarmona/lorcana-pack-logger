export interface ParsedCollectorNumber {
  /** The collector number as a string, e.g. "123" */
  cn: string
  /** Total cards in the set if found, e.g. "204" */
  total: string | null
  /** The raw matched text from the OCR output */
  raw: string
}

/**
 * Minimum set total to accept.  All Lorcana sets released so far contain 204+
 * cards, so any OCR reading with a total below this threshold is noise — e.g.
 * patterns like "4/14" that the digit-only whitelist picks up from card art,
 * rules text, or binarisation artefacts.
 */
const MIN_TOTAL = 100

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

  // Require the slash format "123/204" (with optional spaces and backslash).
  // Bare standalone digits are too ambiguous for reliable auto-matching — they
  // produce false positives from ink costs, set numbers, or OCR noise.
  const slashPattern = /(\d{1,3})\s*[\/\\]\s*(\d{2,3})/
  const slashMatch = cleaned.match(slashPattern)
  if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[0]) {
    const cn = normalise(slashMatch[1])
    const total = parseInt(slashMatch[2], 10)

    // Validate: the total must be large enough to be a real Lorcana set, and
    // the collector number must not exceed the total (e.g. reject "204/102").
    if (cn && !isNaN(total) && total >= MIN_TOTAL && parseInt(cn, 10) <= total) {
      return { cn, total: slashMatch[2], raw: slashMatch[0] }
    }
  }

  return null
}

/** Strip leading zeros and reject "0" */
function normalise(raw: string): string | null {
  const n = parseInt(raw, 10)
  if (n <= 0 || isNaN(n)) return null
  return String(n)
}
