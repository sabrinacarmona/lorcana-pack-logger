import React from 'react';

interface MobileBottomBarProps {
  historyCount: number;
  pullsCount: number;
  confirmClear: boolean;
  onHistoryClick: () => void;
  onExportClick: () => void;
  onClearClick: () => void;
  onClearConfirm: () => void;
  onCancelClear: () => void;
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

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  historyCount,
  pullsCount,
  confirmClear,
  onHistoryClick,
  onExportClick,
  onClearClick,
  onClearConfirm,
  onCancelClear,
}) => {
  return (
    <div
      className="mobile-bottom-bar"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(11,18,25,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 200,
        gap: 8,
        minHeight: 56,
      }}
    >
      <button
        style={{
          padding: '10px 14px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        onClick={onHistoryClick}
      >
        <IconHistory />
        {historyCount > 0 && (
          <span style={{ marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
            {historyCount}
          </span>
        )}
      </button>

      {pullsCount > 0 && (
        <button
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--bg-base)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            minHeight: 44,
          }}
          onClick={onExportClick}
        >
          Export →
        </button>
      )}

      {pullsCount > 0 &&
        (confirmClear ? (
          <button
            style={{
              padding: '10px 16px',
              background: 'var(--danger)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={onClearConfirm}
          >
            Confirm
          </button>
        ) : (
          <button
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={onClearClick}
          >
            <svg
              style={{ width: 18, height: 18 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        ))}
    </div>
  );
};
