import type { StyleSpecification } from 'maplibre-gl'
import type { Appearance } from '../appearance/appearances.ts'

// Live terrain for map display only (decision 0015). MapLibre fetches
// Mapterhorn's terrarium tiles at runtime; nothing here is project data.

export const TERRAIN_TILES_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
/** Terrain and hillshade use separate sources, as MapLibre recommends. */
export const TERRAIN_SOURCE_ID = 'terrain-dem'
export const HILLSHADE_SOURCE_ID = 'hillshade-dem'
export const TERRAIN_TILE_SIZE = 512
/** Mapterhorn served Back Bay tiles to zoom 16 when checked (zoom 17 was 404). */
export const TERRAIN_MAX_ZOOM = 16
export const MIN_EXAGGERATION = 1
export const MAX_EXAGGERATION = 10

export const TERRAIN_ATTRIBUTION =
  '<a href="https://mapterhorn.com/attribution/" target="_blank" rel="noreferrer">&copy; Mapterhorn</a> (USGS 3DEP)'

/** Quiet hillshade from the active appearance, so relief reads without competing with buildings. */
export function hillshadePaint(appearance: Appearance) {
  return {
    'hillshade-shadow-color': appearance.data.ink.secondary,
    'hillshade-highlight-color': appearance.chrome.surface,
    'hillshade-accent-color': appearance.data.ink.muted,
    'hillshade-exaggeration': 0.35,
  }
}

/** The first visible symbol layer, so hillshade is drawn beneath basemap labels. */
export function firstSymbolLayerId(
  style: StyleSpecification,
): string | undefined {
  return style.layers.find(
    (layer) => layer.type === 'symbol' && layer.layout?.visibility !== 'none',
  )?.id
}

export function exaggerationLabel(exaggeration: number): string {
  return exaggeration === 1 ? 'true scale' : `${exaggeration}× exaggerated`
}
