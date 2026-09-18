import { test as base, type Page } from '@playwright/test'

// Product specs import `test` and `expect` from here. Every page serves a small
// stand-in for the OpenFreeMap style, TileJSON, and tiles, so tests stay
// offline and repeatable (decision 0012). Call blockBasemap before navigating
// to exercise the fallback.

export { expect, type Locator, type Page } from '@playwright/test'

const OPENFREEMAP = 'https://tiles.openfreemap.org/**'
const CORS = { 'Access-Control-Allow-Origin': '*' }

export const STUB_BASEMAP_STYLE = {
  version: 8,
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': 'rgb(242,243,240)' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': 'rgb(194, 200, 202)' },
    },
  ],
}

const STUB_TILEJSON = {
  tilejson: '3.0.0',
  tiles: ['https://tiles.openfreemap.org/planet/stub/{z}/{x}/{y}.pbf'],
  minzoom: 0,
  maxzoom: 14,
}

export async function serveBasemapStub(page: Page): Promise<void> {
  await page.unroute(OPENFREEMAP)
  await page.route(OPENFREEMAP, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname.startsWith('/styles/')) {
      return route.fulfill({ json: STUB_BASEMAP_STYLE, headers: CORS })
    }
    if (pathname === '/planet') {
      return route.fulfill({ json: STUB_TILEJSON, headers: CORS })
    }
    // Empty tiles: the basemap renders only its background and water color.
    return route.fulfill({ status: 204, body: '', headers: CORS })
  })
}

// Terrain (decision 0015): an 8x8 terrarium PNG at elevation 0, so terrain
// renders flat without the network.
const MAPTERHORN = 'https://tiles.mapterhorn.com/**'
const FLAT_TERRAIN_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGNoYGDAirCLDloJAKF8IAFkxpMYAAAAAElFTkSuQmCC',
  'base64',
)

export async function serveTerrainStub(page: Page): Promise<void> {
  await page.unroute(MAPTERHORN)
  await page.route(MAPTERHORN, (route) =>
    route.fulfill({
      status: 200,
      body: FLAT_TERRAIN_TILE,
      contentType: 'image/png',
      headers: CORS,
    }),
  )
}

export async function blockTerrain(page: Page): Promise<void> {
  await page.unroute(MAPTERHORN)
  await page.route(MAPTERHORN, (route) => route.abort('internetdisconnected'))
}

export async function blockBasemap(page: Page): Promise<void> {
  await page.unroute(OPENFREEMAP)
  await page.route(OPENFREEMAP, (route) => route.abort('internetdisconnected'))
}

// The language model (decision 0020) is reached through this app's own
// dev-server route. No spec may ever call a real provider, and the model menu
// must not depend on whether the machine running the tests has a key, so every
// page reports the model as unavailable unless the spec stubs it.
const MODEL_ROUTE = '**/api/llm/**'

export async function blockModel(page: Page): Promise<void> {
  await page.unroute(MODEL_ROUTE)
  await page.route(MODEL_ROUTE, (route) => {
    if (route.request().url().includes('/health')) {
      return route.fulfill({
        json: {
          available: false,
          model: null,
          reason: 'No model is configured in this test run.',
        },
      })
    }
    return route.abort('internetdisconnected')
  })
}

/** Replays canned model turns in order, one per request. */
export async function serveModelStub(
  page: Page,
  turns: unknown[][],
  model = 'stub-model',
): Promise<void> {
  let index = 0
  await page.unroute(MODEL_ROUTE)
  await page.route(MODEL_ROUTE, (route) => {
    if (route.request().url().includes('/health')) {
      return route.fulfill({ json: { available: true, model, reason: null } })
    }
    const output = turns[index] ?? []
    index += 1
    return route.fulfill({ json: { output } })
  })
}

export const test = base.extend<{ basemapStub: undefined }>({
  basemapStub: [
    async ({ page }, use) => {
      await serveBasemapStub(page)
      await serveTerrainStub(page)
      await blockModel(page)
      await use(undefined)
    },
    { auto: true },
  ],
})
