import {
  applyPatches,
  enablePatches,
  produce,
  produceWithPatches,
  type Patch,
} from 'immer'
import type { z } from 'zod'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  commandDefinitions,
  type Command,
  type CommandContext,
  type CommandOutcome,
  type CommandType,
  type ValidationIssue,
} from './commands.ts'
import { createInitialState } from './initialState.ts'
import type { CommandSource, WorkbenchState } from './types.ts'

enablePatches()

export type OperationEntry = {
  id: string
  sequence: number
  type: CommandType | 'history.undo' | 'history.redo'
  title: string
  input: unknown
  source: CommandSource
  status: 'applied' | 'rejected'
  summary: string | null
  issues: ValidationIssue[]
  at: string
  undoable: boolean
}

export type WorkbenchSnapshot = {
  state: WorkbenchState
  log: OperationEntry[]
  canUndo: boolean
  canRedo: boolean
}

export type ExecuteResult = { operationId: string; outcome: CommandOutcome }

export type Workbench = {
  store: StoreApi<WorkbenchSnapshot>
  getState: () => WorkbenchState
  execute: (command: Command, source?: CommandSource) => ExecuteResult
  undo: (source?: CommandSource) => ExecuteResult
  redo: (source?: CommandSource) => ExecuteResult
}

type HistoryEntry = {
  operationId: string
  title: string
  patches: Patch[]
  inversePatches: Patch[]
}

// Handler signatures differ per command, so the registry entry is used through
// this shape; inputs are validated by the entry's own schema before `run`.
type RegistryEntry = {
  title: string
  input: z.ZodType
  undoable: boolean
  run: (
    state: WorkbenchState,
    input: unknown,
    context: CommandContext,
  ) => CommandOutcome
}

export function createWorkbench(
  options: { initialState?: WorkbenchState; now?: () => Date } = {},
): Workbench {
  const now = options.now ?? (() => new Date())
  const store = createStore<WorkbenchSnapshot>()(() => ({
    state: options.initialState ?? createInitialState(),
    log: [],
    canUndo: false,
    canRedo: false,
  }))
  const undoStack: HistoryEntry[] = []
  const redoStack: HistoryEntry[] = []

  function nextOperation() {
    const sequence = store.getState().log.length + 1
    return { operationId: `op-${sequence}`, sequence, at: now().toISOString() }
  }

  function commit(state: WorkbenchState, entry: OperationEntry) {
    store.setState({
      state,
      log: [...store.getState().log, entry],
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    })
  }

  function execute(
    command: Command,
    source: CommandSource = 'manual',
  ): ExecuteResult {
    const { operationId, sequence, at } = nextOperation()
    const definition = commandDefinitions[
      command.type
    ] as unknown as RegistryEntry
    const current = store.getState().state
    const entry = {
      id: operationId,
      sequence,
      type: command.type,
      title: definition.title,
      input: command.input,
      source,
      at,
      undoable: definition.undoable,
    }

    const parsed = definition.input.safeParse(command.input)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      }))
      commit(current, { ...entry, status: 'rejected', summary: null, issues })
      return { operationId, outcome: { status: 'rejected', issues } }
    }

    const context: CommandContext = { operationId, source, now: at }
    const result: { outcome: CommandOutcome } = {
      outcome: {
        status: 'rejected',
        issues: [{ path: '', message: 'The command produced no outcome.' }],
      },
    }
    const recipe = (draft: WorkbenchState) => {
      result.outcome = definition.run(draft, parsed.data, context)
    }

    let next = current
    let patches: Patch[] = []
    let inversePatches: Patch[] = []
    try {
      if (definition.undoable) {
        ;[next, patches, inversePatches] = produceWithPatches(current, recipe)
      } else {
        next = produce(current, recipe)
      }
    } catch (error) {
      result.outcome = {
        status: 'rejected',
        issues: [
          {
            path: '',
            message: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }

    const outcome = result.outcome
    if (outcome.status === 'rejected') {
      commit(current, {
        ...entry,
        status: 'rejected',
        summary: null,
        issues: outcome.issues,
      })
      return { operationId, outcome }
    }

    if (definition.undoable && patches.length > 0) {
      undoStack.push({
        operationId,
        title: definition.title,
        patches,
        inversePatches,
      })
      redoStack.length = 0
    }
    commit(next, {
      ...entry,
      status: 'applied',
      summary: outcome.summary,
      issues: [],
    })
    return { operationId, outcome }
  }

  function replay(
    kind: 'history.undo' | 'history.redo',
    source: CommandSource,
  ): ExecuteResult {
    const { operationId, sequence, at } = nextOperation()
    const current = store.getState().state
    const from = kind === 'history.undo' ? undoStack : redoStack
    const to = kind === 'history.undo' ? redoStack : undoStack
    const title = kind === 'history.undo' ? 'Undo' : 'Redo'
    const history = from.pop()
    const base = {
      id: operationId,
      sequence,
      type: kind,
      title,
      source,
      at,
      undoable: false,
    }

    if (!history) {
      const issues = [
        {
          path: '',
          message:
            kind === 'history.undo' ? 'Nothing to undo.' : 'Nothing to redo.',
        },
      ]
      commit(current, {
        ...base,
        input: {},
        status: 'rejected',
        summary: null,
        issues,
      })
      return { operationId, outcome: { status: 'rejected', issues } }
    }

    const patches =
      kind === 'history.undo' ? history.inversePatches : history.patches
    // Ids and revisions stay monotonic so an undone change cannot collide with later ones.
    const next = produce(applyPatches(current, patches), (draft) => {
      draft.nextId = Math.max(draft.nextId, current.nextId)
    })
    to.push(history)
    const summary = `${title} "${history.title}" (${history.operationId}).`
    commit(next, {
      ...base,
      input: { operationId: history.operationId },
      status: 'applied',
      summary,
      issues: [],
    })
    return { operationId, outcome: { status: 'applied', summary } }
  }

  return {
    store,
    getState: () => store.getState().state,
    execute,
    undo: (source = 'manual') => replay('history.undo', source),
    redo: (source = 'manual') => replay('history.redo', source),
  }
}
