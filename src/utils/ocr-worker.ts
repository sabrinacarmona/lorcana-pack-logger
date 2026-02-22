import Tesseract from 'tesseract.js'
import {
  setMutexLocked,
  incrementQueue,
  decrementQueue,
} from './telemetry'

let workerInstance: Tesseract.Worker | null = null
let initPromise: Promise<Tesseract.Worker> | null = null

/**
 * Simple mutex to serialise worker calls.  Tesseract.js workers are NOT
 * safe for concurrent operations — interleaved setParameters + recognize
 * calls corrupt each other.  This ensures only one call runs at a time.
 *
 * Telemetry hooks track mutex state and queue depth for the debug overlay.
 */
let workerLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  incrementQueue()
  const next = workerLock.then(() => {
    decrementQueue()
    setMutexLocked(true)
    return fn().finally(() => setMutexLocked(false))
  }, () => {
    decrementQueue()
    setMutexLocked(true)
    return fn().finally(() => setMutexLocked(false))
  })
  workerLock = next.then(() => {}, () => {}) // swallow to keep chain alive
  return next
}

/**
 * Get the shared Tesseract worker, creating it lazily on first call.
 * The worker is a singleton reused across scanner sessions so we only
 * download the ~4 MB English trained data once.
 */
async function getWorker(): Promise<Tesseract.Worker> {
  if (workerInstance) return workerInstance
  if (initPromise) return initPromise

  initPromise = Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
    legacyCore: false,
    legacyLang: false,
  }).then(async (worker) => {
    // Configure for card name recognition — block mode handles 1-2 line names
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    })
    workerInstance = worker
    return worker
  })

  return initPromise
}

export interface OcrResult {
  text: string
  confidence: number
}

/**
 * Run OCR on a canvas element and return the recognised text with confidence.
 * The canvas should contain a cropped, preprocessed image of the card name area.
 */
export function recognizeFromCanvas(canvas: HTMLCanvasElement): Promise<OcrResult> {
  return withLock(async () => {
    const worker = await getWorker()
    const { data } = await worker.recognize(canvas)
    return { text: data.text.trim(), confidence: data.confidence }
  })
}

/**
 * Run OCR optimised for the collector number region.
 *
 * Uses SINGLE_BLOCK mode (no character whitelist) so Tesseract reads text
 * naturally instead of hallucinating digits from card texture patterns.
 * The collector number parser then extracts the "130/204" pattern from
 * the full OCR output using a strict regex + MIN_TOTAL validation.
 *
 * The caller is expected to preprocess the canvas (upscale + binarize)
 * before calling this — see preprocess-ocr.ts.
 */
export function recognizeCollectorNumber(canvas: HTMLCanvasElement): Promise<OcrResult> {
  return withLock(async () => {
    const worker = await getWorker()
    // SINGLE_BLOCK is already the default mode — no mode switching needed.
    // No character whitelist — let Tesseract read all characters naturally.
    // The parser handles OCR substitutions (O→0, l→1, etc).
    const { data } = await worker.recognize(canvas)
    return { text: data.text.trim(), confidence: data.confidence }
  })
}

/**
 * Terminate the shared worker and release resources.
 * Call this when the app unmounts or the scanner is no longer needed.
 */
export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate()
    workerInstance = null
    initPromise = null
  }
}

/**
 * Check whether the worker has been initialised (useful for UI loading states).
 */
export function isWorkerReady(): boolean {
  return workerInstance !== null
}
