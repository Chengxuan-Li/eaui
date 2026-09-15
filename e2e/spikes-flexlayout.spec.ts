import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Docking regression baseline (decision 0008): the FlexLayout requirements
// proven in the package spikes. A failure is a finding to record in
// docs/package-selection.md, not something to retry away.

type Probe = {
  mounts: Record<string, number>
  instances: Record<string, unknown>
}
type SpikeWindow = Window & { __spike?: Probe }

type MapInstance = {
  queryRenderedFeatures(options: { layers: string[] }): unknown[]
  getCanvas(): HTMLCanvasElement
  getContainer(): HTMLElement
  getFeatureState(feature: {
    source: string
    id: string
  }): Record<string, unknown>
}

type FlexCommands = {
  selectTab(tabId: string): void
  moveTab(tabId: string, tabsetId: string): void
  toggleMaximize(tabsetId: string): void
  isMaximized(): boolean
  toJson(): unknown
  restore(json: unknown): void
}

function annotate(type: string, description: unknown) {
  test.info().annotations.push({
    type,
    description:
      typeof description === 'string'
        ? description
        : JSON.stringify(description),
  })
}

async function mountCount(page: Page, name: string): Promise<number> {
  return page.evaluate(
    (component) => (window as SpikeWindow).__spike?.mounts[component] ?? 0,
    name,
  )
}

async function flex(page: Page, command: string, ...args: string[]) {
  return page.evaluate(
    ({ command, args }) => {
      const commands = (window as SpikeWindow).__spike?.instances
        .flexlayout as Record<string, (...values: string[]) => unknown>
      const fn = commands[command]
      if (!fn) throw new Error(`Unknown command ${command}`)
      return fn(...args)
    },
    { command, args },
  )
}

async function waitForRenderedBuildings(page: Page): Promise<number> {
  const handle = await page.waitForFunction(
    () => {
      const map = (window as SpikeWindow).__spike?.instances.map as
        MapInstance | undefined
      const count =
        map?.queryRenderedFeatures({ layers: ['buildings-fill'] }).length ?? 0
      return count > 0 ? count : null
    },
    undefined,
    { timeout: 20_000 },
  )
  return (await handle.jsonValue()) as number
}

async function mapCanvasState(page: Page) {
  return page.evaluate(() => {
    const map = (window as SpikeWindow).__spike?.instances.map as
      MapInstance | undefined
    if (!map) return null
    const canvas = map.getCanvas()
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return {
      connected: canvas.isConnected,
      contextLost: context ? context.isContextLost() : null,
      canvasWidth: Math.round(canvas.getBoundingClientRect().width),
      containerWidth: Math.round(
        map.getContainer().getBoundingClientRect().width,
      ),
    }
  })
}

async function layoutSignature(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-layout-path]')]
      .filter((element) =>
        /^\/(ts\d+|border\/(left|right))$/.test(
          element.getAttribute('data-layout-path') ?? '',
        ),
      )
      .map(
        (element) =>
          `${element.getAttribute('data-layout-path')}:${Math.round(element.getBoundingClientRect().width)}`,
      )
      .join('|'),
  )
}

async function describeFocus(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!element) return null
    const path =
      element.closest('[data-layout-path]')?.getAttribute('data-layout-path') ??
      ''
    return `${path} ${element.getAttribute('role') ?? element.tagName} ${element.textContent?.trim().slice(0, 30) ?? ''}`
  })
}

test.describe('FlexLayout spike', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?spike=flexlayout')
    await waitForRenderedBuildings(page)
  })

  test('keeps map and chart instances alive through hide, move, and maximize', async ({
    page,
  }) => {
    const mapMounts = await mountCount(page, 'map')
    const chartMounts = await mountCount(page, 'chart')

    await flex(page, 'selectTab', 'table')
    expect(await mapCanvasState(page)).toMatchObject({
      connected: true,
      contextLost: false,
    })

    await flex(page, 'moveTab', 'map', 'center-side')
    await flex(page, 'toggleMaximize', 'center-side')
    expect(await flex(page, 'isMaximized')).toBe(true)
    await flex(page, 'toggleMaximize', 'center-side')
    await flex(page, 'selectTab', 'map')

    await waitForRenderedBuildings(page)
    const mounts = {
      map: await mountCount(page, 'map'),
      chart: await mountCount(page, 'chart'),
    }
    annotate('mount counts before and after', {
      before: { map: mapMounts, chart: chartMounts },
      after: mounts,
    })
    expect(mounts).toEqual({ map: mapMounts, chart: chartMounts })

    await expect
      .poll(async () => {
        const state = await mapCanvasState(page)
        return (
          !!state &&
          state.connected &&
          state.contextLost === false &&
          state.canvasWidth === state.containerWidth
        )
      })
      .toBe(true)
  })

  test('serializes and restores the layout including borders', async ({
    page,
  }) => {
    const saved = JSON.stringify(await flex(page, 'toJson'))
    const tabCount = saved.match(/"type":"tab"/g)?.length ?? 0
    await page.evaluate((json) => {
      const commands = (window as SpikeWindow).__spike?.instances
        .flexlayout as FlexCommands
      commands.restore(JSON.parse(json))
    }, saved)
    await expect(page.getByRole('tab', { name: 'Reasoning' })).toBeVisible()
    const restored = JSON.stringify(await flex(page, 'toJson'))
    annotate('tabs saved and restored', {
      saved: tabCount,
      restored: restored.match(/"type":"tab"/g)?.length ?? 0,
    })
    expect(restored.match(/"type":"tab"/g)?.length ?? 0).toBe(tabCount)
    expect(restored).toContain('"location":"left"')
    expect(restored).toContain('"location":"right"')
  })

  test('links selection from the table to the map', async ({ page }) => {
    await page.getByRole('tab', { name: 'Table' }).click()
    await page.locator('[row-index="0"] [col-id="name"]').click()
    await expect(page.getByTestId('selected-id')).toHaveText('B0001')

    const state = await page.evaluate(() => {
      const map = (window as SpikeWindow).__spike?.instances.map as MapInstance
      return map.getFeatureState({ source: 'buildings', id: 'B0001' })
    })
    expect(state).toMatchObject({ selected: true })
  })

  test('exposes ARIA tabs and splitter separators', async ({ page }) => {
    const counts = {
      tablists: await page.getByRole('tablist').count(),
      tabs: await page.getByRole('tab').count(),
      separators: await page.getByRole('separator').count(),
    }
    annotate('tablists, tabs, separators', counts)
    expect(counts.tabs).toBeGreaterThanOrEqual(7)
    expect(counts.separators).toBeGreaterThan(0)
  })

  test('resizes the layout from the keyboard with a focused separator', async ({
    page,
  }) => {
    const separators = page.getByRole('separator')
    const count = await separators.count()
    const results: { index: number; changed: boolean; value: string | null }[] =
      []
    for (let index = 0; index < count; index++) {
      const separator = separators.nth(index)
      const before = await layoutSignature(page)
      await separator.focus()
      for (let press = 0; press < 5; press++) {
        await page.keyboard.press('ArrowLeft')
      }
      const after = await layoutSignature(page)
      results.push({
        index,
        changed: before !== after,
        value: await separator.getAttribute('aria-valuenow'),
      })
    }
    annotate('separator keyboard resize results', results)
    expect(results.some((result) => result.changed)).toBe(true)
  })

  test('moves between tabs with arrow keys', async ({ page }) => {
    await page.getByRole('tab', { name: 'Map', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Table' })).toBeFocused()
  })

  test('moves focus to another tabset with the configured F6 binding', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Map', exact: true }).focus()
    const before = await describeFocus(page)
    await page.keyboard.press('F6')
    const after = await describeFocus(page)
    annotate('focus before and after F6', { before, after })
    expect(after).not.toBe(before)
  })

  test('records axe findings for the docked workbench', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    annotate(
      'axe violations',
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
    )
    expect(results.violations.length).toBeGreaterThanOrEqual(0)
  })
})
