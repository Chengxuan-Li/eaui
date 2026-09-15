type KeyEventLike = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
>

/**
 * Matches shortcuts written like "Ctrl+Shift+Z" or "Alt+1". Ctrl also matches
 * the Command key. Letters and digits match by physical key so Alt and Shift
 * variants work on any keyboard layout.
 */
export function matchesShortcut(
  event: KeyEventLike,
  shortcut: string,
): boolean {
  const parts = shortcut.split('+')
  const key = parts.at(-1) ?? ''
  const wantsCtrl = parts.includes('Ctrl')
  const wantsShift = parts.includes('Shift')
  const wantsAlt = parts.includes('Alt')
  if (
    (event.ctrlKey || event.metaKey) !== wantsCtrl ||
    event.shiftKey !== wantsShift ||
    event.altKey !== wantsAlt
  ) {
    return false
  }
  if (/^[A-Za-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`
  if (/^\d$/.test(key)) return event.code === `Digit${key}`
  return event.key.toLowerCase() === key.toLowerCase()
}

/** aria-keyshortcuts spelling, for example "Control+Shift+Z". */
export function toAriaKeyShortcut(shortcut: string): string {
  return shortcut.replace(/\bCtrl\b/g, 'Control')
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}
