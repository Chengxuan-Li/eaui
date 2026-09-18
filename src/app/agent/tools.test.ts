import { describe, expect, it } from 'vitest'
import { createWorkbench } from '../../domain/workbench.ts'
import { createAppearanceController } from '../appearance/appearanceController.ts'
import { createLayoutController } from '../layout/layoutController.ts'
import { createViewStore } from '../view/viewStore.ts'
import {
  appearanceCall,
  command,
  describeAgentTools,
  executeToolCall,
  layoutCall,
  readCall,
  requiresApproval,
  viewCall,
  type ToolDeps,
} from './tools.ts'

function setup() {
  const workbench = createWorkbench()
  const layout = createLayoutController(workbench, null)
  const view = createViewStore(workbench)
  const appearance = createAppearanceController(workbench, null)
  const deps: ToolDeps = { workbench, view, layout, appearance }
  const lastAgentEntry = () =>
    [...workbench.store.getState().log]
      .reverse()
      .find((entry) => entry.source === 'agent')
  return { workbench, layout, view, appearance, deps, lastAgentEntry }
}

describe('layout tools', () => {
  it('shows and hides a panel by the state asked for, not by toggling', () => {
    const { deps, layout } = setup()
    layout.togglePanel('inspection')
    expect(layout.isPanelOpen('inspection')).toBe(true)

    const close = executeToolCall(
      deps,
      layoutCall({
        type: 'layout.setPanel',
        input: { panel: 'inspection', open: false },
      }),
    )
    expect(close.status).toBe('applied')
    expect(layout.isPanelOpen('inspection')).toBe(false)
  })

  it('says so in the log when the layout already matches', () => {
    const { deps, layout, lastAgentEntry } = setup()
    expect(layout.isPanelOpen('inspection')).toBe(false)

    const result = executeToolCall(
      deps,
      layoutCall({
        type: 'layout.setPanel',
        input: { panel: 'inspection', open: false },
      }),
    )
    // Not a silent no-op: it applies and explains rather than reporting nothing.
    expect(result.status).toBe('applied')
    expect(lastAgentEntry()?.summary).toContain('already closed')
  })

  it('maximizes and restores the active tab group', () => {
    const { deps, layout } = setup()
    executeToolCall(
      deps,
      layoutCall({ type: 'layout.setMaximized', input: { maximized: true } }),
    )
    expect(layout.describeLayout().maximized).toBe(true)

    executeToolCall(
      deps,
      layoutCall({ type: 'layout.setMaximized', input: { maximized: false } }),
    )
    expect(layout.describeLayout().maximized).toBe(false)
  })

  it('rejects a split that cannot happen and carries the reason', () => {
    const { deps, layout } = setup()
    // Placing Map beside Table leaves each in a group of its own.
    layout.placePage('map', 'table', 'right')
    const result = executeToolCall(
      deps,
      layoutCall({ type: 'layout.splitActiveTab', input: {} }),
    )
    expect(result.status).toBe('rejected')
    expect(result.issues[0]?.message).toBeTruthy()
  })

  it('collapses a side container', () => {
    const { deps, layout } = setup()
    const open = layout.isSideOpen('left')
    const result = executeToolCall(
      deps,
      layoutCall({
        type: 'layout.setSide',
        input: { side: 'left', open: !open },
      }),
    )
    expect(result.status).toBe('applied')
    expect(layout.isSideOpen('left')).toBe(!open)
  })
})

describe('appearance tool', () => {
  it('switches appearance through the logged controller', () => {
    const { deps, appearance, lastAgentEntry } = setup()
    const result = executeToolCall(
      deps,
      appearanceCall({
        type: 'appearance.set',
        input: { appearance: 'lieflat' },
      }),
    )

    expect(result.status).toBe('applied')
    expect(appearance.getPreference()).toBe('lieflat')
    expect(lastAgentEntry()?.type).toBe('view.setAppearance')
    expect(lastAgentEntry()?.summary).toContain('Lieflat')
  })

  it('accepts system as a preference', () => {
    const { deps, appearance } = setup()
    executeToolCall(
      deps,
      appearanceCall({
        type: 'appearance.set',
        input: { appearance: 'system' },
      }),
    )
    expect(appearance.getPreference()).toBe('system')
  })
})

describe('approval boundary', () => {
  it('asks before resetting the layout, because nothing undoes it', () => {
    expect(
      requiresApproval(layoutCall({ type: 'layout.reset', input: {} })),
    ).toBe(true)
  })

  it('lets presentation calls run without approval', () => {
    expect(
      requiresApproval(
        layoutCall({ type: 'layout.openPage', input: { page: 'map' } }),
      ),
    ).toBe(false)
    expect(
      requiresApproval(
        viewCall({ type: 'map.setMetric', input: { metric: 'floors' } }),
      ),
    ).toBe(false)
    expect(
      requiresApproval(
        appearanceCall({
          type: 'appearance.set',
          input: { appearance: 'dark' },
        }),
      ),
    ).toBe(false)
    expect(
      requiresApproval(readCall({ type: 'read.context', input: {} })),
    ).toBe(false)
    expect(
      requiresApproval(
        command({
          type: 'selection.set',
          input: { entityType: 'building', ids: [] },
        }),
      ),
    ).toBe(false)
  })

  it('still asks before a stage run or a model change', () => {
    expect(
      requiresApproval(
        command({ type: 'workflow.runStage', input: { stageId: 'ingestion' } }),
      ),
    ).toBe(true)
    expect(
      requiresApproval(
        command({
          type: 'scenario.setAdoption',
          input: { scenarioId: 's1', adoptionPercent: 10 },
        }),
      ),
    ).toBe(true)
  })
})

describe('tool catalog', () => {
  it('describes every tool with a JSON Schema input', () => {
    const tools = describeAgentTools()
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema).toMatchObject({ type: 'object' })
    }
    expect(tools.some((tool) => tool.name === 'appearance.set')).toBe(true)
    expect(tools.some((tool) => tool.name === 'read.context')).toBe(true)
    expect(tools.some((tool) => tool.name === 'layout.setPanel')).toBe(true)
  })

  it('never offers task commands, which belong to the simulator', () => {
    expect(
      describeAgentTools().some((tool) => tool.name.startsWith('task.')),
    ).toBe(false)
  })

  it('limits the presentation catalog to what a model may drive', () => {
    const names = describeAgentTools('presentation').map((tool) => tool.name)

    expect(names).toContain('selection.set')
    expect(names).toContain('map.setMetric')
    expect(names).toContain('layout.setPanel')
    expect(names).toContain('appearance.set')
    expect(names).toContain('read.buildings')

    // Strictly presentation, styling, and layout: no runs, no model edits.
    expect(names).not.toContain('workflow.runStage')
    expect(names).not.toContain('scenario.create')
    expect(names).not.toContain('edits.apply')
    expect(names).not.toContain('measure.create')
  })

  it('marks layout.reset as the one presentation call that waits', () => {
    const reset = describeAgentTools('presentation').find(
      (tool) => tool.name === 'layout.reset',
    )
    expect(reset?.requiresApproval).toBe(true)
    const openPage = describeAgentTools('presentation').find(
      (tool) => tool.name === 'layout.openPage',
    )
    expect(openPage?.requiresApproval).toBe(false)
  })
})
