/**
 * Perceptual image hashing utilities for card matching.
 *
 * Uses dHash (difference hash) which computes relative brightness
 * gradients — robust to minor scaling, brightness, and contrast changes.
 */

/**
 * Compute a difference hash (dHash) for an image source.
 *
 * 1. Resize to 9×8 grayscale (9 wide so we get 8 horizontal differences)
 * 2. For each pixel, compare brightness to its right neighbour
 * 3. Brighter → 1, darker → 0
 * 4. Returns a 64-character string of "0"s and "1"s
 */
export function computeDHash(source: HTMLCanvasElement | HTMLImageElement): string {
  const W = 9
  const H = 8
  const tmp = document.createElement('canvas')
  tmp.width = W
  tmp.height = H
  const ctx = tmp.getContext('2d')!
  ctx.filter = 'grayscale(1)'
  ctx.drawImage(source, 0, 0, W, H)
  ctx.filter = 'none'

  const px = ctx.getImageData(0, 0, W, H).data
  const bits: string[] = []

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      const left = px[(y * W + x) * 4]!
      const right = px[(y * W + x + 1) * 4]!
      bits.push(left > right ? '1' : '0')
    }
  }

  return bits.join('')
}

/**
 * Hamming distance between two equal-length binary hash strings.
 * Returns the number of differing bits (0 = identical, 64 = opposite).
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist
}
