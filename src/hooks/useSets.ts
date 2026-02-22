import { useState, useEffect } from 'react'
import { SET_MAP, SET_COLOURS } from '../constants/sets'
import { fetchSetMetadata } from '../api/sets'
import { getSetColour } from '../utils/set-colours'

/**
 * Fetches set metadata from the API on mount, falling back to hardcoded constants.
 * Provides dynamic setMap and setColours that include any newly released sets.
 */
export function useSets() {
  const [setMap, setSetMap] = useState<Record<string, string>>(SET_MAP)
  const [setColours, setSetColours] = useState<Record<string, string>>(SET_COLOURS)
  const [setsSource, setSetsSource] = useState<'pending' | 'cached' | 'updated' | 'offline'>('pending')

  useEffect(() => {
    let cancelled = false

    fetchSetMetadata().then(({ data, source }) => {
      if (cancelled) return

      // Build setMap from API data
      const map: Record<string, string> = {}
      const colours: Record<string, string> = {}

      for (const set of data) {
        map[set.id] = set.name
        colours[set.id] = getSetColour(set.id)
      }

      setSetMap(map)
      setSetColours(colours)
      setSetsSource(source)
    }).catch(() => {
      if (!cancelled) setSetsSource('offline')
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { setMap, setColours, setsSource }
}
