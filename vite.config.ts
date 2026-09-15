import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vite'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [stripMissingFlexLayoutSourceMaps(), react()],
  optimizeDeps: {
    // Pre-bundling moves maplibre-gl but not its worker module, which then 404s.
    exclude: ['maplibre-gl'],
  },
})
