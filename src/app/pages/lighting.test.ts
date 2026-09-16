import { describe, expect, it } from 'vitest'
import { APPEARANCES } from '../appearance/appearances.ts'
import {
  buildLightingScene,
  createInitialLighting,
  lightingSummary,
  litWindowFactor,
  mixHex,
  type LightingState,
} from './lighting.ts'

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
  it('lights the scene by day and darkens it at night', () => {
    const day = at({ minutesUtc: NOON })
    const night = at({ minutesUtc: MIDNIGHT })
    expect(day.daylight).toBeGreaterThan(0.9)
    expect(night.daylight).toBeLessThan(0.05)
    expect(day.light.intensity).toBeGreaterThan(night.light.intensity)
    expect(lightingSummary(day)).toBe('daylight')
    expect(lightingSummary(night)).toBe('night')
  })

  it('puts the sun where MapLibre expects it', () => {
    const { light, sun } = at({ minutesUtc: NOON })
    expect(light.anchor).toBe('map')
    // [radial, azimuthal, polar], with polar measured from straight up.
    expect(light.position[1]).toBeCloseTo(sun.azimuthDeg, 5)
    expect(light.position[2]).toBeCloseTo(90 - sun.elevationDeg, 5)
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

  it('turns night lights on only after dark, and follows their control', () => {
    expect(at({ minutesUtc: NOON, nightLightsPercent: 100 }).glow).toBeLessThan(
      0.05,
    )
    const half = at({ minutesUtc: MIDNIGHT, nightLightsPercent: 50 })
    const full = at({ minutesUtc: MIDNIGHT, nightLightsPercent: 100 })
    expect(full.glow).toBeGreaterThan(half.glow)
    expect(full.glow).toBeGreaterThan(0.9)
    expect(at({ minutesUtc: MIDNIGHT, nightLightsPercent: 0 }).glow).toBe(0)
  })

  it('warms the light near the horizon, not overhead', () => {
    const noon = at({ minutesUtc: NOON })
    const lowSun = at({ dayOfYear: 80, minutesUtc: 21 * 60 + 40 })
    expect(lowSun.golden).toBeGreaterThan(noon.golden)
  })

  it('produces valid colors for every appearance', () => {
    for (const candidate of Object.values(APPEARANCES)) {
      const scene = buildLightingScene(
        createInitialLighting(),
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
  })
})

describe('litWindowFactor', () => {
  it('lights workplaces and shops more than homes and schools', () => {
    expect(litWindowFactor('retail', 4)).toBeGreaterThan(
      litWindowFactor('residential', 4),
    )
    expect(litWindowFactor('residential', 4)).toBeGreaterThan(
      litWindowFactor('school', 4),
    )
  })

  it('rises with floors and levels off, and handles missing data', () => {
    expect(litWindowFactor('office', 12)).toBeGreaterThan(
      litWindowFactor('office', 2),
    )
    expect(litWindowFactor('office', 40)).toBeCloseTo(
      litWindowFactor('office', 12),
      5,
    )
    expect(litWindowFactor(null, null)).toBeGreaterThan(0)
    expect(litWindowFactor(null, null)).toBeLessThanOrEqual(1)
  })
})
