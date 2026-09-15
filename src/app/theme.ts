import {
  CHROME_VARIABLES,
  isAppearanceId,
  type Appearance,
  type AppearancePreference,
  type ChromeTokens,
} from './appearance/appearances.ts'

// The key predates curated appearances; stored "system", "light", and "dark"
// values remain valid appearance preferences.
const THEME_KEY = 'eaui.theme'

export function isAppearancePreference(
  value: unknown,
): value is AppearancePreference {
  return (
    value === 'system' || (typeof value === 'string' && isAppearanceId(value))
  )
}

export function readAppearancePreference(
  storage: Storage | null,
): AppearancePreference {
  try {
    const value = storage?.getItem(THEME_KEY)
    return isAppearancePreference(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function storeAppearancePreference(
  storage: Storage | null,
  preference: AppearancePreference,
): void {
  try {
    storage?.setItem(THEME_KEY, preference)
  } catch {
    // Storage is blocked; the preference applies for this session only.
  }
}

/**
 * Writes the appearance's chrome tokens onto the root element, where they
 * override the light fallback in src/index.css.
 */
export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement
  root.dataset.theme = appearance.scheme
  root.dataset.appearance = appearance.id
  root.style.colorScheme = appearance.scheme
  for (const key of Object.keys(CHROME_VARIABLES) as (keyof ChromeTokens)[]) {
    root.style.setProperty(CHROME_VARIABLES[key], appearance.chrome[key])
  }
}
