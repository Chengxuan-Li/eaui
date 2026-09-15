// Fetches the Back Bay building footprints used by the synthetic project
// (decision 0012) from the public Overpass API and writes them as GeoJSON.
//
//   node scripts/fetch-osm-buildings.mjs
//
// The output is a derivative database of OpenStreetMap data under the ODbL;
// see src/domain/fixtures/README.md. Run it rarely: the public instance is for
// one-off extracts, and the committed file is the fixture, not this script.

import { writeFile } from 'node:fs/promises'

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const OUTPUT = new URL(
  '../src/domain/fixtures/back-bay-buildings.geo.json',
  import.meta.url,
)
// South, west, north, east: Beacon Street, Marlborough Street, and
// Commonwealth Avenue between Arlington Street and Dartmouth Street.
const BBOX = [42.35, -71.078, 42.3565, -71.0712]
const DIGITS = 6

const query = `[out:json][timeout:60];
(
  way["building"](${BBOX.join(',')});
  relation["building"]["type"="multipolygon"](${BBOX.join(',')});
);
out geom;`

const round = (value) => Number(value.toFixed(DIGITS))

function toPosition(point) {
  return [round(point.lon), round(point.lat)]
}

function samePosition(a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

/** Closes a ring and drops repeated vertices; returns null if degenerate. */
function cleanRing(positions) {
  const ring = []
  for (const position of positions) {
    if (!ring.length || !samePosition(ring.at(-1), position))
      ring.push(position)
  }
  if (ring.length > 1 && !samePosition(ring[0], ring.at(-1))) ring.push(ring[0])
  return ring.length >= 4 ? ring : null
}

/** Joins open outer member ways end to end into closed rings. */
function stitchRings(segments) {
  const open = segments.map((segment) => [...segment])
  const rings = []
  while (open.length) {
    let ring = open.shift()
    let extended = true
    while (!samePosition(ring[0], ring.at(-1)) && extended) {
      extended = false
      for (let index = 0; index < open.length; index++) {
        const segment = open[index]
        if (samePosition(ring.at(-1), segment[0])) {
          ring = [...ring, ...segment.slice(1)]
        } else if (samePosition(ring.at(-1), segment.at(-1))) {
          ring = [...ring, ...[...segment].reverse().slice(1)]
        } else {
          continue
        }
        open.splice(index, 1)
        extended = true
        break
      }
    }
    const cleaned = cleanRing(ring)
    if (cleaned) rings.push(cleaned)
  }
  return rings
}

/** Planar shoelace area in squared degrees; only used to compare rings. */
function ringArea(ring) {
  let sum = 0
  for (let index = 1; index < ring.length; index++) {
    const [x1, y1] = ring[index - 1]
    const [x2, y2] = ring[index]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

function centroidOf(ring) {
  const points = ring.slice(0, -1)
  const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length
  const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return [lng, lat]
}

function footprintOf(element) {
  if (element.type === 'way' && element.geometry) {
    return cleanRing(element.geometry.map(toPosition))
  }
  if (element.type === 'relation' && element.members) {
    const outers = element.members
      .filter((member) => member.role === 'outer' && member.geometry)
      .map((member) => member.geometry.map(toPosition))
    // The Building type holds one ring: keep the largest outer ring and drop
    // holes. Only a handful of relations fall inside the box.
    const rings = stitchRings(outers).sort((a, b) => ringArea(b) - ringArea(a))
    return rings[0] ?? null
  }
  return null
}

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'eaui-prototype-fixture/1.0 (one-off building extract)',
  },
  body: new URLSearchParams({ data: query }),
})
if (!response.ok) {
  throw new Error(
    `Overpass request failed: ${response.status} ${response.statusText}`,
  )
}
const data = await response.json()

const [south, west, north, east] = BBOX
const features = []
let skipped = 0
for (const element of data.elements ?? []) {
  const ring = footprintOf(element)
  if (!ring) {
    skipped += 1
    continue
  }
  const [lng, lat] = centroidOf(ring)
  // Keep buildings whose centroid lies in the box, so edge buildings that only
  // touch it are not cut off mid-block.
  if (lat < south || lat > north || lng < west || lng > east) continue
  features.push({
    type: 'Feature',
    properties: { osm: `${element.type}/${element.id}` },
    geometry: { type: 'Polygon', coordinates: [ring] },
    centroid: [lng, lat],
  })
}

// Stable, spatially coherent order: north to south in rows of about 25 m,
// then west to east, so generated building ids follow the street layout.
const ROW_DEGREES = 0.000225
features.sort((a, b) => {
  const rowA = Math.floor((north - a.centroid[1]) / ROW_DEGREES)
  const rowB = Math.floor((north - b.centroid[1]) / ROW_DEGREES)
  return rowA - rowB || a.centroid[0] - b.centroid[0]
})

const header = {
  type: 'FeatureCollection',
  source: {
    description:
      'Building footprints in Boston Back Bay between Arlington Street and Dartmouth Street.',
    attribution: '© OpenStreetMap contributors',
    license: 'ODbL-1.0',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    copyrightUrl: 'https://www.openstreetmap.org/copyright',
    osmBaseTimestamp: data.osm3s?.timestamp_osm_base ?? null,
    bbox: { south, west, north, east },
    generator: 'scripts/fetch-osm-buildings.mjs',
  },
}
// One feature per line keeps diffs readable without pretty-printing every
// coordinate onto its own line.
const lines = features.map(({ centroid: _centroid, ...feature }) =>
  JSON.stringify(feature),
)
const text = `${JSON.stringify(header).slice(0, -1)},"features":[\n${lines.join(',\n')}\n]}\n`
await writeFile(OUTPUT, text)

console.log(
  `Wrote ${features.length} buildings (${skipped} elements without usable geometry skipped), ${text.length} bytes, OSM data as of ${header.source.osmBaseTimestamp}.`,
)
