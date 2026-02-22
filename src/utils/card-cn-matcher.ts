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
 * Match a card by its collector number.
 *
 * When a set filter is active, collector number + set code uniquely identify a
 * card — giving us a 100 % exact match with no fuzzy logic.  When set filter
 * is "all", the same collector number may exist in multiple sets, so we use
 * the `total` (from "102/204") to narrow down to sets whose card count matches,
 * and only fall back to disambiguation if multiple sets still qualify.
 */
export function matchCardByCollectorNumber(
  cn: string,
  cards: Card[],
  setFilter: string,
  total?: string | null,
): CnMatchResult {
  if (!cn) return { card: null, candidates: [], similarity: 0 }

  const pool = setFilter !== 'all'
    ? cards.filter((c) => c.setCode === setFilter)
    : cards

  let matches = pool.filter((c) => c.cn === cn)

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

  if (matches.length === 1) {
    return { card: matches[0] ?? null, candidates: [], similarity: 1 }
  }

  if (matches.length > 1) {
    // Same cn in multiple sets (or multiple versions within a set) — disambiguate
    return { card: null, candidates: matches.slice(0, 6), similarity: 1 }
  }

  return { card: null, candidates: [], similarity: 0 }
}
