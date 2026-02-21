import type { Card, RawCard } from '../types'

export function parseCards(sourceData: RawCard[] | null): Card[] {
  const raw = sourceData
  if (!raw || !Array.isArray(raw)) return []

  const cards: Card[] = []
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!
    const ver = c[1] || ''
    cards.push({
      name: c[0],
      version: ver,
      display: c[0] + (ver ? ' \u2013 ' + ver : ''),
      setCode: c[2],
      setName: c[3],
      cn: String(c[4]),
      cost: c[5],
      ink: c[6],
      rarity: c[7],
      type: c[8] ? c[8].split(',') : [],
    })
  }

  cards.sort((a, b) => {
    const an = parseInt(a.setCode)
    const bn = parseInt(b.setCode)
    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn
    } else if (!isNaN(an)) return -1
    else if (!isNaN(bn)) return 1
    else if (a.setCode !== b.setCode)
      return a.setCode < b.setCode ? -1 : 1
    return parseInt(a.cn) - parseInt(b.cn)
  })

  return cards
}
