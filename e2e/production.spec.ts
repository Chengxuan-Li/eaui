import { BASE_PATH } from '../basePath.ts'
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

  await page.goto(BASE_PATH)
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()

  // MapLibre derives this URL from import.meta.url at run time, so the bundler
  // never sees it and the build has to emit the file next to its chunk.
  const worker = await page.request.get(
    `${BASE_PATH}assets/maplibre-gl-worker.mjs`,
  )
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

test('the built bundle has no route to a model and no key in it', async ({
  page,
}) => {
  await page.goto(BASE_PATH)
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()

  // The proxy is registered for the dev server only, so preview answers this
  // with index.html. A JSON content type is the only reliable signal, because
  // preview returns 200 for anything it cannot find (decision 0017).
  const health = await page.request.get(`${BASE_PATH}api/llm/health`)
  expect(health.headers()['content-type'] ?? '').not.toContain(
    'application/json',
  )

  // So the agent stays scripted and says why the model cannot be chosen.
  const panel = page.getByRole('region', { name: 'Reasoning' })
  await expect(panel.getByRole('button', { name: /^Model:/ })).toContainText(
    'Scripted',
  )
  await panel.getByRole('button', { name: /^Model:/ }).click()
  await expect(
    page.getByRole('menuitemradio', { name: /Language model/ }),
  ).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')

  // The key must never be compiled into a shipped chunk.
  const html = await (await page.request.get(BASE_PATH)).text()
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(
    (match) => match[1],
  )
  expect(scripts.length).toBeGreaterThan(0)
  for (const src of scripts) {
    const body = await (await page.request.get(src)).text()
    expect(body).not.toContain('sk-proj')
    expect(body).not.toMatch(/OPENAI_API_KEY\s*[:=]\s*["'][^"']+["']/)
  }
})
