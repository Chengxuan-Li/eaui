import type { MapRef } from '@vis.gl/react-maplibre'
import type { MapSourceDataEvent } from 'maplibre-gl'
import { useCallback, useEffect, useState, type RefObject } from 'react'
import { TERRAIN_SOURCE_ID } from './terrain.ts'

// Applies live terrain to the Map page (decision 0015). The terrain and
// hillshade sources stay mounted and load nothing until used; this hook points
// MapLibre's terrain at its source only while terrain is on and has not
// failed, so a source is never removed while terrain still uses it.

export type TerrainStatus = 'off' | 'loading' | 'ready' | 'failed'

export type TerrainDisplay = {
  status: TerrainStatus
  /** Terrain and hillshade should render. */
  active: boolean
  /** Changes on retry, so the sources can be recreated. */
  attempt: number
  retry: () => void
  /** Called when the map reports a terrain or hillshade tile failure. */
  reportFailure: () => void
}

export function useTerrain(
  mapRef: RefObject<MapRef | null>,
  loaded: boolean,
  enabled: boolean,
  exaggeration: number,
): TerrainDisplay {
  const [attempt, setAttempt] = useState(0)
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null)
  const [readyAttempt, setReadyAttempt] = useState<number | null>(null)
  const failed = failedAttempt === attempt
  const active = enabled && !failed

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !loaded) return
    const apply = () => {
      const wanted =
        active && map.getSource(TERRAIN_SOURCE_ID)
          ? { source: TERRAIN_SOURCE_ID, exaggeration }
          : null
      const current = map.getTerrain()
      if (
        current?.source === wanted?.source &&
        current?.exaggeration === wanted?.exaggeration
      ) {
        return
      }
      try {
        map.setTerrain(wanted)
      } catch {
        // The style is still loading; the next styledata event applies it.
      }
    }
    const onSourceData = (event: MapSourceDataEvent) => {
      if (
        active &&
        event.sourceId === TERRAIN_SOURCE_ID &&
        map.getSource(TERRAIN_SOURCE_ID) &&
        map.isSourceLoaded(TERRAIN_SOURCE_ID)
      ) {
        setReadyAttempt(attempt)
      }
      apply()
    }
    apply()
    // Style swaps (basemap, appearance) drop terrain and re-add sources.
    map.on('styledata', apply)
    map.on('sourcedata', onSourceData)
    return () => {
      map.off('styledata', apply)
      map.off('sourcedata', onSourceData)
    }
  }, [mapRef, loaded, active, exaggeration, attempt])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])
  const reportFailure = useCallback(() => setFailedAttempt(attempt), [attempt])

  let status: TerrainStatus
  if (!enabled) status = 'off'
  else if (failed) status = 'failed'
  else if (readyAttempt === attempt) status = 'ready'
  else status = 'loading'

  return { status, active, attempt, retry, reportFailure }
}
