import { useState, useRef, useCallback, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { recognizeFromCanvas, recognizeCollectorNumber, terminateWorker } from '../utils/ocr-worker'
import { matchCardByName } from '../utils/card-name-matcher'
import { parseCollectorNumber } from '../utils/collector-number-parser'
import { matchCardByCollectorNumber } from '../utils/card-cn-matcher'

/** How often to capture a frame and run OCR (ms). */
const FRAME_INTERVAL = 500

/** How long to prevent re-scanning the same card (ms). */
const COOLDOWN_MS = 2000

/** How long to show the "matched" state before resuming scanning (ms). */
const MATCH_DISPLAY_MS = 1500

/** Minimum OCR confidence (0-100) required to attempt name matching. */
const MIN_CONFIDENCE = 60

/** Lower threshold for collector number — regex validates, so we can be lenient. */
const MIN_CN_CONFIDENCE = 15

/** Scale factor applied to cropped CN images before OCR (bigger text = better accuracy). */
const CN_OCR_SCALE = 6

interface UseScannerOptions {
  cards: Card[]
  setFilter: string
  onCardMatched: (card: Card) => void
}

export type MatchMethod = 'cn' | 'name' | null

export interface ScannerDebugInfo {
  cnOcr: string
  cnConf: number
  nameOcr: string
  nameConf: number
  cnParsed: string | null
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
  openScanner: () => void
  closeScanner: () => void
  selectCandidate: (card: Card) => void
}

export function useScanner({ cards, setFilter, onCardMatched }: UseScannerOptions): UseScannerReturn {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [lastMatch, setLastMatch] = useState<Card | null>(null)
  const [matchMethod, setMatchMethod] = useState<MatchMethod>(null)
  const [candidates, setCandidates] = useState<Card[]>([])
  const [error, setError] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<ScannerDebugInfo | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bottomCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cooldownRef = useRef<Map<string, number>>(new Map())
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

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

  const processFrame = useCallback(async () => {
    if (processingRef.current) return
    if (!videoRef.current || videoRef.current.readyState < 2) return
    // Don't process frames while user is picking a candidate
    if (scannerState === 'disambiguating') return

    const video = videoRef.current
    const vw = video.videoWidth
    const vh = video.videoHeight

    // Ensure canvases exist
    if (!bottomCanvasRef.current) {
      bottomCanvasRef.current = document.createElement('canvas')
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    processingRef.current = true
    const debug: ScannerDebugInfo = { cnOcr: '', cnConf: 0, nameOcr: '', nameConf: 0, cnParsed: null, videoRes: `${vw}x${vh}` }

    try {
      // ── PRIMARY: Collector number — bottom strip of frame ─────────────
      // The CN sits at the very bottom of the card.  We scan 62-85% of the
      // frame — narrow enough to exclude most card art & rules text (which
      // cause false digit reads) but wide enough to catch the CN when the
      // card isn't perfectly centred.
      const bottomCanvas = bottomCanvasRef.current
      const bnCropTop = Math.floor(vh * 0.62)
      const bnCropHeight = Math.floor(vh * 0.23)
      const bnCropLeft = Math.floor(vw * 0.10)
      const bnCropWidth = Math.floor(vw * 0.80)

      // Scale the crop up so tiny text becomes readable by Tesseract
      bottomCanvas.width = bnCropWidth * CN_OCR_SCALE
      bottomCanvas.height = bnCropHeight * CN_OCR_SCALE

      const bnCtx = bottomCanvas.getContext('2d')
      if (bnCtx) {
        bnCtx.imageSmoothingEnabled = true
        bnCtx.imageSmoothingQuality = 'high'
        // Gentle contrast — too aggressive destroys thin CN text on dark borders
        bnCtx.filter = 'grayscale(1) contrast(1.8) brightness(1.3)'
        bnCtx.drawImage(
          video,
          bnCropLeft, bnCropTop, bnCropWidth, bnCropHeight,
          0, 0, bnCropWidth * CN_OCR_SCALE, bnCropHeight * CN_OCR_SCALE,
        )
        bnCtx.filter = 'none'

        // Binarise + invert — Tesseract works best with DARK text on LIGHT
        // background.  Lorcana CN text is often light/silver on a dark card
        // border, so after binarisation we invert to get dark-on-white.
        // Use a lower threshold (100) to preserve thin text strokes that
        // would be destroyed at 128.
        const imgData = bnCtx.getImageData(0, 0, bottomCanvas.width, bottomCanvas.height)
        const px = imgData.data
        // Count dark pixels to detect polarity
        let darkCount = 0
        for (let i = 0; i < px.length; i += 4) {
          if (px[i]! < 100) darkCount++
        }
        // If image is mostly dark → text is light → need to invert
        // If image is mostly light → text is dark → keep as-is
        const shouldInvert = darkCount > px.length / 4 / 2
        for (let i = 0; i < px.length; i += 4) {
          const bin = px[i]! > 100 ? 255 : 0
          const v = shouldInvert ? 255 - bin : bin
          px[i] = px[i + 1] = px[i + 2] = v
        }
        bnCtx.putImageData(imgData, 0, 0)

        const cnResult = await recognizeCollectorNumber(bottomCanvas)
        debug.cnOcr = cnResult.text
        debug.cnConf = Math.round(cnResult.confidence)

        if (cnResult.confidence >= MIN_CN_CONFIDENCE) {
          const parsed = parseCollectorNumber(cnResult.text)
          debug.cnParsed = parsed?.cn ?? null

          if (parsed) {
            const cnMatch = matchCardByCollectorNumber(
              parsed.cn,
              cardsRef.current,
              setFilterRef.current,
              parsed.total,
            )
            if (cnMatch.card) {
              const key = `${cnMatch.card.setCode}-${cnMatch.card.cn}`
              const now = Date.now()
              const lastSeen = cooldownRef.current.get(key) ?? 0
              if (now - lastSeen >= COOLDOWN_MS) {
                setMatchMethod('cn')
                setDebugInfo(debug)
                acceptMatch(cnMatch.card)
                return
              }
            } else if (cnMatch.candidates.length > 1) {
              setMatchMethod('cn')
              setDebugInfo(debug)
              setCandidates(cnMatch.candidates)
              setScannerState('disambiguating')
              return
            }
          }
        }
      }

      // ── FALLBACK: Card name in the upper area ─────────────────────────
      // Scan 10–45% of frame height — covers the card name banner even if
      // the card isn't perfectly centred.
      const canvas = canvasRef.current
      const cropTop = Math.floor(vh * 0.10)
      const cropHeight = Math.floor(vh * 0.35)
      const cropLeft = Math.floor(vw * 0.10)
      const cropWidth = Math.floor(vw * 0.80)

      canvas.width = cropWidth * 2
      canvas.height = cropHeight * 2

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.filter = 'grayscale(1) contrast(2.0) brightness(1.3)'
      ctx.drawImage(
        video,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth * 2, cropHeight * 2,
      )
      ctx.filter = 'none'

      const { text, confidence } = await recognizeFromCanvas(canvas)
      debug.nameOcr = text
      debug.nameConf = Math.round(confidence)

      setDebugInfo(debug)

      if (confidence < MIN_CONFIDENCE) return
      if (text.length < 2) return

      const result = matchCardByName(
        text,
        cardsRef.current,
        setFilterRef.current,
      )

      if (result.card) {
        const key = `${result.card.setCode}-${result.card.cn}`
        const now = Date.now()
        const lastSeen = cooldownRef.current.get(key) ?? 0
        if (now - lastSeen < COOLDOWN_MS) return

        setMatchMethod('name')
        acceptMatch(result.card)
      } else if (result.candidates.length > 1) {
        setMatchMethod('name')
        setCandidates(result.candidates)
        setScannerState('disambiguating')
      }
    } catch (err) {
      console.warn('[scanner] frame error:', err)
    } finally {
      processingRef.current = false
    }
  }, [acceptMatch, scannerState])

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // Request high resolution — more pixels on the collector number
          // means dramatically better OCR accuracy on tiny text.
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

      // Start the frame capture loop
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
    setScannerState('idle')
    setLastMatch(null)
    setMatchMethod(null)
    setCandidates([])
    setError(null)
    setDebugInfo(null)
    processingRef.current = false
  }, [stopStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      terminateWorker()
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
    openScanner,
    closeScanner,
    selectCandidate,
  }
}
