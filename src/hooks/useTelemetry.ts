import { useState, useEffect, useCallback, useRef } from 'react'
import {
  subscribe,
  getState,
  resetTelemetry,
  exportDiagnostics,
  type TelemetryState,
} from '../utils/telemetry'

/**
 * React hook that subscribes to the telemetry ring buffer.
 *
 * Returns the latest TelemetryState and helpers for the debug overlay.
 * The state is throttled to ~4 updates/sec to avoid excessive re-renders.
 */
export function useTelemetry() {
  const [state, setState] = useState<TelemetryState>(getState)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    const unsub = subscribe(() => {
      // Throttle via rAF — at most one update per animation frame
      if (pendingRef.current) return
      pendingRef.current = true
      rafRef.current = requestAnimationFrame(() => {
        setState(getState())
        pendingRef.current = false
      })
    })

    return () => {
      unsub()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((v) => !v)
  }, [])

  const reset = useCallback(() => {
    resetTelemetry()
    setState(getState())
  }, [])

  const exportJson = useCallback(() => {
    return exportDiagnostics()
  }, [])

  return {
    telemetry: state,
    overlayVisible,
    toggleOverlay,
    resetTelemetry: reset,
    exportDiagnostics: exportJson,
  }
}
