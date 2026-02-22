import { useState, useRef, useCallback, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { CardImageDB } from '../utils/card-image-db'

/** How often to capture a frame and run image matching (ms). */
const FRAME_INTERVAL = 400

/** How long to prevent re-scanning the same card (ms). */
const COOLDOWN_MS = 2000

/** How long to show the "matched" state before resuming scanning (ms). */
const MATCH_DISPLAY_MS = 1500

interface UseScannerOptions {
  cards: Card[]
  setFilter: string
  onCardMatched: (card: Card) => void
}

export type MatchMethod = 'image' | null

export interface ScannerDebugInfo {
  videoRes: string
  dbLoaded: number
  dbTotal: number
  bestDist: number
  bestName: string
}

/** Data URLs of captured frame regions for visual debugging. */
export interface DebugCaptures {
  /** Full uncropped camera frame. */
  fullFrame: string
  /** The crop currently sent to the matching algorithm. */
  algoCrop: string
  /** Bottom ~15% of the card area — where the collector number lives. */
  cnRegion: string
  /** Bottom-left corner — where the ink colour dot lives. */
  inkDotRegion: string
  /** Dimensions of the raw video feed. */
  videoRes: string
}

export interface UseScannerReturn {
  scannerActive: boolean
  scannerState: ScannerState
  lastMatch: Card | null
  matchMethod: MatchMethod
  candidates: Card[]
  error: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  scanCount: number
  debugInfo: ScannerDebugInfo | null
  debugCaptures: DebugCaptures | null
  openScanner: () => void
  closeScanner: () => void
  selectCandidate: (card: Card) => void
  captureDebugFrame: () => void
  dismissDebugCaptures: () => void
}

export function useScanner({ cards, setFilter, onCardMatched }: UseScannerOptions): UseScannerReturn {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [lastMatch, setLastMatch] = useState<Card | null>(null)
  const [matchMethod, setMatchMethod] = useState<MatchMethod>(null)
  const [candidates, setCandidates] = useState<Card[]>([])
  const [error, setError] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<ScannerDebugInfo | null>(null)
  const [debugCaptures, setDebugCaptures] = useState<DebugCaptures | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cooldownRef = useRef<Map<string, number>>(new Map())
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  // Image matching database
  const imageDbRef = useRef<CardImageDB>(new CardImageDB())

  // Keep callbacks in refs so the interval captures the latest values
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const setFilterRef = useRef(setFilter)
  setFilterRef.current = setFilter
  const onCardMatchedRef = useRef(onCardMatched)
  onCardMatchedRef.current = onCardMatched

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current)
      matchTimeoutRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    imageDbRef.current.abort()
    processingRef.current = false
  }, [])

  /** Accept a card as the final match (used for both auto-match and disambiguation). */
  const acceptMatch = useCallback((card: Card) => {
    const key = `${card.setCode}-${card.cn}`
    cooldownRef.current.set(key, Date.now())
    setLastMatch(card)
    setCandidates([])
    setScannerState('matched')
    setScanCount((c) => c + 1)
    onCardMatchedRef.current(card)

    // Return to streaming after the match display period
    matchTimeoutRef.current = setTimeout(() => {
      setScannerState('streaming')
      setLastMatch(null)
    }, MATCH_DISPLAY_MS)
  }, [])

  /** User taps a candidate during disambiguation. */
  const selectCandidate = useCallback((card: Card) => {
    acceptMatch(card)
  }, [acceptMatch])

  /**
   * Capture the current camera frame and extract labelled regions as data URLs.
   * This is the "see what the algorithm sees" debug tool.
   */
  const captureDebugFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState < 2) return

    const video = videoRef.current
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) return

    const snap = document.createElement('canvas')
    const sCtx = snap.getContext('2d')
    if (!sCtx) return

    // Helper: crop a region from the video and return a data URL
    const cropToDataUrl = (
      xPct: number, yPct: number, wPct: number, hPct: number,
    ): string => {
      const sx = Math.floor(vw * xPct)
      const sy = Math.floor(vh * yPct)
      const sw = Math.floor(vw * wPct)
      const sh = Math.floor(vh * hPct)
      snap.width = sw
      snap.height = sh
      sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
      return snap.toDataURL('image/jpeg', 0.85)
    }

    // 1. Full uncropped frame
    snap.width = vw
    snap.height = vh
    sCtx.drawImage(video, 0, 0)
    const fullFrame = snap.toDataURL('image/jpeg', 0.7)

    // 2. Algo crop — exactly what processFrame sends to matching
    //    (must match the percentages in processFrame below)
    const algoCrop = cropToDataUrl(0.18, 0.20, 0.64, 0.58)

    // 3. Collector number region — bottom ~12% of the guide frame area
    //    Guide frame: left 12%, right 12%, top 15%, bottom 18%
    //    CN text sits at very bottom of card: roughly 70%-82% of viewport height
    const cnRegion = cropToDataUrl(0.15, 0.68, 0.70, 0.12)

    // 4. Ink dot — bottom-left corner of card
    //    The ink dot is a small circle near bottom-left, roughly:
    //    x: 14%-26%, y: 72%-82% of viewport
    const inkDotRegion = cropToDataUrl(0.14, 0.70, 0.14, 0.12)

    setDebugCaptures({
      fullFrame,
      algoCrop,
      cnRegion,
      inkDotRegion,
      videoRes: `${vw}×${vh}`,
    })
  }, [])

  const dismissDebugCaptures = useCallback(() => {
    setDebugCaptures(null)
  }, [])

  /**
   * processFrame — currently disabled.
   *
   * The histogram-based image matching has been proven unable to distinguish
   * same-ink Lorcana cards (see scripts/histogram-experiment.ts).
   * Keeping the frame loop alive so the camera stays on for debug captures,
   * but not running any matching until we have a viable approach.
   */
  const processFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState < 2) return

    const video = videoRef.current
    const vw = video.videoWidth
    const vh = video.videoHeight

    // Just update resolution info — no matching
    setDebugInfo({
      videoRes: `${vw}x${vh}`,
      dbLoaded: 0,
      dbTotal: 0,
      bestDist: Infinity,
      bestName: 'matching disabled',
    })
  }, [])

  const openScanner = useCallback(async () => {
    setError(null)
    setLastMatch(null)
    setMatchMethod(null)
    setCandidates([])
    setScanCount(0)
    setDebugInfo(null)
    cooldownRef.current.clear()
    setScannerState('requesting')

    try {
      // ── Start camera ───────────────────────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setScannerState('streaming')

      // ── Image DB build disabled ────────────────────────────────────
      // Histogram matching proven non-viable (see scripts/histogram-experiment.ts).
      // Camera runs for debug capture only — no image DB needed.

      // ── Start frame capture loop (for debug info only) ─────────────
      intervalRef.current = setInterval(() => {
        processFrame()
      }, FRAME_INTERVAL)
    } catch (err) {
      let message = 'Could not access camera. Please try again.'
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            message = 'Camera access was denied. Enable it in your browser settings.'
            break
          case 'NotFoundError':
            message = 'No camera found on this device.'
            break
          case 'NotReadableError':
            message = 'Camera is in use by another app.'
            break
        }
      }
      setError(message)
      setScannerState('error')
    }
  }, [])

  const closeScanner = useCallback(() => {
    stopStream()
    imageDbRef.current.clear()
    setScannerState('idle')
    setLastMatch(null)
    setMatchMethod(null)
    setCandidates([])
    setError(null)
    setDebugInfo(null)
    setDebugCaptures(null)
    processingRef.current = false
  }, [stopStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      imageDbRef.current.clear()
    }
  }, [stopStream])

  return {
    scannerActive: scannerState !== 'idle',
    scannerState,
    lastMatch,
    matchMethod,
    candidates,
    error,
    videoRef,
    scanCount,
    debugInfo,
    debugCaptures,
    openScanner,
    closeScanner,
    selectCandidate,
    captureDebugFrame,
    dismissDebugCaptures,
  }
}
