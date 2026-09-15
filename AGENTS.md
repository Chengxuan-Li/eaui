# Operating instructions

Read the [complete handoff](docs/20260913_product-ui-experiment-agent-handoff.md) and [documentation index](docs/README.md) before substantive work. Keep durable decisions, findings, commands, verification evidence, and next steps in Git; conversation history is not project state.

## Scope and checkpoint

- This is a standalone product UI experiment, separate from `json-render-playground`.
- `../RCEnergySimulator` is a read-only reference, especially `EnergyAtlasWeb`. Inspect `EnergyAtlasDesktopEto` only as needed to understand hosting. Do not edit, build/run with side effects, install dependencies in, commit in, change branches in, or otherwise mutate that repository. Preserve its pre-existing changes. Use `git --no-optional-locks -C ../RCEnergySimulator ...` for inspection.
- If the reference cannot be identified or accessed, ask for its exact path or URL. Do not substitute another project.
- Repository/documentation setup is authorized. Before choosing a stack/architecture or starting the main UI, document the audit, discuss two or three grounded directions, and wait for the user to resolve or explicitly delegate the choices.
- Questions or challenges about a direction pause the affected implementation. No Superpowers workflow, planning gate, or installation is a repository prerequisite; use this handoff's checkpoints.
- Do not copy reference implementation, assets, or confidential data into this experiment without confirmation that reuse is permitted.

## Product and quality

- Build a coherent, workflow-aware application with manual operation first-class and future agents using shared application operations.
- Represent model state, UI state, selection, pending edits, validation, and results explicitly. Design for provenance, progressive disclosure, desktop density, responsive behavior, accessibility, and keyboard use.
- Choose representative vertical slices after discussion. For each, state what is real, mocked, and deferred; cover empty/loading/success/warning/error states; verify critical state transitions, visual layout, and keyboard navigation. Do not ship silent no-op controls.
- Record observed reference facts separately from interpretations and recommendations, citing exact source paths and revision context.

## Git, credentials, and continuity

- Non-destructive setup, edits, checks, and focused conventional commits are authorized. Preserve the configured human Git identity. If unusable, ask; never invent an identity or add assistant/model/vendor authorship, attribution, or trailers.
- No hard resets, force pushes, branch/tag deletion, published-history rewriting, overwriting/discarding user changes, or broad deletion.
- Inspect the staged diff for secrets before every commit. Never commit tokens, passwords, credential-bearing connection strings, or private certificates.
- Maintain `.env.example` (safe placeholders) and ignored `.env.local`; add exact variables before credential integrations. Do not read or reproduce real credentials unnecessarily.
- Keep reasonably sized essential artifacts and provenance tracked. For restricted/large artifacts, document retrieval or generation rather than relying on undocumented local files.
- Commit coherent stages; update docs after meaningful discussions and before handoffs. Record accepted decisions in `docs/decisions/`, pending alternatives in the audit/directions docs.

## Commands and current phase

First-slice implementation phase (2026-09-15): stages 1 to 3c and the design alignment pass (decisions 0009 and 0010, record in `docs/design-alignment.md`) are built on `master`; stage 4, the scripted agent (decision 0011), is built on the `feature/agentic` branch, where agentic work continues until the user merges it. Read the [developer guide](docs/developer-guide.md) for architecture, extension recipes, test pitfalls, and known gaps, and the [next steps](docs/first-slice-proposal.md#next-steps). Decisions 0002-0011 fix the stack, shell, layout, first-slice workflow, scripted agent, packages, UI design direction, the Geist typeface, and agent chart specifications and missing-state approvals. Treat the [UI design guidelines](docs/20260915_energyatlas_ui_design_guidelines.md) as the current visual and interaction guidance (decisions 0009 and 0010; the user maintains it, so change it only at the user's request); gaps and open questions are in [design alignment](docs/design-alignment.md). The Vite React TypeScript app was scaffolded on 2026-09-14; package spikes ran on 2026-09-14 (results in `docs/package-selection.md`); FlexLayout is the docking library (decision 0008). First slice in progress: domain state lives in `src/domain/`, and every model, runtime, or selection change goes through a command executed by `createWorkbench().execute`, never direct state mutation. View state (map, table, dashboard, context panel) changes only through view operations in `src/app/view/`, and the agent acts only through the tool paths in `src/app/agent/tools.ts`. App actions live in one registry, `src/app/actions.ts`, shared by menus, palette, and shortcuts; layout changes go through `src/app/layout/layoutController.ts`. Colors, fonts, and type sizes come from appearance tokens (`src/app/appearance/appearances.ts`, `src/index.css`), never literals; stage and capability status use `StateBadge` and `CapabilityBadge`. An unavailable control must explain why rather than do nothing. Forms show command validation issues per field with `isInvalid`; do not use React Aria Form `validationErrors`, which blocked resubmission. Spike pages: `npm run dev`, then `/?spike=` with `map`, `chart`, `grid`, `flow`, or `flexlayout`.

- Install with `npm ci` (Node.js 24 LTS, exact pinned versions). Do not add packages outside decisions 0007, 0008, and 0010 without recording the reason in `docs/package-selection.md` or a new decision.
- Develop with `npm run dev`; check a production bundle with `npm run build` and `npm run preview`.
- Verify before committing: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e`, `git diff --check`, and `git diff --cached`. Playwright uses the installed Edge by default and 4 local workers; elsewhere run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`. On Windows checkouts with `core.autocrlf=true`, `npm run format:check` flags CRLF line endings; check formatting with `npx prettier --check . --end-of-line auto`.
- Keep TypeScript on 6.0 until typescript-eslint supports TypeScript 7. Prettier ignores Markdown so the source handoff stays byte-identical.
