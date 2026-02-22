import type { Card } from '../types'

export interface CnMatchResult {
  /** The best-matching card, or null if no match found. */
  card: Card | null
  /** Additional candidates when the same collector number appears in multiple sets. */
  candidates: Card[]
  /** 1.0 for an exact collector-number match, 0 for no match. */
  similarity: number
}

/**
 * Match a card by its collector number, set number, and optionally ink colour.
 *
 * Narrowing priority:
 * 1. Set filter (if active) — exact set code match
 * 2. Set total (from "102/204") — exclude sets with wrong card count
 * 3. Set number (from "EN · 7") — the set code printed on the card footer
 * 4. Ink colour — per-pixel detection of the card's ink
 *
 * The set number (step 3) is the most reliable disambiguator since it's
 * printed directly on the card and read by OCR alongside the collector number.
 */

/**
 * Check whether any detected ink matches any of a card's inks.
 * Handles both mono-ink ("Amber") and dual-ink ("Sapphire/Steel") formats.
 */
function inkOverlaps(cardInk: string, detectedInks: string[]): boolean {
  if (!cardInk || detectedInks.length === 0) return false
  const cardInks = cardInk.split('/')
  return cardInks.some((ci) => detectedInks.includes(ci))
}

export function matchCardByCollectorNumber(
  cn: string,
  cards: Card[],
  setFilter: string,
  total?: string | null,
  detectedInk?: string | null,
  /** All detected inks from the per-pixel classifier (e.g. ["Sapphire", "Steel"]). */
  detectedInks?: string[],
  /** Set number parsed from the card footer (e.g. "7" from "EN · 7"). */
  setNumber?: string | null,
): CnMatchResult {
  if (!cn) return { card: null, candidates: [], similarity: 0 }

  const pool = setFilter !== 'all'
    ? cards.filter((c) => c.setCode === setFilter)
    : cards

  let matches = pool.filter((c) => c.cn === cn)

  // ── Narrow by set total ───────────────────────────────────────────────
  // When set filter is "all" and we parsed the total (e.g. "204" from
  // "102/204"), narrow to sets that actually contain a card numbered at the
  // total.  A set with 204 regular cards will have a card whose cn === "204",
  // so this reliably identifies the right set(s).
  if (total && setFilter === 'all' && matches.length > 1) {
    const totalStr = String(parseInt(total, 10))   // strip leading zeros
    if (totalStr !== 'NaN') {
      const setsWithTotal = new Set<string>()
      for (const card of cards) {
        if (card.cn === totalStr) {
          setsWithTotal.add(card.setCode)
        }
      }
      if (setsWithTotal.size > 0) {
        const narrowed = matches.filter((c) => setsWithTotal.has(c.setCode))
        if (narrowed.length > 0) {
          matches = narrowed
        }
      }
    }
  }

  // ── Narrow by set number (from OCR: "EN · 7" → setNumber = "7") ──────
  // This is the most reliable disambiguator: the set number is printed on
  // the card and directly matches the set code in the database.
  if (setNumber && matches.length > 1) {
    const setNarrow = matches.filter((c) => c.setCode === setNumber)
    if (setNarrow.length > 0) {
      matches = setNarrow
    }
  }

  // ── Narrow by ink colour ──────────────────────────────────────────────
  // When we still have multiple matches, try narrowing by detected ink colour.
  // Uses inkOverlaps() to handle dual-ink cards (e.g. "Sapphire/Steel")
  // and multiple detected inks from per-pixel classification.
  const allDetectedInks = detectedInks && detectedInks.length > 0
    ? detectedInks
    : detectedInk ? [detectedInk] : []

  if (allDetectedInks.length > 0 && matches.length > 1) {
    const inkNarrow = matches.filter((c) => inkOverlaps(c.ink, allDetectedInks))
    if (inkNarrow.length > 0) {
      matches = inkNarrow
    }
  }

  if (matches.length === 1) {
    return { card: matches[0] ?? null, candidates: [], similarity: 1 }
  }

  if (matches.length > 1) {
    // Same cn in multiple sets (or multiple versions within a set) — disambiguate
    return { card: null, candidates: matches.slice(0, 6), similarity: 1 }
  }

  return { card: null, candidates: [], similarity: 0 }
}
