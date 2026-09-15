# EnergyAtlas UI Design Guidelines

**Date:** 2026-09-15  
**Scope:** Visual and interaction design guidance for the current EnergyAtlas UI.

## 1. Visual hierarchy and boundaries

The current interface should reduce the visual rigidity created by strong or repeated borders.

Use boundaries to clarify structure, but avoid making every region, card, metric, or control group look like an independently boxed object. Major pane boundaries may remain clear; internal groupings should rely more on alignment, spacing, typography, and restrained surface contrast.

The goal is a flatter, calmer interface in which the content carries more visual weight than the chrome.

## 2. Typography

Keep the typography system compact.

Use no more than two or three size levels across the main application. Most hierarchy should come from:

- weight,
- tone or opacity,
- spacing,
- alignment,
- emphasis state.

Avoid building hierarchy primarily through increasingly large heading sizes. The interface should remain dense enough for technical work while still clearly distinguishing titles, normal content, and secondary metadata.

## 3. Chart and analytical presentation

Charts should remain valid dashboard elements first. Editorial or infographic-like emphasis can be used selectively where it helps communicate an important result, but it should not become the default treatment.

Suitable uses include:

- highlighting an exceptional period,
- explaining a major scenario difference,
- emphasizing a notable peak or threshold,
- presenting a result intended for communication or reporting.

Routine analytical charts should remain visually restrained.

### Annotation

Annotate selectively rather than exhaustively.

Good annotation targets include:

- maxima or minima,
- threshold crossings,
- unusual events,
- selected points,
- major scenario divergence,
- warnings or model exceptions.

Most data points should remain unlabeled.

### Direct labels

Direct labeling can be useful where it reduces lookup effort without introducing clutter. Use it selectively for small numbers of series or highlighted data. Conventional legends remain appropriate when they are clearer.

### Chart scaffolding

Axes, ticks, gridlines, and frames should support interpretation without competing with the data. Gridlines and other scaffolding should generally be visually quieter than the plotted information.

## 4. Curated palette system

Provide a small set of curated application palettes rather than a single rigid visual theme.

Recommended directions include:

### Technical monochrome
A restrained neutral interface with a mostly monochromatic data palette and one or two highlight colors.

### Lieflat-inspired
A warmer analytical palette using deep navy as primary data ink, pale secondary tones, and a restrained accent.

### Clean technical light
A cool or neutral light interface with subdued gray chrome and a limited blue/cyan analytical palette.

### Dark engineering
A dark neutral theme with controlled, non-neon data colors and the same semantic color logic as the light themes.

The palettes should feel intentionally designed rather than mechanically recolored.

## 5. Cross-view color consistency

Map, charts, tables, workflow graphics, selection states, and status indicators should use a shared semantic color language.

A value or state should not change meaning simply because it appears in another view. For example, the same analytical range or category should use related colors across map and chart views where practical.

Color should primarily encode:

- analytical values,
- categories,
- state,
- selection,
- warnings,
- missing data.

Avoid using strong color merely as decoration.

## 6. Map styling

The map should visually belong to the same design system as the rest of the application.

Its background context, building fills, network overlays, selections, legends, and missing-data states should all reflect the active palette.

The map should remain analytical rather than decorative. Context layers should support orientation without competing with the modeled objects.

For sequential data such as floor count, a restrained monochromatic or near-monochromatic scale is appropriate. Diverging values may use a balanced two-sided scale with a quiet neutral midpoint.

Selection, hover, and missing-data states should remain visually distinct without breaking the palette.

## 7. Map legends and overlays

Map legends should feel like compact analytical instruments rather than dashboard cards.

Prefer:

- compact layout,
- restrained surface treatment,
- clear units,
- readable scales,
- explicit missing-data treatment,
- minimal decoration.

They should remain easy to scan while occupying little visual attention.

## 8. Status presentation

Status indicators should describe meaningful application state, not development state.

Prefer semantic states such as:

- Ready
- Running
- Complete
- Outdated
- Failed
- Planned
- Warning

Avoid unnecessary repetition of colored pills or badges. Routine states can use quiet text or icon treatment; stronger color should be reserved for conditions that require attention.

## 9. Primary simulation action

Keep the main simulation action visually recognizable as:

**▶ Run ▾**

It should remain a clear primary action without requiring broader changes to the rest of the top navigation.

The dropdown may expose related run variants where useful, but the control itself should stay compact and immediately identifiable.

## 10. Contextual right-side surface

The right-side contextual pane should support two primary modes:

**Reasoning | Inspection**

### Reasoning
Used for agent-facing or analytical context such as:

- findings,
- actions,
- referenced objects,
- command provenance,
- approvals,
- contextual analysis.

### Inspection
Used for selected-object context such as:

- properties,
- editable parameters,
- simulation results,
- warnings,
- linked objects,
- relevant actions.

These two modes should share the same contextual surface rather than competing as separate permanent panels.

## 11. Design-system consistency

The UI should feel coherent across all major surfaces.

The same visual language should carry through:

- docked panes,
- map,
- charts,
- table,
- workflow view,
- issues,
- contextual panel,
- run state,
- selection and hover behavior.

The priority is consistency of hierarchy, color meaning, borders, typography, and state treatment rather than decorative uniformity.

## 12. Reference direction

The desired visual direction combines:

- the restrained engineering-software polish of the Bayesian Energy references,
- the analytical clarity and selective editorial emphasis of the Lieflat chart references,
- the current EnergyAtlas dockable workflow and information density.

The aim is not to copy either reference directly, but to develop a coherent EnergyAtlas visual language that is technical, compact, calm, and analytically expressive.
