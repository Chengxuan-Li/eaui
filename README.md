# Product UI Experiment

A standalone experiment for a coherent EnergyAtlas urban/building energy-modeling product UI. The working repository folder is `eaui`; the final product/repository name is not yet decided. This is separate from `json-render-playground`.

## Status

2026-09-14: repository initialized and the read-only reference audit documented. UI stack accepted: web-only React + TypeScript + Vite ([decision 0002](docs/decisions/0002-web-react-typescript-vite.md)). Product direction accepted: a combined shell ([decision 0003](docs/decisions/0003-combined-product-shell.md)) in a docking workbench layout ([0004](docs/decisions/0004-workbench-layout-and-docking.md)) with a 12-stage default workflow ([0005](docs/decisions/0005-first-slice-workflow-and-panel-scope.md)) and a scripted agent ([0006](docs/decisions/0006-scripted-agent-and-layout-details.md)). The [first-slice proposal](docs/first-slice-proposal.md), packages, and scaffold are pending. The primary prototype starts only after discussion resolves or explicitly delegates those choices.

Core workflows must remain useful without an LLM. Favor explicit state, revisitable workflows, progressive disclosure, desktop information density, keyboard access, and traceable changes/results. Identify mocks clearly.

## Setup and commands

This phase requires Git and a text editor only. There is no application, dependency installation, build, test runner, or preview command yet. Add verified commands here when a stack is selected.

```powershell
git status --short --branch
git diff --check
git log --oneline -5
```

`.env.example` is the tracked configuration template; `.env.local` is its ignored local counterpart. It lists `OPENAI_API_KEY` and `OPENAI_MODEL`, reserved for a future model provider behind the agent adapter; the first slice reads no variables ([decision 0006](docs/decisions/0006-scripted-agent-and-layout-details.md)). Never expose keys through `VITE_`-prefixed variables, which Vite bundles into client code. On another machine, create the local counterpart if absent:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
git check-ignore .env.local
```

Before any credential-bearing integration, document its exact variable names, add safe placeholders to the template, and let the user populate local values. Never put private keys in browser-exposed configuration.

## Documentation

- [Documentation index](docs/README.md)
- [Operating instructions](AGENTS.md) (imported by [CLAUDE.md](CLAUDE.md) for Claude Code)
- [Reference UI audit](docs/reference-ui-audit.md)
- [Three UI directions and technical comparison](docs/ui-directions.md)
- [First-slice proposal](docs/first-slice-proposal.md)
- [Package selection proposal](docs/package-selection.md)
- [Complete source handoff](docs/20260913_product-ui-experiment-agent-handoff.md)

The reference is `../RCEnergySimulator`, primarily `EnergyAtlasWeb`, with `EnergyAtlasDesktopEto` inspected for hosting context. It is view-only and is not a dependency of this repository. If unavailable on another machine, ask for its exact path or URL.
