import { describe, expect, test } from 'vitest'
import { startTaskSimulator, type Scheduler } from './simulator.ts'
import { createWorkbench } from './workbench.ts'
import { STAGE_IDS, deriveStageStates } from './workflow.ts'

function createManualScheduler() {
  const queue: { callback: () => void; cancelled: boolean }[] = []
  const scheduler: Scheduler = {
    schedule(callback) {
      const job = { callback, cancelled: false }
      queue.push(job)
      return () => {
        job.cancelled = true
      }
    },
  }
  const runNext = () => {
    const job = queue.shift()
    if (job && !job.cancelled) job.callback()
  }
  const runAll = (limit = 100) => {
    for (let count = 0; queue.length > 0 && count < limit; count++) runNext()
  }
  const pending = () => queue.filter((job) => !job.cancelled).length
  return { scheduler, runNext, runAll, pending }
}

describe('startTaskSimulator', () => {
  test('advances a queued stage task through progress to completion', () => {
    const workbench = createWorkbench()
    const manual = createManualScheduler()
    const stop = startTaskSimulator(workbench, {
      scheduler: manual.scheduler,
      steps: 4,
    })

    workbench.execute({
      type: 'workflow.runStage',
      input: { stageId: STAGE_IDS.location },
    })
    expect(manual.pending()).toBe(1)
    manual.runAll()

    const state = workbench.getState()
    const task = Object.values(state.tasks)[0]
    expect(task).toMatchObject({ status: 'succeeded', progress: 1 })
    expect(
      deriveStageStates(state.workflow, state.tasks)[STAGE_IDS.location],
    ).toBe('executed')
    const systemTypes = workbench.store
      .getState()
      .log.filter((entry) => entry.source === 'system')
      .map((entry) => entry.type)
    expect(systemTypes).toEqual([
      'task.start',
      'task.reportProgress',
      'task.reportProgress',
      'task.reportProgress',
      'task.complete',
    ])
    stop()
  })

  test('stops advancing a task once it is cancelled', () => {
    const workbench = createWorkbench()
    const manual = createManualScheduler()
    const stop = startTaskSimulator(workbench, {
      scheduler: manual.scheduler,
      steps: 4,
    })

    workbench.execute({
      type: 'workflow.runStage',
      input: { stageId: STAGE_IDS.location },
    })
    manual.runNext()
    const taskId = workbench.getState().taskIds[0] ?? ''
    expect(workbench.getState().tasks[taskId]?.status).toBe('running')

    workbench.execute({ type: 'task.cancel', input: { taskId } })
    manual.runAll()

    expect(workbench.getState().tasks[taskId]?.status).toBe('cancelled')
    expect(
      workbench.store
        .getState()
        .log.some((entry) => entry.type === 'task.complete'),
    ).toBe(false)
    stop()
  })
})
