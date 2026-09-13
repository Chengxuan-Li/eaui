# Documentation index

- [Source handoff](20260913_product-ui-experiment-agent-handoff.md): complete initiation brief, preserved unchanged.
- [Reference UI audit](reference-ui-audit.md): stack/hosting map, UI inventory, source evidence, legacy risks, reuse assessment, and limitations.
- [Source manifest](reference-source-manifest.json): hashes of principal inspected reference files; no implementation copied.
- [UI directions](ui-directions.md): three product approaches, technical comparison, recommendation, proposed slice boundaries, and two pending decisions.
- [Decision records](decisions/README.md): accepted constraints and future product/technical decisions.

Current phase (2026-09-13): setup and source audit complete; discuss UI directions. No primary prototype or technical stack is selected. Next: choose or revise the proposed experience and technical lane, then record the outcome before implementation.

## Verification recorded 2026-09-13

- Source handoff SHA-256 still matches the original recorded in decision 0001.
- All local Markdown links resolve; audit-stage staged diff passes `git diff --cached --check`.
- `.env.local` exists and is ignored; credential variants were checked with `git check-ignore`. The tracked template contains comments only because no integration is configured.
- Staged content was reviewed for credentials; a supplemental credential-pattern scan found none.
- All 40 reference-file hashes match the audit manifest; the reference's 28 pre-existing Git status entries remain unchanged.
- Initial handoff includes intentional Markdown hard-break spaces. The initialization diff check used `git -c core.whitespace=-blank-at-eol diff --cached --check` to preserve the supplied file unchanged.
- No application build, runtime test, or screenshot verification was performed; this milestone contains documentation and repository configuration only.
