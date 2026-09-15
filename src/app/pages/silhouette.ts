import type { LngLat } from '../../domain/types.ts'

// Selection is an outline in both modes (decision 0013). In 3D the outline
// follows each selected building's visible silhouette from the current camera:
// its ground, roof, and walls are projected to the screen every frame, and
// SelectionSilhouette traces the boundary of their union on an overlay canvas.

/** Matches MapLibre's earth circumference for Mercator altitude units. */
const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * 6_371_008.8

export type WorldPoint = [number, number, number]
export type ScreenPoint = [number, number]

/** MapLibre Mercator world coordinates (0 to 1), with altitude in the same units. */
export function toMercator([lng, lat]: LngLat, altitudeM = 0): WorldPoint {
  const radians = (lat * Math.PI) / 180
  const x = (lng + 180) / 360
  const y =
    (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + radians / 2))) /
    360
  const z = altitudeM / (EARTH_CIRCUMFERENCE_M * Math.cos(radians))
  return [x, y, z]
}

/** Faces of a building extruded from its footprint: ground, roof, and one quad per wall. */
export function prismFaces(
  footprint: LngLat[],
  heightM: number,
): WorldPoint[][] {
  const first = footprint[0]
  const last = footprint.at(-1)
  const ring =
    footprint.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? footprint.slice(0, -1)
      : footprint
  if (ring.length < 3) return []
  const ground = ring.map((point) => toMercator(point, 0))
  if (heightM <= 0) return [ground]
  const roof = ring.map((point) => toMercator(point, heightM))
  const walls = ground.flatMap((bottom, index) => {
    const next = (index + 1) % ring.length
    const nextBottom = ground[next]
    const nextTop = roof[next]
    const top = roof[index]
    return nextBottom && nextTop && top
      ? [[bottom, nextBottom, nextTop, top]]
      : []
  })
  return [ground, roof, ...walls]
}

/**
 * Projects a world point to CSS pixels with a column-major model-view-projection
 * matrix, as MapLibre passes to custom layers. Returns null behind the camera.
 */
export function projectPoint(
  matrix: ArrayLike<number>,
  [x, y, z]: WorldPoint,
  width: number,
  height: number,
): ScreenPoint | null {
  const m = (index: number) => matrix[index] ?? 0
  const clipX = m(0) * x + m(4) * y + m(8) * z + m(12)
  const clipY = m(1) * x + m(5) * y + m(9) * z + m(13)
  const clipW = m(3) * x + m(7) * y + m(11) * z + m(15)
  if (clipW <= 1e-9) return null
  return [((clipX / clipW + 1) / 2) * width, ((1 - clipY / clipW) / 2) * height]
}

/** Vertex mean of a footprint ring, ignoring a repeated closing vertex. */
export function footprintCentroid(footprint: LngLat[]): LngLat | null {
  const first = footprint[0]
  const last = footprint.at(-1)
  const ring =
    footprint.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? footprint.slice(0, -1)
      : footprint
  if (ring.length === 0) return null
  let lng = 0
  let lat = 0
  for (const [x, y] of ring) {
    lng += x
    lat += y
  }
  return [lng / ring.length, lat / ring.length]
}

/**
 * Raises faces by a terrain elevation in meters, as MapLibre lifts an extrusion
 * by the elevation at its centroid (decision 0015).
 */
export function liftFaces(
  faces: WorldPoint[][],
  elevationM: number,
  latitude: number,
): WorldPoint[][] {
  if (elevationM === 0) return faces
  const dz =
    elevationM / (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180))
  return faces.map((face) => face.map(([x, y, z]) => [x, y, z + dz]))
}

/** Projects faces to the screen, dropping any face with a point behind the camera. */
export function projectFaces(
  faces: WorldPoint[][],
  matrix: ArrayLike<number>,
  width: number,
  height: number,
): ScreenPoint[][] {
  return faces.flatMap((face) => {
    const points: ScreenPoint[] = []
    for (const point of face) {
      const projected = projectPoint(matrix, point, width, height)
      if (!projected) return []
      points.push(projected)
    }
    return [points]
  })
}
