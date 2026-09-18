# 0017: Publish the prototype to GitHub Pages through GitHub Actions

Date: 2026-09-15

Status: accepted by the user on 2026-09-15, who asked for the deployment after the `feature/agentic` merge into `master`.

## Context

The experiment had no continuous integration and no published build: every check ran on the author's machine, and seeing the prototype meant cloning it and running `npm run dev`. The app is browser-only with no server, no database, and no credentials ([decision 0002](0002-web-react-typescript-vite.md)), so a static host is enough to show it.

## Decision

- **GitHub Pages, built and deployed by GitHub Actions** from `master`, in `.github/workflows/pages.yml`. The workflow also runs on pull requests, where it stops after the checks and publishes nothing.
- **One check job, then a deploy.** `verify` installs once and runs `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, the browser specs, `npm run build`, and finally the production spec against the bundle it just built, then uploads `dist` as the Pages artifact. `deploy` needs it and publishes. Playwright runs with `PLAYWRIGHT_CHANNEL=chromium`, because the local default is the installed Microsoft Edge. Keeping it to one job means one checkout, one `npm ci`, one browser install, and one build.
- **The browser specs gate the deploy.** They take about a minute and stub OpenFreeMap and Mapterhorn through `e2e/test.ts`, so the run needs no network and cannot be broken by a tile service being down.
- **The base path applies to the build only.** A project site is served from `/<repository>/`, so `vite.config.ts` sets `base` when `command === 'build' || isPreview`. The dev server stays at `/`, which matters because `playwright.config.ts` points at `http://127.0.0.1:5173` and the specs visit `/`; `vite preview` needs the prefix because it serves the built bundle. `EAUI_BASE_PATH` overrides it, and the workflow sets it from `github.event.repository.name` so renaming the repository does not break asset URLs.
- **The build emits MapLibre's worker.** MapLibre 6.9.1 derives its worker URL from `import.meta.url` at run time, so the bundler never sees the reference and emits no file. A plugin in `vite.config.ts` copies `maplibre-gl-worker.mjs`, and the `maplibre-gl-shared.mjs` it imports, into the assets directory under their exact unhashed names.
- **`e2e/production.spec.ts` checks the built bundle**, through `playwright.preview.config.ts` and `npm run test:e2e:preview`. It stays out of the everyday `npm run test:e2e`, which needs no build and keeps its speed.
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

## Revision (2026-09-16): the map was missing on the published page

The first deployment published a map that never appeared. MapLibre 6.9.1 computes its worker URL at run time:

```js
let t = e.endsWith(`-dev.mjs`) ? `maplibre-gl-worker-dev.mjs` : `maplibre-gl-worker.mjs`
return new URL(`./${t}`, import.meta.url).href
```

Because no static reference exists, the bundler emitted nothing, and the request for `assets/maplibre-gl-worker.mjs` failed. Nothing caught it:

- the dev server resolves the worker from `node_modules`, so the browser specs passed;
- `vite preview` answers a missing file with `index.html` and a **200**, so the failure showed only as a console warning about a `text/html` MIME type. GitHub Pages has no fallback and returns a real 404.

The fix emits the worker and the shared chunk it imports. `require.resolve('maplibre-gl')` cannot be used to find them: the package exports `"."` for `import` only, so the plugin resolves `maplibre-gl/package.json`, which the exports map lists.

`e2e/production.spec.ts` now guards it, and the guard was checked by breaking it: with the emitted filename altered, the spec fails on the content type (`text/html` rather than `javascript`) rather than on the status, which the fallback would have kept at 200.

### Verification (2026-09-16)

- `npm run typecheck`, `npm run lint`, `npm run format:check` pass; `npm test` runs 137 tests; `npm run test:e2e` runs 49; `npm run test:e2e:preview` runs 1 against the built bundle in about 5 seconds including the build.
- `dist/assets/` contains `maplibre-gl-worker.mjs` (19 kB) and `maplibre-gl-shared.mjs` (514 kB) beside the MapLibre chunk.
- Still unverified: the published page itself, since the workflow has not run and the deployment host is unreachable from here.

## Revision (2026-09-18): the rename blanked the published page

The repository was transferred to the `Energy-Atlas` organization and renamed from `eaui` to `energyatlas-ui`. Pages moved with it and served `https://energy-atlas.github.io/energyatlas-ui/`, but the artifact already published was the 2026-09-16 build, whose `index.html` still asked for `/eaui/assets/index-*.js`. Renaming a repository does not rebuild the artifact. The HTML loaded with a 200, the module script 404ed, React never mounted, and the page was a blank white `<div id="root">` with nothing visible to explain it.

Probing the host separated the two prefixes and made the cause unambiguous: `/energyatlas-ui/assets/index-BR7pvUgE.js` answered 200 while `/eaui/assets/index-BR7pvUgE.js` answered 404. The files were in the right place; only the references were stale.

Deriving `EAUI_BASE_PATH` from `github.event.repository.name` was supposed to prevent exactly this, and would have, had anything been pushed after the rename. But a re-run alone would not have deployed either, because the prefix was really three values that only looked like one:

- `vite.config.ts` fell back to a hardcoded `'/eaui/'`;
- `playwright.preview.config.ts` waited on `${baseURL}/eaui/`;
- `e2e/production.spec.ts` visited `/eaui/` and fetched `/eaui/assets/maplibre-gl-worker.mjs`.

The workflow set `EAUI_BASE_PATH` on the build step only. So the rebuilt bundle would carry `/energyatlas-ui/`, `vite preview` would serve it at `/eaui/`, the production spec would fail, and `verify` would block the deploy. The three agreed before only because the repository name and the hardcoded default happened to be the same string, which is not a property worth relying on.

The fix removes the coincidence:

- **`basePath.ts` is the single source.** It exports `BASE_PATH`, defaulting to `/energyatlas-ui/` and overridden by `EAUI_BASE_PATH`. `vite.config.ts`, `playwright.preview.config.ts`, and `e2e/production.spec.ts` import it; no file spells the prefix out. It sits in `tsconfig.node.json`, beside the configs that use it.
- **`EAUI_BASE_PATH` moves to the job's `env`** in `pages.yml`, so the build, `vite preview`, and the production spec all read the value derived from the repository name. It does not disturb the dev-server specs, because `base` still applies only when `command === 'build' || isPreview`.
- **The npm package is renamed** from `eaui` to `energyatlas-ui` in `package.json` and `package-lock.json`, matching the repository. Nothing reads the name; it is private and unpublished.

### Rationale

- A default that has to match the repository name is a hazard, not a safeguard: it is silent while correct and silent when it stops being correct. One imported constant cannot drift from itself.
- Setting the environment variable per step made the build and the check that guards the build disagree. The job is the right scope, because every step in it works on the same bundle.

### Alternatives

- **Re-pointing the default at `/energyatlas-ui/` and leaving the three literals in place:** rejected. It would have deployed, and the next rename would have reproduced the failure exactly.
- **A CNAME and a custom domain,** which would serve from `/` and make the prefix moot: deferred. It needs a domain and a DNS decision, neither of which exists yet.

### Verification (2026-09-18)

Node.js 24 and Microsoft Edge on the `C:/github/eaui` checkout, `master` at `6586202`.

- The failure was confirmed against the live host before any change: `https://energy-atlas.github.io/energyatlas-ui/` returned 200 with `src="/eaui/assets/index-BR7pvUgE.js"`, that URL returned 404, and the same file under `/energyatlas-ui/` returned 200.
- `npm run typecheck`, `npm run lint`, and `npm run format:check` pass; `npm test` runs 169 tests in 20 files; `npm run test:e2e` runs 50 tests, which confirms the dev server still serves at `/`.
- `npm run test:e2e:preview` passes with no override, and `dist/index.html` references `/energyatlas-ui/assets/index-*.js` and `/energyatlas-ui/assets/index-*.css`.
- The override was checked by using a value that matches nothing: with `EAUI_BASE_PATH=/rename-probe/`, the same command passes and `dist/index.html` references `/rename-probe/assets/index-*.js`. Under the old arrangement that combination is the one that fails, so this is the case the change is for.

**Not verified until the workflow runs:** the published page itself. The deploy has to rebuild before the fix is visible, so the blank page stays blank until `master` is pushed.
