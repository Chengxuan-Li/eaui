import type { Workbench } from './workbench.ts'

// Advances queued stage tasks through progress to completion using the shared
// command layer with source "system". Time comes from an injectable scheduler
// so tests can step deterministically.

export type Scheduler = {
  schedule: (callback: () => void, delayMs: number) => () => void
}

export const browserScheduler: Scheduler = {
  schedule(callback, delayMs) {
    const handle = window.setTimeout(callback, delayMs)
    return () => window.clearTimeout(handle)
  },
}

export type TaskSimulatorOptions = {
  scheduler: Scheduler
  /** Delay between progress steps. */
  stepMs?: number
  /** Number of steps before completion. */
  steps?: number
}

export function startTaskSimulator(
  workbench: Workbench,
  { scheduler, stepMs = 400, steps = 4 }: TaskSimulatorOptions,
): () => void {
  const active = new Map<string, () => void>()

  function advance(taskId: string, step: number) {
    active.delete(taskId)
    const task = workbench.getState().tasks[taskId]
    if (!task || (task.status !== 'queued' && task.status !== 'running')) {
      return
    }
    if (task.status === 'queued') {
      workbench.execute({ type: 'task.start', input: { taskId } }, 'system')
    }
    if (step < steps) {
      workbench.execute(
        {
          type: 'task.reportProgress',
          input: { taskId, progress: step / steps },
        },
        'system',
      )
      active.set(
        taskId,
        scheduler.schedule(() => advance(taskId, step + 1), stepMs),
      )
      return
    }
    workbench.execute({ type: 'task.complete', input: { taskId } }, 'system')
  }

  function sync() {
    const { tasks, taskIds } = workbench.getState()
    for (const taskId of taskIds) {
      const task = tasks[taskId]
      if (!task) continue
      const scheduled = active.get(taskId)
      if (task.status === 'queued' && !scheduled) {
        active.set(
          taskId,
          scheduler.schedule(() => advance(taskId, 1), stepMs),
        )
      } else if (task.status === 'cancelled' && scheduled) {
        scheduled()
        active.delete(taskId)
      }
    }
  }

  const unsubscribe = workbench.store.subscribe(sync)
  sync()
  return () => {
    unsubscribe()
    for (const cancel of active.values()) cancel()
    active.clear()
  }
}
