import type { Pull } from '../types'

const VALID_SETS: Record<string, 1> = {
  '1': 1, '2': 1, '3': 1, '4': 1, '5': 1,
  '6': 1, '7': 1, '8': 1, '9': 1, '10': 1, '11': 1,
  P1: 1, P2: 1, cp: 1, D23: 1,
}

export function validatePulls(pullsList: Pull[]): string[] {
  const warnings: string[] = []
  pullsList.forEach((p) => {
    if (!VALID_SETS[p.card.setCode]) {
      warnings.push(
        'Unknown set code "' + p.card.setCode + '" for ' + p.card.display,
      )
    }
    const cn = parseInt(p.card.cn)
    if (isNaN(cn) || cn < 1 || cn > 300) {
      warnings.push(
        'Unusual collector number "' + p.card.cn + '" for ' + p.card.display,
      )
    }
  })
  return warnings
}
