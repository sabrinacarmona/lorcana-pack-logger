import React from 'react';

interface PackDividerProps {
  packNumber: number;
}

export const PackDivider: React.FC<PackDividerProps> = ({ packNumber }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0 4px',
        opacity: 0.5,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'var(--border)',
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: "'Poppins', sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        Pack {packNumber}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'var(--border)',
        }}
      />
    </div>
  );
};
