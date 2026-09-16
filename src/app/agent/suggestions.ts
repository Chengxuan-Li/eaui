import type { AgentPreset } from './types.ts'

// "Suggested next steps based on your conversation" (decision 0016). The
// scripted agent has a fixed set of sessions, so a suggestion is honest only if
// it says why it is offered now. Ranking is pure and unit tested.

export type Suggestion = {
  id: string
  label: string
  /** Why this step is suggested now, shown under the label. */
  reason: string
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

  return presets
    .map((preset, index) => {
      if (preset.id === RESTORE_SESSION_ID && rearranged) {
        return {
          rank: 0,
          index,
          suggestion: {
            id: preset.id,
            label: preset.label,
            reason: 'The workbench is rearranged from an earlier session.',
          },
        }
      }
      if (!ran.has(preset.id)) {
        return {
          rank: 1,
          index,
          suggestion: {
            id: preset.id,
            label: preset.label,
            reason: preset.description,
          },
        }
      }
      return {
        rank: 2,
        index,
        suggestion: {
          id: preset.id,
          label: preset.label,
          reason: 'Already run in this conversation; running it again is fine.',
        },
      }
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.suggestion)
}
