# Product UI Experiment — Agent Handoff

Date: 2026-09-13  
Project context: Agentic UBEM / EnergyAtlas  
Status: initiation brief; product direction and technical architecture are intentionally undecided

## 1. Assignment

Create a new, standalone repository for experimenting with a comprehensive product user interface for an urban/building energy-modeling application.

This is **not** the separate `json-render-playground` experiment. That project investigates natural-language generation and refinement of dashboards from predefined components. The repository described here instead focuses on a more complete, deliberately designed application UI with:

- a coherent, substantially preconfigured information architecture;
- dynamic and adaptable layouts where useful;
- polished product design and visual styling;
- meaningful interactions and application state;
- workflow-oriented, sequential or semi-sequential experiences;
- an interface that remains useful without an AI or agentic layer;
- future compatibility with agent-assisted operations, without making chat the entire product.

The experiment should be informed by an older **RC Energy Modeler** project. That project is believed to be an Eto desktop application that hosts a frontend inside a web view, although its exact frontend stack is not currently known. The old repository is a **reference**, not a codebase that should automatically be copied or modernized.

## 2. Immediate objective

Your first substantive task is to inspect the old RC Energy Modeler repository together with the user and build a grounded understanding of it. The user will provide or identify the reference repository when this task begins.

Before selecting the new frontend stack, committing to an application architecture, or implementing the main prototype:

1. Obtain read access to the reference repository.
2. Audit its relevant UI and integration code.
3. Share your findings with the user in an intelligible, evidence-based summary.
4. Discuss the promising directions and tradeoffs with the user.
5. Wait for that discussion to resolve the initial product and technical direction.

This is a deliberate discussion checkpoint. Repository initialization, documentation, and other reversible setup may proceed before it. Do not begin the main UI implementation merely because you can infer a plausible stack.

If the old repository cannot be accessed or uniquely identified, stop and ask for its exact local path, URL, or `owner/repository` name. Do not silently substitute a similarly named public project.

## 3. Reference-repository audit

Treat the RC Energy Modeler repository as read-only unless the user explicitly changes that scope. Do not make commits, open pull requests, alter branches, or otherwise mutate it.

Inspect enough of the repository to answer the following.

### 3.1 Technical structure

- What languages, frameworks, package managers, and build tools are used?
- How is Eto structured, and how is its web view created and hosted?
- What frontend framework or rendering approach is used inside the web view?
- How do the desktop host, frontend, simulation/model code, and data exchange with one another?
- How are assets, styles, components, application state, and navigation organized?
- What are the actual build and run paths?
- Which parts are active, obsolete, experimental, generated, or duplicated?

Do not identify a stack from one manifest alone. Cross-check manifests, imports, build configuration, entry points, and runtime integration.

### 3.2 Product and visual design

- Inventory the principal screens, panels, workflows, controls, charts, tables, maps, inspectors, and configuration surfaces.
- Identify typography, color, spacing, density, iconography, hierarchy, and layout conventions.
- Identify interaction patterns worth retaining: selection, filtering, progressive disclosure, side panels, resizing, tabs, steppers, contextual actions, validation, loading, errors, and results exploration.
- Distinguish intentional design patterns from accidental legacy behavior.
- Capture screenshots when practical and permitted. Cite file paths for claims about implementation.

### 3.3 Reuse assessment

Classify notable findings into:

- **Retain as a product idea** — valuable interaction or information-design pattern.
- **Adapt** — useful idea that should be redesigned or reimplemented.
- **Reference visually only** — aesthetic cue, not reusable implementation.
- **Do not carry forward** — legacy constraint, confusing interaction, brittle coupling, or obsolete dependency.
- **Unresolved** — requires user judgment or a prototype comparison.

Do not presume that Eto, a desktop shell, or a web view must be used in the new experiment. Conversely, do not discard those options without understanding why they existed.

## 4. Required discussion deliverable

After the audit, present a compact review containing:

1. A repository and stack map.
2. A UI surface and workflow inventory.
3. The most valuable product-design ideas in the reference.
4. The main legacy constraints and risks.
5. A retain/adapt/reject table.
6. Two or three credible directions for the new experiment.
7. Your recommended direction, with concrete reasoning.
8. The smallest set of decisions the user needs to make next.

Where options differ, compare at least:

- product experience and interaction capability;
- fit for dynamic layouts and scientific/engineering visualization;
- maintainability for a largely solo developer using coding agents;
- compatibility with the existing ASP.NET/EnergyAtlas ecosystem;
- ability to run independently with deterministic or mocked data;
- possible future desktop embedding or web deployment;
- testing, packaging, and iteration speed;
- cost of migrating successful experiments into the production application.

Do not turn this checkpoint into a long questionnaire before inspecting the evidence. Investigate first, narrow the real choices, and then discuss them with the user.

## 5. Product principles for the new experiment

Unless changed during discussion, use these principles:

- **Product UI first:** this is a coherent application experience, not a gallery of disconnected components.
- **Workflow-aware:** important tasks may be sequential, semi-sequential, stateful, and revisitable.
- **Manual operation remains first-class:** core workflows must work without LLM access.
- **Agent-compatible, not chat-dependent:** later agents should be able to inspect state, invoke shared application operations, explain proposed changes, and use the same underlying commands as manual controls.
- **Structured state:** UI state, model state, selections, pending edits, validation, and run results should have explicit representations.
- **Provenance-ready:** consequential changes and simulation results should eventually be traceable to inputs, actions, versions, and assumptions.
- **Progressive disclosure:** support serious engineering detail without presenting every parameter simultaneously.
- **Desktop-scale information density:** optimize for technical users and substantial screens while retaining responsive behavior.
- **Prototype honestly:** mocked data and model operations must be clearly identified; do not create a visually complete shell that implies nonexistent engineering behavior.
- **Accessibility and keyboard use:** treat them as architectural concerns, not final polish.

## 6. Likely domain context

The larger product context is EnergyAtlas, an urban building energy modeling system. Its domain may include:

- a hierarchy such as Site → Buildings → Zones → Surfaces;
- building geometry and map/spatial selection;
- constructions, loads, schedules, conditioning systems, and boundary assumptions;
- weather and time-series inputs;
- simulation configuration and execution;
- annual, monthly, daily, hourly, peak, and load-duration results;
- scenario comparison, calibration, demand response, and uncertainty;
- validation, warnings, missing data, and model readiness;
- long-running or parallel simulations and result aggregation.

This list provides context, not a demand to implement all surfaces. Determine one or more representative vertical slices after the reference audit and user discussion.

## 7. Repository initialization

The new repository name is intentionally not fixed by this document. Discuss it with the user or use the name they provide when launching the task.

Once inside the intended empty repository root:

1. Confirm the working directory and inspect existing files before acting.
2. If the directory is not already a Git repository, initialize Git there.
3. Create a suitable `.gitignore` for the chosen stack and local development artifacts.
4. Create a concise root `README.md` describing the experiment, current status, setup, and major commands. Do not pretend undecided architecture is settled.
5. Create a clear root `AGENTS.md` containing the durable operating constraints from this handoff, repository-specific commands as they become known, and pointers to project documentation. Add scoped `AGENTS.md` files in important subdirectories when their instructions materially differ from the repository root.
6. Create `docs/` and copy this handoff into it as `docs/20260913_product-ui-experiment-agent-handoff.md` so that another machine or agent can reconstruct the task without conversation history.
7. Add an indexed exploration document for the reference audit and record important decisions in version-controlled documentation.
8. Create the repository's API-key and environment-variable pattern before the first integration that requires credentials:
   - a Git-controlled template such as `.env.example`, containing variable names and safe placeholder values only;
   - an ignored local counterpart such as `.env.local`, which the user can populate with real keys;
   - explicit `.gitignore` rules covering the local secret file and other likely credential variants;
   - concise setup instructions in the README, without reproducing any secret values.
9. Make focused commits as coherent stages are completed.

The repository must be understandable across machines. Conversation history is not durable project state. Important requirements, findings, decisions, rejected alternatives, run instructions, and next steps belong in indexed, Git-controlled repository documentation. Treat the repository—not any one conversation—as the shared source of truth.

## 8. Agent operating rules

### 8.1 Autonomy

- Automated repository exploration is allowed.
- You may edit files without first proposing every edit.
- You may use normal, non-destructive Git operations autonomously, including initialization, status inspection, adding files, commits, branches, diffs, and logs.
- You may install ordinary project dependencies and run builds, tests, linters, formatters, and local previews when appropriate.
- Prefer steady progress and recorded evidence over repeatedly asking for confirmation.

### 8.2 Discussion boundary

When the user asks a question, requests discussion, challenges a direction, or asks you to compare alternatives, pause the affected implementation work and engage in that discussion. Do not treat a question as permission to continue making the disputed decision in the background.

The audit review described in Section 4 is itself a mandatory discussion checkpoint before the main prototype direction is chosen.

### 8.3 Git safety

No destructive Git operations are allowed. In particular, do not:

- use `git reset --hard`;
- force-push;
- delete branches or tags;
- rewrite published history;
- discard uncommitted user changes;
- use checkout/restore commands in ways that overwrite work;
- remove the repository or broad directory trees;
- bypass safeguards merely to obtain a clean working tree.

If existing changes conflict with the task, preserve them, investigate, and discuss the conflict with the user.

Use conventional commit messages such as:

- `docs(reference): record RC modeler UI audit`
- `chore(repo): initialize UI experiment`
- `feat(workspace): add resizable modeling layout`
- `fix(inspector): preserve selection across navigation`

Commits should be scoped, truthful, and understandable from their messages.

Commit moderately often, aligned with meaningful features, fixes, documentation updates, decisions, and project stages. Avoid both extremes: do not bundle unrelated milestones into a large catch-all commit, and do not create noisy commits for trivial intermediate edits. Before switching machines, users, or major tasks, prefer leaving the repository in a documented, committed state when it is safe to do so.

### 8.4 Commit identity and attribution

Never add the agent, assistant, tool, vendor, or model as an author, co-author, contributor, or attribution in commits or repository files. This includes, without limitation:

- Codex;
- ChatGPT;
- OpenAI model names or versions;
- Claude or Claude Code;
- GPT model names or versions;
- generic statements such as “generated by AI” in commit trailers.

Do not add `Co-authored-by`, `Generated-by`, or similar trailers identifying an AI system. Preserve the repository's existing human Git identity. If no usable commit identity is configured, ask the user rather than inventing one.

### 8.5 Workflow tooling

No Superpowers workflow is required for this repository. Do not add it as a prerequisite or impose its planning gates. Use the repository instructions in `AGENTS.md` and the checkpoints in this handoff.

## 9. Documentation expectations

Maintain at least:

- `README.md` — purpose, status, setup, commands, and navigation;
- `AGENTS.md` — durable agent rules and repository-specific guidance;
- `docs/20260913_product-ui-experiment-agent-handoff.md` — this source brief;
- `docs/reference-ui-audit.md` — evidence from the RC Energy Modeler repository;
- `docs/decisions/` — short architectural/product decision records once decisions are made;
- a documentation index, either in `README.md` or `docs/README.md`.

Write README and AGENTS files for the people and agents who will arrive without this conversation. Keep them concise enough to scan but complete enough to operate the project safely. Update them as commands, structure, constraints, or workflows change; stale instructions are defects.

### 9.1 Conversation-to-repository continuity

After useful user discussions, record durable outcomes locally before they are lost. Capture conclusions and actionable context—not raw transcripts—including:

- requirements and changes in scope;
- decisions and their rationale;
- alternatives rejected or deferred, and why;
- assumptions, constraints, and unresolved questions;
- user feedback that changes product or technical direction;
- current status, verification evidence, and next steps.

Put stable decisions in `docs/decisions/`, ongoing findings in the relevant working document, and short navigation/status updates in the README or documentation index. Date documents or entries when chronology matters. Commit these updates with the feature, fix, or stage they describe, or in a focused documentation commit soon afterward.

### 9.2 Artifacts, data, and secrets

- Track important, reasonably sized artifacts and data needed to understand, reproduce, test, or continue the work across machines.
- Document provenance, schema, generation steps, licensing, and update procedure where relevant.
- Do not rely on untracked local files for essential project knowledge. If a large or restricted artifact cannot be committed, provide a tracked manifest or retrieval/generation instructions and explain the limitation.
- Never commit API keys, tokens, passwords, private certificates, connection strings containing credentials, or other secrets.
- For every required secret-bearing configuration, maintain a tracked template with safe placeholders and a matching ignored local file for real values. Prefer `.env.example` plus `.env.local` unless the chosen stack has a stronger convention.
- The local secret file should exist when setup reaches that stage, but must remain untracked. The user will paste the actual values into it.
- Before every commit, inspect the staged diff for accidental credentials. If a secret is exposed, stop, do not commit it, remove it from the staged content without discarding unrelated work, and tell the user if rotation may be needed.

For the audit, distinguish observed facts from interpretations and recommendations. Reference exact repository paths and, when useful, commits or branch names. Avoid copying confidential implementation or assets into the public experiment unless the user confirms they may be reused.

## 10. Quality and verification

For every implemented vertical slice:

- define what behavior is real, mocked, or deferred;
- include representative empty, loading, success, warning, and error states;
- test critical state transitions and shared operations;
- verify the interface visually at relevant desktop widths;
- check keyboard navigation and basic accessibility;
- avoid placeholder interactions that silently do nothing;
- document run and verification commands;
- commit only after inspecting the diff and running relevant checks.

Do not claim completion merely because a page renders. Evaluate whether the workflow is understandable, stateful behavior is correct, and the experiment answers the decision it was built to test.

## 11. Initial stopping point

The first phase is complete when:

- the new repository is safely initialized;
- durable instructions and documentation exist;
- the reference repository has been inspected without mutation;
- the audit and reuse assessment are documented;
- the agent has presented two or three grounded directions;
- the user and agent are actively discussing which product/technical direction to pursue.

Stop at that discussion checkpoint. Continue into the primary prototype only after the user resolves or explicitly delegates the relevant choices.
