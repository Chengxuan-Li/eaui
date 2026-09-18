import type { z } from 'zod'
import { commandDefinitions, type Command } from '../../domain/commands.ts'
import { viewOperationDefinitions } from '../view/viewOperations.ts'
import type { ViewOperation } from '../view/viewOperations.ts'
import {
  appearanceCall,
  command,
  layoutCall,
  readCall,
  viewCall,
  DIRECT_TOOL_SCHEMAS,
  PRESENTATION_COMMANDS,
  type AppearanceToolOperation,
  type LayoutToolOperation,
  type ReadToolOperation,
  type ToolCall,
} from './tools.ts'

// The boundary between what a model asked for and what this app will do
// (decision 0020). Everything a model produces is untrusted: the name may not
// exist, the arguments may not be JSON, and the input may not fit the schema.
// Nothing reaches a store until it has passed through here.

export type ToolCallIssue = { message: string }

export type ResolvedToolCall =
  | { ok: true; call: ToolCall; title: string }
  | { ok: false; issue: ToolCallIssue }

function fail(message: string): ResolvedToolCall {
  return { ok: false, issue: { message } }
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join(' ')
}

/**
 * Validates a tool name and its JSON arguments, and builds the call. A command
 * outside the presentation set is refused even when the model names it exactly,
 * so the catalog is a description of the limit and this is the limit itself.
 */
export function toToolCall(
  name: string,
  argumentsJson: string,
): ResolvedToolCall {
  let input: unknown
  try {
    input = argumentsJson.trim() === '' ? {} : JSON.parse(argumentsJson)
  } catch {
    return fail(`The arguments for "${name}" were not valid JSON.`)
  }

  if (name in commandDefinitions) {
    if (!PRESENTATION_COMMANDS.includes(name)) {
      return fail(
        `"${name}" changes the project model, which this agent cannot do. It can only change presentation, styling, layout, and selection.`,
      )
    }
    const definition = commandDefinitions[name as Command['type']]
    const parsed = definition.input.safeParse(input)
    if (!parsed.success) return fail(describeIssues(parsed.error))
    return {
      ok: true,
      title: definition.title,
      call: command({ type: name, input: parsed.data } as Command),
    }
  }

  if (name in viewOperationDefinitions) {
    const definition = viewOperationDefinitions[name as ViewOperation['type']]
    const parsed = (definition.input as z.ZodType).safeParse(input)
    if (!parsed.success) return fail(describeIssues(parsed.error))
    return {
      ok: true,
      title: definition.title,
      call: viewCall({ type: name, input: parsed.data } as ViewOperation),
    }
  }

  const direct = DIRECT_TOOL_SCHEMAS[name]
  if (!direct) {
    return fail(
      `There is no tool called "${name}". Use one of the tools you were given.`,
    )
  }
  const parsed = direct.input.safeParse(input)
  if (!parsed.success) return fail(describeIssues(parsed.error))

  switch (direct.kind) {
    case 'layout':
      return {
        ok: true,
        title: direct.title,
        call: layoutCall({
          type: name,
          input: parsed.data,
        } as LayoutToolOperation),
      }
    case 'appearance':
      return {
        ok: true,
        title: direct.title,
        call: appearanceCall({
          type: name,
          input: parsed.data,
        } as AppearanceToolOperation),
      }
    case 'read':
      return {
        ok: true,
        title: direct.title,
        call: readCall({ type: name, input: parsed.data } as ReadToolOperation),
      }
  }
}
