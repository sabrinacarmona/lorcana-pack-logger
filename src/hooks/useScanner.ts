import { useState, useRef, useCallback, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { recognizeCollectorNumber } from '../utils/ocr-worker'
import { parseCollectorNumber } from '../utils/collector-number-parser'
import { matchCardByCollectorNumber } from '../utils/card-cn-matcher'
import { detectInkColor } from '../utils/ink-detector'

/** How often to capture a frame and run the matching pipeline (ms). */
const FRAME_INTERVAL = 400

/** How long to prevent re-scanning the same card (ms). */
const COOLDOWN_MS = 2000

/** How long to show the "matched" state before resuming scanning (ms). */
const MATCH_DISPLAY_MS = 1500

/** Minimum OCR confidence (0-100) to attempt matching. */
const MIN_CONFIDENCE = 40

/** Minimum ink detection confidence (0-1) to use ink for disambiguation. */
const MIN_INK_CONFIDENCE = 0.3

// ── Crop region percentages (relative to full video frame) ─────────────
// The algorithm crop is the card-shaped area in the centre of the camera feed.
const ALGO_CROP_X = 0.18
const ALGO_CROP_Y = 0.21
const ALGO_CROP_W = 0.64
const ALGO_CROP_H = 0.58

// Collector number region — the very bottom line of the card ("102/204 · EN · 7").
// Pushed low: card bottom sits at ~95% of algo crop, CN text is ~92-98%.
const CN_REGION_LEFT = 0.02
const CN_REGION_TOP = 0.92
const CN_REGION_HEIGHT = 0.07
const CN_REGION_WIDTH = 0.55

// Ink colour region — sample from the card's name banner area.
// The banner behind "PACHA / Trekmate" is a large solid area of the ink colour.
// Left edge avoids the white text; brightness filtering handles any that leaks in.
const INK_REGION_LEFT = 0.01
const INK_REGION_TOP = 0.52
const INK_REGION_SIZE = 0.10

interface UseScannerOptions {
  cards: Card[]
  setFilter: string
  onCardMatched: (card: Card) => void
}

export type MatchMethod = 'cn' | 'cn+ink' | null

export interface ScannerDebugInfo {
  videoRes: string
  lastOcrText: string
  lastOcrConfidence: number
  detectedInk: string
  inkConfidence: number
  parsedCn: string
  matchResult: string
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
  lastOcrText: string
  lastDetectedInk: string | null
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
  const [lastOcrText, setLastOcrText] = useState('')
  const [lastDetectedInk, setLastDetectedInk] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cooldownRef = useRef<Map<string, number>>(new Map())
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  // Off-screen canvases for cropping regions
  const cnCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null)

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
    processingRef.current = false
  }, [])

  /** Accept a card as the final match (used for both auto-match and disambiguation). */
  const acceptMatch = useCallback((card: Card, method: MatchMethod = 'cn') => {
    const key = `${card.setCode}-${card.cn}`
    cooldownRef.current.set(key, Date.now())
    setLastMatch(card)
    setMatchMethod(method)
    setCandidates([])
    setScannerState('matched')
    setScanCount((c) => c + 1)
    onCardMatchedRef.current(card)

    // Return to streaming after the match display period
    matchTimeoutRef.current = setTimeout(() => {
      setScannerState('streaming')
      setLastMatch(null)
      setMatchMethod(null)
    }, MATCH_DISPLAY_MS)
  }, [])

  /** User taps a candidate during disambiguation. */
  const selectCandidate = useCallback((card: Card) => {
    acceptMatch(card, 'cn')
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

    // 2. Algo crop — exactly what processFrame uses
    const algoCrop = cropToDataUrl(ALGO_CROP_X, ALGO_CROP_Y, ALGO_CROP_W, ALGO_CROP_H)

    // 3. Collector number region
    const cnRegion = cropToDataUrl(
      ALGO_CROP_X + ALGO_CROP_W * CN_REGION_LEFT,
      ALGO_CROP_Y + ALGO_CROP_H * CN_REGION_TOP,
      ALGO_CROP_W * CN_REGION_WIDTH,
      ALGO_CROP_H * CN_REGION_HEIGHT,
    )

    // 4. Ink dot region
    const inkDotRegion = cropToDataUrl(
      ALGO_CROP_X + ALGO_CROP_W * INK_REGION_LEFT,
      ALGO_CROP_Y + ALGO_CROP_H * INK_REGION_TOP,
      ALGO_CROP_W * INK_REGION_SIZE,
      ALGO_CROP_H * INK_REGION_SIZE,
    )

    setDebugCaptures({
      fullFrame,
      algoCrop,
      cnRegion,
      inkDotRegion,
      videoRes: `${vw}\u00d7${vh}`,
    })
  }, [])

  const dismissDebugCaptures = useCallback(() => {
    setDebugCaptures(null)
  }, [])

  /**
   * processFrame — CN + ink dot matching pipeline.
   *
   * 1. Crop the collector number region from the camera feed
   * 2. Run OCR (Tesseract SPARSE_TEXT mode with digit whitelist)
   * 3. Parse the "123/204" pattern
   * 4. Crop the ink dot region and detect the colour
   * 5. Look up the card by collector number + ink + set filter
   */
  const processFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return
    if (processingRef.current) return
    processingRef.current = true

    try {
      const video = videoRef.current
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (vw === 0 || vh === 0) return

      // ── 1. Crop the collector number region ──────────────────────
      if (!cnCanvasRef.current) cnCanvasRef.current = document.createElement('canvas')
      const cnCanvas = cnCanvasRef.current
      const cnCtx = cnCanvas.getContext('2d')
      if (!cnCtx) return

      const cnSx = Math.floor(vw * (ALGO_CROP_X + ALGO_CROP_W * CN_REGION_LEFT))
      const cnSy = Math.floor(vh * (ALGO_CROP_Y + ALGO_CROP_H * CN_REGION_TOP))
      const cnSw = Math.floor(vw * ALGO_CROP_W * CN_REGION_WIDTH)
      const cnSh = Math.floor(vh * ALGO_CROP_H * CN_REGION_HEIGHT)

      cnCanvas.width = cnSw
      cnCanvas.height = cnSh

      // Grayscale + contrast boost for OCR
      cnCtx.filter = 'grayscale(1) contrast(1.8) brightness(1.1)'
      cnCtx.drawImage(video, cnSx, cnSy, cnSw, cnSh, 0, 0, cnSw, cnSh)
      cnCtx.filter = 'none'

      // ── 2. Run OCR ──────────────────────────────────────────────
      const ocrResult = await recognizeCollectorNumber(cnCanvas)
      setLastOcrText(ocrResult.text || '')

      // ── 3. Parse collector number ───────────────────────────────
      if (ocrResult.confidence < MIN_CONFIDENCE || !ocrResult.text) {
        setDebugInfo({
          videoRes: `${vw}x${vh}`,
          lastOcrText: ocrResult.text || '',
          lastOcrConfidence: ocrResult.confidence,
          detectedInk: '-',
          inkConfidence: 0,
          parsedCn: '-',
          matchResult: ocrResult.confidence < MIN_CONFIDENCE ? 'low confidence' : 'no text',
        })
        return
      }

      const parsed = parseCollectorNumber(ocrResult.text)
      if (!parsed) {
        setDebugInfo({
          videoRes: `${vw}x${vh}`,
          lastOcrText: ocrResult.text,
          lastOcrConfidence: ocrResult.confidence,
          detectedInk: '-',
          inkConfidence: 0,
          parsedCn: 'no match',
          matchResult: 'parse failed',
        })
        return
      }

      // ── 4. Detect ink colour ────────────────────────────────────
      if (!inkCanvasRef.current) inkCanvasRef.current = document.createElement('canvas')
      const inkCanvas = inkCanvasRef.current
      const inkCtx = inkCanvas.getContext('2d')
      if (!inkCtx) return

      const inkSx = Math.floor(vw * (ALGO_CROP_X + ALGO_CROP_W * INK_REGION_LEFT))
      const inkSy = Math.floor(vh * (ALGO_CROP_Y + ALGO_CROP_H * INK_REGION_TOP))
      const inkSw = Math.floor(vw * ALGO_CROP_W * INK_REGION_SIZE)
      const inkSh = Math.floor(vh * ALGO_CROP_H * INK_REGION_SIZE)

      inkCanvas.width = inkSw
      inkCanvas.height = inkSh
      // No filter — we need true colours for ink detection
      inkCtx.drawImage(video, inkSx, inkSy, inkSw, inkSh, 0, 0, inkSw, inkSh)

      const inkResult = detectInkColor(inkCanvas)
      const useInk = inkResult.confidence >= MIN_INK_CONFIDENCE ? inkResult.ink : null
      setLastDetectedInk(useInk)

      // ── 5. Match card ───────────────────────────────────────────
      // Check cooldown — skip if we recently matched this cn
      const now = Date.now()
      for (const [key, ts] of cooldownRef.current) {
        if (now - ts > COOLDOWN_MS) cooldownRef.current.delete(key)
      }

      const result = matchCardByCollectorNumber(
        parsed.cn,
        cardsRef.current,
        setFilterRef.current,
        parsed.total,
        useInk,
      )

      const method: MatchMethod = useInk ? 'cn+ink' : 'cn'

      setDebugInfo({
        videoRes: `${vw}x${vh}`,
        lastOcrText: ocrResult.text,
        lastOcrConfidence: ocrResult.confidence,
        detectedInk: inkResult.ink || '-',
        inkConfidence: inkResult.confidence,
        parsedCn: `${parsed.cn}/${parsed.total || '?'}`,
        matchResult: result.card
          ? `${result.card.display} (${method})`
          : result.candidates.length > 0
            ? `${result.candidates.length} candidates`
            : 'no match',
      })

      if (result.card) {
        const key = `${result.card.setCode}-${result.card.cn}`
        if (!cooldownRef.current.has(key)) {
          acceptMatch(result.card, method)
        }
      } else if (result.candidates.length > 0) {
        // Check cooldown for all candidates — if any is on cooldown, skip
        const allOnCooldown = result.candidates.every(
          (c) => cooldownRef.current.has(`${c.setCode}-${c.cn}`),
        )
        if (!allOnCooldown) {
          setCandidates(result.candidates)
          setScannerState('disambiguating')
        }
      }
    } finally {
      processingRef.current = false
    }
  }, [acceptMatch])

  const openScanner = useCallback(async () => {
    setError(null)
    setLastMatch(null)
    setMatchMethod(null)
    setCandidates([])
    setScanCount(0)
    setDebugInfo(null)
    setLastOcrText('')
    setLastDetectedInk(null)
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

      // ── Start frame capture loop ─────────────────────────────────
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
  }, [processFrame])

  const closeScanner = useCallback(() => {
    stopStream()
    setScannerState('idle')
    setLastMatch(null)
    setMatchMethod(null)
    setCandidates([])
    setError(null)
    setDebugInfo(null)
    setDebugCaptures(null)
    setLastOcrText('')
    setLastDetectedInk(null)
    processingRef.current = false
  }, [stopStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
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
    lastOcrText,
    lastDetectedInk,
    openScanner,
    closeScanner,
    selectCandidate,
    captureDebugFrame,
    dismissDebugCaptures,
  }
}
