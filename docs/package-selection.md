# Package selection proposal

Date: 2026-09-14

Status: accepted in [decision 0007](decisions/0007-package-selection.md) on 2026-09-14. After the [spike results](#spike-results-2026-09-14), [decision 0008](decisions/0008-flexlayout-docking.md) replaced dockview with FlexLayout for docking. Scope inputs: decisions [0002](decisions/0002-web-react-typescript-vite.md), [0004](decisions/0004-workbench-layout-and-docking.md), and [0006](decisions/0006-scripted-agent-and-layout-details.md), plus the [first-slice proposal](first-slice-proposal.md).

## Method and evidence limits

- Four read-only research passes on 2026-09-14 consulted official docs, project repositories, and the npm registry. Nothing was installed or cloned.
- Spot check on 2026-09-14 with `npm view <package> version license`: versions and licenses in the tables below match the registry for dockview-react, ag-grid-community, @vis.gl/react-maplibre, maplibre-gl, @xyflow/react, echarts, zod, zustand, immer, react-aria-components, typescript, vite, @vitejs/plugin-react, vitest, and typescript-eslint. `typescript-eslint` 8.70.0 declares peer `typescript >=4.8.4 <6.1.0`, while `typescript` `latest` is 7.0.2.
- Other facts (feature lists, accessibility statements, issue states) come from the research passes and are cited with primary URLs. They were not independently re-verified. Items marked **spike** must be proven in code before the dependent feature is built.
- Local machine: Node.js v24.14.1, npm 11.11.0; pnpm is not installed.

## Recommendations

| Concern | Recommended (version checked) | License | Fallback | Main reason |
| --- | --- | --- | --- | --- |
| Toolchain | react/react-dom 19.3.0, vite 8.3.0, @vitejs/plugin-react 6.1.1, TypeScript ~6.0 | MIT / Apache-2.0 | none | Official `react-ts` template; pin TypeScript 6.0 because typescript-eslint does not support TypeScript 7 yet |
| Runtime | Node.js 24 LTS, npm | n/a | Node 22.12+ | Vitest 5 requires Node 22.12+; Node 20 is end of life ([schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)) |
| Docking | flexlayout-react 0.11.0 (decision 0008; replaced dockview-react 8.3.1) | MIT | dockview free core plus a custom keyboard layer | Spikes: keyboard splitter resizing, ARIA tabs and separators, remappable tabset navigation, mounted hidden tabs, JSON layouts with borders |
| Map | maplibre-gl 6.9.1 + @vis.gl/react-maplibre 8.1.3 | BSD-3-Clause / MIT | OpenLayers (ol) 10.10.0 | No token, GeoJSON sources, feature-state highlighting, data-driven styles, extrusion, keyboard pan/zoom |
| Workflow graph | @xyflow/react 12.11.6 + @dagrejs/dagre 3.1.1 (Roadmap); plain accessible HTML list/tree (compact left view) | MIT | elkjs layout (EPL-2.0 or GPL-3.0) | React node components, built-in focus/ARIA; compact view reads better and is more accessible as HTML |
| Table | ag-grid-community + ag-grid-react 36.1.0 | MIT | @tanstack/react-table v9 + react-aria-components Table | Only candidate with documented ARIA grid, keyboard navigation, editors, filters, and column state in a free tier |
| Charts | echarts 6.1.0 (modular imports, thin in-house wrapper) | Apache-2.0 | vega-lite + vega-embed | Canvas, LTTB sampling for 8,760-point series, treemap/Sankey, JSON-like options |
| Contracts and validation | zod 4.6.5 | MIT | valibot | Native JSON Schema export (future agent tools, OpenAPI mirroring), `flattenError` for forms |
| State | zustand 5.0.15 (vanilla store) + immer 11.1.18 patches | MIT | @reduxjs/toolkit | One `execute(command)` path; patches give undo and provenance; testable without React; devtools |
| State machines | none; typed transition tables | n/a | xstate | Stage and task states are small enums; revisit if orchestration gains retries or timeouts |
| UI primitives | react-aria-components 1.21.1 | Apache-2.0 | none chosen | Only candidate with an accessible Tree (asset panel); also combobox, toolbar, tabs, slider, dialog |
| Command palette | built from react-aria Autocomplete + Menu in a Dialog | Apache-2.0 | cmdk | Avoids a second component stack; results come from the shared command registry |
| Transcript | typed transcript items rendered by our components; react-markdown 10.1.0 + remark-gfm for prose only | MIT | markdown-to-jsx | Tool calls, reasoning, and references are structured data, not markdown; no raw HTML |
| Icons | lucide-react | ISC | none | Typed tree-shakable components; codicons requires attribution and ships as a font |
| Typeface (added 2026-09-15, decision 0010) | @fontsource-variable/geist 5.3.0 (monospace stays Cascadia Code, so no Geist Mono) | OFL-1.1 | `geist` 1.7.2 (Vercel; Next.js oriented, 8.0 MB unpacked); Google Fonts CDN rejected | Self-hosted variable WOFF2 bundled by Vite, subset loading by `unicode-range`, 181 kB unpacked, no runtime network |
| Styling | CSS Modules + CSS custom-property tokens (built into Vite) | n/a | Tailwind CSS 4 | No dependency; light/dark via `[data-theme]` and density tokens suit a dense workbench |
| Tests | vitest 5.0.0, @testing-library/react, @testing-library/user-event, @playwright/test, @axe-core/playwright | MIT / Apache-2.0 / MPL-2.0 | none | Store/command tests without a browser; keyboard, layout, and axe checks in a real browser |
| Lint/format | eslint 10 flat config + typescript-eslint + eslint-plugin-react-hooks + prettier | MIT | Biome | Type-aware rules (for example unhandled promises in command handlers); replaces the template's oxlint deliberately |
| Routing | none in slice 1 | n/a | revisit | Docking tabs replace page routes; layout JSON persists locally; the reference host has no SPA fallback |

## Constraints the recommendations carry

- **Docking (decision 0008):**
  - Pin flexlayout-react exactly; it is pre-1.0 and 0.11.0 contained breaking changes. Keep layout changes behind our typed layout commands.
  - Panels that must keep state (map, charts) render with `enableRenderOnDemand: false`.
  - Side panels are left and right borders. Keyboard docking (moving a tab to another tabset) is not documented, so the command palette provides it through `Actions.moveNode`.
  - One docking model owns the whole main area including side panels. Only the ribbon, side (activity) bar, and status bar sit outside it, and they act on it through typed commands.
- **Map:**
  - Default to no basemap. Token-free basemaps (OpenFreeMap, self-hosted Protomaps) can be added later with their attribution terms. Amended on 2026-09-15 by [decision 0012](decisions/0012-openfreemap-basemap-back-bay.md): the Map page shows the public OpenFreeMap basemap, recolored from appearance tokens, with a plain-background fallback and a Settings toggle. No package was added.
  - The canvas is not screen-reader accessible, so the linked table is the accessible equivalent.
- **Workflow graph:** React Flow arrow keys move nodes. The read-only Roadmap disables node dragging and provides graph navigation ([accessibility](https://reactflow.dev/learn/advanced-use/accessibility)).
- **Table:**
  - AG Grid's batch editing is Enterprise. Pending edits, validation, and apply/cancel live in our command store.
  - Column visibility needs our own menu.
  - AG Grid documents screen-reader conflicts with virtualization ([accessibility](https://www.ag-grid.com/react-data-grid/accessibility/)).
- **Charts:**
  - ECharts documents no keyboard navigation ([aria](https://echarts.apache.org/handbook/en/best-practices/aria/)). Every chart gets an app-rendered data table and keyboard controls.
  - Saved views use our own JSON view schema (validated by zod) that compiles to ECharts options, without function formatters.
- **UI primitives:** react-aria-components has no Menubar. The ribbon menubar is built from Toolbar + Menu and tested against the [WAI-ARIA menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).

## Spikes before feature work

1. **dockview:**
   - keyboard sash resizing (undocumented);
   - issue [#1012](https://github.com/mathuo/dockview/issues/1012) (titlebar buttons not keyboard focusable);
   - a MapLibre canvas and an ECharts chart surviving hide, move, and maximize under the `always` renderer.
2. **MapLibre:**
   - a style containing only GeoJSON sources (no basemap);
   - resize when a docked panel changes size or becomes visible.
3. **AG Grid Community:**
   - keyboard navigation and theming inside a docked panel;
   - pending edits held outside the grid.
4. **React Flow:** read-only Roadmap keyboard navigation with dragging disabled.

Spike 1 failed on keyboard focus and resizing, so flexlayout-react was evaluated with the same tests and adopted in decision 0008.

## Rejected or deferred candidates

- **Docking:** dockview-react (free core lacks keyboard navigation and keyboard resizing; enterprise modules are commercial; see spike results); rc-dock (latest tag is an alpha, no accessibility documentation); react-mosaic-component (tiling without maximize or popouts, heavy react-dnd dependency tree); golden-layout (no release since 2022, no React bindings); @lumino/widgets (React embedding only through JupyterLab packages).
- **Map:** deck.gl (a second rendering stack beyond need); Leaflet with react-leaflet (no WebGL extrusion, core release line stalled at 1.9.4 versus a 2.0 alpha, react-leaflet under Hippocratic-2.1 license).
- **Graph:** cytoscape with react-cytoscapejs (wrapper last published 2022, canvas nodes without keyboard accessibility).
- **Table:** glide-data-grid (latest stable 2024, React 19 only in prerelease).
- **Charts:**
  - Plotly (about 1.4 MB gzipped minified bundle, open accessibility work); kept only if Sankey/treemap fidelity later outweighs size.
  - Observable Plot (no release in 19 months, no Sankey); Recharts (JSX rather than serializable specs, no Sankey); visx (too low-level for agent-authored specs).
- **State:** Jotai (atom-level state disperses the single command log).
- **UI primitives:** Radix, Base UI, Ariakit (menubar but no accessible tree; adding one would mean two primitive libraries).

## Scaffold outline after acceptance

- Create the app in the repository root with `npm create vite@latest` using the `react-ts` template; npm and its lockfile are tracked.
- Add only the accepted packages at pinned versions.
- Update `AGENTS.md`, `README.md`, and `.gitignore` with verified install, dev, build, test, lint, and preview commands.
- Run the spikes first and record results here before panels are built.

## Supporting development dependencies

Installed on 2026-09-14 alongside the accepted tools because those tools require them. No runtime dependency outside decision 0007 was added.

- `jsdom`: DOM environment for Vitest component tests.
- `@testing-library/dom`: peer dependency of `@testing-library/react`.
- `@eslint/js`, `globals`, `eslint-config-prettier`: ESLint flat configuration and Prettier compatibility.
- `@types/node`, `@types/react`, `@types/react-dom`: type definitions.
- `flexlayout-react` 0.11.0 was first installed as a development dependency for the fallback spike and moved to runtime dependencies by decision 0008.

## Spike results (2026-09-14)

Environment: Windows 11, Node.js 24.14.1, Microsoft Edge through the Playwright `msedge` channel at 1280x800, Vite dev server, synthetic data only.

- Spike pages: `src/spikes/`. Run `npm run dev` and open `/?spike=` with `map`, `chart`, `grid`, `flow`, or `flexlayout`.
- Tests: `e2e/spikes.spec.ts` and `e2e/spikes-flexlayout.spec.ts`, run by `npm run test:e2e`. The comparison run passed 20 tests, with the 2 dockview keyboard findings marked as expected failures. After decision 0008 the dockview spike code and tests were removed; its rows below remain as evidence.

| Spike | Requirement | Result |
| --- | --- | --- |
| MapLibre | Style with only GeoJSON sources, no basemap or token | Pass: 930 rendered building features for 900 footprints, no request outside 127.0.0.1 |
| MapLibre | Canvas follows container resize | Pass |
| MapLibre | Runs under the Vite dev server | Fixed: dependency pre-bundling moved `maplibre-gl` without its worker module (404 for `maplibre-gl-worker.mjs`). `optimizeDeps.exclude: ['maplibre-gl']` in `vite.config.ts` resolves it. |
| AG Grid Community | ARIA grid with arrow-key cell focus | Pass: `role="grid"`; ArrowDown moves the focused cell |
| AG Grid Community | Pending edits outside the grid, cancel, validation | Pass with `readOnlyEdit` and `onCellEditRequest`: edits live in app state, cancel restores values, an invalid value shows an alert and adds no pending edit |
| React Flow | Read-only roadmap keyboard behavior | Pass: nodes are focusable labeled `group` elements, Tab moves to the next node, arrow keys do not move nodes with `nodesDraggable={false}` |
| dockview 8.3.1 (free core) | Map and chart survive hide, move, and maximize | Pass with `defaultRenderer="always"`: no remounts, WebGL context intact, canvas resized |
| dockview | JSON round trip including edge groups | Pass (7 panels) |
| dockview | Table-to-map linked selection | Pass |
| dockview | ARIA tabs | Pass: 4 tablists, 7 tabs |
| dockview | Keyboard focus between groups (F6) | **Fail**: the `keyboardNavigation` option logs that it requires the KeyboardNavigation module from dockview-enterprise |
| dockview | Keyboard resizing | **Fail**: 6 sash elements, none with the `separator` role or keyboard resizing |
| dockview | axe | Serious `nested-interactive` (4 nodes, controls inside tabs), serious `color-contrast` (1), moderate `landmark-unique` (1) |
| flexlayout-react 0.11.0 | Map and chart survive hide, move, and maximize | Pass with `tabEnableRenderOnDemand: false`: mount counts unchanged, WebGL context intact, canvas resized |
| FlexLayout | JSON round trip including borders | Pass (7 tabs; left and right borders) |
| FlexLayout | Table-to-map linked selection | Pass |
| FlexLayout | ARIA tabs and splitters | Pass: 4 tablists, 7 tabs, 3 `separator` elements |
| FlexLayout | Keyboard resizing | Pass: all 3 separators resize with arrow keys and update `aria-valuenow` |
| FlexLayout | Arrow keys between tabs; F6 to the next tabset | Pass: F6 bound through `keyMap` moves focus from the Map tabset to the Dashboard chart tabset |
| FlexLayout | axe | Serious `color-contrast` (3 nodes) only |

The color-contrast findings come from library default themes and spike styling; the product theme tokens must resolve them.

### Corrections to the research record

- **dockview keyboard navigation is not in the free core in 8.3.1.** The research pass reported it as core. Observed instead:
  - `dockview-core` lists these enterprise modules in `ENTERPRISE_MODULE_NAMES` (`node_modules/dockview-core/dist/dockview-core.js`): AdvancedOverflow, AutoEdgeGroup, AutoHideEdgeGroup, DndCompass, KeyboardDocking, KeyboardNavigation, LayoutHistory, License, MultiRowTabs, PinnedTabs, SmartGuides.
  - The registry lists `dockview-enterprise` 8.3.1 with license "SEE LICENSE IN LICENCE.md". Its commercial terms were not reviewed.
- **FlexLayout keeps hidden tab content mounted** when `tabEnableRenderOnDemand` is false. This resolves the open question in the fallback row.

### Docking recommendation (accepted in decision 0008)

Replace dockview with **flexlayout-react 0.11.0** (MIT, no runtime dependencies) as the docking library. In these spikes it met every docking requirement, including keyboard resizing and tabset focus navigation that dockview's free core lacks, and it produced fewer axe findings.

Risks carried:

- **Pre-1.0 versioning with breaking changes.** Pin the exact version and keep layout changes behind our own typed layout commands.
- **No documented keyboard docking.** Moving a tab to another tabset from the keyboard would be provided by our command palette through `Actions.moveNode`.

Alternatives:

- **Keep dockview's free core** and build keyboard navigation and keyboard resizing ourselves on its API (more custom accessibility code).
- **License dockview-enterprise** (commercial terms not reviewed).

Accepted on 2026-09-14 ([decision 0008](decisions/0008-flexlayout-docking.md)): `flexlayout-react` moved to runtime dependencies, `dockview-react` and the dockview spike were removed, and the FlexLayout spike tests remain the docking regression baseline.
