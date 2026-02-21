import React, { useMemo, useRef, useEffect } from 'react';
import { Card, Pull, ScannerState } from '../types';
import { PACK_SIZE } from '../constants';
import { inkGradientStyle } from '../utils/colour';
import { rarityRowStyle, rarityNameColour } from '../utils/rarity-styles';
import { InkDot } from './InkDot';
import { RarityBadge } from './RarityBadge';
import { PackDivider } from './PackDivider';
import { ScannerOverlay } from './ScannerOverlay';

interface SearchViewProps {
  search: string;
  setFilter: string;
  onSetFilterChange: (filter: string) => void;
  setMap: Record<string, string>;
  setColours: Record<string, string>;
  results: Card[];
  selectedIdx: number;
  onSelectedIdxChange: (idx: number) => void;
  pulls: Pull[];
  onAddCard: (card: Card, variant: 'normal' | 'foil', closeSearch?: boolean) => void;
  onUpdateCount: (key: string, delta: number) => void;
  onRemovePull: (key: string) => void;
  removingKey: string | null;
  firstInteraction: boolean;
  hintsDismissed: boolean;
  totalCards: number;
  confirmClear: boolean;
  onClearClick: () => void;
  onClearConfirm: () => void;
  onCancelClear: () => void;
  onSearchChange: (search: string) => void;
  onSearch: (query: string) => void;
  onKeyDown: (ev: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  resultsRef: React.RefObject<HTMLDivElement>;
  // Scanner props
  scannerActive: boolean;
  scannerState: ScannerState;
  lastMatch: Card | null;
  candidates: Card[];
  scannerError: string | null;
  scanCount: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraSupported: boolean;
  onOpenScanner: () => void;
  onCloseScanner: () => void;
  onSelectCandidate: (card: Card) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  search,
  setFilter,
  onSetFilterChange,
  setMap,
  setColours,
  results,
  selectedIdx,
  onSelectedIdxChange,
  pulls,
  onAddCard,
  onUpdateCount,
  onRemovePull,
  removingKey,
  firstInteraction,
  hintsDismissed,
  totalCards,
  confirmClear,
  onClearClick,
  onClearConfirm,
  onCancelClear,
  onSearchChange,
  onSearch,
  onKeyDown,
  inputRef,
  resultsRef,
  scannerActive,
  scannerState,
  lastMatch,
  candidates,
  scannerError,
  scanCount,
  videoRef,
  cameraSupported,
  onOpenScanner,
  onCloseScanner,
  onSelectCandidate,
}) => {
  // Generate set options
  const setOptions = useMemo(() => {
    const options = [<option key="all" value="all">All Sets</option>];
    Object.keys(setMap).forEach((code) => {
      options.push(
        <option key={code} value={code}>
          {setMap[code]}
        </option>
      );
    });
    return options;
  }, [setMap]);

  // Group pulls by set
  const groupedPulls = useMemo(() => {
    const groups: Record<string, Pull[]> = {};
    pulls.forEach((p) => {
      const setName = p.card.setName;
      if (!groups[setName]) {
        groups[setName] = [];
      }
      groups[setName].push(p);
    });
    return groups;
  }, [pulls]);

  // Render result items
  const resultItems = useMemo(() => {
    return results.map((card, idx) => {
      // Count for this card
      const nKey = card.setCode + '-' + card.cn + '-normal';
      const fKey = card.setCode + '-' + card.cn + '-foil';
      let nCount = 0;
      let fCount = 0;
      pulls.forEach((p) => {
        if (p.key === nKey) nCount = p.count;
        if (p.key === fKey) fCount = p.count;
      });

      return (
        <div
          key={card.setCode + '-' + card.cn}
          className="result-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            cursor: 'pointer',
            borderBottom: '1px solid transparent',
            borderImage: 'linear-gradient(90deg, rgba(30,51,82,0.5) 0%, transparent 60%) 1',
            backgroundImage: idx === selectedIdx
              ? `linear-gradient(90deg, rgba(245,166,35,0.12) 0%, rgba(245,166,35,0.04) 40%, transparent 70%)`
              : inkGradientStyle(card.ink, 0.08).backgroundImage || 'none',
            backgroundRepeat: 'no-repeat',
            borderLeft: idx === selectedIdx ? '3px solid var(--accent)' : '3px solid transparent',
            transition: 'border-left-color 150ms ease-out, background 150ms ease',
            animation: 'fadeIn 150ms ease-out',
            animationFillMode: 'both',
            animationDelay: idx * 20 + 'ms',
          }}
          onMouseEnter={() => onSelectedIdxChange(idx)}
          onClick={() => onAddCard(card, 'normal')}
          onContextMenu={(ev) => {
            ev.preventDefault();
            onAddCard(card, 'foil');
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              flex: 1,
              minWidth: 0,
            }}
          >
            <span style={{ paddingTop: 6, flexShrink: 0 }}>
              <InkDot ink={card.ink} />
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {(() => {
                  const dashIdx = card.display.indexOf(' – ');
                  if (dashIdx >= 0) {
                    return (
                      <>
                        <span style={{
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 600,
                          fontSize: 14,
                          letterSpacing: '0.01em',
                        }}>
                          {card.display.slice(0, dashIdx)}
                        </span>
                        <span style={{
                          fontWeight: 400,
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          letterSpacing: '-0.01em',
                        }}>
                          {card.display.slice(dashIdx)}
                        </span>
                      </>
                    );
                  }
                  return (
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: '0.01em',
                    }}>
                      {card.display}
                    </span>
                  );
                })()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {card.setName} #{card.cn} · {card.type.join(', ')} ·{' '}
                <RarityBadge rarity={card.rarity} />
              </span>
            </div>
          </div>

          {/* Add buttons */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            <button
              key="n"
              className="add-btn"
              style={{
                padding: '4px 10px',
                background: nCount > 0 ? 'var(--success)' : 'rgba(52,199,89,0.08)',
                border:
                  nCount > 0 ? '1px solid var(--success)' : '1px solid rgba(52,199,89,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: nCount > 0 ? '#fff' : 'var(--success)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                whiteSpace: 'nowrap',
                minWidth: 38,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                onAddCard(card, 'normal');
              }}
            >
              {nCount > 0 ? '+' + nCount : '+1'}
            </button>
            <button
              key="f"
              className="add-btn"
              style={{
                padding: '4px 10px',
                background: fCount > 0 ? 'var(--foil)' : 'transparent',
                border: fCount > 0
                  ? '1px solid var(--foil)'
                  : '1px solid rgba(124,58,237,0.35)',
                borderRadius: 'var(--radius-sm)',
                color: fCount > 0 ? '#fff' : 'rgba(191,90,242,0.7)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                whiteSpace: 'nowrap',
                minWidth: 52,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                onAddCard(card, 'foil', false);
              }}
            >
              {fCount > 0 ? '✦ ' + fCount : '✦ Foil'}
            </button>
          </div>
        </div>
      );
    });
  }, [results, selectedIdx, pulls, onSelectedIdxChange, onAddCard]);

  // Build pull groups with dividers
  const pullGroups = useMemo(() => {
    const groups: JSX.Element[] = [];
    Object.keys(groupedPulls).forEach((setName) => {
      const items: JSX.Element[] = [
        <div
          key={setName + '-h'}
          className="pull-group-header"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontFamily: "'Poppins', sans-serif",
            padding: '4px 0 6px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
            position: 'sticky',
            top: 60,
            zIndex: 10,
            background: 'rgba(10,22,40,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {setName}
        </div>,
      ];

      let lastPackInGroup: number | null = null;
      const pullsInGroup = groupedPulls[setName];
      pullsInGroup?.forEach((p) => {
        // Pack divider
        if (p.packNumber && p.packNumber !== lastPackInGroup) {
          lastPackInGroup = p.packNumber;
          items.push(
            <PackDivider key={`pack-${p.packNumber}-${setName}`} packNumber={p.packNumber} />
          );
        }

        // Pull item
        items.push(
          <div
            key={p.key}
            style={{
              ...rarityRowStyle(p.card, p.variant),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 4px 8px 8px',
              borderBottom: '1px solid rgba(30,51,82,0.5)',
              gap: 8,
              animation:
                removingKey === p.key
                  ? 'pullRemove 200ms ease-in forwards'
                  : p.card.rarity === 'Enchanted'
                    ? 'slideInRight 250ms ease-out, shimmer 8s linear infinite'
                    : 'slideInRight 250ms ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                minWidth: 0,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={
                  p.card.rarity === 'Legendary'
                    ? { filter: 'drop-shadow(0 0 4px rgba(255,214,10,0.4))' }
                    : {}
                }
              >
                <InkDot ink={p.card.ink} size={8} />
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: rarityNameColour(p.card.rarity),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow:
                    p.card.rarity === 'Enchanted'
                      ? '0 0 8px rgba(191,90,242,0.3), 0 0 8px rgba(90,200,250,0.2)'
                      : 'none',
                }}
              >
                {p.card.display}
                <span
                  style={{
                    color: 'var(--text-tertiary)',
                    marginLeft: 4,
                    fontSize: 11,
                    fontWeight: 400,
                  }}
                >
                  #{p.card.cn}
                </span>
              </span>
              {p.variant === 'foil' && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--foil)',
                    background: 'rgba(191,90,242,0.1)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  ✦ FOIL
                </span>
              )}
              <RarityBadge rarity={p.card.rarity} />
            </div>

            {/* Quantity controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <button
                className="qty-btn"
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-elevated)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-secondary)',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                onClick={() => onUpdateCount(p.key, -1)}
              >
                −
              </button>
              <span
                className="pull-count"
                style={{
                  minWidth: 22,
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.count}
              </span>
              <button
                className="qty-btn"
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-elevated)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-secondary)',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                onClick={() => onUpdateCount(p.key, 1)}
              >
                +
              </button>
              <button
                className="remove-btn"
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
                onClick={() => onRemovePull(p.key)}
              >
                ✕
              </button>
            </div>
          </div>
        );
      });

      groups.push(
        <div key={setName} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {items}
        </div>
      );
    });
    return groups;
  }, [groupedPulls, removingKey, onUpdateCount, onRemovePull]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        paddingBottom: 80,
      }}
    >
      {/* Main content */}
      <div
        className="main-content"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '20px 16px',
        }}
      >
        {/* Search section */}
        <div style={{ marginBottom: 24 }}>
          {/* Set filter */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <select
              className="set-filter-select"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
              }}
              value={setFilter}
              onChange={(ev) => onSetFilterChange(ev.target.value)}
            >
              {setOptions}
            </select>
            {setFilter !== 'all' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 12,
                  right: 12,
                  height: 2,
                  background: setColours[setFilter] || 'var(--accent)',
                  borderRadius: 1,
                  transition: 'background 200ms ease',
                }}
              />
            )}
          </div>

          {/* Search input + camera button row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <svg
                style={{
                  position: 'absolute',
                  left: 14,
                  width: 18,
                  height: 18,
                  color:
                    firstInteraction && pulls.length === 0
                      ? 'var(--accent)'
                      : 'var(--text-tertiary)',
                  pointerEvents: 'none',
                  transition: 'color 300ms ease',
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                className="search-input"
                style={{
                  width: '100%',
                  padding: '14px 40px 14px 42px',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'border-color 200ms ease, box-shadow 300ms ease',
                  boxShadow: '0 0 0 0 transparent',
                }}
                type="text"
                placeholder="Search cards..."
                value={search}
                onChange={(ev) => onSearchChange(ev.target.value)}
                onKeyDown={onKeyDown}
                autoFocus
              />
              {search && (
                <button
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    fontSize: 16,
                    cursor: 'pointer',
                    padding: 4,
                    opacity: search ? 1 : 0,
                    transition: 'opacity 150ms ease',
                  }}
                  onClick={() => {
                    onSearchChange('');
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {/* Camera scan button */}
            {cameraSupported && (
              <button
                className="scan-btn"
                onClick={onOpenScanner}
                title="Scan card with camera"
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'border-color 200ms ease, background 200ms ease',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {results.length > 0 && (
            <div
              ref={resultsRef}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderTop: '2px solid rgba(245,166,35,0.35)',
                borderRadius: '2px 2px var(--radius-md) var(--radius-md)',
                marginTop: 2,
                maxHeight: 360,
                overflowY: 'auto',
                boxShadow: 'var(--shadow-dropdown)',
                animation: 'slideInDown 150ms ease-out',
              }}
            >
              {resultItems}
            </div>
          )}

          {/* No results message */}
          {search.trim().length > 0 && results.length === 0 && (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                marginTop: 4,
              }}
            >
              No cards found for "{search}"
            </div>
          )}

          {/* Keyboard hints */}
          {!hintsDismissed && (
            <div
              className="keyboard-hints"
              style={{
                display: 'flex',
                gap: 16,
                padding: '8px 4px',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                flexWrap: 'wrap',
              }}
            >
              <span>⏎ Enter = add normal</span>
              <span>Right-click = add foil</span>
              <span>↑↓ navigate</span>
              <span>#number = find by number</span>
            </div>
          )}

          {/* Set filter tip */}
          {setFilter !== 'all' && (
            <div
              style={{
                padding: '4px 4px 0',
                fontSize: 11,
                color: !hintsDismissed ? 'var(--accent)' : 'var(--text-tertiary)',
                opacity: !hintsDismissed ? 0.7 : 0.5,
              }}
            >
              Tip: type a number to find by collector #
            </div>
          )}
        </div>

        {/* Pulls section */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.02em',
              }}
            >
              Session Pulls
            </h2>

            {/* Clear button */}
            {totalCards > 0 &&
              (confirmClear ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    animation: 'confirmExpand 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                    transformOrigin: 'right center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--danger)',
                    }}
                  >
                    Clear all pulls?
                  </span>
                  <button
                    style={{
                      padding: '6px 14px',
                      background: 'var(--danger)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                    onClick={onClearConfirm}
                  >
                    Yes, clear
                  </button>
                  <button
                    style={{
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-tertiary)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                    onClick={onCancelClear}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-tertiary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onClick={onClearClick}
                >
                  Clear all
                </button>
              ))}
          </div>

          {/* Empty state or pulls list */}
          {totalCards === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '64px 20px',
              position: 'relative',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Ink swirl motif — concentric arcs referencing the Lorcana card back */}
              <svg
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 300,
                  height: 300,
                  marginTop: -150,
                  marginLeft: -150,
                  animation: 'inkBreath 8s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g stroke="var(--accent)" strokeLinecap="round">
                  {/* Outer sweep — right */}
                  <path d="M100 20 C145 20, 180 55, 180 100 C180 145, 150 172, 115 178" strokeWidth="1.2" opacity="0.7" />
                  {/* Outer sweep — left */}
                  <path d="M65 28 C35 50, 22 85, 28 120 C34 152, 55 172, 85 178" strokeWidth="1.8" opacity="0.5" />
                  {/* Mid sweep — right */}
                  <path d="M135 42 C162 65, 165 105, 148 138 C136 158, 115 168, 95 165" strokeWidth="1" opacity="0.6" />
                  {/* Inner spiral — core */}
                  <path d="M90 60 C112 58, 135 75, 138 100 C140 125, 122 145, 100 148 C78 150, 60 135, 58 112 C56 95, 68 78, 85 72" strokeWidth="1.5" opacity="0.8" />
                  {/* Lower-left wisp */}
                  <path d="M45 80 C35 105, 38 140, 58 162" strokeWidth="1" opacity="0.4" />
                  {/* Upper accent */}
                  <path d="M78 35 C92 28, 118 32, 135 48" strokeWidth="1.3" opacity="0.5" />
                  {/* Lower-right wisp */}
                  <path d="M125 155 C145 142, 160 118, 158 92" strokeWidth="0.8" opacity="0.3" />
                </g>
              </svg>
              <p
                style={{
                  position: 'relative',
                  fontFamily: "'Poppins', sans-serif",
                  color: 'rgba(245, 166, 35, 0.7)',
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: '-0.01em',
                }}
              >
                The Inkwell Awaits
              </p>
              <p
                style={{
                  position: 'relative',
                  color: '#8E9BAE',
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: 300,
                }}
              >
                Search for a card to begin your session — or scan one to let the ink reveal it.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {pullGroups}
            </div>
          )}
        </div>
      </div>

      {/* Scanner overlay */}
      {scannerActive && (
        <ScannerOverlay
          scannerState={scannerState}
          lastMatch={lastMatch}
          candidates={candidates}
          error={scannerError}
          scanCount={scanCount}
          videoRef={videoRef}
          onClose={onCloseScanner}
          onRetry={onOpenScanner}
          onSelectCandidate={onSelectCandidate}
        />
      )}
    </div>
  );
};
