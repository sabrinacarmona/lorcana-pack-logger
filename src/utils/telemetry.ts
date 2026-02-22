/**
 * Lightweight telemetry service for the scanner pipeline.
 *
 * Maintains a ring buffer of the last N frame snapshots so that when a user
 * reports an OCR failure in production we can inspect the recent history
 * instead of guessing.
 *
 * Also tracks mutex state and queue depth for the debug overlay.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface FrameSnapshot {
  /** ISO timestamp of when the frame was processed. */
  timestamp: string
  /** Frame sequence number (monotonically increasing). */
  frameId: number
  /** OCR confidence score (0-100). */
  ocrConfidence: number
  /** Raw OCR text output. */
  ocrText: string
  /** Time taken by the OCR worker for this frame (ms). */
  workerLatencyMs: number
  /** Estimated JS heap usage at the time of capture (bytes, 0 if unavailable). */
  memoryUsageBytes: number
  /** Whether the mutex was contended (frame had to wait for a prior call). */
  mutexContended: boolean
  /** Parsed collector number, or null if parsing failed. */
  parsedCn: string | null
  /** Detected ink colour, or null if below confidence threshold. */
  detectedInk: string | null
  /** Final match result: card display name, 'disambiguating', or 'no match'. */
  matchResult: string
}

export interface TelemetryState {
  /** Ring buffer of recent frame snapshots (oldest first). */
  frames: FrameSnapshot[]
  /** Whether the OCR mutex is currently held. */
  mutexLocked: boolean
  /** Number of frames waiting for the mutex. */
  queueDepth: number
  /** Total frames processed since scanner opened. */
  totalFrames: number
  /** Average worker latency over the buffer window (ms). */
  avgLatencyMs: number
  /** Peak worker latency over the buffer window (ms). */
  peakLatencyMs: number
  /** Current memory usage estimate (bytes). */
  currentMemoryBytes: number
}

// ── Configuration ──────────────────────────────────────────────────────

const BUFFER_SIZE = 20

// ── Singleton state ────────────────────────────────────────────────────

let buffer: FrameSnapshot[] = []
let frameCounter = 0
let mutexLocked = false
let queueDepth = 0

// ── Listeners (for React subscriptions) ────────────────────────────────

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const fn of listeners) fn()
}

// ── Public API ─────────────────────────────────────────────────────────

/** Record a processed frame snapshot. */
export function recordFrame(snapshot: Omit<FrameSnapshot, 'timestamp' | 'frameId' | 'memoryUsageBytes'>): void {
  frameCounter++

  const entry: FrameSnapshot = {
    ...snapshot,
    timestamp: new Date().toISOString(),
    frameId: frameCounter,
    memoryUsageBytes: getMemoryUsage(),
  }

  buffer.push(entry)
  if (buffer.length > BUFFER_SIZE) {
    buffer = buffer.slice(-BUFFER_SIZE)
  }

  notify()
}

/** Update the mutex state (call from ocr-worker withLock). */
export function setMutexLocked(locked: boolean): void {
  mutexLocked = locked
  notify()
}

/** Increment the queue depth (a frame is waiting for the mutex). */
export function incrementQueue(): void {
  queueDepth++
  notify()
}

/** Decrement the queue depth (a queued frame acquired the mutex). */
export function decrementQueue(): void {
  queueDepth = Math.max(0, queueDepth - 1)
  notify()
}

/** Subscribe to telemetry state changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Get the current telemetry state (snapshot, not reactive). */
export function getState(): TelemetryState {
  const frames = [...buffer]
  const latencies = frames.map((f) => f.workerLatencyMs)
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
  const peak = latencies.length > 0 ? Math.max(...latencies) : 0

  return {
    frames,
    mutexLocked,
    queueDepth,
    totalFrames: frameCounter,
    avgLatencyMs: Math.round(avg),
    peakLatencyMs: Math.round(peak),
    currentMemoryBytes: getMemoryUsage(),
  }
}

/** Reset all telemetry state (call when scanner closes). */
export function resetTelemetry(): void {
  buffer = []
  frameCounter = 0
  mutexLocked = false
  queueDepth = 0
  notify()
}

/** Export the buffer as a JSON string for user-facing diagnostics. */
export function exportDiagnostics(): string {
  const state = getState()
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    summary: {
      totalFrames: state.totalFrames,
      avgLatencyMs: state.avgLatencyMs,
      peakLatencyMs: state.peakLatencyMs,
      currentMemoryMB: (state.currentMemoryBytes / (1024 * 1024)).toFixed(1),
    },
    recentFrames: state.frames,
  }, null, 2)
}

// ── Internals ──────────────────────────────────────────────────────────

function getMemoryUsage(): number {
  // performance.memory is Chrome-only (non-standard)
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number }
  }
  return perf.memory?.usedJSHeapSize ?? 0
}
