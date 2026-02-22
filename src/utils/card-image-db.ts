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
const BATCH_SIZE = 10

export class CardImageDB {
  private entries: CardHashEntry[] = []
  private _loadedCount = 0
  private _totalCount = 0
  private aborted = false

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

    const withImages = cards.filter(c => c.imageUrl)
    this._totalCount = withImages.length

    for (let i = 0; i < withImages.length; i += BATCH_SIZE) {
      if (this.aborted) break

      const batch = withImages.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(card => this.loadAndHash(card)),
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

  private async loadAndHash(card: Card): Promise<CardHashEntry | null> {
    try {
      const img = await this.loadImage(card.imageUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return { card, hash: computeDHash(canvas) }
    } catch {
      return null
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      img.src = url
    })
  }
}
