import type { StoreApi } from 'zustand/vanilla'
import type { PageId } from '../layout/layoutController.ts'
import type { ToolCall, ToolResult } from './tools.ts'

// The agent adapter is the seam between the Reasoning mode and whatever
// produces agent behavior. The first slice uses a scripted player (decision
// 0006); a real model provider can implement the same adapter later.

export type ReferenceTarget =
  | { type: 'page'; page: PageId }
  | { type: 'stage'; stageId: string }
  | { type: 'inspection' }

export type TranscriptItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'agent'; markdown: string }
  | { id: string; kind: 'reasoning'; text: string }
  | { id: string; kind: 'reference'; label: string; target: ReferenceTarget }
  | {
      id: string
      kind: 'tool'
      title: string
      call: ToolCall
      result: ToolResult
    }
  | {
      id: string
      kind: 'approval'
      title: string
      description: string
      callTitles: string[]
      status: 'pending' | 'approved' | 'declined'
    }
  | {
      id: string
      kind: 'notice'
      tone: 'info' | 'warning' | 'error'
      text: string
    }

export type AgentStatus = 'idle' | 'running' | 'awaitingApproval'

export type AgentPreset = {
  id: string
  label: string
  prompt: string
  description: string
}

export type AgentSnapshot = {
  status: AgentStatus
  transcript: TranscriptItem[]
  activeSessionId: string | null
  presets: AgentPreset[]
}

export type AgentAdapter = {
  label: string
  store: StoreApi<AgentSnapshot>
  /** Sends a free-text message; ignored while a session is busy. */
  send: (text: string) => void
  startPreset: (presetId: string) => void
  approve: (itemId: string) => void
  decline: (itemId: string) => void
  /** Stops the active session; applied changes stay in the project. */
  stop: () => void
}
