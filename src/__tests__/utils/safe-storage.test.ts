import { describe, it, expect, beforeEach } from 'vitest'
import { SafeStorage } from '../../utils/safe-storage'

describe('SafeStorage', () => {
  beforeEach(() => { localStorage.clear() })

  it('stores and retrieves a string', () => {
    SafeStorage.setItem('key', 'value')
    expect(SafeStorage.getItem('key')).toBe('value')
  })

  it('returns null for missing key', () => {
    expect(SafeStorage.getItem('nonexistent')).toBeNull()
  })

  it('removes an item', () => {
    SafeStorage.setItem('key', 'value')
    SafeStorage.removeItem('key')
    expect(SafeStorage.getItem('key')).toBeNull()
  })

  it('stores and retrieves JSON', () => {
    const data = { pulls: [1, 2, 3], name: 'Test' }
    SafeStorage.setJSON('json-key', data)
    expect(SafeStorage.getJSON('json-key', null)).toEqual(data)
  })

  it('returns fallback for missing JSON key', () => {
    expect(SafeStorage.getJSON('missing', [])).toEqual([])
  })

  it('returns fallback for corrupted JSON', () => {
    localStorage.setItem('bad', '{invalid json}')
    expect(SafeStorage.getJSON('bad', 'fallback')).toBe('fallback')
  })
})
