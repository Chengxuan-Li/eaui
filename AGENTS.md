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

Scaffold phase. Decisions 0002-0008 fix the stack, shell, layout, first-slice workflow, scripted agent, and packages. The Vite React TypeScript app was scaffolded on 2026-09-14; package spikes ran on 2026-09-14 (results in `docs/package-selection.md`); FlexLayout is the docking library (decision 0008). First slice in progress: domain state lives in `src/domain/`, and every model, runtime, or selection change goes through a command executed by `createWorkbench().execute`, never direct state mutation. App actions live in one registry, `src/app/actions.ts`, shared by menus, palette, and shortcuts; layout changes go through `src/app/layout/layoutController.ts`. An unavailable control must explain why rather than do nothing. Forms show command validation issues per field with `isInvalid`; do not use React Aria Form `validationErrors`, which blocked resubmission. Spike pages: `npm run dev`, then `/?spike=` with `map`, `chart`, `grid`, `flow`, or `flexlayout`.

- Install with `npm ci` (Node.js 24 LTS, exact pinned versions). Do not add packages outside decisions 0007 and 0008 without recording the reason in `docs/package-selection.md` or a new decision.
- Develop with `npm run dev`; check a production bundle with `npm run build` and `npm run preview`.
- Verify before committing: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e`, `git diff --check`, and `git diff --cached`. Playwright uses the installed Edge by default; elsewhere run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.
- Keep TypeScript on 6.0 until typescript-eslint supports TypeScript 7. Prettier ignores Markdown so the source handoff stays byte-identical.
