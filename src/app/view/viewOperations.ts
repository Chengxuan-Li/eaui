import { z } from 'zod'
import type { ValidationIssue } from '../../domain/commands.ts'
import type { WorkbenchState } from '../../domain/types.ts'
import { computeMetric, METRICS, type MetricId } from '../pages/mapMetrics.ts'
import {
  chartSpecInputSchema,
  validateChartSpec,
  type ChartSpec,
} from './chartSpec.ts'

// View operations change what the workbench shows, not the project model. Like
// commands they validate their input and return a result, and every one is
// recorded in the shared operation log with its source, so manual controls and
// the agent use one path (first-slice stage 4, prerequisite 1). View state is
// neither saved with the project nor undoable.

export type ContextMode = 'reasoning' | 'inspection'

export type TableView = 'buildings' | 'grid'

export type ViewState = {
  context: { mode: ContextMode }
  map: {
    metric: MetricId
    gridOverlay: boolean
    /** Increments when a map.focusSelection operation asks the map to zoom. */
    focusRequest: number
    /** Whether buildings are extruded to their heights (decision 0013). */
    view3d: boolean
  }
  table: { view: TableView; quickFilter: string }
  dashboard: { hiddenScenarioIds: string[]; charts: ChartSpec[] }
  nextChartNumber: number
}

export function createInitialViewState(): ViewState {
  return {
    context: { mode: 'reasoning' },
    map: {
      metric: 'floors',
      gridOverlay: true,
      focusRequest: 0,
      view3d: false,
    },
    table: { view: 'buildings', quickFilter: '' },
    dashboard: { hiddenScenarioIds: [], charts: [] },
    nextChartNumber: 1,
  }
}

export type ViewOutcome =
  | { status: 'applied'; summary: string }
  | { status: 'rejected'; issues: ValidationIssue[] }

type ViewOperationDefinition<Schema extends z.ZodType> = {
  title: string
  /** Written for agent tool descriptions. */
  description: string
  input: Schema
  run: (
    view: ViewState,
    input: z.output<Schema>,
    project: WorkbenchState,
  ) => ViewOutcome
}

function defineViewOperation<Schema extends z.ZodType>(
  definition: ViewOperationDefinition<Schema>,
): ViewOperationDefinition<Schema> {
  return definition
}

function applied(summary: string): ViewOutcome {
  return { status: 'applied', summary }
}

function rejected(message: string, path = ''): ViewOutcome {
  return { status: 'rejected', issues: [{ path, message }] }
}

export const viewOperationDefinitions = {
  'context.setMode': defineViewOperation({
    title: 'Set context mode',
    description:
      'Show Reasoning or Inspection in the right-side context panel. Inspection follows the shared selection.',
    input: z.object({ mode: z.enum(['reasoning', 'inspection']) }),
    run(view, { mode }) {
      view.context.mode = mode
      return applied(
        mode === 'inspection'
          ? 'The context panel shows Inspection.'
          : 'The context panel shows Reasoning.',
      )
    },
  }),

  'map.setMetric': defineViewOperation({
    title: 'Color map by metric',
    description:
      'Color building footprints on the Map by one metric. A metric without data is rejected with the stage that produces it.',
    input: z.object({
      metric: z.enum([
        'floors',
        'pvYield',
        'baselineDemand',
        'scenarioReduction',
      ]),
    }),
    run(view, { metric }, project) {
      const definition = METRICS.find((candidate) => candidate.id === metric)
      const label = definition?.label ?? metric
      if (!computeMetric(project, metric).available) {
        return rejected(
          `${label} has no data yet. ${definition?.requirement ?? ''}`.trim(),
          'metric',
        )
      }
      view.map.metric = metric
      return applied(`Map buildings are colored by ${label}.`)
    },
  }),

  'map.setGridOverlay': defineViewOperation({
    title: 'Show or hide grid overlay',
    description:
      'Show or hide feeders, transformers, and utility PV on the Map.',
    input: z.object({ visible: z.boolean() }),
    run(view, { visible }, project) {
      if (visible && Object.keys(project.gridElements).length === 0) {
        return rejected(
          'The grid overlay needs grid elements. Run "Grid definitions".',
          'visible',
        )
      }
      view.map.gridOverlay = visible
      return applied(
        visible
          ? 'The map shows the grid overlay.'
          : 'The map hides the grid overlay.',
      )
    },
  }),

  'map.focusSelection': defineViewOperation({
    title: 'Zoom map to selection',
    description:
      'Zoom the Map to the buildings or grid elements in the shared selection.',
    input: z.object({}),
    run(view, _input, project) {
      const { entityType, ids } = project.selection
      if (!entityType || ids.length === 0) {
        return rejected('Nothing is selected to zoom to.')
      }
      view.map.focusRequest += 1
      return applied(
        `Zoomed the map to ${ids.length} selected ${entityType === 'building' ? 'building(s)' : 'grid element(s)'}.`,
      )
    },
  }),

  'map.set3d': defineViewOperation({
    title: 'Show buildings in 3D',
    description:
      'Show buildings on the Map as 3D blocks extruded to their synthetic heights, or return to the flat 2D map. Buildings stay flat until "Geospatial preprocessing" has computed heights.',
    input: z.object({ enabled: z.boolean() }),
    run(view, { enabled }, project) {
      view.map.view3d = enabled
      if (!enabled) return applied('The map shows buildings in 2D.')
      const hasHeights = project.buildingIds.some(
        (id) => (project.buildings[id]?.heightM ?? null) !== null,
      )
      return applied(
        hasHeights
          ? 'The map shows buildings in 3D.'
          : 'The map is in 3D, but buildings stay flat until "Geospatial preprocessing" computes heights.',
      )
    },
  }),

  'table.setView': defineViewOperation({
    title: 'Switch table view',
    description: 'Show buildings or grid elements on the Table page.',
    input: z.object({ view: z.enum(['buildings', 'grid']) }),
    run(view, input) {
      view.table.view = input.view
      return applied(
        input.view === 'grid'
          ? 'The table shows grid elements.'
          : 'The table shows buildings.',
      )
    },
  }),

  'table.setQuickFilter': defineViewOperation({
    title: 'Filter table',
    description:
      'Filter the buildings table by text across its columns. An empty text clears the filter.',
    input: z.object({
      text: z.string().max(100, 'Use at most 100 characters.'),
    }),
    run(view, { text }) {
      view.table.quickFilter = text
      return applied(
        text
          ? `Filtered the buildings table by "${text}".`
          : 'Cleared the table filter.',
      )
    },
  }),

  'dashboard.setScenarioCompared': defineViewOperation({
    title: 'Compare scenario on dashboard',
    description:
      'Include or exclude a scenario from the Dashboard comparison charts and tiles.',
    input: z.object({
      scenarioId: z.string().min(1, 'Choose a scenario.'),
      compared: z.boolean(),
    }),
    run(view, { scenarioId, compared }, project) {
      const scenario = project.scenarios[scenarioId]
      if (!scenario) {
        return rejected(`Unknown scenario "${scenarioId}".`, 'scenarioId')
      }
      const hidden = new Set(view.dashboard.hiddenScenarioIds)
      if (compared) hidden.delete(scenarioId)
      else hidden.add(scenarioId)
      view.dashboard.hiddenScenarioIds = [...hidden]
      return applied(
        compared
          ? `The Dashboard compares "${scenario.name}".`
          : `The Dashboard no longer compares "${scenario.name}".`,
      )
    },
  }),

  'dashboard.addChart': defineViewOperation({
    title: 'Add dashboard chart',
    description:
      'Add a chart to the Dashboard from a validated specification: a line chart of monthly demand, or a bar chart of annual or peak demand, for "baseline" and up to two modeled scenario ids.',
    input: chartSpecInputSchema,
    run(view, spec, project) {
      const issues = validateChartSpec(spec, project)
      if (issues.length > 0) return { status: 'rejected', issues }
      const id = `chart-${view.nextChartNumber}`
      view.nextChartNumber += 1
      view.dashboard.charts.push({ id, ...spec })
      return applied(`Added the chart "${spec.title}" to the Dashboard.`)
    },
  }),

  'dashboard.removeChart': defineViewOperation({
    title: 'Remove dashboard chart',
    description: 'Remove a chart that was added from a specification.',
    input: z.object({ chartId: z.string().min(1, 'Choose a chart.') }),
    run(view, { chartId }) {
      const chart = view.dashboard.charts.find((item) => item.id === chartId)
      if (!chart) return rejected(`Unknown chart "${chartId}".`, 'chartId')
      view.dashboard.charts = view.dashboard.charts.filter(
        (item) => item.id !== chartId,
      )
      return applied(`Removed the chart "${chart.title}".`)
    },
  }),
}

export type ViewOperationType = keyof typeof viewOperationDefinitions

export type ViewOperationInput<Type extends ViewOperationType> = z.input<
  (typeof viewOperationDefinitions)[Type]['input']
>

export type ViewOperation = {
  [Type in ViewOperationType]: { type: Type; input: ViewOperationInput<Type> }
}[ViewOperationType]

export type ViewOperationDescription = {
  type: ViewOperationType
  title: string
  description: string
  inputSchema: unknown
}

/** View operation catalog with JSON Schema inputs, for agent tool definitions. */
export function describeViewOperations(): ViewOperationDescription[] {
  return (Object.keys(viewOperationDefinitions) as ViewOperationType[]).map(
    (type) => {
      const definition = viewOperationDefinitions[type]
      return {
        type,
        title: definition.title,
        description: definition.description,
        inputSchema: z.toJSONSchema(definition.input, { io: 'input' }),
      }
    },
  )
}
