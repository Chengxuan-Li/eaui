import type { MapRef } from '@vis.gl/react-maplibre'
import { useEffect, type RefObject } from 'react'
import type { LightingScene } from './lighting.ts'

// Applies the contextual lighting to MapLibre (decision 0018). The light and
// the sky are style state, so a style swap (basemap, appearance, terrain) drops
// them; reapplying on styledata puts them back.

export function useSceneLighting(
  mapRef: RefObject<MapRef | null>,
  loaded: boolean,
  /** Lighting belongs to the 3D scene; a flat map keeps MapLibre's defaults. */
  active: boolean,
  scene: LightingScene,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !loaded) return
    const apply = () => {
      try {
        if (active) {
          map.setLight(scene.light)
          map.setSky(scene.sky)
          return
        }
        // Leaving 3D restores MapLibre's own light. The sky is left as it is,
        // because Map.setSky takes no empty value and nothing draws the sky at
        // zero pitch, where the flat map sits.
        map.setLight({ anchor: 'viewport' })
      } catch {
        // The style is still loading; the next styledata event applies it.
      }
    }
    apply()
    map.on('styledata', apply)
    return () => {
      map.off('styledata', apply)
    }
  }, [mapRef, loaded, active, scene])
}
