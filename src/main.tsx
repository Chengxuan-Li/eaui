import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'

// Package spikes load only with ?spike=<name>, outside the product bundle path.
const SpikeApp = lazy(() => import('./spikes/SpikeApp.tsx'))
const spike = new URLSearchParams(window.location.search).get('spike')

const root = document.getElementById('root')
if (!root) {
  throw new Error('Missing #root element in index.html')
}

createRoot(root).render(
  <StrictMode>
    {spike ? (
      <Suspense fallback={<p>Loading spike…</p>}>
        <SpikeApp name={spike} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
