import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'

// AG Grid Community only (decision 0007). Registered once for the app.
ModuleRegistry.registerModules([AllCommunityModule])

/** Quartz with its parameters mapped to workbench tokens, so both themes follow the app. */
export const workbenchGridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--color-surface)',
  foregroundColor: 'var(--color-text)',
  borderColor: 'var(--color-border)',
  headerBackgroundColor: 'var(--color-surface-raised)',
  oddRowBackgroundColor: 'var(--color-bg)',
  rowHoverColor: 'var(--color-surface-raised)',
  selectedRowBackgroundColor: 'var(--color-selected-bg)',
  accentColor: 'var(--color-accent)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  rowHeight: 30,
  headerHeight: 32,
  wrapperBorderRadius: 0,
})
