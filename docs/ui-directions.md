# Product UI directions for discussion

Date: 2026-09-13

Status: superseded for decisions. The user chose to combine directions ([decision 0003](decisions/0003-combined-product-shell.md)) and accepted web-only React/TypeScript/Vite ([decision 0002](decisions/0002-web-react-typescript-vite.md)). This document is retained as the alternatives considered; current slice work is in the [first-slice proposal](first-slice-proposal.md). Grounding: [reference audit](reference-ui-audit.md).

## Recommendation: guided modeling studio

Keep a persistent project workspace with a workflow rail, a central map/table, and a contextual inspector. Each step explains what it needs, what is missing, and what artifact it produces. Users can revisit completed work, with affected runs visibly becoming stale. A persistent run drawer keeps long operations accessible while the user inspects inputs.

Why this first: the reference's most distinctive product idea is its sequence of steps and artifacts; its biggest continuity cost is moving between independent pages and differently owned state. This direction tests a coherent application and representative analytical interactions together. It also avoids committing to a full docking framework before we know whether fixed presets plus adjustable splits are enough.

Proposed visual treatment: restrained neutral surfaces, readable technical typography, blue selection accents, compact labels, and clear warning/readiness badges. Use layout changes to serve tasks: setup is focused, inspection is spatial, comparison is analytical. Dark versus light default remains a design choice to test, not an accepted brand requirement.

## Three credible product approaches

| Dimension | A. Guided modeling studio (recommended) | B. Spatial engineering workbench | C. Scenario comparison workspace |
| --- | --- | --- | --- |
| Organizing idea | A revisitable workflow with stable project context | Selection of buildings and their properties drives the workspace | Baseline and alternatives drive the workspace |
| Grounding in reference | Workflow/artifact rail, schema matching, readiness checks, run surface | Spatial preview, assignment maps, attribute table, saved splits | ResultViewer, CAP seed/adoption controls, scenario rules |
| Primary experience | Prepare → inspect → validate → run → compare | Select → inspect → bulk edit → see effects | Choose cohort → compare assumptions/results → inspect differences |
| Layout | Workflow rail + task canvas + inspector; persistent run drawer | Large map/table, entity navigator, resizable inspectors, analysis dock | Scenario list/matrix, linked map and charts, assumptions/provenance drawer |
| Scientific visualization | Contextual map/table and a small number of meaningful result charts | Strongest spatial/geometry emphasis; chart and map size compete | Strongest comparative metrics/time-series emphasis; model preparation is secondary |
| Dynamic layouts | A few deliberate presets with saved split sizes | Greatest layout flexibility; greatest focus/resize/persistence complexity | Stable analytical grid with configurable comparisons |
| Main tradeoff | Can become a rigid wizard unless revisiting/editing is first-class | Can hide prerequisites and overwhelm users who need guidance | Can become a dashboard shell unless editing/running is included |
| Solo-maintainer cost (assessment) | Moderate: one shared shell and explicit workflow state | Highest: coordinated selection and flexible layout behavior across tools | Moderate for fixture results; grows with metric/cohort/provenance semantics |
| Migration cost (assessment) | Moderate: adapt operations/artifacts to current APIs and replace navigation incrementally | Highest: requires a consistent entity/selection contract beyond existing page boundaries | Lower for an isolated results module; harder if broad model authoring is added later |
| Smallest informative slice | Assign an archetype to a cohort, resolve readiness, simulate a fixture run, compare a result | Select buildings in map/table, edit one bulk assumption, inspect resulting validation | Compare baseline and one retrofit on the same cohort, inspect input changes and a chart delta |

All three can use the same browser UI technology. Product direction and frontend framework are separate decisions; none of these layouts inherently requires Eto, React, or Blazor.

## Technical lanes to discuss

| Concern | React + TypeScript + Vite | Modular HTML/CSS + TypeScript | Blazor WebAssembly + C# |
| --- | --- | --- | --- |
| UI/state capability | Components suit a shared shell, structured state, and multiple linked views | Fully capable; shared rendering/state conventions must be designed and maintained explicitly | Components and C# state; JavaScript integration for existing map/chart engines |
| Dynamic/scientific views | JS map/chart adapters fit naturally; component lifecycle must manage resize/disposal | Direct JS library use; more manual lifecycle and event coordination | Keep high-frequency map interactions within JS; cross-runtime ownership needs care |
| Solo maintenance | Adds npm/build dependencies, but gives a common component model; avoid layering many state/layout frameworks | Few conceptual dependencies, but the reference shows how imperative page scripts can grow | C# continuity; still requires JS/CSS knowledge and interop tests |
| ASP.NET fit | HTTP/JSON adapter; production can serve built static assets alongside APIs | Closest to existing static-file serving; typed adapter still desirable | Strong .NET tooling fit; share appropriate DTOs, not the entire simulation library with the browser |
| Deterministic independent mode | In-memory fixtures and shared commands, without backend or credentials | Same; explicit mock service boundary | Standalone WebAssembly can use fixture services; server-interactive mode would require a server |
| Web / future desktop | Browser bundle; later serve through native local host with explicit host capabilities | Browser assets; later native adapter | Client bundle with .NET WebAssembly runtime; test target WebView support and payload before selecting |
| Testing/packaging/iteration | Type checks, operation tests, browser interaction checks, static bundle | Similar checks; direct browser modules or a small build pipeline | .NET unit/component tests plus browser/interop tests, .NET build/publish |
| Migration consequence | Reimplement UI and map current endpoints/artifact shapes behind an adapter | Least initial hosting change, but explicit state modernization is still work | Reimplement views in Razor components; reuse C# contracts selectively; adapt JS visualization boundary |

Recommendation for discussion: **A with React/TypeScript/Vite**, a small explicit state/operation layer, deterministic fixtures, and separate backend/native-host adapters. It should run without the reference repository or private services. Do not choose map, chart, routing, state-management, or docking packages until the slice makes their needs concrete. This is an assessment based on the audited state/navigation complexity, not a measured framework benchmark.

React's documentation includes Vite's TypeScript template and explains that a bare build-tool SPA still needs routing/data-fetching choices; it also recommends considering frameworks as requirements grow. That makes this a scoped experiment choice rather than a universal production prescription. [React: build from scratch](https://react.dev/learn/build-a-react-app-from-scratch).

Microsoft documents standalone Blazor WebAssembly as client-rendered and distinguishes it from server-interactive rendering; its JS interop guidance explains the .NET/JavaScript bridge. The interop coordination cost above is our engineering assessment, not a claim that Blazor cannot support scientific views. [Blazor render modes](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/render-modes?view=aspnetcore-10.0), [Blazor JavaScript interop](https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/?view=aspnetcore-10.0). Documentation checked 2026-09-13; no versions selected or installed.

## Proposed first-slice boundaries, if A is selected

- Original synthetic project with a small building collection, two archetypes, baseline and one retrofit; tracked fixture provenance/schema. No reference data/assets copied.
- Real UI behavior: linked map/table selection, pending edits and apply/cancel, validation/readiness, preserved context across stages, adjustable panels, keyboard operation, and an inspectable action/run record.
- Mocked engineering: deterministic run progression and outputs explicitly labeled simulated demo data; repeatable success, warning, failure, and empty cases. No physical performance claims or fake live simulation.
- A changed assumption invalidates the prior result; a new run records its input snapshot. Empty cohort intersections remain explicit rather than reverting to all buildings.
- Defer full geometry editing, live simulation, calibration, exhaustive archetype editors, authentication, LLM actions, unrestricted docking, and desktop packaging.
- Verify operation/state transitions and a full manual workflow, then inspect at 1280×800 and 1920×1080 plus a narrower responsive layout. Test focus order, keyboard selection/editing, panel resizing, and visible error recovery. Select actual tools and commands with the stack.

## Smallest decisions needed next

Resolved 2026-09-14: the user combined the directions rather than choosing one ([decision 0003](decisions/0003-combined-product-shell.md)) and accepted a web-only browser-first stack ([decision 0002](decisions/0002-web-react-typescript-vite.md)). The original questions are kept below for context.

1. Which first experience should this experiment prove: **guided modeling**, **spatial editing**, or **scenario comparison**? Recommendation: guided modeling, keeping the map/table central.
2. Is **React/TypeScript with deterministic browser-only fixtures first** acceptable, or does C# ownership/native desktop integration need to constrain the first prototype? Recommendation: browser-first, preserve explicit adapter boundaries, defer live integration.

Final naming and detailed styling can follow these choices. Do not interpret silence as acceptance. Record the user's answer and rationale in `docs/decisions/`, update the status/index, and only then define and implement the primary slice.

## Technical-lane discussion (continued 2026-09-14)

Status: resolved in part. UI technology accepted in [decision 0002](decisions/0002-web-react-typescript-vite.md): web-only, React/TypeScript/Vite; Blazor (WebAssembly and Hybrid) and WPF are excluded. Contract authorship and routing/hosting rows below remain proposals. Evidence from the [2026-09-14 drift check](README.md#reference-drift-check-recorded-2026-09-14).

### Reframing: where do authoritative operations live?

The framework choice matters less than the location of the operation layer that manual controls and future agents share.

- Observed: the reference already has two non-browser API consumers besides its pages: the Eto host and a Python client (`Connectors/python/src/energyatlas/client.py`). Model/simulation code is C# (`netstandard2.0` Core/Lib, `net8.0` Web).
- Interpretation: in production, agents most plausibly operate through the server API, not through browser code. Authoritative model operations therefore belong on the .NET side eventually, whatever the UI technology.
- Recommendation: in the experiment, define operations as serializable command/result contracts shaped like future HTTP endpoints (IDs, inputs, validation issues, produced artifacts, provenance). Implement them against deterministic fixtures behind an adapter. UI-only state (panel sizes, focus, hover) stays out of that contract. This keeps a TypeScript prototype honest about migration: contracts carry over, fixture implementations do not.

### Sub-decisions inside the technical lane

| Question | Options | Recommendation |
| --- | --- | --- |
| UI technology | React/TS/Vite; plain TS modules; Blazor WebAssembly; Blazor Hybrid (see below) | React/TS/Vite, unchanged |
| Contract authorship | TS types first; schema/OpenAPI first with generated types; C# DTOs first with generated TS | TS types first for the experiment, written to be mirrorable to OpenAPI; defer code generation until a live endpoint is integrated |
| Routing/hosting proof | Browser dev server only; also load the built bundle through ASP.NET/Eto | Browser-only now. Because the reference host has no SPA fallback route, prefer routes that survive plain static serving (hash or query state) or record that production needs `MapFallbackToFile` |

### Blazor Hybrid variant (not in the original comparison)

Assessment, not verified: .NET documents a WPF `BlazorWebView` in which Razor components run on native .NET and can call C# libraries directly, without WebAssembly. That is the strongest C#-ownership option for a desktop-first product. Costs: the current Eto `WebView` is a different control, so hosting would change; it does not by itself give a browser-deployable build; and map/chart libraries remain JavaScript behind interop. Consider it only if desktop-first C# ownership is a firm constraint.

### What would change the recommendation

- A requirement that C# developers own the UI code, or that the first prototype run inside the Eto host: favor Blazor (Hybrid for desktop-first, WebAssembly for web-first).
- A requirement for zero frontend build tooling in the production path: favor plain TS modules with an explicit state/operation module.
- Neither: React/TS/Vite with the contract boundary above.
