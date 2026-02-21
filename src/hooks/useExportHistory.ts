import { useState, useCallback } from 'react'
import type { ExportHistoryEntry, Pull } from '../types'
import { SafeStorage } from '../utils/safe-storage'
import { generateCSV } from '../utils/csv'
import { sanitiseFilename } from '../utils/formatting'

export function useExportHistory() {
  const [history, setHistory] = useState<ExportHistoryEntry[]>(
    () => SafeStorage.getJSON<ExportHistoryEntry[]>('lorcana_export_history', []),
  )

  const [hintsDismissed, setHintsDismissedRaw] = useState(
    () => SafeStorage.getItem('lorcana_hints_dismissed') === 'true',
  )

  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const dismissHints = useCallback(() => {
    setHintsDismissedRaw(true)
    SafeStorage.setItem('lorcana_hints_dismissed', 'true')
  }, [])

  const saveToHistory = useCallback(
    (filename: string, _csv: string, pullsSnapshot: Pull[], sessionName: string) => {
      if (!hintsDismissed) {
        dismissHints()
      }

      const entry: ExportHistoryEntry = {
        id: Date.now(),
        filename,
        sessionName,
        timestamp: Date.now(),
        totalCards: pullsSnapshot.reduce((s, p) => s + p.count, 0),
        totalFoils: pullsSnapshot
          .filter((p) => p.variant === 'foil')
          .reduce((s, p) => s + p.count, 0),
        pulls: pullsSnapshot.map((p) => ({
          key: p.key,
          variant: p.variant,
          count: p.count,
          card: {
            display: p.card.display,
            setCode: p.card.setCode,
            setName: p.card.setName,
            cn: p.card.cn,
            ink: p.card.ink,
            rarity: p.card.rarity,
          },
        })),
        // CSV is no longer persisted to save storage space.
        // It can be regenerated from pulls on demand.
      }

      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 50)
        SafeStorage.setJSON('lorcana_export_history', next)
        return next
      })
    },
    [hintsDismissed, dismissHints],
  )

  const handleCopy = useCallback(
    (pulls: Pull[], sessionName: string) => {
      const csv = generateCSV(pulls)
      const d = new Date()
      const prefix = sanitiseFilename(sessionName)
      const fn =
        prefix +
        '_clipboard_' +
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0') +
        '_' +
        String(d.getHours()).padStart(2, '0') +
        String(d.getMinutes()).padStart(2, '0')

      try {
        navigator.clipboard.writeText(csv).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        })
      } catch {
        const ta = document.getElementById('csv-output') as HTMLTextAreaElement | null
        if (ta) {
          ta.select()
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        }
      }

      saveToHistory(fn, csv, pulls, sessionName)
    },
    [saveToHistory],
  )

  const handleDownload = useCallback(
    (pulls: Pull[], sessionName: string) => {
      const csv = generateCSV(pulls)
      const d = new Date()
      const prefix = sanitiseFilename(sessionName)
      const fn =
        prefix +
        '_' +
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0') +
        '_' +
        String(d.getHours()).padStart(2, '0') +
        String(d.getMinutes()).padStart(2, '0') +
        '.csv'

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fn
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2500)
      saveToHistory(fn, csv, pulls, sessionName)
    },
    [saveToHistory],
  )

  return {
    history,
    hintsDismissed,
    copied,
    downloaded,
    dismissHints,
    handleCopy,
    handleDownload,
  }
}
