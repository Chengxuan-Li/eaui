import type { InputItem } from './llm/protocol.ts'
import type { TranscriptItem } from './types.ts'

// A conversation survives a reload (decision 0020). For the model-driven agent
// this is what a backend would otherwise hold: re-sending the stored history is
// the whole of "remembering", so the transcript and the model's own input
// stream are saved together and the agent genuinely continues.
//
// Two things are deliberately not restored. An approval that was still waiting
// cannot be answered, because the turn that raised it is gone, so it loads as
// expired rather than as a live button that does nothing. And an answer that
// was mid-flight is simply lost: no store brings back an open HTTP request.

const VERSION = 1

export type SavedConversation = {
  transcript: TranscriptItem[]
  /** The model's own input stream; empty for the scripted player. */
  conversation: InputItem[]
}

type Saved = { version: number } & SavedConversation

function keyFor(agentId: string): string {
  return `eaui.agent.${agentId}.v${VERSION}`
}

/** A pending approval cannot survive the turn that raised it. */
function settle(transcript: TranscriptItem[]): TranscriptItem[] {
  return transcript.map((item) =>
    item.kind === 'approval' && item.status === 'pending'
      ? { ...item, status: 'expired' as const }
      : item,
  )
}

function isTranscriptItem(value: unknown): value is TranscriptItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<TranscriptItem>
  return typeof item.id === 'string' && typeof item.kind === 'string'
}

export function loadConversation(
  storage: Storage | null,
  agentId: string,
): SavedConversation | null {
  try {
    const text = storage?.getItem(keyFor(agentId))
    if (!text) return null
    const saved = JSON.parse(text) as Saved
    if (saved.version !== VERSION) return null
    const transcript = Array.isArray(saved.transcript)
      ? saved.transcript.filter(isTranscriptItem)
      : []
    if (transcript.length === 0) return null
    return {
      transcript: settle(transcript),
      conversation: Array.isArray(saved.conversation) ? saved.conversation : [],
    }
  } catch {
    return null
  }
}

export function saveConversation(
  storage: Storage | null,
  agentId: string,
  value: SavedConversation,
): void {
  try {
    const saved: Saved = { version: VERSION, ...value }
    storage?.setItem(keyFor(agentId), JSON.stringify(saved))
  } catch {
    // Storage is blocked or full; the conversation lasts this session only.
  }
}

export function clearConversation(
  storage: Storage | null,
  agentId: string,
): void {
  try {
    storage?.removeItem(keyFor(agentId))
  } catch {
    // Nothing to do: the key is unreachable either way.
  }
}

// Which model was chosen is a preference like the appearance, so it survives a
// reload too. Without it a restored conversation would be stored but
// unreachable, because the agent would come back as the scripted player.
const MODEL_KEY = 'eaui.agent.model'

export function loadAgentModel(storage: Storage | null): string | null {
  try {
    return storage?.getItem(MODEL_KEY) ?? null
  } catch {
    return null
  }
}

export function saveAgentModel(storage: Storage | null, id: string): void {
  try {
    storage?.setItem(MODEL_KEY, id)
  } catch {
    // Storage is blocked; the choice applies for this session only.
  }
}
