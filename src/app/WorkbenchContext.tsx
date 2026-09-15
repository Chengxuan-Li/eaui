import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useStore } from 'zustand'
import { browserScheduler, startTaskSimulator } from '../domain/simulator.ts'
import {
  createWorkbench,
  type Workbench,
  type WorkbenchSnapshot,
} from '../domain/workbench.ts'
import { deriveStageStates } from '../domain/workflow.ts'
import {
  createLayoutController,
  type LayoutController,
} from './layout/layoutController.ts'
import { loadProject } from './persistence.ts'
import { getBrowserStorage } from './storage.ts'
import {
  applyThemePreference,
  readThemePreference,
  storeThemePreference,
  type ThemePreference,
} from './theme.ts'

type CoreServices = {
  storage: Storage | null
  workbench: Workbench
  layout: LayoutController
}

export type Services = CoreServices & {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

const ServicesContext = createContext<Services | null>(null)

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
  }
  return {
    storage,
    workbench,
    layout: createLayoutController(workbench, storage),
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [core] = useState(createCoreServices)
  const [theme, setThemeState] = useState(() =>
    readThemePreference(core.storage),
  )

  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])

  useEffect(
    () => startTaskSimulator(core.workbench, { scheduler: browserScheduler }),
    [core.workbench],
  )

  const services = useMemo<Services>(
    () => ({
      ...core,
      theme,
      setTheme: (next) => {
        setThemeState(next)
        storeThemePreference(core.storage, next)
        core.workbench.record({
          type: 'view.setTheme',
          title: 'Set theme',
          input: { theme: next },
          summary: `Theme set to ${next}.`,
        })
      },
    }),
    [core, theme],
  )

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

export function useWorkbenchSnapshot<T>(
  selector: (snapshot: WorkbenchSnapshot) => T,
): T {
  return useStore(useServices().workbench.store, selector)
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
