# Design alignment

Date: 2026-09-15

Aligns the build with the [UI design guidelines](20260915_energyatlas_ui_design_guidelines.md) ([decision 0009](decisions/0009-ui-design-guidelines.md)) and the Geist typeface ([decision 0010](decisions/0010-geist-typeface.md)). The user accepted the plan below through their answers on 2026-09-15, and implementation is in progress. The observed gaps describe the build before alignment.

## Observed gaps

Facts from the source at `88b08c9` (end of first-slice stage 3c). Counts come from text search.

| Guideline section | Build before alignment | Source |
| --- | --- | --- |
| 1. Boundaries | 91 `border` or `border-*` declarations across 11 CSS modules: shell 17, forms 16, components 13, dashboard 11, map 10, roadmap 9, and at most 4 in each of the rest. | `src/app/**/*.module.css` |
| 2. Typography | Seven font sizes: `0.75rem` (15 uses), `0.8125rem` (12), `0.875rem` (6), `1rem` (6), `0.9375rem` (1), `1.375rem` (1), and `var(--font-size-base)` (3). Font stack: `system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`; monospace `'Cascadia Code', Consolas, ui-monospace, monospace`. FlexLayout and AG Grid read `var(--font-sans)` (AG Grid at 13px); ECharts hard-codes `system-ui, "Segoe UI", sans-serif` in two places. | `src/app` CSS, `src/index.css:19`, `src/app/layout/flexlayout-theme.css:4`, `src/app/grid/agGrid.ts:20`, `src/app/pages/dashboardCharts.ts:84`, `src/app/pages/dashboardCharts.ts:161` |
| 3. Charts | A legend for two or more series. Line end labels and the y-axis name were removed in the stage 3c review because they collided. No annotation of peaks, thresholds, or scenario divergence. | `src/app/pages/dashboardCharts.ts` |
| 4. Palettes | One data palette (categorical blue, orange, green; sequential blue; status green, amber, red). The theme preference is system, light, or dark. | `src/app/viz/palette.ts`, `src/app/theme.ts` |
| 5. Cross-view color | Map ramp, chart slots, and status colors come from `palette.ts`, and the AG Grid theme derives from CSS tokens. The map background is hard-coded (`#f5f6f8` light, `#15181c` dark). Badge tones are CSS classes independent of `palette.ts`. | `src/app/pages/MapPage.tsx:44`, `src/app/grid/agGrid.ts`, `src/app/components/StateBadge.tsx` |
| 6. Map | No basemap. Buildings use the sequential blue ramp with a no-data color, plus a grid overlay. No diverging scale. | `src/app/pages/MapPage.tsx` |
| 7. Legend | Absolutely positioned group with a 1px border, medium radius, `min-width: 14rem`, a title, the ramp, and a no-data row. | `src/app/pages/map.module.css:58` |
| 8. Status | Stage labels: Not started, Ready, Running, Done, Skipped, Blocked, Failed, Stale, Unavailable; each has an icon and a colored tone. Capability labels Working, Simulated, Planned. State and capability badges render in 10 product files. | `src/app/components/StateBadge.tsx:23`, `src/app/components/CapabilityBadge.tsx:11` |
| 9. Run action | Ribbon quick button "Run current stage" (Ctrl+Enter). "Run next ready stage" exists in the Run group of the action registry. No split button. | `src/app/actions.ts:289`, `src/app/actions.ts:306`, `src/app/shell/Ribbon.tsx:22` |
| 10. Right surface | The right border holds a Reasoning placeholder only. No Inspection mode; selection details appear in the Assets panel details region. | `src/app/shell/WorkbenchShell.tsx:95`, `src/app/panels/AssetsPanel.tsx` |

## Decisions from discussion (2026-09-15)

1. **Scope and sequencing.** Implement every guideline except the scripted agent, before stage 4: Geist, type scale, borders, semantic color tokens, status vocabulary, capability disclosure, map and legend, chart scaffolding and selective annotation, Run ▾, curated palettes, and the Reasoning | Inspection surface with a read-only inspector.
2. **Capability disclosure.** The user agreed that the original section 8 conflicted with honest prototyping and amended it: working behavior carries no label, Planned is a normal state, Simulated is disclosed once per surface, and one complete overview stays in Settings.
3. **Palettes.** The user asked for "4 named palettes + light + dark". This is read as six appearance choices:
   - Light and Dark: the existing palettes, restyled to the guidelines;
   - technical monochrome, Lieflat-inspired, clean technical light, and dark engineering.

   System follows the operating system between Light and Dark. If the user meant each named palette in both modes, the token structure keeps that addition possible.
4. **Monospace.** Cascadia Code stays, with Consolas and system fallbacks; no Geist Mono.
5. **Run ▾ variants.** Only the two variants that exist: run current stage and run next ready stage.

## Plan

- **Semantic color layer.** One token set for surfaces, text, accent, value ramps, categories, state, selection, hover, warning, and missing data. Each appearance fills it. Map, charts, grid, workflow graphics, and status read only these tokens, never literals. Each appearance's categorical slots are validated with the dataviz validator.
- **Typeface.**
  - Install `@fontsource-variable/geist` 5.3.0 pinned exactly and import it once in `src/main.tsx`.
  - Set `--font-sans` to `'Geist Variable'`, then explicit CJK fallbacks (`'Microsoft YaHei'`, `'PingFang SC'`, `'Noto Sans CJK SC'`), then the system stack. `--font-mono` stays Cascadia Code.
  - ECharts reads the resolved `--font-sans` value and redraws once `document.fonts.ready` resolves, because canvas text does not reflow when a web font arrives.
  - Use tabular numerals in the table, stat tiles, meters, and legends if Geist provides them.
  - An e2e check confirms `document.fonts.check('1em "Geist Variable"')` after load.
- **Type scale.** Three sizes: metadata, content and controls, and pane or page titles. Hierarchy otherwise comes from weight, tone, and spacing.
- **Borders.** Keep borders on docked pane edges, tab strips, inputs, and the table grid. Internal cards, metric tiles, legends, and control groups use spacing and a quiet surface tone instead.
- **Status vocabulary.** Done becomes Complete, Stale becomes Outdated, and Unavailable becomes Planned. Not started, Ready, Skipped, Blocked, Running, and Failed stay. Not started, Ready, Complete, and Skipped use quiet text and an icon; color emphasis goes to Running, Failed, Outdated, Blocked, and warnings.
- **Capability disclosure.** Remove Working badges. Planned stays as a state on unavailable controls. Each page that shows simulated values carries one quiet Simulated note. The capability table stays in Settings.
- **Appearances.** A Settings choice with System, Light, Dark, and the four named palettes, persisted like the current theme preference. Each appearance declares whether it is light or dark, so `color-scheme`, the AG Grid theme, and map and chart colors follow it.
- **Map and legend.** Background, footprints, no-data color, grid overlay, selection, and hover come from the active appearance. The legend becomes a compact, borderless instrument with units and an explicit no-data entry.
- **Charts.** Quiet gridlines and axes from tokens. Keep a legend by default; annotate at most one or two notable points (peak month, largest scenario difference) and use direct labels only where they do not collide.
- **Run ▾.** A split button in the ribbon: the primary part runs the current stage, and the menu lists the two existing variants. It stays keyboard reachable and explains when it cannot run.
- **Contextual surface.** One right-side panel with a keyboard-accessible Reasoning | Inspection mode switch.
  - Reasoning keeps the stage 4 placeholder.
  - Inspection shows the shared selection read-only: properties, results, warnings, linked objects, relevant actions, and provenance.
  - The mode is logged view state, so the agent can switch it later.

## Implementation status

In progress. Stages and verification evidence are added here as they are committed.
