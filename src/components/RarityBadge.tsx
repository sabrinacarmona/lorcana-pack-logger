import React from 'react';
import { RARITY_COLOURS } from '../constants';

interface RarityBadgeProps {
  rarity: string;
}

/**
 * Every rarity gets a pill badge — consistent structure, varying intensity.
 * Common/Uncommon: low-key.  Rare: ink-sapphire.  SR+: glow treatment.
 */
export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
  const rarityKey = rarity === 'Super_rare' ? 'Super Rare' : rarity;
  const colour = RARITY_COLOURS[rarityKey as keyof typeof RARITY_COLOURS] || '#5A6A7A';
  const displayName =
    rarity === 'Super_rare' ? 'Super Rare' : rarity;

  // Shared base for every tier
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

  // --- Rare: sapphire pill with border ---
  if (rarity === 'Rare') {
    return (
      <span style={{
        ...base,
        background: 'rgba(37,99,235,0.15)',
        color: '#5AC8FA',
        border: '1px solid rgba(37,99,235,0.3)',
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
        background: 'rgba(107,114,128,0.1)',
        color: '#8E9BAE',
        border: '1px solid rgba(107,114,128,0.2)',
      }}>
        {displayName}
      </span>
    );
  }

  // --- Common: lowest contrast, still a pill ---
  return (
    <span style={{
      ...base,
      background: 'rgba(90,106,122,0.08)',
      color: '#6B7280',
      border: '1px solid rgba(90,106,122,0.12)',
    }}>
      {displayName}
    </span>
  );
};
