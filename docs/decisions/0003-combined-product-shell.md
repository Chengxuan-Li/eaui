# 0003: Combined product shell with assets, workflow, reasoning, and map

Date: 2026-09-14

Status: accepted by the user in discussion; layout refined by [0004](0004-workbench-layout-and-docking.md), workflow and panel scope by [0005](0005-first-slice-workflow-and-panel-scope.md). Slice details remain proposals in the [first-slice proposal](../first-slice-proposal.md).

## Context

[UI directions](../ui-directions.md) offered A guided modeling studio, B spatial engineering workbench, and C scenario comparison workspace. Discussion on 2026-09-14 added narrower directions: D data preparation and asset library, E adoption/policy explorer, F run operations console.

## Decision

- Combine directions rather than choose one: parts of A (workflow), B (spatial/map), C together with E (scenario comparison and adoption/policy exploration), and D (assets and data). F is not a standalone surface.
- First moment of value: an overall workflow that can be run end to end with all important panels present, some as placeholders.
- Required panels:
  - **Asset panel:** the project tree below.
  - **Workflow panel:** a mutable, state-based directed acyclic graph of stages (for example executed, current, future, skipped), styled by the model's advancement, able to reflect agent reasoning decisions.
  - **Reasoning panel:** LLM interactions, chat input, harnessing, chat output with a rich-text view, reasoning process, approvals, and default prompt options. Output is shown here.
  - **Map panel.**
  - **Scenario controls panel:** toggles and possibly sliders, mainly on the dashboard page.
- Required pages: map, global settings, creator for the important asset types, table, dashboard/roadmap.

Project asset structure as stated by the user (`...` marks an open-ended list):

```text
Project
+- Energy model: buildings (zones, BIPV, ...), archetypes, schema rules, shading results,
|                energy results, weather, scenarios, measures, ...
+- Grid model:   lines, buses, transformers, utility PV, loads/load centers, ..., gas network
+- Data:         tables (user tables, GIS datasets, ...),
|                documents (multimodal documents, references, energy code, ...)
+- View:         views, custom widgets, reports, layouts, ...
```

## Rationale

The user's view is that the directions should be combined, and that the first value comes from seeing the whole workflow operate in one coherent application before any single area is deepened.

## Consequences

- The first slice is breadth-first: a whole-application walking skeleton, not one deep feature.
- Existing repository rules still apply to placeholders: they must be visibly labeled as simulated or not yet available, with no silent no-op controls. Core workflows remain operable without an LLM, and agent actions use the same operations as manual controls.
- Grid-model elements, BIPV, shading results, multimodal documents, and custom views/widgets were not identified as UI surfaces in the [reference audit](../reference-ui-audit.md) (PV appears there only as a measure category). Their fixtures and semantics are new and synthetic.
- Panels, pages, and saved layouts need a layout model, so the layout/docking choice deferred in the UI directions must now be made.
- Interpretations, the real/simulated/planned boundary, and open questions are tracked in the proposal, not decided here.
