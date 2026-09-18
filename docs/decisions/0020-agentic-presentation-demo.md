# 0020: A language model drives presentation, styling, and layout

Date: 2026-09-18

Status: accepted by the user on 2026-09-18, who settled the scope in discussion: no backend, a real model in the loop, fictional data, and an agent limited to what the browser owns.

## Context

[Decision 0006](0006-scripted-agent-and-layout-details.md) put a scripted player behind an `AgentAdapter` so a real provider could replace it, and [decision 0016](0016-reasoning-and-inspection-panels.md) made the approval gate and the permission modes real. What the agent could actually reach had not kept up: it could call sixteen commands, eighteen view operations, and three layout operations, but it could not switch appearance, show a panel, maximize a tab group, or **read anything at all**. It acted blind and write-only, which a script can get away with and a model cannot.

The user asked where state and saved information should live once a real agent is in the loop, given no backend, and then answered the architectural question directly: the analysis and reasoning of a full product would need a Python backend, but **this demo should not have one**. It should showcase agentic control of UI presentation, styling, and layout through pure front-end operations, over fictional data, with several datasets showing different capabilities.

## Decision

- **Scope.** The model-driven agent changes presentation, styling, layout, and selection. It cannot run a stage, apply an edit, or create a measure or scenario. The catalog it is offered describes that limit and `toolDispatch.ts` enforces it, so a command outside the presentation set is refused even when the model names it exactly.
- **The key never reaches the browser.** Vite exposes only `VITE_`-prefixed variables, and a static deployment cannot hold a credential at all. The key stays in Node and a dev-server middleware proxies `/api/llm`. It applies to the dev server only, so `vite preview` and a built bundle behave exactly like GitHub Pages: no route, model unavailable, scripted agent. This is the one place the "no backend" rule bends, and only to the dev server the developer already runs; nothing is deployed or hosted.
- **The scripted player stays** as the default, the offline path, and the deterministic test fixture. The model is chosen from the composer's model menu, which was a disclosure-only control and is now live.
- **The model never sees the project.** It receives a bounded digest: counts, stage states, which metrics have data and what would have to run for the rest, view state, layout, appearance, and selection. Footprints and per-building results are never sent. The digest costs the same context for 2000 buildings as for 3.
- **Read tools.** `read.context` returns the digest and `read.buildings` returns at most 50 rows. Reads change nothing and are not logged, because a look is not an operation.
- **`layout.reset` waits for approval.** It is the one presentation call that does: it discards an arrangement the user built, and no undo covers layout. Every other presentation call runs freely, which is the point of the demo.
- **Four fictional districts**, each a different place at a different point in the workflow with different result data and its own questions: Boston Back Bay with nothing run, Barcelona Eixample with a baseline and shading skipped, Amsterdam Jordaan with a retrofit scenario modelled, and Manhattan Murray Hill with PV estimated and grid modelling failed. A dataset is a **recipe, not a stored state blob**: opening one replays real commands, so it can only be a state the workflow could have reached by hand.
- **The conversation survives a reload.** With no backend, re-sending a stored conversation is the whole of remembering, so the transcript and the model's own input stream are saved together and the agent genuinely continues. View state and the chosen model persist beside them.

## Rationale

- Python is right for agentic data analysis and wrong for UI updates. The server has no stake in whether the map is in 3D, and a round trip per interaction would ruin a dense desktop workbench. The existing split between view operations and commands is already the right client/server line, so this demo takes the browser half and leaves the other half undecided.
- The scripted player is deterministic, which is why its tests can assert behaviour. A model is not, so it goes behind the same seam and CI never calls a provider.
- The approval gate was already real. Limiting the model to presentation makes most of it dormant, so the line was redrawn at the one presentation act that destroys something.

## Alternatives

- **`VITE_OPENAI_API_KEY`**: rejected. One line, and the key ships inside the published JavaScript the moment anyone runs the deploy.
- **A key entered in Settings (BYOK)**: not built. The user said the agent is tested locally only, so the dev-server proxy is enough and holds the key more safely. It remains the option if the published demo ever needs the live agent.
- **A proxy service**: rejected with the backend.
- **Streaming**: not built. The tool loop pushes each call into the transcript as it happens, so the panel fills progressively without token-level streaming.
- **A dataset as a stored state blob**: rejected. A recipe cannot encode a state the app could not reach, and it keeps the fixtures small.

## Consequences

- `describeAgentTools('presentation')` and `describeAgentTools()` are different catalogs. The scripted sessions keep the full one, including the model-change session decision 0016 tested.
- The scripted `restore` session now pauses for approval, because `layout.reset` asks. Its unit test and `e2e/agent.spec.ts` approve it.
- Appearance moved out of React into a logged controller beside layout and the view store, so the agent drives it through the path a person uses.
- Building geometry became a swappable district. The map's sun and first view follow the project's own place, and the weather is named after the district.
- `LAYOUT_KEY` is unchanged; the new keys are `eaui.view.v1`, `eaui.agent.<id>.v1`, and `eaui.agent.model`.
- Saved projects do not record which district produced them. A restored project keeps its own buildings and location, so only a fresh Location setup run would use whichever district is current.

## Findings

Verified against the configured model on 2026-09-18, and worth recording because none of it is guessable:

- **Tool names cannot contain a dot.** The provider requires `^[a-zA-Z0-9_-]+$`, and every operation in this app is named `appearance.set`, `layout.setPanel`, and so on. They map to `__` on the wire and back; the mapping is reversible because no operation name contains a double underscore. The first probe failed on exactly this.
- **The Responses API takes flat tool definitions** — `{type: 'function', name, description, parameters}`, not nested under `function` — and answers with `output` items of type `function_call` (with `call_id`, `name`, and `arguments` as a JSON string) or `message` (whose text is in `content[].text`). A tool result is fed back as the `function_call` item followed by `{type: 'function_call_output', call_id, output}`.
- **`gpt-5.6-luna` is not in the `/models` listing** but answers on both APIs. `/chat/completions` rejects `max_tokens` and wants `max_completion_tokens`; `/responses` needed no such adjustment, so the transport uses it.
- **The public Overpass instance rate-limits a burst of extracts** with 429 and sometimes answers 504 while busy, so the fixture script waits and retries.
- **The model narrows a query it was not asked to narrow.** "The five tallest buildings" came back filtered to mixed-use, and neither a sharper tool description nor an explicit instruction stopped it. The transcript discloses it — "Read 5 of 25 matching buildings (529 in the project)" — so the behaviour is visible rather than silent, and it is recorded here as a limit of a nondeterministic caller rather than hidden.

## Verification (2026-09-18)

Node.js 24.21.0 and Microsoft Edge with 4 workers, on the `C:/Users/cl2749/Documents/GitHub/energyatlas-ui` checkout.

- `npm run typecheck`, `npm run lint`, and `npm run format:check` pass.
- `npm test`: 235 tests in 26 files pass, including the digest bound, the dispatch boundary refusing every model-changing command by name, the tool loop against a fake transport (turn limit, declined approval fed back, bad tool name, transport failure, plan and bypass modes), the four dataset recipes, and view and conversation persistence.
- `npm run test:e2e`: 60 tests pass in about 1.2 minutes, including the live-agent flows against a stubbed provider route, dataset switching, and reload persistence. The shared fixture reports the model unavailable by default, so no spec can reach a provider and the suite does not depend on whether the machine has a key.
- `npm run test:e2e:preview`: 2 tests pass against the built bundle, one of which asserts that it has no `/api/llm` route, offers the model as unavailable, and carries no key in any shipped chunk.
- **Against the real model**, by hand: switching appearance and placing pages; answering "why is there no PV yield?" on Eixample with the actual reason and what would have to run; reading the grid failure on Murray Hill; and selecting, colouring, and zooming in 3D. Screenshots reviewed at 1600x1000 in Light and Dark engineering.
- Not verified: the published bundle with a model (there is none by design), streaming, and any provider other than the configured one.
