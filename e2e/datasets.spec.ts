import { expect, test, type Page } from './test.ts'

// Several fictional districts, each at a different point in the workflow
// (decision 0020). Opening one replays real commands, so what appears is a
// state the app could have reached by hand.

async function openDistrict(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: /Open district/ }).click()
  await page.getByRole('menuitem', { name }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()
})

test('opening a district replaces the project with that place', async ({
  page,
}) => {
  await expect(page.getByText('No footprints yet')).toBeVisible()

  await openDistrict(page, /Barcelona Eixample/)

  await expect(page.getByTestId('status-notice')).toContainText(
    'Opened "Barcelona Eixample"',
  )
  // The empty state is gone because the recipe captured and enriched footprints.
  await expect(page.getByText('No footprints yet')).toBeHidden()
  await expect(page.getByRole('banner')).toContainText('Barcelona Eixample')
})

test('a district arrives at its own point in the workflow', async ({
  page,
}) => {
  await openDistrict(page, /Manhattan Murray Hill/)
  await expect(page.getByTestId('status-notice')).toContainText(
    'Grid modelling failed',
  )

  // Its grid run failed by design, so the failure is real state, not a label.
  await page.getByRole('tab', { name: 'Workflow' }).click()
  const workflow = page.getByRole('region', { name: 'Workflow' })
  await expect(workflow.getByText('Failed').first()).toBeVisible()
})

test('a skipped stage leaves its metric unavailable and says what to run', async ({
  page,
}) => {
  await openDistrict(page, /Barcelona Eixample/)

  const map = page.getByRole('region', { name: 'Map' }).first()
  // Eixample skipped shading, so PV yield has no data and the page says why.
  await expect(map.getByText(/Not available yet: PV yield/)).toBeVisible()
  await expect(
    map.getByText(/Shading calculation \/ PV yield estimation/),
  ).toBeVisible()
})

test('the agent suggests the questions that belong to the open district', async ({
  page,
}) => {
  const panel = page.getByRole('region', { name: 'Reasoning' })
  await openDistrict(page, /Amsterdam Jordaan/)

  // Scripted is still the model, so its own sessions stay the suggestions.
  await expect(
    panel.getByRole('button', { name: /Map beside Table, tallest buildings/ }),
  ).toBeVisible()
})
