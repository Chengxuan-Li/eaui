import type { ContextDigest } from '../context.ts'
import { describeAgentTools, type AgentToolScope } from '../tools.ts'

// The wire format for the model provider, verified against the configured
// model on 2026-09-18 (decision 0020). The app talks to its own dev-server
// route, never to the provider, so the key stays out of the browser bundle.

/**
 * Tool names on the wire must match ^[a-zA-Z0-9_-]+$, but every operation in
 * this app is named with a dot ("appearance.set"). The mapping is exact and
 * reversible because no operation name contains a double underscore.
 */
export function toWireName(name: string): string {
  return name.replaceAll('.', '__')
}

export function fromWireName(name: string): string {
  return name.replaceAll('__', '.')
}

export type WireTool = {
  type: 'function'
  name: string
  description: string
  parameters: unknown
}

/** A JSON Schema without the draft marker the provider has no use for. */
function parametersOf(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) {
    return { type: 'object', properties: {} }
  }
  const rest = { ...(schema as Record<string, unknown>) }
  delete rest.$schema
  return rest
}

export function buildWireTools(scope: AgentToolScope): WireTool[] {
  return describeAgentTools(scope).map((tool) => ({
    type: 'function',
    name: toWireName(tool.name),
    description: tool.requiresApproval
      ? `${tool.description} Asks the user for approval before it runs.`
      : tool.description,
    parameters: parametersOf(tool.inputSchema),
  }))
}

export type InputItem =
  | { role: 'user' | 'assistant'; content: string }
  | {
      type: 'function_call'
      call_id: string
      name: string
      arguments: string
      id?: string
    }
  | { type: 'function_call_output'; call_id: string; output: string }

export type LlmRequest = {
  instructions: string
  input: InputItem[]
  tools: WireTool[]
}

export type OutputItem =
  | {
      type: 'message'
      role: 'assistant'
      content: { type: string; text?: string }[]
    }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: string }

export type LlmResponse = {
  output: OutputItem[]
  usage?: { total_tokens?: number }
}

export function messageText(item: OutputItem): string {
  if (item.type !== 'message' || !('content' in item)) return ''
  return item.content
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()
}

const ROLE = `You drive the EnergyAtlas workbench, a desktop-style application for urban building energy modelling. You control what the user sees: which pages and panels are open, how they are arranged, how the map and table are presented, which appearance is active, and what is selected.`

const LIMITS = `You can only change presentation, styling, layout, and selection. You cannot run simulations, edit the model, create scenarios or measures, or change any project data. If the user asks for something you cannot do, say so plainly and name what you can do instead. Never claim to have changed something you did not change.`

const METHOD = `Work in small steps. Call read.context when you need to know the current state, and read.buildings when the user refers to specific buildings ("the tallest", "the largest offices"). Prefer one precise change over several speculative ones. After your tool calls, reply in one or two short sentences saying what you changed. Use Markdown sparingly; bold the names of pages, panels, and appearances.`

const HONESTY = `Every number in this project is synthetic. A metric with no data cannot colour the map: read.context tells you which metrics are available and what would have to be run for the rest, and you should relay that requirement rather than pretending. If a tool call is rejected, tell the user what the rejection said.`

const PLAN_MODE = `You are in Plan mode. Do not call any tool that changes something. Describe exactly what you would do, as a short list, and stop.`

export function buildInstructions(
  digest: ContextDigest,
  planOnly: boolean,
): string {
  return [
    ROLE,
    LIMITS,
    METHOD,
    HONESTY,
    planOnly ? PLAN_MODE : '',
    `Current workbench state as JSON:\n${JSON.stringify(digest)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
