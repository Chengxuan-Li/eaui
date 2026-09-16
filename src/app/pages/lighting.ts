import type { Appearance } from '../appearance/appearances.ts'
import {
  subsolarPoint,
  sunFromSubsolar,
  type SubsolarPoint,
  type SunPosition,
} from './sunPosition.ts'

// Contextual lighting for the map scene (decisions 0018 and 0019). Display
// only: the sun here lights the scene and never feeds the shading or PV stage.
//
// The globe holds one solar state, the subsolar point, and the scene's own sun
// is derived from it for the place on screen. MapLibre gives a single
// directional light (anchor, position, colour, intensity) and a sky with fog
// blending. It has no area light and no cast shadows, so "sun size" is
// interpreted as the softness of the day/night terminator and the spread of
// glow around the horizon, and "dustiness" as fog with a dimmer, warmer,
// flatter light. Both are honest artistic controls, not solid-angle physics.

export type LightingState = {
  /** Season, as a day of the year from 1 to 365. */
  dayOfYear: number
  /** Time of day, as minutes past midnight UTC, shared by the whole globe. */
  minutesUtc: number
  /** Overall brightness of the scene light, as a percentage. */
  intensityPercent: number
  /** Circumsolar diffusion: how soft the terminator and horizon glow are. */
  diffusionPercent: number
  /** Horizon occlusion and dustiness, as a percentage. */
  hazePercent: number
}

export const LIGHTING_LIMITS = {
  dayOfYear: { min: 1, max: 365 },
  minutesUtc: { min: 0, max: 1439 },
  intensityPercent: { min: 0, max: 200 },
  diffusionPercent: { min: 0, max: 100 },
  hazePercent: { min: 0, max: 100 },
} as const

export function createInitialLighting(): LightingState {
  return {
    // Midsummer, around local noon in Boston, so the first look is well lit.
    dayOfYear: 172,
    minutesUtc: 16 * 60,
    intensityPercent: 100,
    diffusionPercent: 25,
    hazePercent: 20,
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

/**
 * What MapLibre's fill-extrusion shader does to a face colour:
 *
 *   directional = mix(1 - intensity, max(0.5 + intensity, 1), dot(normal, sun))
 *
 * so an intensity above 0.5 multiplies a lit face past its own colour. On a
 * pale palette that saturates to white, which is why light appearances keep
 * their intensity at or below the point where a lit face is left alone and
 * take their contrast from a darker light colour instead.
 */
export function faceShading(intensity: number): { lit: number; unlit: number } {
  return { lit: Math.max(0.5 + intensity, 1), unlit: 1 - intensity }
}

/** How hard the sun drives the shading; higher means deeper shaded faces. */
export function intensityHeadroom(scheme: 'light' | 'dark'): number {
  return scheme === 'light' ? 0.85 : 0.9
}

/**
 * The most of its own colour a lit face may show. A pale palette saturates to
 * white when the shader multiplies past 1, so a light appearance is held below
 * its own colour and takes the contrast from the deep shaded side instead. A
 * dark appearance keeps the lift that gives it its relief.
 */
export function litCeiling(scheme: 'light' | 'dark'): number {
  return scheme === 'light' ? 0.92 : 1.4
}

/** Scales a #rrggbb colour's channels, keeping its hue. */
export function scaleHex(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex)
  const channel = (value: number) =>
    Math.round(clamp(value * factor, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

export type LightingScene = {
  /** The globe's solar state, from which the scene's sun follows. */
  subsolar: SubsolarPoint
  sun: SunPosition
  /** 0 in full night, 1 in full day; the terminator widens with diffusion. */
  daylight: number
  /** How close the sun is to the horizon while still lighting the scene. */
  golden: number
  light: LightPaint
  sky: SkyPaint
  /** Where the sun lights the terrain from, for hillshade. */
  illuminationDirectionDeg: number
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
 * Turns the lighting controls into everything the map needs to draw the scene:
 * the globe's solar state, the scene's own sun, MapLibre's light and sky, and
 * the direction the terrain is lit from.
 */
export function buildLightingScene(
  state: LightingState,
  appearance: Appearance,
  latitudeDeg: number,
  longitudeDeg: number,
): LightingScene {
  const subsolar = subsolarPoint(state.dayOfYear, state.minutesUtc)
  const sun = sunFromSubsolar(subsolar, latitudeDeg, longitudeDeg)
  const softness = clamp(state.diffusionPercent / 100, 0, 1)
  const haze = clamp(state.hazePercent / 100, 0, 1)

  // A larger, more diffuse sun spreads light further past the terminator.
  const duskEdge = -3 - 9 * softness
  const dayEdge = 6 + 12 * softness
  const daylight = smoothstep(duskEdge, dayEdge, sun.elevationDeg)
  // Warm light belongs near the horizon, not overhead.
  const golden = daylight * (1 - smoothstep(6, 25, sun.elevationDeg))
  // The twilight band is strongest while the sun sits close to the horizon.
  const twilight = 1 - smoothstep(0, 18, Math.abs(sun.elevationDeg))

  const tokens = appearance.data.sky

  const skyColor = mixHex(tokens.night, tokens.day, daylight)
  const horizonBase = mixHex(tokens.night, tokens.day, daylight)
  const horizonColor = mixHex(
    mixHex(horizonBase, tokens.twilight, twilight * 0.85),
    tokens.golden,
    golden * 0.8,
  )
  // Dust lifts the horizon colour toward a pale, flat veil.
  const fogColor = mixHex(horizonColor, tokens.haze, 0.25 + 0.35 * haze)

  // Haze costs brightness, and a diffuse sun flattens the light a little.
  const nominal = 0.2 + 0.75 * daylight
  const strength = clamp(
    nominal *
      (state.intensityPercent / 100) *
      (1 - 0.35 * haze) *
      (1 - 0.15 * softness),
    0,
    1,
  )
  // Scaled into the appearance's headroom rather than clamped, so the controls
  // keep working across their whole range.
  const intensity = strength * intensityHeadroom(appearance.scheme)

  // The shader multiplies a lit face by this much, so the light itself is
  // dimmed until a lit face lands at or under the appearance's ceiling. That
  // darkens the lit side and the shaded side together while the deep shaded
  // side keeps the contrast.
  const litGain = faceShading(intensity).lit
  const lightColor = scaleHex(
    mixHex(
      mixHex(tokens.moonlight, tokens.sunlight, daylight),
      tokens.golden,
      golden * 0.55,
    ),
    Math.min(1, litCeiling(appearance.scheme) / litGain),
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
    subsolar,
    sun,
    daylight,
    golden,
    light,
    sky,
    illuminationDirectionDeg: sun.azimuthDeg,
  }
}

/** Describes the scene for the controls. */
export function lightingSummary(scene: LightingScene): string {
  if (scene.daylight > 0.85) return 'daylight'
  if (scene.daylight > 0.15) {
    return scene.sun.elevationDeg > 0 ? 'low sun' : 'twilight'
  }
  return 'night'
}
