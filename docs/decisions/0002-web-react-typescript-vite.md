# 0002: Web-only UI with React, TypeScript, and Vite

Date: 2026-09-14  
Status: accepted by the user in discussion.

## Context

The [UI directions](../ui-directions.md) compared React/TypeScript/Vite, plain TypeScript modules, and Blazor (WebAssembly, later also Hybrid). The reference UI is plain HTML/JS served by ASP.NET Core and hosted in an Eto/WPF WebView ([audit](../reference-ui-audit.md)).

## Decision

- UI code is entirely web technology. Blazor (WebAssembly or Hybrid) and WPF/native UI are excluded from this experiment.
- The UI stack is React + TypeScript, built with Vite.

## Rationale

The user does not need C# ownership of UI code or first-prototype hosting inside Eto. React/TypeScript gives a common component model for a shared shell, explicit state, and linked map/table/chart views, and JavaScript visualization libraries integrate without a cross-runtime boundary.

## Not decided by this record

- Product direction and first vertical slice.
- Whether a native shell later hosts the built web bundle; this record only constrains the UI code.
- Routing, state, map, chart, table, layout, styling, and test packages, and exact versions. Choose them when the slice makes needs concrete.
- Operation-contract authorship. Proposal remains: serializable command/result contracts written in TypeScript first, shaped like future HTTP endpoints, backed by deterministic fixtures behind an adapter.

## Consequences

The primary prototype still waits for the product-direction choice. When scaffolding starts, update `AGENTS.md`, `README.md`, and `.gitignore` with verified commands and generated-artifact rules.
