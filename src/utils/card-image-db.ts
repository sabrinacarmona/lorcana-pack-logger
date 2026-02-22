/**
 * Card Image Database — builds a colour-histogram index of card images
 * and matches camera frames against it.
 *
 * Uses 3D RGB colour histograms instead of spatial hashing (dHash).
 * Colour histograms are position-invariant and much more robust for
 * matching phone photos of physical cards against digital references.
 *
 * Usage:
 *   const db = new CardImageDB()
 *   await db.build(cards, onProgress)
 *   const result = db.findMatch(cameraFrameCanvas)
 */

import { computeColorHistogram, histogramDistance } from './image-hash'
import type { Card } from '../types'

interface CardHistEntry {
  card: Card
  hist: number[]
}

export interface ImageMatchResult {
  card: Card | null
  candidates: Card[]
  bestDistance: number
  dbSize: number
}

/**
 * Chi-squared distance thresholds (range ~0–2):
 * ≤ AUTO_MATCH  → instant match (strong confidence)
 * ≤ DISAMBIG    → show disambiguation with close candidates
 * > DISAMBIG    → no match
 *
 * These are initial guesses — the debug panel shows live distances
 * so we can tune based on real-world testing.
 */
const AUTO_MATCH_THRESHOLD = 0.35
const DISAMBIG_THRESHOLD = 0.65

/** How many images to load concurrently. */
const BATCH_SIZE = 8

/** Timeout per image load (ms). */
const IMAGE_TIMEOUT = 8000

/**
 * CORS proxy used when direct image loading fails.
 * The Lorcast CDN doesn't serve CORS headers, so we need this to
 * draw card images to canvas and read pixel data for histograms.
 */
const CORS_PROXY = 'https://corsproxy.io/?'

export class CardImageDB {
  private entries: CardHistEntry[] = []
  private _loadedCount = 0
  private _totalCount = 0
  private aborted = false

  /**
   * Whether direct CORS loading failed and we've switched to proxy.
   * Detected automatically on first image — avoids N failed requests.
   */
  private useProxy = false

  get loadedCount(): number { return this._loadedCount }
  get totalCount(): number { return this._totalCount }
  get isReady(): boolean { return this._loadedCount > 0 }

  /**
   * Load card images and compute colour histograms.
   * Loads in batches to avoid saturating the network.
   * Calls `onProgress` after each batch completes.
   */
  async build(
    cards: Card[],
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    this.abort()
    this.entries = []
    this._loadedCount = 0
    this.aborted = false
    this.useProxy = false

    const withImages = cards.filter(c => c.imageUrl)
    this._totalCount = withImages.length

    if (withImages.length === 0) return

    // ── Detect CORS support on the first image ──────────────────────
    const firstCard = withImages[0]!
    try {
      const entry = await this.loadAndCompute(firstCard, false)
      if (entry) {
        this.entries.push(entry)
        this._loadedCount++
      }
    } catch {
      // Direct CORS blocked — switch to proxy for all images
      this.useProxy = true
      try {
        const entry = await this.loadAndCompute(firstCard, true)
        if (entry) {
          this.entries.push(entry)
          this._loadedCount++
        }
      } catch {
        // Even proxy failed — continue anyway
      }
    }

    onProgress?.(this._loadedCount, this._totalCount)

    // ── Load remaining images in batches ─────────────────────────────
    const remaining = withImages.slice(1)

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      if (this.aborted) break

      const batch = remaining.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(card => this.loadAndCompute(card, this.useProxy)),
      )

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          this.entries.push(r.value)
          this._loadedCount++
        }
      }

      onProgress?.(this._loadedCount, this._totalCount)
    }
  }

  /**
   * Find the best matching card for a camera frame canvas.
   */
  findMatch(frameCanvas: HTMLCanvasElement): ImageMatchResult {
    if (this.entries.length === 0) {
      return { card: null, candidates: [], bestDistance: Infinity, dbSize: 0 }
    }

    const frameHist = computeColorHistogram(frameCanvas)

    // Score all entries by chi-squared distance
    const scored = this.entries
      .map(e => ({ card: e.card, dist: histogramDistance(frameHist, e.hist) }))
      .sort((a, b) => a.dist - b.dist)

    const best = scored[0]!

    // Strong match — auto-accept
    if (best.dist <= AUTO_MATCH_THRESHOLD) {
      return {
        card: best.card,
        candidates: [],
        bestDistance: best.dist,
        dbSize: this.entries.length,
      }
    }

    // Weak match — show disambiguation
    if (best.dist <= DISAMBIG_THRESHOLD) {
      const close = scored
        .filter(s => s.dist <= DISAMBIG_THRESHOLD * 1.15)
        .slice(0, 6)

      if (close.length === 1) {
        return {
          card: close[0]!.card,
          candidates: [],
          bestDistance: best.dist,
          dbSize: this.entries.length,
        }
      }

      return {
        card: null,
        candidates: close.map(c => c.card),
        bestDistance: best.dist,
        dbSize: this.entries.length,
      }
    }

    // No match
    return {
      card: null,
      candidates: [],
      bestDistance: best.dist,
      dbSize: this.entries.length,
    }
  }

  abort(): void {
    this.aborted = true
  }

  clear(): void {
    this.abort()
    this.entries = []
    this._loadedCount = 0
    this._totalCount = 0
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async loadAndCompute(card: Card, viaProxy: boolean): Promise<CardHistEntry | null> {
    const url = viaProxy
      ? `${CORS_PROXY}${encodeURIComponent(card.imageUrl)}`
      : card.imageUrl

    const img = await this.loadImageElement(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    // Verify we can actually read pixels (detects tainted canvas)
    ctx.getImageData(0, 0, 1, 1)

    return { card, hist: computeColorHistogram(canvas) }
  }

  private loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const timer = setTimeout(() => {
        reject(new Error('Image load timeout'))
      }, IMAGE_TIMEOUT)

      img.onload = () => {
        clearTimeout(timer)
        resolve(img)
      }
      img.onerror = () => {
        clearTimeout(timer)
        reject(new Error('Image load failed'))
      }
      img.src = url
    })
  }
}
