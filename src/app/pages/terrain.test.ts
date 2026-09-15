import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { APPEARANCE_LIST } from '../appearance/appearances.ts'
import {
  exaggerationLabel,
  firstSymbolLayerId,
  hillshadePaint,
  TERRAIN_ATTRIBUTION,
} from './terrain.ts'

const STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background' },
    {
      id: 'road_shield_us',
      type: 'symbol',
      source: 'openmaptiles',
      layout: { visibility: 'none' },
    },
    { id: 'highway-name-minor', type: 'symbol', source: 'openmaptiles' },
    { id: 'label_city', type: 'symbol', source: 'openmaptiles' },
  ],
}

describe('terrain display', () => {
  it.each(APPEARANCE_LIST)(
    'colors hillshade from $label tokens',
    (appearance) => {
      expect(hillshadePaint(appearance)).toEqual({
        'hillshade-shadow-color': appearance.data.ink.secondary,
        'hillshade-highlight-color': appearance.chrome.surface,
        'hillshade-accent-color': appearance.data.ink.muted,
        'hillshade-exaggeration': 0.35,
      })
    },
  )

  it('places hillshade beneath the first visible basemap label', () => {
    expect(firstSymbolLayerId(STYLE)).toBe('highway-name-minor')
    expect(
      firstSymbolLayerId({
        ...STYLE,
        layers: [{ id: 'bg', type: 'background' }],
      }),
    ).toBeUndefined()
  })

  it('names true scale and exaggeration for the legend', () => {
    expect(exaggerationLabel(1)).toBe('true scale')
    expect(exaggerationLabel(4)).toBe('4× exaggerated')
  })

  it('credits Mapterhorn and USGS 3DEP', () => {
    expect(TERRAIN_ATTRIBUTION).toContain('mapterhorn.com/attribution')
    expect(TERRAIN_ATTRIBUTION).toContain('USGS 3DEP')
  })
})
