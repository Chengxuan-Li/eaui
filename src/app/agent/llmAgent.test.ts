import { describe, expect, it } from 'vitest'
import { createWorkbench } from '../../domain/workbench.ts'
import { createAppearanceController } from '../appearance/appearanceController.ts'
import { createLayoutController } from '../layout/layoutController.ts'
import { createViewStore } from '../view/viewStore.ts'
import { createLlmAgent, MAX_TURNS } from './llmAgent.ts'
import type { LlmRequest, LlmResponse, OutputItem } from './llm/protocol.ts'
import type { LlmTransport } from './llm/transport.ts'
import type { TranscriptItem } from './types.ts'

function message(text: string): OutputItem {
  return {
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text }],
  }
}

function call(name: string, args: unknown, id = `call-${name}`): OutputItem {
  return {
    type: 'function_call',
    call_id: id,
    name,
    arguments: JSON.stringify(args),
  }
}

/** Replays canned model turns, so no test ever reaches a provider. */
function fakeTransport(turns: OutputItem[][]) {
  const requests: LlmRequest[] = []
  let index = 0
  const transport: LlmTransport = {
    health: () =>
      Promise.resolve({ available: true, model: 'test-model', reason: null }),
    respond: (request) => {
      requests.push(request)
      const output = turns[index] ?? []
      index += 1
      return Promise.resolve({ output } satisfies LlmResponse)
    },
  }
  return { transport, requests, used: () => index }
}

function failingTransport(message: string): LlmTransport {
  return {
    health: () =>
      Promise.resolve({ available: false, model: null, reason: message }),
    respond: () => Promise.reject(new Error(message)),
  }
}

function setup(transport: LlmTransport) {
  const workbench = createWorkbench()
  const layout = createLayoutController(workbench, null)
  const view = createViewStore(workbench)
  const appearance = createAppearanceController(workbench, null)
  const agent = createLlmAgent({
    workbench,
    layout,
    view,
    appearance,
    transport,
    modelLabel: 'Test model',
  })
  const transcript = () => agent.store.getState().transcript
  const kinds = () => transcript().map((item) => item.kind)
  const lastApproval = () => {
    const item = [...transcript()]
      .reverse()
      .find(
        (entry): entry is Extract<TranscriptItem, { kind: 'approval' }> =>
          entry.kind === 'approval',
      )
    if (!item) throw new Error('No approval in the transcript.')
    return item
  }
  return {
    workbench,
    layout,
    view,
    appearance,
    agent,
    transcript,
    kinds,
    lastApproval,
  }
}

/** Lets the adapter's promise chain settle; the fake transport never waits. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('llm agent', () => {
  it('runs a tool call and reports the answer', async () => {
    const { transport } = fakeTransport([
      [call('appearance__set', { appearance: 'dark' })],
      [message('Switched to **Dark**.')],
    ])
    const { agent, appearance, kinds, transcript } = setup(transport)

    agent.send('make it dark')
    await settle()

    expect(appearance.getPreference()).toBe('dark')
    expect(kinds()).toEqual(['user', 'tool', 'agent'])
    expect(agent.store.getState().status).toBe('idle')
    expect(JSON.stringify(transcript())).toContain('Switched to')
  })

  it('sends the tool catalog and a bounded digest, never the raw project', async () => {
    const { transport, requests } = fakeTransport([[message('Nothing to do.')]])
    const { agent } = setup(transport)

    agent.send('hello')
    await settle()

    const request = requests[0]!
    expect(request.instructions).toContain('EnergyAtlas workbench')
    expect(request.instructions).toContain('"counts"')
    expect(request.instructions).not.toContain('byBuildingKwh')

    const names = request.tools.map((tool) => tool.name)
    // Wire names cannot carry dots, and the model gets presentation tools only.
    expect(names).toContain('appearance__set')
    expect(names.every((name) => /^[a-zA-Z0-9_-]+$/.test(name))).toBe(true)
    expect(names).not.toContain('workflow__runStage')
  })

  it('refuses a model change even when the model names the command exactly', async () => {
    const { transport } = fakeTransport([
      [
        call('scenario__setAdoption', {
          scenarioId: 's1',
          adoptionPercent: 90,
        }),
      ],
      [message('I cannot change the model.')],
    ])
    const { agent, workbench, transcript } = setup(transport)

    agent.send('set adoption to 90%')
    await settle()

    expect(workbench.getState().scenarios).toEqual({})
    expect(JSON.stringify(transcript())).toContain('changes the project model')
    expect(transcript().some((item) => item.kind === 'tool')).toBe(false)
  })

  it('waits for approval before resetting the layout', async () => {
    const { transport } = fakeTransport([
      [call('layout__reset', {})],
      [message('Layout restored.')],
    ])
    const { agent, workbench, lastApproval } = setup(transport)

    agent.send('reset the layout')
    await settle()
    expect(agent.store.getState().status).toBe('awaitingApproval')

    agent.approve(lastApproval().id)
    await settle()
    expect(lastApproval().status).toBe('approved')
    expect(
      workbench.store
        .getState()
        .log.some((entry) => entry.type === 'layout.reset'),
    ).toBe(true)
  })

  it('tells the model when the user declines, instead of stopping dead', async () => {
    const { transport, requests } = fakeTransport([
      [call('layout__reset', {})],
      [message('Understood, I left the layout alone.')],
    ])
    const { agent, lastApproval, transcript } = setup(transport)

    agent.send('reset the layout')
    await settle()
    agent.decline(lastApproval().id)
    await settle()

    expect(lastApproval().status).toBe('declined')
    const fedBack = JSON.stringify(requests.at(-1)?.input)
    expect(fedBack).toContain('declined')
    expect(JSON.stringify(transcript())).toContain('left the layout alone')
  })

  it('reports a bad tool name back to the model rather than guessing', async () => {
    const { transport, requests } = fakeTransport([
      [call('layout__teleport', { page: 'map' })],
      [message('Sorry, I used a tool that does not exist.')],
    ])
    const { agent, transcript } = setup(transport)

    agent.send('teleport the map')
    await settle()

    expect(JSON.stringify(transcript())).toContain('no tool called')
    expect(JSON.stringify(requests.at(-1)?.input)).toContain('rejected')
  })

  it('rejects arguments that do not fit the schema', async () => {
    const { transport } = fakeTransport([
      [call('appearance__set', { appearance: 'neon' })],
      [message('That appearance does not exist.')],
    ])
    const { agent, appearance, transcript } = setup(transport)

    agent.send('use the neon theme')
    await settle()

    expect(appearance.getPreference()).toBe('system')
    expect(transcript().some((item) => item.kind === 'notice')).toBe(true)
  })

  it('surfaces a transport failure as an error notice and goes idle', async () => {
    const { agent, transcript } = setup(
      failingTransport('The model could not be reached: offline.'),
    )

    agent.send('anything')
    await settle()

    expect(agent.store.getState().status).toBe('idle')
    const notice = transcript().at(-1)
    expect(notice).toMatchObject({ kind: 'notice', tone: 'error' })
    expect(JSON.stringify(notice)).toContain('could not be reached')
  })

  it('stops after the turn limit rather than looping forever', async () => {
    // Always asks for another tool call, never answers.
    const turns = Array.from({ length: MAX_TURNS + 3 }, (_, index) => [
      call('layout__openPage', { page: 'map' }, `call-${index}`),
    ])
    const { transport, used } = fakeTransport(turns)
    const { agent, transcript } = setup(transport)

    agent.send('keep going')
    await settle()

    expect(agent.store.getState().status).toBe('idle')
    expect(used()).toBeLessThanOrEqual(MAX_TURNS)
    expect(JSON.stringify(transcript().at(-1))).toContain('stopped after')
  })

  it('changes nothing in plan mode', async () => {
    const { transport } = fakeTransport([
      [call('appearance__set', { appearance: 'dark' })],
    ])
    const { agent, appearance, transcript } = setup(transport)

    agent.setPermissionMode('plan')
    agent.send('make it dark')
    await settle()

    expect(appearance.getPreference()).toBe('system')
    expect(JSON.stringify(transcript())).toContain('Plan only')
    expect(transcript().some((item) => item.kind === 'tool')).toBe(false)
  })

  it('applies a reset without asking in bypass mode, and says who approved it', async () => {
    const { transport } = fakeTransport([
      [call('layout__reset', {})],
      [message('Done.')],
    ])
    const { agent, lastApproval } = setup(transport)

    agent.setPermissionMode('bypass')
    agent.send('reset the layout')
    await settle()

    expect(lastApproval()).toMatchObject({
      status: 'approved',
      decidedBy: 'bypass',
    })
    expect(agent.store.getState().status).toBe('idle')
  })

  it('answers a queued message once the first one finishes', async () => {
    const { transport } = fakeTransport([
      [message('First answer.')],
      [message('Second answer.')],
    ])
    const { agent, transcript } = setup(transport)

    agent.send('first')
    agent.send('second', 'queue')
    await settle()
    await settle()

    const text = JSON.stringify(transcript())
    expect(text).toContain('First answer.')
    expect(text).toContain('Second answer.')
    expect(agent.store.getState().queued).toEqual([])
  })

  it('reads context through the tool path without logging an operation', async () => {
    const { transport, requests } = fakeTransport([
      [call('read__context', {})],
      [message('The map shows floors.')],
    ])
    const { agent, workbench, transcript } = setup(transport)
    const before = workbench.store.getState().log.length

    agent.send('what is on screen?')
    await settle()

    const tool = transcript().find((item) => item.kind === 'tool')
    expect(tool).toBeDefined()
    // A read changes nothing, so only the message record should be logged.
    expect(workbench.store.getState().log.length).toBe(before + 1)
    expect(JSON.stringify(requests.at(-1)?.input)).toContain('stages')
  })
})
