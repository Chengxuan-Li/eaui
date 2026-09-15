# 0008: FlexLayout replaces dockview for docking

Date: 2026-09-14

Status: accepted by the user after the package spikes. Supersedes the docking choice in [decision 0007](0007-package-selection.md).

## Context

Decision 0007 selected dockview's free core and required spikes before panel work, with flexlayout-react as the fallback if keyboard resizing or focus failed. The [spike results](../package-selection.md#spike-results-2026-09-14) showed:

- **dockview 8.3.1 free core:** keyboard navigation requires a commercial enterprise module, and its sashes offer no keyboard resizing.
- **flexlayout-react 0.11.0:** met every docking requirement tested, including keyboard splitter resizing, ARIA tabs and separators, remappable tabset focus navigation, mounted hidden tabs, and JSON layouts with borders.

## Decision

- Use flexlayout-react 0.11.0 (MIT) as the docking library, pinned to that exact version as a runtime dependency.
- Remove dockview-react and the dockview spike. Keep the FlexLayout spike tests as the docking regression baseline until the product workbench replaces them.

## Consequences

- **Pre-1.0 versioning.** Upgrades may break the API, so every layout change goes through our typed layout commands rather than direct calls scattered through components.
- **Mounted panels.** Panels that must keep state (map, charts) render with `enableRenderOnDemand: false`, set globally through `tabEnableRenderOnDemand` or per tab.
- **Side panels.** The left and right panels of [decision 0004](0004-workbench-layout-and-docking.md) are FlexLayout borders. At narrow widths, borders can switch to overlay mode (`Actions.setBorderType`), which supports decision 0004's narrow-width proposal.
- **Keyboard docking.** Moving a tab to another tabset from the keyboard is not a documented FlexLayout feature. The command palette provides it through `Actions.moveNode`.
- **Shortcuts and theming.**
  - Tabset focus shortcuts are configured through the `keyMap` prop; final bindings are chosen with the ribbon's command shortcuts.
  - FlexLayout themes are overridden through `--flexlayout-*` variables mapped to our design tokens, which must also resolve the color-contrast findings from the spike.
