# 0016: Independent Reasoning and Inspection panels, with agent send and permission modes

Date: 2026-09-15

Status: accepted by the user on 2026-09-15, who chose two independent panels over two tabs on one surface, and chose to make the permission modes real rather than disclosed as planned.

## Context

The right-side surface held one Context panel with a segmented **Reasoning | Inspection** switch, built in the design alignment pass from section 10 of the [UI design guidelines](../20260915_energyatlas_ui_design_guidelines.md) ([decision 0009](0009-ui-design-guidelines.md)). Working in it showed two problems the switch causes:

- reading the agent's reasoning and inspecting the object it acted on are the same task, but the switch makes them alternatives;
- the Reasoning composer was a single-line field with one Send button, so there was no way to say _when_ a message should reach the agent or _how much_ the agent may do without asking, even though the approval gate that would answer the second question already exists.

The user asked for both, listing the composer in detail: an expandable input, an Enter-icon send control with a mode menu, controls below the box for attachments, permissions, and model choice, and prepared sessions replaced by suggestions drawn from the conversation.

## Decision

- **Two independent panels.** Reasoning and Inspection are separate entries in `PANELS`, each with its own Panels menu entry, its own toggle, and its own tab, dockable anywhere in the workbench. Reasoning keeps the `panel.reasoning` component id so saved layouts still restore; Inspection is the new `panel.inspection`. `LAYOUT_KEY` moves to `eaui.layout.v2`, because a v1 layout has no Inspection tab.
- **This supersedes the last clause of section 10 of the guidelines** ("These two modes should share the same contextual surface rather than competing as separate permanent panels") and the matching consequence of [decision 0009](0009-ui-design-guidelines.md). The guidelines document itself is the user's, so it is left unchanged; this record is the amendment. Both panels still default to the right border, so the shared surface stays the starting point.
- **The `context.setMode` view operation is removed**, with the `ContextMode` type and `ViewState.context`. Which panel is shown is layout state, so it goes through `layout.togglePanel`, which is already logged. `showInspection` opens the Inspection panel.
- **Send modes** decide when a typed message reaches the agent: **Send message** needs an idle agent, **Queue message** waits for the current session to end, and **Stir** reaches a running session. A stirred message is recorded in the transcript immediately and answered when the session ends, because a scripted session cannot change course; this is disclosed as the `agent.steering` capability. Stopping a session discards queued messages.
- **Permission modes** act on the approval gate that already guards stage runs and project model changes:
  - **Ask for approval** — every stage run and model change waits for the user. This is the default and the previous behavior.
  - **Automatic** — stage runs are approved without asking; project model changes still wait. A call built at run time counts as a model change, because its type is not known until it runs.
  - **Bypass approval** — nothing waits.
  - **Plan** — the agent lists the calls it would make and stops, changing nothing.

  An approval answered by a mode is recorded in the operation log and labeled in the transcript ("Approved by Automatic mode"), so an automatic decision is never silent.
- **Suggested next steps** replace "Prepared sessions". `suggestNextSteps` ranks the prepared sessions by what the conversation has already done and gives each one a reason, so a suggestion says why it is offered now.
- **Attachments and model choice are planned, not silent.** The "+" button and the model selector are present, explain themselves when pressed, and carry the `agent.attachments` and `agent.reasoningEffort` capabilities. This keeps the handoff rule that an unavailable control explains itself rather than doing nothing.

## Rationale

- Inspection is the object context for what Reasoning did. Separate panels let a user watch a session and the object it changed at once, which the switch made impossible.
- The permission modes are worth building only because the approval gate is real. Wiring them to it turns four labels into four observable behaviors that unit tests can assert, instead of decoration.
- "Automatic" draws its line at stage runs because those are simulated computation that can be run again, while a model change edits the project.

## Alternatives

- **Two tabs on one surface** (docked side by side only after a drag): rejected by the user in favor of fully independent panels.
- **Keeping the segmented switch** and only rebuilding the composer: rejected; it leaves the underlying competition between the two modes.
- **Disclosing the permission modes as planned**: rejected by the user; the approval gate already existed, so real behavior cost little more.
- **Five permission modes as listed by the user** ("Ask for approval", "Automatic", "Bypass approval", "Ask", "Plan"): implemented as four. "Ask" and "Ask for approval" describe the same mode, and two menu entries that do the same thing would be a worse control.

## Consequences

- Saved v1 layouts are not restored; the workbench opens with the default layout once after this change.
- Both panels default to the right border, where a border shows one tab at a time. Seeing them side by side means dragging one into the main area or the other side — possible now because they are independent panels, but not the default.
- The right border is no longer a single "Context" tab, so browser specs address `region` names "Reasoning" and "Inspection".
- The transcript region is focusable, because the taller composer makes it scroll (axe `scrollable-region-focusable`).
- Playwright matches accessible names by substring, so the send button and its mode menu ("Send message" and "Send mode: Send message") need `exact: true` in specs.
- A real model provider replacing the scripted adapter inherits the send and permission modes through `AgentAdapter`; it does not inherit the honest limits of `agent.steering`, which exist only because the sessions are scripted.

## Verification (2026-09-15)

Node.js 24 and Microsoft Edge with 4 workers on the `C:/github/eaui` checkout.

- `npm run typecheck`, `npm run lint`, and `npm run format:check` pass.
- `npm test`: 137 tests in 18 files pass, including `src/app/agent/suggestions.test.ts` and the permission-mode and send-mode groups in `src/app/agent/scriptedAgent.test.ts` (Automatic runs stages but still asks for a model change, Bypass applies one, Plan changes nothing, Queue answers after the session, Stir is refused when idle, Stop discards the queue).
- `npm run test:e2e`: 49 tests pass in about 1.1 minutes, including a new `e2e/context.spec.ts` case that closes Reasoning from the Panels menu and leaves Inspection docked.
- Not verified by test: how the two panels look side by side after a manual drag, and the composer at narrow widths.
