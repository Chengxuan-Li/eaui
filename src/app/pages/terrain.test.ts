import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { APPEARANCE_LIST } from '../appearance/appearances.ts'
import {
  exaggerationLabel,
  firstSymbolLayerId,
  hillshadePaint,
  TERRAIN_ATTRIBUTION,
  DEFAULT_ILLUMINATION_DIRECTION,
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
        'hillshade-illumination-anchor': 'map',
        'hillshade-illumination-direction': DEFAULT_ILLUMINATION_DIRECTION,
        'hillshade-shadow-color': appearance.data.ink.secondary,
        'hillshade-highlight-color': appearance.chrome.surface,
        'hillshade-accent-color': appearance.data.ink.muted,
        'hillshade-exaggeration': 0.35,
      })
    },
  )

  // Decision 0019: relief is lit from where the sun is.
  it('lights hillshade from the sun, wrapped into a compass bearing', () => {
    const appearance = APPEARANCE_LIST[0]!
    expect(
      hillshadePaint(appearance, 120)['hillshade-illumination-direction'],
    ).toBe(120)
    expect(
      hillshadePaint(appearance, -30)['hillshade-illumination-direction'],
    ).toBe(330)
    expect(
      hillshadePaint(appearance, 411.6)['hillshade-illumination-direction'],
    ).toBe(52)
  })

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
