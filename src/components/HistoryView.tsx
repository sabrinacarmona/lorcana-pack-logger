import React, { useState } from 'react';
import { ExportHistoryEntry, HistoryPull } from '../types';
import { INK_COLOURS } from '../constants';
import { hexToRgba, inkGradientStyle } from '../utils/colour';
import { InkDot } from './InkDot';

/**
 * Regenerate CSV from stored pulls when the csv field is absent.
 */
function regenerateCsv(pulls: HistoryPull[]): string {
  const header = 'Set Number,Card Number,Variant,Count';
  const rows = pulls.map(
    (p) => `${p.card.setCode},${p.card.cn},${p.variant},${p.count}`,
  );
  return [header, ...rows].join('\n');
}

interface HistoryViewProps {
  history: ExportHistoryEntry[];
  onBack: () => void;
}

const IconHistory = () => (
  <svg
    style={{ width: 18, height: 18, color: 'var(--text-secondary)' }}
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

const IconBack = () => (
  <svg
    style={{ width: 16, height: 16, marginRight: 4 }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1={19} y1={12} x2={5} y2={12} />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const EmptyFileIcon = () => (
  <svg
    style={{ width: 40, height: 40 }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack }) => {
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear();
    const timeStr =
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} ${timeStr}`;
  };

  const handleRedownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.match(/\.csv$/) ? filename : filename + '.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleCopyCsv = (csv: string) => {
    try {
      navigator.clipboard.writeText(csv);
    } catch (e) {}
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        animation: 'viewSlideInRight 250ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-base)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconHistory />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Export History
          </h1>
        </div>
        <button
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={onBack}
        >
          <IconBack />
          Back
        </button>
      </div>

      {/* Content */}
      <div
        className="view-content"
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '24px 16px',
        }}
      >
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div
              style={{
                color: 'var(--text-tertiary)',
                marginBottom: 16,
              }}
            >
              <EmptyFileIcon />
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              No exports yet
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              Your export history will appear here after you download or copy a CSV
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {history.map((entry) => {
              const isExpanded = expandedHistory === entry.id;
              const timeStr = formatDate(entry.timestamp);

              return (
                <div
                  key={entry.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-elevated)',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      gap: 8,
                    }}
                    onClick={() => setExpandedHistory(isExpanded ? null : entry.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {entry.filename}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          marginTop: 3,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {timeStr} · {entry.totalCards} card{entry.totalCards !== 1 ? 's' : ''}
                        {entry.totalFoils > 0 && ` (${entry.totalFoils} foil)`}
                      </div>

                      {/* Ink fingerprint dots */}
                      {entry.pulls && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 3,
                            marginTop: 4,
                          }}
                        >
                          {(() => {
                            const inkMap: Record<string, number> = {};
                            entry.pulls.forEach((p) => {
                              inkMap[p.card.ink] = (inkMap[p.card.ink] || 0) + p.count;
                            });

                            return Object.keys(inkMap).map((ink) => {
                              const count = inkMap[ink] ?? 0;
                              const sz = Math.min(Math.max(count, 1), 5);
                              const colour =
                                INK_COLOURS[ink as keyof typeof INK_COLOURS] || '#666';
                              return (
                                <span
                                  key={ink}
                                  title={`${ink} (${inkMap[ink]})`}
                                  style={{
                                    display: 'inline-block',
                                    width: 4 + sz,
                                    height: 4 + sz,
                                    borderRadius: '50%',
                                    background: colour,
                                    boxShadow: `0 0 3px ${hexToRgba(colour, 0.4)}`,
                                  }}
                                />
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-tertiary)',
                        flexShrink: 0,
                        transition: 'transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Expandable content */}
                  <div
                    style={{
                      maxHeight: isExpanded ? 800 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 300ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                      borderTop: isExpanded ? '1px solid var(--border)' : '1px solid transparent',
                    }}
                  >
                    {isExpanded && (
                      <div
                        style={{
                          padding: '12px 14px',
                          animation: 'fadeIn 200ms ease-out',
                        }}
                      >
                        {/* Action buttons */}
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          <button
                            style={{
                              padding: '6px 14px',
                              background: 'rgba(52,199,89,0.08)',
                              border: '1px solid var(--success)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--success)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'Outfit', sans-serif",
                            }}
                            onClick={() => handleRedownload(entry.csv || regenerateCsv(entry.pulls), entry.filename)}
                          >
                            ⬇ Re-download
                          </button>
                          <button
                            style={{
                              padding: '6px 14px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'Outfit', sans-serif",
                            }}
                            onClick={() => handleCopyCsv(entry.csv || regenerateCsv(entry.pulls))}
                          >
                            Copy CSV
                          </button>
                        </div>

                        {/* Pull list */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0,
                          }}
                        >
                          {entry.pulls &&
                            entry.pulls.map((p) => {
                              const borderLeftStyle = (() => {
                                if (p.card.rarity === 'Legendary') {
                                  return '2px solid #FFD60A';
                                } else if (
                                  p.card.rarity === 'Super Rare' ||
                                  p.card.rarity === 'Super_rare'
                                ) {
                                  const colour =
                                    INK_COLOURS[p.card.ink as keyof typeof INK_COLOURS] || '#666';
                                  return `2px solid ${hexToRgba(colour, 0.7)}`;
                                } else if (p.card.rarity === 'Rare') {
                                  const colour =
                                    INK_COLOURS[p.card.ink as keyof typeof INK_COLOURS] || '#666';
                                  return `1px solid ${hexToRgba(colour, 0.4)}`;
                                }
                                return 'none';
                              })();

                              return (
                                <div
                                  key={p.key}
                                  style={{
                                    ...inkGradientStyle(p.card.ink, 0.08),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 0 6px 8px',
                                    fontSize: 13,
                                    borderBottom: '1px solid rgba(30,51,82,0.5)',
                                    borderLeft: borderLeftStyle,
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
                                    <InkDot ink={p.card.ink} />
                                    <span
                                      style={{
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontSize: 14,
                                        letterSpacing: '-0.01em',
                                      }}
                                    >
                                      {p.card.display}
                                    </span>
                                    <span
                                      style={{
                                        color: 'var(--text-tertiary)',
                                        fontSize: 11,
                                        flexShrink: 0,
                                        marginLeft: 4,
                                      }}
                                    >
                                      {p.card.setName} #{p.card.cn}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {p.variant === 'foil' && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: 'var(--foil)',
                                        }}
                                      >
                                        ✦ Foil
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        color: 'var(--accent)',
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      ×{p.count}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
