import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './errors/ErrorBoundary'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary level="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
