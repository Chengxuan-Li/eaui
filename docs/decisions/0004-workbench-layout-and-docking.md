# 0004: Workbench layout with full docking

Date: 2026-09-14

Status: accepted by the user in discussion. Replaces the shell layout first proposed in the [first-slice proposal](../first-slice-proposal.md); refines the panel list in [decision 0003](0003-combined-product-shell.md).

## Decision

The application window is a vertical grid of exactly three rows:

1. **Top ribbon**, in the spirit of Visual Studio Code: menus, dropdowns, save, search, run, layout changes, full screen, comments, and similar global commands.
2. **Main area**: all page content. It is a docking workspace that the user can split into further sections interactively, as in Visual Studio Code.
3. **Bottom status bar**: open project, status, computing resources, issues, notices, messages, and progress bars for background tasks.

The default arrangement of the main area is four columns:

```text
+----------------------------------------------------------------------------+
| Top ribbon: menus, dropdowns, save, search, run, layout, full screen, ...  |
+------+-------------+-------------------------------------+-----------------+
| Side | Left panel  | Middle window                       | Right panel     |
| bar  |  Asset      |  [Map] [Table] [Dashboard]          |  Agentic        |
|      |  manager    |  [Roadmap] [Creator] [Settings]     |  reasoning      |
|      |  Workflow   |                                     |  and chat       |
|      |  ...        |  active page                        |                 |
+------+-------------+-------------------------------------+-----------------+
| Status bar: project, status, compute, issues, notices, messages, tasks     |
+----------------------------------------------------------------------------+
```

- Pages (map, table, dashboard, roadmap, creator, settings) are paginated inside the middle window. They sit parallel to the left and right panels and never enclose them.
- The left panel holds the asset manager, the workflow, and other navigation views.
- The right panel holds the agentic reasoning panel with the chat.
- Regions are mutable: panels resize and collapse, and full drag-and-drop docking is required from the start rather than deferred.

## Rationale

The user wants a familiar, dense workbench where project navigation, content, and agent activity are simultaneously visible, and where users can rearrange the workspace for their task.

## Consequences

- The docking library is a first-order package decision. It must support tabs, splits, drag-and-drop, collapse, and a serializable layout (layouts are future View assets).
- Repository rules require keyboard operation, so every drag-and-drop docking action needs a keyboard or command equivalent (move a tab to a region, resize, focus the next region, restore the default layout). Evaluate candidate libraries against this.
- Global status and background progress belong in the status bar, not in the reasoning panel.
- The "map panel" in decision 0003 is realized as the Map page, which docking lets the user place in any region.
- Narrow-width behavior with a docked layout must be designed explicitly (proposal: collapse side regions to overlays).
