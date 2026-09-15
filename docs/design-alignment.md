# Design alignment review

Date: 2026-09-15

Compares the build at commit `88b08c9` (end of first-slice stage 3c) with the [UI design guidelines](20260915_energyatlas_ui_design_guidelines.md) accepted in [decision 0009](decisions/0009-ui-design-guidelines.md). Observed facts, recommendations, and open questions are kept apart. Nothing here is implemented, and nothing beyond decisions 0009 and [0010](decisions/0010-geist-typeface.md) (Geist typeface, added the same day) is accepted.

## Observed gaps

Facts from the source at `88b08c9`. Counts come from text search and have not yet been reviewed visually.

| Guideline section | Current build | Source |
| --- | --- | --- |
| 1. Boundaries | 91 `border` or `border-*` declarations across 11 CSS modules: shell 17, forms 16, components 13, dashboard 11, map 10, roadmap 9, and at most 4 in each of the rest. Pane boundaries have not yet been separated from internal boxes. | `src/app/**/*.module.css` |
| 2. Typography | Seven font sizes: `0.75rem` (15 uses), `0.8125rem` (12), `0.875rem` (6), `1rem` (6), `0.9375rem` (1), `1.375rem` (1), and `var(--font-size-base)` (3). Font stack: `system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`; monospace `'Cascadia Code', Consolas, ui-monospace, monospace`. FlexLayout and AG Grid read `var(--font-sans)` (AG Grid at 13px); ECharts hard-codes `system-ui, "Segoe UI", sans-serif` in two places. | `src/app` CSS, `src/index.css:19`, `src/app/layout/flexlayout-theme.css:4`, `src/app/grid/agGrid.ts:20`, `src/app/pages/dashboardCharts.ts:84`, `src/app/pages/dashboardCharts.ts:161` |
| 3. Charts | A legend for two or more series. Line end labels and the y-axis name were removed in the stage 3c review because they collided. No annotation of peaks, thresholds, or scenario divergence. | `src/app/pages/dashboardCharts.ts` |
| 4. Palettes | One data palette (categorical blue, orange, green; sequential blue; status green, amber, red). The theme preference is system, light, or dark. | `src/app/viz/palette.ts`, `src/app/theme.ts` |
| 5. Cross-view color | Map ramp, chart slots, and status colors come from `palette.ts`, and the AG Grid theme derives from CSS tokens. The map background is hard-coded (`#f5f6f8` light, `#15181c` dark). Badge tones are CSS classes that have not been checked against `palette.ts`. | `src/app/pages/MapPage.tsx:44`, `src/app/grid/agGrid.ts`, `src/app/components/StateBadge.tsx` |
| 6. Map | No basemap. Buildings use the sequential blue ramp with a no-data color, plus a grid overlay. No diverging scale. | `src/app/pages/MapPage.tsx` |
| 7. Legend | Absolutely positioned group with a 1px border, medium radius, `min-width: 14rem`, a title, the ramp, and a no-data row. | `src/app/pages/map.module.css:58` |
| 8. Status | Stage labels: Not started, Ready, Running, Done, Skipped, Blocked, Failed, Stale, Unavailable; each has an icon and a colored tone. Capability labels Working, Simulated, Planned. State and capability badges render in 10 product files. | `src/app/components/StateBadge.tsx:23`, `src/app/components/CapabilityBadge.tsx:11` |
| 9. Run action | Ribbon quick button "Run current stage" (Ctrl+Enter). "Run next ready stage" exists in the Run group of the action registry. No split button. | `src/app/actions.ts:289`, `src/app/actions.ts:306`, `src/app/shell/Ribbon.tsx:22` |
| 10. Right surface | The right border holds a Reasoning placeholder only. No Inspection mode; selection details appear in the Assets panel details region. | `src/app/shell/WorkbenchShell.tsx:95`, `src/app/panels/AssetsPanel.tsx` |

## Recommendations

Interpretations for discussion, not accepted.

- **Semantic color layer.** One token set for value ramps, categories, state, selection, hover, warning, and missing data. Each curated palette fills it. Map, charts, grid, workflow graphics, and badges read only these tokens, never literals. Each palette's categorical slots are validated with the dataviz validator.
- **Typeface (accepted in decision 0010).**
  - Install `@fontsource-variable/geist` 5.3.0 pinned exactly and import it once in `src/main.tsx`.
  - Set `--font-sans` to `'Geist Variable'`, then explicit CJK fallbacks (`'Microsoft YaHei'`, `'PingFang SC'`, `'Noto Sans CJK SC'`), then the current system stack.
  - Replace the hard-coded ECharts families with the resolved `--font-sans` value, and redraw charts once `document.fonts.ready` resolves, because canvas text does not reflow when a web font arrives.
  - FlexLayout and AG Grid already read the token. The map's hover label and legend are HTML and inherit it.
  - Use tabular numerals in the table, stat tiles, meters, and legends if Geist provides them; that is not verified yet.
  - Re-screenshot charts, tab strips, and table columns in light and dark mode, since the metrics change.
  - Add an e2e check that `document.fonts.check('1em "Geist Variable"')` passes after load.
- **Type scale.** Three roles: metadata, content and controls, and pane or page titles. Exact values are chosen in the alignment work.
- **Borders.** Keep borders on docked pane edges, tab strips, inputs, and the table grid. Replace borders on internal cards, metric tiles, legends, and control groups with spacing and a quiet surface tone.
- **Status vocabulary.** Done becomes Complete, Stale becomes Outdated, and Unavailable becomes Planned. Not started, Ready, Skipped, Blocked, Running, and Failed stay. Warning is an issue state, not a stage state. Not started, Ready, Complete, and Skipped use quiet text or an icon. Color emphasis goes to Failed, Outdated, Blocked, and warnings.
- **Honest labels.** Drop Working badges, since working is the default. Keep Planned as a semantic state. Disclose Simulated once per surface (a quiet note in the page header or legend, and in Inspection provenance) rather than as repeated pills. Keep the full capability table in Settings.
- **Run ▾.** The primary part runs the current stage. The menu lists only real variants: run current stage and run next ready stage now, and further variants such as running all outdated stages only once commands exist for them.
- **Contextual surface.** One right-side panel with a keyboard-accessible Reasoning | Inspection mode switch. The mode is logged view state, so the agent can switch to Inspection when it references an object. Inspection follows the shared selection.
- **Charts.** Keep a legend by default. Add at most one or two annotations where they explain a result, such as the peak month or the largest scenario difference. Use direct labels only where they do not collide.

## Open questions

1. **Sequencing.** Align the foundations before stage 4, or build stage 4 in the new direction and align the rest afterwards? Recommendation: a short foundation stage first (Geist typeface, semantic tokens, type scale, border reduction, status vocabulary, map and legend tokens), so the new right surface is not built twice. Curated palettes follow stage 4.
2. **Honest labels.** Is the quieter disclosure above acceptable under the handoff's honest-prototyping principle?
3. **Palettes.** Which palette ships first? Are palette and light or dark mode one choice (four named palettes, with system choosing clean technical light or dark engineering) or two independent choices?
4. **Inspection in stage 4.** Recommendation: the mode switch plus a read-only inspector for the selection (properties, results, warnings, linked objects). Editable parameters stay on the Table page for now.
5. **Run ▾ variants.** Ship only the two existing variants first?
6. **Geist Mono.** Replace Cascadia Code and Consolas with Geist Mono for identifiers, code, and the operation log? Recommendation: yes, so monospaced text stays in the same family; it adds `@fontsource-variable/geist-mono` 5.3.0.
