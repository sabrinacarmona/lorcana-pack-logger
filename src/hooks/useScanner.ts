import { useState, useRef, useCallback, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { recognizeFromCanvas, terminateWorker } from '../utils/ocr-worker'
import { parseCollectorNumber } from '../utils/collector-number-parser'

/** How often to capture a frame and run OCR (ms). */
const FRAME_INTERVAL = 500

/** How long to prevent re-scanning the same collector number (ms). */
const COOLDOWN_MS = 2000

/** How long to show the "matched" state before resuming scanning (ms). */
const MATCH_DISPLAY_MS = 1500

/** Minimum OCR confidence (0-100) to consider a reading valid. */
const MIN_CONFIDENCE = 50

interface UseScannerOptions {
  cards: Card[]
  setFilter: string
  onCardMatched: (card: Card) => void
}

export interface UseScannerReturn {
  scannerActive: boolean
  scannerState: ScannerState
  lastMatch: Card | null
  error: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  scanCount: number
  debugText: string
  openScanner: () => void
  closeScanner: () => void
  confirmMatch: () => void
  rejectMatch: () => void
}

export function useScanner({ cards, setFilter, onCardMatched }: UseScannerOptions): UseScannerReturn {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [lastMatch, setLastMatch] = useState<Card | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [debugText, setDebugText] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
  const scannerStateRef = useRef(scannerState)
  scannerStateRef.current = scannerState

  const pauseScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    pauseScanning()
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
  }, [pauseScanning])

  const matchCard = useCallback((cn: string): Card | null => {
    const currentCards = cardsRef.current
    const filter = setFilterRef.current

    const candidates = filter === 'all'
      ? currentCards.filter((c) => c.cn === cn)
      : currentCards.filter((c) => c.cn === cn && c.setCode === filter)

    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0] ?? null

    // Multiple matches — prefer the highest set code (most recent set)
    return candidates.reduce<Card | null>((best, c) => {
      if (!best) return c
      const bestNum = parseInt(best.setCode, 10)
      const cNum = parseInt(c.setCode, 10)
      if (!isNaN(cNum) && !isNaN(bestNum) && cNum > bestNum) return c
      return best
    }, null)
  }, [])

  // Reference to processFrame for use in resumeScanning
  const processFrameRef = useRef<() => void>(() => {})

  const resumeScanning = useCallback(() => {
    if (intervalRef.current) return // Already running
    intervalRef.current = setInterval(() => {
      processFrameRef.current()
    }, FRAME_INTERVAL)
  }, [])

  const confirmMatch = useCallback(() => {
    const card = lastMatch
    if (!card) return

    cooldownRef.current.set(card.cn, Date.now())
    setScannerState('matched')
    setScanCount((c) => c + 1)
    onCardMatchedRef.current(card)

    // Return to streaming after the match display period
    matchTimeoutRef.current = setTimeout(() => {
      setScannerState('streaming')
      setLastMatch(null)
      resumeScanning()
    }, MATCH_DISPLAY_MS)
  }, [lastMatch, resumeScanning])

  const rejectMatch = useCallback(() => {
    // Put the rejected CN on a short cooldown so we don't immediately re-detect it
    if (lastMatch) {
      cooldownRef.current.set(lastMatch.cn, Date.now())
    }
    setLastMatch(null)
    setScannerState('streaming')
    resumeScanning()
  }, [lastMatch, resumeScanning])

  const processFrame = useCallback(async () => {
    if (processingRef.current) return
    if (scannerStateRef.current === 'confirming' || scannerStateRef.current === 'matched') return
    if (!videoRef.current || videoRef.current.readyState < 2) return

    const video = videoRef.current
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current

    // Crop to bottom 15% of the video — collector numbers are at the very bottom
    const cropTop = Math.floor(video.videoHeight * 0.85)
    const cropHeight = video.videoHeight - cropTop
    canvas.width = video.videoWidth
    canvas.height = cropHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw cropped region with contrast boost
    ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.2)'
    ctx.drawImage(video, 0, cropTop, video.videoWidth, cropHeight, 0, 0, video.videoWidth, cropHeight)
    ctx.filter = 'none'

    processingRef.current = true
    try {
      const { text, confidence } = await recognizeFromCanvas(canvas)

      // Update debug display with raw OCR output
      if (text) {
        setDebugText(`OCR: "${text}" (${Math.round(confidence)}%)`)
      }

      // Reject low-confidence readings
      if (confidence < MIN_CONFIDENCE) {
        return
      }

      const parsed = parseCollectorNumber(text)

      if (parsed) {
        // Check cooldown
        const now = Date.now()
        const lastSeen = cooldownRef.current.get(parsed.cn) ?? 0
        if (now - lastSeen < COOLDOWN_MS) {
          return // Still in cooldown for this CN
        }

        const card = matchCard(parsed.cn)
        if (card) {
          // Pause scanning and ask user to confirm
          pauseScanning()
          setLastMatch(card)
          setScannerState('confirming')
        }
      }
    } catch {
      // OCR error on this frame — silently skip and try next
    } finally {
      processingRef.current = false
    }
  }, [matchCard, pauseScanning])

  // Keep processFrameRef in sync
  processFrameRef.current = processFrame

  const openScanner = useCallback(async () => {
    setError(null)
    setLastMatch(null)
    setScanCount(0)
    setDebugText('')
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
        processFrameRef.current()
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
    setError(null)
    setDebugText('')
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
    error,
    videoRef,
    scanCount,
    debugText,
    openScanner,
    closeScanner,
    confirmMatch,
    rejectMatch,
  }
}
