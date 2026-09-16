import { describe, expect, it } from 'vitest'
import { APPEARANCES } from '../appearance/appearances.ts'
import {
  buildLightingScene,
  createInitialLighting,
  faceShading,
  lightingSummary,
  mixHex,
  type LightingState,
} from './lighting.ts'
import { subsolarPoint } from './sunPosition.ts'

const LAT = 42.35
const LON = -71.08
const appearance = APPEARANCES.light

const at = (patch: Partial<LightingState>) =>
  buildLightingScene(
    { ...createInitialLighting(), ...patch },
    appearance,
    LAT,
    LON,
  )

// Local noon and local midnight in Boston, in UTC.
const NOON = 17 * 60
const MIDNIGHT = 5 * 60

describe('mixHex', () => {
  it('interpolates between two colors', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('clamps outside the range and rejects a bad color', () => {
    expect(mixHex('#102030', '#ffffff', -1)).toBe('#102030')
    expect(() => mixHex('red', '#ffffff', 0.5)).toThrow(/#rrggbb/)
  })
})

describe('buildLightingScene', () => {
  it('carries the globe solar state the scene sun is derived from', () => {
    const scene = at({ minutesUtc: NOON })
    expect(scene.subsolar).toEqual(
      subsolarPoint(createInitialLighting().dayOfYear, NOON),
    )
  })

  it('lights the scene by day and darkens it at night', () => {
    const day = at({ minutesUtc: NOON })
    const night = at({ minutesUtc: MIDNIGHT })
    expect(day.daylight).toBeGreaterThan(0.9)
    expect(night.daylight).toBeLessThan(0.05)
    expect(day.light.intensity).toBeGreaterThan(night.light.intensity)
    expect(lightingSummary(day)).toBe('daylight')
    expect(lightingSummary(night)).toBe('night')
  })

  it('puts the sun where MapLibre expects it, and lights terrain from there', () => {
    const { light, sun, illuminationDirectionDeg } = at({ minutesUtc: NOON })
    expect(light.anchor).toBe('map')
    // [radial, azimuthal, polar], with polar measured from straight up.
    expect(light.position[1]).toBeCloseTo(sun.azimuthDeg, 5)
    expect(light.position[2]).toBeCloseTo(90 - sun.elevationDeg, 5)
    expect(illuminationDirectionDeg).toBeCloseTo(sun.azimuthDeg, 5)
  })

  it('scales brightness with the intensity control', () => {
    const dim = at({ minutesUtc: NOON, intensityPercent: 50 })
    const bright = at({ minutesUtc: NOON, intensityPercent: 150 })
    expect(bright.light.intensity).toBeGreaterThan(dim.light.intensity)
  })

  it('dims the light and thickens the fog as dust rises', () => {
    const clear = at({ minutesUtc: NOON, hazePercent: 0 })
    const dusty = at({ minutesUtc: NOON, hazePercent: 100 })
    expect(dusty.light.intensity).toBeLessThan(clear.light.intensity)
    expect(dusty.sky['horizon-fog-blend']).toBeGreaterThan(
      clear.sky['horizon-fog-blend'],
    )
    expect(dusty.sky['fog-ground-blend']).toBeGreaterThan(
      clear.sky['fog-ground-blend'],
    )
  })

  it('widens the terminator as the sun is made more diffuse', () => {
    // Just below the horizon, where a sharp sun is dark but a soft one is not.
    // Scanning avoids hardcoding a minute whose elevation could drift.
    const dusk = { dayOfYear: 80, minutesUtc: 0 }
    for (let minutes = 0; minutes < 1440; minutes += 1) {
      const elevation = at({ dayOfYear: 80, minutesUtc: minutes }).sun
        .elevationDeg
      if (elevation < -4 && elevation > -6) {
        dusk.minutesUtc = minutes
        break
      }
    }
    const sharp = at({ ...dusk, diffusionPercent: 0 })
    const soft = at({ ...dusk, diffusionPercent: 100 })
    expect(sharp.sun.elevationDeg).toBeLessThan(0)
    expect(soft.daylight).toBeGreaterThan(sharp.daylight)
    expect(soft.sky['sky-horizon-blend']).toBeGreaterThan(
      sharp.sky['sky-horizon-blend'],
    )
  })

  it('warms the light near the horizon, not overhead', () => {
    const noon = at({ minutesUtc: NOON })
    const lowSun = at({ dayOfYear: 80, minutesUtc: 21 * 60 + 40 })
    expect(lowSun.golden).toBeGreaterThan(noon.golden)
  })

  it('produces valid colors from every appearance, day and night', () => {
    for (const candidate of Object.values(APPEARANCES)) {
      for (const minutesUtc of [NOON, MIDNIGHT]) {
        const scene = buildLightingScene(
          { ...createInitialLighting(), minutesUtc },
          candidate,
          LAT,
          LON,
        )
        for (const color of [
          scene.light.color,
          scene.sky['sky-color'],
          scene.sky['horizon-color'],
          scene.sky['fog-color'],
        ]) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/i)
        }
      }
    }
  })

  it('lights the same instant differently on opposite sides of the globe', () => {
    const state = { ...createInitialLighting(), minutesUtc: NOON }
    const boston = buildLightingScene(state, appearance, LAT, LON)
    // Half a world away, the same UTC minute is the other half of the day.
    const antipode = buildLightingScene(state, appearance, -LAT, LON + 180)
    expect(boston.subsolar).toEqual(antipode.subsolar)
    expect(boston.daylight).toBeGreaterThan(0.9)
    expect(antipode.daylight).toBeLessThan(0.05)
  })
})

// MapLibre shades a face by max(0.5 + intensity, 1), which multiplies a lit
// face past its own colour and saturates a pale palette to white. Light
// appearances dim the light until a lit face lands under its own colour, and
// take the contrast from a deep shaded side.
describe('face contrast', () => {
  const brightest = (hex: string) =>
    Math.max(
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ) / 255

  const noon = (candidate: (typeof APPEARANCES)[keyof typeof APPEARANCES]) =>
    buildLightingScene(
      { ...createInitialLighting(), minutesUtc: NOON },
      candidate,
      LAT,
      LON,
    )

  const lightAppearances = Object.values(APPEARANCES).filter(
    (candidate) => candidate.scheme === 'light',
  )

  it('never lets a lit face reach its own colour in a light appearance', () => {
    for (const candidate of lightAppearances) {
      const scene = noon(candidate)
      const { lit } = faceShading(scene.light.intensity)
      expect(lit * brightest(scene.light.color)).toBeLessThanOrEqual(0.95)
    }
  })

  it('keeps a deep shaded side in a light appearance', () => {
    for (const candidate of lightAppearances) {
      const { lit, unlit } = faceShading(noon(candidate).light.intensity)
      expect(lit / unlit).toBeGreaterThan(4)
    }
  })

  it('darkens the shaded side well below the lit side', () => {
    for (const candidate of lightAppearances) {
      const scene = noon(candidate)
      const level = brightest(scene.light.color)
      const { unlit } = faceShading(scene.light.intensity)
      expect(unlit * level).toBeLessThan(0.25)
    }
  })

  it('lays less atmosphere and fog over a light appearance than a dark one', () => {
    const state = { ...createInitialLighting(), minutesUtc: NOON }
    const light = buildLightingScene(state, APPEARANCES.light, LAT, LON)
    const dark = buildLightingScene(state, APPEARANCES.dark, LAT, LON)
    for (const key of [
      'atmosphere-blend',
      'horizon-fog-blend',
      'fog-ground-blend',
    ] as const) {
      expect(light.sky[key]).toBeLessThan(dark.sky[key])
    }
    // A globe seen from space would otherwise vanish under a white veil;
    // MapLibre's own default is 0.8.
    expect(light.sky['atmosphere-blend']).toBeLessThan(0.8)
    // The dark appearances keep exactly what they had.
    expect(dark.sky['atmosphere-blend']).toBeCloseTo(0.92, 2)
  })

  it('leaves the dark appearances lifting their lit faces as before', () => {
    for (const candidate of Object.values(APPEARANCES)) {
      if (candidate.scheme !== 'dark') continue
      expect(faceShading(noon(candidate).light.intensity).lit).toBeGreaterThan(
        1,
      )
    }
  })
})
