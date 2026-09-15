# First slice proposal: workflow walking skeleton

Date: 2026-09-14 (revised the same day after discussion)

Status: proposal for discussion. Accepted inputs: [0002](decisions/0002-web-react-typescript-vite.md) web-only React/TypeScript/Vite; [0003](decisions/0003-combined-product-shell.md) combined shell, panels, pages, asset tree; [0004](decisions/0004-workbench-layout-and-docking.md) workbench layout with full docking; [0005](decisions/0005-first-slice-workflow-and-panel-scope.md) workflow sequence, reasoning content, roadmap meaning, first creators; [0006](decisions/0006-scripted-agent-and-layout-details.md) scripted agent and confirmed layout details. Everything else below is a recommendation. Do not scaffold until packages are agreed.

## Goal

A single synthetic project can be taken through the whole 12-stage workflow in the browser. Every required region, panel, and page is present, and every element states honestly whether it works, is simulated, or is planned.

## Layout details (side bar, Roadmap/Dashboard tabs, and status-bar detail tabs confirmed in decision 0006)

- **Side bar:** a narrow icon strip, like the Visual Studio Code activity bar. Each icon switches the left panel between views (Assets, Workflow, Search, and later others). Assets and Workflow can also be shown as stacked, collapsible sections in one view.
- **Middle window:** pages open as tabs. Docking allows splitting the middle window into several tab groups, for example Map beside Table.
- **Roadmap page:** a full-size view of the project-setup workflow graph for planning, while the left Workflow view is its compact form. Both read the same workflow state.
- **Dashboard page:** result charts plus the scenario controls panel (toggles, sliders).
- **Status bar:** clicking issues or background tasks opens an Issues or Tasks tab in the middle window, so detail is available without a fixed bottom panel.
- **Default layout:** restorable from the ribbon and by keyboard command; the user's layout is kept in UI state and is serializable for later View/layout assets.
- **Narrow widths:** side regions collapse to overlays opened from the side bar and ribbon.

## Cross-cutting state model

- **Project document:** typed asset tree with stable IDs, kind, status, and provenance (manual, agent, or stage output, with inputs).
- **Workflow graph:** stages are nodes with dependency edges; the default is the linear 12-stage sequence. Node states: `future`, `ready`, `running`, `executed`, `skipped`, `blocked`, `failed`, `stale`, `unavailable`. The current stage is a focus marker shown over its derived state rather than a state of its own (implemented in `src/domain/workflow.ts`). A stage becomes `stale` when an upstream input changes after it executed. `unavailable` marks planned capability and is never shown as executed (the reference's calibration page marked unimplemented work complete; see the audit). Graph edits (insert, skip, remove) are operations that must keep the graph acyclic. Nodes link their inputs, produced assets, and any reasoning entries that proposed or explained them.
- **Operations:** every mutation (create or edit an asset, run or skip a stage, change a scenario control, apply an approval) is a typed command with validation and a result, appended to an operation log. Manual controls and the agent invoke the same commands; agent tool calls in the reasoning panel link to their log entries, and agent-proposed commands wait for approval.
- **Background tasks:** running stages are tasks with progress, cancellation, and terminal states, shown in the status bar.
- **Selection:** one project-scoped selection shared by assets, map, table, and dashboard. An empty selection stays explicit and never silently widens.
- **UI state:** open tabs, layout, panel sizes, and collapsed regions, kept separate from project state.
- **Capability status:** each feature is **Working** (real behavior over fixture data), **Simulated** (deterministic stand-in for engineering or LLM computation, labeled), or **Planned** (visible, disabled, with an explanation). A single registry drives these labels so the UI cannot drift from the truth.

## Workflow stages and produced assets

| # | Stage | Produces (synthetic) |
| --- | --- | --- |
| 1 | Location setup / footprint capturing | Project location, footprint GIS dataset |
| 2 | Geospatial data enriching | Enriched GIS dataset with added attributes |
| 3 | Schema matching | Schema rules |
| 4 | Geospatial preprocessing | Buildings with cleaned geometry and zones |
| 5 | Shading calculation / PV yield estimation | Shading results, BIPV/PV yield |
| 6 | Archetype modeling | Archetypes and assignments |
| 7 | Baseline model setup | Weather selection, baseline energy model and results |
| 8 | Scenario definitions | Measures, scenarios (working creators) |
| 9 | Scenario modeling | Scenario energy results |
| 10 | Grid definitions | Lines, buses, transformers, utility PV, loads |
| 11 | Grid modeling | Grid results |
| 12 | Dashboard / visualization | Views, report |

Implemented assumption: stage 7 selects synthetic weather and computes baseline results.

## Working, simulated, and planned boundary

| Area | Working | Simulated | Planned (labeled) |
| --- | --- | --- | --- |
| Top ribbon | Menus, save (local project state), search over assets and commands, run current stage, layout reset/toggles, full screen | None | Comments |
| Docking workspace | Tabs, splits, drag-and-drop, resize, collapse, keyboard equivalents, default-layout restore | None | Saving layouts as View assets |
| Status bar | Open project, stage status, issue/notice counts, background task progress | Compute resources | None yet |
| Left panel: Assets | Tree over fixture project, selection, open in page, status/provenance badges, stage outputs appear | Result contents | Gas network, document viewer, custom widgets |
| Left panel: Workflow | Graph/list render, all node states, run/skip/revisit, stale propagation, insert/skip stage | Stage durations and outputs | Free-form graph editing |
| Right panel: Reasoning | Transcript layout for tool calls, reasoning, actions, and referenced links; chat input; prompt presets; approvals that invoke real operations | Agent sessions: scripted replays of realistic tool calls (decision 0006) | Document grounding |
| Map page | Synthetic footprints plus small grid overlay, linked selection, color by one metric | Metric values | Geometry editing, 3D/shading visuals |
| Table page | Buildings, zones, grid elements; sort/filter; linked selection; pending edit with apply/cancel and validation | None | User table import |
| Dashboard page | Baseline vs scenario comparison; scenario controls re-derive outputs | All numbers | Custom widgets, report export |
| Roadmap page | Full workflow graph for project setup, same state as the Workflow view | None | None yet |
| Creator page | Measure and scenario creators with validation | None | Other asset kinds, listed with Planned status |
| Settings page | Units, theme, layout reset | None | Model provider credentials, accounts |

Fixture variants cover empty project, loading, success, warning (missing weather, partial archetype coverage), and error (failed stage, rejected approval, cancelled task).

## Verification plan

- Operation and state tests: graph transitions, stale propagation, acyclicity, approvals, task lifecycle, selection rules.
- Browser checks of the full manual 12-stage workflow without using the agent.
- Keyboard traversal across ribbon, side bar, panels, tabs, and status bar; keyboard docking commands; visible focus.
- Visual checks at 1280x800, 1920x1080, and a narrow width; default and rearranged layouts.
- Exact commands are chosen when scaffolding.

## Package decisions that follow

Docking layout (first-order: tabs, splits, drag-and-drop, serialization, keyboard equivalents), map library (prefer token-free so the prototype runs without credentials; the reference uses Mapbox GL), workflow graph rendering, table/grid, charts, state management, rich text/markdown for the transcript, and test tooling.

## Open questions

None besides package selection, now proposed in the [package selection proposal](package-selection.md) for discussion before scaffolding.

Proposed scripted agent sessions (decision 0006), at minimum:

- **UI restructuring:** open Map beside Table, focus a selection, and restore the default layout.
- **Data representation:** color the map by PV yield and add a dashboard chart comparing baseline and scenario.
- **Model change:** propose a measure or stage change that waits for approval, then show the resulting stale stages.

## Implementation status

### Stage 1: domain state and commands (2026-09-14)

Code in `src/domain/`; 21 unit tests in `src/domain/*.test.ts`.

- **Real:**
  - Typed workbench state and the asset tree skeleton from decision 0003.
  - Derived stage states with stale propagation, run blockers, and custom stage insertion with cycle checks.
  - Background task lifecycle and a task simulator with an injectable scheduler.
  - A shared selection that rejects unknown ids and never widens.
  - Validated pending edits, applied as manual overrides that survive stage reruns.
  - Measure and scenario creators with validation.
  - One command path, `createWorkbench().execute`, with zod-validated inputs, an operation log recording the source (manual, agent, system), and undo/redo for model changes through Immer patches.
  - A JSON Schema command catalog (`describeCommands`) for future agent tools.
- **Simulated:** every stage output in `src/domain/simulation.ts` is a deterministic synthetic stand-in:
  - 400 footprints near latitude 0, longitude 0 (open ocean), with uses, floors, zones, shading, and PV yield;
  - archetype energy intensities, baseline and scenario demand;
  - grid elements and transformer loading.

  Grid modeling fails on its first attempt by design so the failed state and recovery can be exercised.
- **Deferred to later stages:** all UI, layout commands, dashboard scenario controls, and the scripted agent with approvals.
- **Design notes:**
  - Undo covers model changes only: skip or restore, insert stage, apply edits, create measure or scenario. Runs, tasks, selection, and pending edits are not undoable. The id and revision counter never rewinds, so undone changes cannot collide with later ones.
  - Stage state is derived, never stored. An executed stage becomes stale when an upstream revision or its own edit revision differs from what its last run consumed, or when an upstream stage is no longer executed or skipped.

### Stage 2: workbench shell (2026-09-14)

Code in `src/app/` and `src/App.tsx`. Tests in `src/app/shortcuts.test.ts`, `src/domain/workbench.test.ts`, `e2e/workbench.spec.ts`, and `e2e/smoke.spec.ts`.

- **Real:**
  - The three-row window of decision 0004: ribbon, FlexLayout main area, and status bar.
  - Default layout: a left border (Assets, Workflow) whose tab strip is the icon side bar; a center tab group (Map, Table, Dashboard, Roadmap, Creator, Settings); and a right border (Reasoning). Issues and Tasks open from the status bar.
  - A layout controller (`src/app/layout/layoutController.ts`) with typed layout operations: open page, toggle panel, maximize, reset, and compact mode. They are recorded in the operation log alongside manual tab selections, moves, and closes. The layout is kept in this browser.
  - One action registry (`src/app/actions.ts`) drives the ribbon menus, quick buttons, command palette (Ctrl+K), and keyboard shortcuts. Blocked or planned actions record their reason in the status bar instead of doing nothing.
  - The Workflow panel (run, rerun, skip, restore, focus, state badges) and the Tasks, Issues, and Settings pages (theme, layout reset, capability table).
  - Save and restore in this browser's storage, a confirmed new empty project, keyboard undo and redo, and system, light, and dark themes with FlexLayout colors mapped to workbench tokens.
  - Below 1100 px wide, side panels close and open as overlays so pages keep their width.
- **Simulated:** stage runs, and computing resources in the status bar.
- **Not built yet, labeled in the UI:** Assets, Map, Table, Dashboard, Roadmap, and Creator (stage 3); Reasoning (stage 4).
- **Verification (2026-09-14):**
  - `npm run typecheck`, `npm run lint`, and `npm run format:check` pass; 28 unit tests pass.
  - `npm run test:e2e` passes 23 tests, including 8 workbench tests and a smoke test with no axe violations at 1280x800. An axe scan in dark mode also reported no violations.
  - Screenshots reviewed at 1280x800, 1920x1080, and 900x700, and in dark mode with a running stage, the command palette, and the View menu open.
- **Notes and known gaps:**
  - React Aria has no menubar, so the ribbon uses menu buttons inside an ARIA toolbar.
  - Unavailable buttons use `aria-disabled` so they stay focusable and explain themselves. Playwright treats them as disabled, so tests activate them from the keyboard.
  - At 1280 px with both side panels open, the Settings tab moves into FlexLayout's tab overflow menu.
  - Undo covers model commands only; layout changes are logged but not undoable.

### Stage 3a: assets, creator, and roadmap (2026-09-14)

Code in `src/app/panels/AssetsPanel.tsx`, `src/app/panels/assetTree.ts`, `src/app/pages/CreatorPage.tsx`, and `src/app/pages/RoadmapPage.tsx`. Tests in `src/app/panels/assetTree.test.ts` and `e2e/pages.spec.ts`.

- **Real:**
  - **Assets panel:** a keyboard-navigable React Aria tree over the full asset skeleton, with kind icons, child counts, and planned badges. A details region shows kind, summary, provenance (stage run or operation), capability status, and related pages; Enter opens the first related page.
  - **Creator page:** measure and scenario creators backed by the `measure.create` and `scenario.create` commands. Command validation issues appear on the matching fields, and the remaining creators are listed as planned.
  - **Roadmap page:** the workflow graph laid out by dagre and rendered by React Flow, sharing state with the Workflow panel. Each stage is a focusable button and the view follows the focused stage. A stage-details panel offers run, rerun, skip, restore, previous and next, and inserting a custom stage.
- **Simulated:** stage outputs shown in the tree and details remain synthetic.
- **Not built yet, labeled in the UI:** Map and Table (stage 3b), Dashboard (stage 3c), and Reasoning (stage 4).
- **Verification (2026-09-14):**
  - Typecheck, lint, and format check pass; 31 unit tests pass.
  - `npm run test:e2e` passes 26 tests, including 3 page tests with no serious or critical axe violations.
  - Screenshots of the Assets panel, Creator page, and Roadmap page reviewed at 1280x800.
- **Findings:**
  - React Aria Form's form-level `validationErrors` kept a corrected field natively invalid, so the next click on submit silently did nothing. Forms now mark each field invalid from command issues and clear only that field's issue when it is edited.
  - Docked tabs stay mounted while hidden and measure 0x0, so the roadmap refits once React Flow reports a real size.
  - When the docked page is narrow, a container query stacks the roadmap graph above the stage details.
  - React Aria checkboxes keep the native input visually hidden, so browser tests operate them from the keyboard.

### Stage 3b: map and table (2026-09-15)

Code in `src/app/pages/MapPage.tsx`, `src/app/pages/mapMetrics.ts`, `src/app/pages/TablePage.tsx`, `src/app/grid/agGrid.ts`, `src/app/viz/palette.ts`, and `src/app/components/EmptyState.tsx`. Tests in `src/app/pages/mapMetrics.test.ts` and `e2e/map-table.spec.ts`.

- **Real:**
  - **Map page:** MapLibre with no basemap or token.
    - Buildings are colored by one available metric on a single-hue sequential ramp, with a legend and a no-data color; the ramp's anchor flips in dark mode.
    - An optional grid overlay shows feeders, transformers, the substation, and utility PV.
    - Click selects, Shift+click adds or removes, and clicking empty map clears; every change goes through the shared selection commands.
    - Hover shows the building and its value. Unavailable metrics are disabled and explained.
  - **Table page:** AG Grid Community with Buildings and Grid elements tabs, quick filter, column filters, sorting, and keyboard grid navigation.
    - Floors and archetype edits go through `edits.propose`, show validation messages, stay highlighted while pending, and are applied or discarded with `edits.apply` and `edits.discard`.
    - Table row selection and map selection are the same shared selection.
  - Empty states name the missing stage and offer to run it.
- **Simulated:** all metric values, grid loading, and demand figures.
- **Not built yet:** Dashboard (stage 3c) and Reasoning (stage 4).
- **Verification (2026-09-15):**
  - Typecheck, lint, and format check pass; 33 unit tests pass.
  - `npm run test:e2e` passes 29 tests, including 3 Map and Table tests with no serious or critical axe violations.
  - Screenshots reviewed at 1280x800: Table (light), Map (light, with a selection), and Map (dark). The review moved the legend so it no longer covered footprints or the attribution control.
- **Accessibility and color:**
  - The map canvas is not exposed to screen readers. The page says so and links to the Table page, which shares the selection.
  - The sequential ramp comes from the dataviz reference palette. Categorical slots 1-3 were validated with the dataviz validator against the workbench surfaces (light `#ffffff`, dark `#1d2126`) using `--pairs all`: every check passes, but light-mode aqua is 2.82:1, so any chart using it must ship direct labels or a table view.
- **Finding:** AG Grid selection events report a `source`. The table ignores programmatic sources so that syncing from the map does not echo back as new selection commands.
