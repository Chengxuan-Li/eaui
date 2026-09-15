# 0012: OpenFreeMap basemap and Boston Back Bay footprints

Date: 2026-09-15

Status: accepted by the user on 2026-09-15, after asking why the map showed no basemap. Amends the map constraint of [decision 0007](0007-package-selection.md) ("no basemap by default").

## Context

The Map page has never had a basemap. Its MapLibre style holds only a background layer, as [decision 0007](0007-package-selection.md) set so the prototype runs with no token and no network, and the synthetic district sits near 0°N 0°E in open ocean so that no real site is implied (`src/app/pages/MapPage.tsx`, `src/domain/simulation.ts` at `44be917`). Section 6 of the [UI design guidelines](../20260915_energyatlas_ui_design_guidelines.md) asks for context layers that "support orientation without competing with the modeled objects", which the build does not meet.

Facts checked on 2026-09-15:

- OpenFreeMap's public instance needs no key or registration, sets no limit on map views or requests, allows commercial use, and offers no SLA. Its styles (Positron, Bright, Liberty, Dark, Fiord) load from `https://tiles.openfreemap.org/styles/<name>` and use one OpenMapTiles vector source (`https://tiles.openfreemap.org/planet`), glyphs, and sprites from the same host. Required credit: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap".
- The OSM attribution guidelines treat a substantial extract such as building footprints as a derivative database: it must carry attribution to OpenStreetMap and the ODbL text or a link. The rest of the software does not have to be ODbL.
- The public Overpass API allows one-off extracts with an identifying user agent. A count on 2026-09-15 found 473 building ways and 3 building relations in the chosen box.

## Decision

- **Basemap:** the Map page shows OpenFreeMap vector tiles from the public instance, on by default, with a Settings toggle to turn it off.
- **Styling:** the style's paint colors are rewritten from the active appearance's tokens, so the basemap follows all six appearances. The basemap's own building layers are hidden so only modeled buildings are drawn. Roads, water, parks, and labels stay as quiet orientation.
- **Location:** the synthetic project moves to Boston Back Bay: Beacon Street, Marlborough Street, and Commonwealth Avenue between Arlington Street and Dartmouth Street (south 42.3500, west -71.0780, north 42.3565, east -71.0712).
- **Footprints:** building geometry comes from a bundled OpenStreetMap extract of that box. Every attribute (use, year, floors, results) stays synthetic. The extract is fetched once by `scripts/fetch-osm-buildings.mjs` and committed with an ODbL notice.
- **Offline behavior:** end-to-end tests block OpenFreeMap requests so they stay offline and repeatable. The app shows a loading state for the basemap and, if tiles or the style fail, falls back to the flat appearance background with a quiet notice.
- **Branch:** the work is implemented on `feature/basemap`, branched from `feature/agentic` because stage 4 changed the Map page.

## Alternatives not chosen

- Generated context layers (streets and blocks in synthetic data): no network or licensing, but no real geography.
- A self-hosted Protomaps extract: offline real geography, but a new `pmtiles` package and a tile file to store.
- Keeping the synthetic grid over the real map, or fitting synthetic footprints into real blocks.
- OpenFreeMap's stock light and dark styles instead of recoloring from appearance tokens.
- Loading real tiles in end-to-end tests.
- Zurich city centre or Singapore CBD as the location.

## Consequences

- The Map page needs the network for context. The public instance has no SLA, so the fallback is a required state, not an edge case. Loading the bundle inside the reference ASP.NET or Eto host now also depends on network access from that host.
- Synthetic buildings appear on a real neighbourhood. The Map legend, Inspection provenance, and asset summaries keep saying that attributes and results are synthetic, and footprint provenance names OpenStreetMap.
- The fixture changes from a 400-building grid to about 476 real footprints. Tests that assume 400 buildings, grid quadrants, or particular building ids change with it. Grid elements are placed from the footprint bounds.
- The map attribution control shows the OpenFreeMap, OpenMapTiles, and OpenStreetMap credits, and `src/domain/fixtures/README.md` carries the ODbL notice for the extract.
- No new npm package is needed: MapLibre reads the style URL directly, and the fetch script uses Node's built-in `fetch`.
- The package spikes keep their own synthetic fixture near 0°N 0°E and their "no external request" check.
