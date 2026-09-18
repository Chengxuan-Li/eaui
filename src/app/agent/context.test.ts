import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/initialState.ts'
import type { Building, ResultSet, WorkbenchState } from '../../domain/types.ts'
import { createWorkbench } from '../../domain/workbench.ts'
import { createAppearanceController } from '../appearance/appearanceController.ts'
import { createLayoutController } from '../layout/layoutController.ts'
import { createViewStore } from '../view/viewStore.ts'
import {
  buildContextDigest,
  readBuildings,
  MAX_BUILDING_ROWS,
  MAX_LISTED_SELECTION,
} from './context.ts'
import { executeToolCall, readCall, type ToolDeps } from './tools.ts'

function building(id: string, floors: number | null, pv: number | null) {
  const value: Building = {
    id,
    name: `Building ${id}`,
    footprint: [
      [0, 0],
      [0, 0.001],
      [0.001, 0.001],
    ],
    footprintAreaM2: 100,
    sourceRef: null,
    use: 'office',
    yearBuilt: 1990,
    floors,
    heightM: floors === null ? null : floors * 3.2,
    floorAreaM2: floors === null ? null : floors * 100,
    zoneCount: 2,
    shadingFactor: null,
    pvYieldKwh: pv,
    archetypeId: null,
  }
  return value
}

function baseline(byBuildingKwh: Record<string, number>): ResultSet {
  const total = Object.values(byBuildingKwh).reduce((sum, v) => sum + v, 0)
  return {
    id: 'baseline',
    label: 'Baseline',
    runId: 'run-1',
    totalKwh: total,
    peakKw: 10,
    monthlyKwh: Array.from({ length: 12 }, () => total / 12),
    byBuildingKwh,
  }
}

const populated: Partial<WorkbenchState> = {
  buildings: {
    B1: building('B1', 3, 1000),
    B2: building('B2', 9, 4000),
    B3: building('B3', null, null),
  },
  buildingIds: ['B1', 'B2', 'B3'],
  results: { baseline: baseline({ B1: 300, B2: 900 }), scenarios: {} },
}

function setup(patch: Partial<WorkbenchState> = {}) {
  const workbench = createWorkbench({
    initialState: { ...createInitialState(), ...patch },
  })
  const layout = createLayoutController(workbench, null)
  const view = createViewStore(workbench)
  const appearance = createAppearanceController(workbench, null)
  const deps: ToolDeps = { workbench, view, layout, appearance }
  const digest = () =>
    buildContextDigest({
      project: workbench.getState(),
      view: view.getState(),
      layout: layout.describeLayout(),
      appearance: appearance.getPreference(),
    })
  return { workbench, layout, view, appearance, deps, digest }
}

describe('context digest', () => {
  it('summarises the project without per-building bulk data', () => {
    const { digest } = setup(populated)
    const serialised = JSON.stringify(digest())

    expect(digest().project.counts.buildings).toBe(3)
    expect(digest().project.results.baseline).toBe(true)
    // Bulk data must not reach the model: only counts and ranges describe it.
    expect(serialised).not.toContain('byBuildingKwh')
    expect(serialised).not.toContain('"B1"')
  })

  it('stays the same size however many buildings the project holds', () => {
    const size = (count: number) => {
      const ids = Array.from({ length: count }, (_, i) => `B${i}`)
      const { digest } = setup({
        buildings: Object.fromEntries(
          ids.map((id) => [id, building(id, 4, 1000)]),
        ),
        buildingIds: ids,
      })
      return JSON.stringify(digest()).length
    }

    // A digest of 2000 buildings costs the same context as one of 3, give or
    // take the digits of the count itself.
    expect(size(2000) - size(3)).toBeLessThan(16)
    expect(size(2000)).toBeLessThan(8000)
  })

  it('reports every stage with its derived state', () => {
    const { digest } = setup()
    const stages = digest().project.stages
    expect(stages).toHaveLength(12)
    // A fresh project can start its first stage and nothing later.
    expect(stages[0]?.state).toBe('ready')
    expect(stages.slice(1).every((stage) => stage.state === 'future')).toBe(
      true,
    )
    expect(stages.every((stage) => stage.name.length > 0)).toBe(true)
  })

  it('says which map metrics have data and what to run for the rest', () => {
    const { digest } = setup(populated)
    const metrics = new Map(
      digest().project.metrics.map((metric) => [metric.id, metric] as const),
    )

    expect(metrics.get('floors')).toMatchObject({
      available: true,
      min: 3,
      max: 9,
    })
    expect(metrics.get('baselineDemand')?.available).toBe(true)
    expect(metrics.get('scenarioReduction')?.available).toBe(false)
    expect(metrics.get('scenarioReduction')?.requirement).toContain('Scenario')
  })

  it('describes the layout, appearance, and view state the agent can change', () => {
    const { digest, layout, appearance, view } = setup(populated)
    layout.openPage('table')
    view.execute({ type: 'table.setView', input: { view: 'grid' } })
    appearance.set('darkEngineering')

    const current = digest()
    expect(current.layout.openPages).toContain('table')
    expect(current.layout.panels).toHaveProperty('reasoning')
    expect(current.view.table.view).toBe('grid')
    expect(current.appearance.preference).toBe('darkEngineering')
    expect(current.appearance.available.map((item) => item.id)).toContain(
      'lieflat',
    )
  })

  it('caps the selection it lists and says when it truncated', () => {
    const ids = Array.from(
      { length: MAX_LISTED_SELECTION + 5 },
      (_, i) => `B${i}`,
    )
    const { digest } = setup({
      buildings: Object.fromEntries(
        ids.map((id) => [id, building(id, 2, null)]),
      ),
      buildingIds: ids,
      selection: { entityType: 'building', ids },
    })

    const selection = digest().selection
    expect(selection.count).toBe(ids.length)
    expect(selection.ids).toHaveLength(MAX_LISTED_SELECTION)
    expect(selection.truncated).toBe(true)
  })
})

describe('read tools', () => {
  it('sorts buildings and puts missing values last either way', () => {
    const { workbench } = setup(populated)
    const state = workbench.getState()

    const tallest = readBuildings(state, { sortBy: 'floors', limit: 2 })
    expect(tallest.rows.map((row) => row.id)).toEqual(['B2', 'B1'])
    expect(tallest.matched).toBe(3)
    expect(tallest.total).toBe(3)

    const shortest = readBuildings(state, { sortBy: 'floors', order: 'asc' })
    expect(shortest.rows.map((row) => row.id)).toEqual(['B1', 'B2', 'B3'])
  })

  it('filters by use and carries baseline demand when it exists', () => {
    const { workbench } = setup(populated)
    const rows = readBuildings(workbench.getState(), { use: 'office' }).rows
    expect(rows).toHaveLength(3)
    expect(rows.find((row) => row.id === 'B2')?.baselineDemandKwh).toBe(900)
    expect(rows.find((row) => row.id === 'B3')?.baselineDemandKwh).toBeNull()

    expect(readBuildings(workbench.getState(), { use: 'school' }).matched).toBe(
      0,
    )
  })

  it('never returns more than the row cap', () => {
    const ids = Array.from(
      { length: MAX_BUILDING_ROWS + 20 },
      (_, i) => `B${i}`,
    )
    const { workbench } = setup({
      buildings: Object.fromEntries(
        ids.map((id) => [id, building(id, 2, null)]),
      ),
      buildingIds: ids,
    })
    const result = readBuildings(workbench.getState(), { limit: 999 })
    expect(result.rows).toHaveLength(MAX_BUILDING_ROWS)
    expect(result.matched).toBe(ids.length)
  })

  it('answers through the tool path and records no operation', () => {
    const { deps, workbench } = setup(populated)
    const before = workbench.store.getState().log.length

    const context = executeToolCall(
      deps,
      readCall({ type: 'read.context', input: {} }),
    )
    expect(context.status).toBe('applied')
    expect(context.data).toMatchObject({
      project: { counts: { buildings: 3 } },
    })

    const buildings = executeToolCall(
      deps,
      readCall({
        type: 'read.buildings',
        input: { sortBy: 'floors', limit: 1 },
      }),
    )
    expect(buildings.data).toMatchObject({ rows: [{ id: 'B2' }] })

    // A look is not an operation, so the log must be untouched.
    expect(workbench.store.getState().log).toHaveLength(before)
    expect(context.operationIds).toEqual([])
  })
})
