import { describe, expect, it } from 'vitest'
import { startTaskSimulator } from '../../domain/simulator.ts'
import { createWorkbench } from '../../domain/workbench.ts'
import { manualScheduler } from '../../testing/manualScheduler.ts'
import { createLayoutController } from '../layout/layoutController.ts'
import { createViewStore } from '../view/viewStore.ts'
import { createScriptedAgent } from './scriptedAgent.ts'
import { matchSession } from './sessions.ts'
import { command, describeAgentTools, requiresApproval } from './tools.ts'
import type { TranscriptItem } from './types.ts'

function setup() {
  const workbench = createWorkbench()
  const manual = manualScheduler()
  startTaskSimulator(workbench, { scheduler: manual.scheduler })
  const layout = createLayoutController(workbench, null)
  const view = createViewStore(workbench)
  const agent = createScriptedAgent({
    workbench,
    layout,
    view,
    scheduler: manual.scheduler,
  })
  const transcript = () => agent.store.getState().transcript
  const lastApproval = () => {
    const item = [...transcript()]
      .reverse()
      .find(
        (entry): entry is Extract<TranscriptItem, { kind: 'approval' }> =>
          entry.kind === 'approval',
      )
    if (!item) throw new Error('No approval item in the transcript.')
    return item
  }
  const agentEntries = () =>
    workbench.store.getState().log.filter((entry) => entry.source === 'agent')
  return { workbench, manual, agent, transcript, lastApproval, agentEntries }
}

describe('scripted agent', () => {
  it('answers free text without a matching script honestly', () => {
    const { agent, transcript, agentEntries } = setup()
    agent.send('What is the weather tomorrow?')
    expect(transcript().map((item) => item.kind)).toEqual(['user', 'agent'])
    expect(JSON.stringify(transcript()[1])).toContain(
      'I can only run the prepared sessions',
    )
    expect(agent.store.getState().status).toBe('idle')
    expect(agentEntries()).toEqual([])
  })

  it('matches free text to sessions by whole words', () => {
    expect(matchSession('Please reset the layout')?.id).toBe('restore')
    expect(matchSession('Show me a chart of demand')?.id).toBe('representation')
    expect(matchSession('Put the map beside the table')?.id).toBe('layout')
    expect(matchSession('Pick a preset')).toBeNull()
  })

  it('proposes missing stages, runs them after approval, and arranges the workbench', () => {
    const { workbench, manual, agent, lastApproval, agentEntries, transcript } =
      setup()
    agent.startPreset('layout')
    manual.runAll(50)
    expect(agent.store.getState().status).toBe('awaitingApproval')
    const approval = lastApproval()
    expect(approval.title).toBe('Run 2 missing stages')
    expect(agentEntries()).toEqual([])

    agent.approve(approval.id)
    manual.runAll(5000)
    expect(agent.store.getState().status).toBe('idle')
    expect(
      agentEntries().map((entry) => `${entry.type}:${entry.status}`),
    ).toEqual([
      'workflow.runStage:applied',
      'workflow.runStage:applied',
      'layout.placePage:applied',
      'table.setView:applied',
      'selection.set:applied',
      'map.setMetric:applied',
      'map.focusSelection:applied',
    ])
    expect(workbench.getState().selection.ids).toHaveLength(5)
    const tools = transcript().filter((item) => item.kind === 'tool')
    expect(tools).toHaveLength(7)
    for (const item of tools) {
      if (item.kind !== 'tool') continue
      expect(item.result.status).toBe('applied')
      expect(item.result.operationIds.length).toBeGreaterThan(0)
    }
  })

  it('records a rejected proposal and changes nothing when the user rejects it', () => {
    const { workbench, manual, agent, lastApproval, agentEntries } = setup()
    agent.startPreset('modelChange')
    manual.runAll(50)
    const approval = lastApproval()
    expect(approval.title).toBe('Create a measure and a scenario')

    agent.decline(approval.id)
    expect(agent.store.getState().status).toBe('idle')
    expect(lastApproval().status).toBe('declined')
    expect(workbench.getState().measures).toEqual({})
    expect(agentEntries()).toEqual([])
    expect(workbench.store.getState().log.at(-1)).toMatchObject({
      type: 'agent.proposal',
      status: 'rejected',
    })
  })

  it('applies an approved model change as the agent, then reruns stages with a second approval', () => {
    const { workbench, manual, agent, lastApproval, agentEntries, transcript } =
      setup()
    agent.startPreset('modelChange')
    manual.runAll(50)
    agent.approve(lastApproval().id)
    manual.runAll(200)
    expect(
      agentEntries().map((entry) => `${entry.type}:${entry.status}`),
    ).toEqual(['measure.create:applied', 'scenario.create:applied'])
    expect(Object.values(workbench.getState().scenarios)).toHaveLength(1)

    const rerun = lastApproval()
    expect(rerun.title).toBe('Run 9 outdated or missing stages')
    agent.approve(rerun.id)
    manual.runAll(20000)
    expect(agent.store.getState().status).toBe('idle')
    const last = transcript().at(-2)
    expect(last?.kind).toBe('agent')
    expect(JSON.stringify(last)).toContain('reduces annual demand by')
  })

  it('stops a session and leaves applied changes in place', () => {
    const { manual, agent, lastApproval, transcript } = setup()
    agent.startPreset('layout')
    manual.runAll(50)
    agent.stop()
    expect(agent.store.getState().status).toBe('idle')
    expect(lastApproval().status).toBe('declined')
    expect(JSON.stringify(transcript().at(-1))).toContain('Session stopped')
  })
})

describe('agent tools', () => {
  it('requires approval for stage runs and project model changes only', () => {
    expect(
      requiresApproval(
        command({ type: 'workflow.runStage', input: { stageId: 'stage' } }),
      ),
    ).toBe(true)
    expect(
      requiresApproval(
        command({
          type: 'scenario.setAdoption',
          input: { scenarioId: 'scenario', adoptionPercent: 10 },
        }),
      ),
    ).toBe(true)
    expect(
      requiresApproval(command({ type: 'selection.clear', input: {} })),
    ).toBe(false)
  })

  it('describes command, view, and layout tools without simulator internals', () => {
    const tools = describeAgentTools()
    expect(
      tools.find((item) => item.name === 'layout.placePage'),
    ).toMatchObject({ kind: 'layout', requiresApproval: false })
    expect(
      tools.find((item) => item.name === 'dashboard.addChart'),
    ).toMatchObject({ kind: 'view', requiresApproval: false })
    expect(tools.find((item) => item.name === 'measure.create')).toMatchObject({
      kind: 'command',
      requiresApproval: true,
    })
    expect(tools.some((item) => item.name.startsWith('task.'))).toBe(false)
  })
})
