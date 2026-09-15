import { useEffect, useRef } from 'react'
import type { AppAction } from './actions.ts'
import { isEditableTarget, matchesShortcut } from './shortcuts.ts'

export function useShortcuts(
  actions: AppAction[],
  invoke: (action: AppAction) => void,
): void {
  const latest = useRef({ actions, invoke })

  useEffect(() => {
    latest.current = { actions, invoke }
  }, [actions, invoke])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      const editable = isEditableTarget(event.target)
      for (const action of latest.current.actions) {
        const shortcuts = [
          ...(action.shortcut ? [action.shortcut] : []),
          ...(action.alternateShortcuts ?? []),
        ]
        if (!shortcuts.some((shortcut) => matchesShortcut(event, shortcut))) {
          continue
        }
        if (editable && !action.allowInEditable) return
        event.preventDefault()
        latest.current.invoke(action)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
