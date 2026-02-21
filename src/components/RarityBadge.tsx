import React from 'react';
import { RARITY_COLOURS } from '../constants';

interface RarityBadgeProps {
  rarity: string;
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
  const rarityKey = rarity === 'Super_rare' ? 'Super Rare' : rarity;
  const colour = RARITY_COLOURS[rarityKey as keyof typeof RARITY_COLOURS] || '#999';
  const displayName =
    rarity === 'Super_rare' ? 'Super Rare' : rarity === 'Rare' ? 'Rare' : rarity;

  // Enchanted: prismatic animated background
  if (rarity === 'Enchanted') {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(90deg, #BF5AF2 0%, #5AC8FA 25%, #34C759 50%, #FFD60A 75%, #BF5AF2 100%)',
          backgroundSize: '200% 100%',
          animation: 'prismaticShimmer 4s linear infinite',
          color: '#fff',
          letterSpacing: '0.05em',
          textShadow: '0 0 2px rgba(0, 0, 0, 0.4)',
          textTransform: 'uppercase',
          display: 'inline-block',
        }}
      >
        {displayName}
      </span>
    );
  }

  // Legendary: gold chip
  if (rarity === 'Legendary') {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: '#FFD60A',
          color: '#000',
          letterSpacing: '0.05em',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          textTransform: 'uppercase',
          display: 'inline-block',
        }}
      >
        {displayName}
      </span>
    );
  }

  // Super Rare: blue chip
  if (rarity === 'Super Rare' || rarity === 'Super_rare') {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: '#64D2FF',
          color: '#000',
          letterSpacing: '0.05em',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          textTransform: 'uppercase',
          display: 'inline-block',
        }}
      >
        {displayName}
      </span>
    );
  }

  // Default: subtle styling
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        background: `${colour}20`,
        color: colour,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        display: 'inline-block',
      }}
    >
      {displayName}
    </span>
  );
};
