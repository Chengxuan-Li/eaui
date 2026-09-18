import type {
  BuildingUse,
  StageState,
  WorkbenchState,
} from '../../domain/types.ts'
import { deriveStageStates } from '../../domain/workflow.ts'
import {
  APPEARANCE_LIST,
  type AppearancePreference,
  type ColorScheme,
} from '../appearance/appearances.ts'
import type { LayoutSummary } from '../layout/layoutController.ts'
import { computeMetric, METRICS, type MetricId } from '../pages/mapMetrics.ts'
import type { ViewState } from '../view/viewOperations.ts'

// What the agent is allowed to see of the workbench (decision 0020). A model
// never receives WorkbenchState: several hundred buildings with footprints and
// per-building results would swamp the context window and cost a fortune per
// turn. This projection is bounded, cheap, and pure, so it is unit tested.

/** Selection ids beyond this are summarised by count rather than listed. */
export const MAX_LISTED_SELECTION = 20

/** The most buildings a single read tool call returns. */
export const MAX_BUILDING_ROWS = 50

export type MetricDigest = {
  id: MetricId
  label: string
  unit: string
  available: boolean
  /** Present only when the metric has data. */
  min: number | null
  max: number | null
  /** What to run when it has none. */
  requirement: string | null
}

export type ContextDigest = {
  project: {
    name: string
    location: string | null
    counts: {
      buildings: number
      measures: number
      scenarios: number
      gridElements: number
      issues: number
    }
    stages: { id: string; name: string; state: StageState }[]
    results: {
      baseline: boolean
      scenarios: { id: string; name: string }[]
    }
    metrics: MetricDigest[]
  }
  view: {
    map: {
      metric: MetricId
      gridOverlay: boolean
      view3d: boolean
      terrain: boolean
      terrainExaggeration: number
    }
    table: { view: string; quickFilter: string }
    dashboard: {
      hiddenScenarioIds: string[]
      charts: { id: string; title: string; kind: string; measure: string }[]
    }
  }
  layout: LayoutSummary
  appearance: {
    preference: AppearancePreference
    available: { id: string; label: string; scheme: ColorScheme }[]
  }
  selection: {
    entityType: string | null
    count: number
    ids: string[]
    truncated: boolean
  }
}

export type DigestInput = {
  project: WorkbenchState
  view: ViewState
  layout: LayoutSummary
  appearance: AppearancePreference
}

export function buildContextDigest(input: DigestInput): ContextDigest {
  const { project, view, layout, appearance } = input
  const stageStates = deriveStageStates(project.workflow, project.tasks)

  const metrics: MetricDigest[] = METRICS.map((metric) => {
    const values = computeMetric(project, metric.id)
    return {
      id: metric.id,
      label: metric.label,
      unit: metric.unit,
      available: values.available,
      min: values.available ? values.min : null,
      max: values.available ? values.max : null,
      requirement: values.available ? null : metric.requirement,
    }
  })

  const selectionIds = project.selection.ids
  return {
    project: {
      name: project.project.name,
      location: project.project.location?.name ?? null,
      counts: {
        buildings: project.buildingIds.length,
        measures: Object.keys(project.measures).length,
        scenarios: Object.keys(project.scenarios).length,
        gridElements: Object.keys(project.gridElements).length,
        issues: project.issues.length,
      },
      stages: project.workflow.stageIds.map((id) => ({
        id,
        name: project.workflow.stages[id]?.name ?? id,
        state: stageStates[id] ?? 'future',
      })),
      results: {
        baseline: project.results.baseline !== null,
        scenarios: Object.keys(project.results.scenarios).map((id) => ({
          id,
          name: project.scenarios[id]?.name ?? id,
        })),
      },
      metrics,
    },
    view: {
      map: {
        metric: view.map.metric,
        gridOverlay: view.map.gridOverlay,
        view3d: view.map.view3d,
        terrain: view.map.terrain,
        terrainExaggeration: view.map.terrainExaggeration,
      },
      table: { view: view.table.view, quickFilter: view.table.quickFilter },
      dashboard: {
        hiddenScenarioIds: view.dashboard.hiddenScenarioIds,
        charts: view.dashboard.charts.map((chart) => ({
          id: chart.id,
          title: chart.title,
          kind: chart.kind,
          measure: chart.measure,
        })),
      },
    },
    layout,
    appearance: {
      preference: appearance,
      available: APPEARANCE_LIST.map((item) => ({
        id: item.id,
        label: item.label,
        scheme: item.scheme,
      })),
    },
    selection: {
      entityType: project.selection.entityType,
      count: selectionIds.length,
      ids: selectionIds.slice(0, MAX_LISTED_SELECTION),
      truncated: selectionIds.length > MAX_LISTED_SELECTION,
    },
  }
}

export type BuildingSortField =
  | 'floors'
  | 'heightM'
  | 'floorAreaM2'
  | 'pvYieldKwh'
  | 'baselineDemandKwh'
  | 'name'

export type BuildingQuery = {
  limit?: number
  sortBy?: BuildingSortField
  order?: 'asc' | 'desc'
  use?: BuildingUse
}

export type BuildingRow = {
  id: string
  name: string
  use: BuildingUse | null
  floors: number | null
  heightM: number | null
  floorAreaM2: number | null
  pvYieldKwh: number | null
  baselineDemandKwh: number | null
}

export type BuildingReadResult = {
  rows: BuildingRow[]
  /** Buildings matching the filter before the limit was applied. */
  matched: number
  total: number
}

/**
 * A bounded look at buildings, so the agent can point at specific ones without
 * receiving footprints or the whole table.
 */
export function readBuildings(
  state: WorkbenchState,
  query: BuildingQuery = {},
): BuildingReadResult {
  const { sortBy = 'name', order = sortBy === 'name' ? 'asc' : 'desc' } = query
  const limit = Math.max(1, Math.min(query.limit ?? 10, MAX_BUILDING_ROWS))
  const baseline = state.results.baseline

  const rows: BuildingRow[] = state.buildingIds.flatMap((id) => {
    const building = state.buildings[id]
    if (!building) return []
    if (query.use && building.use !== query.use) return []
    const demand = baseline?.byBuildingKwh[id]
    return [
      {
        id: building.id,
        name: building.name,
        use: building.use,
        floors: building.floors,
        heightM: building.heightM,
        floorAreaM2: building.floorAreaM2,
        pvYieldKwh: building.pvYieldKwh,
        baselineDemandKwh: demand === undefined ? null : demand,
      },
    ]
  })

  const direction = order === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name) * direction
    const left = a[sortBy]
    const right = b[sortBy]
    // Buildings without a value sort last whichever way the order runs.
    if (left === null && right === null) return a.id.localeCompare(b.id)
    if (left === null) return 1
    if (right === null) return -1
    return (left - right) * direction || a.id.localeCompare(b.id)
  })

  return {
    rows: rows.slice(0, limit),
    matched: rows.length,
    total: state.buildingIds.length,
  }
}
