/**
 * Image descriptor utilities for card matching.
 *
 * Uses a 3D RGB color histogram — robust to position/angle changes and
 * much more effective than spatial hashing (dHash) for matching phone
 * photos of physical cards against clean digital reference images.
 */

/** Number of bins per RGB channel.  4³ = 64 total bins. */
const BINS = 4

/** Standard size to resize images before computing descriptors. */
const SAMPLE_SIZE = 64

/**
 * Compute a 3D color histogram for an image.
 *
 * Divides the RGB colour cube into BINS³ cells and counts what fraction
 * of pixels fall into each cell.  This captures the overall colour
 * palette of the image regardless of spatial layout.
 *
 * Returns a normalised float array of length BINS³ (64) that sums to 1.
 */
export function computeColorHistogram(
  source: HTMLCanvasElement | HTMLImageElement,
): number[] {
  const tmp = document.createElement('canvas')
  tmp.width = SAMPLE_SIZE
  tmp.height = SAMPLE_SIZE
  const ctx = tmp.getContext('2d')!
  ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

  const px = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
  const totalBins = BINS * BINS * BINS
  const hist = new Array<number>(totalBins).fill(0)
  const binSize = 256 / BINS

  let pixelCount = 0
  for (let i = 0; i < px.length; i += 4) {
    const rBin = Math.min(Math.floor(px[i]! / binSize), BINS - 1)
    const gBin = Math.min(Math.floor(px[i + 1]! / binSize), BINS - 1)
    const bBin = Math.min(Math.floor(px[i + 2]! / binSize), BINS - 1)
    hist[rBin * BINS * BINS + gBin * BINS + bBin]!++
    pixelCount++
  }

  // Normalise so the histogram sums to 1
  if (pixelCount > 0) {
    for (let i = 0; i < totalBins; i++) {
      hist[i] = hist[i]! / pixelCount
    }
  }

  return hist
}

/**
 * Chi-squared distance between two normalised histograms.
 *
 * Range: 0 (identical) to ~2 (completely different).
 * More discriminative than Euclidean distance for histogram comparison.
 */
export function histogramDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    const sum = a[i]! + b[i]!
    if (sum > 1e-10) {
      const diff = a[i]! - b[i]!
      dist += (diff * diff) / sum
    }
  }
  return dist
}
