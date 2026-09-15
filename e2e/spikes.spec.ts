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

function annotate(type: string, description: unknown) {
  test.info().annotations.push({
    type,
    description:
      typeof description === 'string'
        ? description
        : JSON.stringify(description),
  })
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
