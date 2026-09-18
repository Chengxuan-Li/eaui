import type { WorkbenchState } from '../domain/types.ts'
import { chartSpecInputSchema, validateChartSpec } from './view/chartSpec.ts'
import {
  createInitialViewState,
  type ViewState,
} from './view/viewOperations.ts'

// View state survives a reload (decision 0020). It is not project state, so it
// lives under its own key beside the layout and the appearance rather than in
// the project save. What comes back is untrusted: another tab, an older build,
// or a different dataset may have written it, so every field is checked and
// anything that no longer fits falls back to the default.

const VIEW_KEY = 'eaui.view.v1'
const VERSION = 1

type Saved = { version: number; view: unknown }

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function pickOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Rebuilds view state from whatever was stored, field by field. Charts are
 * re-validated against the project, so a chart of a scenario this project does
 * not have is dropped rather than rendered against nothing.
 */
export function restoreViewState(
  raw: unknown,
  project: WorkbenchState,
): ViewState {
  const initial = createInitialViewState()
  const view = asRecord(raw)
  const map = asRecord(view.map)
  const table = asRecord(view.table)
  const dashboard = asRecord(view.dashboard)
  const lighting = asRecord(map.lighting)
  const initialLighting = initial.map.lighting as unknown as Record<
    string,
    unknown
  >

  const charts = Array.isArray(dashboard.charts) ? dashboard.charts : []
  const restoredCharts = charts.flatMap((candidate, index) => {
    const parsed = chartSpecInputSchema.safeParse(candidate)
    if (!parsed.success) return []
    if (validateChartSpec(parsed.data, project).length > 0) return []
    const id = asRecord(candidate).id
    return [
      {
        ...parsed.data,
        id: typeof id === 'string' ? id : `chart-${index + 1}`,
      },
    ]
  })

  const scenarioIds = new Set(Object.keys(project.scenarios))
  const hidden = Array.isArray(dashboard.hiddenScenarioIds)
    ? dashboard.hiddenScenarioIds.filter(
        (id): id is string => typeof id === 'string' && scenarioIds.has(id),
      )
    : []

  return {
    map: {
      metric: pickOneOf(
        map.metric,
        ['floors', 'pvYield', 'baselineDemand', 'scenarioReduction'] as const,
        initial.map.metric,
      ),
      gridOverlay: pickBoolean(map.gridOverlay, initial.map.gridOverlay),
      // A zoom request is a one-off signal, never restored.
      focusRequest: 0,
      view3d: pickBoolean(map.view3d, initial.map.view3d),
      terrain: pickBoolean(map.terrain, initial.map.terrain),
      terrainExaggeration: pickNumber(
        map.terrainExaggeration,
        initial.map.terrainExaggeration,
      ),
      lighting: Object.fromEntries(
        Object.entries(initialLighting).map(([key, fallback]) => [
          key,
          typeof fallback === 'number'
            ? pickNumber(lighting[key], fallback)
            : typeof fallback === 'string'
              ? typeof lighting[key] === 'string'
                ? lighting[key]
                : fallback
              : fallback,
        ]),
      ) as ViewState['map']['lighting'],
    },
    table: {
      view: pickOneOf(
        table.view,
        ['buildings', 'grid'] as const,
        initial.table.view,
      ),
      quickFilter:
        typeof table.quickFilter === 'string'
          ? table.quickFilter.slice(0, 100)
          : initial.table.quickFilter,
    },
    dashboard: { hiddenScenarioIds: hidden, charts: restoredCharts },
    nextChartNumber: Math.max(
      pickNumber(view.nextChartNumber, initial.nextChartNumber),
      restoredCharts.length + 1,
    ),
  }
}

export function loadViewState(
  storage: Storage | null,
  project: WorkbenchState,
): ViewState | null {
  try {
    const text = storage?.getItem(VIEW_KEY)
    if (!text) return null
    const saved = JSON.parse(text) as Saved
    if (saved.version !== VERSION) return null
    return restoreViewState(saved.view, project)
  } catch {
    return null
  }
}

export function saveViewState(storage: Storage | null, view: ViewState): void {
  try {
    const saved: Saved = { version: VERSION, view }
    storage?.setItem(VIEW_KEY, JSON.stringify(saved))
  } catch {
    // Storage is blocked or full; view state applies for this session only.
  }
}
