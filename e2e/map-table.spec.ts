import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

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
