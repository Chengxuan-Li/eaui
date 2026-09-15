# 0005: First-slice workflow sequence and panel scope

Date: 2026-09-14

Status: accepted by the user in discussion. Details not listed here remain proposals in the [first-slice proposal](../first-slice-proposal.md).

## Decision

**Default workflow.** The example workflow follows these sequential stages:

1. Location setup / footprint capturing
2. Geospatial data enriching
3. Schema matching
4. Geospatial preprocessing
5. Shading calculation / PV yield estimation
6. Archetype modeling
7. Baseline model setup
8. Scenario definitions
9. Scenario modeling
10. Grid definitions
11. Grid modeling
12. Dashboard / visualization

The workflow remains a mutable, state-based directed acyclic graph ([decision 0003](0003-combined-product-shell.md)); this sequence is its default shape.

**Reasoning panel content.** Agent output: tool calls, reasoning, actions the agent took, and links it referenced, together with the chat.

**Roadmap.** The roadmap is a workflow for project setup, not a time-phased adoption pathway.

**First creators.** Measure and scenario get working creators first.

## Consequences

- Agent tool calls shown in the reasoning panel should correspond to entries of the shared operation log, so manual and agent actions share one record.
- Background task progress, issues, and notices are shown in the status bar ([decision 0004](0004-workbench-layout-and-docking.md)), not in the reasoning panel.
- Location/footprint, enrichment, preprocessing, shading/PV, and grid stages have no fixtures yet; all are synthetic.
- Whether slice 1 uses a scripted agent or a real model provider was left open here; [decision 0006](0006-scripted-agent-and-layout-details.md) resolves it as scripted.
