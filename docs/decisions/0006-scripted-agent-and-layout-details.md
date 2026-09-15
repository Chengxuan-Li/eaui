# 0006: Scripted agent with realistic tool calls; confirmed layout details

Date: 2026-09-14

Status: accepted by the user in discussion. Resolves the open questions left by [decision 0005](0005-first-slice-workflow-and-panel-scope.md) and the layout interpretations in the [first-slice proposal](../first-slice-proposal.md).

## Decision

**Agent in the first slice.** No model provider or credentials. The agent is scripted and deterministic, and its sessions use realistic tool calls over synthetic data, including:

- **UI restructuring:** for example opening, moving, or splitting tabs and panels and changing the layout;
- **data representation:** for example coloring the map by a metric, filtering a table, or creating a chart or view.

The reasoning panel shows these sessions as the agent's tool calls, reasoning, actions, and referenced links. They are labeled as simulated.

**Confirmed layout details** (within [decision 0004](0004-workbench-layout-and-docking.md)):

- The side bar is an icon strip that switches the left panel between views.
- Roadmap and Dashboard are separate tabs.
- Issue and background-task items in the status bar open detail tabs in the middle window.

## Consequences

- Layout and view changes must be operations the agent can invoke, not only mouse interactions. Layout state stays separate from project state but uses the same command mechanism and appears in the operation log.
- The docking library needs a complete programmatic API, and chart/view definitions should be declarative, serializable specifications that the agent can create and that can later become View assets.
- The scripted agent sits behind an agent adapter so a real model provider can replace it later. No environment variables are added now.
