import { createStore } from 'zustand/vanilla'
import {
  clearConversation,
  loadConversation,
  saveConversation,
} from './agentPersistence.ts'
import { buildContextDigest } from './context.ts'
import {
  buildInstructions,
  buildWireTools,
  fromWireName,
  messageText,
  type InputItem,
  type OutputItem,
} from './llm/protocol.ts'
import type { LlmTransport } from './llm/transport.ts'
import { permissionModeOption } from './modes.ts'
import {
  executeToolCall,
  requiresApproval,
  type ToolCall,
  type ToolDeps,
} from './tools.ts'
import { toToolCall, type ToolCallIssue } from './toolDispatch.ts'
import type {
  AgentAdapter,
  AgentPreset,
  AgentSnapshot,
  PermissionMode,
  SendMode,
  TranscriptItem,
} from './types.ts'

// A language model behind the same adapter the scripted player implements
// (decision 0020). It drives presentation, styling, and layout only: its tool
// catalog is the presentation scope, so it cannot run a stage or change the
// project model whatever it asks for.

/** Model turns in one answer, so a confused model cannot loop forever. */
export const MAX_TURNS = 8

/**
 * Starting prompts for the live model. These are not the scripted sessions:
 * one of those proposes a scenario change, which this agent cannot do, and
 * offering it would advertise something that will be refused.
 */
export const LLM_PRESETS: AgentPreset[] = [
  {
    id: 'sideBySide',
    label: 'Map beside Table',
    prompt: 'Put the Map beside the Table so I can see both at once.',
    description: 'Rearranges the workbench through layout operations.',
  },
  {
    id: 'appearance',
    label: 'Try a darker appearance',
    prompt:
      'Switch to the Dark engineering appearance and tell me what changed.',
    description: 'Switches between the curated appearances.',
  },
  {
    id: 'colour',
    label: 'Colour the map',
    prompt:
      'Colour the map by whichever metric already has data, and say which one you chose and why.',
    description: 'Reads what is available, then sets the map metric.',
  },
  {
    id: 'focus',
    label: 'Focus on the map',
    prompt:
      'Collapse both side containers and maximize the Map so I can look at it properly.',
    description: 'Collapses panels and maximizes a tab group.',
  },
]

export type LlmAgentOptions = ToolDeps & {
  transport: LlmTransport
  modelLabel: string
  /** Where the conversation is kept between reloads; null keeps it in memory. */
  storage?: Storage | null
  /** Distinguishes this agent's stored conversation from the other's. */
  agentId?: string
}

type Pending = {
  itemId: string
  title: string
  call: ToolCall
  callId: string
}

export function createLlmAgent(options: LlmAgentOptions): AgentAdapter {
  const { transport, modelLabel, storage = null, agentId = 'live' } = options
  const restored = loadConversation(storage, agentId)
  const deps: ToolDeps = {
    workbench: options.workbench,
    view: options.view,
    layout: options.layout,
    appearance: options.appearance,
  }

  const store = createStore<AgentSnapshot>()(() => ({
    status: 'idle',
    transcript: restored?.transcript ?? [],
    activeSessionId: null,
    presets: LLM_PRESETS,
    permissionMode: 'ask',
    queued: [],
    ranSessionIds: [],
  }))

  // Ids continue past the restored items so a new one cannot collide.
  let itemCount = restored?.transcript.length ?? 0
  let conversation: InputItem[] = restored?.conversation ?? []
  let pending: Pending | null = null
  let controller: AbortController | null = null
  let turns = 0

  const nextId = () => {
    itemCount += 1
    return `llm-item-${itemCount}`
  }

  function persist() {
    saveConversation(storage, agentId, {
      transcript: store.getState().transcript,
      conversation,
    })
  }

  function push(item: TranscriptItem) {
    store.setState({ transcript: [...store.getState().transcript, item] })
    persist()
  }

  function setApprovalStatus(
    itemId: string,
    status: 'approved' | 'declined',
    decidedBy: PermissionMode | null = null,
  ) {
    store.setState({
      transcript: store
        .getState()
        .transcript.map((item) =>
          item.kind === 'approval' && item.id === itemId
            ? { ...item, status, decidedBy: decidedBy ?? item.decidedBy }
            : item,
        ),
    })
    persist()
  }

  function finish() {
    controller = null
    pending = null
    turns = 0
    store.setState({ status: 'idle' })
    deliverQueued()
  }

  function endWith(tone: 'info' | 'warning' | 'error', text: string) {
    push({ id: nextId(), kind: 'notice', tone, text })
    finish()
  }

  function deliverQueued() {
    const [next, ...rest] = store.getState().queued
    if (next === undefined) return
    store.setState({ queued: rest })
    void deliver(next)
  }

  function digest() {
    return buildContextDigest({
      project: deps.workbench.getState(),
      view: deps.view.getState(),
      layout: deps.layout.describeLayout(),
      appearance: deps.appearance.getPreference(),
    })
  }

  /** Records the tool call and its result, and reports whether to keep going. */
  function runCall(title: string, call: ToolCall, callId: string): boolean {
    const result = executeToolCall(deps, call)
    push({ id: nextId(), kind: 'tool', title, call, result })
    conversation.push({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify({
        status: result.status,
        summary: result.summary,
        issues: result.issues,
        data: result.data,
      }),
    })
    // A rejection is information the model can act on, not a reason to stop.
    return true
  }

  function describeIssue(issue: ToolCallIssue): string {
    return issue.message
  }

  /** Feeds a refusal back so the model can correct itself rather than stall. */
  function refuse(callId: string, message: string) {
    conversation.push({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify({ status: 'rejected', issues: [{ message }] }),
    })
  }

  function propose(title: string, call: ToolCall, callId: string) {
    const mode = store.getState().permissionMode
    if (mode === 'bypass') {
      const itemId = nextId()
      push({
        id: itemId,
        kind: 'approval',
        title,
        description: '',
        callTitles: [title],
        status: 'approved',
        decidedBy: 'bypass',
      })
      deps.workbench.record({
        type: 'agent.proposal',
        title: `Agent proposal: ${title}`,
        input: { call: title, permissionMode: mode },
        source: 'agent',
        summary: `Approved "${title}" without asking, because the agent is in ${permissionModeOption(mode).label} mode.`,
      })
      runCall(title, call, callId)
      void turn()
      return
    }
    const itemId = nextId()
    push({
      id: itemId,
      kind: 'approval',
      title,
      description:
        'This discards the current arrangement, and nothing undoes a layout.',
      callTitles: [title],
      status: 'pending',
      decidedBy: null,
    })
    pending = { itemId, title, call, callId }
    store.setState({ status: 'awaitingApproval' })
  }

  /** One model turn: send the conversation, then act on what comes back. */
  async function turn(): Promise<void> {
    if (store.getState().status !== 'running') return
    turns += 1
    if (turns > MAX_TURNS) {
      endWith(
        'warning',
        `I stopped after ${MAX_TURNS} steps without finishing. Ask me again, more specifically.`,
      )
      return
    }

    const planOnly = store.getState().permissionMode === 'plan'
    let response
    try {
      controller = new AbortController()
      response = await transport.respond(
        {
          instructions: buildInstructions(digest(), planOnly),
          input: conversation,
          tools: buildWireTools('presentation'),
        },
        controller.signal,
      )
    } catch (error) {
      if (store.getState().status !== 'running') return
      endWith(
        'error',
        error instanceof Error
          ? error.message
          : 'The model could not be reached.',
      )
      return
    }
    if (store.getState().status !== 'running') return

    const calls: OutputItem[] = []
    for (const item of response.output) {
      if (item.type === 'message') {
        const text = messageText(item)
        if (text) push({ id: nextId(), kind: 'agent', markdown: text })
        conversation.push({ role: 'assistant', content: text })
        continue
      }
      if (item.type === 'function_call') calls.push(item)
    }

    if (calls.length === 0) {
      finish()
      return
    }

    for (const item of calls) {
      if (!('call_id' in item) || !('name' in item)) continue
      const callId = item.call_id
      const name = fromWireName(item.name)
      conversation.push({
        type: 'function_call',
        call_id: callId,
        name: item.name,
        arguments: item.arguments,
      })

      if (planOnly) {
        push({
          id: nextId(),
          kind: 'agent',
          markdown: `**Plan only.** I would call \`${name}\` with \`${item.arguments}\`.`,
        })
        refuse(callId, 'Plan mode: nothing was changed.')
        continue
      }

      const resolved = toToolCall(name, item.arguments)
      if (!resolved.ok) {
        push({
          id: nextId(),
          kind: 'notice',
          tone: 'warning',
          text: `The model asked for "${name}", which I could not carry out: ${describeIssue(resolved.issue)}`,
        })
        refuse(callId, describeIssue(resolved.issue))
        continue
      }

      if (requiresApproval(resolved.call)) {
        propose(resolved.title, resolved.call, callId)
        return
      }
      runCall(resolved.title, resolved.call, callId)
    }

    if (planOnly) {
      endWith(
        'info',
        'Plan mode: nothing was changed. Choose another permission mode and ask again to carry this out.',
      )
      return
    }
    await turn()
  }

  async function deliver(prompt: string): Promise<void> {
    push({ id: nextId(), kind: 'user', text: prompt })
    conversation.push({ role: 'user', content: prompt })
    deps.workbench.record({
      type: 'agent.message',
      title: 'Send a message to the agent',
      input: { text: prompt, model: modelLabel },
      source: 'agent',
      summary: `Sent a message to ${modelLabel}.`,
    })
    turns = 0
    store.setState({ status: 'running' })
    await turn()
  }

  function sendBlocker(mode: SendMode, text: string): string | null {
    if (!text.trim()) return 'Type a message first.'
    const status = store.getState().status
    if (mode === 'send' && status !== 'idle') {
      return status === 'awaitingApproval'
        ? 'The agent is waiting for your approval. Answer it, or queue this message.'
        : 'The agent is working. Queue this message, or stop it.'
    }
    if (mode === 'stir' && status === 'idle') {
      return 'Stirring adds guidance to a running answer. Use Send message instead.'
    }
    return null
  }

  return {
    label: modelLabel,
    store,

    send(text, mode = 'send') {
      const prompt = text.trim()
      if (sendBlocker(mode, prompt)) return
      if (mode === 'send') {
        void deliver(prompt)
        return
      }
      store.setState({ queued: [...store.getState().queued, prompt] })
      deps.workbench.record({
        type: 'agent.queueMessage',
        title: mode === 'stir' ? 'Stir a message in' : 'Queue a message',
        input: { text: prompt, mode },
        source: 'agent',
        summary: 'Queued the message; the agent answers it when it is idle.',
      })
      if (mode === 'stir') {
        push({ id: nextId(), kind: 'user', text: prompt })
        push({
          id: nextId(),
          kind: 'notice',
          tone: 'info',
          text: 'Noted. I will take this up as soon as the current answer finishes.',
        })
      }
      if (store.getState().status === 'idle') deliverQueued()
    },

    sendBlocker,

    startPreset(presetId) {
      const preset = store
        .getState()
        .presets.find((candidate) => candidate.id === presetId)
      if (preset && store.getState().status === 'idle') {
        // Suggestions rank what has not been tried yet, as the scripted agent does.
        store.setState({
          ranSessionIds: [...store.getState().ranSessionIds, preset.id],
        })
        void deliver(preset.prompt)
      }
    },

    setPresets(presets) {
      store.setState({
        presets: presets.length > 0 ? presets : LLM_PRESETS,
        ranSessionIds: [],
      })
    },

    setPermissionMode(mode) {
      if (store.getState().permissionMode === mode) return
      store.setState({ permissionMode: mode })
      const option = permissionModeOption(mode)
      deps.workbench.record({
        type: 'agent.setPermissionMode',
        title: 'Set agent permission mode',
        input: { mode },
        summary: `Agent permission mode: ${option.label}. ${option.description}`,
      })
    },

    dropQueued(index) {
      const queued = store.getState().queued
      if (index < 0 || index >= queued.length) return
      store.setState({
        queued: queued.filter((_, position) => position !== index),
      })
      deps.workbench.record({
        type: 'agent.dropQueuedMessage',
        title: 'Remove a queued message',
        input: { text: queued[index] },
        summary: 'Removed a queued message before the agent answered it.',
      })
    },

    approve(itemId) {
      if (store.getState().status !== 'awaitingApproval') return
      if (!pending || pending.itemId !== itemId) return
      const { title, call, callId } = pending
      setApprovalStatus(itemId, 'approved')
      pending = null
      store.setState({ status: 'running' })
      runCall(title, call, callId)
      void turn()
    },

    decline(itemId) {
      if (store.getState().status !== 'awaitingApproval') return
      if (!pending || pending.itemId !== itemId) return
      const { title, callId } = pending
      setApprovalStatus(itemId, 'declined')
      deps.workbench.record({
        type: 'agent.proposal',
        title: `Agent proposal: ${title}`,
        input: { call: title },
        source: 'agent',
        status: 'rejected',
        summary: '',
        issues: [
          { path: '', message: `Rejected "${title}"; nothing changed.` },
        ],
      })
      pending = null
      store.setState({ status: 'running' })
      // Tell the model it was refused, so it can answer rather than retry.
      refuse(callId, `The user declined "${title}". Do not try it again.`)
      void turn()
    },

    clear() {
      conversation = []
      itemCount = 0
      store.setState({ transcript: [], queued: [], ranSessionIds: [] })
      clearConversation(storage, agentId)
    },

    stop() {
      if (store.getState().status === 'idle') return
      if (pending) setApprovalStatus(pending.itemId, 'declined')
      controller?.abort()
      const dropped = store.getState().queued.length
      store.setState({ queued: [] })
      conversation = []
      endWith(
        'info',
        `Stopped. Changes that were already applied stay in the project.${dropped > 0 ? ` ${dropped} queued message${dropped === 1 ? '' : 's'} discarded.` : ''}`,
      )
    },
  }
}
