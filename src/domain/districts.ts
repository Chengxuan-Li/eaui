import backBayBuildings from './fixtures/back-bay-buildings.geo.json'
import type { LngLat } from './types.ts'

// The building geometry a project is built from (decisions 0012 and 0020).
// Back Bay is bundled so the app has a district before anything is chosen;
// the other places load on demand, because four extracts would otherwise sit
// in the initial bundle to show one of them.

const METERS_PER_DEGREE = 111_320

export type DistrictFootprint = {
  ring: LngLat[]
  sourceRef: string
  areaM2: number
}

export type DistrictBounds = {
  west: number
  east: number
  south: number
  north: number
}

export type District = {
  id: string
  /** Shown as the project location, and in Inspection provenance. */
  locationName: string
  /** Just the place, for labels that read badly with the full attribution. */
  shortName: string
  footprints: DistrictFootprint[]
  center: LngLat
  bounds: DistrictBounds
}

/** A parsed OpenStreetMap extract as written by scripts/fetch-osm-buildings.mjs. */
export type DistrictExtract = {
  features: {
    properties: { osm: string }
    geometry: { coordinates: number[][][] }
  }[]
}

/**
 * Planar approximation of a footprint's area, good enough at district scale
 * because a single block spans a few hundred metres.
 */
export function ringAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0
  const [originLng, originLat] = ring[0] ?? [0, 0]
  // A degree of longitude shortens with latitude; a degree of latitude does not.
  const metersPerLng = METERS_PER_DEGREE * Math.cos((originLat * Math.PI) / 180)
  let sum = 0
  for (let index = 1; index < ring.length; index++) {
    const [x1, y1] = ring[index - 1] ?? [originLng, originLat]
    const [x2, y2] = ring[index] ?? [originLng, originLat]
    sum +=
      (x1 - originLng) * (y2 - originLat) - (x2 - originLng) * (y1 - originLat)
  }
  return (Math.abs(sum) / 2) * metersPerLng * METERS_PER_DEGREE
}

function boundsOf(footprints: DistrictFootprint[]): DistrictBounds {
  return footprints
    .flatMap((footprint) => footprint.ring)
    .reduce(
      (box, [lng, lat]) => ({
        west: Math.min(box.west, lng),
        east: Math.max(box.east, lng),
        south: Math.min(box.south, lat),
        north: Math.max(box.north, lat),
      }),
      { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity },
    )
}

export function parseDistrict(
  id: string,
  locationName: string,
  extract: DistrictExtract,
  shortName = locationName.replace(/\s*\(.*$/, ''),
): District {
  const footprints = extract.features.map((feature) => {
    const ring = (feature.geometry.coordinates[0] ?? []).map(
      ([lng, lat]): LngLat => [lng ?? 0, lat ?? 0],
    )
    return {
      ring,
      sourceRef: `OpenStreetMap ${feature.properties.osm}`,
      areaM2: ringAreaM2(ring),
    }
  })
  const bounds = boundsOf(footprints)
  return {
    id,
    locationName,
    shortName,
    footprints,
    bounds,
    center: [
      (bounds.west + bounds.east) / 2,
      (bounds.south + bounds.north) / 2,
    ],
  }
}

export const BACK_BAY = parseDistrict(
  'backBay',
  'Boston Back Bay (OpenStreetMap footprints, synthetic attributes)',
  backBayBuildings,
)

// Which district the next "Location setup" run captures. Stage runners are
// synchronous and take no district argument, so the chosen one is set here
// before the run. Everything downstream reads the captured buildings from
// state, not from this.
let current: District = BACK_BAY

export function currentDistrict(): District {
  return current
}

export function setCurrentDistrict(district: District): void {
  current = district
}
