import { AxeBuilder } from '@axe-core/playwright'
import { expect, serveModelStub, test, type Page } from './test.ts'

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations
    .filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    )
    .map((violation) => `${violation.id} (${violation.nodes.length})`)
}

// The language model driving presentation, styling, and layout (decision
// 0020). The provider is stubbed through this app's own route, so these run
// offline and deterministically; the real round trip was verified by hand.

const panelOf = (page: Page) => page.getByRole('region', { name: 'Reasoning' })

function message(text: string) {
  return {
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text }],
  }
}

function call(name: string, args: unknown, id = `call-${name}`) {
  return {
    type: 'function_call',
    call_id: id,
    name,
    arguments: JSON.stringify(args),
  }
}

async function chooseModel(page: Page) {
  const panel = panelOf(page)
  await panel.getByRole('button', { name: /^Model:/ }).click()
  // React Aria renders a single-selection menu's items as menuitemradio.
  await page.getByRole('menuitemradio', { name: /stub-model/ }).click()
  await expect(panel.getByRole('button', { name: /^Model:/ })).toContainText(
    'stub-model',
  )
}

async function ask(page: Page, text: string) {
  const panel = panelOf(page)
  await panel.getByRole('textbox').fill(text)
  await panel
    .getByRole('button', { name: 'Queue message', exact: true })
    .click()
}

test('the model switches appearance and arranges pages through tool calls', async ({
  page,
}) => {
  await serveModelStub(page, [
    [
      call('appearance__set', { appearance: 'darkEngineering' }),
      call('layout__placePage', {
        page: 'table',
        beside: 'map',
        side: 'right',
      }),
    ],
    [message('Switched to **Dark engineering** and placed Table beside Map.')],
  ])
  await page.goto('/')
  await expect(
    page.getByRole('toolbar', { name: 'Workbench commands' }),
  ).toBeVisible()

  await chooseModel(page)
  await ask(page, 'dark engineering, table beside the map')

  const panel = panelOf(page)
  await expect(
    panel.getByRole('listitem', { name: 'Tool call: Set appearance' }),
  ).toContainText('Applied')
  await expect(panel.getByText(/placed Table beside Map/)).toBeVisible()

  // The appearance really changed, not just the transcript.
  await expect(page.locator('html')).toHaveAttribute(
    'data-appearance',
    'darkEngineering',
  )
  await expect(
    page.getByRole('tab', { name: 'Table', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  expect(await seriousViolations(page)).toEqual([])
})

test('a model change is refused even when the model asks for it exactly', async ({
  page,
}) => {
  await serveModelStub(page, [
    [call('scenario__create', { name: 'Retrofit', measureIds: [] })],
    [message('I cannot change the project model, only how it is presented.')],
  ])
  await page.goto('/')
  await chooseModel(page)
  await ask(page, 'create a retrofit scenario')

  const panel = panelOf(page)
  await expect(panel.getByText(/changes the project model/)).toBeVisible()
  await expect(panel.getByText(/only how it is presented/)).toBeVisible()
  // Nothing was applied, so no tool call entry exists at all.
  await expect(
    panel.getByRole('listitem', { name: /^Tool call:/ }),
  ).toHaveCount(0)
})

test('resetting the layout waits for approval', async ({ page }) => {
  await serveModelStub(page, [
    [call('layout__reset', {})],
    [message('Layout restored.')],
  ])
  await page.goto('/')
  await chooseModel(page)
  await ask(page, 'reset the layout')

  const panel = panelOf(page)
  const approval = panel.getByRole('listitem', { name: 'Reset layout' })
  await expect(approval).toContainText('Waiting for your approval')
  await approval.getByRole('button', { name: 'Approve: Reset layout' }).click()

  await expect(page.getByTestId('status-notice')).toContainText(
    'Restored the default workbench layout.',
  )
})

test('the model cannot be chosen when the app has no route to one', async ({
  page,
}) => {
  // The default fixture reports the model unavailable, as a built bundle does.
  await page.goto('/')
  const panel = panelOf(page)
  await expect(panel.getByRole('button', { name: /^Model:/ })).toContainText(
    'Scripted',
  )

  await panel.getByRole('button', { name: /^Model:/ }).click()
  const live = page.getByRole('menuitemradio', { name: /Language model/ })
  await expect(live).toHaveAttribute('aria-disabled', 'true')
  await expect(live).toContainText('No model is configured')
})

test('the conversation and the view survive a reload', async ({ page }) => {
  await serveModelStub(page, [
    [call('appearance__set', { appearance: 'lieflat' })],
    [message('Switched to **Lieflat-inspired**.')],
  ])
  await page.goto('/')
  await chooseModel(page)
  await ask(page, 'use the lieflat appearance')

  const panel = panelOf(page)
  await expect(panel.getByText(/Lieflat-inspired/).first()).toBeVisible()

  await page.reload()
  // The transcript is what a backend would otherwise hold, so it comes back.
  await expect(
    panelOf(page)
      .getByText(/Switched to/)
      .first(),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute(
    'data-appearance',
    'lieflat',
  )
})

test('an approval left waiting comes back expired, not clickable', async ({
  page,
}) => {
  await serveModelStub(page, [[call('layout__reset', {})]])
  await page.goto('/')
  await chooseModel(page)
  await ask(page, 'reset the layout')

  const approval = panelOf(page).getByRole('listitem', { name: 'Reset layout' })
  await expect(approval).toContainText('Waiting for your approval')

  await page.reload()
  const restored = panelOf(page).getByRole('listitem', { name: 'Reset layout' })
  // The turn that raised it is gone, so a live button would do nothing.
  await expect(restored).toContainText('Expired when the page was reloaded')
  await expect(restored.getByRole('button', { name: /^Approve/ })).toHaveCount(
    0,
  )
})
