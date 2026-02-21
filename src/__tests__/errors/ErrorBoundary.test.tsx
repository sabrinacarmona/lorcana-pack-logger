import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../../errors/ErrorBoundary'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console output during tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('renders fallback UI when child throws (app level)', () => {
    render(
      <ErrorBoundary level="app">
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Test explosion')).toBeTruthy()
    expect(screen.getByText('Reload page')).toBeTruthy()
  })

  it('renders fallback UI when child throws (view level)', () => {
    render(
      <ErrorBoundary level="view">
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('This section encountered an error')).toBeTruthy()
    expect(screen.getByText('Try again')).toBeTruthy()
    expect(screen.getByText('Reload page')).toBeTruthy()
  })

  it('calls onReset when "Try again" is clicked at view level', () => {
    const onReset = vi.fn()
    render(
      <ErrorBoundary level="view" onReset={onReset}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('This section encountered an error')).toBeTruthy()
    fireEvent.click(screen.getByText('Try again'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('renders custom fallback if provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom fallback')).toBeTruthy()
  })
})
