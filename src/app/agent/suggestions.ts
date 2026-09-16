import type { AgentPreset } from './types.ts'

// "Suggested next steps based on your conversation" (decision 0016). The
// scripted agent has a fixed set of sessions, so the conversation decides their
// order. Ranking is pure and unit tested.

export type Suggestion = {
  id: string
  label: string
}

export const MAX_SUGGESTIONS = 3

const LAYOUT_SESSION_ID = 'layout'
const RESTORE_SESSION_ID = 'restore'

/**
 * Orders the prepared sessions by what the conversation has already done:
 * putting the workbench back comes first once it was rearranged, sessions not
 * run yet come next, and sessions already run come last.
 */
export function suggestNextSteps(
  presets: AgentPreset[],
  ranSessionIds: string[],
): Suggestion[] {
  const ran = new Set(ranSessionIds)
  const rearranged = ran.has(LAYOUT_SESSION_ID) && !ran.has(RESTORE_SESSION_ID)

  const rankOf = (preset: AgentPreset): number => {
    if (preset.id === RESTORE_SESSION_ID && rearranged) return 0
    return ran.has(preset.id) ? 2 : 1
  }

  return presets
    .map((preset, index) => ({ preset, index, rank: rankOf(preset) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ preset }) => ({ id: preset.id, label: preset.label }))
}
