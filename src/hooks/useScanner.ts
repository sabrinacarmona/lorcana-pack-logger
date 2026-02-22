import { useState, useRef, useCallback, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { recognizeCollectorNumber, terminateWorker } from '../utils/ocr-worker'
import { parseCollectorNumber } from '../utils/collector-number-parser'
import { matchCardByCollectorNumber } from '../utils/card-cn-matcher'
import { detectInkColor } from '../utils/ink-detector'
import { recordFrame, resetTelemetry, getState as getTelemetryState } from '../utils/telemetry'
import { preprocessForOcr } from '../utils/preprocess-ocr'

/** How often to capture a frame and run the matching pipeline (ms).
 * Set to 1000ms to accommodate the larger crop + upscale preprocessing. */
const FRAME_INTERVAL = 1000

/** How long to prevent re-scanning the same card (ms). */
const COOLDOWN_MS = 2000

/** How long to show the "matched" state before resuming scanning (ms). */
const MATCH_DISPLAY_MS = 1500

/** Minimum OCR confidence — effectively disabled (set to 0).
 * The collector number parser already validates the pattern strictly with regex
 * + MIN_TOTAL ≥ 100, so any read that parses correctly is almost certainly
 * right regardless of Tesseract's confidence score. */
const MIN_CONFIDENCE = 0

/** Minimum ink detection confidence (0-1) to use ink for disambiguation. */
const MIN_INK_CONFIDENCE = 0.3

// ── Guide frame percentages (relative to CSS container / screen) ────────
// These match the ScannerOverlay's guide frame (left:18%, right:18%, top:21%, height:58%).
// The algorithm must convert these CSS percentages to video-pixel coordinates
// because `object-fit: cover` crops the video — CSS % ≠ video %.
const GUIDE_X = 0.18
const GUIDE_Y = 0.21
const GUIDE_W = 0.64
const GUIDE_H = 0.58

// Collector number region — bottom portion of the guide frame containing the
// "102/204 · EN · 7" line at the very bottom of each card.
// Full width (0-100%) so horizontal card position doesn't matter.
// Bottom 20% (80-100%) is generous enough to capture the CN text regardless of
// whether the card is top-aligned, centered, or bottom-aligned in the guide.
const CN_REGION_LEFT = 0.0
const CN_REGION_TOP = 0.80
const CN_REGION_HEIGHT = 0.20
const CN_REGION_WIDTH = 1.0

/** Upscale factor for the CN crop before OCR.
 * With the wider crop (full width × bottom 20%), raw size is ~691×213 px.
 * 2x upscale → ~1382×426 px — text is ~30px tall, readable by Tesseract. */
const OCR_UPSCALE = 2

// Ink colour region — sample from the card's name banner area.
// The banner behind "PACHA / Trekmate" is a large solid area of the ink colour.
// Left edge avoids the white text; brightness filtering handles any that leaks in.
const INK_REGION_LEFT = 0.01
const INK_REGION_TOP = 0.52
const INK_REGION_SIZE = 0.10

// ── object-fit: cover transform ─────────────────────────────────────────
// The video element uses `object-fit: cover`, which scales the video to fill
// the container and crops the overflow.  This means CSS percentages on the
// overlay do NOT map 1:1 to video pixel percentages.  A landscape 1920×1080
// video displayed in a portrait 375×812 container will have ~74% of its width
// cropped.  Without this transform, the algorithm crops from the wrong region
// and the scanner can never match a card (0% success rate).

interface CoverTransform {
  /** Horizontal offset from video origin to start of visible area (px). */
  offsetX: number
  /** Vertical offset from video origin to start of visible area (px). */
  offsetY: number
  /** Width of the visible portion of the video (in video pixels). */
  visibleW: number
  /** Height of the visible portion of the video (in video pixels). */
  visibleH: number
}

/**
 * Compute the object-fit: cover mapping from CSS container space to video space.
 *
 * CSS % position P maps to video pixel: offset + P × visible
 */
function getCoverTransform(video: HTMLVideoElement): CoverTransform | null {
  const cw = video.clientWidth
  const ch = video.clientHeight
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (cw === 0 || ch === 0 || vw === 0 || vh === 0) return null

  // cover picks the larger scale factor so the video fills both axes
  const scale = Math.max(cw / vw, ch / vh)
  const visibleW = cw / scale
  const visibleH = ch / scale
  return {
    offsetX: (vw - visibleW) / 2,
    offsetY: (vh - visibleH) / 2,
    visibleW,
    visibleH,
  }
}

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
  /** The guide frame crop (cover-aware) sent to the matching algorithm. */
  algoCrop: string
  /** Bottom of the guide frame — where the collector number lives. */
  cnRegion: string
  /** Card name banner area — where the ink colour is sampled. */
  inkDotRegion: string
  /** Dimensions of the raw video feed. */
  videoRes: string
}

/** Snapshot of the cover transform + crop pixel coordinates for diagnostics. */
export interface CropSnapshot {
  coverTransform: {
    containerWidth: number
    containerHeight: number
    videoWidth: number
    videoHeight: number
    offsetX: number
    offsetY: number
    visibleW: number
    visibleH: number
  }
  guideFramePx: { x: number; y: number; w: number; h: number }
  cnRegionPx: { x: number; y: number; w: number; h: number }
  inkRegionPx: { x: number; y: number; w: number; h: number }
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
  exportDiagnostics: () => void
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

  // Latest crop snapshot for diagnostics export
  const cropSnapshotRef = useRef<CropSnapshot | null>(null)
  // Latest preprocessed CN image (data URL) for visual debugging in diagnostics
  const preprocessedImageRef = useRef<string | null>(null)

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

    // Account for object-fit: cover transform
    const cover = getCoverTransform(video)
    if (!cover) return

    const gx = cover.offsetX + GUIDE_X * cover.visibleW
    const gy = cover.offsetY + GUIDE_Y * cover.visibleH
    const gw = GUIDE_W * cover.visibleW
    const gh = GUIDE_H * cover.visibleH

    const snap = document.createElement('canvas')
    const sCtx = snap.getContext('2d')
    if (!sCtx) return

    // Helper: crop a region from the video (in video-pixel coords) and return a data URL
    const cropToDataUrl = (
      sx: number, sy: number, sw: number, sh: number,
    ): string => {
      const ix = Math.floor(sx)
      const iy = Math.floor(sy)
      const iw = Math.max(1, Math.floor(sw))
      const ih = Math.max(1, Math.floor(sh))
      snap.width = iw
      snap.height = ih
      sCtx.drawImage(video, ix, iy, iw, ih, 0, 0, iw, ih)
      return snap.toDataURL('image/jpeg', 0.85)
    }

    // 1. Full uncropped frame
    snap.width = vw
    snap.height = vh
    sCtx.drawImage(video, 0, 0)
    const fullFrame = snap.toDataURL('image/jpeg', 0.7)

    // 2. Guide frame crop — exactly what processFrame uses (cover-aware)
    const algoCrop = cropToDataUrl(gx, gy, gw, gh)

    // 3. Collector number region
    const cnRegion = cropToDataUrl(
      gx + CN_REGION_LEFT * gw,
      gy + CN_REGION_TOP * gh,
      CN_REGION_WIDTH * gw,
      CN_REGION_HEIGHT * gh,
    )

    // 4. Ink colour region
    const inkDotRegion = cropToDataUrl(
      gx + INK_REGION_LEFT * gw,
      gy + INK_REGION_TOP * gh,
      INK_REGION_SIZE * gw,
      INK_REGION_SIZE * gh,
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

      // Convert CSS guide frame % → video pixel coordinates (cover transform)
      const cover = getCoverTransform(video)
      if (!cover) return

      const guideX = cover.offsetX + GUIDE_X * cover.visibleW
      const guideY = cover.offsetY + GUIDE_Y * cover.visibleH
      const guideW = GUIDE_W * cover.visibleW
      const guideH = GUIDE_H * cover.visibleH

      // ── 1. Crop the collector number region ──────────────────────
      if (!cnCanvasRef.current) cnCanvasRef.current = document.createElement('canvas')
      const cnCanvas = cnCanvasRef.current
      const cnCtx = cnCanvas.getContext('2d')
      if (!cnCtx) return

      const cnSx = Math.floor(guideX + CN_REGION_LEFT * guideW)
      const cnSy = Math.floor(guideY + CN_REGION_TOP * guideH)
      const cnSw = Math.floor(CN_REGION_WIDTH * guideW)
      const cnSh = Math.floor(CN_REGION_HEIGHT * guideH)

      // Store crop snapshot for diagnostics (lightweight — just numbers)
      cropSnapshotRef.current = {
        coverTransform: {
          containerWidth: video.clientWidth,
          containerHeight: video.clientHeight,
          videoWidth: vw,
          videoHeight: vh,
          offsetX: Math.round(cover.offsetX),
          offsetY: Math.round(cover.offsetY),
          visibleW: Math.round(cover.visibleW),
          visibleH: Math.round(cover.visibleH),
        },
        guideFramePx: { x: Math.round(guideX), y: Math.round(guideY), w: Math.round(guideW), h: Math.round(guideH) },
        cnRegionPx: { x: cnSx, y: cnSy, w: cnSw, h: cnSh },
        inkRegionPx: {
          x: Math.floor(guideX + INK_REGION_LEFT * guideW),
          y: Math.floor(guideY + INK_REGION_TOP * guideH),
          w: Math.floor(INK_REGION_SIZE * guideW),
          h: Math.floor(INK_REGION_SIZE * guideH),
        },
      }

      // Draw CN crop at 3x scale — text goes from ~15px to ~45px tall
      cnCanvas.width = cnSw * OCR_UPSCALE
      cnCanvas.height = cnSh * OCR_UPSCALE
      cnCtx.imageSmoothingEnabled = true
      cnCtx.imageSmoothingQuality = 'high'
      cnCtx.drawImage(video, cnSx, cnSy, cnSw, cnSh, 0, 0, cnCanvas.width, cnCanvas.height)

      // Preprocess: grayscale → auto-invert → Otsu binarization
      // Produces clean black text on white background for Tesseract
      preprocessForOcr(cnCanvas)

      // Save preprocessed image for diagnostics (JPEG, low quality to save memory)
      try { preprocessedImageRef.current = cnCanvas.toDataURL('image/jpeg', 0.5) } catch { /* ignore */ }

      // ── 2. Run OCR ──────────────────────────────────────────────
      const ocrStart = performance.now()
      const ocrResult = await recognizeCollectorNumber(cnCanvas)
      const ocrLatency = performance.now() - ocrStart
      setLastOcrText(ocrResult.text || '')

      // ── 3. Parse collector number ───────────────────────────────
      if (ocrResult.confidence < MIN_CONFIDENCE || !ocrResult.text) {
        const matchResult = ocrResult.confidence < MIN_CONFIDENCE ? 'low confidence' : 'no text'
        setDebugInfo({
          videoRes: `${vw}x${vh}`,
          lastOcrText: ocrResult.text || '',
          lastOcrConfidence: ocrResult.confidence,
          detectedInk: '-',
          inkConfidence: 0,
          parsedCn: '-',
          matchResult,
        })
        recordFrame({
          ocrConfidence: ocrResult.confidence,
          ocrText: ocrResult.text || '',
          workerLatencyMs: Math.round(ocrLatency),
          mutexContended: ocrLatency > FRAME_INTERVAL,
          parsedCn: null,
          detectedInk: null,
          matchResult,
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
        recordFrame({
          ocrConfidence: ocrResult.confidence,
          ocrText: ocrResult.text,
          workerLatencyMs: Math.round(ocrLatency),
          mutexContended: ocrLatency > FRAME_INTERVAL,
          parsedCn: null,
          detectedInk: null,
          matchResult: 'parse failed',
        })
        return
      }

      // ── 4. Detect ink colour ────────────────────────────────────
      if (!inkCanvasRef.current) inkCanvasRef.current = document.createElement('canvas')
      const inkCanvas = inkCanvasRef.current
      const inkCtx = inkCanvas.getContext('2d')
      if (!inkCtx) return

      const inkSx = Math.floor(guideX + INK_REGION_LEFT * guideW)
      const inkSy = Math.floor(guideY + INK_REGION_TOP * guideH)
      const inkSw = Math.floor(INK_REGION_SIZE * guideW)
      const inkSh = Math.floor(INK_REGION_SIZE * guideH)

      inkCanvas.width = inkSw
      inkCanvas.height = inkSh
      // No filter — we need true colours for ink detection
      inkCtx.drawImage(video, inkSx, inkSy, inkSw, inkSh, 0, 0, inkSw, inkSh)

      const inkResult = detectInkColor(inkCanvas)
      const useInk = inkResult.confidence >= MIN_INK_CONFIDENCE ? inkResult.ink : null
      const useInks = inkResult.confidence >= MIN_INK_CONFIDENCE ? inkResult.detectedInks : []
      setLastDetectedInk(useInks.length > 0 ? useInks.join('/') : useInk)

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
        useInks,
      )

      const method: MatchMethod = useInks.length > 0 ? 'cn+ink' : 'cn'

      const matchResultStr = result.card
        ? `${result.card.display} (${method})`
        : result.candidates.length > 0
          ? `${result.candidates.length} candidates`
          : 'no match'

      setDebugInfo({
        videoRes: `${vw}x${vh}`,
        lastOcrText: ocrResult.text,
        lastOcrConfidence: ocrResult.confidence,
        detectedInk: inkResult.detectedInks.length > 0 ? inkResult.detectedInks.join('/') : (inkResult.ink || '-'),
        inkConfidence: inkResult.confidence,
        parsedCn: `${parsed.cn}/${parsed.total || '?'}`,
        matchResult: matchResultStr,
      })

      recordFrame({
        ocrConfidence: ocrResult.confidence,
        ocrText: ocrResult.text,
        workerLatencyMs: Math.round(ocrLatency),
        mutexContended: ocrLatency > FRAME_INTERVAL,
        parsedCn: `${parsed.cn}/${parsed.total || '?'}`,
        detectedInk: useInks.length > 0 ? useInks.join('/') : useInk,
        matchResult: matchResultStr,
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

  /**
   * Export a compact JSON diagnostics file and trigger a browser download.
   * Contains everything needed to debug scanner failures remotely:
   * cover transform, crop coordinates, telemetry frames, and app metadata.
   */
  const exportDiagnostics = useCallback(() => {
    const telemetry = getTelemetryState()
    const diag = {
      exportedAt: new Date().toISOString(),
      appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        orientationType: screen.orientation?.type || 'unknown',
      },
      setFilter: setFilterRef.current,
      cardPoolSize: cardsRef.current.length,
      coverTransform: cropSnapshotRef.current?.coverTransform || null,
      cropCoordinates: cropSnapshotRef.current
        ? {
            guideFrame: cropSnapshotRef.current.guideFramePx,
            cnRegion: cropSnapshotRef.current.cnRegionPx,
            inkRegion: cropSnapshotRef.current.inkRegionPx,
          }
        : null,
      constants: {
        GUIDE: { x: GUIDE_X, y: GUIDE_Y, w: GUIDE_W, h: GUIDE_H },
        CN_REGION: { left: CN_REGION_LEFT, top: CN_REGION_TOP, w: CN_REGION_WIDTH, h: CN_REGION_HEIGHT },
        INK_REGION: { left: INK_REGION_LEFT, top: INK_REGION_TOP, size: INK_REGION_SIZE },
        OCR_UPSCALE,
        MIN_CONFIDENCE,
        MIN_INK_CONFIDENCE,
      },
      telemetry: {
        totalFrames: telemetry.totalFrames,
        avgLatencyMs: telemetry.avgLatencyMs,
        peakLatencyMs: telemetry.peakLatencyMs,
        currentMemoryMB: +(telemetry.currentMemoryBytes / (1024 * 1024)).toFixed(1),
      },
      // Base64 JPEG of the latest preprocessed CN crop — open in browser to see
      // exactly what Tesseract received (black/white binarized image)
      preprocessedCnImage: preprocessedImageRef.current,
      recentFrames: telemetry.frames,
    }

    const json = JSON.stringify(diag, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scanner-diag-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

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
    // Release off-screen canvases
    cnCanvasRef.current = null
    inkCanvasRef.current = null
    // Terminate OCR worker to reclaim ~4 MB (re-created lazily on next open)
    terminateWorker().catch(() => {})
    // Clear the telemetry ring buffer for the next session
    resetTelemetry()
  }, [stopStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      terminateWorker().catch(() => {})
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
    exportDiagnostics,
  }
}
