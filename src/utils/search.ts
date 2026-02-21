import type { Card } from '../types'

export interface ScoredCard {
  card: Card
  score: number
}

/**
 * Compute the Levenshtein (edit) distance between two strings.
 * Returns the minimum number of single-character edits (insert, delete,
 * substitute) needed to transform `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // Single-row DP — only need the previous row to compute the current one
  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j]! + 1,      // deletion
        curr[j - 1]! + 1,  // insertion
        prev[j - 1]! + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]!
}

/**
 * Multi-token fuzzy search with scoring.
 * Matches against card display name, set name, and collector number.
 * Supports #number search and bare number collector number matching.
 */
export function searchCards(
  query: string,
  cards: Card[],
  setFilter: string,
): Card[] {
  const q = query.toLowerCase().trim()
  if (!q || cards.length === 0) return []

  const tokens = q.split(/\s+/)
  const filtered =
    setFilter !== 'all'
      ? cards.filter((c) => c.setCode === setFilter)
      : cards

  const scored: ScoredCard[] = []

  for (let i = 0; i < filtered.length; i++) {
    const card = filtered[i]!
    const d = card.display.toLowerCase()
    const cn = card.cn.toLowerCase()
    const combined = d + ' ' + card.setName.toLowerCase() + ' ' + cn
    let allMatch = true
    let score = 0

    // v1.1.0: Check if query is a bare number with set filter active
    const isBareNumber = setFilter !== 'all' && /^\d+$/.test(q)

    for (let j = 0; j < tokens.length; j++) {
      const t = tokens[j]!
      // Support #number search
      if (t.charAt(0) === '#' && t.length > 1 && cn === t.substring(1)) {
        score += 50
      } else if (isBareNumber && cn === q) {
        // v1.1.0: Bare number matches collector number exactly when set filter is active
        score += 100
      } else if (combined.indexOf(t) >= 0) {
        if (d.indexOf(t) === 0) score += 10
        else if (d.indexOf(t) >= 0) score += 5
        else score += 1
      } else {
        allMatch = false
        break
      }
    }

    if (allMatch) {
      if (d.indexOf(q) === 0) score += 20
      scored.push({ card, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 20).map((s) => s.card)
}
