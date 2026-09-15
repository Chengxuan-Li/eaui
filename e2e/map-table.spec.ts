import { AxeBuilder } from '@axe-core/playwright'
import {
  blockBasemap,
  expect,
  serveBasemapStub,
  test,
  type Page,
} from './test.ts'

// First-slice build stage 3b: Map and Table with linked selection and pending edits.

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations
    .filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    )
    .map((violation) => `${violation.id} (${violation.nodes.length})`)
}

async function runStages(page: Page, names: string[]) {
  await page.getByRole('tab', { name: 'Workflow', exact: true }).click()
  const workflow = page.getByRole('region', { name: 'Workflow' })
  for (const name of names) {
    const item = workflow.getByRole('listitem').filter({ hasText: name })
    await item.getByRole('button', { name: `Run ${name}` }).click()
    await expect(item).toContainText('Complete', { timeout: 10_000 })
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()
})

test('table and map explain what is missing before footprints exist', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  await expect(page.getByText('No buildings yet')).toBeVisible()
  await page.getByRole('tab', { name: 'Map', exact: true }).click()
  await expect(page.getByText('No footprints yet')).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})

test('table validates floor edits, holds them pending, and applies them', async ({
  page,
}) => {
  await runStages(page, [
    'Location setup / footprint capturing',
    'Geospatial data enriching',
  ])
  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  const floors = page.locator('[row-index="0"] [col-id="floors"]')
  await expect(floors).toBeVisible()
  const original = (await floors.innerText()).trim()

  await floors.dblclick()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText(
    'Floors must be a whole number from 1 to 60.',
  )

  const edited = original === '11' ? '10' : String(Number(original) + 1)
  await floors.dblclick()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type(edited)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('pending-count')).toHaveText('1 pending edit')
  await expect(floors).toHaveText(edited)
  await expect(floors).toHaveClass(/eaui-pending-cell/)

  await page.getByRole('button', { name: 'Apply pending edits' }).click()
  await expect(page.getByTestId('pending-count')).toHaveText('0 pending edits')
  await expect(page.getByTestId('status-notice')).toContainText(
    'Applied 1 edit',
  )
  await expect(floors).toHaveText(edited)
  expect(await seriousViolations(page)).toEqual([])
})

test('selection is shared between the table and the map', async ({ page }) => {
  await runStages(page, ['Location setup / footprint capturing'])
  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  await page.locator('[row-index="0"] [col-id="name"]').click()
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()

  await page.getByRole('tab', { name: 'Map', exact: true }).click()
  await expect(page.getByTestId('map-selection')).toHaveText(
    '1 building selected: B0001',
  )
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()

  await page.getByRole('button', { name: 'Clear selection' }).click()
  await expect(page.getByTestId('map-selection')).toHaveText('Nothing selected')

  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  await expect(page.locator('[row-index="0"]').first()).not.toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('0 selected', { exact: true })).toBeVisible()
})

// Decision 0012: OpenFreeMap basemap over OpenStreetMap footprints. The shared
// fixture in e2e/test.ts serves a stand-in style and empty tiles.

test('map shows the basemap with credits for the basemap and the footprints', async ({
  page,
}) => {
  await runStages(page, ['Location setup / footprint capturing'])
  await page.getByRole('tab', { name: 'Map', exact: true }).click()
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  const attribution = page.locator('.maplibregl-ctrl-attrib')
  await expect(attribution).toContainText('OpenFreeMap')
  await expect(attribution).toContainText('OpenMapTiles')
  await expect(attribution).toContainText('OpenStreetMap contributors')
  await expect(page.getByTestId('basemap-status')).toHaveText('')
  expect(await seriousViolations(page)).toEqual([])
})

test('map falls back to a plain background when the basemap cannot load, then retries', async ({
  page,
}) => {
  await blockBasemap(page)
  await page.reload()
  await runStages(page, ['Location setup / footprint capturing'])
  await page.getByRole('tab', { name: 'Map', exact: true }).click()

  const status = page.getByTestId('basemap-status')
  await expect(status).toContainText('Basemap unavailable')
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText(
    'OpenStreetMap contributors',
  )
  expect(await seriousViolations(page)).toEqual([])

  await serveBasemapStub(page)
  await page
    .getByRole('button', { name: 'Try loading the basemap again' })
    .click()
  await expect(status).toHaveText('')
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText(
    'OpenFreeMap',
  )
})

test('settings turns the basemap off and keeps the choice across reloads', async ({
  page,
}) => {
  // Settings can sit in the tab overflow menu at 1280 px; open it by command.
  await page.keyboard.press('Control+k')
  await page.keyboard.type('open settings')
  await page.keyboard.press('Enter')

  const toggle = page.getByRole('checkbox', {
    name: 'Show the OpenFreeMap basemap',
  })
  await expect(toggle).toBeChecked()
  // React Aria keeps the native checkbox visually hidden; use the keyboard.
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).not.toBeChecked()
  await expect(page.getByTestId('status-notice')).toContainText(
    'The Map shows footprints on a plain background.',
  )

  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: 'Show the OpenFreeMap basemap' }),
  ).not.toBeChecked()

  await runStages(page, ['Location setup / footprint capturing'])
  await page.getByRole('tab', { name: 'Map', exact: true }).click()
  const attribution = page.locator('.maplibregl-ctrl-attrib')
  await expect(attribution).toContainText('OpenStreetMap contributors')
  await expect(attribution).not.toContainText('OpenFreeMap')
  await expect(page.getByTestId('basemap-status')).toHaveText('')
})
