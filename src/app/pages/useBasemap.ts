import type { StyleSpecification } from 'maplibre-gl'
import { useCallback, useEffect, useState } from 'react'
import { BASEMAP_STYLE_URL } from './basemapStyle.ts'

// Loads the OpenFreeMap style for the Map page (decision 0012). The public
// instance has no SLA, so loading and failure are ordinary states: the page
// shows a plain background until the style is ready, and again if the style or
// its tiles fail.

export type BasemapStatus = 'off' | 'loading' | 'ready' | 'failed'

export type Basemap = {
  status: BasemapStatus
  /** The stock style while ready; null otherwise. */
  style: StyleSpecification | null
  retry: () => void
  /** Called when the map reports that basemap tiles failed to load. */
  reportTileFailure: () => void
}

const STYLE_TIMEOUT_MS = 15_000

// Shared by every mount of the Map page for the rest of the page load.
let cachedStyle: StyleSpecification | null = null

function isStyle(value: unknown): value is StyleSpecification {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { version?: unknown }).version === 8 &&
    Array.isArray((value as { layers?: unknown }).layers)
  )
}

type Outcome = { attempt: number; style: StyleSpecification | null }

export function useBasemap(enabled: boolean): Basemap {
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(() =>
    cachedStyle ? { attempt: 0, style: cachedStyle } : null,
  )
  const [tileFailureAttempt, setTileFailureAttempt] = useState<number | null>(
    null,
  )
  const settled = outcome?.attempt === attempt

  useEffect(() => {
    if (!enabled || settled) return
    const controller = new AbortController()
    let timedOut = false
    const timer = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, STYLE_TIMEOUT_MS)
    fetch(BASEMAP_STYLE_URL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json: unknown = await response.json()
        if (!isStyle(json)) throw new Error('The response is not a style.')
        cachedStyle = json
        setOutcome({ attempt, style: json })
      })
      .catch(() => {
        // An abort from cleanup is not a failure; a timeout is.
        if (controller.signal.aborted && !timedOut) return
        setOutcome({ attempt, style: null })
      })
      .finally(() => window.clearTimeout(timer))
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, settled, attempt])

  const retry = useCallback(() => {
    cachedStyle = null
    setAttempt((current) => current + 1)
  }, [])
  const reportTileFailure = useCallback(
    () => setTileFailureAttempt(attempt),
    [attempt],
  )

  let status: BasemapStatus
  if (!enabled) status = 'off'
  else if (!settled) status = 'loading'
  else if (!outcome?.style || tileFailureAttempt === attempt) status = 'failed'
  else status = 'ready'

  return {
    status,
    style: status === 'ready' ? (outcome?.style ?? null) : null,
    retry,
    reportTileFailure,
  }
}
