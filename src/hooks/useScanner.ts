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
const MIN_CONFIDENCE = 50

interface UseScannerOptions {
  cards: Card[]
  setFilter: string
  onCardMatched: (card: Card) => void
}

export type MatchMethod = 'cn' | 'name' | null

export interface UseScannerReturn {
  scannerActive: boolean
  scannerState: ScannerState
  lastMatch: Card | null
  matchMethod: MatchMethod
  candidates: Card[]
  error: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  scanCount: number
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

    // Ensure canvases exist
    if (!bottomCanvasRef.current) {
      bottomCanvasRef.current = document.createElement('canvas')
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    processingRef.current = true
    try {
      // ── PRIMARY: Collector number at the bottom of the card ──────────
      const bottomCanvas = bottomCanvasRef.current
      const bnCropTop = Math.floor(video.videoHeight * 0.82)
      const bnCropHeight = Math.floor(video.videoHeight * 0.14)
      const bnCropLeft = Math.floor(video.videoWidth * 0.15)
      const bnCropWidth = Math.floor(video.videoWidth * 0.70)
      bottomCanvas.width = bnCropWidth
      bottomCanvas.height = bnCropHeight

      const bnCtx = bottomCanvas.getContext('2d')
      if (bnCtx) {
        // Higher contrast for small printed text on dark card edge
        bnCtx.filter = 'grayscale(1) contrast(3.0) brightness(1.5)'
        bnCtx.drawImage(video, bnCropLeft, bnCropTop, bnCropWidth, bnCropHeight, 0, 0, bnCropWidth, bnCropHeight)
        bnCtx.filter = 'none'

        const cnResult = await recognizeCollectorNumber(bottomCanvas)
        if (cnResult.confidence >= MIN_CONFIDENCE) {
          const parsed = parseCollectorNumber(cnResult.text)
          if (parsed) {
            const cnMatch = matchCardByCollectorNumber(
              parsed.cn,
              cardsRef.current,
              setFilterRef.current,
            )
            if (cnMatch.card) {
              const key = `${cnMatch.card.setCode}-${cnMatch.card.cn}`
              const now = Date.now()
              const lastSeen = cooldownRef.current.get(key) ?? 0
              if (now - lastSeen >= COOLDOWN_MS) {
                setMatchMethod('cn')
                acceptMatch(cnMatch.card)
                return
              }
            } else if (cnMatch.candidates.length > 1) {
              setMatchMethod('cn')
              setCandidates(cnMatch.candidates)
              setScannerState('disambiguating')
              return
            }
          }
        }
      }

      // ── FALLBACK: Card name in the upper banner ──────────────────────
      const canvas = canvasRef.current
      const cropTop = Math.floor(video.videoHeight * 0.15)
      const cropHeight = Math.floor(video.videoHeight * 0.20)
      const cropLeft = Math.floor(video.videoWidth * 0.10)
      const cropWidth = Math.floor(video.videoWidth * 0.80)
      canvas.width = cropWidth
      canvas.height = cropHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.2)'
      ctx.drawImage(video, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
      ctx.filter = 'none'

      const { text, confidence } = await recognizeFromCanvas(canvas)
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
    } catch {
      // OCR error on this frame — silently skip and try next
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
    cooldownRef.current.clear()
    setScannerState('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
    openScanner,
    closeScanner,
    selectCandidate,
  }
}
