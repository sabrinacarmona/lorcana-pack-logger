import Tesseract from 'tesseract.js'

let workerInstance: Tesseract.Worker | null = null
let initPromise: Promise<Tesseract.Worker> | null = null

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
export async function recognizeFromCanvas(canvas: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(canvas)
  return { text: data.text.trim(), confidence: data.confidence }
}

/**
 * Run OCR optimised for the collector number region (digits + slash).
 *
 * Switches the worker to SINGLE_LINE page segmentation and restricts the
 * character whitelist to numeric chars.  This dramatically improves accuracy
 * for the small "128/204" text at the bottom of Lorcana cards.
 */
export async function recognizeCollectorNumber(canvas: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789/\\| ',
    })
    const { data } = await worker.recognize(canvas)
    return { text: data.text.trim(), confidence: data.confidence }
  } finally {
    // Restore defaults so the next recognizeFromCanvas call works correctly
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: '',
    })
  }
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
