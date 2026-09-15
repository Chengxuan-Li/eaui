# Fixture data

## `back-bay-buildings.geo.json`

Building footprints for the synthetic project in Boston Back Bay: Beacon Street, Marlborough Street, and Commonwealth Avenue between Arlington Street and Dartmouth Street ([decision 0012](../../../docs/decisions/0012-openfreemap-basemap-back-bay.md)).

- **Source:** OpenStreetMap, through the public Overpass API. The file's `source` member records the bounding box and the OSM database timestamp of the extract.
- **Attribution:** © OpenStreetMap contributors (<https://www.openstreetmap.org/copyright>).
- **Licence:** this file is a derivative database of OpenStreetMap data and is made available under the [Open Data Commons Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The ODbL applies to this data file only, not to the rest of the repository.
- **Contents:** one polygon per building with its OSM element id (`way/…` or `relation/…`) and no other tags. Coordinates are rounded to six decimal places. Multipolygon buildings keep their largest outer ring without holes. Buildings are kept when their centroid lies inside the box.
- **Regenerate:** `node scripts/fetch-osm-buildings.mjs`. The public Overpass instance is meant for occasional one-off extracts, so run it only when the extract must change, and review the diff: building ids in the app follow the order of this file.

Every building attribute the app shows (use, construction year, floors, energy and PV results) is synthetic and does not describe the real building.
