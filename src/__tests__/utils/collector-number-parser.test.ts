import { describe, it, expect } from 'vitest'
import { parseCollectorNumber } from '../../utils/collector-number-parser'

describe('parseCollectorNumber', () => {
  // --- Clean OCR output ---
  it('parses clean "123/204" format', () => {
    const result = parseCollectorNumber('123/204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  it('parses single-digit collector number', () => {
    const result = parseCollectorNumber('3/204')
    expect(result).toEqual({ cn: '3', total: '204', raw: '3/204' })
  })

  it('parses two-digit collector number', () => {
    const result = parseCollectorNumber('42/204')
    expect(result).toEqual({ cn: '42', total: '204', raw: '42/204' })
  })

  // --- Spacing variations ---
  it('handles spaces around slash: "123 / 204"', () => {
    const result = parseCollectorNumber('123 / 204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123 / 204' })
  })

  it('handles space before slash', () => {
    const result = parseCollectorNumber('123 /204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123 /204' })
  })

  it('handles backslash separator', () => {
    const result = parseCollectorNumber('123\\204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123\\204' })
  })

  // --- OCR noise ---
  it('handles l misread as 1 in "l23/204"', () => {
    const result = parseCollectorNumber('l23/204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  it('handles O misread as 0 in "1O3/2O4"', () => {
    const result = parseCollectorNumber('1O3/2O4')
    expect(result).toEqual({ cn: '103', total: '204', raw: '103/204' })
  })

  it('handles pipe misread as 1 in "|23/204"', () => {
    const result = parseCollectorNumber('|23/204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  // --- OCR text with surrounding noise ---
  it('extracts collector number from noisy OCR line', () => {
    const result = parseCollectorNumber('some text 123/204 more text')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  it('extracts from multi-line OCR output', () => {
    const result = parseCollectorNumber('Card Name\n123/204\nRarity')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  // --- Leading zeros ---
  it('normalises leading zeros: "023/204" → cn: "23"', () => {
    const result = parseCollectorNumber('023/204')
    expect(result).toEqual({ cn: '23', total: '204', raw: '023/204' })
  })

  // --- Fallback: standalone number ---
  it('falls back to standalone number when no slash format found', () => {
    const result = parseCollectorNumber('collector 123')
    expect(result).toEqual({ cn: '123', total: null, raw: '123' })
  })

  it('prefers slash format over standalone number', () => {
    const result = parseCollectorNumber('cost 4 collector 123/204')
    expect(result).toEqual({ cn: '123', total: '204', raw: '123/204' })
  })

  // --- Edge cases ---
  it('returns null for empty string', () => {
    expect(parseCollectorNumber('')).toBeNull()
  })

  it('returns null for text with no numbers', () => {
    expect(parseCollectorNumber('some random text')).toBeNull()
  })

  it('rejects cn 0 in slash format but falls back to standalone', () => {
    // "0/204" has cn=0 which is invalid, but "204" is a valid standalone number
    const result = parseCollectorNumber('0/204')
    expect(result).toEqual({ cn: '204', total: null, raw: '204' })
  })

  it('handles max collector number 999/999', () => {
    const result = parseCollectorNumber('999/999')
    expect(result).toEqual({ cn: '999', total: '999', raw: '999/999' })
  })
})
