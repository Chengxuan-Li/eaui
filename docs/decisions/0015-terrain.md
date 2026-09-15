# 0015: Live 3D terrain for map display

Date: 2026-09-15

Status: accepted by the user on 2026-09-15 after a revised proposal. The first terrain proposal, which bundled elevation tiles and stored ground elevation as project data, was withdrawn before implementation; terrain is fetched live at runtime and used for display only. Builds on decisions [0012](0012-openfreemap-basemap-back-bay.md) and [0013](0013-3d-building-extrusion.md).

## Context

Facts checked in MapLibre 6.9.1 (`node_modules/maplibre-gl`):

- The style spec supports `terrain` (a `raster-dem` source with `exaggeration`), `raster-dem` sources with `terrarium` encoding, and `hillshade` layers. `Map.queryTerrainElevation(lngLat)` returns meters including exaggeration and is documented for positioning custom 3D objects.
- `background`, `fill`, `line`, `raster`, `hillshade`, and `color-relief` layers are draped onto the terrain mesh (`LAYERS_TO_TEXTURES` in `maplibre-gl-dev.mjs`). Circle and symbol shaders add `get_elevation` at their anchors, and `fill-extrusion` lifts each feature by the elevation at its centroid and sinks a ground-based base by 10 m.

Facts checked for Mapterhorn on 2026-09-15 ([data access](https://mapterhorn.com/data-access/), [attribution](https://mapterhorn.com/attribution/)):

- Terrarium-encoded 512-pixel WebP tiles at `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`, with no key, served with `Access-Control-Allow-Origin: *`. Back Bay tiles exist up to zoom 16 (zoom 17 returned 404).
- Its source list covers this area with USGS 3DEP 1-meter DEMs (public domain), with Copernicus GLO-30 as the global fallback. Its pages state no usage limits, terms, or service level for the tile endpoint.
- AWS Terrain Tiles returned no cross-origin header and document their S3 endpoints for EC2 use, so they are not used.

Back Bay is filled land a few meters above sea level, so true-scale relief is subtle.

## Decision

- **Display only:** terrain exists solely for 3D visualization on the Map page. It is not project data: no domain types, workflow stages, table columns, Inspection fields, or stored elevation, and no terrain data in the repository.
- **Live source:** Mapterhorn's tile endpoint, fetched by MapLibre at runtime.
- **Controls:** a "Terrain" switch on the Map page, separate from "3D buildings", logged as the `map.setTerrain` view operation, with an exaggeration slider from 1 to 10 logged as `map.setTerrainExaggeration`. The default is true scale (1).
- **Hillshade:** always shown while terrain is on, colored from the active appearance and placed beneath basemap labels.
- **Features on terrain:** draped and elevated layers follow MapLibre's behavior; the 3D selection outline is lifted by the elevation MapLibre samples at each selected building's centroid, matching the extrusions.
- **States:** loading and failure are shown; a failure falls back to a flat map with a notice and a retry. The map credits Mapterhorn and USGS 3DEP, and the legend states the exaggeration.

## Alternatives not chosen

- Bundling terrain tiles and sampling `groundElevationM` into buildings during a workflow stage (the withdrawn first proposal).
- Live elevation fetched by a workflow stage and stored in the project.
- Live AWS Terrain Tiles.
- A default exaggeration above true scale, and a separate hillshade switch.

## Consequences

- The Map page gains a second runtime network dependency without a service level; the flat fallback is a required state, and end-to-end tests stub the tile endpoint.
- Terrain and exaggeration are view state: logged, not saved with the project, and reset on reload.
- Relief is visible only when the camera is tilted, so the page points to "3D buildings" while the map is flat.
