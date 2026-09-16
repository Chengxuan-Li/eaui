// Solar position for the map's contextual lighting (decisions 0018 and 0019).
// Display only: the sun lights the scene and never feeds the shading or PV
// stage, whose numbers come from the simulator.
//
// The globe carries one solar state, the subsolar point: the place where the
// sun is overhead. Its latitude is the solar declination, which depends on the
// time of year, and its longitude follows the earth's rotation through the UTC
// time shared by everyone on the globe. Every location's own sun is derived
// from that one state.
//
// NOAA's equations, accurate to about a tenth of a degree over the years this
// prototype cares about.

export type SunPosition = {
  /** Degrees above the horizon; negative while the sun is down. */
  elevationDeg: number
  /** Degrees clockwise from true north, so 90 is due east and 180 due south. */
  azimuthDeg: number
}

/** Where the sun is overhead: the globe's whole solar state. */
export type SubsolarPoint = {
  /** Solar declination, which the time of year sets. */
  latitudeDeg: number
  /** Where it is solar noon, which the UTC time sets. */
  longitudeDeg: number
}

const DEG = Math.PI / 180

export const DAYS_IN_YEAR = 365
export const MINUTES_IN_DAY = 1440

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

/** Wraps degrees into -180 to 180. */
function wrapDegrees(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180
}

/**
 * The subsolar point for a day of the year and a time in UTC. This is the
 * globe-level state: no observer takes part.
 */
export function subsolarPoint(
  dayOfYear: number,
  minutesUtc: number,
): SubsolarPoint {
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

  // Solar noon happens where the true solar time is 720 minutes.
  return {
    latitudeDeg: declination / DEG,
    longitudeDeg: wrapDegrees((720 - minutesUtc - eqTime) / 4),
  }
}

/**
 * One location's sun, derived from the globe's subsolar point. The hour angle
 * is simply how far that location sits east or west of solar noon.
 */
export function sunFromSubsolar(
  subsolar: SubsolarPoint,
  latitudeDeg: number,
  longitudeDeg: number,
): SunPosition {
  const declination = subsolar.latitudeDeg * DEG
  const hourAngleDeg = wrapDegrees(longitudeDeg - subsolar.longitudeDeg)
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

/** The sun at a place, for a day of the year and a time in UTC. */
export function sunPosition(
  dayOfYear: number,
  minutesUtc: number,
  latitudeDeg: number,
  longitudeDeg: number,
): SunPosition {
  return sunFromSubsolar(
    subsolarPoint(dayOfYear, minutesUtc),
    latitudeDeg,
    longitudeDeg,
  )
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
