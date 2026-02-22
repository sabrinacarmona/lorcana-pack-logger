import { INK_COLOURS } from '../constants'

export interface InkDetectionResult {
  /** Best-matching ink name, or null if detection failed. */
  ink: string | null
  /** 0–1 confidence score (1 = perfect RGB match). */
  confidence: number
  /** Average RGB of the sampled region. */
  avgColor: [number, number, number]
  /** For dual-ink cards: second detected ink (if present). */
  secondaryInk: string | null
  /** All detected inks as a slash-separated string (e.g. "Sapphire/Steel"). */
  detectedInks: string[]
}

/** Pre-parsed RGB values for each ink to avoid re-parsing hex on every pixel. */
const INK_RGB: Array<{ name: string; r: number; g: number; b: number }> =
  Object.entries(INK_COLOURS).map(([name, hex]) => ({
    name,
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }))

/**
 * Maximum Euclidean distance to consider a pixel a valid ink match.
 * Pixels further than this from all known inks are ignored (noise/glare/text).
 */
const MAX_PIXEL_DIST = 120

/**
 * Minimum percentage of classified pixels an ink must claim to be reported.
 * Prevents noise from being treated as a second ink.
 */
const MIN_INK_SHARE = 0.15

/**
 * Detect the Lorcana ink colour(s) from a canvas crop of the ink region.
 *
 * Uses **per-pixel classification** instead of averaging — each pixel is
 * matched to its closest known ink colour.  The ink(s) with the most pixels
 * are returned.  This correctly handles dual-ink cards where two distinct
 * colours share the card name banner.
 *
 * Returns up to 2 inks (primary + secondary) when a dual-ink card is detected.
 */
export function detectInkColor(canvas: HTMLCanvasElement): InkDetectionResult {
  const ctx = canvas.getContext('2d')
  if (!ctx) return empty()

  const w = canvas.width
  const h = canvas.height

  // Sample the centre 50% to avoid edge noise
  const sx = Math.floor(w * 0.25)
  const sy = Math.floor(h * 0.25)
  const sw = Math.floor(w * 0.5)
  const sh = Math.floor(h * 0.5)
  if (sw <= 0 || sh <= 0) return empty()

  const imageData = ctx.getImageData(sx, sy, sw, sh)
  const pixels = imageData.data

  // ── Per-pixel classification ─────────────────────────────────────────
  // For each valid pixel, find the closest known ink and tally votes.
  const votes: Record<string, number> = {}
  for (const { name } of INK_RGB) votes[name] = 0

  let rSum = 0, gSum = 0, bSum = 0
  let totalClassified = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!

    // Skip very dark (shadow / card border) and very bright (glare) pixels
    const brightness = (r + g + b) / 3
    if (brightness < 30 || brightness > 240) continue

    // Find closest ink for this pixel
    let bestInk = ''
    let bestDist = Infinity
    for (const ink of INK_RGB) {
      const dist = Math.sqrt((r - ink.r) ** 2 + (g - ink.g) ** 2 + (b - ink.b) ** 2)
      if (dist < bestDist) {
        bestDist = dist
        bestInk = ink.name
      }
    }

    // Only count if reasonably close to a known ink
    if (bestDist <= MAX_PIXEL_DIST && bestInk) {
      votes[bestInk]!++
      totalClassified++
    }

    rSum += r
    gSum += g
    bSum += b
  }

  const totalPixels = rSum + gSum + bSum > 0
    ? Math.round((rSum + gSum + bSum) / ((rSum + gSum + bSum) / (totalClassified || 1)))
    : 0

  if (totalClassified === 0) return empty()

  const avgR = Math.round(rSum / totalClassified)
  const avgG = Math.round(gSum / totalClassified)
  const avgB = Math.round(bSum / totalClassified)

  // ── Rank inks by vote count ──────────────────────────────────────────
  const ranked = Object.entries(votes)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  if (ranked.length === 0) return empty()

  const [primaryInk, primaryVotes] = ranked[0]!
  const primaryShare = primaryVotes / totalClassified
  const primaryConfidence = primaryShare

  // Check for a secondary ink (dual-ink card detection)
  let secondaryInk: string | null = null
  const detectedInks: string[] = [primaryInk]

  if (ranked.length >= 2) {
    const [secondInk, secondVotes] = ranked[1]!
    const secondShare = secondVotes / totalClassified

    if (secondShare >= MIN_INK_SHARE) {
      secondaryInk = secondInk
      detectedInks.push(secondInk)
    }
  }

  // Confidence: for single ink, use vote share directly.
  // For dual-ink, confidence is based on the combined share of both inks.
  const confidence = secondaryInk
    ? Math.min(1, (primaryVotes + (votes[secondaryInk] || 0)) / totalClassified)
    : primaryConfidence

  // Suppress false-positive: if not enough pixels to be meaningful
  void totalPixels

  return {
    ink: primaryInk,
    confidence,
    avgColor: [avgR, avgG, avgB],
    secondaryInk,
    detectedInks,
  }
}

function empty(): InkDetectionResult {
  return { ink: null, confidence: 0, avgColor: [0, 0, 0], secondaryInk: null, detectedInks: [] }
}
