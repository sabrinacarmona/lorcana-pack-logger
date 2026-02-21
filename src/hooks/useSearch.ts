import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Card } from '../types'
import { searchCards } from '../utils/search'
import { debounce } from '../utils/debounce'

const SEARCH_DEBOUNCE_MS = 150

export function useSearch(cards: Card[]) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [setFilter, setSetFilter] = useState('all')

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Keep refs to latest values for the debounced callback
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const filterRef = useRef(setFilter)
  filterRef.current = setFilter

  // Create a stable debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        if (!query.trim() || cardsRef.current.length === 0) {
          setResults([])
          setSelectedIdx(0)
          return
        }
        const found = searchCards(query, cardsRef.current, filterRef.current)
        setResults(found)
        setSelectedIdx(0)
      }, SEARCH_DEBOUNCE_MS),
    [],
  )

  // Trigger debounced search when query or filter changes
  useEffect(() => {
    if (!search.trim()) {
      debouncedSearch.cancel()
      setResults([])
      setSelectedIdx(0)
      return
    }
    debouncedSearch.call(search)
  }, [search, cards, setFilter, debouncedSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel()
  }, [debouncedSearch])

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && resultsRef.current.children[selectedIdx]) {
      ;(resultsRef.current.children[selectedIdx] as HTMLElement).scrollIntoView({
        block: 'nearest',
      })
    }
  }, [selectedIdx])

  const clearSearch = useCallback(() => {
    debouncedSearch.cancel()
    setSearch('')
    setResults([])
    setSelectedIdx(0)
  }, [debouncedSearch])

  const refocusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [])

  /**
   * Flush any pending debounced search immediately.
   * Useful for Enter key (user expects instant result selection).
   */
  const flushSearch = useCallback(() => {
    debouncedSearch.flush()
  }, [debouncedSearch])

  return {
    search,
    setSearch,
    results,
    selectedIdx,
    setSelectedIdx,
    setFilter,
    setSetFilter,
    inputRef,
    resultsRef,
    clearSearch,
    refocusInput,
    flushSearch,
  }
}
