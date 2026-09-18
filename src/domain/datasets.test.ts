import { afterEach, describe, expect, it } from 'vitest'
import { DATASETS, getDataset, loadDataset } from './datasets.ts'
import { BACK_BAY, setCurrentDistrict } from './districts.ts'
import { deriveStageStates } from './workflow.ts'
import type { WorkbenchState } from './types.ts'

// Materializing sets the module-level district, so every case restores it.
afterEach(() => setCurrentDistrict(BACK_BAY))

function states(state: WorkbenchState) {
  return deriveStageStates(state.workflow, state.tasks)
}

describe('datasets', () => {
  it('gives every dataset a distinct place, state, and set of questions', () => {
    expect(DATASETS.length).toBeGreaterThanOrEqual(4)
    const ids = DATASETS.map((dataset) => dataset.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const dataset of DATASETS) {
      expect(dataset.name).toBeTruthy()
      expect(dataset.description).toBeTruthy()
      expect(dataset.stateLabel).toBeTruthy()
      expect(dataset.questions.length).toBeGreaterThanOrEqual(3)
      for (const question of dataset.questions) {
        expect(question.prompt.length).toBeGreaterThan(20)
      }
    }
  })

  it('falls back to the first dataset for an unknown id', () => {
    expect(getDataset('nope' as never).id).toBe(DATASETS[0]!.id)
  })

  it('opens Back Bay with nothing run', async () => {
    const { state, district } = await loadDataset(getDataset('backBay'))
    expect(state.buildingIds).toHaveLength(0)
    expect(state.results.baseline).toBeNull()
    expect(district.footprints.length).toBeGreaterThan(400)
  })

  it('opens Eixample with a baseline and shading skipped', async () => {
    const { state, district } = await loadDataset(getDataset('eixample'))
    const stage = states(state)

    expect(state.buildingIds.length).toBeGreaterThan(400)
    expect(state.results.baseline).not.toBeNull()
    expect(stage['stage:shading-pv']).toBe('skipped')
    // Shading was skipped, so no building has a PV yield to colour by.
    expect(
      state.buildingIds.every((id) => state.buildings[id]?.pvYieldKwh === null),
    ).toBe(true)
    expect(district.center[0]).toBeGreaterThan(0)
  })

  it('opens Jordaan with a modelled retrofit scenario', async () => {
    const { state } = await loadDataset(getDataset('jordaan'))

    const scenarios = Object.values(state.scenarios)
    expect(scenarios).toHaveLength(1)
    expect(scenarios[0]?.name).toBe('Half retrofitted')
    expect(Object.keys(state.results.scenarios)).toHaveLength(1)
    expect(states(state)['stage:scenario-modeling']).toBe('executed')
    // A scenario result below the baseline is what makes reduction chartable.
    const scenarioResult = Object.values(state.results.scenarios)[0]
    expect(scenarioResult!.totalKwh).toBeLessThan(
      state.results.baseline!.totalKwh,
    )
  })

  it('opens Murray Hill with PV yield and a failed grid run', async () => {
    const { state } = await loadDataset(getDataset('murrayHill'))

    expect(
      state.buildingIds.some((id) => state.buildings[id]?.pvYieldKwh !== null),
    ).toBe(true)
    expect(states(state)['stage:grid-modeling']).toBe('failed')
    expect(state.issues.some((issue) => issue.severity === 'error')).toBe(true)
  })

  it('leaves no task looking like it is still running', async () => {
    for (const dataset of DATASETS) {
      const { state } = await loadDataset(dataset)
      expect(state.taskIds).toEqual([])
      expect(state.workflow.currentStageId).toBeNull()
    }
  })

  it('names each district as its own place', async () => {
    const names = new Set<string>()
    for (const dataset of DATASETS.slice(1)) {
      const { state } = await loadDataset(dataset)
      expect(state.project.location?.name).toBe(dataset.locationName)
      expect(state.project.name).toContain(dataset.name)
      names.add(state.project.location!.name)
    }
    expect(names.size).toBe(DATASETS.length - 1)
  })

  it('names the weather after the district, not a fixed city', async () => {
    const { state } = await loadDataset(getDataset('eixample'))
    const weather = state.assets['asset:weather-typical-year']
    // Calling it a Boston stand-in while the map shows Barcelona would be a lie.
    expect(weather?.name).toContain('Barcelona')
    expect(weather?.name).not.toContain('Boston')
  })
})
