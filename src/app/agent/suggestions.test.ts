import { describe, expect, it } from 'vitest'
import { MAX_SUGGESTIONS, suggestNextSteps } from './suggestions.ts'
import type { AgentPreset } from './types.ts'

const presets: AgentPreset[] = [
  {
    id: 'layout',
    label: 'Map beside Table',
    prompt: '',
    description: 'Rearranges pages.',
  },
  {
    id: 'representation',
    label: 'PV yield map',
    prompt: '',
    description: 'Colors the map.',
  },
  {
    id: 'modelChange',
    label: 'Propose a scenario change',
    prompt: '',
    description: 'Proposes a model change.',
  },
  {
    id: 'restore',
    label: 'Restore the default layout',
    prompt: '',
    description: 'Resets the layout.',
  },
]

describe('suggestNextSteps', () => {
  it('offers sessions in order before anything has run', () => {
    const suggestions = suggestNextSteps(presets, [])
    expect(suggestions).toHaveLength(MAX_SUGGESTIONS)
    expect(suggestions[0]).toEqual({
      id: 'layout',
      label: 'Map beside Table',
    })
    expect(suggestions.map((item) => item.id)).toEqual([
      'layout',
      'representation',
      'modelChange',
    ])
  })

  it('puts restoring the layout first once the workbench was rearranged', () => {
    const suggestions = suggestNextSteps(presets, ['layout'])
    expect(suggestions.map((item) => item.id)).toEqual([
      'restore',
      'representation',
      'modelChange',
    ])
  })

  it('stops suggesting a restore once it has run', () => {
    const suggestions = suggestNextSteps(presets, ['layout', 'restore'])
    expect(suggestions.map((item) => item.id)).toEqual([
      'representation',
      'modelChange',
      'layout',
    ])
  })

  it('keeps offering sessions after every one has run', () => {
    const suggestions = suggestNextSteps(presets, [
      'layout',
      'representation',
      'modelChange',
      'restore',
    ])
    expect(suggestions.map((item) => item.id)).toEqual([
      'layout',
      'representation',
      'modelChange',
    ])
  })
})
