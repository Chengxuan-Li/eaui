# RC Energy Modeler / EnergyAtlas reference UI audit

Date: 2026-09-13

Status: source audit complete; product and technical direction awaiting discussion. No primary prototype started.

## Scope, provenance, and limits

The user identified `../RCEnergySimulator` as view-only, specifically `EnergyAtlasWeb`. This resolves to `C:/github/RCEnergySimulator` on the audit machine. `EnergyAtlasDesktopEto` was inspected for hosting/bridge context; Core/Lib project files and simulation integration were sampled, not comprehensively audited.

- Branch: `backup/code-review-local-2026-09-06`.
- HEAD: `545751dd2380a23323d166e02b9fd13f3c62c370`.
- The checkout already had 28 status entries, including a modified `EnergyAtlasWeb/Controllers/SimulationController.cs`, changes in Lib/tests/docs, two deleted producer-consumer files, and an untracked test. Findings describe the working files, not a pristine checkout of HEAD. Read-only status checks before and after the audit showed the same entries.
- [Source manifest](reference-source-manifest.json) records hashes of the principal inspected files, without copying their contents. Paths below are relative to the reference root; use the manifest to detect drift.
- Methods: file inventory, project/build-file inspection, entry-point and bridge tracing, HTML/CSS/JS inspection, controller/state/job tracing, and cross-checks against the reference README.
- No writes, builds, dependency installs, runtime launch, project-open/save API calls, commits, or branch changes were made in the reference. No source code, datasets, or assets were imported here.
- No screenshots were captured. This is source-based visual/interaction analysis, not a rendered usability or accessibility certification. Starting the full app can initialize caches/sample data and build outputs; a static rendering without its services would not verify the engineering workflows. Runtime appearance, timing, WebView backend behavior, and performance remain unverified.

## 1. Repository and stack map

| Area | Observed implementation | Evidence |
| --- | --- | --- |
| Browser UI | Plain HTML pages, CSS custom properties, imperative JavaScript; page scripts use globals/IIFEs and DOM APIs. No React, Vue, Razor component UI, or frontend package/build manifest found in the audited web surface. | `EnergyAtlasWeb/wwwroot/menu.html`, `js/progressSidebar.js`, `js/resultViewer.js`; file inventory |
| HTTP host | C#, ASP.NET Core `net8.0`; static files, controllers, Newtonsoft JSON, Swagger, SignalR. | `EnergyAtlasWeb/EnergyAtlasWeb.csproj`; `WebAppFactory.cs:65`, `:86`, `:149`, `:157`, `:176` |
| Native host | Windows-targeted .NET 8, Eto.Forms/Eto.Platform.Wpf 2.8.0, WPF, WebView2 package 1.0.2792.45. Native menus wrap an Eto `WebView`. | `EnergyAtlasDesktopEto/EnergyAtlasDesktopEto.csproj`; `MainForm.cs:75` |
| Desktop startup | Starts the shared ASP.NET host in-process, selects free loopback ports, passes its bound URL to MainForm, and serves copied `wwwroot`/settings from the executable directory. | `EnergyAtlasDesktopEto/Program.cs`; desktop csproj content-copy rules |
| Native bridge | Injects `window.MauiFilePicker`; JS requests become `maui://` navigations intercepted by Eto, resolved through script callbacks. Retains MAUI naming despite Eto implementation. Native dialogs, recent projects, menu commands, and loopback navigation restrictions add behavior beyond a passive wrapper. | `EnergyAtlasDesktopEto/MainForm.cs:19`, `:513`, `:534`, `:661` |
| Model/simulation | Web references Core and Lib; both target `netstandard2.0`. SimulationController performs preflight, creates a job, invokes `UbemSimple`, publishes progress, and registers result artifacts. | Web/Core/Lib csproj files; `Controllers/SimulationController.cs:43`, `:158`, `:261`, `:356` |
| Visualization | Mapbox GL JS 2.15.0 on several pages, 3.1.2 on spatial preview; Plotly 2.32.0 on results/run pages but floating `plotly-latest` on assignment/scenario pages; chroma-js 2.4.2; SignalR client 7.0.5 on job/run pages. | Script/style tags in `wwwroot/{geoDataPreview,resultViewer,templateAssignment,scenarioDesigner,runSimulation,jobRunner}.html` |
| Packaging | .NET SDK/MSBuild and NuGet PackageReferences; browser libraries loaded from external URLs, not a frontend lockfile. Fonts loaded from Google Fonts. | csproj files; HTML script tags; `wwwroot/css/main.css:3` |

Cross-check outcome: the reference README correctly describes plain HTML/JS but its MAUI-wrapper description and predominantly light palette are stale. Runtime source identifies Eto/WPF and dark defaults with light overrides. Its statement that the frontend needs no framework/build tool must not be confused with having no third-party runtime dependencies.

### Observed data flow

```text
Eto native menus/dialogs <-> injected JS callbacks / intercepted maui:// URLs
                                  |
Browser HTML/CSS/JS <---- loopback HTTP ----> shared ASP.NET Core host
       |                                      |
       | fetch /api/...                       +-- ProjectController / ProjectData
       |                                      |   process-wide current project + Project.json
       |                                      +-- DataHub / file caches / artifacts
       +<---- SignalR progress ---------------+-- JobStore + reporters
                                              +-- Core/Lib simulation -> result artifacts
```

`ProjectController.cs:18` holds a static `CurrentProject` protected by a lock; `Models/ProjectData.cs` persists workflow IDs, statuses and free-form per-step user data in `Project.json`. This is a single-process project model, not evidence of multi-user isolation. `Utilities/DataHub.cs` provides a singleton with data entries and file-cache integration.

The shared rail fetches `/api/project/workflow`; `statusBar.js` adds project controls and a `/workflowProgressHub` connection. Simulation uses `/api/simulation/run`, `/jobHub`, and backend job status storage; run chart payloads use a `CHARTS:` prefix inside messages. Results consume DataHub entries/GeoJSON and dedicated upload/census endpoints. `js/config.js` obtains client-safe runtime config from `/api/config`, implemented in `Controllers/GUIJobRunnerController.cs`.

### Build/run paths (identified, not executed)

From the **reference root**, its source supports:

```powershell
dotnet build EnergyAtlasWeb/EnergyAtlasWeb.csproj
dotnet run --project EnergyAtlasWeb/EnergyAtlasWeb.csproj --launch-profile http
dotnet build EnergyAtlasDesktopEto/EnergyAtlasDesktopEto.csproj
dotnet run --project EnergyAtlasDesktopEto/EnergyAtlasDesktopEto.csproj
```

These are reference commands, **not commands to run under the current view-only scope**. Web launch profiles request HTTP 5094 / HTTPS 7200, but `EnergyAtlasWeb/Program.cs` can select a nearby free port. Desktop startup does the same and prefers its bound HTTPS address. The native target requires Windows/WPF; SDK/package restoration, HTTPS trust, WebView runtime, data availability, and external visualization resources are runtime prerequisites not validated here. No frontend npm step is present. Core/Lib/other solution projects have additional dependencies, so solution-wide build success is not inferred.

## 2. UI surfaces and workflow inventory

The rail defines **Setup → Model → Simulation → Retrofit Scenarios → Results**, with intermediate artifact pages. Its variable name `DEMO_WORKFLOW` does not mean the whole rail is a disconnected demo: it maps live project statuses from the API (`js/progressSidebar.js:129`, `:533`).

| Surface | Controls and workflow observed in source | Principal evidence under `EnergyAtlasWeb/` |
| --- | --- | --- |
| Start/project shell | Landing/menu; new/open project; resume lookup; native recent/save menus; five-stage rail and shared status/console/theme controls | `wwwroot/index.html`, `menu.html`, `js/progressSidebar.js`, `js/statusBar.js`; Eto `MainForm.cs` |
| Geospatial preparation | Upload/fuse data, inspect intermediate working collections, compulsory schema match, geometry preprocessing, inspect prepared footprints | `wwwroot/workflow-pages/setup/`; `Controllers/{Fusion,SchemaMatching,GeometricPreprocessing}Controller.cs` |
| Building downloader | Map, region selection, dataset/layer controls, extraction/download/DataHub paths | `wwwroot/buildingDownloader.html`, `js/buildingDownloader.js` |
| Spatial preview | Layers, data-driven styling, map/extrusions, searchable datasets, paged attribute table and visible-column controls | `wwwroot/geoDataPreview.html`, `js/geoDataPreview.js` |
| Schema matching | Compulsory/override/optional/custom rule tabs; optional categories by building/system concern; map, histogram/donut controls, custom logic and DataHub dialogs | `wwwroot/schemaMatching.html`, `js/schemaMatching.js` |
| Archetypes | Load libraries; construction/systems/space-load/external-load categories; library/detail surface | `wwwroot/archetypeEditor.html`, `js/archetypeEditor.js`, `workflow-pages/model/` |
| Archetype assignment | Ordered rules, assignment controls, feature grouping, map/statistical feedback, saved output | `wwwroot/templateAssignment.html`, `js/templateAssignment.js` |
| Baseline simulation | Feature collection, EPW weather, scenario, parallelism/chunk size; log/progress/charts; validation errors from run API | `wwwroot/runSimulation.html:108`, `js/runSimulation.js`; `Controllers/SimulationController.cs` |
| Calibration | Workflow page explains calibration is unimplemented, yet Next posts `complete` and opens a page called Calibrated Baseline | `wwwroot/workflow-pages/simulation/calibrate-baseline.html:28`, `:53` |
| Measures/scenarios | Envelope/heating/cooling/hot-water/plug/gas/PV categories; scenario library, editable/reorderable rules, priority, map/grouped views, saved panel split | `wwwroot/measureEditor.html`, `scenarioDesigner.html`, `js/scenarioDesigner.js:1085` |
| Results | Energy/CO2 modes; scenario selection, summary deltas, emissions projection, map with footprint/tract/block-group/block levels, treemap, Sankey, histogram, settings dialog | `wwwroot/resultViewer.html:37`, `js/resultViewer.js`, `config/resultViewerDashboards.json` |
| Adoption scenario exploration | Penetration-rate and seed controls, metric styling, map/chart result layout | `wwwroot/capResultViewer.html`, `js/capResultViewer.js`; `Services/Cap/` |
| General tools/jobs | Job listing, generated job input surface, live console/progress and charts; separate server and GUI job registries | `wwwroot/{jobList,jobRunner,job}.html`, `Jobs/`, `Runtime/`, `Hubs/` |

The Site → Buildings → Zones → Surfaces hierarchy in the new handoff is a possible future product structure, not a confirmed existing hierarchy browser in this audited UI. Zone calibration APIs exist, but do not establish a completed urban-baseline calibration workflow.

### Intentional patterns worth preserving

- **Steps produce inspectable artifacts.** Data preparation is explained through intermediate collections, not only a success toast. This can become readiness and provenance in the new product.
- **Map and analytical views share selection context.** `js/resultViewer.js:1029` retains intersecting selected feature IDs across scenarios; selected IDs and metric/index settings feed visual updates. A useful comparison foundation, with the empty-intersection policy needing redesign (see below).
- **Editable rules plus visible effects.** Assignment and scenario tools make repeatable bulk decisions accessible manually, with grouping/map feedback.
- **Progressive disclosure.** Tabs, per-widget settings, collapsible rail/console, optional schema groups, and intermediate artifact pages separate concerns.
- **Adjustable density.** ScenarioDesigner contains persisted split sizing and reorderable rules. Retain user control while providing stable, intentional default layouts.
- **Long work remains visible.** Run logs, progress, charts, and shared status are important for simulation tasks that outlive a single click.

## 3. Visual language and interaction quality

Observed CSS conventions: dark black/charcoal base (`#000000`, `#1a1a1a`, `#2a2a2a`), pale gray text, blue accents (`#003978`, `#4da3ff`), red/error and amber warning colors, plus `[data-theme="light"]` overrides. Roboto Flex uses wide display headings and very light body weight (200); console uses Cascadia/Consolas. The spacing scale starts at 4/8/16 px, corners at 4/8 px. SVG icon masks and sidebar icons carry much of the chrome. Evidence: `wwwroot/css/main.css:3` onward and `images/sidebar`, `images/icon-library` paths.

Two layout families coexist: generous centered workflow/menu pages and dense multi-column tool/results pages. Shared floating panels are typically 300–400 px wide; results uses dedicated columns and proportional chart cells. The native window opens at 1920×1080 with a 1280×800 minimum (`MainForm.cs:82`). Responsive CSS exists, but it does not establish that all dense tools work at smaller widths.

Interpretation: retain the restrained technical identity and analytical density; prototype stronger text weight, clearer focus/selection, consistent panel ownership, and fewer oversized transitions between setup and tools. Do not equate the current stylesheet with a validated accessible design system.

Specific limitations observed in source:

- ScenarioDesigner split controls use `mousedown`/`mousemove` and div handles; the sampled split implementation has no keyboard-resize path (`js/scenarioDesigner.js:1085`). Other text inputs have key handlers, so this is a specific gap, not a claim that the entire UI lacks keyboard support.
- Status enum has no failed/blocked/stale state (`Models/ProjectData.cs:10`); errors exist in job/run surfaces but are not equivalent to durable workflow readiness.
- Calibration's Next marks unimplemented work complete; its fetch also does not inspect `response.ok` before navigation. This is a source-level integrity issue even though the text admits the limitation.
- Result scenario changes select all new IDs when the previous selection has no overlap (`js/resultViewer.js:1050`). Avoid silently broadening a comparison cohort.
- The rail includes a Properties button whose click handler returns without an action (`js/progressSidebar.js`, `init`). `menu.html` contains a Library link to `#`. Prototype controls should either work or explicitly explain unavailability.

## 4. Active, legacy, and generated distinctions

| Classification | Finding |
| --- | --- |
| Main reachable source paths | `index.html`/`menu.html`, current rail workflow pages, assignment/scenario/run/result/CAP tools. Classification is based on entry points and links, not execution coverage. |
| Legacy but still reachable | `menuOld.html` is a native Tools menu destination (`MainForm.cs:285`, `:383`); it links `resultViewerLegacy.html`. Do not assume filenames containing Old/Legacy mean unused. |
| Older alternatives | `runSimulationOld.html` plus corresponding JS/CSS coexist with the current runner. Not linked by the current rail; runtime usage outside sampled navigation remains unresolved. |
| Retired-looking workflow material | `workflow-pages/setup/_bin/` holds older download/LiDAR/parcel steps; absent from the current rail. Treat as historical clues, not guaranteed dead code. |
| Incomplete surfaces | Calibration page and `workflow-pages/retrofit-scenarios/scenario-results.html` explicitly identify unimplemented behavior. The latter does not negate the separate functional result-viewer source. |
| Generated/runtime output | .NET build output and desktop content copies are not the authoritative frontend source. Project.json, uploads, caches, and simulation artifacts are runtime data; no essential experiment data is taken from them. |
| Documentation | `Planning/` and README are useful historical intent; runtime source wins when they disagree. |

Maintainability risks are visible without a runtime benchmark: page scripts mix data access, state, event wiring, layout, and charts; several exceed thousands of non-empty lines (geoDataPreview about 4,550, templateAssignment 3,394, resultViewer 2,690 in this snapshot). The rail additionally restructures some workflow DOM at load time. These are coordination costs for a solo maintainer, not proof that a framework alone would fix them.

## 5. Reuse assessment

| Finding | Classification | New-experiment implication |
| --- | --- | --- |
| Workflow steps and explicit intermediate artifacts | Retain as a product idea | Expose inputs, readiness, outputs, and a path back to revise assumptions. |
| Linked map/selection/charts | Retain as a product idea | One explicit selected cohort, with visible scope and metric units. |
| Rule-driven archetype/scenario editing | Retain as a product idea | Manual commands should also be callable by future agents. |
| Resizable panels, settings, category tabs | Adapt | Bounded layout presets and keyboard-accessible resizing; preserve selection on navigation. |
| Status bar and live job log | Adapt | Persistent run drawer with typed progress/errors and recoverable terminal states. |
| DataHub and artifact pages | Adapt | A project asset library with provenance and schema summaries, decoupled from server file paths. |
| Dark palette, blue accents, SVG icon language | Reference visually only | Original styling/assets need not be copied; test readable weights and contrast. |
| Eto shell and native pickers | Unresolved | Valuable for local file/simulation workflows; browser-first experiments can keep a host adapter for later embedding. |
| Centered setup pages versus dense workspace | Unresolved | Compare guided flow with persistent context before committing. |
| Global current project and cross-page storage | Do not carry forward | Explicit project-scoped state and operations; avoid accidental project/cohort leakage. |
| Completion of unimplemented calibration | Do not carry forward | Distinguish skipped, unavailable, failed, blocked, and stale from complete. |
| DOM rewriting, duplicate legacy tool variants, floating CDN versions | Do not carry forward | Explicit components/routes and pinned dependencies; retain history in docs rather than parallel product copies. |
| Raw engineering property strings in chart configuration | Adapt | Separate stable metric IDs from display names, units, aggregation, and provenance. |

## 6. Discussion handoff

See [UI directions](ui-directions.md) for three grounded product approaches, technical tradeoffs, the recommendation, and the two decisions needed next. The audit favors preserving workflow/artifact meaning and coordinated analysis while replacing fragmented state and misleading completion semantics.

Next: discuss the experience to test and the initial technical lane. Record the user's conclusion in a dated decision record before beginning the primary prototype. Runtime screenshots, real engineering validation, reference-code reuse, and live backend integration remain outside this completed source audit.
