# 0007: Package selection for the first slice

Date: 2026-09-14

Status: accepted by the user in discussion.

## Decision

Adopt the recommended column of the [package selection proposal](../package-selection.md), including its constraints:

- **Toolchain:** React 19, Vite 8 with @vitejs/plugin-react, TypeScript pinned to 6.0, Node.js 24 LTS, npm with a tracked lockfile.
- **Docking:** dockview (free MIT core only).
- **Map:** maplibre-gl with @vis.gl/react-maplibre, no basemap by default.
- **Workflow graph:** @xyflow/react with @dagrejs/dagre on the Roadmap page; plain accessible HTML for the compact left-panel view.
- **Table:** AG Grid Community.
- **Charts:** ECharts with modular imports behind an in-house JSON view schema.
- **Contracts, state, UI:**
  - zod contracts and validation;
  - a zustand vanilla store with immer patches (no state-machine or router library in slice 1);
  - react-aria-components primitives, including the command palette;
  - react-markdown with remark-gfm for transcript prose only; lucide-react icons.
- **Styling:** CSS Modules with CSS custom-property tokens.
- **Tests and lint:** Vitest with Testing Library; Playwright with axe; ESLint flat config with typescript-eslint, react-hooks rules, and Prettier (replacing the template's oxlint).

## Consequences

- Exact versions are pinned at installation and recorded by `package.json` and `package-lock.json`.
- The proposal's spikes (dockview keyboard resizing and focus, map/chart survival in docked panels, MapLibre without a basemap, AG Grid in a docked panel, read-only React Flow keyboard navigation) run before panel work. Results are recorded in the proposal.
- If the dockview spike fails on keyboard resizing or focus, flexlayout-react is evaluated before panels are built, and the outcome is recorded as a new decision.
- Adding a package outside this list requires a documented reason in the proposal or a new decision.
