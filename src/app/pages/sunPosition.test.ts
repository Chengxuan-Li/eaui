import { describe, expect, it } from 'vitest'
import {
  dayOfYearLabel,
  MINUTES_IN_DAY,
  sunPosition,
  timeOfDayLabel,
} from './sunPosition.ts'

// Boston Back Bay, where the footprints are.
const LAT = 42.35
const LON = -71.08

const EQUINOX = 80 // 21 March
const SUMMER_SOLSTICE = 172 // 21 June
const WINTER_SOLSTICE = 355 // 21 December

/** Scans a day in UTC and returns the sun at its highest. */
function noon(dayOfYear: number) {
  let best = sunPosition(dayOfYear, 0, LAT, LON)
  let bestMinutes = 0
  for (let minutes = 0; minutes < MINUTES_IN_DAY; minutes += 1) {
    const position = sunPosition(dayOfYear, minutes, LAT, LON)
    if (position.elevationDeg > best.elevationDeg) {
      best = position
      bestMinutes = minutes
    }
  }
  return { ...best, minutes: bestMinutes }
}

describe('sunPosition', () => {
  it('puts the equinox sun at 90 minus the latitude, due south', () => {
    const highest = noon(EQUINOX)
    // 90 - 42.35 = 47.65 degrees.
    expect(highest.elevationDeg).toBeCloseTo(47.65, 0)
    expect(highest.azimuthDeg).toBeGreaterThan(177)
    expect(highest.azimuthDeg).toBeLessThan(183)
  })

  it('follows the axial tilt across the solstices', () => {
    // The sun is 23.44 degrees higher in June and lower in December.
    expect(noon(SUMMER_SOLSTICE).elevationDeg).toBeCloseTo(71.1, 0)
    expect(noon(WINTER_SOLSTICE).elevationDeg).toBeCloseTo(24.2, 0)
  })

  it('reaches solar noon in the afternoon in UTC, because Boston is west of Greenwich', () => {
    // 71.08 degrees west is about 4 hours 44 minutes behind Greenwich.
    const minutes = noon(EQUINOX).minutes
    expect(minutes).toBeGreaterThan(16 * 60)
    expect(minutes).toBeLessThan(17 * 60)
  })

  it('rises in the east and sets in the west', () => {
    const morning = sunPosition(EQUINOX, 12 * 60, LAT, LON)
    const evening = sunPosition(EQUINOX, 21 * 60, LAT, LON)
    expect(morning.azimuthDeg).toBeGreaterThan(80)
    expect(morning.azimuthDeg).toBeLessThan(180)
    expect(evening.azimuthDeg).toBeGreaterThan(180)
    expect(evening.azimuthDeg).toBeLessThan(290)
  })

  it('puts the sun below the horizon at local midnight', () => {
    // Local midnight in Boston is about 05:00 UTC.
    expect(sunPosition(EQUINOX, 5 * 60, LAT, LON).elevationDeg).toBeLessThan(0)
    expect(
      sunPosition(SUMMER_SOLSTICE, 5 * 60, LAT, LON).elevationDeg,
    ).toBeLessThan(0)
  })

  it('keeps the polar winter dark and the polar summer lit', () => {
    const northOfTheCircle = 78
    const winter = noon(WINTER_SOLSTICE)
    expect(
      sunPosition(WINTER_SOLSTICE, winter.minutes, northOfTheCircle, 15)
        .elevationDeg,
    ).toBeLessThan(0)
    let lowest = 90
    for (let minutes = 0; minutes < MINUTES_IN_DAY; minutes += 30) {
      lowest = Math.min(
        lowest,
        sunPosition(SUMMER_SOLSTICE, minutes, northOfTheCircle, 15)
          .elevationDeg,
      )
    }
    expect(lowest).toBeGreaterThan(0)
  })
})

describe('lighting labels', () => {
  it('names the day of the year', () => {
    expect(dayOfYearLabel(1)).toBe('1 January')
    expect(dayOfYearLabel(SUMMER_SOLSTICE)).toBe('21 June')
  })

  it('formats the time in UTC', () => {
    expect(timeOfDayLabel(0)).toBe('00:00 UTC')
    expect(timeOfDayLabel(16 * 60 + 45)).toBe('16:45 UTC')
  })
})
