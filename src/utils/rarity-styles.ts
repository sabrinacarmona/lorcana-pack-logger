import type { CSSProperties } from 'react'
import { INK_COLOURS } from '../constants'
import { hexToRgba, inkGradientStyle } from './colour'

export function rarityRowStyle(
  card: { ink: string; rarity: string },
  variant: string,
): CSSProperties {
  const rarity = card.rarity
  const isFoil = variant === 'foil'
  const inkCol = INK_COLOURS[card.ink] || '#666'
  const base: CSSProperties = {}

  // Ink gradient tinting (all rows except Enchanted)
  if (rarity !== 'Enchanted') {
    const grad = inkGradientStyle(card.ink, 0.12)
    if (grad.backgroundImage) {
      base.backgroundImage = grad.backgroundImage
      base.backgroundRepeat = 'no-repeat'
    }
  }

  // Rarity-specific borders and backgrounds
  if (rarity === 'Common' || rarity === 'Uncommon') {
    base.borderLeft = '3px solid transparent'
  } else if (rarity === 'Rare') {
    base.borderLeft = '1px solid ' + hexToRgba(inkCol, 0.4)
  } else if (rarity === 'Super Rare' || rarity === 'Super_rare') {
    base.borderLeft = '2px solid ' + hexToRgba(inkCol, 0.7)
  } else if (rarity === 'Legendary') {
    base.borderLeft = '2px solid #FFD60A'
  } else if (rarity === 'Enchanted') {
    base.borderLeft = '3px solid transparent'
    base.borderImage =
      'linear-gradient(135deg, #BF5AF2, #5AC8FA, #34C759, #FFD60A) 1'
    base.background =
      'linear-gradient(90deg, rgba(191,90,242,0.03), rgba(90,200,250,0.03), rgba(52,199,89,0.03), rgba(255,214,10,0.03))'
    base.backgroundSize = '400% 100%'
  }

  // Foil holographic line overlay
  if (isFoil) {
    const foilGrad =
      'repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 6px)'
    if (base.backgroundImage) {
      base.backgroundImage = foilGrad + ', ' + base.backgroundImage
    } else {
      base.backgroundImage = foilGrad
    }
    base.backgroundRepeat = 'repeat, no-repeat'
  }

  return base
}

export function rarityNameColour(rarity: string): string {
  if (
    rarity === 'Legendary' ||
    rarity === 'Super Rare' ||
    rarity === 'Super_rare' ||
    rarity === 'Enchanted'
  ) {
    return '#FFFFFF'
  }
  return 'var(--text-primary)'
}
