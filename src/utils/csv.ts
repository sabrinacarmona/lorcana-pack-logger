import type { Pull } from '../types'

export function generateCSV(pulls: Pull[]): string {
  const header = 'Set Number,Card Number,Variant,Count'
  const rows = pulls.map(
    (p) => p.card.setCode + ',' + p.card.cn + ',' + p.variant + ',' + p.count,
  )
  return header + '\n' + rows.join('\n')
}
