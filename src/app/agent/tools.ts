import { z } from 'zod'
import {
  commandDefinitions,
  describeCommands,
  type Command,
  type ValidationIssue,
} from '../../domain/commands.ts'
import type { Workbench } from '../../domain/workbench.ts'
import type { AppearanceController } from '../appearance/appearanceController.ts'
import {
  APPEARANCE_IDS,
  APPEARANCES,
  type AppearancePreference,
} from '../appearance/appearances.ts'
import {
  PAGES,
  PANELS,
  type DockSide,
  type LayoutController,
  type PageId,
  type PanelId,
} from '../layout/layoutController.ts'
import {
  describeViewOperations,
  type ViewOperation,
} from '../view/viewOperations.ts'
import type { ViewStore } from '../view/viewStore.ts'
import {
  buildContextDigest,
  readBuildings,
  MAX_BUILDING_ROWS,
  type BuildingQuery,
} from './context.ts'

// Agent tool calls go through the same paths as manual controls: project
// commands through the workbench, view operations through the view store,
// layout through the layout controller, and appearance through its controller,
// always with source "agent". Read tools change nothing and are not logged,
// because a look is not an operation (decision 0020).

export type LayoutToolOperation =
  | {
      type: 'layout.placePage'
      input: { page: PageId; beside: PageId; side: DockSide }
    }
  | { type: 'layout.openPage'; input: { page: PageId } }
  | { type: 'layout.setPanel'; input: { panel: PanelId; open: boolean } }
  | { type: 'layout.setSide'; input: { side: 'left' | 'right'; open: boolean } }
  | { type: 'layout.setMaximized'; input: { maximized: boolean } }
  | { type: 'layout.splitActiveTab'; input: { side?: DockSide } }
  | { type: 'layout.moveActiveTabToNextGroup'; input: Record<string, never> }
  | { type: 'layout.reset'; input: Record<string, never> }

export type AppearanceToolOperation = {
  type: 'appearance.set'
  input: { appearance: AppearancePreference }
}

export type ReadToolOperation =
  | { type: 'read.context'; input: Record<string, never> }
  | { type: 'read.buildings'; input: BuildingQuery }

export type ToolCall =
  | { kind: 'command'; command: Command }
  | { kind: 'view'; operation: ViewOperation }
  | { kind: 'layout'; operation: LayoutToolOperation }
  | { kind: 'appearance'; operation: AppearanceToolOperation }
  | { kind: 'read'; operation: ReadToolOperation }

export type ToolResult = {
  status: 'applied' | 'rejected'
  summary: string | null
  issues: ValidationIssue[]
  /** Operation log entries the call recorded, for linking from the transcript. */
  operationIds: string[]
  /** What a read tool returned; absent for calls that change something. */
  data?: unknown
}

export type ToolDeps = {
  workbench: Workbench
  view: ViewStore
  layout: LayoutController
  appearance: AppearanceController
}

export function command(value: Command): ToolCall {
  return { kind: 'command', command: value }
}

export function viewCall(operation: ViewOperation): ToolCall {
  return { kind: 'view', operation }
}

export function layoutCall(operation: LayoutToolOperation): ToolCall {
  return { kind: 'layout', operation }
}

export function appearanceCall(operation: AppearanceToolOperation): ToolCall {
  return { kind: 'appearance', operation }
}

export function readCall(operation: ReadToolOperation): ToolCall {
  return { kind: 'read', operation }
}

export function toolTypeOf(call: ToolCall): string {
  return call.kind === 'command' ? call.command.type : call.operation.type
}

export function toolInputOf(call: ToolCall): unknown {
  return call.kind === 'command' ? call.command.input : call.operation.input
}

/**
 * Calls that wait for approval: stage runs and project model changes, plus
 * resetting the layout, which discards an arrangement the user built and which
 * undo does not cover (decision 0020).
 */
export function requiresApproval(call: ToolCall): boolean {
  if (call.kind === 'layout') return call.operation.type === 'layout.reset'
  if (call.kind !== 'command') return false
  return (
    call.command.type === 'workflow.runStage' ||
    commandDefinitions[call.command.type].undoable
  )
}

/** Read tools answer from state and never touch the operation log. */
function executeRead(deps: ToolDeps, operation: ReadToolOperation): ToolResult {
  const project = deps.workbench.getState()
  if (operation.type === 'read.buildings') {
    const result = readBuildings(project, operation.input)
    return {
      status: 'applied',
      summary: `Read ${result.rows.length} of ${result.matched} matching buildings (${result.total} in the project).`,
      issues: [],
      operationIds: [],
      data: result,
    }
  }
  const digest = buildContextDigest({
    project,
    view: deps.view.getState(),
    layout: deps.layout.describeLayout(),
    appearance: deps.appearance.getPreference(),
  })
  return {
    status: 'applied',
    summary: 'Read the current workbench context.',
    issues: [],
    operationIds: [],
    data: digest,
  }
}

function executeLayout(deps: ToolDeps, operation: LayoutToolOperation): void {
  const { layout, workbench } = deps
  /** Says so in the log when the layout already matches, so nothing is silent. */
  const alreadyThere = (summary: string) => {
    workbench.record({
      type: operation.type,
      title: 'Layout already matches',
      input: operation.input,
      source: 'agent',
      summary,
    })
  }

  switch (operation.type) {
    case 'layout.placePage':
      layout.placePage(
        operation.input.page,
        operation.input.beside,
        operation.input.side,
        'agent',
      )
      return
    case 'layout.openPage':
      layout.openPage(operation.input.page, 'agent')
      return
    case 'layout.setPanel': {
      const { panel, open } = operation.input
      if (layout.isPanelOpen(panel) === open) {
        alreadyThere(
          `The ${PANELS[panel].name} panel is already ${open ? 'open' : 'closed'}.`,
        )
        return
      }
      layout.togglePanel(panel, 'agent')
      return
    }
    case 'layout.setSide': {
      const { side, open } = operation.input
      if (layout.isSideOpen(side) === open) {
        alreadyThere(
          `The ${side} side container is already ${open ? 'expanded' : 'collapsed'}.`,
        )
        return
      }
      layout.toggleSide(side, 'agent')
      return
    }
    case 'layout.setMaximized': {
      const { maximized } = operation.input
      if (layout.describeLayout().maximized === maximized) {
        alreadyThere(
          `The tab group is already ${maximized ? 'maximized' : 'restored'}.`,
        )
        return
      }
      layout.toggleMaximize('agent')
      return
    }
    case 'layout.splitActiveTab':
      layout.splitActiveTab(operation.input.side ?? 'right', 'agent')
      return
    case 'layout.moveActiveTabToNextGroup':
      layout.moveActiveTabToNextGroup('agent')
      return
    case 'layout.reset':
      layout.reset('agent')
      return
  }
}

export function executeToolCall(deps: ToolDeps, call: ToolCall): ToolResult {
  if (call.kind === 'read') return executeRead(deps, call.operation)

  const log = () => deps.workbench.store.getState().log
  const before = log().length

  switch (call.kind) {
    case 'command':
      deps.workbench.execute(call.command, 'agent')
      break
    case 'view':
      deps.view.execute(call.operation, 'agent')
      break
    case 'layout':
      executeLayout(deps, call.operation)
      break
    case 'appearance':
      deps.appearance.set(call.operation.input.appearance, 'agent')
      break
  }

  const entries = log()
    .slice(before)
    .filter((entry) => entry.source === 'agent')
  const last = entries.at(-1)
  if (!last) {
    return {
      status: 'rejected',
      summary: null,
      issues: [{ path: '', message: 'The tool call recorded no operation.' }],
      operationIds: [],
    }
  }
  return {
    status: last.status,
    summary: last.summary,
    issues: last.issues,
    operationIds: entries.map((entry) => entry.id),
  }
}

const PAGE_IDS = Object.keys(PAGES) as [PageId, ...PageId[]]
const PANEL_IDS = Object.keys(PANELS) as [PanelId, ...PanelId[]]
const APPEARANCE_PREFERENCES = ['system', ...APPEARANCE_IDS] as [
  AppearancePreference,
  ...AppearancePreference[],
]

const LAYOUT_TOOLS = [
  {
    name: 'layout.placePage',
    title: 'Place page beside another',
    description:
      'Put a page in a new tab group beside another page; both stay visible.',
    input: z.object({
      page: z.enum(PAGE_IDS),
      beside: z.enum(PAGE_IDS),
      side: z.enum(['left', 'right', 'top', 'bottom']),
    }),
  },
  {
    name: 'layout.openPage',
    title: 'Open page',
    description: 'Open or select a page.',
    input: z.object({ page: z.enum(PAGE_IDS) }),
  },
  {
    name: 'layout.setPanel',
    title: 'Show or hide a panel',
    description:
      'Show or hide a side panel. Assets and Workflow live on the left, Reasoning and Inspection on the right.',
    input: z.object({ panel: z.enum(PANEL_IDS), open: z.boolean() }),
  },
  {
    name: 'layout.setSide',
    title: 'Expand or collapse a side container',
    description:
      'Expand or collapse a whole side container and everything docked in it.',
    input: z.object({
      side: z.enum(['left', 'right']),
      open: z.boolean(),
    }),
  },
  {
    name: 'layout.setMaximized',
    title: 'Maximize or restore the active tab group',
    description:
      'Maximize the active tab group to fill the workbench, or restore the normal layout.',
    input: z.object({ maximized: z.boolean() }),
  },
  {
    name: 'layout.splitActiveTab',
    title: 'Split the active tab into a new group',
    description:
      'Move the active tab into a new tab group beside its current one. Needs a group holding at least two tabs.',
    input: z.object({
      side: z.enum(['left', 'right', 'top', 'bottom']).optional(),
    }),
  },
  {
    name: 'layout.moveActiveTabToNextGroup',
    title: 'Move the active tab to the next group',
    description:
      'Move the active tab into the next tab group. Needs at least two groups.',
    input: z.object({}),
  },
  {
    name: 'layout.reset',
    title: 'Reset layout',
    description:
      'Restore the default workbench layout. This discards the current arrangement and cannot be undone.',
    input: z.object({}),
  },
]

const APPEARANCE_TOOLS = [
  {
    name: 'appearance.set',
    title: 'Set appearance',
    description: `Switch the application appearance. "system" follows the operating system; the curated appearances are ${APPEARANCE_IDS.map(
      (id) => `"${id}" (${APPEARANCES[id].label}, ${APPEARANCES[id].scheme})`,
    ).join(', ')}.`,
    input: z.object({ appearance: z.enum(APPEARANCE_PREFERENCES) }),
  },
]

const READ_TOOLS = [
  {
    name: 'read.context',
    title: 'Read the workbench context',
    description:
      'Read the current project summary, stage states, available map metrics, view state, layout, appearance, and selection. Call this before acting when you need to know the current state.',
    input: z.object({}),
  },
  {
    name: 'read.buildings',
    title: 'Read buildings',
    description: `List buildings with their attributes, sorted and filtered, so you can point at specific ones. Returns at most ${MAX_BUILDING_ROWS} rows.`,
    input: z.object({
      limit: z.number().int().min(1).max(MAX_BUILDING_ROWS).optional(),
      sortBy: z
        .enum([
          'floors',
          'heightM',
          'floorAreaM2',
          'pvYieldKwh',
          'baselineDemandKwh',
          'name',
        ])
        .optional(),
      order: z.enum(['asc', 'desc']).optional(),
      use: z
        .enum(['residential', 'office', 'retail', 'school', 'mixed'])
        .optional(),
    }),
  },
]

/**
 * Commands that only change what is shown or highlighted. The model-driven
 * agent is limited to these, because this prototype demonstrates agentic
 * control of presentation, styling, and layout only (decision 0020).
 */
export const PRESENTATION_COMMANDS = ['selection.set', 'selection.clear']

export type AgentToolScope = 'all' | 'presentation'

export type AgentToolDescription = {
  name: string
  kind: ToolCall['kind']
  title: string
  description: string
  requiresApproval: boolean
  inputSchema: unknown
}

/**
 * Tool catalog with JSON Schema inputs. "presentation" is the catalog offered
 * to a language model: view, layout, appearance, reads, and selection only.
 * Task commands are internal to the simulator and are never offered.
 */
export function describeAgentTools(
  scope: AgentToolScope = 'all',
): AgentToolDescription[] {
  const simple = (
    tools: typeof LAYOUT_TOOLS,
    kind: ToolCall['kind'],
    approval = false,
  ) =>
    tools.map((tool) => ({
      name: tool.name,
      kind,
      title: tool.title,
      description: tool.description,
      requiresApproval: approval && tool.name === 'layout.reset',
      inputSchema: z.toJSONSchema(tool.input, { io: 'input' }),
    }))

  return [
    ...describeCommands()
      .filter((description) => !description.type.startsWith('task.'))
      .filter(
        (description) =>
          scope === 'all' || PRESENTATION_COMMANDS.includes(description.type),
      )
      .map((description) => ({
        name: description.type,
        kind: 'command' as const,
        title: description.title,
        description: description.description,
        requiresApproval:
          description.type === 'workflow.runStage' || description.undoable,
        inputSchema: description.inputSchema,
      })),
    ...describeViewOperations().map((description) => ({
      name: description.type,
      kind: 'view' as const,
      title: description.title,
      description: description.description,
      requiresApproval: false,
      inputSchema: description.inputSchema,
    })),
    ...simple(LAYOUT_TOOLS, 'layout', true),
    ...simple(APPEARANCE_TOOLS, 'appearance'),
    ...simple(READ_TOOLS, 'read'),
  ]
}
