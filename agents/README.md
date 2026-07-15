<!-- generated-by: solguard-agents/scripts/install-repo-agents.ps1 -->
# solguard-docs Agent Guide

Central context from repo root: `../solguard-agents/PROJECT_CONTEXT.md`

## Mission

Document product behavior, tools, architecture, releases, labs and user-facing workflows.

## Primary Role

- `docs-worker`

## Owns

- docs
- release notes
- architecture explanations
- user workflows

## Out Of Scope

- product code
- invented benchmark claims
- undocumented behavior claims

## Upstream

- `all product repos`

## Downstream

- none

## Contracts

- `documentation truthfulness`
- `DISCOVER model packs v2 and candidate_value technical contract coverage`
- `no recall or generalization claim without measured 90-lab and independent holdout reruns`

## Quick Checks

Run the relevant subset before handing work back:

```powershell
git diff --check
```

## Parallel Work Rules

- Keep changes inside assigned ownership.
- Do not change JSON/API/schema contracts unless the task explicitly says so.
- If a contract must change, stop and request/assign a Contract Reviewer.
- List changed files and commands run in the final report.
- Do not revert edits from other agents.

## Final Report

```text
Changed files:
Contract/API/schema changes:
Commands run:
Commands not run:
Risks/follow-ups:
```
