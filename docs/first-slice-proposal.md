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
- **Workflow graph:** stages are nodes with dependency edges; the default is the linear 12-stage sequence. Node states: `future`, `ready`, `current`, `running`, `executed`, `skipped`, `blocked`, `failed`, `stale`, `unavailable`. A stage becomes `stale` when an upstream input changes after it executed. `unavailable` marks planned capability and is never shown as executed (the reference's calibration page marked unimplemented work complete; see the audit). Graph edits (insert, skip, remove) are operations that must keep the graph acyclic. Nodes link their inputs, produced assets, and any reasoning entries that proposed or explained them.
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

Whether stage 7 includes running the baseline simulation is an assumption to confirm in fixtures.

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
