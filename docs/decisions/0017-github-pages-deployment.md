# 0017: Publish the prototype to GitHub Pages through GitHub Actions

Date: 2026-09-15

Status: accepted by the user on 2026-09-15, who asked for the deployment after the `feature/agentic` merge into `master`.

## Context

The experiment had no continuous integration and no published build: every check ran on the author's machine, and seeing the prototype meant cloning it and running `npm run dev`. The app is browser-only with no server, no database, and no credentials ([decision 0002](0002-web-react-typescript-vite.md)), so a static host is enough to show it.

## Decision

- **GitHub Pages, built and deployed by GitHub Actions** from `master`, in `.github/workflows/pages.yml`. The workflow also runs on pull requests, where it stops after the checks and publishes nothing.
- **Three jobs.** `verify` runs `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`, then uploads `dist` as the Pages artifact. `e2e` installs Playwright's Chromium and runs the browser specs with `PLAYWRIGHT_CHANNEL=chromium`, because the local default is the installed Microsoft Edge. `deploy` needs both and publishes.
- **The browser specs gate the deploy.** They take about a minute and stub OpenFreeMap and Mapterhorn through `e2e/test.ts`, so the run needs no network and cannot be broken by a tile service being down.
- **The base path applies to the build only.** A project site is served from `/<repository>/`, so `vite.config.ts` sets `base` when `command === 'build' || isPreview`. The dev server stays at `/`, which matters because `playwright.config.ts` points at `http://127.0.0.1:5173` and the specs visit `/`; `vite preview` needs the prefix because it serves the built bundle. `EAUI_BASE_PATH` overrides it, and the workflow sets it from `github.event.repository.name` so renaming the repository does not break asset URLs.
- **No secrets take part.** The build reads no environment variables beyond the base path. `.env.example` reserves `OPENAI_API_KEY` for a future model provider and warns against a `VITE_` prefix, which would put a value in the browser bundle; a static Pages deployment could not hold such a key safely in any case.

## Rationale

- The checks already existed and were run by hand before every commit. Moving them into the workflow makes them a condition of publishing rather than a habit.
- Gating on the browser specs costs about a minute and protects the one artifact strangers will see.
- Deriving the base path from the repository name avoids the most common Pages failure, where a renamed repository serves a blank page because every asset URL keeps the old prefix.

## Alternatives

- **Deploying without gating on the browser specs:** rejected. The published page is the only version most people will see, and a minute is cheap.
- **Committing `dist` to a `gh-pages` branch:** rejected. It puts build output in history and `dist/` is already ignored.
- **A hardcoded `base: '/eaui/'` with no override:** kept as the local fallback only, so a user page or custom domain does not need a config change.

## Consequences

- **The prototype becomes publicly readable.** Every capability is labelled simulated in the app, and no number claims to be real engineering output, which is what makes it safe to show.
- **Visitors' browsers call third-party tile services.** Each visitor loads basemap tiles from OpenFreeMap and terrain tiles from Mapterhorn, which states no terms or service level ([decision 0015](0015-terrain.md)). Both fall back cleanly when unavailable. If the page draws real traffic, turn the basemap off by default rather than lean harder on a free service.
- **The bundled OpenStreetMap extract is published with the site.** It is a derivative database under ODbL with its attribution in the app and in `src/domain/fixtures/README.md`, which the deployment does not change.
- **The repository has no LICENSE file**, so the code itself stays all rights reserved until the user adds one. Publishing a built copy does not change that.
- The main chunk is about 3.2 MB (roughly 943 kB gzipped) plus 1 MB for MapLibre, which Vite warns about. Acceptable for a demonstration; code splitting is the fix if it matters.

## Verification (2026-09-15)

Node.js 24 and Microsoft Edge on the `C:/github/eaui` checkout, with `master` at the merge of `feature/agentic`.

- `npm run typecheck`, `npm run lint`, and `npm run format:check` pass; `npm test` runs 137 tests in 18 files; `npm run test:e2e` runs 49 tests, which confirms the dev server still serves at `/` after the base path was added.
- `npm run build` writes `dist/index.html` referencing `/eaui/assets/index-*.js` and `/eaui/assets/index-*.css`.
- `npm run preview` reports `http://localhost:4173/eaui/`, and that page renders the whole workbench: the Assets tree, the page tabs, and the Reasoning and Inspection panels.
- The workflow file parses as YAML, with jobs `verify`, `e2e`, and `deploy`, and `deploy` needing the other two.

Three things caught during setup, all fixed and worth remembering:

- Making `vite.config.ts` export a function broke `vitest.config.ts`, which passed it to `mergeConfig`. `tsc -b` caught it, and because `npm run build` is `tsc -b && vite build`, the build never ran; the `dist` inspected at that moment was stale output from before the change, which briefly looked like the base path had failed.
- `vite preview` reports `command: "serve"`, so the first version served the built bundle at `/` while its assets asked for `/eaui/`, and the page came back blank. `isPreview` fixed it.
- On Windows, Git Bash rewrites `EAUI_BASE_PATH=/eaui/` into `C:/Program Files/Git/eaui/` through MSYS path conversion. Local builds need no override, since `/eaui/` is the default.

**Not verified:** the workflow has never run, because nothing has been pushed. Whether GitHub Pages is enabled for the repository, whether the repository is public, and whether the pinned action versions resolve can only be confirmed by the first run on GitHub.
