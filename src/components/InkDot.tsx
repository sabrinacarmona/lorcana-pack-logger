import React from 'react';
import { INK_COLOURS } from '../constants';
import { hexToRgba } from '../utils/colour';

interface InkDotProps {
  ink: string;
  size?: number;
}

export const InkDot: React.FC<InkDotProps> = ({ ink, size = 6 }) => {
  const colour = INK_COLOURS[ink as keyof typeof INK_COLOURS] || '#666';

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: colour,
        boxShadow: `
          inset 0 1px 2px ${hexToRgba(colour, 0.3)},
          0 0 ${size * 1.5}px ${hexToRgba(colour, 0.6)}
        `,
        flexShrink: 0,
      }}
    />
  );
};
