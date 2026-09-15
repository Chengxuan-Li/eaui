import { TabNode } from 'flexlayout-react'
import { describe, expect, it } from 'vitest'
import { createWorkbench } from '../../domain/workbench.ts'
import {
  createLayoutController,
  pageTabId,
  type LayoutController,
  type PageId,
} from './layoutController.ts'

function tab(layout: LayoutController, page: PageId): TabNode {
  const node = layout.getModel().getNodeById(pageTabId(page))
  if (!(node instanceof TabNode)) throw new Error(`No tab for ${page}.`)
  return node
}

function setup() {
  const workbench = createWorkbench()
  return { workbench, layout: createLayoutController(workbench, null) }
}

describe('layout controller operations', () => {
  it('places a page beside another and keeps both visible', () => {
    const { workbench, layout } = setup()
    layout.placePage('map', 'table', 'right', 'agent')

    expect(tab(layout, 'map').getParent()?.getId()).not.toBe(
      tab(layout, 'table').getParent()?.getId(),
    )
    expect(tab(layout, 'map').isSelected()).toBe(true)
    expect(tab(layout, 'table').isSelected()).toBe(true)
    expect(workbench.store.getState().log.at(-1)).toMatchObject({
      type: 'layout.placePage',
      source: 'agent',
      status: 'applied',
      summary: 'Placed the Map page to the right of the Table page.',
    })
  })

  it('rejects placing a page beside itself', () => {
    const { workbench, layout } = setup()
    layout.placePage('map', 'map')
    expect(workbench.store.getState().log.at(-1)).toMatchObject({
      type: 'layout.placePage',
      status: 'rejected',
      issues: [{ path: '', message: 'Choose two different pages.' }],
    })
  })

  it('splits and moves the active tab from the keyboard, explaining blockers', () => {
    const { workbench, layout } = setup()
    expect(layout.moveActiveTabBlocker()).toBe(
      'There is only one tab group. Split a tab into a new group first.',
    )
    layout.moveActiveTabToNextGroup()
    expect(workbench.store.getState().log.at(-1)?.status).toBe('rejected')

    expect(layout.splitActiveTabBlocker()).toBeNull()
    layout.splitActiveTab('right')
    expect(workbench.store.getState().log.at(-1)).toMatchObject({
      type: 'layout.splitTab',
      status: 'applied',
    })

    expect(layout.moveActiveTabBlocker()).toBeNull()
    layout.moveActiveTabToNextGroup()
    expect(workbench.store.getState().log.at(-1)).toMatchObject({
      type: 'layout.moveTab',
      status: 'applied',
    })
  })
})
