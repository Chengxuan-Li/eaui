import { createStore } from 'zustand/vanilla'
import { planStages, type Requirement } from '../../domain/stagePlan.ts'
import type { Scheduler } from '../../domain/simulator.ts'
import { deriveStageStates, hasActiveTask } from '../../domain/workflow.ts'
import {
  matchSession,
  SESSIONS,
  type ScriptContext,
  type ScriptedSession,
  type Step,
  type StepSource,
  type TitledCall,
} from './sessions.ts'
import {
  command,
  executeToolCall,
  requiresApproval,
  type ToolCall,
  type ToolDeps,
} from './tools.ts'
import type { AgentAdapter, AgentSnapshot, TranscriptItem } from './types.ts'

/** Pause between transcript steps, so a replay reads as a session. */
export const STEP_DELAY_MS = 350
const STAGE_POLL_MS = 200

export type ScriptedAgentOptions = ToolDeps & {
  scheduler: Scheduler
  stepDelayMs?: number
}

/**
 * Replays scripted sessions (decision 0006). Tool calls that run stages or
 * change the project model wait for approval, and missing project state is
 * explained and offered as one approval (decision 0011).
 */
export function createScriptedAgent(
  options: ScriptedAgentOptions,
): AgentAdapter {
  const { workbench, scheduler, stepDelayMs = STEP_DELAY_MS } = options
  const deps: ToolDeps = {
    workbench: options.workbench,
    view: options.view,
    layout: options.layout,
  }
  const store = createStore<AgentSnapshot>()(() => ({
    status: 'idle',
    transcript: [],
    activeSessionId: null,
    presets: SESSIONS.map(({ id, label, prompt, description }) => ({
      id,
      label,
      prompt,
      description,
    })),
  }))

  let itemCount = 0
  let queue: StepSource[] = []
  let approvedCalls: TitledCall[] = []
  let pending: { itemId: string; title: string; calls: TitledCall[] } | null =
    null
  let cancelTimer: (() => void) | null = null
  let context = createContext()

  function createContext(): ScriptContext {
    return {
      state: () => workbench.getState(),
      stageStates: () => {
        const state = workbench.getState()
        return deriveStageStates(state.workflow, state.tasks)
      },
      memory: {},
    }
  }

  function nextId(): string {
    itemCount += 1
    return `agent-item-${itemCount}`
  }

  function push(item: TranscriptItem) {
    store.setState({ transcript: [...store.getState().transcript, item] })
  }

  function setApprovalStatus(itemId: string, status: 'approved' | 'declined') {
    store.setState({
      transcript: store
        .getState()
        .transcript.map((item) =>
          item.kind === 'approval' && item.id === itemId
            ? { ...item, status }
            : item,
        ),
    })
  }

  function isRunning(): boolean {
    return store.getState().status === 'running'
  }

  function schedule(callback: () => void, delay = stepDelayMs) {
    cancelTimer?.()
    cancelTimer = scheduler.schedule(() => {
      cancelTimer = null
      callback()
    }, delay)
  }

  function finish() {
    cancelTimer?.()
    cancelTimer = null
    queue = []
    approvedCalls = []
    pending = null
    store.setState({ status: 'idle', activeSessionId: null })
  }

  function endWith(tone: 'info' | 'warning' | 'error', text: string) {
    push({ id: nextId(), kind: 'notice', tone, text })
    finish()
  }

  function start(session: ScriptedSession, prompt: string) {
    if (store.getState().status !== 'idle') return
    push({ id: nextId(), kind: 'user', text: prompt })
    workbench.record({
      type: 'agent.startSession',
      title: 'Start agent session',
      input: { sessionId: session.id, prompt },
      summary: `Started the scripted agent session "${session.label}".`,
    })
    context = createContext()
    queue = [...session.steps]
    store.setState({ status: 'running', activeSessionId: session.id })
    schedule(advance)
  }

  function advance() {
    if (!isRunning()) return
    const source = queue.shift()
    if (source === undefined) {
      finish()
      return
    }
    if (typeof source === 'function') {
      const produced = source(context)
      const steps =
        produced === null ? [] : Array.isArray(produced) ? produced : [produced]
      queue = [...steps, ...queue]
      advance()
      return
    }
    handle(source)
  }

  function handle(step: Step) {
    switch (step.kind) {
      case 'say':
        push({ id: nextId(), kind: 'agent', markdown: step.markdown })
        schedule(advance)
        return
      case 'reason':
        push({ id: nextId(), kind: 'reasoning', text: step.text })
        schedule(advance)
        return
      case 'reference':
        push({
          id: nextId(),
          kind: 'reference',
          label: step.label,
          target: step.target,
        })
        schedule(advance)
        return
      case 'tool':
        if (requiresApproval(step.call)) {
          propose(step.title, '', [{ title: step.title, call: step.call }])
          return
        }
        runCall({ title: step.title, call: step.call }, () => schedule(advance))
        return
      case 'propose':
        propose(step.title, step.description, step.calls)
        return
      case 'ensure':
        ensure(step.targets, step.purpose, step.requirement)
        return
    }
  }

  function runCall(titled: TitledCall, onDone: () => void) {
    const call: ToolCall =
      typeof titled.call === 'function' ? titled.call(context) : titled.call
    const result = executeToolCall(deps, call)
    push({ id: nextId(), kind: 'tool', title: titled.title, call, result })
    if (result.status === 'rejected') {
      endWith(
        'error',
        `I stopped because "${titled.title}" was rejected: ${result.issues.map((issue) => issue.message).join(' ')}`,
      )
      return
    }
    if (call.kind === 'command' && call.command.type === 'workflow.runStage') {
      waitForStage(call.command.input.stageId, onDone)
      return
    }
    onDone()
  }

  function waitForStage(stageId: string, onDone: () => void) {
    const check = () => {
      if (!isRunning()) return
      const state = workbench.getState()
      if (hasActiveTask(state.tasks, stageId)) {
        schedule(check, STAGE_POLL_MS)
        return
      }
      const stage = state.workflow.stages[stageId]
      if (stage?.lastRun?.outcome === 'failed') {
        endWith(
          'error',
          `"${stage.name}" failed: ${stage.lastRun.message ?? 'no message was reported.'} I ended the session. Rerun the stage from the Workflow panel, then ask again.`,
        )
        return
      }
      onDone()
    }
    schedule(check, STAGE_POLL_MS)
  }

  function propose(title: string, description: string, calls: TitledCall[]) {
    const itemId = nextId()
    push({
      id: itemId,
      kind: 'approval',
      title,
      description,
      callTitles: calls.map((call) => call.title),
      status: 'pending',
    })
    pending = { itemId, title, calls }
    store.setState({ status: 'awaitingApproval' })
  }

  function ensure(
    targets: string[],
    purpose: string,
    requirement: Requirement,
  ) {
    const state = workbench.getState()
    const plan = planStages(state.workflow, state.tasks, targets, requirement)
    if (plan.blocker) {
      endWith(
        'warning',
        `${purpose} is not possible right now: ${plan.blocker}`,
      )
      return
    }
    if (plan.steps.length === 0) {
      schedule(advance)
      return
    }
    const stageName = (id: string) => state.workflow.stages[id]?.name ?? id
    const runs = plan.steps.filter((step) => step.action === 'run').length
    const current = requirement === 'current'
    propose(
      `Run ${runs} ${current ? 'outdated or missing' : 'missing'} stage${runs === 1 ? '' : 's'}`,
      `${purpose} needs ${current ? 'current results from' : 'data from'} these stages. I can run them in order with simulated computation, or you can run them yourself from the Workflow panel.`,
      plan.steps.map((step) =>
        step.action === 'restore'
          ? {
              title: `Restore "${stageName(step.stageId)}"`,
              call: command({
                type: 'workflow.setStageSkipped',
                input: { stageId: step.stageId, skipped: false },
              }),
            }
          : {
              title: `Run "${stageName(step.stageId)}"`,
              call: command({
                type: 'workflow.runStage',
                input: { stageId: step.stageId },
              }),
            },
      ),
    )
  }

  function runApproved() {
    if (!isRunning()) return
    const next = approvedCalls.shift()
    if (!next) {
      schedule(advance)
      return
    }
    runCall(next, () => schedule(runApproved))
  }

  return {
    label: 'Scripted agent',
    store,
    send(text) {
      const prompt = text.trim()
      if (!prompt || store.getState().status !== 'idle') return
      const session = matchSession(prompt)
      if (session) {
        start(session, prompt)
        return
      }
      push({ id: nextId(), kind: 'user', text: prompt })
      push({
        id: nextId(),
        kind: 'agent',
        markdown:
          'I am a **scripted agent** in this prototype. I can only run the prepared sessions offered below, so I did not act on this message. Choose a session, or use the workbench controls directly.',
      })
    },
    startPreset(presetId) {
      const session = SESSIONS.find((candidate) => candidate.id === presetId)
      if (session) start(session, session.prompt)
    },
    approve(itemId) {
      if (store.getState().status !== 'awaitingApproval') return
      if (!pending || pending.itemId !== itemId) return
      setApprovalStatus(itemId, 'approved')
      approvedCalls = [...pending.calls]
      pending = null
      store.setState({ status: 'running' })
      schedule(runApproved)
    },
    decline(itemId) {
      if (store.getState().status !== 'awaitingApproval') return
      if (!pending || pending.itemId !== itemId) return
      setApprovalStatus(itemId, 'declined')
      workbench.record({
        type: 'agent.proposal',
        title: `Agent proposal: ${pending.title}`,
        input: { calls: pending.calls.map((call) => call.title) },
        status: 'rejected',
        summary: '',
        issues: [
          {
            path: '',
            message: `Rejected "${pending.title}"; nothing was changed.`,
          },
        ],
      })
      push({
        id: nextId(),
        kind: 'agent',
        markdown:
          'Understood. I did not make that change, and this session has ended.',
      })
      finish()
    },
    stop() {
      if (store.getState().status === 'idle') return
      if (pending) setApprovalStatus(pending.itemId, 'declined')
      endWith(
        'info',
        'Session stopped. Changes that were already applied stay in the project.',
      )
    },
  }
}
