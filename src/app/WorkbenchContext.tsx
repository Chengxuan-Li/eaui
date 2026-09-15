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
import {
  createWorkbench,
  type Workbench,
  type WorkbenchSnapshot,
} from '../domain/workbench.ts'
import { deriveStageStates } from '../domain/workflow.ts'
import {
  APPEARANCES,
  resolveAppearance,
  type Appearance,
  type AppearancePreference,
} from './appearance/appearances.ts'
import {
  createLayoutController,
  type LayoutController,
} from './layout/layoutController.ts'
import { loadProject } from './persistence.ts'
import { getBrowserStorage } from './storage.ts'
import {
  applyAppearance,
  readAppearancePreference,
  storeAppearancePreference,
} from './theme.ts'

type CoreServices = {
  storage: Storage | null
  workbench: Workbench
  layout: LayoutController
}

export type Services = CoreServices & {
  /** The stored choice, which may be "system". */
  appearancePreference: AppearancePreference
  /** The appearance actually shown. */
  appearance: Appearance
  setAppearance: (preference: AppearancePreference) => void
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
  }
  return {
    storage,
    workbench,
    layout: createLayoutController(workbench, storage),
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [core] = useState(createCoreServices)
  const [appearancePreference, setAppearancePreference] = useState(() =>
    readAppearancePreference(core.storage),
  )
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const appearance = resolveAppearance(appearancePreference, systemDark)

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

  const services = useMemo<Services>(
    () => ({
      ...core,
      appearancePreference,
      appearance,
      setAppearance: (next) => {
        setAppearancePreference(next)
        storeAppearancePreference(core.storage, next)
        core.workbench.record({
          type: 'view.setAppearance',
          title: 'Set appearance',
          input: { appearance: next },
          summary:
            next === 'system'
              ? 'Appearance follows the system light or dark setting.'
              : `Appearance set to ${APPEARANCES[next].label}.`,
        })
      },
    }),
    [core, appearancePreference, appearance],
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

/** The appearance actually shown, including its data palette for canvas renderers. */
export function useAppearance(): Appearance {
  return useServices().appearance
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
