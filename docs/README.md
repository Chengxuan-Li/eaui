# Documentation index

- [Source handoff](20260913_product-ui-experiment-agent-handoff.md): complete initiation brief, preserved unchanged.
- [Reference UI audit](reference-ui-audit.md): stack/hosting map, UI inventory, source evidence, legacy risks, reuse assessment, and limitations.
- [Source manifest](reference-source-manifest.json): hashes of principal inspected reference files; no implementation copied.
- [UI directions](ui-directions.md): three product approaches, technical comparison, recommendation, proposed slice boundaries, and two pending decisions.
- [Decision records](decisions/README.md): accepted constraints and future product/technical decisions.

Current phase (2026-09-14): setup and source audit complete; UI stack accepted in [decision 0002](decisions/0002-web-react-typescript-vite.md) (web-only, React/TypeScript/Vite); product direction under discussion. No primary prototype, packages, or scaffold yet. Next: choose the product direction and first slice, record it, then scaffold.

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
