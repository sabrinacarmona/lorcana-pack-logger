export function formatRelativeTime(startTs: number): string {
  if (!startTs) return ''
  const diff = Math.floor((Date.now() - startTs) / 1000)
  if (diff < 60) return 'just now'
  const mins = Math.floor(diff / 60)
  if (mins < 60) return mins + ' min' + (mins !== 1 ? 's' : '') + ' ago'
  const hours = Math.floor(mins / 60)
  if (hours < 24)
    return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago'
  const days = Math.floor(hours / 24)
  return days + ' day' + (days !== 1 ? 's' : '') + ' ago'
}

export function sanitiseFilename(name: string): string {
  const s = name.replace(/[/\\:*?"<>|]/g, '_').trim()
  return s || 'dreamborn_import'
}
