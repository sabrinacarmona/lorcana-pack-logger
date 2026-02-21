import { INK_COLOURS } from '../constants'

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

export function inkGradientStyle(
  ink: string,
  opacity: number,
): React.CSSProperties {
  const col = INK_COLOURS[ink]
  if (!col) return {}
  return {
    backgroundImage:
      'linear-gradient(90deg, ' +
      hexToRgba(col, opacity) +
      ' 0%, transparent 80px)',
    backgroundRepeat: 'no-repeat',
  }
}
