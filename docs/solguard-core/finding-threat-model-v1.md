# Threat model del finding v1

## Límite de autoridad

| Campo | Valor |
| --- | --- |
| Estado | `published_documentation` |
| Autoridad | `documentation_only`; claim authority `none` |
| Assurance | `development` / `single-custodian` |
| Independencia | `forbidden` |
| Gate | `DECIDE-605` = `pending` en revisión `446` |

Este documento es una vista de solo lectura. Publicarlo no acepta el gate, no reautoriza artefactos y no convierte CI, merge o documentación en autoridad del ledger.

## Evidencia upstream fijada

| Sujeto | Estado | Revisión | Implementación | Evidence root | Verifier root |
| --- | --- | ---: | --- | --- | --- |
| `DECIDE-604` | `accepted` | `445` | gate de bundles | `62ce464dc9125261d122310d97120f1cfffd5a2dd34671f401cd29526dbda3e3` | `c6a5b82fdfed619dd75c3e1fb9acdec3aa9fa8e6b325edf433701b470afe6111` |
| `C4-024` | `accepted` | `446` | `SolguardSecurity/solguard-filter@d02f71832889e0691df173dc7cdc850cd7b5cf53` | `994bc0636512785e7cb1ac43bbad589c357c831ffb0cd27a34d048bb381490f5` | `97401439ecb81ff3ad076a13197bcdede5c2a76bd2d74890b4ef71e7cd611899` |

Ambos objetos tienen `reopened_by=[]`. Los receipts son `development / single-custodian`; no existe claim de custodia independiente.

## Transición protegida

- `technical_truth`: VALIDATE TechnicalVerdict v1 remains immutable upstream truth.
- `admission`: FILTER emits AdmissionResult v1 only after reopening exact physical authority.
- `finding`: Core projects FindingEnvelope only from authentic FILTER pass.
- `publication`: PublishedFinding requires eligible unique or representative presentation.
- `review`: ReviewEnvelope requires authentic FILTER review or reject and never counts as a finding.
- `failure`: input or publication integrity failure emits no synthetic AdmissionResult or ReviewEnvelope.

## Matriz cerrada de amenazas

| ID | Ataque | Límite protegido | Resultado fail-closed | Evidencia ejecutable |
| --- | --- | --- | --- | --- |
| `source_drift` | Change source or candidate bytes after VALIDATE sealed the input hash | physical source and candidate hash binding | `reject_input_without_admission` | `solguard-filter:tests/filter_workflow/input_and_trace_contracts.rs::stale_candidate_hash_fails_the_whole_assessment` |
| `copied_evidence` | Copy one physical observation under multiple source or TRACE labels to inflate corroboration | evidence ancestor and physical-origin grouping | `review_insufficient_corroboration` | `solguard-filter:tests/filter_workflow/semantic_checkers.rs::mirrored_source_and_trace_at_one_location_are_one_origin` |
| `stale_invariant` | Replace the selected invariant primary while retaining an old runtime or source digest | invariant runtime and selected-source dual hash binding | `reject_input_without_admission` | `solguard-filter:tests/filter_workflow/bounded_invariants_and_reporting.rs::bounded_invariant_source_tampering_fails_closed` |
| `forged_solver_result` | Label a partial proof certificate as a supported complete solver verdict | TechnicalVerdict proof-certificate and obligation closure | `reject_input_without_admission` | `solguard-filter:tests/filter_workflow/threat_suite.rs::c4_024_forged_solver_result_cannot_claim_supported` |
| `cross_run_mix` | Combine individually valid TechnicalVerdict rows from different run bindings | one exact run cohort across five binding dimensions | `reject_input_without_admission` | `solguard-filter:src/technical_verdict.rs::cross_run_mixes_fail_closed_across_every_run_binding_dimension`<br>`solguard-filter:tests/filter_workflow/threat_suite.rs::c4_024_cross_run_mix_fails_before_assessment` |
| `duplicate_id` | Repeat one candidate identity so two rows compete for finding ownership | closed unique candidate identity set | `reject_input_without_admission` | `solguard-filter:tests/filter_workflow/bounded_invariants_and_reporting.rs::duplicate_candidate_identity_fails_before_assessment` |
| `malicious_artifact` | Use duplicate JSON fields so a permissive parser can overwrite authoritative identity | strict bounded JSON parsing | `reject_input_without_admission` | `solguard-filter:tests/filter_workflow/threat_suite.rs::c4_024_duplicate_json_key_is_not_a_valid_candidate_artifact` |
| `coverage_laundering` | Present a visible contradiction as terminal while callable or invariant acquisition retains debt | coverage completeness precedence | `review_coverage_debt` | `solguard-filter:tests/filter_workflow/semantic_checkers.rs::coverage_debt_precedes_a_concrete_contradiction_until_complete_replay` |
| `known_origin_stripping` | Remove origin ledgers or relabel known-pattern material inside a generic-blind TRACE batch | generic-blind profile and exact signal-origin ledger | `reject_input_without_admission` | `solguard-filter:src/input/trace_tree.rs::c4_024_known_origin_stripping_and_relabeling_fail_closed` |
| `report_json_discrepancy` | Mutate staged JSON, Markdown, summary or phase bytes after their first validation | final byte reopening before atomic publication | `abort_publication_without_output_root` | `solguard-filter:tests/filter_workflow/threat_suite.rs::c4_024_report_json_discrepancy_aborts_publication` |

## Invariantes de producto

- No PublishedFinding exists without immutable TechnicalVerdict Supported, authentic AdmissionResult Pass and publication eligibility.
- No pre-assessment input failure is converted into AdmissionResult Review or ReviewEnvelope.
- Copied evidence contributes one physical origin and never manufactures independent corroboration.
- Coverage debt blocks terminal pass and reject until complete replay.
- Every TechnicalVerdict row in one validation artifact shares one exact run binding.
- JSON, Markdown, summary and phase bytes are rederived and reopened before atomic publication.

## No-afirmaciones

- This documentation does not accept DECIDE-605 or any contribution.
- Development single-custodian receipts are not independent custody.
- The threat suite does not establish recall, precision, severity, benchmark performance or absence of all defects.
- A green pull request, merge or local test result is not acceptance-ledger authority.
