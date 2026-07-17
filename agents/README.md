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
- phase-1 measurement docs must distinguish the signed pre-run precommit and
  signed core-bound known-regression baseline, finding-level loss ledger,
  create-only signed command-receipt chain over a declared evidence scope,
  separately verified historical present/absent artifact manifest, recomputable
  exact core commit/tree binding for all nine collections,
  630-finding end-to-end versus static-scoreable recall and metric comparability
  from blind generalization; unavailable precision, FILTER coverage, recall or
  memory is never zero and macro recall stays null under partial protocol
  coverage
- holdout docs may describe the versioned policy contract and tested commitment
  mechanism, but the policy is not frozen for a real cohort until an external
  custodian publishes its signed commitment; docs cannot claim that a real
  private cohort was sealed, opened or evaluated without that evidence

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
