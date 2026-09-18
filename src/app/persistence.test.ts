import { describe, expect, it } from 'vitest'
import { createInitialState } from '../domain/initialState.ts'
import type { ResultSet, WorkbenchState } from '../domain/types.ts'
import { createWorkbench } from '../domain/workbench.ts'
import { loadConversation, saveConversation } from './agent/agentPersistence.ts'
import type { TranscriptItem } from './agent/types.ts'
import { createViewStore } from './view/viewStore.ts'
import { restoreViewState } from './viewPersistence.ts'

/** A stand-in for localStorage that can also be made to fail. */
function memoryStorage(failing = false): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      if (failing) throw new Error('Storage is full.')
      map.set(key, value)
    },
  }
}

function result(id: string, total: number): ResultSet {
  return {
    id,
    label: id,
    runId: 'run-1',
    totalKwh: total,
    peakKw: 10,
    monthlyKwh: Array.from({ length: 12 }, () => total / 12),
    byBuildingKwh: {},
  }
}

const withBaseline: Partial<WorkbenchState> = {
  results: { baseline: result('baseline', 12000), scenarios: {} },
}

function project(patch: Partial<WorkbenchState> = {}): WorkbenchState {
  return { ...createInitialState(), ...patch }
}

describe('view state persistence', () => {
  it('carries the map, table, and dashboard across a reload', () => {
    const storage = memoryStorage()
    const first = createViewStore(
      createWorkbench({ initialState: project(withBaseline) }),
      storage,
    )
    first.execute({ type: 'map.set3d', input: { enabled: true } })
    first.execute({ type: 'table.setQuickFilter', input: { text: 'office' } })

    const second = createViewStore(
      createWorkbench({ initialState: project(withBaseline) }),
      storage,
    )
    expect(second.getState().map.view3d).toBe(true)
    expect(second.getState().table.quickFilter).toBe('office')
  })

  it('starts fresh when nothing was stored', () => {
    const store = createViewStore(createWorkbench(), memoryStorage())
    expect(store.getState().map.view3d).toBe(false)
    expect(store.getState().dashboard.charts).toEqual([])
  })

  it('keeps working when storage refuses to save', () => {
    const store = createViewStore(createWorkbench(), memoryStorage(true))
    const outcome = store.execute({
      type: 'map.set3d',
      input: { enabled: true },
    })
    // The view still changes; only its durability is lost.
    expect(outcome.outcome.status).toBe('applied')
    expect(store.getState().map.view3d).toBe(true)
  })

  it('drops a chart whose scenario this project does not have', () => {
    const stored = {
      dashboard: {
        charts: [
          {
            id: 'chart-1',
            title: 'Gone',
            kind: 'bar',
            measure: 'annualDemand',
            series: ['scenario-that-left'],
          },
          {
            id: 'chart-2',
            title: 'Baseline',
            kind: 'bar',
            measure: 'annualDemand',
            series: ['baseline'],
          },
        ],
      },
    }
    const restored = restoreViewState(stored, project(withBaseline))
    expect(restored.dashboard.charts.map((chart) => chart.id)).toEqual([
      'chart-2',
    ])
  })

  it('falls back field by field when the stored shape is wrong', () => {
    const restored = restoreViewState(
      {
        map: { metric: 'nonsense', view3d: 'yes', terrainExaggeration: 'big' },
        table: { view: 42, quickFilter: 'x'.repeat(400) },
        dashboard: { charts: 'not an array', hiddenScenarioIds: [7] },
      },
      project(),
    )

    expect(restored.map.metric).toBe('floors')
    expect(restored.map.view3d).toBe(false)
    expect(restored.map.terrainExaggeration).toBe(1)
    expect(restored.table.view).toBe('buildings')
    expect(restored.table.quickFilter).toHaveLength(100)
    expect(restored.dashboard.charts).toEqual([])
    expect(restored.dashboard.hiddenScenarioIds).toEqual([])
  })

  it('never restores a pending zoom request', () => {
    const restored = restoreViewState({ map: { focusRequest: 9 } }, project())
    expect(restored.map.focusRequest).toBe(0)
  })

  it('resets to the default view and stores that', () => {
    const storage = memoryStorage()
    const store = createViewStore(createWorkbench(), storage)
    store.execute({ type: 'map.set3d', input: { enabled: true } })
    store.reset()

    expect(store.getState().map.view3d).toBe(false)
    const reloaded = createViewStore(createWorkbench(), storage)
    expect(reloaded.getState().map.view3d).toBe(false)
  })
})

describe('conversation persistence', () => {
  const transcript: TranscriptItem[] = [
    { id: 'a', kind: 'user', text: 'hello' },
    {
      id: 'b',
      kind: 'approval',
      title: 'Reset layout',
      description: '',
      callTitles: ['Reset layout'],
      status: 'pending',
      decidedBy: null,
    },
  ]

  it('restores the transcript and the model input stream together', () => {
    const storage = memoryStorage()
    saveConversation(storage, 'live', {
      transcript,
      conversation: [{ role: 'user', content: 'hello' }],
    })

    const restored = loadConversation(storage, 'live')
    expect(restored?.transcript).toHaveLength(2)
    // Re-sending the stored input is the whole of remembering, with no backend.
    expect(restored?.conversation).toHaveLength(1)
  })

  it('expires an approval that was still waiting', () => {
    const storage = memoryStorage()
    saveConversation(storage, 'live', { transcript, conversation: [] })

    const restored = loadConversation(storage, 'live')
    const approval = restored?.transcript.find(
      (item) => item.kind === 'approval',
    )
    // A live button that cannot do anything would be a lie.
    expect(approval).toMatchObject({ status: 'expired' })
  })

  it('keeps each agent conversation separate', () => {
    const storage = memoryStorage()
    saveConversation(storage, 'live', { transcript, conversation: [] })
    expect(loadConversation(storage, 'scripted')).toBeNull()
  })

  it('returns null for unreadable or empty storage', () => {
    const storage = memoryStorage()
    expect(loadConversation(storage, 'live')).toBeNull()
    storage.setItem('eaui.agent.live.v1', 'not json')
    expect(loadConversation(storage, 'live')).toBeNull()
    expect(loadConversation(null, 'live')).toBeNull()
  })
})
