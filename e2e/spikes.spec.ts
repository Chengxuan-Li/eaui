import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Package spikes from docs/package-selection.md, run against synthetic data.
// Each test states one requirement. A failure is a spike finding to record in
// that document, not something to retry away.

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

type ChartInstance = {
  isDisposed(): boolean
  getDom(): HTMLElement
  getWidth(): number
}

type DockPanel = {
  api: { moveTo(options: object): void; setActive(): void }
  group: unknown
}

type DockApi = {
  getPanel(id: string): DockPanel | undefined
  maximizeGroup(panel: DockPanel): void
  exitMaximizedGroup(): void
  hasMaximizedGroup(): boolean
  toJSON(): unknown
  fromJSON(data: unknown): void
  panels: unknown[]
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

test.describe('MapLibre spike', () => {
  test('renders GeoJSON footprints with no basemap, token, or external request', async ({
    page,
  }) => {
    const externalRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (
        url.protocol.startsWith('http') &&
        url.hostname !== '127.0.0.1' &&
        url.hostname !== 'localhost'
      ) {
        externalRequests.push(request.url())
      }
    })

    await page.goto('/?spike=map')
    const rendered = await waitForRenderedBuildings(page)
    annotate('rendered building features', rendered)

    expect(rendered).toBeGreaterThan(0)
    expect(externalRequests).toEqual([])
  })

  test('resizes the canvas when the container changes size', async ({
    page,
  }) => {
    await page.goto('/?spike=map')
    await waitForRenderedBuildings(page)
    await page.setViewportSize({ width: 900, height: 700 })

    await expect
      .poll(async () => {
        const state = await mapCanvasState(page)
        return (
          !!state &&
          state.containerWidth <= 900 &&
          state.canvasWidth === state.containerWidth
        )
      })
      .toBe(true)
  })
})

test.describe('AG Grid Community spike', () => {
  test('moves the focused cell with arrow keys inside an ARIA grid', async ({
    page,
  }) => {
    await page.goto('/?spike=grid')
    await expect(page.getByRole('grid')).toBeVisible()

    await page.locator('[row-index="0"] [col-id="name"]').click()
    await page.keyboard.press('ArrowDown')

    const focused = await page.evaluate(() => {
      const api = (window as SpikeWindow).__spike?.instances.grid as {
        getFocusedCell(): {
          rowIndex: number
          column: { getColId(): string }
        } | null
      }
      const cell = api.getFocusedCell()
      return cell
        ? { row: cell.rowIndex, column: cell.column.getColId() }
        : null
    })
    expect(focused).toEqual({ row: 1, column: 'name' })
  })

  test('holds edits as pending outside the grid until cancel', async ({
    page,
  }) => {
    await page.goto('/?spike=grid')
    const floorsCell = page.locator('[row-index="0"] [col-id="floors"]')
    const original = (await floorsCell.innerText()).trim()

    await floorsCell.dblclick()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('59')
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('pending-count')).toHaveText('1 pending row')
    await expect(floorsCell).toHaveText('59')

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByTestId('pending-count')).toHaveText('0 pending rows')
    await expect(floorsCell).toHaveText(original)
  })

  test('rejects an invalid edit with a visible message', async ({ page }) => {
    await page.goto('/?spike=grid')
    const floorsCell = page.locator('[row-index="0"] [col-id="floors"]')

    await floorsCell.dblclick()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('0')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('alert')).toHaveText(
      'Floors must be a whole number from 1 to 60.',
    )
    await expect(page.getByTestId('pending-count')).toHaveText('0 pending rows')
  })
})

test.describe('React Flow spike', () => {
  test('read-only roadmap nodes take focus and ignore arrow-key moves', async ({
    page,
  }) => {
    await page.goto('/?spike=flow')
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(12)

    const first = nodes.first()
    await first.focus()
    await expect(first).toBeFocused()
    annotate('node role', await first.getAttribute('role'))
    annotate('node aria-label', await first.getAttribute('aria-label'))

    const before = await first.getAttribute('style')
    await page.keyboard.press('ArrowRight')
    expect(await first.getAttribute('style')).toBe(before)

    await page.keyboard.press('Tab')
    annotate(
      'focus after Tab',
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute('data-id') ??
          document.activeElement?.tagName ??
          null,
      ),
    )
  })
})

test.describe('dockview spike', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?spike=docking')
    await waitForRenderedBuildings(page)
  })

  test('keeps map and chart instances alive through hide, move, and maximize', async ({
    page,
  }) => {
    const mapMounts = await mountCount(page, 'map')
    const chartMounts = await mountCount(page, 'chart')

    // Hide: activate the Table tab in the map's group.
    await page.getByRole('tab', { name: 'Table' }).click()
    expect(await mapCanvasState(page)).toMatchObject({
      connected: true,
      contextLost: false,
    })

    // Move: put the map into the chart's group.
    await page.evaluate(() => {
      const api = (window as SpikeWindow).__spike?.instances.dockview as DockApi
      const map = api.getPanel('map')
      const chart = api.getPanel('chart')
      if (!map || !chart) throw new Error('Missing spike panels')
      map.api.moveTo({ group: chart.group, position: 'center' })
    })

    // Maximize and restore.
    const maximized = await page.evaluate(() => {
      const api = (window as SpikeWindow).__spike?.instances.dockview as DockApi
      const map = api.getPanel('map')
      if (!map) throw new Error('Missing map panel')
      map.api.setActive()
      api.maximizeGroup(map)
      const wasMaximized = api.hasMaximizedGroup()
      api.exitMaximizedGroup()
      return wasMaximized
    })
    expect(maximized).toBe(true)

    await waitForRenderedBuildings(page)
    expect(await mountCount(page, 'map')).toBe(mapMounts)
    expect(await mountCount(page, 'chart')).toBe(chartMounts)

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

    const chart = await page.evaluate(() => {
      const instance = (window as SpikeWindow).__spike?.instances.chart as
        ChartInstance | undefined
      if (!instance) return null
      // ECharts reports an undisposed chart as a falsy value, not strictly false.
      return {
        disposed: instance.isDisposed() === true,
        connected: instance.getDom().isConnected,
      }
    })
    expect(chart).toEqual({ disposed: false, connected: true })
  })

  test('serializes and restores the layout including edge groups', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const api = (window as SpikeWindow).__spike?.instances.dockview as DockApi
      const saved = api.toJSON()
      const panelCount = api.panels.length
      api.fromJSON(saved)
      return {
        panelCount,
        restoredCount: api.panels.length,
        includesEdgeGroups: JSON.stringify(saved).includes('left-edge'),
      }
    })
    annotate('layout round trip', result)
    expect(result.restoredCount).toBe(result.panelCount)
    expect(result.includesEdgeGroups).toBe(true)
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

  test('exposes tabs with ARIA tab roles', async ({ page }) => {
    const tablists = await page.getByRole('tablist').count()
    const tabs = await page.getByRole('tab').count()
    annotate('tablists and tabs', { tablists, tabs })
    expect(tabs).toBeGreaterThanOrEqual(7)
  })

  test('moves focus to another group with F6', async ({ page }) => {
    test.fail(
      true,
      'Finding: keyboardNavigation requires the dockview-enterprise KeyboardNavigation module.',
    )
    await page.getByRole('tab', { name: 'Table' }).click()
    const describeFocus = () =>
      page.evaluate(() => {
        const element = document.activeElement
        return element
          ? `${element.tagName} ${element.getAttribute('role') ?? ''} ${element.textContent?.trim().slice(0, 40) ?? ''}`
          : null
      })
    const before = await describeFocus()
    await page.keyboard.press('F6')
    const after = await describeFocus()
    annotate('focus before and after F6', { before, after })
    expect(after).not.toBe(before)
  })

  test('resizes groups from the keyboard', async ({ page }) => {
    test.fail(
      true,
      'Finding: dockview free-core sashes have no separator role or keyboard resizing.',
    )
    const separators = page.getByRole('separator')
    const count = await separators.count()
    const sashes = await page.locator('[class*="sash"]').count()
    annotate('separators and sash elements', { count, sashes })
    expect(count).toBeGreaterThan(0)

    const mapBox = page.getByTestId('chart-spike')
    const before = (await mapBox.boundingBox())?.width
    const separator = separators.first()
    await separator.focus()
    await expect(separator).toBeFocused()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    const after = (await mapBox.boundingBox())?.width
    annotate('chart width before and after ArrowLeft x5', { before, after })
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
