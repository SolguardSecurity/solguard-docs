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
- MAP collection coverage is mode/language complete: 35 base producer receipts
  in `fast`, 42 in `deep`, plus activated language-conditional producers; source
  scope is package-directory aware for Go and file/component aware elsewhere,
  receiver type environments stay caller-local, declaration pseudo-calls are
  excluded and real recursion is preserved
- DISCOVER deduplicates `RuleDraft` identities before enrichment, binds rules
  and route scope only through exact location/symbol/route/state/flow/endpoint
  anchors, never through family vocabulary alone, and preserves the critical
  `rules -> gaps -> hypotheses -> optional enrichment` order; bounded unknown
  totals use `lower_bound` and deadline-skipped stages use `not_started`
- DISCOVER reports each MAP coverage status independently: `complete` only for
  a present debt-free ledger, `coverage_debt` for a present ledger with debt,
  and `unknown` when the corresponding ledger is absent; this status does not
  claim complete bug coverage or overall DISCOVER health
- the directed Optimism MAP/DISCOVER run is contract diagnostics only: MAP
  `e4c290b3ccd7925ab1316b7979489d309d3a28fa250739a8716d669b575b70b6`
  has 119,784,018 bytes; final-r2 binds DISCOVER binary
  `DE3C09078ACF8822800EFE51919F07609BA72CE7255BAB01F5BFD7E46BFED363`,
  protocol model
  `EE0B843CC92C7611EAE3B510CB35B3BB0937980E8F557DC0DE1F4A098D42206C`
  and index
  `2D616D703C06B9E70B2022EBB61C3D8665B71319E00C9FEE09BF578A14B62A3A`
- that directed runtime changed from 180,303 to 23,882 ms with no deadline
  interruption; collection coverage is `coverage_debt` with 19 debts, economic
  coverage is `complete` with zero debt, 450 rules, 300/445 gaps, 120/300
  hypotheses and 113,594 omitted semantics remain; this is not recall,
  precision or generalization evidence
- `trace.actor_authorization_binding.v1` coverage through violated-only
  DISCOVER admission, typed `permission_freshness` materialization and exact
  VALIDATE scope reconciliation, including source-intent oracle exclusions
- suite-scoped known-regression recall may be reported only with the exact run,
  denominator and operational-health scope; no global recall, improvement,
  precision or generalization claim is allowed without comparable signed reruns,
  and blind claims additionally require an independent sealed holdout
- phase-1 measurement docs must distinguish the signed pre-run precommit and
  signed core-bound known-regression baseline, finding-level loss ledger,
  create-only signed command-receipt chain over a declared evidence scope,
  separate signed failure receipts whose roots cannot continue or be reused,
  partial diagnostics that cannot authorize finalize/verify, telemetry v2 with
  explicit unavailable host/GPU/Ollama observations,
  separately verified historical present/absent artifact manifest, recomputable
  exact core commit/tree binding for all nine collections,
  declared-finding end-to-end versus static-scoreable recall and metric comparability
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
