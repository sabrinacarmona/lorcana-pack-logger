import type { Card } from './card'

export interface ExportHistoryEntry {
  id: number
  filename: string
  sessionName: string
  timestamp: number
  totalCards: number
  totalFoils: number
  pulls: HistoryPull[]
  csv?: string
}

export interface HistoryPull {
  key: string
  variant: 'normal' | 'foil'
  count: number
  card: {
    display: string
    setCode: string
    setName: string
    cn: string
    ink: string
    rarity: string
  }
}

export type ViewType = 'search' | 'export' | 'history'
export type ViewDirection = 'left' | 'right'
export type CardSource = '' | 'cached' | 'updated' | 'offline'
export type RarityFlashType = 'enchanted' | 'legendary' | 'superrare' | null
export type ScannerState = 'idle' | 'requesting' | 'streaming' | 'processing' | 'matched' | 'error'
