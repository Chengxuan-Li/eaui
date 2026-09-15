# 0014: LF line endings through Git attributes

Date: 2026-09-15

Status: accepted by the user on 2026-09-15 ("unify line endings via git attributes"). Resolves the line-ending gap left undecided in [design alignment](../design-alignment.md#remaining-gaps).

## Context

Observed on `feature/agentic` at `b408457`: the repository had no `.gitattributes`, and Git for Windows' system configuration sets `core.autocrlf=true`. All 162 tracked files were stored with LF in the index, but 102 of them were checked out with CRLF. Prettier's default end of line is LF (`.prettierrc.json` does not override it), so `npm run format:check` reported those files on Windows, and the documented workaround was `npx prettier --check . --end-of-line auto`.

## Decision

- A root `.gitattributes` sets `* text=auto eol=lf`: text files are normalized to LF in the index and checked out with LF on every platform, whatever `core.autocrlf` says.
- Common binary asset types are marked `binary` so they are never converted.
- Existing checkouts are converted once to match; the index needed no renormalization.

## Alternatives not chosen

- Setting `core.autocrlf=input` per clone: it depends on each machine's configuration and is not tracked in the repository.
- Keeping `--end-of-line auto` for format checks: it hides line-ending drift instead of preventing it.

## Consequences

- `npm run format:check` works unchanged on Windows checkouts.
- Tracked file content does not change, so the source handoff stays byte-identical.
- Editors on Windows must keep LF in these files; Git converts CRLF back to LF when staging.
