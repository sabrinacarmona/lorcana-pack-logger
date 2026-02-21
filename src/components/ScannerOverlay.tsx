import React, { useState, useEffect } from 'react'
import type { Card, ScannerState } from '../types'
import { RarityBadge } from './RarityBadge'
import { InkDot } from './InkDot'

interface ScannerOverlayProps {
  scannerState: ScannerState
  lastMatch: Card | null
  candidates: Card[]
  error: string | null
  scanCount: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  onClose: () => void
  onRetry: () => void
  onSelectCandidate: (card: Card) => void
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scannerState,
  lastMatch,
  candidates,
  error,
  scanCount,
  videoRef,
  onClose,
  onRetry,
  onSelectCandidate,
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

        {/* Guide frame — targets center-upper area where the card name is printed */}
        <div
          style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            top: '15%',
            height: '20%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
                    width: 24,
                    height: 24,
                    borderColor: guideColor,
                    borderStyle: 'solid',
                    borderWidth: 0,
                    borderTopWidth: isTop ? 3 : 0,
                    borderBottomWidth: isTop ? 0 : 3,
                    borderLeftWidth: isLeft ? 3 : 0,
                    borderRightWidth: isLeft ? 0 : 3,
                    borderRadius: isTop
                      ? isLeft ? '6px 0 0 0' : '0 6px 0 0'
                      : isLeft ? '0 0 0 6px' : '0 0 6px 0',
                    transition: 'border-color 200ms ease',
                  }}
                />
              )
            })}
          </div>

          {/* Instructions / status text below guide */}
          <div
            style={{
              marginTop: 16,
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
              <span
                style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: "'Outfit', sans-serif",
                  animation: 'fadeIn 300ms ease-out',
                }}
              >
                Scanning...
              </span>
            )}

            {isMatched && lastMatch && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  animation: 'scannerCardBanner 300ms ease-out',
                }}
              >
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
                  Added to session
                </span>
              </div>
            )}
            {isDisambiguating && candidates.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  animation: 'scannerCardBanner 300ms ease-out',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: "'Outfit', sans-serif",
                    marginBottom: 4,
                  }}
                >
                  Multiple matches — tap to confirm
                </span>
                {candidates.map((card) => (
                  <button
                    key={`${card.setCode}-${card.cn}`}
                    onClick={() => onSelectCandidate(card)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      background: 'rgba(245,166,35,0.15)',
                      border: '1px solid rgba(245,166,35,0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <InkDot ink={card.ink} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        flex: 1,
                        textAlign: 'left',
                      }}
                    >
                      {card.display}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {card.setName}
                    </span>
                    <RarityBadge rarity={card.rarity} />
                  </button>
                ))}
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
                marginTop: 8,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                fontFamily: "'Outfit', sans-serif",
                animation: 'fadeIn 300ms ease-out',
              }}
            >
              Center the card name in the frame
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
