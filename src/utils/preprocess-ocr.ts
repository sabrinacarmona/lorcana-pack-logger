/**
 * Image preprocessing pipeline for OCR accuracy.
 *
 * Lorcana collector numbers ("130/204 · EN · 7") are tiny text at the bottom
 * of each card — typically only 10-15px tall in the raw camera crop.  Tesseract
 * can't read text that small reliably and hallucinates random digits from
 * texture patterns.
 *
 * This module converts to grayscale, auto-inverts if the background is dark
 * (light text on dark card border), and binarizes using Otsu's method.
 * The caller handles upscaling via drawImage before calling this function.
 * The result is clean black text on white background — well within Tesseract's
 * comfort zone.
 */

/** Metadata returned from preprocessing for diagnostics. */
export interface PreprocessInfo {
  /** Whether the image was inverted (dark bg detected). */
  inverted: boolean
  /** Otsu threshold value used for binarization (0-255). */
  threshold: number
  /** Average brightness before inversion (0-255). */
  avgBrightness: number
}

/**
 * Preprocess a canvas in-place for OCR: grayscale → auto-invert → Otsu binarize.
 *
 * The canvas should already be drawn at the desired scale (caller handles
 * upscaling via drawImage).  This function modifies pixels in-place.
 */
export function preprocessForOcr(canvas: HTMLCanvasElement): PreprocessInfo {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { inverted: false, threshold: 128, avgBrightness: 128 }

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const pixelCount = width * height

  // ── 1. Convert to grayscale ──────────────────────────────────────────
  const gray = new Uint8Array(pixelCount)
  let totalBrightness = 0
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4
    // ITU-R BT.601 luma — use bitwise OR 0 for fast float→int
    const r = data[off] ?? 0
    const g = data[off + 1] ?? 0
    const b = data[off + 2] ?? 0
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) | 0
    gray[i] = luma
    totalBrightness += luma
  }

  // ── 2. Auto-invert if background is dark ─────────────────────────────
  // Lorcana cards often have light text on a dark card border at the bottom.
  // Tesseract expects dark text on light background, so we invert if needed.
  const avgBrightness = totalBrightness / pixelCount
  const inverted = avgBrightness < 128
  if (inverted) {
    for (let i = 0; i < pixelCount; i++) {
      gray[i] = 255 - (gray[i] ?? 0)
    }
  }

  // ── 3. Otsu's binarization threshold ─────────────────────────────────
  const threshold = otsuThreshold(gray)

  // ── 4. Apply binary threshold ────────────────────────────────────────
  for (let i = 0; i < pixelCount; i++) {
    const bw = (gray[i] ?? 0) > threshold ? 255 : 0
    const off = i * 4
    data[off] = bw
    data[off + 1] = bw
    data[off + 2] = bw
    data[off + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  return { inverted, threshold, avgBrightness: Math.round(avgBrightness) }
}

/**
 * Otsu's method — find the threshold that maximises inter-class variance.
 *
 * This automatically picks the best split between "background" and "text"
 * pixels regardless of the overall brightness distribution.
 */
function otsuThreshold(gray: Uint8Array): number {
  // Build histogram
  const hist = new Uint32Array(256)
  for (const val of gray) hist[val] = (hist[val] ?? 0) + 1

  const total = gray.length
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * (hist[i] ?? 0)

  let bestThresh = 128
  let bestVariance = 0
  let w0 = 0
  let sum0 = 0

  for (let t = 0; t < 256; t++) {
    w0 += hist[t] ?? 0
    if (w0 === 0) continue
    const w1 = total - w0
    if (w1 === 0) break

    sum0 += t * (hist[t] ?? 0)
    const m0 = sum0 / w0
    const m1 = (sumAll - sum0) / w1
    const between = w0 * w1 * (m0 - m1) * (m0 - m1)

    if (between > bestVariance) {
      bestVariance = between
      bestThresh = t
    }
  }

  return bestThresh
}
