// Synthetic data for the package spikes only. Coordinates sit near 0°N 0°E
// (open ocean) so nothing implies a real site. Values are deterministic
// pseudo-random numbers, not engineering results.

export type BuildingProperties = {
  id: string
  name: string
  archetype: string
  floors: number
  pvYieldKwh: number
}

export type BuildingFeature = {
  type: 'Feature'
  id: string
  properties: BuildingProperties
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

export type BuildingCollection = {
  type: 'FeatureCollection'
  features: BuildingFeature[]
}

const GRID_SPACING_DEGREES = 0.0003
const GRID_COLUMNS = 30
const GRID_ROWS = 30

export const SPIKE_CENTER = {
  longitude: (GRID_COLUMNS / 2) * GRID_SPACING_DEGREES,
  latitude: (GRID_ROWS / 2) * GRID_SPACING_DEGREES,
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ARCHETYPES = [
  'Residential low-rise',
  'Residential mid-rise',
  'Office',
  'Retail',
  'School',
]

function createBuildings(): BuildingCollection {
  const random = mulberry32(42)
  const features: BuildingFeature[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let column = 0; column < GRID_COLUMNS; column++) {
      const index = row * GRID_COLUMNS + column
      const id = `B${String(index + 1).padStart(4, '0')}`
      const width = GRID_SPACING_DEGREES * (0.45 + random() * 0.35)
      const depth = GRID_SPACING_DEGREES * (0.45 + random() * 0.35)
      const x = column * GRID_SPACING_DEGREES
      const y = row * GRID_SPACING_DEGREES
      features.push({
        type: 'Feature',
        id,
        properties: {
          id,
          name: `Synthetic building ${index + 1}`,
          archetype:
            ARCHETYPES[Math.floor(random() * ARCHETYPES.length)] ?? 'Office',
          floors: 1 + Math.floor(random() * 12),
          pvYieldKwh: Math.round(2000 + random() * 10000),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [x, y],
              [x + width, y],
              [x + width, y + depth],
              [x, y + depth],
              [x, y],
            ],
          ],
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

export const buildings = createBuildings()

export const buildingRows: BuildingProperties[] = buildings.features.map(
  (feature) => feature.properties,
)

export const HOURS_PER_YEAR = 8760

function createHourlyLoad(seed: number, scaleKw: number): number[] {
  const random = mulberry32(seed)
  return Array.from({ length: HOURS_PER_YEAR }, (_, hour) => {
    const day = hour / 24
    const seasonal = Math.cos(((day - 15) / 365) * 2 * Math.PI) * 0.35
    const daily = Math.sin((((hour % 24) - 6) / 24) * 2 * Math.PI) * 0.25
    const value = (1 + seasonal + daily + random() * 0.1) * scaleKw
    return Math.round(value * 10) / 10
  })
}

export const baselineLoadKw = createHourlyLoad(7, 400)
export const scenarioLoadKw = createHourlyLoad(8, 330)

export type SpikeStageState = 'executed' | 'current' | 'future'

export type SpikeStage = {
  id: string
  order: number
  name: string
  state: SpikeStageState
}

// Stage names from decision 0005; states are illustrative only.
const STAGE_NAMES = [
  'Location setup / footprint capturing',
  'Geospatial data enriching',
  'Schema matching',
  'Geospatial preprocessing',
  'Shading calculation / PV yield estimation',
  'Archetype modeling',
  'Baseline model setup',
  'Scenario definitions',
  'Scenario modeling',
  'Grid definitions',
  'Grid modeling',
  'Dashboard / visualization',
]

export const stages: SpikeStage[] = STAGE_NAMES.map((name, index) => ({
  id: `stage-${index + 1}`,
  order: index + 1,
  name,
  state: index < 3 ? 'executed' : index === 3 ? 'current' : 'future',
}))
