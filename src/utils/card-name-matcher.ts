import type { Card } from '../types'
import { levenshtein } from './search'

export interface NameMatchResult {
  /** Best-matching card, or null if no match meets the threshold */
  card: Card | null
  /** Additional candidates when the top match is ambiguous (same name, different version/set) */
  candidates: Card[]
  /** Normalised similarity score of the best match (0 = no match, 1 = exact) */
  similarity: number
}

/** Minimum similarity (0-1) to consider a match valid.
 *  0.75 requires ~75 % of the characters to be correct — strict enough to
 *  reject OCR garbage while still tolerating a few misreads. */
const AUTO_MATCH_THRESHOLD = 0.75

/** If the gap between #1 and #2 is smaller than this, treat as ambiguous. */
const AMBIGUITY_GAP = 0.1

/**
 * Match OCR text against card names using Levenshtein distance.
 *
 * Returns the best match and any disambiguation candidates.  When the
 * set filter is active, only cards from that set are considered.
 */
export function matchCardByName(
  ocrText: string,
  cards: Card[],
  setFilter: string,
): NameMatchResult {
  const noMatch: NameMatchResult = { card: null, candidates: [], similarity: 0 }

  const cleaned = cleanOcrText(ocrText)
  if (cleaned.length < 4) return noMatch

  const pool = setFilter !== 'all'
    ? cards.filter((c) => c.setCode === setFilter)
    : cards

  if (pool.length === 0) return noMatch

  // Score every card and keep the best matches
  const scored: { card: Card; sim: number }[] = []

  for (const card of pool) {
    // Compare against both name-only and full display (name – version)
    const simName = similarity(cleaned, card.name.toLowerCase())
    const simDisplay = similarity(cleaned, card.display.toLowerCase())
    const sim = Math.max(simName, simDisplay)

    if (sim >= AUTO_MATCH_THRESHOLD) {
      scored.push({ card, sim })
    }
  }

  if (scored.length === 0) return noMatch

  // Sort descending by similarity
  scored.sort((a, b) => b.sim - a.sim)

  const best = scored[0]!
  const second = scored[1]

  // Check if the top results are ambiguous (very close scores)
  // This handles cases like "Ariel" matching multiple versions across sets
  if (second && best.sim - second.sim < AMBIGUITY_GAP) {
    // Collect all candidates within the ambiguity gap
    const candidates = scored
      .filter((s) => best.sim - s.sim < AMBIGUITY_GAP)
      .map((s) => s.card)
      .slice(0, 4)

    return { card: null, candidates, similarity: best.sim }
  }

  return { card: best.card, candidates: [], similarity: best.sim }
}

/**
 * Compute normalised similarity between two strings (0-1).
 * 1 means identical, 0 means completely different.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * Clean OCR output for card name matching.
 * Strips non-alphabetic noise, collapses whitespace, lowercases.
 */
function cleanOcrText(raw: string): string {
  return raw
    .replace(/[^a-zA-Z\s'-]/g, '') // keep letters, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
