import type { PermissionMode, SendMode } from './types.ts'

// The composer's two mode menus (decision 0016). Labels and explanations live
// here so the Reasoning panel, the transcript, and the operation log describe a
// mode the same way.

export type ModeOption<Id> = {
  id: Id
  label: string
  description: string
}

// Send modes are actions, not a sticky setting: the menu sends the message the
// chosen way there and then (decision 0016, revised).
export const SEND_MODES: ModeOption<SendMode>[] = [
  {
    id: 'send',
    label: 'Send now',
    description: 'Answer now. Needs an idle agent.',
  },
  {
    id: 'queue',
    label: 'Queue message',
    description: 'Wait for the current session to finish, then answer.',
  },
  {
    id: 'stir',
    label: 'Stir in',
    description: 'Add guidance to the running session without stopping it.',
  },
]

/** What is driving the agent: the scripted player, or a language model. */
export type ModelOption = {
  id: string
  label: string
  /** Why it cannot be chosen, or null when it can. */
  unavailableReason: string | null
}

export const SCRIPTED_MODEL = 'scripted'
export const LIVE_MODEL = 'live'

/**
 * The live model reaches the provider through the dev server, which holds the
 * key (decision 0020). Its label and availability are only known at run time,
 * so the menu is built from the health check rather than fixed here.
 */
export function modelOptions(health: {
  available: boolean
  model: string | null
  reason: string | null
}): ModelOption[] {
  return [
    { id: SCRIPTED_MODEL, label: 'Scripted', unavailableReason: null },
    {
      id: LIVE_MODEL,
      label: health.model ?? 'Language model',
      unavailableReason: health.available
        ? null
        : (health.reason ??
          'No language model is configured, so the scripted sessions are all this agent can run.'),
    },
  ]
}

export const PERMISSION_MODES: ModeOption<PermissionMode>[] = [
  {
    id: 'ask',
    label: 'Ask for approval',
    description: 'Every stage run and model change waits for you.',
  },
  {
    id: 'automatic',
    label: 'Automatic',
    description:
      'Stage runs are approved for you; model changes and layout resets still wait.',
  },
  {
    id: 'bypass',
    label: 'Bypass approval',
    description:
      'Nothing waits. Changes are applied as the session reaches them.',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'List what the session would do and stop, changing nothing.',
  },
]

export function permissionModeOption(
  mode: PermissionMode,
): ModeOption<PermissionMode> {
  return (
    PERMISSION_MODES.find((option) => option.id === mode) ??
    PERMISSION_MODES[0]!
  )
}
