import React, { useMemo, useState } from 'react';
import { Pull, Card } from '../types';
import { INK_COLOURS, SET_MAP } from '../constants';
import { hexToRgba, inkGradientStyle } from '../utils/colour';
import { rarityNameColour } from '../utils/rarity-styles';
import { generateCSV } from '../utils/csv';
import { validatePulls } from '../utils/validation';
import { InkDot } from './InkDot';
import { RarityBadge } from './RarityBadge';

interface ExportViewProps {
  pulls: Pull[];
  sessionName: string;
  totalCards: number;
  totalFoils: number;
  totalSuperRare: number;
  totalLegendary: number;
  totalEnchanted: number;
  downloaded: boolean;
  copied: boolean;
  onDownload: () => void;
  onCopy: () => void;
  onBack: () => void;
}

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

const IconInfo = () => (
  <svg
    style={{ width: 14, height: 14, flexShrink: 0 }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1={12} y1={16} x2={12} y2={12} />
    <line x1={12} y1={8} x2={12.01} y2={8} />
  </svg>
);

export const ExportView: React.FC<ExportViewProps> = ({
  pulls,
  sessionName,
  totalCards,
  totalFoils,
  totalSuperRare,
  totalLegendary,
  totalEnchanted,
  downloaded,
  copied,
  onDownload,
  onCopy,
  onBack,
}) => {
  const [csvExpanded, setCsvExpanded] = useState(false);

  const notablePulls = useMemo(() => {
    return pulls.filter((p) => {
      const rarity = p.card.rarity;
      return (
        rarity === 'Enchanted' ||
        rarity === 'Legendary' ||
        rarity === 'Super Rare' ||
        rarity === 'Super_rare'
      );
    });
  }, [pulls]);

  const dominantInkInfo = useMemo(() => {
    const inkCounts: Record<string, number> = {};
    notablePulls.forEach((p) => {
      inkCounts[p.card.ink] = (inkCounts[p.card.ink] || 0) + p.count;
    });

    let dominantInk = '';
    let maxC = 0;
    Object.keys(inkCounts).forEach((ink) => {
      const count = inkCounts[ink];
      if (count != null && count > maxC) {
        maxC = count;
        dominantInk = ink;
      }
    });

    const tintCol = dominantInk ? INK_COLOURS[dominantInk as keyof typeof INK_COLOURS] : null;
    const tintBg = tintCol ? `linear-gradient(135deg, ${hexToRgba(tintCol, 0.06)}, transparent 60%)` : 'none';

    return { tintBg };
  }, [notablePulls]);

  let csv = '';
  try {
    csv = generateCSV(pulls);
  } catch (e) {
    csv = `Error generating CSV: ${(e as Error).message}`;
  }

  const warnings = useMemo(() => validatePulls(pulls), [pulls]);

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
          <span style={{ fontSize: 24 }}>✨</span>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Export for Dreamborn
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
        {/* Summary card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 24px',
            marginBottom: 20,
            textAlign: 'center',
            boxShadow: 'var(--shadow-elevated)',
            backgroundImage: dominantInkInfo.tintBg,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-tertiary)',
              marginBottom: 12,
            }}
          >
            Session Complete
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}
          >
            {sessionName}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              flexWrap: 'wrap',
              marginBottom: notablePulls.length > 0 ? 20 : 0,
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>
              {totalCards} card{totalCards !== 1 ? 's' : ''}
            </span>
            {totalFoils > 0 && (
              <span style={{ color: 'var(--foil)' }}>
                · {totalFoils} foil{totalFoils !== 1 ? 's' : ''}
              </span>
            )}
            {totalSuperRare > 0 && (
              <span style={{ color: '#64D2FF' }}>· {totalSuperRare} super rare</span>
            )}
            {totalLegendary > 0 && (
              <span style={{ color: '#FFD60A' }}>· {totalLegendary} legendary</span>
            )}
            {totalEnchanted > 0 && (
              <span style={{ color: '#34C759' }}>· {totalEnchanted} enchanted</span>
            )}
          </div>

          {notablePulls.length > 0 && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-tertiary)',
                  marginBottom: 8,
                }}
              >
                ★ Notable Pulls
              </div>
              {notablePulls.map((p) => (
                <div
                  key={p.key}
                  style={{
                    ...inkGradientStyle(p.card.ink, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 0',
                    borderBottom: '1px solid rgba(30,51,82,0.3)',
                    fontSize: 13,
                  }}
                >
                  <InkDot ink={p.card.ink} size={7} />
                  <RarityBadge rarity={p.card.rarity} />
                  <span
                    style={{
                      color: rarityNameColour(p.card.rarity),
                      fontWeight: 500,
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.card.display}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11, flexShrink: 0 }}>
                    #{p.card.cn}
                  </span>
                  {p.variant === 'foil' && (
                    <span style={{ fontSize: 9, color: 'var(--foil)', fontWeight: 700 }}>
                      ✦ Foil
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <button
            style={{
              flex: 1,
              minWidth: 140,
              padding: '12px 20px',
              background: downloaded ? 'var(--success)' : 'var(--bg-elevated)',
              border: downloaded ? '1px solid var(--success)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: downloaded ? '#fff' : 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
            }}
            onClick={onDownload}
          >
            {downloaded ? '✓ Downloaded' : '⬇ Download .csv'}
          </button>
          <button
            style={{
              flex: 1,
              minWidth: 140,
              padding: '12px 20px',
              background: copied ? 'var(--success)' : 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: copied ? '#fff' : 'var(--bg-base)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              transition: 'background 200ms ease',
            }}
            onClick={onCopy}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div
            style={{
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--danger)',
                marginBottom: 6,
              }}
            >
              ⚠ Validation Warnings
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: '1.6',
              }}
            >
              {warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginTop: 6,
              }}
            >
              You can still export, but Dreamborn may reject some entries.
            </div>
          </div>
        )}

        {/* Collapsible CSV data */}
        <div style={{ marginBottom: 16 }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              padding: '6px 0',
            }}
            onClick={() => setCsvExpanded(!csvExpanded)}
          >
            <svg
              style={{
                width: 12,
                height: 12,
                transform: csvExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Show CSV data
          </button>
          {csvExpanded && (
            <div
              style={{
                marginTop: 8,
                animation: 'fadeIn 150ms ease-out',
              }}
            >
              <textarea
                id="csv-output"
                style={{
                  width: '100%',
                  height: 160,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontFamily: "'Courier New', monospace",
                  padding: 12,
                  resize: 'vertical',
                  lineHeight: 1.6,
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
                }}
                readOnly
                value={csv}
                onClick={(ev) => {
                  (ev.target as HTMLTextAreaElement).select();
                }}
              />
            </div>
          )}
        </div>

        {/* Tip */}
        <div
          style={{
            background: 'rgba(52,199,89,0.06)',
            border: '1px solid rgba(52,199,89,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'var(--success)',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
              margin: 0,
            }}
          >
            <IconInfo />
            <span>
              <strong>Tip:</strong> After pasting in Dreamborn, check that the card counts went up
              correctly. The import should <em>add</em> to your existing collection, not replace it.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
