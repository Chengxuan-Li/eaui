# Fixture data

Building footprints for the fictional datasets ([decision 0012](../../../docs/decisions/0012-openfreemap-basemap-back-bay.md) for the first, [decision 0020](../../../docs/decisions/0020-agentic-presentation-demo.md) for the rest). Each file is one district:

| File | District | Buildings |
| --- | --- | --- |
| `back-bay-buildings.geo.json` | Boston Back Bay: Beacon Street, Marlborough Street, and Commonwealth Avenue between Arlington Street and Dartmouth Street | 464 |
| `eixample-buildings.geo.json` | Barcelona Eixample, whose chamfered octagonal blocks give the district its plan | 453 |
| `jordaan-buildings.geo.json` | Amsterdam Jordaan, a fine grain of narrow deep canal plots | 593 |
| `murray-hill-buildings.geo.json` | Murray Hill, Manhattan, where mid-block walk-ups sit beside tall towers | 529 |

The boxes cover roughly the same ground area, about 720 m by 560 m, so every dataset is a comparable district rather than a different scale of problem. The Jordaan is the exception: its grain is about three times finer, so its box is smaller to keep the building count in the same range.

- **Source:** OpenStreetMap, through the public Overpass API. Each file's `source` member records its bounding box and the OSM database timestamp of the extract.
- **Attribution:** © OpenStreetMap contributors (<https://www.openstreetmap.org/copyright>).
- **Licence:** these files are a derivative database of OpenStreetMap data and are made available under the [Open Data Commons Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The ODbL applies to these data files only, not to the rest of the repository.
- **Contents:** one polygon per building with its OSM element id (`way/…` or `relation/…`) and no other tags. Coordinates are rounded to six decimal places. Multipolygon buildings keep their largest outer ring without holes. Buildings are kept when their centroid lies inside the box.
- **Regenerate:** `node scripts/fetch-osm-buildings.mjs` for every place, or `node scripts/fetch-osm-buildings.mjs eixample` for one. The public Overpass instance is meant for occasional one-off extracts, so run it only when an extract must change, and review the diff: building ids in the app follow the order of each file. The script waits and retries when the instance rate-limits or is busy.

Back Bay is imported directly, because the app needs a district before one is chosen; the others load on demand, so three extracts do not sit in the initial bundle to show one of them.

Every building attribute the app shows (use, construction year, floors, energy and PV results) is synthetic and does not describe the real building. So is the weather, which is named after whichever district is open.
