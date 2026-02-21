import React from 'react';

interface UndoToastProps {
  cardName: string;
  onUndo: () => void;
  isFading: boolean;
}

export const UndoToast: React.FC<UndoToastProps> = ({ cardName, onUndo, isFading }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        boxShadow: 'var(--shadow-dropdown)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: isFading ? 'undoToastOut 400ms ease forwards' : 'undoToastIn 150ms ease',
        maxWidth: 'calc(100vw - 32px)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 200,
        }}
      >
        Added {cardName}
      </span>
      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>·</span>
      <button
        onClick={onUndo}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '2px 4px',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Undo
      </button>
    </div>
  );
};
