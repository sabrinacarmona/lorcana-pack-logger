import React from 'react';
import { RARITY_COLOURS } from '../constants';

interface RarityBadgeProps {
  rarity: string;
}

/**
 * Every rarity gets a pill badge — identical outer dimensions, varying intensity.
 * The base includes a 1px transparent border so bordered and filled pills
 * have the same box size.
 */
export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
  const rarityKey = rarity === 'Super_rare' ? 'Super Rare' : rarity;
  const colour = RARITY_COLOURS[rarityKey as keyof typeof RARITY_COLOURS] || '#5A6A7A';
  const displayName =
    rarity === 'Super_rare' ? 'Super Rare' : rarity;

  // Shared base — every tier gets identical dimensions
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
    border: '1px solid transparent',
    verticalAlign: 'middle',
  };

  // --- Enchanted: prismatic ---
  if (rarity === 'Enchanted') {
    return (
      <span style={{
        ...base,
        background: 'linear-gradient(90deg, #BF5AF2 0%, #5AC8FA 25%, #34C759 50%, #FFD60A 75%, #BF5AF2 100%)',
        backgroundSize: '200% 100%',
        animation: 'prismaticShimmer 4s linear infinite',
        color: '#fff',
        textShadow: '0 0 2px rgba(0,0,0,0.4)',
        boxShadow: '0 0 6px rgba(191,90,242,0.35), 0 0 14px rgba(90,200,250,0.15)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Legendary: amber glow ---
  if (rarity === 'Legendary') {
    return (
      <span style={{
        ...base,
        background: 'linear-gradient(135deg, #E89C24, #FFD60A)',
        color: '#0A1628',
        textShadow: '0 1px 1px rgba(255,255,255,0.25)',
        boxShadow: '0 0 6px rgba(232,156,36,0.45), 0 0 16px rgba(232,156,36,0.12)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Super Rare: cool blue glow ---
  if (rarity === 'Super Rare' || rarity === 'Super_rare') {
    return (
      <span style={{
        ...base,
        background: 'linear-gradient(135deg, #64D2FF, #38B6FF)',
        color: '#0A1628',
        textShadow: '0 1px 1px rgba(255,255,255,0.25)',
        boxShadow: '0 0 6px rgba(100,210,255,0.35), 0 0 14px rgba(100,210,255,0.1)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Rare: sapphire pill ---
  if (rarity === 'Rare') {
    return (
      <span style={{
        ...base,
        background: 'rgba(37,99,235,0.15)',
        color: '#5AC8FA',
        borderColor: 'rgba(37,99,235,0.3)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Uncommon: steel outline pill ---
  if (rarity === 'Uncommon') {
    return (
      <span style={{
        ...base,
        background: 'rgba(107,114,128,0.15)',
        color: '#94A3B5',
        borderColor: 'rgba(107,114,128,0.28)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Common: lowest contrast, still a visible pill ---
  return (
    <span style={{
      ...base,
      background: 'rgba(90,106,122,0.15)',
      color: '#7A8694',
      borderColor: 'rgba(90,106,122,0.25)',
    }}>
      {displayName}
    </span>
  );
};
