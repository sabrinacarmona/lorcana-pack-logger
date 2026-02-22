import React from 'react';
import { INK_COLOURS } from '../constants';
import { hexToRgba } from '../utils/colour';

interface InkDotProps {
  ink: string;
  size?: number;
}

/**
 * Renders an ink colour dot.
 *
 * Handles dual-ink cards (e.g. "Sapphire/Steel") by rendering a split-circle
 * with both colours side by side.  Mono-ink cards render a single solid dot.
 */
export const InkDot: React.FC<InkDotProps> = ({ ink, size = 6 }) => {
  const inks = ink.split('/');

  // Dual-ink: render a split circle via CSS gradient
  if (inks.length >= 2) {
    const c1 = INK_COLOURS[inks[0] as keyof typeof INK_COLOURS] || '#666';
    const c2 = INK_COLOURS[inks[1] as keyof typeof INK_COLOURS] || '#666';

    return (
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
          boxShadow: `
            inset 0 1px 2px rgba(0,0,0,0.2),
            0 0 ${size * 1.5}px ${hexToRgba(c1, 0.4)}
          `,
          flexShrink: 0,
        }}
      />
    );
  }

  // Mono-ink: solid circle
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
