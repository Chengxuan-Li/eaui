# First slice proposal: workflow walking skeleton

Date: 2026-09-14

Status: proposal for discussion. Accepted inputs: [decision 0002](decisions/0002-web-react-typescript-vite.md) (web-only React/TypeScript/Vite) and [decision 0003](decisions/0003-combined-product-shell.md) (combined shell, panels, pages, asset tree). Everything else below is a recommendation. Do not scaffold until the open questions are resolved or delegated.

## Goal

A single synthetic project can be taken through the whole workflow in the browser. Every required panel and page is present, and every element states honestly whether it works, is simulated, or is planned.

## Shell layout

```text
+--------------------------------------------------------------------------+
| Project v | Map  Table  Dashboard  Creator  Settings | run status | search|
+-----------+----------------------------------------------+---------------+
| Assets    | Workflow graph (collapsible band)            | Reasoning     |
|  Energy   +----------------------------------------------+  conversation |
|  Grid     | Active page                                  |  reasoning    |
|  Data     |  Map: full map + selection details           |  approvals    |
|  View     |  Table: grid + docked map panel              |  output       |
|           |  Dashboard: charts + scenario controls       |  presets      |
|           |  Creator: typed form per asset kind          |  chat input   |
|           |  Settings                                    |               |
+-----------+----------------------------------------------+---------------+
```

- The workflow graph sits above the page as a horizontal band because branching reads better horizontally than in a narrow column. It collapses to a one-line breadcrumb and expands to a full graph.
- The map is one component shown full size on the Map page and as a resizable, collapsible docked panel on Table and Dashboard. All instances share one selection.
- Details for a selected asset or map feature open in a contextual drawer inside the page area, not as another top-level panel.
- Assets and Reasoning panels resize and collapse; layouts are serializable so a layout can later be saved as a View asset.

## Cross-cutting state model

- **Project document:** typed asset tree with stable IDs, kind, status, and provenance (manual, agent, or stage output, with inputs).
- **Workflow graph:** stages are nodes with dependency edges. Node states: `future`, `ready`, `current`, `running`, `executed`, `skipped`, `blocked`, `failed`, `stale`, `unavailable`. A stage becomes `stale` when an upstream input changes after it executed. `unavailable` marks planned capability and is never shown as executed (the reference's calibration page marked unimplemented work complete; see the audit). Graph edits (insert, skip, remove) are operations that must keep the graph acyclic. Nodes link their inputs, produced assets, and any reasoning entries that proposed or explained them.
- **Operations:** every mutation (create or edit an asset, run or skip a stage, change a scenario control, apply an approval) is a typed command with validation and a result, appended to an operation log. Manual controls and the reasoning panel invoke the same commands; agent-proposed commands wait for approval.
- **Selection:** one project-scoped selection shared by assets, map, table, and dashboard. An empty selection stays explicit and never silently widens.
- **UI state:** active page, panel sizes, collapsed regions, and layout, kept separate from project state.
- **Capability status:** each feature is **Working** (real behavior over fixture data), **Simulated** (deterministic stand-in for engineering or LLM computation, labeled), or **Planned** (visible, disabled, with an explanation). A single registry drives these labels so the UI cannot drift from the truth.

## Default workflow graph

```text
Import GIS data -> Schema rules -> Buildings & zones -> Archetypes --+
Import weather -----------------------------------------------------+-> Baseline energy
Buildings & zones -> Shading -> BIPV potential   (both skippable)
Baseline energy + BIPV potential -> Grid model link (loads to buses/transformers)
Measures -> Scenarios -> Scenario simulation (needs baseline, grid link)
Scenario simulation -> Dashboard/roadmap review -> Report
```

Shading and BIPV are skippable to demonstrate branching. Edges are illustrative; fixture definitions will be exact.

## Working, simulated, and planned boundary

| Area | Working | Simulated | Planned (labeled) |
| --- | --- | --- | --- |
| Workflow panel | Graph render, all node states, run/skip/revisit, stale propagation, insert/skip stage operations | Stage durations and outputs | Free-form graph editing |
| Asset panel | Tree over fixture project, selection, open in page, status/provenance badges, stage outputs appear | Result contents | Gas network, document viewer, custom widgets |
| Map | Synthetic footprints plus small grid overlay, linked selection, color by one metric | Metric values | Geometry editing, 3D/shading visuals |
| Table | Buildings, zones, grid elements; sort/filter; linked selection; pending edit with apply/cancel and validation | None | User table import |
| Dashboard/roadmap | Baseline vs scenario comparison; scenario controls (toggles, sliders) re-derive outputs; roadmap view | All numbers | Custom widgets, report export |
| Creator | One or two creators with validation (proposal: measure, scenario) | None | Other asset kinds, listed with Planned status |
| Reasoning | Conversation layout, prompt presets, reasoning trace view, approvals that invoke real operations, output stream of operation and stage results | LLM responses from a deterministic script | Real model provider, document grounding |
| Settings | Units, theme, layout reset | None | Model provider credentials, accounts |

Fixture variants cover empty project, loading, success, warning (missing weather, partial archetype coverage), and error (failed stage, rejected approval).

## Verification plan

- Operation and state tests: graph transitions, stale propagation, acyclicity, approvals, selection rules.
- Browser checks of the full manual workflow without the reasoning panel.
- Keyboard traversal across panels and pages; visible focus; resizable panels operable by keyboard.
- Visual checks at 1280x800, 1920x1080, and a narrow width.
- Exact commands are chosen when scaffolding.

## Package decisions that follow acceptance

Layout/docking, map library (prefer token-free so the prototype runs without credentials; the reference uses Mapbox GL), graph rendering, table/grid, charts, state management, and test tooling.

## Open questions

1. **Reasoning in slice 1:** a scripted deterministic agent (recommended), or a real LLM? A real model needs a small local server proxy and a key in `.env.local`, because keys must not ship in the browser bundle.
2. **Output:** is the reasoning panel the single stream for all output (stage progress, validation, operation results, agent messages), or only LLM output with run output elsewhere?
3. **Roadmap:** a time-phased pathway (measures and adoption over years, like the reference adoption viewer), or a project/plan roadmap?
4. **Layout:** fixed regions with resizable, collapsible panels and a serializable layout model now, with full drag-and-drop docking later (recommended), or docking from the start? Includes the map as both page and docked panel.
5. **Creators:** which asset kinds get working creators first (proposal: measure and scenario)?
