import { SET_COLOURS } from '../constants/sets'

/**
 * Deterministic colour generation from a set ID.
 * Uses a simple string hash to produce a stable HSL hue,
 * with fixed saturation and lightness for readability on dark backgrounds.
 */
function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

export function generateSetColour(setId: string): string {
  const hue = hashToHue(setId)
  return `hsl(${hue}, 55%, 55%)`
}

/**
 * Returns the accent colour for a set.
 * Uses the hardcoded override if available, otherwise generates deterministically.
 */
export function getSetColour(setId: string): string {
  return SET_COLOURS[setId] ?? generateSetColour(setId)
}
