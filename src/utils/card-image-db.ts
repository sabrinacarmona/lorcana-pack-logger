/**
 * Card Image Database — builds a perceptual hash index of card images
 * and matches camera frames against it.
 *
 * Usage:
 *   const db = new CardImageDB()
 *   await db.build(cards, onProgress)
 *   const result = db.findMatch(cameraFrameCanvas)
 */

import { computeDHash, hammingDistance } from './image-hash'
import type { Card } from '../types'

interface CardHashEntry {
  card: Card
  hash: string
}

export interface ImageMatchResult {
  card: Card | null
  candidates: Card[]
  bestDistance: number
  dbSize: number
}

/**
 * Hamming-distance thresholds (out of 64 bits):
 * ≤ AUTO_MATCH  → instant match (strong confidence)
 * ≤ DISAMBIG    → show disambiguation with close candidates
 * > DISAMBIG    → no match
 */
const AUTO_MATCH_THRESHOLD = 14
const DISAMBIG_THRESHOLD = 22

/** How many images to load concurrently. */
const BATCH_SIZE = 8

/** Timeout per image load (ms). */
const IMAGE_TIMEOUT = 8000

/**
 * CORS proxy used when direct image loading fails.
 * The Lorcast CDN doesn't serve CORS headers, so we need this to
 * draw card images to canvas and read pixel data for hashing.
 */
const CORS_PROXY = 'https://corsproxy.io/?'

export class CardImageDB {
  private entries: CardHashEntry[] = []
  private _loadedCount = 0
  private _totalCount = 0
  private aborted = false

  /**
   * Whether direct CORS loading failed and we've switched to proxy.
   * Detected automatically on first image — avoids 2000+ failed requests.
   */
  private useProxy = false

  get loadedCount(): number { return this._loadedCount }
  get totalCount(): number { return this._totalCount }
  get isReady(): boolean { return this._loadedCount > 0 }

  /**
   * Load card images and compute perceptual hashes.
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
      const entry = await this.loadAndHash(firstCard, false)
      if (entry) {
        this.entries.push(entry)
        this._loadedCount++
      }
      // Direct CORS works!
    } catch {
      // Direct CORS blocked — switch to proxy for all images
      this.useProxy = true
      try {
        const entry = await this.loadAndHash(firstCard, true)
        if (entry) {
          this.entries.push(entry)
          this._loadedCount++
        }
      } catch {
        // Even proxy failed — continue anyway, some images may work
      }
    }

    onProgress?.(this._loadedCount, this._totalCount)

    // ── Load remaining images in batches ─────────────────────────────
    const remaining = withImages.slice(1)

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      if (this.aborted) break

      const batch = remaining.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(card => this.loadAndHash(card, this.useProxy)),
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

    const frameHash = computeDHash(frameCanvas)

    // Score all entries by Hamming distance
    const scored = this.entries
      .map(e => ({ card: e.card, dist: hammingDistance(frameHash, e.hash) }))
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
        .filter(s => s.dist <= DISAMBIG_THRESHOLD + 4)
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

  private async loadAndHash(card: Card, viaProxy: boolean): Promise<CardHashEntry | null> {
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

    return { card, hash: computeDHash(canvas) }
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
