import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../domain/types.ts'
import {
  footprintCentroid,
  liftFaces,
  prismFaces,
  projectFaces,
  projectPoint,
  toMercator,
} from './silhouette.ts'

const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * 6_371_008.8

// Column-major identity: clip coordinates equal world coordinates.
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
// w equals z, so points on the ground (z = 0) are behind the camera.
const W_FROM_Z = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]

const SQUARE: LngLat[] = [
  [-71.075, 42.352],
  [-71.0749, 42.352],
  [-71.0749, 42.3521],
  [-71.075, 42.3521],
  [-71.075, 42.352],
]

describe('silhouette geometry', () => {
  it('converts to MapLibre Mercator coordinates with altitude', () => {
    expect(toMercator([0, 0])).toEqual([0.5, 0.5, 0])
    const [, , equator] = toMercator([0, 0], 1000)
    expect(equator).toBeCloseTo(1000 / EARTH_CIRCUMFERENCE_M, 12)
    const [, , north] = toMercator([0, 60], 1000)
    expect(north).toBeCloseTo((2 * 1000) / EARTH_CIRCUMFERENCE_M, 12)
    const [, y] = toMercator([0, 45])
    expect(y).toBeLessThan(0.5)
  })

  it('builds ground, roof, and one wall per edge', () => {
    const faces = prismFaces(SQUARE, 12)
    expect(faces).toHaveLength(6)
    const [ground, roof, wall] = faces
    expect(ground).toHaveLength(4)
    expect(roof!.every(([, , z]) => z > 0)).toBe(true)
    expect(wall).toEqual([ground![0], ground![1], roof![1], roof![0]])
  })

  it('keeps only the ground for flat buildings and rejects degenerate rings', () => {
    expect(prismFaces(SQUARE, 0)).toHaveLength(1)
    expect(prismFaces(SQUARE.slice(0, 2), 10)).toEqual([])
  })

  it('projects clip coordinates to CSS pixels', () => {
    expect(projectPoint(IDENTITY, [0.5, 0.5, 0], 100, 200)).toEqual([75, 50])
    expect(projectPoint(IDENTITY, [-1, 1, 0], 100, 200)).toEqual([0, 0])
    expect(projectPoint(W_FROM_Z, [0.5, 0.5, 0], 100, 100)).toBeNull()
  })

  it('finds the vertex centroid of a closed footprint', () => {
    const [lng, lat] = footprintCentroid(SQUARE)!
    expect(lng).toBeCloseTo(-71.07495, 9)
    expect(lat).toBeCloseTo(42.35205, 9)
    expect(footprintCentroid([])).toBeNull()
  })

  it('lifts every face by a terrain elevation in Mercator altitude units', () => {
    const faces = prismFaces(SQUARE, 12)
    expect(liftFaces(faces, 0, 42.352)).toBe(faces)
    const lifted = liftFaces(faces, 30, 42.352)
    const [, , dz] = toMercator([0, 42.352], 30)
    lifted.forEach((face, faceIndex) =>
      face.forEach(([x, y, z], pointIndex) => {
        const [ox, oy, oz] = faces[faceIndex]![pointIndex]!
        expect([x, y]).toEqual([ox, oy])
        expect(z - oz).toBeCloseTo(dz, 15)
      }),
    )
  })

  it('drops faces with any point behind the camera', () => {
    const faces = prismFaces(SQUARE, 12)
    const projected = projectFaces(faces, W_FROM_Z, 100, 100)
    // Only the roof lies entirely in front of the camera.
    expect(projected).toHaveLength(1)
    expect(projectFaces(faces, IDENTITY, 100, 100)).toHaveLength(6)
  })
})
