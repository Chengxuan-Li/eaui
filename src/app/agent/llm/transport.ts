import type { LlmRequest, LlmResponse } from './protocol.ts'

// The browser never holds the provider key and never calls the provider. It
// calls this app's own dev-server route, which adds the key in Node (decision
// 0020). A built static bundle has no such route, so health() reports the
// agent as unavailable and the app stays on the scripted player.

export const LLM_ROUTE = '/api/llm'

export type LlmHealth = {
  available: boolean
  model: string | null
  /** Why the model cannot be used, or null when it can. */
  reason: string | null
}

export type LlmTransport = {
  health: () => Promise<LlmHealth>
  respond: (request: LlmRequest, signal?: AbortSignal) => Promise<LlmResponse>
}

const UNAVAILABLE =
  'The model runs through the development server, which is not part of a built bundle. Run "npm run dev" to use it.'

/**
 * `vite preview` and a static host answer an unknown path with index.html and
 * a 200, so a JSON content type is the only reliable signal that the route is
 * really there.
 */
async function readJson(response: Response): Promise<unknown> {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return null
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

export function createHttpTransport(route = LLM_ROUTE): LlmTransport {
  return {
    async health() {
      try {
        const response = await fetch(`${route}/health`)
        const body = await readJson(response)
        if (!body || typeof body !== 'object') {
          return { available: false, model: null, reason: UNAVAILABLE }
        }
        const health = body as Partial<LlmHealth>
        return {
          available: health.available === true,
          model: typeof health.model === 'string' ? health.model : null,
          reason: typeof health.reason === 'string' ? health.reason : null,
        }
      } catch {
        return { available: false, model: null, reason: UNAVAILABLE }
      }
    },

    async respond(request, signal) {
      const response = await fetch(`${route}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      })
      const body = await readJson(response)
      if (!response.ok) {
        const message =
          body &&
          typeof body === 'object' &&
          typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : `The model request failed (HTTP ${response.status}).`
        throw new Error(message)
      }
      if (!body || typeof body !== 'object' || !('output' in body)) {
        throw new Error('The model returned a response this app cannot read.')
      }
      return body as LlmResponse
    },
  }
}
