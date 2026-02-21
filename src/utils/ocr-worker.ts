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
    // Configure for digit-heavy single-line recognition
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      // Whitelist digits and common separator characters
      tessedit_char_whitelist: '0123456789/\\',
    })
    workerInstance = worker
    return worker
  })

  return initPromise
}

/**
 * Run OCR on a canvas element and return the recognised text.
 * The canvas should contain a cropped, preprocessed image of the
 * area where the collector number is expected.
 */
export async function recognizeFromCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(canvas)
  return data.text.trim()
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
