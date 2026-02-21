import React from 'react';
import { RARITY_COLOURS } from '../constants';

interface RarityBadgeProps {
  rarity: string;
}

/**
 * Unified pill badge — identical anatomy across all tiers.
 * Outlined pill, 20px height, 10px font size, 8px horizontal padding.
 * No fills. Colour alone communicates rarity.
 * Enchanted is the sole exception: iridescent gradient border, white text.
 */
export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
  const rarityKey = rarity === 'Super_rare' ? 'Super Rare' : rarity;
  const colour = RARITY_COLOURS[rarityKey as keyof typeof RARITY_COLOURS] || '#4A5568';
  const displayName = rarity === 'Super_rare' ? 'Super Rare' : rarity;

  // Shared anatomy — every tier gets identical dimensions
  const base: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    padding: '0 8px',
    height: 20,
    lineHeight: '20px',
    borderRadius: 4,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    verticalAlign: 'middle',
    fontFamily: "'Outfit', sans-serif",
  };

  // --- Enchanted: sole exception — iridescent gradient border, white text ---
  if (rarity === 'Enchanted') {
    return (
      <span style={{
        ...base,
        border: '1px solid transparent',
        background:
          'linear-gradient(#162844, #162844) padding-box, ' +
          'linear-gradient(90deg, #BF5AF2, #5AC8FA, #34C759, #FFD60A, #BF5AF2) border-box',
        backgroundSize: '100% 100%, 200% 100%',
        animation: 'prismaticShimmer 4s linear infinite',
        color: '#FFFFFF',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Every other tier: outlined pill, no fill, border + text colour only ---
  return (
    <span style={{
      ...base,
      background: 'transparent',
      color: colour,
      border: `1px solid ${colour}`,
    }}>
      {displayName}
    </span>
  );
};
