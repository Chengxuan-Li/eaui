import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { BASE_PATH } from './basePath.ts'

const FLEXLAYOUT_STYLESHEET =
  /\/node_modules\/flexlayout-react\/style\/[^/]+\.css$/
const TRAILING_SOURCE_MAP_COMMENT = /\/\*#\s*sourceMappingURL=[^*]*\*\/\s*$/

// flexlayout-react 0.11.0 ends its theme stylesheets with a sourceMappingURL
// comment but ships no .map files, so the dev server logs a failed source map
// load whenever a stylesheet is requested. Load those files without the
// dangling comment; a plugin-provided load skips Vite's source map lookup.
function stripMissingFlexLayoutSourceMaps(): Plugin {
  return {
    name: 'eaui:strip-flexlayout-css-source-maps',
    enforce: 'pre',
    async load(id) {
      const file = (id.split('?')[0] ?? '').replaceAll('\\', '/')
      if (!FLEXLAYOUT_STYLESHEET.test(file)) return null
      const code = await readFile(file, 'utf8')
      return { code: code.replace(TRAILING_SOURCE_MAP_COMMENT, ''), map: null }
    },
  }
}

// MapLibre 6 builds its worker URL from import.meta.url at run time, so the
// bundler never sees the reference and emits nothing; the request then 404s on
// a static host (decision 0017). The worker also imports the package's shared
// chunk, so both files ship beside the MapLibre chunk under their exact names.
const MAPLIBRE_WORKER_FILES = [
  'maplibre-gl-worker.mjs',
  'maplibre-gl-shared.mjs',
]

function emitMapLibreWorker(): Plugin {
  let assetsDir = 'assets'
  return {
    name: 'eaui:emit-maplibre-worker',
    apply: 'build',
    configResolved(config) {
      assetsDir = config.build.assetsDir
    },
    async generateBundle() {
      // The package exports "." for import only, so require.resolve cannot take
      // it; its exports map lists "./package.json", which resolves either way.
      const require = createRequire(import.meta.url)
      const packageDist = join(
        dirname(require.resolve('maplibre-gl/package.json')),
        'dist',
      )
      for (const file of MAPLIBRE_WORKER_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `${assetsDir}/${file}`,
          source: await readFile(join(packageDist, file)),
        })
      }
    },
  }
}

// The provider key lives in .env.local and must never reach the browser: Vite
// only exposes VITE_-prefixed variables, and a static deployment cannot hold a
// credential at all (decision 0020). So the key stays in Node and the dev
// server proxies the model for it. This runs on the dev server only, never in
// `vite preview` or a built bundle, which therefore behave like GitHub Pages:
// the route is absent, and the app stays on the scripted agent.
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const REQUEST_TIMEOUT_MS = 120_000

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function llmProxy(env: Record<string, string>): Plugin {
  const key = env.OPENAI_API_KEY
  const model = env.OPENAI_MODEL
  const baseUrl = env.OPENAI_BASE_URL || DEFAULT_BASE_URL
  const missing = !key
    ? 'No OPENAI_API_KEY in .env.local, so the model cannot be reached.'
    : !model
      ? 'No OPENAI_MODEL in .env.local, so no model is configured.'
      : null

  return {
    name: 'eaui:llm-proxy',
    apply: (_config, env) => env.command === 'serve' && !env.isPreview,
    configureServer(server) {
      server.middlewares.use('/api/llm', (request, response) => {
        void (async () => {
          const path = (request.url ?? '').split('?')[0]

          if (path === '/health') {
            sendJson(response, 200, {
              available: missing === null,
              model: model ?? null,
              reason: missing,
            })
            return
          }

          if (path !== '/respond' || request.method !== 'POST') {
            sendJson(response, 404, { error: 'Unknown model route.' })
            return
          }
          if (missing !== null) {
            sendJson(response, 503, { error: missing })
            return
          }

          try {
            const body = JSON.parse(await readBody(request)) as {
              instructions?: unknown
              input?: unknown
              tools?: unknown
            }
            const upstream = await fetch(`${baseUrl}/responses`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                instructions: body.instructions,
                input: body.input,
                tools: body.tools,
              }),
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            })
            const text = await upstream.text()
            if (!upstream.ok) {
              // Pass the provider's own message through, never the key.
              sendJson(response, upstream.status, {
                error: `The model provider refused the request (HTTP ${upstream.status}). ${text.slice(0, 400)}`,
              })
              return
            }
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(text)
          } catch (error) {
            sendJson(response, 502, {
              error: `The model could not be reached: ${error instanceof Error ? error.message : String(error)}`,
            })
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview, mode }) => ({
  // GitHub Pages serves a project site from /<repository>/, so a built bundle
  // needs that prefix on its asset URLs (decision 0017). Only the build takes
  // it: the dev server and the Playwright specs that visit "/" stay at the
  // root. `basePath.ts` holds the prefix and its override, so the build, the
  // preview server, and the production spec cannot disagree about it.
  // `vite preview` reports command "serve", so it needs isPreview as well or it
  // would serve the built bundle at "/" while its asset URLs carry the prefix.
  base: command === 'build' || isPreview ? BASE_PATH : '/',
  plugins: [
    stripMissingFlexLayoutSourceMaps(),
    emitMapLibreWorker(),
    // The third argument reads every variable, not only VITE_-prefixed ones;
    // these stay in Node and are never put in `define`.
    llmProxy(loadEnv(mode, process.cwd(), '')),
    react(),
  ],
  optimizeDeps: {
    // Pre-bundling moves maplibre-gl but not its worker module, which then 404s.
    exclude: ['maplibre-gl'],
  },
}))
