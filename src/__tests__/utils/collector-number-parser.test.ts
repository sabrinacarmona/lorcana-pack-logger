import { describe, it, expect } from 'vitest'
import { parseCollectorNumber } from '../../utils/collector-number-parser'

describe('parseCollectorNumber', () => {
  // --- Clean OCR output ---
  it('parses clean "123/204" format', () => {
    const result = parseCollectorNumber('123/204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  it('parses single-digit collector number', () => {
    const result = parseCollectorNumber('3/204')
    expect(result).toEqual({ cn: '3', total: '204', setNumber: null, raw: '3/204' })
  })

  it('parses two-digit collector number', () => {
    const result = parseCollectorNumber('42/204')
    expect(result).toEqual({ cn: '42', total: '204', setNumber: null, raw: '42/204' })
  })

  // --- Spacing variations ---
  it('handles spaces around slash: "123 / 204"', () => {
    const result = parseCollectorNumber('123 / 204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123 / 204' })
  })

  it('handles space before slash', () => {
    const result = parseCollectorNumber('123 /204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123 /204' })
  })

  it('handles backslash separator', () => {
    const result = parseCollectorNumber('123\\204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123\\204' })
  })

  // --- OCR noise ---
  it('handles l misread as 1 in "l23/204"', () => {
    const result = parseCollectorNumber('l23/204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  it('handles O misread as 0 in "1O3/2O4"', () => {
    const result = parseCollectorNumber('1O3/2O4')
    expect(result).toEqual({ cn: '103', total: '204', setNumber: null, raw: '103/204' })
  })

  it('handles pipe misread as 1 in "|23/204"', () => {
    const result = parseCollectorNumber('|23/204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  // --- OCR text with surrounding noise ---
  it('extracts collector number from noisy OCR line', () => {
    const result = parseCollectorNumber('some text 123/204 more text')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  it('extracts from multi-line OCR output', () => {
    const result = parseCollectorNumber('Card Name\n123/204\nRarity')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  // --- Leading zeros ---
  it('normalises leading zeros: "023/204" -> cn: "23"', () => {
    const result = parseCollectorNumber('023/204')
    expect(result).toEqual({ cn: '23', total: '204', setNumber: null, raw: '023/204' })
  })

  // --- Standalone numbers are rejected (too ambiguous) ---
  it('rejects standalone number without slash format', () => {
    expect(parseCollectorNumber('collector 123')).toBeNull()
  })

  it('rejects bare single digit (e.g. OCR noise)', () => {
    expect(parseCollectorNumber('1')).toBeNull()
  })

  it('prefers slash format over surrounding noise', () => {
    const result = parseCollectorNumber('cost 4 collector 123/204')
    expect(result).toEqual({ cn: '123', total: '204', setNumber: null, raw: '123/204' })
  })

  // --- Edge cases ---
  it('returns null for empty string', () => {
    expect(parseCollectorNumber('')).toBeNull()
  })

  it('returns null for text with no numbers', () => {
    expect(parseCollectorNumber('some random text')).toBeNull()
  })

  it('returns null for "0/204" (cn 0 is invalid)', () => {
    expect(parseCollectorNumber('0/204')).toBeNull()
  })

  it('handles max collector number 999/999', () => {
    const result = parseCollectorNumber('999/999')
    expect(result).toEqual({ cn: '999', total: '999', setNumber: null, raw: '999/999' })
  })

  // --- Total validation (rejects noise) ---
  it('rejects small total like "4/14" (noise from OCR)', () => {
    expect(parseCollectorNumber('4/14')).toBeNull()
  })

  it('rejects "1/20" (noise - no Lorcana set has only 20 cards)', () => {
    expect(parseCollectorNumber('1/20')).toBeNull()
  })

  it('rejects cn > total like "204/102" (inverted)', () => {
    expect(parseCollectorNumber('204/102')).toBeNull()
  })

  it('accepts total at boundary: "50/100"', () => {
    const result = parseCollectorNumber('50/100')
    expect(result).toEqual({ cn: '50', total: '100', setNumber: null, raw: '50/100' })
  })

  it('rejects total just below boundary: "50/99"', () => {
    expect(parseCollectorNumber('50/99')).toBeNull()
  })

  // --- Set number extraction ---
  it('extracts set number from "130/204 EN 7"', () => {
    const result = parseCollectorNumber('130/204 EN 7')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: '7', raw: '130/204' })
  })

  it('extracts set number from OCR with separators: "130/204 + EN + 7"', () => {
    const result = parseCollectorNumber('130/204 + EN + 7')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: '7', raw: '130/204' })
  })

  it('extracts set number from noisy OCR: "130/204 EN 7 (R)"', () => {
    const result = parseCollectorNumber('130/204 EN 7 (R)')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: '7', raw: '130/204' })
  })

  it('extracts double-digit set number: "42/216 EN 11"', () => {
    const result = parseCollectorNumber('42/216 EN 11')
    expect(result).toEqual({ cn: '42', total: '216', setNumber: '11', raw: '42/216' })
  })

  it('returns null setNumber when no digits follow CN', () => {
    const result = parseCollectorNumber('130/204')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: null, raw: '130/204' })
  })

  it('handles real OCR output: "130/204 EN 7 ®"', () => {
    const result = parseCollectorNumber('130/204 EN 7 \u00AE')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: '7', raw: '130/204' })
  })

  it('handles real OCR output with noise: "130/204 +EN 7 I"', () => {
    // "I" after "7" should NOT create a false set number — "7" is found first
    const result = parseCollectorNumber('130/204 +EN 7 I')
    expect(result).toEqual({ cn: '130', total: '204', setNumber: '7', raw: '130/204' })
  })
})
