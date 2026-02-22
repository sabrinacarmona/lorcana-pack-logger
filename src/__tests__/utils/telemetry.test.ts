/**
 * Unit tests for the TelemetryService.
 *
 * Verifies ring buffer behaviour, mutex state tracking, subscriptions,
 * and export functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordFrame,
  setMutexLocked,
  incrementQueue,
  decrementQueue,
  getState,
  resetTelemetry,
  subscribe,
  exportDiagnostics,
} from '../../utils/telemetry'

describe('TelemetryService', () => {
  beforeEach(() => {
    resetTelemetry()
  })

  it('starts with empty state', () => {
    const state = getState()
    expect(state.frames).toHaveLength(0)
    expect(state.totalFrames).toBe(0)
    expect(state.mutexLocked).toBe(false)
    expect(state.queueDepth).toBe(0)
    expect(state.avgLatencyMs).toBe(0)
    expect(state.peakLatencyMs).toBe(0)
  })

  it('records frames into ring buffer', () => {
    recordFrame({
      ocrConfidence: 75,
      ocrText: '102/204',
      workerLatencyMs: 120,
      mutexContended: false,
      parsedCn: '102/204',
      detectedInk: 'Amber',
      matchResult: 'Pacha / Trekmate (cn)',
    })

    const state = getState()
    expect(state.frames).toHaveLength(1)
    expect(state.totalFrames).toBe(1)
    expect(state.frames[0].ocrText).toBe('102/204')
    expect(state.frames[0].frameId).toBe(1)
    expect(state.frames[0].timestamp).toBeTruthy()
  })

  it('ring buffer caps at 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      recordFrame({
        ocrConfidence: 50 + i,
        ocrText: `${i}/204`,
        workerLatencyMs: 100 + i,
        mutexContended: false,
        parsedCn: `${i}/204`,
        detectedInk: null,
        matchResult: 'no match',
      })
    }

    const state = getState()
    expect(state.frames).toHaveLength(20)
    expect(state.totalFrames).toBe(25)
    // Oldest should be frame 6 (indices 5-24 kept)
    expect(state.frames[0].frameId).toBe(6)
    expect(state.frames[19].frameId).toBe(25)
  })

  it('computes average and peak latency', () => {
    recordFrame({ ocrConfidence: 80, ocrText: 'a', workerLatencyMs: 100, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })
    recordFrame({ ocrConfidence: 80, ocrText: 'b', workerLatencyMs: 200, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })
    recordFrame({ ocrConfidence: 80, ocrText: 'c', workerLatencyMs: 300, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })

    const state = getState()
    expect(state.avgLatencyMs).toBe(200) // (100+200+300)/3
    expect(state.peakLatencyMs).toBe(300)
  })

  it('tracks mutex state', () => {
    expect(getState().mutexLocked).toBe(false)

    setMutexLocked(true)
    expect(getState().mutexLocked).toBe(true)

    setMutexLocked(false)
    expect(getState().mutexLocked).toBe(false)
  })

  it('tracks queue depth with increment/decrement', () => {
    expect(getState().queueDepth).toBe(0)

    incrementQueue()
    incrementQueue()
    incrementQueue()
    expect(getState().queueDepth).toBe(3)

    decrementQueue()
    expect(getState().queueDepth).toBe(2)

    decrementQueue()
    decrementQueue()
    expect(getState().queueDepth).toBe(0)

    // Can't go below 0
    decrementQueue()
    expect(getState().queueDepth).toBe(0)
  })

  it('notifies subscribers on state changes', () => {
    const listener = vi.fn()
    const unsub = subscribe(listener)

    recordFrame({ ocrConfidence: 50, ocrText: 'x', workerLatencyMs: 50, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })
    expect(listener).toHaveBeenCalledTimes(1)

    setMutexLocked(true)
    expect(listener).toHaveBeenCalledTimes(2)

    incrementQueue()
    expect(listener).toHaveBeenCalledTimes(3)

    unsub()
    recordFrame({ ocrConfidence: 50, ocrText: 'y', workerLatencyMs: 50, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })
    // Should NOT be called again after unsubscribing
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('resets all state', () => {
    recordFrame({ ocrConfidence: 80, ocrText: 'a', workerLatencyMs: 100, mutexContended: false, parsedCn: '1/2', detectedInk: 'Ruby', matchResult: 'Card X' })
    setMutexLocked(true)
    incrementQueue()

    resetTelemetry()

    const state = getState()
    expect(state.frames).toHaveLength(0)
    expect(state.totalFrames).toBe(0)
    expect(state.mutexLocked).toBe(false)
    expect(state.queueDepth).toBe(0)
  })

  it('exports diagnostics as valid JSON', () => {
    recordFrame({ ocrConfidence: 82, ocrText: '105/204', workerLatencyMs: 150, mutexContended: true, parsedCn: '105/204', detectedInk: 'Emerald', matchResult: 'Simba (cn+ink)' })

    const json = exportDiagnostics()
    const parsed = JSON.parse(json)

    expect(parsed.exportedAt).toBeTruthy()
    expect(parsed.summary.totalFrames).toBe(1)
    expect(parsed.summary.avgLatencyMs).toBe(150)
    expect(parsed.summary.peakLatencyMs).toBe(150)
    expect(parsed.recentFrames).toHaveLength(1)
    expect(parsed.recentFrames[0].ocrText).toBe('105/204')
  })

  it('frame snapshots include monotonically increasing IDs', () => {
    for (let i = 0; i < 5; i++) {
      recordFrame({ ocrConfidence: 50, ocrText: '', workerLatencyMs: 10, mutexContended: false, parsedCn: null, detectedInk: null, matchResult: 'no match' })
    }

    const frames = getState().frames
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].frameId).toBeGreaterThan(frames[i - 1].frameId)
    }
  })
})
