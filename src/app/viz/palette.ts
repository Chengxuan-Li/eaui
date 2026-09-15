// Chart and map colors from the dataviz reference palette. Categorical slots
// are assigned in fixed order and validated with the dataviz validator against
// the workbench surfaces (light #ffffff, dark #1d2126); see
// docs/first-slice-proposal.md for the validation record.

export type ResolvedTheme = 'light' | 'dark'

export const CATEGORICAL: Record<ResolvedTheme, readonly string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a'],
  dark: ['#3987e5', '#d95926', '#199e70'],
}

/** De-emphasis gray for the baseline when scenarios are the story. */
export const DEEMPHASIS: Record<ResolvedTheme, string> = {
  light: '#898781',
  dark: '#898781',
}

/**
 * Sequential blue ramp, low to high. In dark mode the anchor flips so values
 * near zero recede toward the dark surface.
 */
export const SEQUENTIAL_BLUE: Record<ResolvedTheme, readonly string[]> = {
  light: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'],
  dark: ['#104281', '#1c5cab', '#2a78d6', '#6da7ec', '#cde2fb'],
}

export const NO_DATA: Record<ResolvedTheme, string> = {
  light: '#d5dae1',
  dark: '#3a3f47',
}

export const CHART_INK: Record<
  ResolvedTheme,
  {
    primary: string
    secondary: string
    muted: string
    grid: string
    axis: string
    surface: string
  }
> = {
  light: {
    primary: '#1b1f24',
    secondary: '#52514e',
    muted: '#5b6573',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    surface: '#ffffff',
  },
  dark: {
    primary: '#e6e9ed',
    secondary: '#c3c2b7',
    muted: '#9aa4b1',
    grid: '#2c2c2a',
    axis: '#383835',
    surface: '#1d2126',
  },
}

/** Status colors are reserved for state and always ship with an icon and label. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
} as const
