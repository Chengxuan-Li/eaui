import type { BuildingUse } from '../../domain/types.ts'
import type { Appearance } from '../appearance/appearances.ts'
import { sunPosition, type SunPosition } from './sunPosition.ts'

// Contextual lighting for the 3D map scene (decision 0018). Display only: the
// sun here lights the scene and never feeds the shading or PV stage.
//
// MapLibre gives a single directional light (anchor, position, colour,
// intensity) and a sky with fog blending. It has no area light and no cast
// shadows, so "sun size" is interpreted as the softness of the day/night
// terminator and the spread of glow around the horizon, and "dustiness" as fog
// and a dimmer, warmer, flatter light. Both are honest artistic controls, not
// solid-angle physics.

export type LightingState = {
  /** Season, as a day of the year from 1 to 365. */
  dayOfYear: number
  /** Time of day, as minutes past midnight UTC. */
  minutesUtc: number
  /** Overall brightness of the scene light, as a percentage. */
  intensityPercent: number
  /** Circumsolar diffusion: how soft the terminator and horizon glow are. */
  diffusionPercent: number
  /** Horizon occlusion and dustiness, as a percentage. */
  hazePercent: number
  /** Brightness of night lights from human activity, as a percentage. */
  nightLightsPercent: number
}

export const LIGHTING_LIMITS = {
  dayOfYear: { min: 1, max: 365 },
  minutesUtc: { min: 0, max: 1439 },
  intensityPercent: { min: 0, max: 200 },
  diffusionPercent: { min: 0, max: 100 },
  hazePercent: { min: 0, max: 100 },
  nightLightsPercent: { min: 0, max: 100 },
} as const

export function createInitialLighting(): LightingState {
  return {
    // Midsummer, around local noon in Boston, so the first look is well lit.
    dayOfYear: 172,
    minutesUtc: 16 * 60,
    intensityPercent: 100,
    diffusionPercent: 25,
    hazePercent: 20,
    nightLightsPercent: 60,
  }
}

/** MapLibre's light, which shades extrusion faces; it casts no shadows. */
export type LightPaint = {
  anchor: 'map'
  position: [number, number, number]
  color: string
  intensity: number
}

/** MapLibre's sky, which also carries the fog that reads as haze. */
export type SkyPaint = {
  'sky-color': string
  'horizon-color': string
  'fog-color': string
  'sky-horizon-blend': number
  'horizon-fog-blend': number
  'fog-ground-blend': number
  'atmosphere-blend': number
}

export type LightingScene = {
  sun: SunPosition
  /** 0 in full night, 1 in full day; the terminator widens with diffusion. */
  daylight: number
  /** How close the sun is to the horizon while still lighting the scene. */
  golden: number
  light: LightPaint
  sky: SkyPaint
  /** Opacity of the night lights, 0 whenever the sun is properly up. */
  glow: number
  glowColor: string
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 === edge0) return value < edge0 ? 0 : 1
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function parseHex(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) throw new Error(`Expected a #rrggbb color, got "${hex}".`)
  const value = Number.parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Mixes two #rrggbb colors; 0 keeps the first, 1 the second. */
export function mixHex(from: string, to: string, amount: number): string {
  const t = clamp(amount, 0, 1)
  const a = parseHex(from)
  const b = parseHex(to)
  const channel = (index: number) =>
    Math.round((a[index] ?? 0) + ((b[index] ?? 0) - (a[index] ?? 0)) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/**
 * How much of a building's windows read as lit at night, from its use and its
 * floors. Synthetic, like every other building attribute.
 */
export function litWindowFactor(
  use: BuildingUse | null,
  floors: number | null,
): number {
  const byUse: Record<BuildingUse, number> = {
    residential: 0.55,
    office: 0.85,
    retail: 0.9,
    school: 0.35,
    mixed: 0.7,
  }
  const base = use ? byUse[use] : 0.45
  const storeys = floors ?? 3
  // Taller blocks show more lit windows, levelling off around twelve floors.
  return clamp(base * (0.6 + 0.4 * Math.min(storeys / 12, 1)), 0, 1)
}

/**
 * Turns the lighting controls into everything the map needs to draw the scene:
 * the sun, MapLibre's light and sky, and the strength of the night lights.
 */
export function buildLightingScene(
  state: LightingState,
  appearance: Appearance,
  latitudeDeg: number,
  longitudeDeg: number,
): LightingScene {
  const sun = sunPosition(
    state.dayOfYear,
    state.minutesUtc,
    latitudeDeg,
    longitudeDeg,
  )
  const softness = clamp(state.diffusionPercent / 100, 0, 1)
  const haze = clamp(state.hazePercent / 100, 0, 1)

  // A larger, more diffuse sun spreads light further past the terminator.
  const duskEdge = -3 - 9 * softness
  const dayEdge = 6 + 12 * softness
  const daylight = smoothstep(duskEdge, dayEdge, sun.elevationDeg)
  // Warm light belongs near the horizon, not overhead.
  const golden = daylight * (1 - smoothstep(6, 25, sun.elevationDeg))

  const { categorical, ink, status } = appearance.data
  const cool = categorical[0]
  const warm = categorical[1]
  const dark = ink.primary
  const bright = ink.surface

  const daySky = mixHex(cool, bright, 0.45)
  const nightSky = mixHex(dark, cool, 0.25)
  const skyColor = mixHex(nightSky, daySky, daylight)

  const dayHorizon = mixHex(cool, bright, 0.78)
  const nightHorizon = mixHex(dark, cool, 0.1)
  const horizonBase = mixHex(nightHorizon, dayHorizon, daylight)
  // Sunrise and sunset put the warm slot on the horizon, not overhead.
  const horizonColor = mixHex(horizonBase, warm, golden * 0.8)

  // Dust lifts the horizon colour toward a pale, flat veil.
  const fogColor = mixHex(horizonColor, bright, 0.25 + 0.35 * haze)

  const lightDay = mixHex(bright, warm, 0.12)
  const lightNight = mixHex(dark, cool, 0.45)
  const lightColor = mixHex(
    mixHex(lightNight, lightDay, daylight),
    warm,
    golden * 0.55,
  )

  // Haze costs brightness, and a diffuse sun flattens the light a little.
  const nominal = 0.2 + 0.75 * daylight
  const intensity = clamp(
    nominal *
      (state.intensityPercent / 100) *
      (1 - 0.35 * haze) *
      (1 - 0.15 * softness),
    0,
    1,
  )

  const light: LightPaint = {
    anchor: 'map',
    // MapLibre takes [radial, azimuthal, polar]; polar is measured from straight up.
    position: [1.15, sun.azimuthDeg, clamp(90 - sun.elevationDeg, 0, 180)],
    color: lightColor,
    intensity,
  }

  const sky: SkyPaint = {
    'sky-color': skyColor,
    'horizon-color': horizonColor,
    'fog-color': fogColor,
    // A softer sun spreads the horizon glow further up the dome.
    'sky-horizon-blend': clamp(0.5 + 0.45 * softness, 0, 1),
    'horizon-fog-blend': clamp(0.2 + 0.75 * haze, 0, 1),
    'fog-ground-blend': clamp(0.05 + 0.7 * haze, 0, 1),
    'atmosphere-blend': clamp(0.6 + 0.4 * (1 - haze) * daylight, 0, 1),
  }

  return {
    sun,
    daylight,
    golden,
    light,
    sky,
    glow: clamp((1 - daylight) * (state.nightLightsPercent / 100), 0, 1),
    glowColor: status.warning,
  }
}

/** Describes the scene for the status bar and the controls. */
export function lightingSummary(scene: LightingScene): string {
  if (scene.daylight > 0.85) return 'daylight'
  if (scene.daylight > 0.15) {
    return scene.sun.elevationDeg > 0 ? 'low sun' : 'twilight'
  }
  return 'night'
}
