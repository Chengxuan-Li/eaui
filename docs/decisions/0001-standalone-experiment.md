# 0001: Standalone experiment and reference boundary

Date: 2026-09-13  
Status: accepted by the launch request and source handoff.

## Context and decision

Initialize this experiment in `C:/github/eaui`. Use the working label Product UI Experiment; defer final naming. Keep it separate from `json-render-playground` and from the existing simulation repository.

Inspect `C:/github/RCEnergySimulator` as view-only, focusing on `EnergyAtlasWeb`; use `EnergyAtlasDesktopEto` to understand native hosting. No source or asset reuse has been authorized. The handoff already exists at its required `docs/20260913_product-ui-experiment-agent-handoff.md` destination and is retained byte-for-byte.

Complete reversible setup and an evidence-based audit, then discuss two or three directions before selecting the frontend stack, architecture, and first primary prototype slice. No extra workflow tooling is a prerequisite.

## Rationale and consequences

This preserves the ability to explore a coherent product UI without inheriting the reference's implementation constraints. The reference supplies product evidence; Eto, a web view, plain JavaScript, and other options remain candidates rather than commitments. A frontend scaffold, live API integration, and production migration are deferred until discussion resolves the relevant choices.

Verification of the original handoff uses SHA-256 `F75FFB0B41B66E7D0AE3AFD0ADB7F5A24AFB214E65779CB24A47E01860E202F2`.
