import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Card, RawCard, CardSource } from './types'
import { parseCards } from './utils/card-parser'
import { fetchCardDatabase } from './api/lorcast'
import { useSession } from './hooks/useSession'
import { usePulls } from './hooks/usePulls'
import { useSearch } from './hooks/useSearch'
import { useUI } from './hooks/useUI'
import { useSensory } from './hooks/useSensory'
import { useUndo } from './hooks/useUndo'
import { useExportHistory } from './hooks/useExportHistory'
import { useRelativeTime } from './hooks/useRelativeTime'
import { useSets } from './hooks/useSets'
import { useScanner } from './hooks/useScanner'
import { Header } from './components/Header'
import { SearchView } from './components/SearchView'
import { ExportView } from './components/ExportView'
import { HistoryView } from './components/HistoryView'
import { MobileBottomBar } from './components/MobileBottomBar'
import { UndoToast } from './components/UndoToast'
import { ErrorBoundary } from './errors/ErrorBoundary'

export function App() {
  // === Card database ===
  const [cardData, setCardData] = useState<RawCard[] | null>(null)
  const [cardSource, setCardSource] = useState<CardSource>('')
  const cards = useMemo(() => parseCards(cardData), [cardData])

  // Fetch cards on mount
  useEffect(() => {
    fetchCardDatabase().then(({ data, source }) => {
      if (data) setCardData(data)
      setCardSource(source)
    })
  }, [])

  // === Hooks ===
  const sets = useSets()
  const session = useSession()
  const pulls = usePulls()
  const search = useSearch(cards)
  const ui = useUI()
  const sensory = useSensory()
  const undo = useUndo()
  const exportHistory = useExportHistory()
  const relativeTime = useRelativeTime(session.sessionStartedAt)

  // === Camera scanner ===
  const cameraSupported = typeof navigator !== 'undefined'
    && typeof navigator.mediaDevices !== 'undefined'
    && typeof navigator.mediaDevices.getUserMedia === 'function'

  // handleScanMatch is defined after handleAddCard, so we use a ref-based approach
  // by passing the callback directly — useScanner stores it in a ref internally
  const scanner = useScanner({
    cards,
    setFilter: search.setFilter,
    onCardMatched: useCallback((card: Card) => {
      // Ensure session has started
      session.ensureSessionStarted()
      const addCount = session.incrementAddCount()
      const packNumber = Math.ceil(addCount / 12)
      pulls.addPull(card, 'normal', packNumber)
      undo.recordAction(card, 'normal')
      sensory.triggerFeedback(card.rarity)
    }, [session, pulls, undo, sensory]),
  })

  // === Core actions ===
  const handleAddCard = useCallback(
    (card: Card, variant: 'normal' | 'foil', closeSearch = true) => {
      // Ensure session has started
      session.ensureSessionStarted()

      // Increment counter and get pack number
      const addCount = session.incrementAddCount()
      const packNumber = Math.ceil(addCount / 12)

      // Add to pull list
      pulls.addPull(card, variant, packNumber)

      // Record for undo
      undo.recordAction(card, variant)

      // Trigger sensory feedback
      sensory.triggerFeedback(card.rarity)

      // Clear search and refocus (pack mode) — unless told to keep dropdown open
      if (closeSearch) {
        search.clearSearch()
        search.refocusInput()
      }
    },
    [session, pulls, undo, sensory, search],
  )

  const handleUndo = useCallback(() => {
    if (!undo.lastActionRef.current) return
    const action = undo.lastActionRef.current
    pulls.updateCount(action.key, -1)
    undo.clearUndo()
  }, [undo, pulls])

  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (search.results.length === 0) return
      if (ev.key === 'ArrowDown') {
        ev.preventDefault()
        search.setSelectedIdx((i) => Math.min(i + 1, search.results.length - 1))
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault()
        search.setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (ev.key === 'Enter') {
        ev.preventDefault()
        search.flushSearch()
        const selected = search.results[search.selectedIdx]
        if (selected) handleAddCard(selected, 'normal')
      }
    },
    [search, handleAddCard],
  )

  const handleClearAll = useCallback(() => {
    session.clearSession()
    pulls.clearPulls()
    ui.setConfirmClear(false)
    search.clearSearch()
  }, [session, pulls, ui, search])

  const handleRemovePull = useCallback(
    (key: string) => {
      ui.animateRemove(key, () => {
        pulls.removePull(key)
      })
    },
    [ui, pulls],
  )

  const handleExportDownload = useCallback(() => {
    exportHistory.handleDownload(pulls.pulls, session.sessionName)
  }, [exportHistory, pulls.pulls, session.sessionName])

  const handleExportCopy = useCallback(() => {
    exportHistory.handleCopy(pulls.pulls, session.sessionName)
  }, [exportHistory, pulls.pulls, session.sessionName])

  // === View rendering ===
  const viewAnimation =
    ui.viewDirection === 'right'
      ? 'viewSlideInRight 250ms var(--ease)'
      : 'viewSlideInLeft 250ms var(--ease)'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header
        sessionName={session.sessionName}
        onSessionNameChange={session.setSessionName}
        savedIndicator={pulls.savedIndicator}
        cardSource={cardSource}
        sensoryEnabled={sensory.sensoryEnabled}
        onSensoryToggle={sensory.toggleSensory}
        rarityFlash={sensory.rarityFlash}
        totalCards={pulls.totalCards}
        totalPacks={pulls.totalPacks}
        totalFoils={pulls.totalFoils}
        totalSuperRare={pulls.totalSuperRare}
        totalLegendary={pulls.totalLegendary}
        totalEnchanted={pulls.totalEnchanted}
        sessionStartedAt={session.sessionStartedAt}
        relativeTime={relativeTime}
        countBumping={sensory.countBumping}
        historyCount={exportHistory.history.length}
        onHistoryClick={() => ui.setView('history')}
        onExportClick={() => ui.setView('export')}
        onClearClick={() => ui.setConfirmClear(true)}
      />

      <main
        className="main-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          paddingBottom: 80,
        }}
      >
        <div key={ui.view} style={{ animation: viewAnimation }}>
          {ui.view === 'search' && (
            <ErrorBoundary level="view" onReset={() => ui.setView('search')}>
            <SearchView
              search={search.search}
              setFilter={search.setFilter}
              onSetFilterChange={search.setSetFilter}
              setMap={sets.setMap}
              setColours={sets.setColours}
              results={search.results}
              selectedIdx={search.selectedIdx}
              onSelectedIdxChange={search.setSelectedIdx}
              pulls={pulls.pulls}
              onAddCard={handleAddCard}
              onUpdateCount={pulls.updateCount}
              onRemovePull={handleRemovePull}
              removingKey={ui.removingKey}
              firstInteraction={ui.firstInteraction}
              hintsDismissed={exportHistory.hintsDismissed}
              totalCards={pulls.totalCards}
              confirmClear={ui.confirmClear}
              onClearClick={() => ui.setConfirmClear(true)}
              onClearConfirm={handleClearAll}
              onCancelClear={() => ui.setConfirmClear(false)}
              onSearchChange={search.setSearch}
              onSearch={search.setSearch}
              onKeyDown={handleKeyDown}
              inputRef={search.inputRef as React.RefObject<HTMLInputElement>}
              resultsRef={search.resultsRef as React.RefObject<HTMLDivElement>}
              scannerActive={scanner.scannerActive}
              scannerState={scanner.scannerState}
              lastMatch={scanner.lastMatch}
              scannerError={scanner.error}
              scanCount={scanner.scanCount}
              videoRef={scanner.videoRef}
              cameraSupported={cameraSupported}
              onOpenScanner={scanner.openScanner}
              onCloseScanner={scanner.closeScanner}
            />
            </ErrorBoundary>
          )}
          {ui.view === 'export' && (
            <ErrorBoundary level="view" onReset={() => ui.setView('search')}>
            <ExportView
              pulls={pulls.pulls}
              sessionName={session.sessionName}
              totalCards={pulls.totalCards}
              totalFoils={pulls.totalFoils}
              totalSuperRare={pulls.totalSuperRare}
              totalLegendary={pulls.totalLegendary}
              totalEnchanted={pulls.totalEnchanted}
              downloaded={exportHistory.downloaded}
              copied={exportHistory.copied}
              onDownload={handleExportDownload}
              onCopy={handleExportCopy}
              onBack={() => ui.setView('search')}
            />
            </ErrorBoundary>
          )}
          {ui.view === 'history' && (
            <ErrorBoundary level="view" onReset={() => ui.setView('search')}>
            <HistoryView
              history={exportHistory.history}
              onBack={() => ui.setView('search')}
            />
            </ErrorBoundary>
          )}
        </div>
      </main>

      {/* Undo toast */}
      {undo.showUndo && undo.lastActionRef.current && (
        <UndoToast
          cardName={undo.lastActionRef.current.card.display}
          onUndo={handleUndo}
          isFading={undo.undoFading}
        />
      )}

      {/* Mobile bottom bar */}
      <MobileBottomBar
        historyCount={exportHistory.history.length}
        pullsCount={pulls.totalCards}
        confirmClear={ui.confirmClear}
        onHistoryClick={() => ui.setView('history')}
        onExportClick={() => ui.setView('export')}
        onClearClick={() => ui.setConfirmClear(true)}
        onClearConfirm={handleClearAll}
        onCancelClear={() => ui.setConfirmClear(false)}
      />
    </div>
  )
}
