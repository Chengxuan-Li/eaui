import type { CommandSource } from '../../domain/types.ts'
import type { Workbench } from '../../domain/workbench.ts'
import {
  readAppearancePreference,
  storeAppearancePreference,
} from '../theme.ts'
import { APPEARANCES, type AppearancePreference } from './appearances.ts'

// Appearance is view state, so it lives beside the layout controller and the
// view store rather than in React: the agent drives it through the same logged
// path a person uses (decision 0020). React subscribes with useSyncExternalStore.

export type AppearanceController = {
  getPreference: () => AppearancePreference
  /** Records the change in the operation log with its source, as layout does. */
  set: (preference: AppearancePreference, source?: CommandSource) => void
  subscribe: (listener: () => void) => () => void
}

export function appearanceSummary(preference: AppearancePreference): string {
  return preference === 'system'
    ? 'Appearance follows the system light or dark setting.'
    : `Appearance set to ${APPEARANCES[preference].label}.`
}

export function createAppearanceController(
  workbench: Workbench,
  storage: Storage | null,
): AppearanceController {
  let preference = readAppearancePreference(storage)
  const listeners = new Set<() => void>()

  return {
    getPreference: () => preference,

    set: (next, source = 'manual') => {
      preference = next
      storeAppearancePreference(storage, next)
      workbench.record({
        type: 'view.setAppearance',
        title: 'Set appearance',
        input: { appearance: next },
        source,
        summary: appearanceSummary(next),
      })
      for (const listener of listeners) listener()
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
