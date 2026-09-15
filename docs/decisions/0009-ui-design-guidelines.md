# 0009: EnergyAtlas UI design guidelines

Date: 2026-09-15

Status: accepted by the user, who supplied [the guidelines](../20260915_energyatlas_ui_design_guidelines.md) as the current UI design guidance for the EnergyAtlas frontend.

## Context

Stages 1 to 3c were styled from the dataviz reference palette and per-component judgment; no product-level visual direction existed. The user consolidated the agreed visual directions in one document that intentionally avoids prescribing exact styles or implementation details.

## Decision

- [docs/20260915_energyatlas_ui_design_guidelines.md](../20260915_energyatlas_ui_design_guidelines.md) is the current source of UI design guidance. The user maintains it; agents change it only at the user's request. The Geist typeface was added that way on 2026-09-15 ([decision 0010](0010-geist-typeface.md)).
- In summary (the document governs):
  - a flatter, calmer hierarchy: clear major pane boundaries, internal grouping by alignment, spacing, typography, and restrained surface contrast rather than repeated borders;
  - two or three type sizes, with hierarchy from weight, tone, spacing, alignment, and emphasis, set in the Geist family (added by decision 0010);
  - restrained analytical charts, with selective annotation, selective direct labels, and quiet scaffolding; editorial emphasis only where it communicates an important result;
  - a small set of curated palettes (technical monochrome, Lieflat-inspired, clean technical light, dark engineering);
  - one semantic color language shared by map, charts, table, workflow graphics, selection, and status;
  - a map, network overlays, and compact legends that follow the active palette;
  - status that describes application state (Ready, Running, Complete, Outdated, Failed, Planned, Warning), with quiet routine states and strong color reserved for attention;
  - a compact, recognizable **▶ Run ▾** primary action;
  - one right-side contextual surface with **Reasoning | Inspection** modes.
- Exact tokens, values, and components remain implementation choices. Record them in the [developer guide](../developer-guide.md) when made.
- Where earlier guidance in the developer guide conflicts, the guidelines win. Conflicts, recommendations, and questions that need the user are tracked in [design alignment](../design-alignment.md) until resolved.

## Consequences

- The right-side panel of decisions [0003](0003-combined-product-shell.md) and [0006](0006-scripted-agent-and-layout-details.md) becomes a shared contextual surface: Reasoning is one mode, Inspection of the selected object the other. Stage 4 builds the surface that way.
- The existing surfaces need an alignment pass: typography, borders, status presentation, palettes and semantic color tokens, map and legend styling, chart scaffolding, and the Run control.
- Section 8 of the guidelines is read as governing how status is presented. It does not by itself withdraw the handoff's honest-prototyping principle; how to disclose simulated and planned capability quietly is an open question in design alignment.
- Chart color slots were validated for the single current palette. Each curated palette needs its own contrast validation before use.
- The Bayesian Energy and Lieflat references are named as direction only. No reference material is stored in this repository, and the guidelines ask for a coherent EnergyAtlas language rather than a copy of either.
