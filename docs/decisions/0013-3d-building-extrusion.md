# 0013: 3D building extrusion on the Map page

Date: 2026-09-15

Status: accepted by the user on 2026-09-15, after asking whether the map could render extruded footprints; the selection treatment was revised by the user the same day, before the work was committed. Builds on [decision 0012](0012-openfreemap-basemap-back-bay.md).

## Context

The Map page draws the Back Bay footprints as flat polygons. Each building already carries a synthetic `heightM` (floors × 3.2 m) once "Geospatial preprocessing" has run (`src/domain/simulation.ts`). MapLibre 6.9.1, already installed, renders `fill-extrusion` layers whose color and height accept feature state, `fitBounds` accepts pitch and bearing through its camera options, and its keyboard handler rotates with Shift+⇠/⇢ (15°) and tilts with Shift+⇡/⇣ (10°). Section 6 of the [UI design guidelines](../20260915_energyatlas_ui_design_guidelines.md) asks the map to stay analytical rather than decorative.

## Decision

- **Heights:** extrusions use the synthetic `heightM` the workflow computes. Before "Geospatial preprocessing" has run, buildings stay flat and the page says why.
- **Mode:** a "3D buildings" switch on the Map page, logged as the `map.set3d` view operation so the agent can use it too. 2D stays the default. 3D tilts and rotates the camera, shows the compass, and allows tilting; 2D keeps the map flat and north-up.
- **Selection:** selection is an outline in both 2D and 3D, and building colors never change. 2D keeps its ground outline with a surface-colored halo. In 3D the outline follows each selected building's visible silhouette from the current camera instead of its footprint: the building's ground, roof, and walls are projected every frame, and the boundary of their union is drawn as the same selection-colored line with a surface halo on an overlay above the map.

## Alternatives not chosen

- Real heights from OpenStreetMap `height` and `building:levels` tags, which would disagree with the synthetic floor counts behind the energy results.
- Opening the map in 3D by default, or extruding whenever the map is tilted without a switch.
- Keeping metric colors on selected buildings and dimming the others.
- Selected buildings taking the selection color on their sides and roof: chosen first, then replaced by the user with outline highlighting so metric colors stay readable on selected buildings.
- Outlining in 3D with the footprint, or with an extruded rim around the roof edge: replaced by the user with a view-dependent outline of the building's visible 3D boundary. MapLibre 6.9.1 cannot raise line layers above the ground.

## Consequences

- No new package or data. The 2D ground outline stays for 2D; 3D hides it and draws the silhouette outline instead, through a MapLibre custom layer that supplies the camera matrix.
- The silhouette outline is drawn above the map, so a selected building behind a taller one still shows its outline through it.
- The 2D/3D choice is view state: logged, not saved with the project, and reset on reload like the other view state.
- The canvas stays unavailable to screen readers; the Table page remains the equivalent, and the Map page names the keyboard shortcuts for rotating and tilting.
