import { describe, it, expect } from 'vitest'
import { rarityRowStyle, rarityNameColour } from '../../utils/rarity-styles'

describe('rarityRowStyle', () => {
  it('applies transparent border for Common', () => {
    const style = rarityRowStyle({ ink: 'Amber', rarity: 'Common' }, 'normal')
    expect(style.borderLeft).toContain('transparent')
  })

  it('applies gold border for Legendary', () => {
    const style = rarityRowStyle({ ink: 'Amber', rarity: 'Legendary' }, 'normal')
    expect(style.borderLeft).toContain('#FFD60A')
  })

  it('applies prismatic border-image for Enchanted', () => {
    const style = rarityRowStyle({ ink: 'Amber', rarity: 'Enchanted' }, 'normal')
    expect(style.borderImage).toContain('linear-gradient')
  })

  it('adds foil overlay for foil variant', () => {
    const style = rarityRowStyle({ ink: 'Amber', rarity: 'Rare' }, 'foil')
    expect(style.backgroundImage).toContain('repeating-linear-gradient')
  })

  it('layers foil over ink gradient', () => {
    const style = rarityRowStyle({ ink: 'Amber', rarity: 'Rare' }, 'foil')
    // Should have both foil gradient and ink gradient
    expect(style.backgroundImage).toContain('repeating-linear-gradient')
    expect(style.backgroundImage).toContain('linear-gradient')
    expect(style.backgroundRepeat).toBe('repeat, no-repeat')
  })
})

describe('rarityNameColour', () => {
  it('returns white for Legendary', () => {
    expect(rarityNameColour('Legendary')).toBe('#FFFFFF')
  })

  it('returns white for Super Rare', () => {
    expect(rarityNameColour('Super Rare')).toBe('#FFFFFF')
  })

  it('returns white for Enchanted', () => {
    expect(rarityNameColour('Enchanted')).toBe('#FFFFFF')
  })

  it('returns CSS variable for Common', () => {
    expect(rarityNameColour('Common')).toBe('var(--text-primary)')
  })
})
