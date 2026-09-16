import { expect, test } from './test.ts'

// One spec against the built bundle (decision 0017). The dev server resolves
// MapLibre's worker from node_modules and serves everything from "/", so it
// cannot catch a missing emitted file or a wrong base path; only a build can.
//
// Vite preview answers a missing file with index.html and a 200, so asset
// checks look at the content type rather than the status. GitHub Pages has no
// such fallback and returns a real 404.

test('the built bundle serves its assets and renders the map', async ({
  page,
}) => {
  const failed: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failed.push(`${response.status()} ${response.url()}`)
    }
  })

  await page.goto('/eaui/')
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()

  // MapLibre derives this URL from import.meta.url at run time, so the bundler
  // never sees it and the build has to emit the file next to its chunk.
  const worker = await page.request.get('/eaui/assets/maplibre-gl-worker.mjs')
  expect(worker.status()).toBe(200)
  expect(worker.headers()['content-type'] ?? '').toContain('javascript')

  // A first visit has no saved project, so the map appears once a stage runs.
  await page
    .getByRole('button', { name: 'Run Location setup / footprint capturing' })
    .first()
    .click()
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({
    timeout: 30_000,
  })

  expect(failed).toEqual([])
})
