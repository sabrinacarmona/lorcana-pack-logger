export interface ParsedCollectorNumber {
  /** The collector number as a string, e.g. "123" */
  cn: string
  /** Total cards in the set if found, e.g. "204" */
  total: string | null
  /** Set number parsed from the footer (e.g. "7" from "130/204 · EN · 7"), or null. */
  setNumber: string | null
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
 * Extract a collector number (and optionally the set number) from raw OCR text.
 *
 * Lorcana cards print the collector info in the format:
 *     130/204 · EN · 7
 * where 130 is the collector number, 204 is the set total, EN is the language,
 * and 7 is the set number.
 *
 * The set number is critical for disambiguation — CN 130 may exist in every
 * set, but CN 130 + set 7 uniquely identifies one card.
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
      // ── Extract set number from CLEANED text with letter-isolation ─────
      // We use the *cleaned* text so that OCR confusions like I→1 are resolved
      // (critical for set 1, where OCR often reads "1" as "I" or "l").
      // To avoid false positives from "EN" → the N/E stay unchanged but we
      // need to skip digits that are adjacent to letters (like "1" in "E1"
      // if "I" was converted).  The isolation regex requires a non-letter
      // (or string boundary) on both sides of the digit group.
      let setNumber: string | null = null
      const matchEnd = (slashMatch.index ?? 0) + slashMatch[0].length
      const afterCn = cleaned.substring(matchEnd, matchEnd + 30)
      const digitMatches = [...afterCn.matchAll(/(?:^|[^A-Za-z])(\d{1,2})(?:[^A-Za-z]|$)/g)]

      if (digitMatches.length > 0 && digitMatches[0] && digitMatches[0][1]) {
        const sn = parseInt(digitMatches[0][1], 10)
        // Reasonable set number range (Lorcana sets 1–20+)
        if (sn >= 1 && sn <= 30) {
          setNumber = String(sn)
        }
      }

      return { cn, total: slashMatch[2], setNumber, raw: slashMatch[0] }
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
