import { describe, expect, it } from 'vitest'
import { manualScheduler } from '../testing/manualScheduler.ts'
import { startTaskSimulator } from './simulator.ts'
import { planStages, type Requirement } from './stagePlan.ts'
import { createWorkbench } from './workbench.ts'
import { STAGE_IDS } from './workflow.ts'

function setup() {
  const workbench = createWorkbench()
  const manual = manualScheduler()
  startTaskSimulator(workbench, { scheduler: manual.scheduler })
  const plan = (targets: string[], requirement?: Requirement) => {
    const state = workbench.getState()
    return planStages(state.workflow, state.tasks, targets, requirement)
  }
  const run = (stageId: string) => {
    const result = workbench.execute({
      type: 'workflow.runStage',
      input: { stageId },
    })
    expect(result.outcome.status).toBe('applied')
    manual.runAll(100)
  }
  return { workbench, plan, run }
}

describe('planStages', () => {
  it('lists missing upstream stages in workflow order', () => {
    const { plan } = setup()
    expect(plan([STAGE_IDS.enrichment])).toEqual({
      steps: [
        { stageId: STAGE_IDS.location, action: 'run' },
        { stageId: STAGE_IDS.enrichment, action: 'run' },
      ],
      blocker: null,
    })
  })

  it('accepts outdated data but reruns it when current results are required', () => {
    const { plan, run } = setup()
    run(STAGE_IDS.location)
    run(STAGE_IDS.enrichment)
    run(STAGE_IDS.location)
    expect(plan([STAGE_IDS.enrichment]).steps).toEqual([])
    expect(plan([STAGE_IDS.enrichment], 'current').steps).toEqual([
      { stageId: STAGE_IDS.enrichment, action: 'run' },
    ])
  })

  it('restores a skipped target and treats skipped upstream stages as satisfied', () => {
    const { workbench, plan, run } = setup()
    run(STAGE_IDS.location)
    run(STAGE_IDS.enrichment)
    run(STAGE_IDS.schema)
    run(STAGE_IDS.preprocessing)
    workbench.execute({
      type: 'workflow.setStageSkipped',
      input: { stageId: STAGE_IDS.shading, skipped: true },
    })
    expect(plan([STAGE_IDS.shading]).steps).toEqual([
      { stageId: STAGE_IDS.shading, action: 'restore' },
      { stageId: STAGE_IDS.shading, action: 'run' },
    ])
    expect(plan([STAGE_IDS.archetypes]).steps).toEqual([
      { stageId: STAGE_IDS.archetypes, action: 'run' },
    ])
  })

  it('explains a running stage instead of planning around it', () => {
    const { workbench, plan } = setup()
    workbench.execute({
      type: 'workflow.runStage',
      input: { stageId: STAGE_IDS.location },
    })
    expect(plan([STAGE_IDS.enrichment])).toEqual({
      steps: [],
      blocker:
        '"Location setup / footprint capturing" is already running. Wait for it to finish, then ask again.',
    })
  })
})
