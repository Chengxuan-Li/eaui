# 0019: A globe with one solar state, and no area night lights

Date: 2026-09-16

Status: accepted by the user on 2026-09-16, who asked for the area-based night lights to go, for the globe to replace Mercator, and for scene lighting in the manner of [romainoir/Maplibre-Globe](https://github.com/romainoir/Maplibre-Globe) but over this project's monochrome basemap and without showing the sun's own numbers.

## Context

[Decision 0018](0018-map-scene-lighting.md) lit the district from a sun computed for one place, and gave the night two kinds of light: a fill over the basemap's `landuse` layer and a per-building lit-window glow. The land-use fill only ever appeared where live basemap tiles did, so it was absent offline and in every browser test.

The reference the user pointed at is MIT licensed. Reading it settled two things:

- its `lighting.js` computes the **subsolar point** — where the sun is overhead — and feeds that one global state to `setLight` as `[1.5, 180 − lon, 90 − lat]`, rather than an observer's azimuth and elevation;
- its `nightLights.js` sets no light, sky or atmosphere at all. It scales the opacity of prepared heatmap and road-glow layers, which is the area-based kind of night light being removed here, so none of it was carried over.

## Decision

- **The night lights go entirely**: the `landuse` fill, `litWindowFactor` and the per-building blend, the `map.setNightLights` operation, the Night lights control, and their unit and browser tests. The extrusion colour returns to the metric ramp alone.
- **The globe replaces Mercator.** `map.setProjection({ type: 'globe' })` is applied once the map loads and again on `styledata`, because projection is style state that a basemap or appearance swap drops. The 2D and 3D views keep the same centre and zoom; 3D only tilts.
- **The globe carries one solar state.** `subsolarPoint(dayOfYear, minutesUtc)` returns where the sun is overhead: its latitude is the solar declination, which the season sets, and its longitude follows the earth's rotation through the UTC time shared by everyone on the globe. `sunFromSubsolar` then derives any place's own sun, the hour angle being simply how far that place lies east or west of solar noon. `sunPosition` is now a thin wrapper over the two, so one state explains every location.
- **Sky colour comes from new appearance tokens.** Each of the six appearances gains `data.sky` with `day`, `night`, `twilight`, `golden`, `haze`, `sunlight` and `moonlight`. The scene mixes them by solar elevation, so no colour literal is written and the monochrome themes stay monochrome instead of gaining a blue sky.
- **The terrain is lit from the sun.** `hillshadePaint` takes the sun's azimuth and sets `hillshade-illumination-anchor: 'map'` with `hillshade-illumination-direction`, so relief and buildings agree about where the light comes from.
- **The sun's numbers are not shown.** Inspection keeps the season, time, intensity, diffusion and haze controls and a one-line description of the scene, and no longer reports elevation or azimuth.

## Rationale

- One global solar state is the honest model: the sun does not belong to a viewport. Deriving each place from it means the globe and the district can never disagree, which two independent calculations would eventually do.
- Continuous mixing from a small set of per-appearance anchors gives the reference's blended effect without carrying thirteen hand-tuned colour tables into six themes, which nobody would keep in step.

## Alternatives

- **Porting the reference's presets and SunCalc**: rejected. It would add a package outside decisions 0007, 0008 and 0010, and replace working NOAA maths that is already unit tested.
- **Feeding the subsolar point straight to `setLight`, as the reference does**: rejected for the district. At street zoom the light would not match the local sun. Taking the subsolar point as the source and deriving the local sun keeps both scales right.
- **Keeping the per-building night glow**: the user asked for all of it to go.

## Credit

The approach — a single subsolar solar state driving the light, and a sky blended across solar phases — is taken from [romainoir/Maplibre-Globe](https://github.com/romainoir/Maplibre-Globe) (MIT). No code was copied: the solar maths here remains NOAA's, the sky is mixed from this project's appearance tokens, and no dependency was added.

## Consequences

- **There is no day/night terminator across the globe.** MapLibre's light shades fill extrusions; it does not shade the earth. Zoomed out, the sky and fog change with the sun but the globe itself is evenly lit. The reference renders no terminator either. Drawing one would need a custom layer.
- **Lighting still applies in 3D only**, and MapLibre still casts no shadows.
- **Nothing on the map now varies with a building's use or floor count at night**, which was the only display use of those attributes.
- The `map.lighting` capability text no longer claims night lights.
- Saved projects and layouts are unaffected: lighting and projection are view state, neither saved nor undoable.

## Verification (2026-09-16)

Node.js 24 and Microsoft Edge with 4 workers, on `feature/basemap`.

- `npm run typecheck`, `npm run lint` and `npm run format:check` pass. `npm test` runs 162 tests in 20 files, `npm run test:e2e` 50, and `npm run test:e2e:preview` 1.
- The subsolar tests check that its latitude is the declination at both solstices and near zero at the equinox, that its longitude sits near Greenwich at 12:00 UTC and a quarter turn west six hours later, that asking for a place's sun directly and through the globe state give the same answer, and that the subsolar longitude and its antipode are noon and midnight.
- The lighting tests add the globe state to the scene, check that the same UTC minute is day in Boston and night at its antipode, and check every appearance yields valid colours both by day and at night.
- The hillshade test checks the illumination direction follows the sun and wraps into a compass bearing.
- A browser check confirmed the globe: with the first stage run and 3D on, zooming out showed the earth as a sphere with its atmosphere, the basemap recoloured as usual, and no console errors. The sky renders along the horizon at low zoom.

**Not verified:** the look of the sky in each of the six appearances, which was reviewed only in the dark theme; and any day/night terminator across the globe, which is not drawn at all.
