# Product UI Experiment

A standalone experiment for a coherent EnergyAtlas urban/building energy-modeling product UI. The working repository folder is `eaui`; the final product/repository name is not yet decided. This is separate from `json-render-playground`.

## Status

2026-09-13: repository initialized; the read-only reference source audit is documented. We are at the UI-direction discussion checkpoint. The frontend stack, application architecture, and first vertical slice remain undecided. The primary prototype starts only after discussion resolves or explicitly delegates those choices.

Core workflows must remain useful without an LLM. Favor explicit state, revisitable workflows, progressive disclosure, desktop information density, keyboard access, and traceable changes/results. Identify mocks clearly.

## Setup and commands

This phase requires Git and a text editor only. There is no application, dependency installation, build, test runner, or preview command yet. Add verified commands here when a stack is selected.

```powershell
git status --short --branch
git diff --check
git log --oneline -5
```

`.env.example` is the tracked configuration template; `.env.local` is its ignored local counterpart. No variables or keys are needed yet. On another machine, create the local counterpart if absent:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
git check-ignore .env.local
```

Before any credential-bearing integration, document its exact variable names, add safe placeholders to the template, and let the user populate local values. Never put private keys in browser-exposed configuration.

## Documentation

- [Documentation index](docs/README.md)
- [Operating instructions](AGENTS.md)
- [Reference UI audit](docs/reference-ui-audit.md)
- [Three UI directions and technical comparison](docs/ui-directions.md)
- [Complete source handoff](docs/20260913_product-ui-experiment-agent-handoff.md)

The reference is `../RCEnergySimulator`, primarily `EnergyAtlasWeb`, with `EnergyAtlasDesktopEto` inspected for hosting context. It is view-only and is not a dependency of this repository. If unavailable on another machine, ask for its exact path or URL.
