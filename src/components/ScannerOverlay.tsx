import React, { useState, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import type { MatchMethod, ScannerDebugInfo, DebugCaptures } from '../hooks/useScanner'
import { RarityBadge } from './RarityBadge'
import { InkDot } from './InkDot'

interface ScannerOverlayProps {
  scannerState: ScannerState
  lastMatch: Card | null
  matchMethod: MatchMethod
  candidates: Card[]
  error: string | null
  scanCount: number
  debugInfo: ScannerDebugInfo | null
  debugCaptures: DebugCaptures | null
  lastOcrText: string
  lastDetectedInk: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onClose: () => void
  onRetry: () => void
  onSelectCandidate: (card: Card) => void
  onCaptureDebug: () => void
  onDismissDebugCaptures: () => void
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scannerState,
  lastMatch,
  matchMethod,
  candidates,
  error,
  scanCount,
  debugInfo,
  debugCaptures,
  lastOcrText,
  lastDetectedInk,
  videoRef,
  onClose,
  onRetry,
  onSelectCandidate,
  onCaptureDebug,
  onDismissDebugCaptures,
}) => {
  const [showHint, setShowHint] = useState(false)

  // Show a helpful hint after 10s of no match
  useEffect(() => {
    if (scannerState !== 'streaming') {
      setShowHint(false)
      return
    }
    const timer = setTimeout(() => setShowHint(true), 10000)
    return () => clearTimeout(timer)
  }, [scannerState, scanCount])

  const isMatched = scannerState === 'matched'
  const isDisambiguating = scannerState === 'disambiguating'
  const guideColor = isMatched
    ? 'var(--success)'
    : isDisambiguating
      ? 'var(--accent)'
      : 'var(--accent)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scannerFadeIn 200ms ease-out',
      }}
    >
      {/* Camera feed */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Dark overlay with transparent guide window */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Scan Card
              <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>
                v{__APP_VERSION__}
              </span>
            </span>
            {scanCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'rgba(245,166,35,0.15)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {scanCount} scanned
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Debug capture button — freezes frame and shows what the algorithm sees */}
            {(scannerState === 'streaming' || scannerState === 'processing' || scannerState === 'disambiguating') && (
              <button
                onClick={onCaptureDebug}
                style={{
                  height: 36,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'rgba(59,130,246,0.3)',
                  border: '1px solid rgba(59,130,246,0.5)',
                  borderRadius: 'var(--radius-full)',
                  color: '#7cb3ff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Debug
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Single card-shaped guide frame — matches algo crop (18%/21%/64%×58%) */}
        <div
          style={{
            position: 'absolute',
            left: '18%',
            right: '18%',
            top: '21%',
            height: '58%',
            pointerEvents: 'none',
          }}
        >
          {/* Guide rectangle with corner brackets */}
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              animation: isMatched
                ? 'scannerMatchFlash 300ms ease-out'
                : isDisambiguating
                  ? undefined
                  : 'scannerGuidePulse 2s ease-in-out infinite',
            }}
          >
            {/* Corner brackets */}
            {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
              const isTop = corner.includes('top')
              const isLeft = corner.includes('Left')
              return (
                <div
                  key={corner}
                  style={{
                    position: 'absolute',
                    [isTop ? 'top' : 'bottom']: -2,
                    [isLeft ? 'left' : 'right']: -2,
                    width: 28,
                    height: 28,
                    borderColor: guideColor,
                    borderStyle: 'solid',
                    borderWidth: 0,
                    borderTopWidth: isTop ? 3 : 0,
                    borderBottomWidth: isTop ? 0 : 3,
                    borderLeftWidth: isLeft ? 3 : 0,
                    borderRightWidth: isLeft ? 0 : 3,
                    borderRadius: isTop
                      ? isLeft ? '8px 0 0 0' : '0 8px 0 0'
                      : isLeft ? '0 0 0 8px' : '0 0 8px 0',
                    transition: 'border-color 200ms ease',
                  }}
                />
              )
            })}
          </div>

          {/* CN region indicator — dashed rect at bottom of guide */}
          {(scannerState === 'streaming' || scannerState === 'processing') && (
            <div
              style={{
                position: 'absolute',
                left: '20%',
                width: '60%',
                top: '88%',
                height: '10%',
                border: '1px dashed rgba(52,199,89,0.5)',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Ink dot indicator — dashed circle at bottom-left of guide */}
          {(scannerState === 'streaming' || scannerState === 'processing') && (
            <div
              style={{
                position: 'absolute',
                left: '2%',
                top: '85%',
                width: '12%',
                height: '12%',
                border: '1px dashed rgba(175,82,222,0.5)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Status text — centered inside the guide frame */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              textAlign: 'center',
              pointerEvents: 'auto',
            }}
          >
            {scannerState === 'requesting' && (
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--accent)',
                  fontFamily: "'Outfit', sans-serif",
                  animation: 'fadeIn 300ms ease-out',
                }}
              >
                Requesting camera access...
              </span>
            )}
            {(scannerState === 'streaming' || scannerState === 'processing') && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  animation: 'fadeIn 300ms ease-out',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.8)',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Center the card in the frame
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Make sure the collector number is visible
                </span>
              </div>
            )}

            {isMatched && lastMatch && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  animation: 'scannerCardBanner 300ms ease-out',
                }}
              >
                {lastMatch.imageUrl && (
                  <img
                    src={lastMatch.imageUrl}
                    alt={lastMatch.display}
                    style={{
                      width: 60,
                      height: 84,
                      borderRadius: 6,
                      objectFit: 'cover',
                      border: '2px solid rgba(52,199,89,0.6)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(52,199,89,0.2)',
                    border: '1px solid rgba(52,199,89,0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                  }}
                >
                  <InkDot ink={lastMatch.ink} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#fff',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {lastMatch.display}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    #{lastMatch.cn}
                  </span>
                  <RarityBadge rarity={lastMatch.rarity} />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--success)',
                    fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Matched by {matchMethod === 'cn+ink' ? 'CN + ink' : 'collector #'} · #{lastMatch.cn}
                </span>
              </div>
            )}

            {scannerState === 'error' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  animation: 'fadeIn 300ms ease-out',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--danger)',
                    fontFamily: "'Outfit', sans-serif",
                    textAlign: 'center',
                    maxWidth: 280,
                  }}
                >
                  {error}
                </span>
                <button
                  onClick={onRetry}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#000',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Helpful hint after 10s of no match */}
          {showHint && scannerState === 'streaming' && (
            <div
              style={{
                position: 'absolute',
                bottom: -24,
                left: 0,
                right: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                fontFamily: "'Outfit', sans-serif",
                animation: 'fadeIn 300ms ease-out',
              }}
            >
              Center the card within the brackets
            </div>
          )}
        </div>

        {/* Disambiguation bottom sheet — separate from guide frame so it can scroll */}
        {isDisambiguating && candidates.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '55%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              pointerEvents: 'auto',
              animation: 'scannerCardBanner 300ms ease-out',
              zIndex: 3,
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                fontFamily: "'Outfit', sans-serif",
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Multiple matches — tap to confirm
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {candidates.map((card) => (
                <button
                  key={`${card.setCode}-${card.cn}`}
                  onClick={() => onSelectCandidate(card)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: 'rgba(245,166,35,0.12)',
                    border: '1px solid rgba(245,166,35,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt=""
                      style={{
                        width: 36,
                        height: 50,
                        borderRadius: 4,
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {card.display}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 2,
                      }}
                    >
                      {card.setName} · #{card.cn}
                    </div>
                  </div>
                  <InkDot ink={card.ink} />
                  <RarityBadge rarity={card.rarity} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Debug panel — shows live CN + ink matching info */}
        {debugInfo && (scannerState === 'streaming' || scannerState === 'processing') && (
          <div
            style={{
              position: 'absolute',
              bottom: 'max(8px, env(safe-area-inset-bottom))',
              left: 8,
              right: 8,
              background: 'rgba(0,0,0,0.75)',
              borderRadius: 8,
              padding: '8px 10px',
              fontFamily: 'monospace',
              fontSize: 10,
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.7)',
              pointerEvents: 'none',
            }}
          >
            <div>Cam: <span style={{ color: '#aaf' }}>{debugInfo.videoRes || '?'}</span> | OCR: <span style={{ color: debugInfo.lastOcrConfidence >= 60 ? '#4f4' : debugInfo.lastOcrConfidence >= 40 ? '#ff4' : '#f84' }}>{Math.round(debugInfo.lastOcrConfidence)}%</span> "{debugInfo.lastOcrText}"</div>
            <div>CN: <span style={{ color: debugInfo.parsedCn !== '-' && debugInfo.parsedCn !== 'no match' ? '#4f4' : '#f84' }}>{debugInfo.parsedCn}</span> | Ink: <span style={{ color: debugInfo.inkConfidence >= 0.5 ? '#4f4' : debugInfo.inkConfidence >= 0.3 ? '#ff4' : '#f84' }}>{debugInfo.detectedInk} ({(debugInfo.inkConfidence * 100).toFixed(0)}%)</span></div>
            <div>Match: <span style={{ color: debugInfo.matchResult.includes('(') ? '#4f4' : '#ff4' }}>{debugInfo.matchResult}</span></div>
          </div>
        )}
      </div>

      {/* ── Debug Captures Viewer ─────────────────────────────────────── */}
      {debugCaptures && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.95)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#7cb3ff',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Debug Capture
              <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                {debugCaptures.videoRes}
              </span>
            </span>
            <button
              onClick={onDismissDebugCaptures}
              style={{
                padding: '6px 16px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Back
            </button>
          </div>

          {/* Caption explaining purpose */}
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'Outfit', sans-serif",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            These are the exact pixels the algorithm receives. If the card
            isn't visible or centered in these crops, no matching technique
            will work.
          </div>

          {/* Image grid — each crop with a label */}
          {([
            {
              label: 'Full Camera Frame',
              desc: 'Raw video feed, uncropped',
              src: debugCaptures.fullFrame,
              border: '#555',
            },
            {
              label: 'Algorithm Crop',
              desc: 'What gets sent to image matching (inner 64×58% of frame)',
              src: debugCaptures.algoCrop,
              border: '#f5a623',
            },
            {
              label: 'Collector Number Region',
              desc: 'Bottom of card — where "102/204 · EN" lives',
              src: debugCaptures.cnRegion,
              border: '#34c759',
            },
            {
              label: 'Ink Dot Region',
              desc: 'Bottom-left corner — the ink colour circle',
              src: debugCaptures.inkDotRegion,
              border: '#af52de',
            },
          ] as const).map((item) => (
            <div key={item.label} style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: item.border,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: "'Outfit', sans-serif",
                    marginLeft: 8,
                  }}
                >
                  {item.desc}
                </span>
              </div>
              <img
                src={item.src}
                alt={item.label}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: `2px solid ${item.border}`,
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
