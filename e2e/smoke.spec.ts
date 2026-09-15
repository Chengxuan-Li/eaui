import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('scaffold page renders without axe violations', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'EnergyAtlas UI experiment',
  )

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
