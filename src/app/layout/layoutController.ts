import {
  Actions,
  DockLocation,
  Model,
  TabNode,
  TabSetNode,
  type Action,
  type IJsonModel,
  type IJsonTabNode,
} from 'flexlayout-react'
import type { CommandSource } from '../../domain/types.ts'
import type { Workbench } from '../../domain/workbench.ts'

// Wraps the FlexLayout model (decisions 0004 and 0008). Layout state stays out
// of project state, but every deliberate layout change is a typed operation
// recorded in the workbench log, so manual controls and the agent share it.

export const PAGES = {
  map: { name: 'Map', component: 'page.map' },
  table: { name: 'Table', component: 'page.table' },
  dashboard: { name: 'Dashboard', component: 'page.dashboard' },
  roadmap: { name: 'Roadmap', component: 'page.roadmap' },
  creator: { name: 'Creator', component: 'page.creator' },
  settings: { name: 'Settings', component: 'page.settings' },
  issues: { name: 'Issues', component: 'page.issues' },
  tasks: { name: 'Tasks', component: 'page.tasks' },
} as const

export const PANELS = {
  assets: { name: 'Assets', component: 'panel.assets' },
  workflow: { name: 'Workflow', component: 'panel.workflow' },
  // The context panel (Reasoning | Inspection) keeps the panel.reasoning
  // component id so layouts saved before the rename still restore.
  reasoning: { name: 'Context', component: 'panel.reasoning' },
} as const

export type PageId = keyof typeof PAGES
export type PanelId = keyof typeof PANELS

export const DEFAULT_PAGES: PageId[] = [
  'map',
  'table',
  'dashboard',
  'roadmap',
  'creator',
  'settings',
]

export const MAIN_TABSET_ID = 'tabset:main'
const LAYOUT_KEY = 'eaui.layout.v1'

export function pageTabId(page: PageId): string {
  return `page:${page}`
}

export function panelTabId(panel: PanelId): string {
  return `panel:${panel}`
}

function pageTab(page: PageId): IJsonTabNode {
  return {
    type: 'tab',
    id: pageTabId(page),
    name: PAGES[page].name,
    component: PAGES[page].component,
  }
}

function panelTab(panel: PanelId): IJsonTabNode {
  return {
    type: 'tab',
    id: panelTabId(panel),
    name: PANELS[panel].name,
    component: PANELS[panel].component,
    enableClose: false,
  }
}

export function createDefaultLayout(): IJsonModel {
  return {
    global: {
      // Keep panels mounted so maps and charts keep their state when hidden.
      tabEnableRenderOnDemand: false,
      tabEnablePopout: false,
      tabEnableFloat: false,
      enableRotateBorderIcons: false,
      borderEnableAutoHide: false,
      borderMinSize: 180,
    },
    borders: [
      {
        type: 'border',
        location: 'left',
        size: 280,
        selected: 0,
        children: [panelTab('assets'), panelTab('workflow')],
      },
      {
        type: 'border',
        location: 'right',
        size: 320,
        selected: 0,
        children: [panelTab('reasoning')],
      },
    ],
    layout: {
      type: 'row',
      children: [
        {
          type: 'tabset',
          id: MAIN_TABSET_ID,
          weight: 100,
          selected: 0,
          enableDeleteWhenEmpty: false,
          children: DEFAULT_PAGES.map(pageTab),
        },
      ],
    },
  }
}

export type LayoutController = {
  getModel: () => Model
  /** Increments on every layout change, for useSyncExternalStore. */
  getVersion: () => number
  subscribe: (listener: () => void) => () => void
  openPage: (page: PageId, source?: CommandSource) => void
  togglePanel: (panel: PanelId, source?: CommandSource) => void
  isPanelOpen: (panel: PanelId) => boolean
  toggleMaximize: (source?: CommandSource) => void
  /** Narrow windows open side panels as overlays so pages keep their width. */
  setCompact: (compact: boolean, source?: CommandSource) => void
  reset: (source?: CommandSource) => void
  /** FlexLayout onAction hook: logs meaningful manual layout changes. */
  handleUserAction: (action: Action) => Action
}

// FlexLayout does not export BorderNode's type; this is the part the controller uses.
type BorderLike = {
  getId: () => string
  getBorderType: () => 'split' | 'overlay'
  getSelectedNode: () => TabNode | undefined
}

/** Saved layouts store tab names; renamed panels take their current name. */
function withCurrentPanelNames(model: Model): Model {
  for (const panel of Object.keys(PANELS) as PanelId[]) {
    const node = model.getNodeById(panelTabId(panel))
    if (node instanceof TabNode && node.getName() !== PANELS[panel].name) {
      model.doAction(Actions.renameTab(node.getId(), PANELS[panel].name))
    }
  }
  return model
}

function restoreModel(storage: Storage | null): Model {
  try {
    const raw = storage?.getItem(LAYOUT_KEY)
    if (raw) {
      return withCurrentPanelNames(
        Model.fromJson(JSON.parse(raw) as IJsonModel),
      )
    }
  } catch {
    // Unreadable or incompatible saved layout: fall back to the default.
  }
  return Model.fromJson(createDefaultLayout())
}

export function createLayoutController(
  workbench: Workbench,
  storage: Storage | null,
): LayoutController {
  let version = 0
  const listeners = new Set<() => void>()
  let model = restoreModel(storage)

  const handleChange = () => {
    version += 1
    try {
      storage?.setItem(LAYOUT_KEY, JSON.stringify(model.toJson()))
    } catch {
      // Storage is blocked; the layout persists for this session only.
    }
    for (const listener of listeners) listener()
  }
  model.addChangeListener(handleChange)

  const log = (
    type: string,
    title: string,
    input: unknown,
    summary: string,
    source: CommandSource,
  ) => {
    workbench.record({ type, title, input, summary, source })
  }

  const reject = (
    type: string,
    title: string,
    input: unknown,
    message: string,
    source: CommandSource,
  ) => {
    workbench.record({
      type,
      title,
      input,
      source,
      status: 'rejected',
      summary: '',
      issues: [{ path: '', message }],
    })
  }

  const panelBorders = (): BorderLike[] => {
    const borders = new Map<string, BorderLike>()
    for (const panel of Object.keys(PANELS) as PanelId[]) {
      const parent = model.getNodeById(panelTabId(panel))?.getParent()
      if (parent?.getType() === 'border') {
        borders.set(parent.getId(), parent as unknown as BorderLike)
      }
    }
    return [...borders.values()]
  }

  const tabName = (id: unknown): string => {
    const node = typeof id === 'string' ? model.getNodeById(id) : undefined
    return node instanceof TabNode ? `"${node.getName()}"` : 'a tab'
  }

  return {
    getModel: () => model,
    getVersion: () => version,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    openPage: (page, source = 'manual') => {
      const id = pageTabId(page)
      const existing = model.getNodeById(id)
      if (existing instanceof TabNode) {
        // Selecting an already selected border tab would close it.
        if (!existing.isSelected()) model.doAction(Actions.selectTab(id))
      } else {
        const target =
          model.getNodeById(MAIN_TABSET_ID) ??
          model.getActiveTabset() ??
          model.getFirstTabSet()
        if (!(target instanceof TabSetNode)) {
          reject(
            'layout.openPage',
            'Open page',
            { page },
            'No tab group is available. Reset the layout.',
            source,
          )
          return
        }
        model.doAction(
          Actions.addNode(
            pageTab(page),
            target.getId(),
            DockLocation.CENTER,
            -1,
            true,
          ),
        )
      }
      log(
        'layout.openPage',
        'Open page',
        { page },
        `Opened the ${PAGES[page].name} page.`,
        source,
      )
    },

    togglePanel: (panel, source = 'manual') => {
      const id = panelTabId(panel)
      const node = model.getNodeById(id)
      if (!(node instanceof TabNode)) {
        reject(
          'layout.togglePanel',
          'Toggle panel',
          { panel },
          `The ${PANELS[panel].name} panel is not in this layout. Reset the layout.`,
          source,
        )
        return
      }
      model.doAction(Actions.selectTab(id))
      log(
        'layout.togglePanel',
        'Toggle panel',
        { panel },
        node.isSelected()
          ? `Showed the ${PANELS[panel].name} panel.`
          : `Hid the ${PANELS[panel].name} panel.`,
        source,
      )
    },

    isPanelOpen: (panel) => {
      const node = model.getNodeById(panelTabId(panel))
      return node instanceof TabNode && node.isSelected()
    },

    toggleMaximize: (source = 'manual') => {
      const tabset =
        model.getActiveTabset() ?? model.getNodeById(MAIN_TABSET_ID)
      if (!(tabset instanceof TabSetNode)) {
        reject(
          'layout.toggleMaximize',
          'Maximize or restore',
          {},
          'No tab group is active.',
          source,
        )
        return
      }
      model.doAction(Actions.maximizeToggle(tabset.getId()))
      log(
        'layout.toggleMaximize',
        'Maximize or restore',
        { tabsetId: tabset.getId() },
        model.getMaximizedTabset()
          ? 'Maximized the active tab group.'
          : 'Restored the tab layout.',
        source,
      )
    },

    setCompact: (compact, source = 'system') => {
      const borderType = compact ? 'overlay' : 'split'
      const changing = panelBorders().filter(
        (border) => border.getBorderType() !== borderType,
      )
      if (changing.length === 0) return
      for (const border of changing) {
        const selected = border.getSelectedNode()
        // Close open panels so an overlay does not cover the pages on arrival.
        if (compact && selected)
          model.doAction(Actions.selectTab(selected.getId()))
        model.doAction(Actions.setBorderType(border.getId(), borderType))
      }
      log(
        'layout.setCompact',
        'Adapt layout to window width',
        { compact },
        compact
          ? 'Narrow window: side panels now open as overlays over the pages.'
          : 'Wide window: side panels are docked beside the pages again.',
        source,
      )
    },

    reset: (source = 'manual') => {
      model.removeChangeListener(handleChange)
      model = Model.fromJson(createDefaultLayout())
      model.addChangeListener(handleChange)
      handleChange()
      log(
        'layout.reset',
        'Reset layout',
        {},
        'Restored the default workbench layout.',
        source,
      )
    },

    handleUserAction: (action) => {
      const data = action.data as Record<string, unknown>
      switch (action.type) {
        case Actions.SELECT_TAB:
          log(
            'layout.selectTab',
            'Select tab',
            data,
            `Selected ${tabName(data.tabNode)}.`,
            'manual',
          )
          break
        case Actions.MOVE_NODE:
          log(
            'layout.moveTab',
            'Move tab',
            data,
            `Moved ${tabName(data.fromNode)}.`,
            'manual',
          )
          break
        case Actions.DELETE_TAB:
          log(
            'layout.closeTab',
            'Close tab',
            data,
            `Closed ${tabName(data.node)}.`,
            'manual',
          )
          break
        case Actions.MAXIMIZE_TOGGLE:
          log(
            'layout.toggleMaximize',
            'Maximize or restore',
            data,
            'Toggled the maximized tab group.',
            'manual',
          )
          break
        default:
          // Focus changes and resizing are not logged to keep the log meaningful.
          break
      }
      return action
    },
  }
}
