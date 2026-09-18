import { describe, expect, it } from 'vitest'
import { buildWireTools, fromWireName, toWireName } from './llm/protocol.ts'
import { toToolCall } from './toolDispatch.ts'

describe('wire names', () => {
  it('round-trips every tool name the model is offered', () => {
    for (const tool of buildWireTools('presentation')) {
      expect(tool.name).toMatch(/^[a-zA-Z0-9_-]+$/)
      // The provider rejects dots, so the mapping has to be exact both ways.
      expect(toWireName(fromWireName(tool.name))).toBe(tool.name)
    }
  })

  it('gives every offered tool a JSON Schema without the draft marker', () => {
    for (const tool of buildWireTools('presentation')) {
      expect(tool.description).toBeTruthy()
      expect(tool.parameters).toMatchObject({ type: 'object' })
      expect(tool.parameters).not.toHaveProperty('$schema')
    }
  })
})

describe('tool dispatch', () => {
  it('builds a call for a valid presentation tool', () => {
    const resolved = toToolCall('appearance.set', '{"appearance":"lieflat"}')
    expect(resolved).toMatchObject({
      ok: true,
      call: { kind: 'appearance' },
    })
  })

  it('accepts empty arguments for a tool that takes none', () => {
    expect(toToolCall('layout.reset', '')).toMatchObject({ ok: true })
    expect(toToolCall('read.context', '{}')).toMatchObject({ ok: true })
  })

  it('refuses every command outside the presentation set', () => {
    for (const name of [
      'workflow.runStage',
      'scenario.create',
      'scenario.setAdoption',
      'measure.create',
      'edits.apply',
      'workflow.setStageSkipped',
    ]) {
      const resolved = toToolCall(name, '{}')
      expect(resolved.ok).toBe(false)
      if (!resolved.ok) {
        expect(resolved.issue.message).toContain('project model')
      }
    }
  })

  it('refuses task commands, which belong to the simulator', () => {
    expect(toToolCall('task.cancel', '{"taskId":"t1"}').ok).toBe(false)
  })

  it('allows the selection commands, which only change what is highlighted', () => {
    expect(
      toToolCall('selection.set', '{"entityType":"building","ids":[]}').ok,
    ).toBe(true)
    expect(toToolCall('selection.clear', '{}').ok).toBe(true)
  })

  it('rejects malformed JSON without throwing', () => {
    const resolved = toToolCall('appearance.set', '{not json')
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) expect(resolved.issue.message).toContain('valid JSON')
  })

  it('rejects an unknown tool name', () => {
    const resolved = toToolCall('layout.explode', '{}')
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) expect(resolved.issue.message).toContain('no tool called')
  })

  it('carries the schema message when the input does not fit', () => {
    const resolved = toToolCall('appearance.set', '{"appearance":"neon"}')
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) expect(resolved.issue.message).toBeTruthy()
  })

  it('validates view operation inputs through their own registry', () => {
    expect(toToolCall('map.setMetric', '{"metric":"floors"}').ok).toBe(true)
    expect(toToolCall('map.setMetric', '{"metric":"nonsense"}').ok).toBe(false)
  })
})
