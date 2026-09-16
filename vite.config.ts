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
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves a project site from /<repository>/, so a built bundle
  // needs that prefix on its asset URLs (decision 0017). Only the build takes
  // it: the dev server and the Playwright specs that visit "/" stay at the
  // root. EAUI_BASE_PATH overrides it for a user page or a custom domain,
  // where the site is served from "/"; the workflow sets it from the
  // repository name so renaming the repository cannot break the deploy.
  // `vite preview` reports command "serve", so it needs isPreview as well or it
  // would serve the built bundle at "/" while its asset URLs carry the prefix.
  base:
    command === 'build' || isPreview
      ? (process.env.EAUI_BASE_PATH ?? '/eaui/')
      : '/',
  plugins: [stripMissingFlexLayoutSourceMaps(), react()],
  optimizeDeps: {
    // Pre-bundling moves maplibre-gl but not its worker module, which then 404s.
    exclude: ['maplibre-gl'],
  },
}))
