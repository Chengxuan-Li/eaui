import type { Task, WorkflowState } from './types.ts'
import { deriveStageStates, topologicalOrder, upstreamIds } from './workflow.ts'

// Plans which stages to restore or run so target stages have what a request
// needs (decision 0011). A stage can only run when its upstream stages are
// executed or skipped, so outdated upstream stages are rerun too.

export type StagePlanStep = { stageId: string; action: 'restore' | 'run' }

export type StagePlan = { steps: StagePlanStep[]; blocker: string | null }

/**
 * "data": a target is usable when it has results, even outdated ones.
 * "current": a target must be executed on its current inputs.
 */
export type Requirement = 'data' | 'current'

export function planStages(
  workflow: WorkflowState,
  tasks: Record<string, Task>,
  targets: string[],
  requirement: Requirement = 'data',
): StagePlan {
  const states = deriveStageStates(workflow, tasks)
  const planned = new Map<string, StagePlanStep[]>()
  const outcome: { blocker: string | null } = { blocker: null }

  const visit = (stageId: string, isTarget: boolean) => {
    if (outcome.blocker || planned.has(stageId)) return
    const stage = workflow.stages[stageId]
    const state = states[stageId]
    if (!stage || !state) {
      outcome.blocker = `Unknown stage "${stageId}".`
      return
    }
    const usable = isTarget
      ? state === 'executed' || (requirement === 'data' && state === 'stale')
      : state === 'executed' || state === 'skipped'
    if (usable) return
    if (state === 'unavailable') {
      outcome.blocker = `"${stage.name}" is planned and cannot run in this prototype.`
      return
    }
    if (state === 'running') {
      outcome.blocker = `"${stage.name}" is already running. Wait for it to finish, then ask again.`
      return
    }
    for (const upstreamId of upstreamIds(workflow, stageId)) {
      visit(upstreamId, false)
    }
    const steps: StagePlanStep[] = []
    if (stage.skipped) steps.push({ stageId, action: 'restore' })
    steps.push({ stageId, action: 'run' })
    planned.set(stageId, steps)
  }

  for (const target of targets) visit(target, true)
  if (outcome.blocker) return { steps: [], blocker: outcome.blocker }

  const order =
    topologicalOrder(workflow.stageIds, workflow.edges) ?? workflow.stageIds
  return {
    steps: order.flatMap((stageId) => planned.get(stageId) ?? []),
    blocker: null,
  }
}
