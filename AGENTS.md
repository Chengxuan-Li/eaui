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

Discussion phase. UI stack accepted (decision 0002: web-only React + TypeScript + Vite); product direction and first slice pending; nothing scaffolded, so no build, tests, or preview exist yet. Use `git status --short --branch`, `git diff --check`, `git diff --cached`, and `git log --oneline -5`. Update this section and the README when actual commands become known. Do not scaffold the primary prototype before the discussion checkpoint.
