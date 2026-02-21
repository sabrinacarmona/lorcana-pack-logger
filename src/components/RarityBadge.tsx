import React from 'react';
import { RARITY_COLOURS } from '../constants';
import { hexToRgba } from '../utils/colour';

interface RarityBadgeProps {
  rarity: string;
}

/**
 * Unified pill badge — identical dimensions across all tiers.
 * Colour alone communicates rarity. Enchanted is the sole
 * exception, earning a subtle iridescent border gradient.
 */
export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
  const rarityKey = rarity === 'Super_rare' ? 'Super Rare' : rarity;
  const colour = RARITY_COLOURS[rarityKey as keyof typeof RARITY_COLOURS] || '#5A6A7A';
  const displayName =
    rarity === 'Super_rare' ? 'Super Rare' : rarity;

  // Shared anatomy — every tier gets identical dimensions
  const base: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'inline-block',
    lineHeight: '14px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    verticalAlign: 'middle',
  };

  // --- Enchanted: sole exception — iridescent gradient border ---
  if (rarity === 'Enchanted') {
    return (
      <span style={{
        ...base,
        border: '1px solid transparent',
        background:
          'linear-gradient(#0F1928, #0F1928) padding-box, ' +
          'linear-gradient(90deg, #BF5AF2, #5AC8FA, #34C759, #FFD60A, #BF5AF2) border-box',
        backgroundSize: '100% 100%, 200% 100%',
        animation: 'prismaticShimmer 4s linear infinite',
        color: '#5AC8FA',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Every other tier: outlined pill, colour-only differentiation ---
  return (
    <span style={{
      ...base,
      background: hexToRgba(colour, 0.1),
      color: colour,
      border: `1px solid ${hexToRgba(colour, 0.3)}`,
    }}>
      {displayName}
    </span>
  );
};
