import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useStore } from 'zustand'
import { browserScheduler, startTaskSimulator } from '../domain/simulator.ts'
import type { CommandSource } from '../domain/types.ts'
import {
  createWorkbench,
  type Workbench,
  type WorkbenchSnapshot,
} from '../domain/workbench.ts'
import { deriveStageStates } from '../domain/workflow.ts'
import {
  DATASETS,
  DEFAULT_DATASET_ID,
  getDataset,
  loadDataset,
  type Dataset,
  type DatasetId,
} from '../domain/datasets.ts'
import { createScriptedAgent } from './agent/scriptedAgent.ts'
import { createLlmAgent } from './agent/llmAgent.ts'
import { loadAgentModel, saveAgentModel } from './agent/agentPersistence.ts'
import { createHttpTransport, type LlmHealth } from './agent/llm/transport.ts'
import {
  modelOptions,
  LIVE_MODEL,
  SCRIPTED_MODEL,
  type ModelOption,
} from './agent/modes.ts'
import type { AgentAdapter, AgentSnapshot } from './agent/types.ts'
import {
  createAppearanceController,
  type AppearanceController,
} from './appearance/appearanceController.ts'
import {
  resolveAppearance,
  type Appearance,
  type AppearancePreference,
} from './appearance/appearances.ts'
import {
  createLayoutController,
  type LayoutController,
} from './layout/layoutController.ts'
import { hasOutdatedProject, loadProject } from './persistence.ts'
import {
  readBasemapPreference,
  storeBasemapPreference,
} from './basemapPreference.ts'
import { getBrowserStorage } from './storage.ts'
import { applyAppearance } from './theme.ts'
import type { ViewState } from './view/viewOperations.ts'
import { createViewStore, type ViewStore } from './view/viewStore.ts'

type CoreServices = {
  storage: Storage | null
  workbench: Workbench
  layout: LayoutController
  /** Logged view state shared by manual controls and the agent. */
  view: ViewStore
  /** Appearance as a logged store, so the agent drives it like layout. */
  appearanceController: AppearanceController
  /** Both agents behind one adapter seam; the chosen model decides which runs. */
  agents: Record<string, AgentAdapter>
}

/**
 * The surface the user is working in, used by Inspection when nothing is
 * selected. Deliberately ephemeral: focus changes on every click, and logging
 * them would bury the operation log (decision 0018).
 */
export type WorkedSurface = 'map' | null

export type Services = CoreServices & {
  /** The stored choice, which may be "system". */
  appearancePreference: AppearancePreference
  /** The appearance actually shown. */
  appearance: Appearance
  setAppearance: (preference: AppearancePreference) => void
  /** Whether the Map page shows the OpenFreeMap basemap (decision 0012). */
  basemapEnabled: boolean
  setBasemapEnabled: (enabled: boolean) => void
  /** Opens the Inspection panel, which follows the shared selection. */
  showInspection: (source?: CommandSource) => void
  /** The agent actually running: the scripted player or the language model. */
  agent: AgentAdapter
  /** The fictional district currently open, and how to change it. */
  dataset: Dataset
  datasets: Dataset[]
  openDataset: (id: DatasetId) => Promise<void>
  /** True while a dataset's fixture is loading and its recipe is replaying. */
  datasetLoading: boolean
  /** Which model drives the agent, and what can be chosen. */
  agentModel: string
  agentModels: ModelOption[]
  setAgentModel: (id: string) => void
  /** The surface being worked in; Inspection shows its properties when nothing is selected. */
  workedSurface: WorkedSurface
  claimWorked: (surface: 'map') => void
}

const ServicesContext = createContext<Services | null>(null)

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  )
}

function createCoreServices(): CoreServices {
  const storage = getBrowserStorage()
  const saved = loadProject(storage)
  const workbench = createWorkbench({ initialState: saved?.state })
  if (saved) {
    workbench.record({
      type: 'project.restore',
      title: 'Restore saved project',
      summary: `Restored the project saved in this browser at ${new Date(saved.savedAt).toLocaleString()}.`,
      source: 'system',
    })
  } else if (hasOutdatedProject(storage)) {
    workbench.record({
      type: 'project.restore',
      title: 'Restore saved project',
      summary:
        'A project saved before the Back Bay footprints was not restored because its buildings no longer match the map. Run the workflow again to rebuild it.',
      source: 'system',
    })
  }
  const layout = createLayoutController(workbench, storage)
  const view = createViewStore(workbench, storage)
  const appearance = createAppearanceController(workbench, storage)
  return {
    storage,
    workbench,
    layout,
    view,
    appearanceController: appearance,
    agents: {
      [SCRIPTED_MODEL]: createScriptedAgent({
        workbench,
        layout,
        view,
        appearance,
        scheduler: browserScheduler,
      }),
      [LIVE_MODEL]: createLlmAgent({
        workbench,
        layout,
        view,
        appearance,
        transport: createHttpTransport(),
        modelLabel: 'Language model',
        storage,
      }),
    },
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [core] = useState(createCoreServices)
  const appearancePreference = useSyncExternalStore(
    core.appearanceController.subscribe,
    core.appearanceController.getPreference,
  )
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const [basemapEnabled, setBasemapEnabledState] = useState(() =>
    readBasemapPreference(core.storage),
  )
  const appearance = resolveAppearance(appearancePreference, systemDark)
  const [workedSurface, setWorkedSurface] = useState<WorkedSurface>(null)
  const [datasetId, setDatasetId] = useState<DatasetId>(DEFAULT_DATASET_ID)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [agentModel, setAgentModelState] = useState(
    () => loadAgentModel(core.storage) ?? SCRIPTED_MODEL,
  )
  const [llmHealth, setLlmHealth] = useState<LlmHealth>({
    available: false,
    model: null,
    reason: null,
  })

  // The live model is only reachable through the dev server, so whether it can
  // be chosen is a run-time fact, not a build-time one (decision 0020).
  useEffect(() => {
    let cancelled = false
    void createHttpTransport()
      .health()
      .then((health) => {
        if (!cancelled) setLlmHealth(health)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DARK_QUERY)
    const update = () => setSystemDark(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Apply before paint so the first frame already shows the chosen appearance.
  useLayoutEffect(() => {
    applyAppearance(appearance)
  }, [appearance])

  useEffect(
    () => startTaskSimulator(core.workbench, { scheduler: browserScheduler }),
    [core.workbench],
  )

  // Suggestions should describe the place in front of you, not a fixed list.
  useEffect(() => {
    core.agents[LIVE_MODEL]?.setPresets(
      getDataset(datasetId).questions.map((question) => ({
        ...question,
        description: '',
      })),
    )
  }, [core.agents, datasetId])

  const services = useMemo<Services>(() => {
    const agentModels = modelOptions(llmHealth)
    const chosen = agentModels.find((option) => option.id === agentModel)
    // A model that stopped being available must not keep driving the agent.
    const activeModel =
      chosen && chosen.unavailableReason === null ? agentModel : SCRIPTED_MODEL
    return {
      ...core,
      dataset: getDataset(datasetId),
      datasets: DATASETS,
      datasetLoading,
      openDataset: async (id) => {
        setDatasetLoading(true)
        try {
          const dataset = getDataset(id)
          const { state } = await loadDataset(dataset)
          core.workbench.load(state, {
            type: 'project.openDataset',
            title: 'Open dataset',
            input: { dataset: id },
            summary: `Opened "${dataset.name}". ${dataset.stateLabel}.`,
          })
          // A different district is a different project, so a view of the old
          // one and a conversation about it would both be stale.
          core.view.reset()
          for (const agent of Object.values(core.agents)) agent.clear()
          setDatasetId(id)
        } finally {
          setDatasetLoading(false)
        }
      },
      agent: core.agents[activeModel] ?? core.agents[SCRIPTED_MODEL]!,
      agentModel: activeModel,
      agentModels,
      setAgentModel: (id) => {
        const option = agentModels.find((candidate) => candidate.id === id)
        if (!option || option.unavailableReason !== null) return
        setAgentModelState(id)
        saveAgentModel(core.storage, id)
        core.workbench.record({
          type: 'agent.setModel',
          title: 'Set the agent model',
          input: { model: id },
          summary:
            id === SCRIPTED_MODEL
              ? 'The agent replays scripted sessions.'
              : `The agent is driven by ${option.label}, which receives a summary of this project.`,
        })
      },
      appearancePreference,
      appearance,
      setAppearance: (next) => core.appearanceController.set(next),
      basemapEnabled,
      setBasemapEnabled: (enabled) => {
        setBasemapEnabledState(enabled)
        storeBasemapPreference(core.storage, enabled)
        core.workbench.record({
          type: 'view.setBasemap',
          title: 'Show or hide basemap',
          input: { enabled },
          summary: enabled
            ? 'The Map shows the OpenFreeMap basemap.'
            : 'The Map shows footprints on a plain background.',
        })
      },
      showInspection: (source = 'manual') => {
        if (!core.layout.isPanelOpen('inspection')) {
          core.layout.togglePanel('inspection', source)
        }
      },
      workedSurface,
      claimWorked: (surface) => setWorkedSurface(surface),
    }
  }, [
    core,
    appearancePreference,
    appearance,
    basemapEnabled,
    workedSurface,
    agentModel,
    llmHealth,
    datasetId,
    datasetLoading,
  ])

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) {
    throw new Error('useServices must be used inside WorkbenchProvider')
  }
  return services
}

/** The appearance actually shown, including its data palette for canvas renderers. */
export function useAppearance(): Appearance {
  return useServices().appearance
}

export function useWorkbenchSnapshot<T>(
  selector: (snapshot: WorkbenchSnapshot) => T,
): T {
  return useStore(useServices().workbench.store, selector)
}

/** Reads logged view state (map, table, dashboard). */
export function useViewState<T>(selector: (view: ViewState) => T): T {
  return useStore(useServices().view.store, selector)
}

/** Reads the agent's status, transcript, and prepared sessions. */
export function useAgentSnapshot<T>(
  selector: (snapshot: AgentSnapshot) => T,
): T {
  return useStore(useServices().agent.store, selector)
}

export function useStageStates() {
  const workflow = useWorkbenchSnapshot((snapshot) => snapshot.state.workflow)
  const tasks = useWorkbenchSnapshot((snapshot) => snapshot.state.tasks)
  return useMemo(() => deriveStageStates(workflow, tasks), [workflow, tasks])
}

/** Re-renders the caller whenever the FlexLayout model changes. */
export function useLayoutVersion(): number {
  const { layout } = useServices()
  return useSyncExternalStore(layout.subscribe, layout.getVersion)
}
