// Solar position for the map's contextual lighting (decision 0018). Display
// only: the sun drives how the scene is lit and never feeds the shading or PV
// stage, whose numbers come from the simulator.
//
// NOAA's solar position equations, which are accurate to about a tenth of a
// degree over the years this prototype cares about.

export type SunPosition = {
  /** Degrees above the horizon; negative while the sun is down. */
  elevationDeg: number
  /** Degrees clockwise from true north, so 90 is due east and 180 due south. */
  azimuthDeg: number
}

const DEG = Math.PI / 180

export const DAYS_IN_YEAR = 365
export const MINUTES_IN_DAY = 1440

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

/**
 * The sun's direction for a day of the year and a time in UTC, at a place on
 * the globe. Both inputs come from the map's lighting controls; the place is
 * the district centre, so shadows and sky match where the footprints are.
 */
export function sunPosition(
  dayOfYear: number,
  minutesUtc: number,
  latitudeDeg: number,
  longitudeDeg: number,
): SunPosition {
  const hour = minutesUtc / 60
  const gamma =
    ((2 * Math.PI) / DAYS_IN_YEAR) * (dayOfYear - 1 + (hour - 12) / 24)

  // Equation of time, in minutes: the difference between clock and sundial.
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))

  // Solar declination, in radians: the sun's tilt through the year.
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  // True solar time, in minutes. UTC needs no timezone term, only longitude.
  const trueSolarTime = minutesUtc + eqTime + 4 * longitudeDeg
  const hourAngleDeg = trueSolarTime / 4 - 180

  const lat = latitudeDeg * DEG
  const hourAngle = hourAngleDeg * DEG
  const cosZenith =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  const zenith = Math.acos(clamp(cosZenith, -1, 1))
  const elevationDeg = 90 - zenith / DEG

  // Azimuth is undefined straight overhead; due south is the useful answer.
  const sinZenith = Math.sin(zenith)
  let azimuthDeg = 180
  if (sinZenith > 1e-6) {
    const cosAzimuth =
      -(Math.sin(lat) * Math.cos(zenith) - Math.sin(declination)) /
      (Math.cos(lat) * sinZenith)
    const azimuth = Math.acos(clamp(cosAzimuth, -1, 1)) / DEG
    // Before solar noon the sun is east of south, after it west.
    azimuthDeg = hourAngleDeg > 0 ? 360 - azimuth : azimuth
  }

  return { elevationDeg, azimuthDeg }
}

/** "21 June", from a day of the year; a non-leap reference year keeps day 1 on 1 January. */
export function dayOfYearLabel(dayOfYear: number): string {
  return new Date(Date.UTC(2001, 0, dayOfYear)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** "16:45 UTC", from minutes past midnight. */
export function timeOfDayLabel(minutesUtc: number): string {
  const hours = Math.floor(minutesUtc / 60)
  const minutes = Math.round(minutesUtc % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} UTC`
}
