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

  // Shared text styles — every tier gets identical typography
  const textStyles: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: "'Outfit', sans-serif",
    whiteSpace: 'nowrap',
  };

  // --- Enchanted: sole exception — iridescent gradient border via wrapper technique ---
  if (rarity === 'Enchanted') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        borderRadius: 5,
        padding: 1,
        background: 'linear-gradient(90deg, #BF5AF2, #5AC8FA, #34C759, #FFD60A, #BF5AF2)',
        backgroundSize: '200% 100%',
        animation: 'prismaticShimmer 4s linear infinite',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}>
        <span style={{
          ...textStyles,
          display: 'block',
          padding: '0 8px',
          height: 18,
          lineHeight: '18px',
          borderRadius: 4,
          background: '#162844',
          color: '#FFFFFF',
        }}>
          {displayName}
        </span>
      </span>
    );
  }

  // --- Every other tier: outlined pill, no fill, border + text colour only ---
  return (
    <span style={{
      ...textStyles,
      display: 'inline-block',
      padding: '0 8px',
      height: 20,
      lineHeight: '20px',
      borderRadius: 4,
      flexShrink: 0,
      verticalAlign: 'middle',
      background: 'transparent',
      color: colour,
      border: `1px solid ${colour}`,
    }}>
      {displayName}
    </span>
  );
};
