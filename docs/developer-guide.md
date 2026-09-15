# Developer guide

Date: 2026-09-15, at the end of first-slice stage 3c (commit `a4f779c`).

This guide is for a developer or agent taking over without the original conversation. It describes the code as built, how to extend it without breaking the accepted rules, how it is tested, and what is still missing. Product intent and accepted choices live in the [decision records](decisions/README.md); per-stage evidence lives in the [first-slice implementation status](first-slice-proposal.md#implementation-status).

## Reading order

1. [AGENTS.md](../AGENTS.md): operating rules (reference boundary, Git safety, credentials, verification before commits).
2. [Decisions 0003 to 0009](decisions/README.md): what the product is (shell, layout, workflow, scripted agent), which packages are allowed, and the [UI design guidelines](20260915_energyatlas_ui_design_guidelines.md).
3. This guide.
4. [First-slice proposal](first-slice-proposal.md): the plan, the working/simulated/planned boundary, stage-by-stage status, gaps, and next steps.
5. [Package selection](package-selection.md): constraints each library carries and spike findings.

## What exists

A browser-only React application with one synthetic project that can be taken through the 12-stage workflow of [decision 0005](decisions/0005-first-slice-workflow-and-panel-scope.md):

- **Shell:** ribbon (menus, quick buttons, command palette), FlexLayout docking area, status bar with tasks, issues, notices, and simulated compute.
- **Left border (icon side bar):** Assets tree and Workflow panel.
- **Center pages:** Map, Table, Dashboard, Roadmap, Creator, Settings; Issues and Tasks open from the status bar.
- **Right border:** Reasoning panel, still a labeled placeholder (stage 4).

There is no server, no model provider, and no real engineering calculation. Every number comes from deterministic synthetic code in `src/domain/simulation.ts`, and the UI labels it as simulated through the capability registry.

Run it with `npm ci` then `npm run dev`. To walk the workflow manually: open the Workflow panel, run stages in order (Shading can be skipped), create a measure and a scenario on the Creator page before running Scenario definitions, and expect Grid modeling to fail on its first attempt by design; run it again to recover.

## Architecture

```text
main.tsx ── ?spike=<name> ──> src/spikes/SpikeApp (package spikes, not product code)
   │
   └─ App ─ WorkbenchProvider (src/app/WorkbenchContext.tsx)
              ├─ storage       getBrowserStorage(): localStorage or null
              ├─ workbench     createWorkbench(): zustand vanilla store + command registry
              ├─ layout        createLayoutController(workbench, storage): FlexLayout model
              ├─ task simulator startTaskSimulator(workbench): advances queued tasks as source "system"
              └─ theme
            WorkbenchShell (src/app/shell/WorkbenchShell.tsx)
              ├─ Ribbon, CommandPalette, dialogs ── useAppActions() (src/app/actions.ts)
              ├─ <Layout factory=renderTabContent> ── panels and pages by component id
              └─ StatusBar
```

Data flow is one-directional:

1. A control, shortcut, palette entry, simulator tick, or (later) agent calls `workbench.execute({ type, input }, source)`.
2. The command's zod schema validates the input; the handler mutates an Immer draft and returns `applied` with a summary or `rejected` with per-field issues.
3. The store publishes a new snapshot `{ state, log, canUndo, canRedo }`; components read it through `useWorkbenchSnapshot(selector)`.
4. Derived values (stage states, dashboard data, map metrics, asset tree rows) are computed from state in pure functions, never stored.

### Domain layer (`src/domain/`, no React)

| File | Responsibility |
| --- | --- |
| `types.ts` | `WorkbenchState` and every entity type. Start here. |
| `commands.ts` | The command registry: title, description, zod input, `undoable`, handler. `describeCommands()` exports JSON Schema for future agent tools. |
| `workbench.ts` | `createWorkbench()`: `execute`, `undo`, `redo`, `record` (log an external operation such as a layout change), `load` (replace state, clear history). Operation log entries carry `source` manual, agent, or system. |
| `workflow.ts` | Default 12 stages and `STAGE_IDS`, graph helpers (`upstreamIds`, `downstreamIds`, `topologicalOrder`), `deriveStageStates`, `stageRunBlocker`. |
| `simulation.ts` | Synthetic stage runners (`runSimulatedStage`) and `computeScenarioResult`, shared by scenario modeling and dashboard previews. |
| `simulator.ts` | Task simulator with an injectable scheduler, so tests step time deterministically. |
| `assets.ts` | Asset tree skeleton, `GROUP` ids, `upsertAsset`, `assetPath`. |
| `capabilities.ts` | Working/simulated/planned registry that every honest label reads. |
| `initialState.ts` | Empty project. |

Key domain rules:

- **Stage states are derived** in this order: `unavailable` (planned capability), `running` (active task), `skipped`, `failed` (last run failed), `stale` or `executed` (last run succeeded; stale when an upstream revision or the stage's own `editRevision` differs from what the run consumed, or an upstream stage is no longer executed or skipped), `blocked` (an upstream stage failed, is blocked, or is unavailable), `ready` (all upstream satisfied), else `future`. The current stage is only a focus marker.
- **Revisions:** `revision` changes when a stage's outputs change (run, applied edit of data it owns, skip toggle). `editRevision` changes when inputs owned by the stage change (new measure or scenario, adoption change). Both come from the monotonic `nextId`, which undo never rewinds.
- **Undo** covers model commands (`undoable: true`): skip or restore, insert stage, apply edits, create measure or scenario, set adoption. Runs, tasks, selection, pending edits, and layout changes are not undoable.
- **Selection** is one shared `{ entityType, ids }`. Unknown ids are rejected, and an empty selection is explicit rather than meaning "all".
- **Manual overrides** from applied table edits survive reruns of the stage that generated the field.

### App layer (`src/app/`)

| Area | Files |
| --- | --- |
| Services and hooks | `WorkbenchContext.tsx`: `useServices`, `useWorkbenchSnapshot`, `useStageStates`, `useLayoutVersion` |
| App actions | `actions.ts` (the registry), `useShortcuts.ts`, `shortcuts.ts` (parsing and matching, unit-tested) |
| Layout | `layout/layoutController.ts` (`PAGES`, `PANELS`, `DEFAULT_PAGES`, `openPage`, `togglePanel`, `toggleMaximize`, `setCompact`, `reset`, `handleUserAction`), `layout/flexlayout-theme.css` |
| Shell | `shell/WorkbenchShell.tsx`, `Ribbon.tsx`, `StatusBar.tsx`, `CommandPalette.tsx`, `HelpDialogs.tsx` |
| Shared components | `components/ActionButton.tsx` (explains unavailable actions), `StateBadge.tsx`, `CapabilityBadge.tsx`, `CapabilityTable.tsx`, `EmptyState.tsx`, `NotBuiltYet.tsx`, `forms.module.css` |
| Panels | `panels/AssetsPanel.tsx` + `assetTree.ts`, `panels/WorkflowPanel.tsx` |
| Pages | `pages/*Page.tsx`; pure helpers `mapMetrics.ts`, `dashboardData.ts`, `dashboardCharts.ts` |
| Visualization | `viz/palette.ts` (validated categorical, sequential, status colors per theme), `viz/EChart.tsx` (modular ECharts wrapper), `grid/agGrid.ts` (AG Grid theme from CSS tokens) |
| Persistence and theme | `persistence.ts`, `storage.ts`, `theme.ts`, `useResolvedTheme.ts`, `global.css` (design tokens) |

### Browser storage

Everything persists in `localStorage` of the current origin only:

- `eaui.project.v1`: the saved project (File > Save, Ctrl+S). Tasks active at save time load as cancelled.
- `eaui.layout.v1`: the FlexLayout model, saved on every layout change. An unreadable layout falls back to the default.
- The theme preference key is defined in `src/app/theme.ts`.

To start clean, use File > New project and View > Reset layout, or clear the site data for `127.0.0.1:5173`. Playwright runs start with fresh storage.

## Rules for changes, with recipes

These restate [AGENTS.md](../AGENTS.md) as concrete steps.

### Add or change model behavior: a command

1. Add the entity fields to `src/domain/types.ts` (and `initialState.ts`).
2. Add a `defineCommand` entry in `src/domain/commands.ts` with a user-facing `title`, an agent-readable `description`, a zod input whose messages are written for end users, and `undoable: true` only for project-model changes.
3. Reject with `rejected(message, path)`; `path` must name the input field so forms can place the message.
4. If the change invalidates results, bump the owning stage's `revision` or `editRevision` through `nextRevision(state)` so stale propagation happens automatically.
5. Test it in `src/domain/workbench.test.ts` through `createWorkbench().execute`, including a rejected case and, when undoable, undo and redo.

Never mutate state outside a command. UI-only concerns (hover, open dialogs, draft input text) stay in React state.

### Add a user-invokable action or shortcut

Add an `AppAction` in `src/app/actions.ts`. The same entry then appears in the ribbon menu, command palette, and shortcut help. Set `disabledReason` whenever it cannot run; `useInvokeAction` records that reason in the operation log and status bar instead of doing nothing. Check `src/app/shortcuts.test.ts` and the shortcut dialog for conflicts. Current shortcuts include Ctrl+S, Ctrl+Z, Ctrl+Shift+Z, Alt+1 to Alt+6 (pages), Ctrl+B (Assets), Ctrl+Shift+E (Workflow), Ctrl+Alt+B (Reasoning), Ctrl+Shift+M (maximize), Ctrl+Enter (run current stage), Ctrl+K (palette), F6 and Shift+F6 (tab groups).

### Add a page or panel

1. Add it to `PAGES` or `PANELS` in `src/app/layout/layoutController.ts` (and to `DEFAULT_PAGES` or the default borders if it belongs in the default layout).
2. Map its component id in `renderTabContent` and give it an icon in `TAB_ICONS` in `src/app/shell/WorkbenchShell.tsx`.
3. Open it only through `layout.openPage` or `layout.togglePanel`, never through FlexLayout directly, so the change is logged and available to the agent.
4. Saved layouts contain component ids; renaming one breaks restored layouts, which then show the "Unknown tab" message until reset. Bump `LAYOUT_KEY` if a change makes old layouts invalid.
5. Tabs stay mounted while hidden (`tabEnableRenderOnDemand: false`) and can measure 0x0; size-dependent components (maps, charts, React Flow) must refit when they become visible. See `RoadmapPage.tsx` and `viz/EChart.tsx`.

### Label honestly

Anything that is not real behavior needs a `capabilities.ts` entry and a `CapabilityBadge` or `StatusTag`. Planned controls are visible, focusable (`aria-disabled`, not `disabled`), and explain themselves. Empty states name the missing stage and offer to run it (`EmptyState`).

Decision 0009 asks for status that describes application state, with routine states kept quiet. That does not remove the disclosure itself; how to show simulated and planned capability with less repetition is an [open question](design-alignment.md#open-questions). Until it is settled, keep the existing labels and avoid adding new repeated pills.

### Forms

Use React Aria fields with `isInvalid` and a `FieldError` per field, filled from command issues via `splitIssues` in `src/app/commandErrors.ts`. Editing a field clears only that field's issue. Do not use React Aria `Form` `validationErrors`: it kept corrected fields invalid and blocked resubmission. See `CreatorPage.tsx`.

### Visual design

The [UI design guidelines](20260915_energyatlas_ui_design_guidelines.md) (decision 0009) are the current visual direction, and the build predates them ([design alignment](design-alignment.md)). Build new surfaces in that direction: few type sizes with hierarchy from weight, tone, and spacing; spacing and alignment instead of internal borders; quiet routine states; colors from shared palette tokens rather than literals. Leave exact values to the alignment work.

Text uses the Geist family (decision 0010) through `--font-sans`. Never hard-code a font family; canvas renderers such as ECharts must read the resolved token.

### Charts and color

Where the guidelines differ from this method, follow the guidelines and update this section. They allow selective direct labels and annotation (peaks, thresholds, scenario divergence) where this method requires a legend, and they call for curated palettes with one semantic color language shared by map, charts, table, and workflow, while the slots below were validated for the single current palette.

Follow the existing dataviz method (`dashboardCharts.ts`, `viz/palette.ts`): categorical colors in fixed order and following the entity rather than its rank, at most three charted series (the validated slots), one hue for magnitudes, reserved status colors always with icon and label, a legend for two or more series, and an app-rendered data table for every chart because ECharts has no keyboard navigation. The light-mode third slot (aqua) is below 3:1 contrast, so any chart using it needs labels or a table. Screenshot charts in light and dark mode before committing; the validator does not catch label collisions.

### Packages

Only packages from decisions 0007, 0008, and 0010 are allowed. Record a reason in `docs/package-selection.md` or a new decision before adding one. `react-markdown` and `remark-gfm` are installed for the Reasoning transcript and not used yet.

## Testing

| Command | What it covers |
| --- | --- |
| `npm test` | 38 Vitest tests: commands, undo, stale propagation, simulator, shortcuts, asset tree, map metrics, dashboard data |
| `npm run test:e2e` | 30 Playwright tests in Edge at 1280x800 with axe (no serious or critical violations allowed on product pages) |
| `npm run typecheck`, `npm run lint`, `npm run format:check` | Must be clean before committing |

End-to-end specs:

- `e2e/smoke.spec.ts`: renders with no serious or critical axe violations.
- `e2e/workbench.spec.ts`: shell regions, background task progress, explained blocked actions, palette and panel shortcuts, undo, save and layout persistence across reloads, narrow-window overlays, reset layout.
- `e2e/pages.spec.ts`: Assets provenance, Creator validation and creation, Roadmap focus and custom stage insertion.
- `e2e/map-table.spec.ts`: empty states, validated pending table edits, table-map shared selection.
- `e2e/dashboard.spec.ts`: full manual path to scenario results, preview, apply, stale notice, data table.
- `e2e/spikes.spec.ts`, `e2e/spikes-flexlayout.spec.ts`: package spike baselines (`/?spike=`), kept as regression checks for library behavior.

Conventions and pitfalls found while building:

- Playwright treats `aria-disabled` buttons and React Aria's hidden native checkbox inputs as not actionable. Use `focus()` then `Enter` or `Space`.
- Clicking an already selected border tab (Assets, Workflow, Reasoning) closes that panel. Check `aria-selected` before clicking; the helper in `e2e/dashboard.spec.ts` shows how.
- Stage runs take about 1.6 seconds each through the simulator; wait for the "Done" badge rather than sleeping. Long flows set `test.setTimeout`.
- Status messages are asserted through `getByTestId('status-notice')`.
- MapLibre must stay excluded from Vite dependency pre-bundling (`vite.config.ts`), or its worker fails to load.
- For visual review, write throwaway Playwright captures under the ignored `tmp/` folder and delete them afterwards.
- On machines without Edge: `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.

## Known gaps and deviations

Behavior promised by the plan or decisions but not built yet:

- **Reasoning panel (stage 4):** placeholder only; decision 0009 makes it a shared Reasoning and Inspection surface. See [next steps](first-slice-proposal.md#next-steps).
- **Design alignment:** the Geist typeface (decision 0010, not installed yet), typography, borders, status presentation, palettes, map and legend styling, and the Run control predate decision 0009. See [design alignment](design-alignment.md).
- **Keyboard docking:** decision 0008 and the package constraints say the command palette moves a tab to another tab group through `Actions.moveNode`; that command does not exist yet. Tabs move by mouse drag only.
- **View state is not command-driven:** the map metric and grid overlay, the table view and quick filter, and dashboard previews and compare toggles are local React state. The scripted data-representation session of decision 0006 needs them exposed as logged view operations.
- **Chart specs:** the package constraints call for a zod-validated JSON view schema compiled to ECharts options. Dashboard charts currently build ECharts options directly in `dashboardCharts.ts`.
- **Table:** no Zones view (zone counts are a Buildings column) and no column visibility menu.
- **Fixture variants:** the plan lists switchable empty, warning, and error fixtures. States are reached by walking the workflow: schema matching always reports a warning, skipping shading warns at scenario definitions when a PV measure is used, and grid modeling fails on its first attempt. There is no fixture picker.
- **Layout:** at 1280 px with both side panels open, the Settings tab moves into FlexLayout's overflow menu. Layout changes are logged but not undoable.
- **Accessibility:** the map canvas is not screen-reader accessible (the Table page is the equivalent); only 1280x800 is covered by automated axe runs.
- **Hosting:** only the Vite dev server and `npm run preview` are verified; loading the bundle inside the reference ASP.NET or Eto host is not.
