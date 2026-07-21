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
- MAP treats productive Python as source input through Tree-sitter with an
  explicit regex fallback; Core independently inventories bounded productive
  `.py` files and rejects MAP, TRACE or DISCOVER acceptance when MAP omits one.
  This is an intake-integrity contract, not a Python bug-coverage claim
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
- MAP publishes the closed factorized `economic_route_graph.v1`; TRACE consumes
  target root closures while DISCOVER, ECONOMIC and VALUE consume the full
  graph. Every consumer publishes an exact MAP-digest-bound
  `economic_route_graph_consumption.v1` receipt, including hash-bound oversized
  projections. Coverage omission and semantic over-approximation are never
  relabelled or merged
- oversized MAP, DISCOVER, ECONOMIC, VALUE and INVARIANT primaries use compact
  producer contracts bound to basename, schema, byte count and streamed
  SHA-256. Deploy recomputes each stage-specific semantic projection from the
  primary and requires exact equality with the sidecar; sidecar-only authority,
  an unprojectable primary, malformed/missing/substituted manifests fail closed.
  Strict UTF-8, duplicate-key, trailing/truncated JSON, link/root/physical
  identity and TOCTOU checks are identical below and above 100 MiB. Oversized
  TRACE primaries use the equivalent direct projection and no semantic sidecar
- MAP function resolution is sealed by the complete
  `map_function_identity_manifest.v1` (100000 entries, 24 MiB compact whole
  records). Function/symbol collisions or omissions are debt, and every route
  root must point to the entry fragment whose `symbol_id` equals its own
  `entrypoint_symbol_id`
- TRACE batches use `trace.batch_index.v1` as hash-bound root metadata with
  exact membership and companion closure; only `trace.v0.9` members are
  evidence schemas, while native Vyper evidence remains source-bound and
  path-contained
- the nested current `trace.batch_selection.v3` contract binds the physical MAP
  hash, complete canonical target universe, exact duplicate-collapse ledger,
  total eligible order, complete physical selection and selected source
  SHA-256. `top` bounds only `trace.batch_deep_enrichment.v1`; every primary
  carries an exact deep/compact `trace.batch_target_enrichment.v1` marker and a
  compact omission is bounded non-authoritative metadata, never coverage debt
  or negative evidence. V2 remains readable but diagnostic-only.
  Closed status/reason enums and physical counter reconciliation make partial
  gaps and `empty_allowed` upstream debt consumed by Core, DISCOVER, VALIDATE,
  FILTER and Deploy. Version 1 is diagnostic-only and cannot authorize FILTER
  or a clean release. `target_budget_omitted` is the exact eligible pre/post
  `--top` delta
- a TRACE target resolves first against exact MAP-primary identity including
  component; optional `solguard_map_context` can only corroborate it. FILTER
  evaluates `trace.claim_authority.v1` against both VALIDATE and the linked
  canonical candidate, so candidate TRACE provenance cannot be laundered as
  `none/not_used`. Claimed evidence IDs must occur under the closed
  `trace.evidence_authority_paths.v1` policy in canonical arrays on typed
  actor/authorization, semantic-context, identity, atomicity, finding,
  deep-path, causal, temporal, economic or `evidence_items` paths of that same
  path-and-SHA-bound primary. Top-level/arbitrary aliases, target/path/assembled,
  copied MAP context, claim payloads, free text or another target grant no
  authority. Every `evidence_items[*]` ID is recomputed with the producer's
  `trace.evidence_item.v1` framing over exact target/range and item payload;
  stale or arbitrary reseals are invalid. The bounded inventory caps 250000
  occurrences, 100000 unique IDs, 16 MiB of identity bytes and 2000000 JSON
  nodes; MAY, malformed inventory, budget exhaustion or coverage debt remains
  Review-only. Only `trace-evidence-v1-<64hex>` and `trace-auth-<64hex>` grant
  TRACE authority; copied MAP/source/symbol namespaces stay upstream. Generic
  refs require one path-bound occurrence and duplicate occurrences fail.
  Streaming verifies every lexical parent directory before/after and rejects
  an in-root junction or parent identity drift
- `invariant.bounded_runtime.v1` may retain at most 8,192 source-exact typed
  invariants and 256 MiB of materialized objects from its hash-bound
  `invariant.v0.8` primary. Its `invariant.selection_manifest.v1` is recomputed
  from the physical primary and exact `value/attack_paths.json`; it seals the
  full invariant/relationship inventories, ordered ranking, selected object
  hashes, bounds and anchor accounting. Any omitted anchor occurrence is
  non-authorizing debt. Retained relationships are rehydrated from the primary
  and participate in `retained_objects_verified`; the compact runtime never
  supplies relationship authority itself. Its complete JSON envelope is
  independently capped at 335544320 bytes and must declare exact
  `summary.max_runtime_artifact_bytes`. VALIDATE/FILTER always bind
  `invariants` to the runtime artifact and `invariants:source` to the selected
  primary (equal direct, distinct bounded). Missing, external, symlinked,
  unstable or mismatched source invalidates the input; bounded
  `retained_objects_verified=false` is diagnostic debt/inconclusive and can
  never authorize support, PASS or clean release. The verified retained-ID
  inventory remains separate from materialized objects: false mode requires
  empty invariant/relationship vectors, while true mode requires exact object,
  order, ID and relationship parity
- Core keeps permanent `invariant/` and `invariant-candidate/` roots with
  create-only immutable producer bundles, and seals their choice in exact
  `invariant.selection.v1`. Candidate
  binding, VALIDATE, FILTER, the funnel and `AnalyzeOutputs` must consume the
  same hash-bound selected root; failed refinement preserves the initial bundle
  but must mark CANDIDATES `completed_with_errors`
- Core finalizes canonical candidates before splitting VALIDATE input.
  `validation_candidates.json` is an exact-body canonical subset with only
  `ready_for_validation|lead_promoted_exact|lead_promoted_partial`; every cut
  has one retained `pre_validation_noise_gate` rejection and
  `candidate_review_projection.v1` remains explicitly non-authoritative
- Deploy recomputes canonical, validation-input, cut-ledger and result cohorts
  for v1-v8, labs and scan. Same-ID body drift, review-only admission, naked
  terminal results, missing cuts and oversized unverifiable cohort artifacts
  block measurement integrity. Candidate volume is canonical; verdict volume
  is the actual VALIDATE cohort
- Deploy derives every primary and secondary VALIDATE counter from physical
  result rows, then requires exact parity in the VALIDATE summary, protocol
  records and suite aggregates. All cohort artifacts are root-confined,
  single-link and stable across the bounded read; link, junction, escape or
  TOCTOU authority is measurement-blocking
- post-VALIDATE transport recovery uses the same cohort contract and accepts
  only fresh root-confined link-free physically stable product artifacts whose
  raw validation-candidate SHA-256 is bound by VALIDATE metadata
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
- directed acceptance canaries are exactly `v1:Compound-Finance`, `v1:Monad`,
  `v2:Size`, `v2:LoopFi`, `v4:Morpheus`, `v5:Timeswap`, `v6:Morpheus` and
  `v8:Vyper`; a new full replay root is prepared only after all have clean
  states, `filter_results.json` and passing product health. Monad v1
  uses the complete `code-423n4/2025-09-monad@bcc1592fcf38f47a417190b1ea159934926f1f12`
  contest snapshot, not the isolated C++ component. This is an acceptance
  condition only; docs must not record it as passed without preserved canary
  outputs and gate evidence, and canary success is never release, blind or
  generalization evidence
- authoritative ZIP analysis uses the closed
  `solguard-source-authority-handoff.v1` in all eight benchmark runners, the
  scan-only runner and both lab runners. Raw transport bytes/SHA-256 remain
  transport observations; `solguard-materialized-source-tree.v1` is the common
  semantic source identity and must agree across every declared mirror
- Core keeps an OS-backed per-project lease alive through HTTP serialization,
  preserves Windows reserved device names through the verbatim namespace, and
  requires a pre/post tree-hash and artifact-bound source-integrity receipt
  chain from MAP to TRACE to FILTER
- MAP fast mode emits a canonical empty `economic_route_graph.v1` with explicit
  coverage debt for every unrepresented entrypoint; TRACE never publishes
  zero-line evidence, and a foreign-file observation with `line=0` fails closed
- source-authority catalog application is a crash-recoverable transaction over
  legacy/scan catalogs, ground truth, known-corpus exclusion and its application
  receipt. Seal, receipt and every journal record are Ed25519-signed; create and
  apply and finalize require private/public key plus repository-pinned key ID
  `solguard-phase1-20260717`, while verify uses the pinned public key. A fresh
  UUID binds receipt and journal to the
  seal and exact transaction plan, rejecting stale/replayed recovery. The seal
  closes ordered v1-v8 and the receipt closes known corpus v1-v8 plus labs-90.
  Finalize revalidates every persisted derived hash and create-only publishes a
  signed `solguard-source-authority-finalization.v1`; normal readers require the
  marker and application receipt under the repository-pinned trust root.
  Documentation must keep the real ceremony pending until all four commands,
  the marker and persisted derived files are verified. Scan catalog
  materialization and both npm aliases are read-only `--check`; signed apply is
  the only catalog writer
- normal authority-derived reads stay inside `withSourceAuthorityRead`: the
  OS-backed shared lease pins root and generation, the opaque callback
  capability expires on return, and exact accessors verify bounded open-handle
  bytes, length, hash and strict JSON. Child commands use a separate short-lived
  process capability; its single-flight watchdog terminates and drains the full
  Windows Job Object or Unix process group on lease, capability or root
  instability. Docs must never present verify-then-raw-reopen as equivalent
- `labs-v1` is only the legacy 8-lab regression/targeted surface and cannot
  satisfy release, measurement or the 90-lab receipt. `labs-v2` is the sole
  canonical 90-lab release/measurement surface; complete tiers require the full
  denominator and both corpora remain known regression
- `solguard-pre-release-check.v3` separates `measurement_integrity` from
  `product_health`. Measurement may sign coherent degraded evidence only with
  `product_release_eligible=false`; release selects strict product health

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
