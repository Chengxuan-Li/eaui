export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_KEY = 'eaui.theme'

export function readThemePreference(storage: Storage | null): ThemePreference {
  try {
    const value = storage?.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export function storeThemePreference(
  storage: Storage | null,
  preference: ThemePreference,
): void {
  try {
    storage?.setItem(THEME_KEY, preference)
  } catch {
    // Storage is blocked; the preference applies for this session only.
  }
}

/** "system" removes the attribute so prefers-color-scheme decides. */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
}
