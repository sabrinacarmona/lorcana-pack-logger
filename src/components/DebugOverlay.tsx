import React from 'react'
import type { TelemetryState } from '../utils/telemetry'

interface DebugOverlayProps {
  telemetry: TelemetryState
  visible: boolean
  onClose: () => void
  onExport: () => string
}

/**
 * Real-time debug overlay that visualises the scanner pipeline internals.
 *
 * Shows mutex state, OCR queue depth, latency stats, memory usage,
 * and a scrollable log of the last 20 frame snapshots.
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  telemetry,
  visible,
  onClose,
  onExport,
}) => {
  if (!visible) return null

  const memMB = (telemetry.currentMemoryBytes / (1024 * 1024)).toFixed(1)
  const memAvailable = telemetry.currentMemoryBytes > 0

  const handleExport = () => {
    const json = onExport()
    // Copy to clipboard
    navigator.clipboard.writeText(json).catch(() => {
      // Fallback: log to console
      console.log('[Telemetry Export]', json) // eslint-disable-line no-console
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(360px, 85vw)',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        animation: 'viewSlideInRight 200ms var(--ease)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#7cb3ff', fontFamily: "'Outfit', sans-serif" }}>
          Telemetry
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleExport}
            style={{
              padding: '4px 10px',
              background: 'rgba(59,130,246,0.25)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 4,
              color: '#7cb3ff',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Export
          </button>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Live stats */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 12px',
          flexShrink: 0,
        }}
      >
        <StatRow
          label="Mutex"
          value={telemetry.mutexLocked ? 'LOCKED' : 'free'}
          color={telemetry.mutexLocked ? '#f5a623' : '#34c759'}
        />
        <StatRow
          label="Queue"
          value={`${telemetry.queueDepth} pending`}
          color={telemetry.queueDepth > 2 ? '#ff3b30' : telemetry.queueDepth > 0 ? '#f5a623' : '#34c759'}
        />
        <StatRow
          label="Frames"
          value={String(telemetry.totalFrames)}
          color="#aaf"
        />
        <StatRow
          label="Avg Latency"
          value={`${telemetry.avgLatencyMs}ms`}
          color={telemetry.avgLatencyMs > 500 ? '#ff3b30' : telemetry.avgLatencyMs > 200 ? '#f5a623' : '#34c759'}
        />
        <StatRow
          label="Peak Latency"
          value={`${telemetry.peakLatencyMs}ms`}
          color={telemetry.peakLatencyMs > 1000 ? '#ff3b30' : telemetry.peakLatencyMs > 500 ? '#f5a623' : '#34c759'}
        />
        <StatRow
          label="Memory"
          value={memAvailable ? `${memMB} MB` : 'n/a'}
          color={
            !memAvailable
              ? 'rgba(255,255,255,0.4)'
              : telemetry.currentMemoryBytes > 50 * 1024 * 1024
                ? '#ff3b30'
                : '#34c759'
          }
        />
      </div>

      {/* Queue depth visualizer */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Queue Depth</div>
        <div style={{ display: 'flex', gap: 2, height: 12 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: 2,
                background: i < telemetry.queueDepth
                  ? telemetry.queueDepth > 5 ? '#ff3b30' : telemetry.queueDepth > 2 ? '#f5a623' : '#34c759'
                  : 'rgba(255,255,255,0.06)',
                transition: 'background 150ms ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Frame log */}
      <div style={{ padding: '10px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Recent Frames ({telemetry.frames.length}/{20})
        </div>
        {telemetry.frames.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', padding: '8px 0' }}>
            No frames captured yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...telemetry.frames].reverse().map((frame) => (
              <div
                key={frame.frameId}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 4,
                  borderLeft: `2px solid ${
                    frame.matchResult.includes('no match')
                      ? '#ff3b30'
                      : frame.matchResult.includes('disambig')
                        ? '#f5a623'
                        : frame.ocrConfidence < 40
                          ? '#666'
                          : '#34c759'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>#{frame.frameId}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {frame.workerLatencyMs}ms
                    {frame.mutexContended && (
                      <span style={{ color: '#f5a623', marginLeft: 4 }}>queued</span>
                    )}
                  </span>
                </div>
                <div>
                  OCR: <span style={{ color: frame.ocrConfidence >= 60 ? '#4f4' : frame.ocrConfidence >= 40 ? '#ff4' : '#f84' }}>
                    {Math.round(frame.ocrConfidence)}%
                  </span>
                  {' '}&quot;{frame.ocrText.slice(0, 20)}{frame.ocrText.length > 20 ? '...' : ''}&quot;
                </div>
                <div>
                  CN: {frame.parsedCn || '-'} | Ink: {frame.detectedInk || '-'} | {frame.matchResult}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** A single stat row in the live stats grid. */
const StatRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    <span style={{ color, fontWeight: 600 }}>{value}</span>
  </div>
)
