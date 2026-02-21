import React from 'react';
import { RarityFlashType, CardSource } from '../types';
import { formatRelativeTime } from '../utils/formatting';

interface HeaderProps {
  sessionName: string;
  onSessionNameChange: (name: string) => void;
  savedIndicator: boolean;
  cardSource: CardSource | null;
  sensoryEnabled: boolean;
  onSensoryToggle: (enabled: boolean) => void;
  rarityFlash: RarityFlashType | null;
  totalCards: number;
  totalPacks: number;
  totalFoils: number;
  totalSuperRare: number;
  totalLegendary: number;
  totalEnchanted: number;
  sessionStartedAt: number | null;
  relativeTime: string | null;
  countBumping: boolean;
  historyCount: number;
  onHistoryClick: () => void;
  onExportClick: () => void;
  onClearClick: () => void;
}

const IconHistory = () => (
  <svg
    style={{ width: 18, height: 18 }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  sessionName,
  onSessionNameChange,
  savedIndicator,
  cardSource,
  sensoryEnabled,
  onSensoryToggle,
  rarityFlash,
  totalCards,
  totalPacks,
  totalFoils,
  totalSuperRare,
  totalLegendary,
  totalEnchanted,
  sessionStartedAt,
  relativeTime,
  countBumping,
  historyCount,
  onHistoryClick,
  onExportClick,
  onClearClick,
}) => {
  const isStaleSession = sessionStartedAt && Date.now() - sessionStartedAt > 86400000;

  return (
    <div
      className="app-header"
      style={{
        padding: '12px 24px 10px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-base)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Rarity flash overlays */}
      {rarityFlash === 'legendary' && (
        <div
          key="flash-legendary"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at center, rgba(255,214,10,0.4) 0%, transparent 70%)',
            animation: 'rarityFlashGold 300ms ease-out forwards',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {rarityFlash === 'enchanted' && (
        <div
          key="flash-enchanted"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(191,90,242,0.3), rgba(90,200,250,0.3), rgba(52,199,89,0.3), rgba(255,214,10,0.3), rgba(191,90,242,0.3))',
            backgroundSize: '200% 200%',
            animation: 'rarityFlashPrismatic 400ms ease-out forwards',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Row 1: sparkle + session name + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.02em',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            ✨ Pack Logger
          </span>
          <input
            className="session-name-input"
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.02em',
              flex: 1,
              minWidth: 0,
              maxWidth: 320,
              textOverflow: 'ellipsis',
              transition: 'border-color 200ms ease, box-shadow 300ms ease',
              boxShadow: '0 0 0 0 transparent',
            }}
            type="text"
            value={sessionName}
            placeholder="Name this session…"
            onChange={(ev) => onSessionNameChange(ev.target.value)}
            onFocus={(ev) => {
              const el = ev.target as HTMLInputElement;
              el.style.borderColor = 'var(--accent)';
              el.style.boxShadow = '0 0 0 1px rgba(245,166,35,0.3), 0 0 12px rgba(245,166,35,0.08)';
            }}
            onBlur={(ev) => {
              const el = ev.target as HTMLInputElement;
              el.style.borderColor = 'transparent';
              el.style.boxShadow = '0 0 0 0 transparent';
            }}
          />
          {savedIndicator && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--success)',
                marginLeft: 4,
                animation: 'savedFade 1.8s ease forwards',
              }}
            >
              ✓ Saved
            </span>
          )}
          {cardSource === 'updated' && (
            <span style={{ fontSize: 10, color: 'var(--success)', marginLeft: 6 }}>
              ✓ Updated
            </span>
          )}
          {cardSource === 'cached' && (
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 6 }}>
              Cached
            </span>
          )}
          {cardSource === 'offline' && (
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 6 }}>
              Offline
            </span>
          )}
        </div>

        {/* Sensory toggle button */}
        <button
          title={sensoryEnabled ? 'Sensory feedback on' : 'Sensory feedback off'}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: sensoryEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 16,
            lineHeight: 1,
            fontFamily: "'Outfit', sans-serif",
            transition: 'color 200ms ease, border-color 200ms ease',
            borderColor: sensoryEnabled ? 'var(--accent)' : 'var(--border)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            minWidth: 32,
          }}
          onClick={() => {
            const next = !sensoryEnabled;
            onSensoryToggle(next);
            try {
              localStorage.setItem('lorcana_sensory_enabled', String(next));
            } catch (e) {}
          }}
        >
          <svg
            style={{ width: 16, height: 16 }}
            viewBox="0 0 24 24"
            fill={sensoryEnabled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sensoryEnabled ? (
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            ) : (
              <>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <line x1={1} y1={1} x2={23} y2={23} strokeWidth="2" />
              </>
            )}
          </svg>
        </button>

        {/* Desktop header actions */}
        <div
          className="desktop-header-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            style={{
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={onHistoryClick}
          >
            <IconHistory />
            {historyCount > 0 && (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{historyCount}</span>
            )}
          </button>

          {totalCards > 0 && (
            <button
              className="export-btn"
              style={{
                padding: '6px 14px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--bg-base)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
              onClick={onExportClick}
            >
              Export →
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Stats bar */}
      {totalCards > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            paddingLeft: 28,
          }}
        >
          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
              display: 'inline-block',
              animation: countBumping ? 'countBump 200ms ease-out' : 'none',
            }}
          >
            {totalCards} card{totalCards !== 1 ? 's' : ''}
          </span>
          {totalPacks > 0 && (
            <span style={{ color: 'var(--text-secondary)' }}>
              · {totalPacks} pack{totalPacks !== 1 ? 's' : ''}
            </span>
          )}
          {totalFoils > 0 && (
            <span style={{ color: 'var(--foil)' }}>· {totalFoils} foil</span>
          )}
          {totalSuperRare > 0 && (
            <span
              style={{
                color: '#64D2FF',
                display: 'inline-block',
                animation: rarityFlash === 'superrare' ? 'rarityPulseSR 300ms ease-out' : 'none',
              }}
            >
              · {totalSuperRare} super rare
            </span>
          )}
          {totalLegendary > 0 && (
            <span style={{ color: '#FFD60A' }}>· {totalLegendary} legendary</span>
          )}
          {totalEnchanted > 0 && (
            <span style={{ color: '#34C759' }}>· {totalEnchanted} enchanted</span>
          )}
          {relativeTime && (
            <span
              style={{
                color: isStaleSession ? 'var(--danger)' : 'var(--text-tertiary)',
                marginLeft: 4,
                fontSize: 11,
              }}
            >
              · Started {relativeTime}
            </span>
          )}
          {isStaleSession && (
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '0 2px',
                fontFamily: "'Outfit', sans-serif",
                textDecoration: 'underline',
                marginLeft: 2,
              }}
              onClick={onClearClick}
            >
              Start fresh?
            </button>
          )}
        </div>
      )}
    </div>
  );
};
