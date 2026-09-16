import type { PermissionMode, SendMode } from './types.ts'

// The composer's two mode menus (decision 0016). Labels and explanations live
// here so the Reasoning panel, the transcript, and the operation log describe a
// mode the same way.

export type ModeOption<Id> = {
  id: Id
  label: string
  description: string
}

export const SEND_MODES: ModeOption<SendMode>[] = [
  {
    id: 'send',
    label: 'Send message',
    description: 'Answer now. Needs an idle agent.',
  },
  {
    id: 'queue',
    label: 'Queue message',
    description: 'Wait for the current session to finish, then answer.',
  },
  {
    id: 'stir',
    label: 'Stir',
    description: 'Add guidance to the running session without stopping it.',
  },
]

export const PERMISSION_MODES: ModeOption<PermissionMode>[] = [
  {
    id: 'ask',
    label: 'Ask for approval',
    description: 'Every stage run and model change waits for you.',
  },
  {
    id: 'automatic',
    label: 'Automatic',
    description: 'Stage runs are approved for you; model changes still wait.',
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

export function sendModeOption(mode: SendMode): ModeOption<SendMode> {
  return SEND_MODES.find((option) => option.id === mode) ?? SEND_MODES[0]!
}

export function permissionModeOption(
  mode: PermissionMode,
): ModeOption<PermissionMode> {
  return (
    PERMISSION_MODES.find((option) => option.id === mode) ??
    PERMISSION_MODES[0]!
  )
}
