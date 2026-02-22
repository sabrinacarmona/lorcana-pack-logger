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
 * is "all", the same collector number may exist in multiple sets, so we return
 * disambiguation candidates when there is more than one hit.
 */
export function matchCardByCollectorNumber(
  cn: string,
  cards: Card[],
  setFilter: string,
): CnMatchResult {
  if (!cn) return { card: null, candidates: [], similarity: 0 }

  const pool = setFilter !== 'all'
    ? cards.filter((c) => c.setCode === setFilter)
    : cards

  const matches = pool.filter((c) => c.cn === cn)

  if (matches.length === 1) {
    return { card: matches[0] ?? null, candidates: [], similarity: 1 }
  }

  if (matches.length > 1) {
    // Same cn in multiple sets (or multiple versions within a set) — disambiguate
    return { card: null, candidates: matches.slice(0, 4), similarity: 1 }
  }

  return { card: null, candidates: [], similarity: 0 }
}
