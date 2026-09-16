# 0018: Contextual lighting for the 3D map scene

Date: 2026-09-16

Status: accepted by the user on 2026-09-16, who chose the sun from season and UTC time, the controls in Inspection only, a sticky worked-surface rule, and night lights from basemap land use with whatever else could be found.

**Superseded in part by [decision 0019](0019-globe-projection-and-solar-state.md)**, which removed the night lights entirely, replaced Mercator with the globe, moved the sun to a single subsolar state, took sky colour from new appearance tokens, and stopped showing the sun's elevation and azimuth. Everything else here still holds.

## Context

The Map page had a 3D view ([decision 0013](0013-3d-building-extrusion.md)) and live terrain ([decision 0015](0015-terrain.md)), but no lighting: extrusions took MapLibre's default light, there was no sky, and the scene read the same at every hour. The user asked for contextual lighting driven by time of day and horizon dustiness, with night lights from human activity, and for terrain to belong to the 3D view rather than stand apart.

What MapLibre 6.9.1 offers shaped the answer:

- `LightSpecification` is only `{ anchor, position, color, intensity }`: a single directional term with no area light, no sun angular size, and **no cast shadows**. It shades extrusion faces.
- The sky is real: `sky-color`, `horizon-color`, `sky-horizon-blend`, `horizon-fog-blend`, `fog-color`, `fog-ground-blend` and `atmosphere-blend`, set through `Map.setSky`.
- Fill extrusions have no emissive property, so night lights cannot be an emissive term.

## Decision

- **The sun is computed, not stylised.** `src/app/pages/sunPosition.ts` implements NOAA's solar position from a day of the year, a time in UTC, and a latitude and longitude, and the map passes the district centre. Season and time of day are the only two controls; direction follows.
- **`src/app/pages/lighting.ts` maps the controls onto the renderer** and is pure, so it is unit tested: sun position and the control values in, MapLibre's light and sky and a night-glow strength out.
- **Sun size is interpreted, not simulated.** MapLibre has no area light, so "circumsolar diffusion" widens the day-to-night terminator and spreads the horizon glow (`sky-horizon-blend`), and flattens the light slightly. It is labelled as an artistic control, and the panel says the renderer casts no shadows.
- **Dustiness is fog.** Horizon occlusion raises `horizon-fog-blend`, `fog-ground-blend` and `atmosphere-blend`, dims the light and lifts the fog colour toward a pale veil.
- **Night lights have two parts.** Each building carries a `lit` factor from its use and floors (`litWindowFactor`), which blends its extrusion colour toward the night-light colour; and a fill over the basemap's `landuse` source-layer warms retail, commercial, industrial and residential ground. Both scale with one intensity control and appear only as daylight falls.
- **Colours come from appearance tokens.** No literal is written: sky, horizon, fog, light and glow are mixed from the active appearance's categorical, ink and status slots through `mixHex`, so every appearance lights its own way.
- **Terrain belongs to the 3D view.** `map.setTerrain` is rejected while the map is flat, the control reads "Terrain (3D only)" and disables, and leaving 3D pauses terrain without forgetting it.
- **Inspection is the property panel of the worked surface.** With nothing selected and the map being worked in, Inspection shows the map's scene lighting. A selection always wins.
- **Every lighting change is a logged view operation** (`map.setSeason`, `map.setTimeOfDay`, `map.setLightIntensity`, `map.setSunDiffusion`, `map.setHaze`, `map.setNightLights`), validated and rejected out of range like every other view operation.
- **The lighting is display only**, disclosed through the `map.lighting` capability, because the workflow has a real "Shading calculation / PV yield estimation" stage and a sun control must not read as its input.

## Rationale

- A tool about solar yield cannot show a sun in the wrong place. Real geometry costs one pure function and makes the polar cases behave.
- Wiring the two honest controls (season, time) to a computed direction keeps the control surface small while the result stays defensible.
- Putting the interpretation of "sun size" in the open, in the panel text and here, is better than a control that implies physics it does not have.

## Alternatives

- **A stylised sun arc:** rejected; visibly wrong against a real location.
- **Cast shadows through a custom layer:** not attempted. It is the only way to get real shadows in MapLibre, and the user accepted their absence.
- **Night lights from land use alone:** the user asked for land use, but it is missing wherever the basemap is, so the building-derived part carries the feature offline.
- **Logging focus changes:** rejected. Focus changes on every click and would bury the operation log, so the worked surface is ephemeral UI state in `WorkbenchContext` while the lighting values themselves stay logged.

## Consequences

- **No shadows.** Time of day changes facade shading, sky and fog, never shadow geometry. Buildings do not shade each other or the ground.
- **The land-use glow is environment-dependent.** With the basemap off there is no vector source, and the offline test stub serves empty tiles, so only the building-derived glow appears in tests. The building part is what the browser test asserts.
- **The sky is not cleared when leaving 3D.** `Map.setSky` takes no empty value, and nothing draws the sky at zero pitch, so the flat map is unaffected.
- **Lighting applies in 3D only.** A flat map keeps MapLibre's default light, and the panel says so.
- **Inspection's empty state is now reachable only before the map is worked in.** Startup deliberately does not claim the map: docked tabs stay mounted while hidden, so the first visibility observation is ignored and later ones count as switching to the tab.
- A saved layout and a saved project are unaffected; lighting is view state, which is neither saved nor undoable.

## Verification (2026-09-16)

Node.js 24 and Microsoft Edge with 4 workers, on `feature/basemap`.

- `npm run typecheck`, `npm run lint` and `npm run format:check` pass. `npm test` runs 158 tests in 20 files, including 8 for the solar position and 12 for the lighting mapping. `npm run test:e2e` runs 50, and `npm run test:e2e:preview` 1.
- The solar tests check the equinox noon elevation against 90 minus the latitude, both solstices against the axial tilt, solar noon falling in the afternoon in UTC because Boston is west of Greenwich, sunrise in the east, darkness at local midnight, and the polar night and midnight sun above the Arctic Circle.
- The lighting tests check that day is lit and night is not, that the sun reaches MapLibre as `[radial, azimuthal, polar]`, that haze dims the light and thickens the fog, that diffusion widens the terminator, that night lights follow their control and stay off by day, and that every appearance yields valid colours.
- A browser check on the running app confirmed what tests cannot see: with the first four stages run and 3D on, the sky renders above the horizon and the terrain control becomes available and loses its "(3D only)" label; setting the season to 31 December and the time to 00:00 UTC put the sun at -28.6 degrees, and the scene turned to night with the buildings and land use carrying the warm glow. Inspection showed the map's properties as soon as the map was worked in, and handed them back when a building was selected.

**Not verified:** the land-use glow, which needs live basemap tiles and is therefore absent from the offline browser tests; the appearance-by-appearance look of the sky, which was reviewed only in the dark appearance; and cast shadows, which MapLibre does not draw at all.
