import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Design alignment (guidelines section 10): Reasoning and Inspection share the
// right-side context panel, and Inspection follows the shared selection.

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
  const workflowTab = page.getByRole('tab', { name: 'Workflow', exact: true })
  if ((await workflowTab.getAttribute('aria-selected')) !== 'true') {
    await workflowTab.click()
  }
  const workflow = page.getByRole('region', { name: 'Workflow' })
  for (const name of names) {
    const item = workflow.getByRole('listitem').filter({ hasText: name })
    await item.getByRole('button', { name: `Run ${name}` }).click()
    await expect(item).toContainText('Complete', { timeout: 10_000 })
  }
}

async function selectFirstBuildingInTable(page: Page) {
  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  await page.locator('[row-index="0"] [col-id="name"]').click()
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()
})

test('inspection shows the shared selection read-only', async ({ page }) => {
  await runStages(page, [
    'Location setup / footprint capturing',
    'Geospatial data enriching',
  ])
  const context = page.getByRole('region', { name: 'Context' })
  await expect(context.getByRole('tab', { name: 'Reasoning' })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  await context.getByRole('tab', { name: 'Inspection' }).click()
  await expect(context.getByText('Nothing selected')).toBeVisible()
  await expect(page.getByTestId('status-notice')).toContainText(
    'The context panel shows Inspection.',
  )

  await selectFirstBuildingInTable(page)
  await expect(context.locator('header').first()).toContainText('B0001')
  await expect(
    context.getByRole('region', { name: 'Properties' }),
  ).toContainText('Floors')
  await expect(
    context.getByRole('region', { name: 'Provenance' }),
  ).toContainText('Simulated')
  expect(await seriousViolations(page)).toEqual([])

  await context
    .getByRole('button', { name: 'Clear selection from Inspection' })
    .click()
  await expect(context.getByText('Nothing selected')).toBeVisible()
  await expect(page.getByText('0 selected', { exact: true })).toBeVisible()
})

test('inspect selection opens the context panel on Inspection', async ({
  page,
}) => {
  await runStages(page, ['Location setup / footprint capturing'])
  const contextTab = page.getByRole('tab', { name: 'Context', exact: true })
  await expect(contextTab).toHaveAttribute('aria-selected', 'true')
  await contextTab.click()
  await expect(contextTab).toHaveAttribute('aria-selected', 'false')

  await selectFirstBuildingInTable(page)
  await page.keyboard.press('Control+k')
  await page.keyboard.type('inspect selection')
  await page.keyboard.press('Enter')

  await expect(contextTab).toHaveAttribute('aria-selected', 'true')
  const context = page.getByRole('region', { name: 'Context' })
  await expect(
    context.getByRole('tab', { name: 'Inspection' }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(context.locator('header').first()).toContainText('B0001')
})
