# Documentation index

- [Source handoff](20260913_product-ui-experiment-agent-handoff.md): complete initiation brief, preserved unchanged.
- [Reference UI audit](reference-ui-audit.md): stack/hosting map, UI inventory, source evidence, legacy risks, reuse assessment, and limitations.
- [Source manifest](reference-source-manifest.json): hashes of principal inspected reference files; no implementation copied.
- [UI directions](ui-directions.md): three product approaches, technical comparison, recommendation, proposed slice boundaries, and two pending decisions.
- [First-slice proposal](first-slice-proposal.md): layout details, state model, workflow stages, working/simulated/planned boundary, and open questions.
- [Package selection proposal](package-selection.md): researched package recommendations, fallbacks, constraints, spikes, and rejected candidates.
- [Decision records](decisions/README.md): accepted constraints and future product/technical decisions.

Current phase (2026-09-14): setup and source audit complete; UI stack accepted in [decision 0002](decisions/0002-web-react-typescript-vite.md) (web-only, React/TypeScript/Vite); combined product shell, workbench layout with docking, and first-slice workflow accepted in decisions [0003](decisions/0003-combined-product-shell.md), [0004](decisions/0004-workbench-layout-and-docking.md), and [0005](decisions/0005-first-slice-workflow-and-panel-scope.md); scripted agent and layout details in [0006](decisions/0006-scripted-agent-and-layout-details.md). Packages accepted in [0007](decisions/0007-package-selection.md); app scaffolded, and package spikes run 2026-09-14 ([results](package-selection.md#spike-results-2026-09-14)). FlexLayout accepted for docking in [0008](decisions/0008-flexlayout-docking.md). First slice in progress: stages 1 (domain state and commands), 2 (workbench shell), 3a (assets, creator, roadmap), 3b (map and table), and 3c (dashboard) are complete; see [implementation status](first-slice-proposal.md#implementation-status).

## Verification recorded 2026-09-13

- Source handoff SHA-256 still matches the original recorded in decision 0001.
- All local Markdown links resolve; audit-stage staged diff passes `git diff --cached --check`.
- `.env.local` exists and is ignored; credential variants were checked with `git check-ignore`. The tracked template contains comments only because no integration is configured.
- Staged content was reviewed for credentials; a supplemental credential-pattern scan found none.
- All 40 reference-file hashes match the audit manifest; the reference's 28 pre-existing Git status entries remain unchanged.
- Initial handoff includes intentional Markdown hard-break spaces. The initialization diff check used `git -c core.whitespace=-blank-at-eol diff --cached --check` to preserve the supplied file unchanged.
- No application build, runtime test, or screenshot verification was performed; this milestone contains documentation and repository configuration only.

## Second-machine check recorded 2026-09-13

Machine paths: this repository at `E:/Coding/eaui`, reference at `E:/Coding/RCEnergySimulator` (decision 0001 and the audit record the audit machine's `C:/github/...` paths). Read-only inspection only.

- Reference is on the audited branch and HEAD (`backup/code-review-local-2026-09-06`, `545751dd`) but its working tree is clean; the 28 audited status entries are absent here.
- Manifest: 38 of 40 hashes match. `EnergyAtlasWeb/README.md` differs only by line endings. `EnergyAtlasWeb/Controllers/SimulationController.cs` differs in content, consistent with the audit having hashed its uncommitted local modification. Audit findings about that file describe the audit machine's working copy.
- Handoff: committed blob matches the decision 0001 SHA-256. The worktree file hashes differently only because `core.autocrlf=true` converts line endings on checkout; `git status` is clean.
- `.env.local` was created from `.env.example` per README setup and confirmed ignored by `git check-ignore`.
- Added `CLAUDE.md`, which imports `AGENTS.md` so Claude Code loads the repository rules automatically.

## Reference drift check recorded 2026-09-14

Audit machine (`C:/github/...`), read-only inspection only.

- Reference branch unchanged (`backup/code-review-local-2026-09-06`), but HEAD advanced one commit from audited `545751dd` to `436a76a7` (2026-09-14, "refactor(ubem)!: merge UbemSimplePC into UbemSimple as a streaming run mode"). Working tree is now clean; the 28 audited status entries were committed or removed.
- Within `EnergyAtlasWeb` and `EnergyAtlasDesktopEto`, only `Controllers/SimulationController.cs` differs: `/api/simulation/run` accepts `options.executionMode` = `streaming` (default) or `chunked` and returns 400 otherwise. UI surfaces in the audit are unaffected; the run-API description should be read with this addition.
- Confirmed for the technical-lane discussion: `WebAppFactory.cs` serves `wwwroot` with `UseDefaultFiles`/`UseStaticFiles` and has no SPA fallback route; `Connectors/python/src/energyatlas/` is a Python HTTP client of the web API; no `package.json`, TypeScript, or Razor files exist outside build/dependency folders.

## Scaffold verification recorded 2026-09-14

- Based on the `create-vite` 9.2.1 `react-ts` template, generated outside the repository and merged by hand. The template's demo assets and README were not copied, and its oxlint setup was replaced by ESLint and Prettier per decision 0007.
- `npm install` with exact versions: 0 vulnerabilities reported.
- `npm run build` (typecheck plus Vite build) passed; the scaffold bundle is 219.92 kB JS (68.77 kB gzip).
- `npm run lint` and `npm run format:check` passed.
- `npm test`: 1 Vitest component test passed.
- `npm run test:e2e`: 1 Playwright test passed in the installed Microsoft Edge at 1280x800, with no axe violations.
- The scaffold page implements no workflow; it states that the workbench, workflow, and agent are not implemented yet.
