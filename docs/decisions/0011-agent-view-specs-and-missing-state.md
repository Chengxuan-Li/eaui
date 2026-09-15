# 0011: Agent chart specs and missing project state

Date: 2026-09-15

Status: accepted by the user when starting first-slice stage 4. Resolves open questions 3 and 4 of the [stage 4 next steps](../first-slice-proposal.md#next-steps).

## Context

[Decision 0006](0006-scripted-agent-and-layout-details.md) asks for a scripted agent whose sessions use realistic tool calls, including creating a chart or view, and for chart definitions that are declarative and serializable. Two questions were left open: how the agent adds a dashboard chart, and how a scripted session reacts when the project lacks the state its script needs, such as a baseline.

## Decision

- **Charts the agent adds are validated view specifications.** A small zod schema describes a chart (kind, measure, series). The Dashboard compiles a valid specification to ECharts options and renders it with a data table. The narrower alternative, toggling which series the existing charts compare, was not chosen.
- **Missing project state is explained, then offered as one approval.** A session that needs state the project does not have pauses, explains what is missing, and proposes running the missing stages as a single approval. Approving runs them in workflow order through the shared commands with source `agent`, and the session continues. Declining ends the session with an explanation. The alternative, stopping so the user runs the stages and restarts the session, was not chosen.
- **Branch.** Stage 4 and later agentic features are implemented on the `feature/agentic` branch created by the user.

## Consequences

- Added charts are view state, recorded in the operation log but not saved with the project. They can later become View assets.
- Map, table, and dashboard view state moves into logged view operations, so the agent and manual controls share one path (stage 4 prerequisite 1).
- A stage that fails during an approved run ends the session with the stage's own failure message; the session does not retry silently.
- Implementation interpretation, not separately decided: agent tool calls that run stages or change the project model wait for approval, while layout, view, selection, and context-mode tool calls run directly and are logged.
