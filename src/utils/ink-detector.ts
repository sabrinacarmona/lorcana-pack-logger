import { INK_COLOURS } from '../constants'

export interface InkDetectionResult {
  /** Best-matching ink name, or null if detection failed. */
  ink: string | null
  /** 0–1 confidence score (1 = perfect RGB match). */
  confidence: number
  /** Average RGB of the sampled region. */
  avgColor: [number, number, number]
}

/**
 * Minimum colour saturation (max-min channel spread) to consider a pixel
 * "chromatic".  Steel is grey, so when saturation is very low we still allow
 * it — but we penalise its confidence when saturation is *high* (meaning the
 * dot is actually coloured, not grey).
 */
const MIN_SATURATION_FOR_COLOR = 25

/**
 * Detect the Lorcana ink colour from a canvas crop of the ink dot region.
 *
 * Samples the centre 50 % of the canvas, computes the average RGB (ignoring
 * very dark / very bright outliers), then picks the closest ink via Euclidean
 * distance in RGB space.
 */
export function detectInkColor(canvas: HTMLCanvasElement): InkDetectionResult {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ink: null, confidence: 0, avgColor: [0, 0, 0] }

  const w = canvas.width
  const h = canvas.height

  // Sample the centre 50 % to avoid edge noise
  const sx = Math.floor(w * 0.25)
  const sy = Math.floor(h * 0.25)
  const sw = Math.floor(w * 0.5)
  const sh = Math.floor(h * 0.5)
  if (sw <= 0 || sh <= 0) return { ink: null, confidence: 0, avgColor: [0, 0, 0] }

  const imageData = ctx.getImageData(sx, sy, sw, sh)
  const pixels = imageData.data

  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!

    // Skip very dark (shadow / card border) and very bright (glare) pixels
    const brightness = (r + g + b) / 3
    if (brightness < 30 || brightness > 240) continue

    rSum += r
    gSum += g
    bSum += b
    count++
  }

  if (count === 0) return { ink: null, confidence: 0, avgColor: [0, 0, 0] }

  const avgR = Math.round(rSum / count)
  const avgG = Math.round(gSum / count)
  const avgB = Math.round(bSum / count)

  // Find closest ink by Euclidean distance
  let bestInk: string | null = null
  let bestDist = Infinity

  for (const [inkName, hex] of Object.entries(INK_COLOURS)) {
    const ir = parseInt(hex.slice(1, 3), 16)
    const ig = parseInt(hex.slice(3, 5), 16)
    const ib = parseInt(hex.slice(5, 7), 16)
    const dist = Math.sqrt((avgR - ir) ** 2 + (avgG - ig) ** 2 + (avgB - ib) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      bestInk = inkName
    }
  }

  const maxDist = 200
  const confidence = Math.max(0, 1 - bestDist / maxDist)

  // Steel is grey — if the actual pixel saturation is high, it's probably a
  // coloured ink mis-matched as Steel, so penalise confidence.
  const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)
  if (bestInk === 'Steel' && saturation > MIN_SATURATION_FOR_COLOR * 2) {
    return { ink: bestInk, confidence: confidence * 0.5, avgColor: [avgR, avgG, avgB] }
  }

  return { ink: bestInk, confidence, avgColor: [avgR, avgG, avgB] }
}
