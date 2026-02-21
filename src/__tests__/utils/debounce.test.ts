import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../../utils/debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays execution by the specified time', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)

    d.call('a')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('resets the timer on subsequent calls', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)

    d.call('a')
    vi.advanceTimersByTime(150)
    d.call('b')
    vi.advanceTimersByTime(150)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('cancel prevents pending execution', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)

    d.call('a')
    d.cancel()
    vi.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()
  })

  it('flush executes immediately if pending', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)

    d.call('a')
    d.flush()
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('a')

    // Should not fire again after delay
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('flush is a no-op when nothing is pending', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)

    d.flush()
    expect(fn).not.toHaveBeenCalled()
  })
})
