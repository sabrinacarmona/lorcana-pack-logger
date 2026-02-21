import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  level?: 'app' | 'view'
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    const isApp = this.props.level === 'app'

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
          minHeight: isApp ? '100vh' : '200px',
          background: isApp ? 'var(--bg-base, #0e0e12)' : 'transparent',
          color: 'var(--text-primary, #e8e6f0)',
          fontFamily: 'Outfit, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          {isApp ? '⚡' : '⚠️'}
        </div>
        <h2
          style={{
            fontSize: isApp ? '20px' : '16px',
            fontWeight: 600,
            margin: '0 0 8px',
            color: 'var(--text-primary, #e8e6f0)',
          }}
        >
          {isApp ? 'Something went wrong' : 'This section encountered an error'}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary, #9e9bb0)',
            margin: '0 0 20px',
            maxWidth: '400px',
            lineHeight: 1.5,
          }}
        >
          {isApp
            ? 'The app hit an unexpected error. Your session data is safe in local storage.'
            : 'Something went wrong loading this view. Try going back or reloading.'}
        </p>
        {this.state.error && (
          <pre
            style={{
              fontSize: '11px',
              color: 'var(--text-muted, #6b6880)',
              background: 'rgba(255,255,255,0.04)',
              padding: '8px 12px',
              borderRadius: '6px',
              maxWidth: '500px',
              overflow: 'auto',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isApp && (
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent, #7c5cbf)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: isApp ? 'none' : '1px solid var(--border, #2a2a35)',
              background: isApp ? 'var(--accent, #7c5cbf)' : 'transparent',
              color: isApp ? '#fff' : 'var(--text-secondary, #9e9bb0)',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
