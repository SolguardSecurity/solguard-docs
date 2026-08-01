# Contratos, acceptance ledger y dependencias ejecutables

Estado: contrato normativo del programa.

Versión del programa: `solguard-detection-maturity-2026-07-25.4`.

Schema del ledger: `solguard-acceptance-ledger.v1`.

Ledger inicial: [`acceptance-ledger.v1.json`](acceptance-ledger.v1.json).

## 1. Propósito y precedencia

Este documento elimina cuatro ambigüedades que impedirían ejecutar el plan con
workers autónomos: nombres contractuales divergentes, ownership múltiple,
dependencias no tipadas y checkboxes que podían cerrarse manualmente.

La precedencia normativa es:

1. `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`: invariantes de producto y
   fronteras de autoridad;
2. este documento y `acceptance-ledger.v1.json`: IDs, owners, DAG, fórmulas,
   estados y reapertura;
3. `05_VALIDACION_CIEGA_Y_RELEASE.md`: protocolos y thresholds cuantitativos;
4. `02`, `03`, `04`, `06` y `10`: detalle de implementación y certificación;
5. `07_CHECKLIST_MAESTRA.md`: vista generada, nunca fuente editable.

Una contradicción se resuelve hacia arriba. Un documento inferior no crea un
alias, cambia un owner, elimina una dependencia ni suaviza un predicate.

## 2. Vocabulario del ledger

### 2.1 Tipos de nodo

| Tipo | Significado | Cómo cambia de estado | Contable |
|---|---|---|---:|
| `primary` | Trabajo o verificación con un único owner responsable | Transacción de aceptación con evidencia y verificador independiente | sí |
| `derived` | Conjunción de otros nodos; no contiene implementación propia | `computed_state=unsatisfied|satisfied`; no tiene state mutable | sí |
| `meta` | Estado informativo del ledger completo | Cálculo del generador | no |

Un nodo primary puede tener colaboradores, pero sólo un owner. Los briefs de
colaboradores usan IDs de implementación disjuntos y no pueden aceptar el nodo
padre. Un derived no se menciona como ID de commit.

### 2.2 Fórmula primaria

```text
accepted(P) :=
  P.kind == primary
  AND P.state == accepted
  AND every hard dependency is ready_by_kind
  AND every contract dependency is contract_verified at the exact version
  AND evidence_bundle(P) matches current node_version
  AND evidence_bundle(P).dependency_state_hash == current_dependency_state_hash
  AND verifier(P).verdict == ACCEPT
  AND verifier(P).identity != implementer(P).identity
  AND all required negative, contract and E2E predicates are true
```

`ready_by_kind(X)` significa primary/contribution `state=accepted`, o derived
`computed_state=satisfied` en la misma revision y operand-state hash; si el
derived es operacional, su materialization receipt y verifier también deben ser
válidos. `dependency_state_hash` incluye esa identidad tipada. Exigir
`accepted` a un derived es inválido y haría inalcanzable FINAL-007→RELEASE-914.

### 2.3 Fórmula derivada

```text
satisfied(D) :=
  D.kind == derived
  AND eval(D.formula) == true
  AND every operand was evaluated against the same ledger_revision
  AND no operand is reopened
  AND, when D.operational == true, its generated receipt satisfies
      evidence_descriptor and verifier_descriptor
```

Todas las fórmulas derivadas de esta versión usan `AND`. Los derived
operacionales (`*-CERT`, `BLIND-911`, aggregates verticales y `RELEASE-914`) añaden un receipt generado
después de satisfacer los operandos; nunca reciben una aceptación manual. No
existen medias, quórums, waivers, `OR` ni créditos parciales.

## 3. Registry canónico de contratos

`schema_version` debe contener exactamente el ID de esta tabla. Los nombres
abreviados sólo pueden aparecer como nombres de tipos internos, nunca en wire,
manifests, DB, briefs, commits contractuales o evidencia.

| Contract ID canónico | Owner | Productor(es) | Consumidores obligatorios | Scanner runtime |
|---|---|---|---|---:|
| `solguard-contract-registry.v1` | AGENTS | AGENTS | todos los repos, linter | no |
| `solguard-source-authority.v1` | CORE | CORE/adquisición | MAP, TRACE, DISCOVER, DIFF y pipeline posterior | sí |
| `solguard-run-spec.v1` | CORE | CORE | todos los tools, Backend, Deploy | sí |
| `solguard-artifact-envelope.v1` | CORE/crate neutral | cada tool y CORE | CORE, Backend, Database, Deploy | sí |
| `solguard-tool-phase.v1` | CORE/crate neutral | cada tool | CORE, Backend, Deploy | sí |
| `solguard-run-telemetry.v1` | CORE | CORE/tools | Backend y Deploy/evaluator | sí, oracle-free |
| `solguard-semantic-ir.v1` | MAP | MAP | TRACE, DISCOVER, DIFF, ECONOMIC, INVARIANT, VALUE, VALIDATE, CORE | sí |
| `solguard-language-frontend-manifest.v1` | MAP | `IR-307` publica schema/goldens; los 30 primary C1 emiten instancias por scope | cada C2 emparejado; TRACE, DISCOVER, DIFF, CORE y certificadores comunes | sí |
| `solguard-language-scope-manifest.v1` | DEPLOY/qualification | `LANG-020-HARNESS` publica schema/goldens; los 30 primary C0 emiten instancias | cada C1 emparejado, `SCOPE-900`, MAP, TRACE, DISCOVER, ECONOMIC, INVARIANT, VALUE, VALIDATE, FILTER, DIFF, CORE y certifier | sí, oracle-free |
| `solguard-capability-receipt.v1` | MAP/TRACE | `IR-304` emite receipt de frontend MAP temprano; `IR-308` emite receipt causal TRACE posterior | CORE, consumidores semánticos y certificador | sí |
| `solguard-trace-graph.v1` | TRACE | TRACE | DISCOVER, ECONOMIC, VALUE, INVARIANT, VALIDATE, CORE | sí |
| `solguard-protocol-model.v1` | DISCOVER | DISCOVER | ECONOMIC, INVARIANT, VALUE, CORE | sí |
| `solguard-economic-transition-system.v1` | ECONOMIC | ECONOMIC | VALUE, INVARIANT, VALIDATE, CORE | sí |
| `solguard-economic-adversary-model.v1` | ECONOMIC | `MODEL-411` reader-first/writer | VALUE, VALIDATE, CORE, PROOF, Deploy | sí |
| `solguard-invariant-set.v1` | INVARIANT | INVARIANT | DISCOVER, VALUE, VALIDATE, CORE | sí |
| `solguard-hypothesis-envelope.v1` | DISCOVER | DISCOVER | CORE | sí |
| `solguard-canonical-candidate.v1` | CORE | CORE | VALUE, VALIDATE, FILTER | sí |
| `solguard-proof-obligation.v1` | VALUE | VALUE | providers, CORE, VALIDATE | sí |
| `solguard-evidence-request.v1` | CORE | CORE scheduler | MAP, TRACE, ECONOMIC, VALUE, INVARIANT | sí |
| `solguard-evidence-response.v1` | CORE/crate neutral | MAP, TRACE, ECONOMIC, VALUE, INVARIANT | CORE, VALUE, VALIDATE | sí |
| `solguard-proof-certificate.v1` | VALUE | VALUE | VALIDATE, FILTER, CORE | sí |
| `solguard-technical-verdict.v1` | VALIDATE | VALIDATE | FILTER, CORE, Backend, Database, Deploy | sí |
| `solguard-admission-result.v1` | FILTER | FILTER | CORE, Backend, Database, Deploy | sí |
| `solguard-finding-envelope.v1` | CORE | `TRUTH-105` publica schema/goldens y prueba readers con writer off; `DECIDE-604` es el único runtime writer desde admission `pass` | Backend, Database, Deploy, Docs/UI | sí |
| `solguard-review-envelope.v1` | CORE | `TRUTH-105` publica schema/goldens y prueba readers con writer off; `DECIDE-604` es el único runtime writer, sólo desde admission `review/reject` | Backend, Database, Deploy, revisor | sí |
| `solguard-run-manifest.v1` | CORE | CORE | Backend, Database, Deploy | sí |
| `solguard-product-artifact-manifest.v1` | CORE | CORE | Backend, Database, Deploy | sí |
| `solguard-job-api.v1` | BACKEND | BACKEND | clientes autorizados, Deploy | sí |
| `solguard-benchmark-database.v2` | DATABASE | DATABASE | Backend y Deploy/evaluator | DB externa |
| `solguard-campaign-manifest.v1` | DEPLOY/evaluator | `MEASURE-901` publica schema con `truth_mode`; HOLDOUT/NOVEL/LIVE emiten instancias selladas | custodio, operador, HOLDOUT, NOVEL, evaluator y Database | **no** |
| `solguard-contamination-event.v1` | DEPLOY/evaluator governance | `MEASURE-901` schema; `CORPUS-905` y custodio autorizado emiten records | custodio, HOLDOUT, NOVEL, Database reader, evaluator y release | **no** |
| `solguard-corpus-manifest.v1` | DEPLOY/evaluator governance | `MEASURE-901` schema; `CORPUS-905` sella instancia | custodio, HOLDOUT, NOVEL, KNOWN, evaluator, Database reader y release | **no** |
| `solguard-truth-item.v1` | DEPLOY/evaluator | `MEASURE-901` schema/fixtures prefreeze; `CORPUS-905` emite KNOWN, `HOLDOUT-906` emite H-GEN y `NOVEL-907` emite H-NOVEL: el custodio cifra y compromete cada instancia privada antes del primer scan; post-scan sólo reveal/ingest/match | custodio, NOVEL, KNOWN, matcher, evaluator y Database; LIVE no emite truth | **no** |
| `solguard-match-decision.v1` | DEPLOY/evaluator | `MEASURE-901` publica schema reader-first; matcher de `EVAL-908` emite instancias post-scan | KNOWN, métricas y Database | **no** |
| `solguard-adjudication-review.v1` | DEPLOY/evaluator | `MEASURE-901` publica schema reader-first; revisores y `EVAL-908` emiten instancias post-scan | árbitro, métricas, Database | **no** |
| `solguard-metric-provenance.v1` | DEPLOY/evaluator | `MEASURE-901` publica schema reader-first; `EVAL-908` emite instancias post-scan; embebe TargetPolicyOpeningSet y FindingMaterialityAssessmentSet | Database, MeasurementReport y dossier | **no** |
| `solguard-measurement-report.v1` | DEPLOY/evaluator | `MEASURE-901` publica schema reader-first; `EVAL-908` emite instancias post-scan | los 60 gates C5A/C5B, `KNOWN-910`, `NOVELRUN-912`, `LIVE-913`, Database, Agents/claim evaluator, Docs y release reviewer | **no** |
| `solguard-live-authorization.v1` | AGENTS/governance + evidence authority | `MEASURE-901` publica schema/trust policy reader-first; issuer con authority chain y attestor independiente emiten la instancia firmada | `LIVE-CAP-913`, `EVAL-908`, `TEST-V8`, `LIVE-913`, perfil y LIVE vertical, campaign/report/dossier/context | **no**; artefacto target-specific fuera del scanner |
| `solguard-external-timestamp-receipt.v1` | AGENTS/governance evidence authority | `GOV-003` registra base+union/trust policy; autoridades RFC3161 y transparency independientes emiten receipts | freeze, commitments, output seals, reveal, dossier/DSSE, tag realization y promotion; quorum 2-of-2 | **no**; servicio externo independiente |
| `solguard-language-certification.v1` | DEPLOY/measurement | `LANG-200-HARNESS` publica schema/fixtures prefreeze; los 30 `S-CERT` emiten receipts operacionales post-scan | `FINAL-002/004/006`, Docs, Agents, release y matriz `04/10` | **no** |
| `solguard-acceptance-ledger.v1` | AGENTS/governance | `LEDGER-001` publica schema/goldens/readers temprano y materializa snapshots; Deploy verifica de forma independiente | evaluator, Docs view, Deploy/release y verificadores | no |
| `solguard-acceptance-ledger-event.v1` | AGENTS/governance | `LEDGER-001` publica schema/goldens/readers y el integrador autorizado emite cada operación firmada | regenerador snapshot/checklist, Docs, Deploy/release y auditor independiente | no |
| `solguard-acceptance-dossier-manifest.v1` | DEPLOY/evaluator governance | `MEASURE-901` publica schema reader-first; `EVAL-908` / dossier builder emite instancia | evidence store externo, Agents/claim evaluator, Docs, release reviewer y auditor independiente; Database no persiste el dossier | **no** |
| `solguard-task-evidence.v1` | AGENTS/governance | worker, integrador y verificador; subtype cerrado y attachments tipados | ledger, regenerador de checklist, auditoría y release reviewer | no |
| `solguard-derived-evaluation.v1` | AGENTS/governance | evaluador determinista del ledger | checklist, integrador, verificadores y release reviewer | no |
| `solguard-maturity-baseline.v1` | DEPLOY/governance | `GOV-001` | Docs, workers de todos los repos, verificadores y release reviewer | no; artefacto de control |
| `solguard-scope-proof.v1` | DEPLOY/isolation attestor | `SCOPE-900` define scope; `ISO-904` atesta cierre | AGENTS/governance, release approver y verificador independiente | **no**; sólo attestation post-build |

<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:BEGIN -->
### 3.0A Registry generado de schemas de control y evidencia

La tabla principal cubre contratos materiales de producto/runtime. Esta tabla cierra los IDs de control, transición y evidencia; alias o versión ausente falla.

| Schema ID | Owner/authority | Uso/locator canónico observado |
|---|---|---|
| `solguard-absence-receipt-contribution.v1` | AGENTS/governance evidence authority | `08_PLANTILLA_DE_TAREA_GPT.md`, `ledger.contributions[].evidence_descriptor.schema` |
| `solguard-acceptance-dossier-manifest.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-acceptance-ledger-commit-receipt.v1` | AGENTS/DEPLOY release governance | `ledger.transition_contract.commit_receipt.schema`, `rebuild-final-plan.mjs` |
| `solguard-acceptance-ledger-event.v1` | product contract registry §3 | `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-acceptance-ledger-linearizability.v1` | AGENTS/DEPLOY release governance | `ledger.linearizability_contract.schema`, `rebuild-final-plan.mjs` |
| `solguard-acceptance-ledger.v1` | product contract registry §3 | `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id`, `ledger.schema_version`, `rebuild-final-plan.mjs` |
| `solguard-adjudication-review.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-admission-result.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-artifact-durability-receipt.v1` | AGENTS/governance evidence authority | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md` |
| `solguard-artifact-envelope.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-benchmark-database.v2` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-bootstrap-transition-evidence.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-campaign-manifest.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-campaign-transition-evidence.v1` | DEPLOY/evaluator | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-canary-validation-receipt.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-candidate-epoch-binding.v1` | AGENTS/DEPLOY release governance | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md` |
| `solguard-candidate-epoch-close-transition.v1` | AGENTS/DEPLOY release governance | `ledger.candidate_epoch_close_transition_contract.schema`, `ledger.nodes[].evidence_descriptor.schema`, `rebuild-final-plan.mjs` |
| `solguard-candidate-epoch-closure-receipt.v1` | AGENTS/DEPLOY release governance | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.candidate_epoch_close_transition_contract.post_persistence`, `ledger.candidate_epoch_closure_receipt_contract.schema`, `ledger.candidate_epoch_registry[].historical_boundary_member_records[].contract_id`, `ledger.candidate_epoch_registry[].planned_input_subject_records[].dependency_bindings[].contract_id` |
| `solguard-candidate-epoch-open-receipt.v1` | AGENTS/DEPLOY release governance | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-candidate-epoch.v1` | AGENTS/DEPLOY release governance | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.candidate_epoch_contract.schema`, `ledger.nodes[].dependencies[].contract_id`, `rebuild-final-plan.mjs` |
| `solguard-candidate-tree-containment-receipt.v1` | AGENTS/DEPLOY release governance | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md` |
| `solguard-canonical-candidate.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-canonical-set-commitment.v1` | AGENTS/governance evidence authority | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `ledger.canonical_set_commitment_contract.schema_version`, `rebuild-final-plan.mjs` |
| `solguard-capability-receipt.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-chaos-validation-receipt.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-contamination-event.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-contract-edge-set.v1` | AGENTS/governance evidence authority | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `rebuild-final-plan.mjs` |
| `solguard-contract-registry.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-contribution-evidence.v1` | AGENTS/governance evidence authority | `ledger.contributions[].evidence_descriptor.schema` |
| `solguard-corpus-manifest.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `04_MADUREZ_OCHO_LENGUAJES.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-corpus-snapshot-transition.v1` | DEPLOY/evaluator | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-current-replay-baseline.v1` | AGENTS/governance evidence authority | `02_PROGRAMA_ESTRUCTURAL.md` |
| `solguard-database-cutover-receipt.v1` | DATABASE | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-derived-evaluation.v1` | product contract registry §3 | `05_VALIDACION_CIEGA_Y_RELEASE.md`, `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.nodes[].dependencies[].contract_id`, `ledger.nodes[].evidence_descriptor.schema`, `rebuild-final-plan.mjs` |
| `solguard-derived-materialization-receipt.v1` | AGENTS/DEPLOY release governance | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-economic-adversary-model.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `04_MADUREZ_OCHO_LENGUAJES.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.nodes[].dependencies[].contract_id`, `ledger.nodes[].produced_contracts[].contract_id`, `rebuild-final-plan.mjs` |
| `solguard-economic-transition-system.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id`, `rebuild-final-plan.mjs` |
| `solguard-evidence-request.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-evidence-response.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-external-timestamp-receipt.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.candidate_epoch_registry[].planned_input_subject_records[].dependency_bindings[].contract_id`, `ledger.external_timestamp_contract.schema`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-final-evidence-transition.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-finding-envelope.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-freeze-attestation.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-hypothesis-envelope.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-implementation-transition-evidence.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-invariant-set.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-job-api.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-language-certification.v1` | product contract registry §3 | `04_MADUREZ_OCHO_LENGUAJES.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-language-frontend-manifest.v1` | product contract registry §3 | `04_MADUREZ_OCHO_LENGUAJES.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-language-scope-manifest.v1` | product contract registry §3 | `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.contributions[].expected_commit.observable_result`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-live-authorization.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.live_authorization_contract.schema`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-live-measurement-transition.v1` | DEPLOY/evaluator | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-match-decision.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-maturity-baseline.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-measurement-report.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-measurement-transition-evidence.v1` | DEPLOY/evaluator | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-metric-provenance.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-operational-validation-receipt.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-policy-set-commitment.v1` | AGENTS/governance evidence authority | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `10_MATRIZ_CERTIFICACION_SCOPES.md`, `ledger.policy_commitment_contract.policy_commitment_scheme` |
| `solguard-post-tag-terminal-transition.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-presentation-decision.v1` | AGENTS/governance evidence authority | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md` |
| `solguard-product-artifact-manifest.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-proof-certificate.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `04_MADUREZ_OCHO_LENGUAJES.md`, `06_PLAN_DE_COMMITS.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.contributions[].expected_commit.observable_result`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-proof-obligation.v1` | product contract registry §3 | `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-protocol-model.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `04_MADUREZ_OCHO_LENGUAJES.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-release-decision-materialization-receipt.v1` | AGENTS/DEPLOY release governance | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-release-pre-tag-transition.v1` | AGENTS/DEPLOY release governance | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-resource-profile-policy.v1` | AGENTS/governance evidence authority | `ledger.resource_profile_policy_registry[].schema_version`, `rebuild-final-plan.mjs` |
| `solguard-resource-profile.v1` | AGENTS/governance evidence authority | `05_VALIDACION_CIEGA_Y_RELEASE.md` |
| `solguard-review-envelope.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-run-manifest.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-run-spec.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-run-telemetry.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-scope-certification-materialization-receipt.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-scope-proof.v1` | product contract registry §3 | `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-semantic-ir.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-source-authority.v1` | product contract registry §3 | `03_PLAN_POR_REPOSITORIO.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-stage-loss-ledger.v1` | AGENTS/DEPLOY release governance | `02_PROGRAMA_ESTRUCTURAL.md` |
| `solguard-tag-realization-receipt.v1` | AGENTS/governance evidence authority | `05_VALIDACION_CIEGA_Y_RELEASE.md`, `06_PLAN_DE_COMMITS.md` |
| `solguard-task-evidence.v1` | product contract registry §3 | `08_PLANTILLA_DE_TAREA_GPT.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-technical-verdict.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-tool-phase.v1` | product contract registry §3 | `02_PROGRAMA_ESTRUCTURAL.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-trace-graph.v1` | product contract registry §3 | `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-truth-item.v1` | product contract registry §3 | `01_CONTRATO_DE_MADUREZ_Y_ARQUITECTURA.md`, `05_VALIDACION_CIEGA_Y_RELEASE.md`, `09_CONTRATOS_LEDGER_Y_DEPENDENCIAS.md (generated)`, `ledger.contributions[].dependencies[].contract_id`, `ledger.nodes[].dependencies[].contract_id` |
| `solguard-upstream-nonpass-receipt.v1` | AGENTS/governance evidence authority | `ledger.upstream_nonpass_receipt_contract.schema` |
| `solguard-validation-record.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |
| `solguard-vertical-profile-preregistration.v1` | AGENTS/governance evidence authority | `ledger.nodes[].evidence_descriptor.schema` |

### 3.0B Registry cerrada de resource profile policies

Cada `policy_root` se calcula como `SHA256(UTF8("solguard:resource-profile-policy:v1") || 0x00 || RFC8785_JCS(payload_without_policy_root))`. El payload cerrado completo se publica en `resource_profile_policy_registry[]`; el seed y `epoch_constants` sólo lo referencian por ID/version/root exactos.

| Policy | Schema | Program/version | Policy root |
|---|---|---|---|
| `solguard-resource-profile-policy-vertical-v1@1` | `solguard-resource-profile-policy.v1` | `solguard-detection-maturity-2026-07-25@solguard-detection-maturity-2026-07-25.4` | `b8c9efad1212c83c8dff8d5fd2d48924f94ded8be5ea9cc67b9e155f6a89cc7d` |
| `solguard-resource-profile-policy-full-v1@1` | `solguard-resource-profile-policy.v1` | `solguard-detection-maturity-2026-07-25@solguard-detection-maturity-2026-07-25.4` | `21a7fe3f60e1afcd11870753f9cebbbd6bb63511742497078f2eb1c3f649bfd8` |

- Campos obligatorios del profile: `resource_profile_id`, `resource_profile_version`, `hardware_class`, `runtime_class`, `hardware_root`, `runtime_root`, `wall_time_p95_ms_max`, `wall_time_ms_max`, `cpu_time_ms_max`, `peak_ram_bytes_max`, `peak_disk_bytes_max`, `solver_time_ms_max`, `model_calls_max`, `model_tokens_max`, `model_cost_minor_units_max`, `retry_count_max`, `throughput_targets_per_hour_min`, `concurrency_limit`, `queue_limit`, `candidate_limit`, `continuation_limit`, `model_timeout_rate_max`, `schema_failure_rate_max`, `model_failure_rate_max`, `schema_or_model_failure_rate_max`, `filter_failure_count_max`, `control_oom_count_max`, `control_disk_exhaustion_count_max`, `control_noncompletion_count_max`.
- Hard rates/counts: `{"control_disk_exhaustion_count_max":0,"control_noncompletion_count_max":0,"control_oom_count_max":0,"filter_failure_count_max":0,"model_failure_rate_max":0.01,"model_timeout_rate_max":0.02,"schema_failure_rate_max":0.01,"schema_or_model_failure_rate_max":0.01}`.
- Semántica de comparación: `actual_rate_strictly_less_than_configured_max; actual_count_lte_configured_max`.
- Workload burdens: `{"candidate_median_max":50,"candidate_p95_max":100,"inconclusive_median_max":10,"inconclusive_p95_max":25,"proof_debt_median_max":10,"proof_debt_p95_max":25,"raw_pass_median_max":15,"raw_pass_p95_max":40,"review_median_max":10,"review_p95_max":25}`.

<!-- GENERATED:EVIDENCE-SCHEMA-REGISTRY:END -->

### 3.1 Frontera de medición

Los contratos post-scan son propiedad de DEPLOY/evaluator. DATABASE persiste
exactamente campaign, truth, corpus, contamination, match, adjudication review,
metric provenance y measurement report; no persiste language certification ni
el dossier completo. En el plano MEASURE, CORE no emite contratos post-scan:
el evaluator consume sus artefactos oracle-free, incluidos telemetry,
finding/review envelopes y manifests. CORE no define, importa ni calcula el
oracle. El scope proof demuestra por closure de módulos, archivos, imagen,
SBOM y accesos que truth/matching/adjudication/metrics no son alcanzables desde
el scanner.

La autoridad Database es única: `PLAT-801` publica el schema v2; `PLAT-802`
implementa tooling, dry-run y reconciliación shadow sin crear autoridad ni
hacer cutover; `MEASURE-901` publica schemas/reader tests; `DB-902` ejecuta el
único bootstrap, migración, comparación shadow, reconciliación y cutover.
`TRUTH-109` sólo deja el guard legacy listo y ensayado detrás de flag;
`DB-902` lo activa tras telemetry-zero y conserva rollback.

### 3.2 Aliases prohibidos

El linter rechaza, al menos:

| Alias prohibido | ID requerido |
|---|---|
| `semantic-ir.v1` | `solguard-semantic-ir.v1` |
| `protocol-model.v1` | `solguard-protocol-model.v1` |
| `evidence-request/response.v1` | dos contratos separados request y response |
| `proof-certificate.v1` | `solguard-proof-certificate.v1` |
| `admission-result.v1` | `solguard-admission-result.v1` |
| `finding-envelope.v1` | `solguard-finding-envelope.v1` |
| `review-envelope.v1` | `solguard-review-envelope.v1` |
| `release_eligible` o `finding_eligibility` | `publication_eligibility` dentro de admission/finding |

No se permite resolver un alias mediante compatibilidad silenciosa. Toda
migración sigue schema/goldens, readers dual-read, writer nuevo, cutover,
telemetría a cero y retirada legacy. El rollback detiene primero el writer
nuevo y conserva lectores dual-read hasta restaurar el formato anterior.

### 3.3 Aristas contractuales materiales

El ledger contiene **809 aristas contractuales de nodo** y **1187 bindings contractuales de contribution**.

- Schema de ambos payloads: `solguard-contract-edge-set.v1`.
- Root JCS/domain node: `81bd0d71e021d6428ed433a0fac3c08fc521ffc8990304e584ff7802bae23e77`.
- Root JCS/domain contribution: `2470bf21139e1ca68e4db5ccb005fda72fae1fcc71c53af03ff793474d24c71c`.
- Cada arista fija contract ID/version, producer y consumer exactos.

| Contract/version | Producer | Consumers exactos | Count |
|---|---|---|---:|
| `solguard-acceptance-dossier-manifest.v1` / `v1` | `EVAL-908` | `FINAL-001`, `FINAL-002`, `FINAL-003`, `FINAL-004`, `FINAL-006`, `FINAL-007`, `LIVE-913` | 7 |
| `solguard-acceptance-dossier-manifest.v1` / `v1` | `MEASURE-901` | `EVAL-908` | 1 |
| `solguard-acceptance-ledger-event.v1` / `v1` | `LEDGER-001` | `FINAL-003`, `FINAL-005`, `GOV-005`, `PLAT-804` | 4 |
| `solguard-acceptance-ledger.v1` / `v1` | `LEDGER-001` | `EVAL-908`, `FINAL-002`, `FINAL-007` | 3 |
| `solguard-adjudication-review.v1` / `v1` | `EVAL-908` | `FINAL-003`, `NOVELRUN-912` | 2 |
| `solguard-adjudication-review.v1` / `v1` | `MEASURE-901` | `DB-CAP-902`, `EVAL-908` | 2 |
| `solguard-admission-result.v1` / `v1` | `DECIDE-602` | `DECIDE-604`, `PLAT-801`, `PLAT-803-BACKEND`, `PLAT-804` | 4 |
| `solguard-admission-result.v1` / `v1` | `TRUTH-103` | `TRUTH-105`, `TRUTH-108`, `TRUTH-109`, `TRUTH-110` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-CORE-CUTOVER` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-DIFF` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-DISCOVER` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-ECONOMIC` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-FILTER` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-INVARIANT` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-MAP` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-TRACE` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-VALIDATE` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-artifact-envelope.v1` / `v1` | `RUN-207-VALUE` | `PLAT-801`, `PLAT-804`, `RUN-207-E2E`, `RUN-208` | 4 |
| `solguard-benchmark-database.v2` / `v2` | `PLAT-801` | `DB-902`, `DB-CAP-902`, `PLAT-802`, `PLAT-804` | 4 |
| `solguard-campaign-manifest.v1` / `v1` | `HOLDOUT-906` | `C-BRIDGE-FINALITY-C5A`, `C-BRIDGE-FINALITY-C5B`, `C-UTXO-CONSENSUS-C5A`, `C-UTXO-CONSENSUS-C5B`, `C-WALLET-CUSTODY-C5A`, `C-WALLET-CUSTODY-C5B`, `CPP-BRIDGE-FINALITY-C5A`, `CPP-BRIDGE-FINALITY-C5B`, `CPP-UTXO-CONSENSUS-C5A`, `CPP-UTXO-CONSENSUS-C5B`, `CPP-WALLET-CUSTODY-C5A`, `CPP-WALLET-CUSTODY-C5B`, `GO-COSMOS-SDK-C5A`, `GO-COSMOS-SDK-C5B`, `GO-GETH-CLIENT-C5A`, `GO-GETH-CLIENT-C5B`, `GO-RELAYER-ORACLE-C5A`, `GO-RELAYER-ORACLE-C5B`, `JS-NODE-KEEPER-ORACLE-C5A`, `JS-NODE-KEEPER-ORACLE-C5B`, `JS-NODE-RELAYER-C5A`, `JS-NODE-RELAYER-C5B`, `JS-NODE-TX-BUILDER-C5A`, `JS-NODE-TX-BUILDER-C5B`, `RST-COSMWASM-C5A`, `RST-COSMWASM-C5B`, `RST-NATIVE-CLIENT-C5A`, `RST-NATIVE-CLIENT-C5B`, `RST-NEAR-C5A`, `RST-NEAR-C5B`, `RST-SOLANA-ANCHOR-C5A`, `RST-SOLANA-ANCHOR-C5B`, `RST-SUBSTRATE-FRAME-C5A`, `RST-SUBSTRATE-FRAME-C5B`, `SOL-EVM-DEFI-C5A`, `SOL-EVM-DEFI-C5B`, `TS-NODE-KEEPER-ORACLE-C5A`, `TS-NODE-KEEPER-ORACLE-C5B`, `TS-NODE-RELAYER-SDK-C5A`, `TS-NODE-RELAYER-SDK-C5B`, `TS-NODE-TX-BUILDER-C5A`, `TS-NODE-TX-BUILDER-C5B`, `VYP-EVM-DEFI-C5A`, `VYP-EVM-DEFI-C5B`, `X-COSMWASM-GO-RELAYER-C5A`, `X-COSMWASM-GO-RELAYER-C5B`, `X-GO-C-FFI-C5A`, `X-GO-C-FFI-C5B`, `X-GO-CPP-FFI-C5A`, `X-GO-CPP-FFI-C5B`, `X-NEAR-JS-CLIENT-C5A`, `X-NEAR-JS-CLIENT-C5B`, `X-SOL-TS-RELAYER-C5A`, `X-SOL-TS-RELAYER-C5B`, `X-SOLANA-TS-CLIENT-C5A`, `X-SOLANA-TS-CLIENT-C5B`, `X-TS-DATA-SOL-TX-C5A`, `X-TS-DATA-SOL-TX-C5B`, `X-VYP-JS-KEEPER-C5A`, `X-VYP-JS-KEEPER-C5B` | 60 |
| `solguard-campaign-manifest.v1` / `v1` | `MEASURE-901` | `DB-CAP-902`, `HOLDOUT-906`, `LIVE-913`, `NOVEL-907`, `VERTICAL-EVM-HGEN-A-001`, `VERTICAL-EVM-HGEN-B-001`, `VERTICAL-EVM-HGEN-SEAL-001`, `VERTICAL-EVM-HNOVEL-A-001`, `VERTICAL-EVM-HNOVEL-B-001`, `VERTICAL-EVM-HNOVEL-SEAL-001`, `VERTICAL-EVM-LIVE-001`, `VERTICAL-EVM-PROFILE-001` | 12 |
| `solguard-campaign-manifest.v1` / `v1` | `NOVEL-907` | `NOVELRUN-912` | 1 |
| `solguard-candidate-epoch-closure-receipt.v1` / `v1` | `RC-FULL-1-CLOSE` | `FINAL-001` | 1 |
| `solguard-candidate-epoch-closure-receipt.v1` / `v1` | `VERTICAL-EVM-CONTAMINATION-CLOSE-001` | `RC-FULL-1` | 1 |
| `solguard-candidate-epoch.v1` / `v1` | `RC-FULL-1` | `BOM-903`, `C-BRIDGE-FINALITY-C5A`, `C-BRIDGE-FINALITY-C5B`, `C-UTXO-CONSENSUS-C5A`, `C-UTXO-CONSENSUS-C5B`, `C-WALLET-CUSTODY-C5A`, `C-WALLET-CUSTODY-C5B`, `CANARY-909`, `CORPUS-905`, `CPP-BRIDGE-FINALITY-C5A`, `CPP-BRIDGE-FINALITY-C5B`, `CPP-UTXO-CONSENSUS-C5A`, `CPP-UTXO-CONSENSUS-C5B`, `CPP-WALLET-CUSTODY-C5A`, `CPP-WALLET-CUSTODY-C5B`, `FINAL-001`, `FINAL-002`, `FINAL-003`, `FINAL-004`, `FINAL-005`, `FINAL-006`, `FINAL-007`, `GO-COSMOS-SDK-C5A`, `GO-COSMOS-SDK-C5B`, `GO-GETH-CLIENT-C5A`, `GO-GETH-CLIENT-C5B`, `GO-RELAYER-ORACLE-C5A`, `GO-RELAYER-ORACLE-C5B`, `HOLDOUT-906`, `ISO-904`, `JS-NODE-KEEPER-ORACLE-C5A`, `JS-NODE-KEEPER-ORACLE-C5B`, `JS-NODE-RELAYER-C5A`, `JS-NODE-RELAYER-C5B`, `JS-NODE-TX-BUILDER-C5A`, `JS-NODE-TX-BUILDER-C5B`, `KNOWN-910`, `LIVE-913`, `NOVEL-907`, `NOVELRUN-912`, `RC-FULL-1-CLOSE`, `RST-COSMWASM-C5A`, `RST-COSMWASM-C5B`, `RST-NATIVE-CLIENT-C5A`, `RST-NATIVE-CLIENT-C5B`, `RST-NEAR-C5A`, `RST-NEAR-C5B`, `RST-SOLANA-ANCHOR-C5A`, `RST-SOLANA-ANCHOR-C5B`, `RST-SUBSTRATE-FRAME-C5A`, `RST-SUBSTRATE-FRAME-C5B`, `SCOPE-900`, `SOL-EVM-DEFI-C5A`, `SOL-EVM-DEFI-C5B`, `TEST-CHAOS`, `TEST-META`, `TEST-NEG`, `TEST-V0`, `TEST-V1`, `TEST-V2`, `TEST-V3`, `TEST-V4`, `TEST-V5`, `TEST-V6`, `TEST-V7`, `TEST-V8`, `TS-NODE-KEEPER-ORACLE-C5A`, `TS-NODE-KEEPER-ORACLE-C5B`, `TS-NODE-RELAYER-SDK-C5A`, `TS-NODE-RELAYER-SDK-C5B`, `TS-NODE-TX-BUILDER-C5A`, `TS-NODE-TX-BUILDER-C5B`, `VYP-EVM-DEFI-C5A`, `VYP-EVM-DEFI-C5B`, `X-COSMWASM-GO-RELAYER-C5A`, `X-COSMWASM-GO-RELAYER-C5B`, `X-GO-C-FFI-C5A`, `X-GO-C-FFI-C5B`, `X-GO-CPP-FFI-C5A`, `X-GO-CPP-FFI-C5B`, `X-NEAR-JS-CLIENT-C5A`, `X-NEAR-JS-CLIENT-C5B`, `X-SOL-TS-RELAYER-C5A`, `X-SOL-TS-RELAYER-C5B`, `X-SOLANA-TS-CLIENT-C5A`, `X-SOLANA-TS-CLIENT-C5B`, `X-TS-DATA-SOL-TX-C5A`, `X-TS-DATA-SOL-TX-C5B`, `X-VYP-JS-KEEPER-C5A`, `X-VYP-JS-KEEPER-C5B` | 90 |
| `solguard-candidate-epoch.v1` / `v1` | `RC-V-EVM-1` | `VERTICAL-EVM-BOM-001`, `VERTICAL-EVM-CANARY-001`, `VERTICAL-EVM-CHAOS-001`, `VERTICAL-EVM-CONTAMINATION-CLOSE-001`, `VERTICAL-EVM-CORPUS-001`, `VERTICAL-EVM-HGEN-A-001`, `VERTICAL-EVM-HGEN-B-001`, `VERTICAL-EVM-HGEN-SEAL-001`, `VERTICAL-EVM-HNOVEL-A-001`, `VERTICAL-EVM-HNOVEL-B-001`, `VERTICAL-EVM-HNOVEL-SEAL-001`, `VERTICAL-EVM-ISO-001`, `VERTICAL-EVM-KNOWN-001`, `VERTICAL-EVM-LIVE-001`, `VERTICAL-EVM-PROFILE-001`, `VERTICAL-EVM-SCOPE-001`, `VERTICAL-EVM-TEST-META-001`, `VERTICAL-EVM-TEST-NEG-001`, `VERTICAL-EVM-TEST-V0-001`, `VERTICAL-EVM-TEST-V1-001`, `VERTICAL-EVM-TEST-V2-001`, `VERTICAL-EVM-TEST-V3-001`, `VERTICAL-EVM-TEST-V4-001`, `VERTICAL-EVM-V5-001` | 24 |
| `solguard-canonical-candidate.v1` / `v1` | `MODEL-407` | `DECIDE-601`, `DECIDE-602`, `PROOF-501`, `PROOF-502` | 4 |
| `solguard-capability-receipt.v1` / `v1` | `IR-304` | `IR-303`, `IR-305`, `MODEL-401` | 3 |
| `solguard-capability-receipt.v1` / `v1` | `IR-308` | `DECIDE-601`, `LANG-200-HARNESS`, `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 6 |
| `solguard-contamination-event.v1` / `v1` | `CORPUS-905` | `FINAL-006`, `HOLDOUT-906`, `NOVEL-907` | 3 |
| `solguard-contamination-event.v1` / `v1` | `MEASURE-901` | `CORPUS-905`, `DB-CAP-902` | 2 |
| `solguard-contract-registry.v1` / `v1` | `GOV-003` | `LEDGER-001` | 1 |
| `solguard-corpus-manifest.v1` / `v1` | `CORPUS-905` | `FINAL-006`, `HOLDOUT-906`, `KNOWN-910`, `NOVEL-907` | 4 |
| `solguard-corpus-manifest.v1` / `v1` | `MEASURE-901` | `CORPUS-905`, `DB-CAP-902`, `VERTICAL-EVM-CORPUS-001` | 3 |
| `solguard-derived-evaluation.v1` / `v1` | `LEDGER-001` | `FINAL-003` | 1 |
| `solguard-economic-adversary-model.v1` / `v1` | `MODEL-411` | `PROOF-501` | 1 |
| `solguard-economic-transition-system.v1` / `v1` | `MODEL-403` | `DECIDE-601`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 4 |
| `solguard-evidence-request.v1` / `v1` | `PROOF-502` | `PROOF-503-ECONOMIC`, `PROOF-503-INVARIANT`, `PROOF-503-MAP`, `PROOF-503-TRACE`, `PROOF-503-VALUE`, `PROOF-504` | 6 |
| `solguard-evidence-response.v1` / `v1` | `PROOF-503-ECONOMIC` | `DECIDE-601`, `PROOF-503-E2E`, `PROOF-504`, `PROOF-507` | 4 |
| `solguard-evidence-response.v1` / `v1` | `PROOF-503-INVARIANT` | `DECIDE-601`, `PROOF-503-E2E`, `PROOF-504`, `PROOF-507` | 4 |
| `solguard-evidence-response.v1` / `v1` | `PROOF-503-MAP` | `DECIDE-601`, `PROOF-503-E2E`, `PROOF-504`, `PROOF-507` | 4 |
| `solguard-evidence-response.v1` / `v1` | `PROOF-503-TRACE` | `DECIDE-601`, `PROOF-503-E2E`, `PROOF-504`, `PROOF-507` | 4 |
| `solguard-evidence-response.v1` / `v1` | `PROOF-503-VALUE` | `DECIDE-601`, `PROOF-503-E2E`, `PROOF-504`, `PROOF-507` | 4 |
| `solguard-external-timestamp-receipt.v1` / `v1` | `GOV-003` | `BOM-903`, `C-BRIDGE-FINALITY-C5A`, `C-BRIDGE-FINALITY-C5B`, `C-UTXO-CONSENSUS-C5A`, `C-UTXO-CONSENSUS-C5B`, `C-WALLET-CUSTODY-C5A`, `C-WALLET-CUSTODY-C5B`, `CORPUS-905`, `CPP-BRIDGE-FINALITY-C5A`, `CPP-BRIDGE-FINALITY-C5B`, `CPP-UTXO-CONSENSUS-C5A`, `CPP-UTXO-CONSENSUS-C5B`, `CPP-WALLET-CUSTODY-C5A`, `CPP-WALLET-CUSTODY-C5B`, `DB-902`, `FINAL-001`, `FINAL-002`, `FINAL-003`, `FINAL-004`, `FINAL-005`, `FINAL-006`, `FINAL-007`, `GO-COSMOS-SDK-C5A`, `GO-COSMOS-SDK-C5B`, `GO-GETH-CLIENT-C5A`, `GO-GETH-CLIENT-C5B`, `GO-RELAYER-ORACLE-C5A`, `GO-RELAYER-ORACLE-C5B`, `HOLDOUT-906`, `ISO-904`, `JS-NODE-KEEPER-ORACLE-C5A`, `JS-NODE-KEEPER-ORACLE-C5B`, `JS-NODE-RELAYER-C5A`, `JS-NODE-RELAYER-C5B`, `JS-NODE-TX-BUILDER-C5A`, `JS-NODE-TX-BUILDER-C5B`, `LIVE-913`, `NOVEL-907`, `NOVELRUN-912`, `RC-FULL-1`, `RC-FULL-1-CLOSE`, `RC-V-EVM-1`, `RST-COSMWASM-C5A`, `RST-COSMWASM-C5B`, `RST-NATIVE-CLIENT-C5A`, `RST-NATIVE-CLIENT-C5B`, `RST-NEAR-C5A`, `RST-NEAR-C5B`, `RST-SOLANA-ANCHOR-C5A`, `RST-SOLANA-ANCHOR-C5B`, `RST-SUBSTRATE-FRAME-C5A`, `RST-SUBSTRATE-FRAME-C5B`, `SCOPE-900`, `SOL-EVM-DEFI-C5A`, `SOL-EVM-DEFI-C5B`, `TEST-V6`, `TEST-V7`, `TEST-V8`, `TS-NODE-KEEPER-ORACLE-C5A`, `TS-NODE-KEEPER-ORACLE-C5B`, `TS-NODE-RELAYER-SDK-C5A`, `TS-NODE-RELAYER-SDK-C5B`, `TS-NODE-TX-BUILDER-C5A`, `TS-NODE-TX-BUILDER-C5B`, `VERTICAL-EVM-BOM-001`, `VERTICAL-EVM-CANARY-001`, `VERTICAL-EVM-CHAOS-001`, `VERTICAL-EVM-CONTAMINATION-CLOSE-001`, `VERTICAL-EVM-CORPUS-001`, `VERTICAL-EVM-HGEN-A-001`, `VERTICAL-EVM-HGEN-B-001`, `VERTICAL-EVM-HGEN-SEAL-001`, `VERTICAL-EVM-HNOVEL-A-001`, `VERTICAL-EVM-HNOVEL-B-001`, `VERTICAL-EVM-HNOVEL-SEAL-001`, `VERTICAL-EVM-ISO-001`, `VERTICAL-EVM-KNOWN-001`, `VERTICAL-EVM-LIVE-001`, `VERTICAL-EVM-PROFILE-001`, `VERTICAL-EVM-SCOPE-001`, `VERTICAL-EVM-TEST-META-001`, `VERTICAL-EVM-TEST-NEG-001`, `VERTICAL-EVM-TEST-V0-001`, `VERTICAL-EVM-TEST-V1-001`, `VERTICAL-EVM-TEST-V2-001`, `VERTICAL-EVM-TEST-V3-001`, `VERTICAL-EVM-TEST-V4-001`, `VERTICAL-EVM-V5-001`, `VYP-EVM-DEFI-C5A`, `VYP-EVM-DEFI-C5B`, `X-COSMWASM-GO-RELAYER-C5A`, `X-COSMWASM-GO-RELAYER-C5B`, `X-GO-C-FFI-C5A`, `X-GO-C-FFI-C5B`, `X-GO-CPP-FFI-C5A`, `X-GO-CPP-FFI-C5B`, `X-NEAR-JS-CLIENT-C5A`, `X-NEAR-JS-CLIENT-C5B`, `X-SOL-TS-RELAYER-C5A`, `X-SOL-TS-RELAYER-C5B`, `X-SOLANA-TS-CLIENT-C5A`, `X-SOLANA-TS-CLIENT-C5B`, `X-TS-DATA-SOL-TX-C5A`, `X-TS-DATA-SOL-TX-C5B`, `X-VYP-JS-KEEPER-C5A`, `X-VYP-JS-KEEPER-C5B` | 106 |
| `solguard-finding-envelope.v1` / `v1` | `DECIDE-604` | `DECIDE-605`, `EVAL-908`, `FINAL-003`, `PLAT-801`, `PLAT-803-BACKEND`, `PLAT-804` | 6 |
| `solguard-finding-envelope.v1` / `v1` | `TRUTH-105` | `DECIDE-604` | 1 |
| `solguard-hypothesis-envelope.v1` / `v1` | `MODEL-406` | `MODEL-407` | 1 |
| `solguard-invariant-set.v1` / `v1` | `MODEL-405` | `DECIDE-601`, `MODEL-406`, `MODEL-407`, `PROOF-501` | 4 |
| `solguard-job-api.v1` / `v1` | `PLAT-803-BACKEND` | `PLAT-803-E2E`, `PLAT-804` | 2 |
| `solguard-language-certification.v1` / `v1` | `LANG-200-HARNESS` | `FINAL-002`, `FINAL-004`, `FINAL-006` | 3 |
| `solguard-language-frontend-manifest.v1` / `v1` | `C-BRIDGE-FINALITY-C1` | `C-BRIDGE-FINALITY-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `C-UTXO-CONSENSUS-C1` | `C-UTXO-CONSENSUS-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `C-WALLET-CUSTODY-C1` | `C-WALLET-CUSTODY-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `CPP-BRIDGE-FINALITY-C1` | `CPP-BRIDGE-FINALITY-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `CPP-UTXO-CONSENSUS-C1` | `CPP-UTXO-CONSENSUS-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `CPP-WALLET-CUSTODY-C1` | `CPP-WALLET-CUSTODY-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `GO-COSMOS-SDK-C1` | `GO-COSMOS-SDK-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `GO-GETH-CLIENT-C1` | `GO-GETH-CLIENT-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `GO-RELAYER-ORACLE-C1` | `GO-RELAYER-ORACLE-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `IR-307` | `C-BRIDGE-FINALITY-C1`, `C-UTXO-CONSENSUS-C1`, `C-WALLET-CUSTODY-C1`, `CPP-BRIDGE-FINALITY-C1`, `CPP-UTXO-CONSENSUS-C1`, `CPP-WALLET-CUSTODY-C1`, `GO-COSMOS-SDK-C1`, `GO-GETH-CLIENT-C1`, `GO-RELAYER-ORACLE-C1`, `IR-303`, `IR-305`, `JS-NODE-KEEPER-ORACLE-C1`, `JS-NODE-RELAYER-C1`, `JS-NODE-TX-BUILDER-C1`, `LANG-190-HARNESS`, `LANG-200-HARNESS`, `MODEL-401`, `MODEL-407`, `RST-COSMWASM-C1`, `RST-NATIVE-CLIENT-C1`, `RST-NEAR-C1`, `RST-SOLANA-ANCHOR-C1`, `RST-SUBSTRATE-FRAME-C1`, `SOL-EVM-DEFI-C1`, `TS-NODE-KEEPER-ORACLE-C1`, `TS-NODE-RELAYER-SDK-C1`, `TS-NODE-TX-BUILDER-C1`, `VYP-EVM-DEFI-C1`, `X-COSMWASM-GO-RELAYER-C1`, `X-GO-C-FFI-C1`, `X-GO-CPP-FFI-C1`, `X-NEAR-JS-CLIENT-C1`, `X-SOL-TS-RELAYER-C1`, `X-SOLANA-TS-CLIENT-C1`, `X-TS-DATA-SOL-TX-C1`, `X-VYP-JS-KEEPER-C1` | 36 |
| `solguard-language-frontend-manifest.v1` / `v1` | `JS-NODE-KEEPER-ORACLE-C1` | `JS-NODE-KEEPER-ORACLE-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `JS-NODE-RELAYER-C1` | `JS-NODE-RELAYER-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `JS-NODE-TX-BUILDER-C1` | `JS-NODE-TX-BUILDER-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `RST-COSMWASM-C1` | `RST-COSMWASM-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `RST-NATIVE-CLIENT-C1` | `RST-NATIVE-CLIENT-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `RST-NEAR-C1` | `RST-NEAR-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `RST-SOLANA-ANCHOR-C1` | `RST-SOLANA-ANCHOR-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `RST-SUBSTRATE-FRAME-C1` | `RST-SUBSTRATE-FRAME-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `SOL-EVM-DEFI-C1` | `SOL-EVM-DEFI-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `TS-NODE-KEEPER-ORACLE-C1` | `TS-NODE-KEEPER-ORACLE-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `TS-NODE-RELAYER-SDK-C1` | `TS-NODE-RELAYER-SDK-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `TS-NODE-TX-BUILDER-C1` | `TS-NODE-TX-BUILDER-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `VYP-EVM-DEFI-C1` | `VYP-EVM-DEFI-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-COSMWASM-GO-RELAYER-C1` | `X-COSMWASM-GO-RELAYER-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-GO-C-FFI-C1` | `X-GO-C-FFI-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-GO-CPP-FFI-C1` | `X-GO-CPP-FFI-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-NEAR-JS-CLIENT-C1` | `X-NEAR-JS-CLIENT-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-SOL-TS-RELAYER-C1` | `X-SOL-TS-RELAYER-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-SOLANA-TS-CLIENT-C1` | `X-SOLANA-TS-CLIENT-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-TS-DATA-SOL-TX-C1` | `X-TS-DATA-SOL-TX-C2` | 1 |
| `solguard-language-frontend-manifest.v1` / `v1` | `X-VYP-JS-KEEPER-C1` | `X-VYP-JS-KEEPER-C2` | 1 |
| `solguard-language-scope-manifest.v1` / `v1` | `C-BRIDGE-FINALITY-C0` | `C-BRIDGE-FINALITY-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `C-UTXO-CONSENSUS-C0` | `C-UTXO-CONSENSUS-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `C-WALLET-CUSTODY-C0` | `C-WALLET-CUSTODY-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `CPP-BRIDGE-FINALITY-C0` | `CPP-BRIDGE-FINALITY-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `CPP-UTXO-CONSENSUS-C0` | `CPP-UTXO-CONSENSUS-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `CPP-WALLET-CUSTODY-C0` | `CPP-WALLET-CUSTODY-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `GO-COSMOS-SDK-C0` | `GO-COSMOS-SDK-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `GO-GETH-CLIENT-C0` | `GO-GETH-CLIENT-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `GO-RELAYER-ORACLE-C0` | `GO-RELAYER-ORACLE-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `JS-NODE-KEEPER-ORACLE-C0` | `JS-NODE-KEEPER-ORACLE-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `JS-NODE-RELAYER-C0` | `JS-NODE-RELAYER-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `JS-NODE-TX-BUILDER-C0` | `JS-NODE-TX-BUILDER-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `LANG-020-HARNESS` | `C-BRIDGE-FINALITY-C0`, `C-UTXO-CONSENSUS-C0`, `C-WALLET-CUSTODY-C0`, `CPP-BRIDGE-FINALITY-C0`, `CPP-UTXO-CONSENSUS-C0`, `CPP-WALLET-CUSTODY-C0`, `DECIDE-601`, `DECIDE-602`, `GO-COSMOS-SDK-C0`, `GO-GETH-CLIENT-C0`, `GO-RELAYER-ORACLE-C0`, `IR-301`, `IR-303`, `IR-305`, `JS-NODE-KEEPER-ORACLE-C0`, `JS-NODE-RELAYER-C0`, `JS-NODE-TX-BUILDER-C0`, `LANG-200-HARNESS`, `MODEL-401`, `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501`, `RST-COSMWASM-C0`, `RST-NATIVE-CLIENT-C0`, `RST-NEAR-C0`, `RST-SOLANA-ANCHOR-C0`, `RST-SUBSTRATE-FRAME-C0`, `SOL-EVM-DEFI-C0`, `TS-NODE-KEEPER-ORACLE-C0`, `TS-NODE-RELAYER-SDK-C0`, `TS-NODE-TX-BUILDER-C0`, `VYP-EVM-DEFI-C0`, `X-COSMWASM-GO-RELAYER-C0`, `X-GO-C-FFI-C0`, `X-GO-CPP-FFI-C0`, `X-NEAR-JS-CLIENT-C0`, `X-SOL-TS-RELAYER-C0`, `X-SOLANA-TS-CLIENT-C0`, `X-TS-DATA-SOL-TX-C0`, `X-VYP-JS-KEEPER-C0` | 41 |
| `solguard-language-scope-manifest.v1` / `v1` | `RST-COSMWASM-C0` | `RST-COSMWASM-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `RST-NATIVE-CLIENT-C0` | `RST-NATIVE-CLIENT-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `RST-NEAR-C0` | `RST-NEAR-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `RST-SOLANA-ANCHOR-C0` | `RST-SOLANA-ANCHOR-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `RST-SUBSTRATE-FRAME-C0` | `RST-SUBSTRATE-FRAME-C1`, `SCOPE-900` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `SOL-EVM-DEFI-C0` | `SCOPE-900`, `SOL-EVM-DEFI-C1`, `VERTICAL-EVM-SCOPE-001` | 3 |
| `solguard-language-scope-manifest.v1` / `v1` | `TS-NODE-KEEPER-ORACLE-C0` | `SCOPE-900`, `TS-NODE-KEEPER-ORACLE-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `TS-NODE-RELAYER-SDK-C0` | `SCOPE-900`, `TS-NODE-RELAYER-SDK-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `TS-NODE-TX-BUILDER-C0` | `SCOPE-900`, `TS-NODE-TX-BUILDER-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `VYP-EVM-DEFI-C0` | `SCOPE-900`, `VYP-EVM-DEFI-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-COSMWASM-GO-RELAYER-C0` | `SCOPE-900`, `X-COSMWASM-GO-RELAYER-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-GO-C-FFI-C0` | `SCOPE-900`, `X-GO-C-FFI-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-GO-CPP-FFI-C0` | `SCOPE-900`, `X-GO-CPP-FFI-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-NEAR-JS-CLIENT-C0` | `SCOPE-900`, `X-NEAR-JS-CLIENT-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-SOL-TS-RELAYER-C0` | `SCOPE-900`, `X-SOL-TS-RELAYER-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-SOLANA-TS-CLIENT-C0` | `SCOPE-900`, `X-SOLANA-TS-CLIENT-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-TS-DATA-SOL-TX-C0` | `SCOPE-900`, `X-TS-DATA-SOL-TX-C1` | 2 |
| `solguard-language-scope-manifest.v1` / `v1` | `X-VYP-JS-KEEPER-C0` | `SCOPE-900`, `X-VYP-JS-KEEPER-C1` | 2 |
| `solguard-live-authorization.v1` / `v1` | `MEASURE-901` | `EVAL-908`, `LIVE-913`, `LIVE-CAP-913`, `TEST-V8`, `VERTICAL-EVM-LIVE-001`, `VERTICAL-EVM-PROFILE-001` | 6 |
| `solguard-match-decision.v1` / `v1` | `EVAL-908` | `KNOWN-910` | 1 |
| `solguard-match-decision.v1` / `v1` | `MEASURE-901` | `DB-CAP-902`, `EVAL-908` | 2 |
| `solguard-maturity-baseline.v1` / `v1` | `GOV-001` | `GOV-004` | 1 |
| `solguard-measurement-report.v1` / `v1` | `EVAL-908` | `C-BRIDGE-FINALITY-C5A`, `C-BRIDGE-FINALITY-C5B`, `C-UTXO-CONSENSUS-C5A`, `C-UTXO-CONSENSUS-C5B`, `C-WALLET-CUSTODY-C5A`, `C-WALLET-CUSTODY-C5B`, `CPP-BRIDGE-FINALITY-C5A`, `CPP-BRIDGE-FINALITY-C5B`, `CPP-UTXO-CONSENSUS-C5A`, `CPP-UTXO-CONSENSUS-C5B`, `CPP-WALLET-CUSTODY-C5A`, `CPP-WALLET-CUSTODY-C5B`, `FINAL-002`, `FINAL-003`, `FINAL-006`, `GO-COSMOS-SDK-C5A`, `GO-COSMOS-SDK-C5B`, `GO-GETH-CLIENT-C5A`, `GO-GETH-CLIENT-C5B`, `GO-RELAYER-ORACLE-C5A`, `GO-RELAYER-ORACLE-C5B`, `JS-NODE-KEEPER-ORACLE-C5A`, `JS-NODE-KEEPER-ORACLE-C5B`, `JS-NODE-RELAYER-C5A`, `JS-NODE-RELAYER-C5B`, `JS-NODE-TX-BUILDER-C5A`, `JS-NODE-TX-BUILDER-C5B`, `KNOWN-910`, `LIVE-913`, `NOVELRUN-912`, `RST-COSMWASM-C5A`, `RST-COSMWASM-C5B`, `RST-NATIVE-CLIENT-C5A`, `RST-NATIVE-CLIENT-C5B`, `RST-NEAR-C5A`, `RST-NEAR-C5B`, `RST-SOLANA-ANCHOR-C5A`, `RST-SOLANA-ANCHOR-C5B`, `RST-SUBSTRATE-FRAME-C5A`, `RST-SUBSTRATE-FRAME-C5B`, `SOL-EVM-DEFI-C5A`, `SOL-EVM-DEFI-C5B`, `TS-NODE-KEEPER-ORACLE-C5A`, `TS-NODE-KEEPER-ORACLE-C5B`, `TS-NODE-RELAYER-SDK-C5A`, `TS-NODE-RELAYER-SDK-C5B`, `TS-NODE-TX-BUILDER-C5A`, `TS-NODE-TX-BUILDER-C5B`, `VERTICAL-EVM-HGEN-A-001`, `VERTICAL-EVM-HGEN-B-001`, `VERTICAL-EVM-HNOVEL-A-001`, `VERTICAL-EVM-HNOVEL-B-001`, `VERTICAL-EVM-LIVE-001`, `VYP-EVM-DEFI-C5A`, `VYP-EVM-DEFI-C5B`, `X-COSMWASM-GO-RELAYER-C5A`, `X-COSMWASM-GO-RELAYER-C5B`, `X-GO-C-FFI-C5A`, `X-GO-C-FFI-C5B`, `X-GO-CPP-FFI-C5A`, `X-GO-CPP-FFI-C5B`, `X-NEAR-JS-CLIENT-C5A`, `X-NEAR-JS-CLIENT-C5B`, `X-SOL-TS-RELAYER-C5A`, `X-SOL-TS-RELAYER-C5B`, `X-SOLANA-TS-CLIENT-C5A`, `X-SOLANA-TS-CLIENT-C5B`, `X-TS-DATA-SOL-TX-C5A`, `X-TS-DATA-SOL-TX-C5B`, `X-VYP-JS-KEEPER-C5A`, `X-VYP-JS-KEEPER-C5B` | 71 |
| `solguard-measurement-report.v1` / `v1` | `MEASURE-901` | `DB-CAP-902`, `EVAL-908` | 2 |
| `solguard-metric-provenance.v1` / `v1` | `EVAL-908` | `FINAL-004` | 1 |
| `solguard-metric-provenance.v1` / `v1` | `MEASURE-901` | `DB-CAP-902`, `EVAL-908` | 2 |
| `solguard-product-artifact-manifest.v1` / `v1` | `RUN-208` | `EVAL-908`, `PLAT-801`, `PLAT-803-BACKEND`, `PLAT-804` | 4 |
| `solguard-proof-certificate.v1` / `v1` | `PROOF-507` | `DECIDE-601`, `DECIDE-602`, `DECIDE-604`, `PROOF-508` | 4 |
| `solguard-proof-certificate.v1` / `v1` | `PROOF-508` | `DECIDE-601` | 1 |
| `solguard-proof-obligation.v1` / `v1` | `PROOF-501` | `DECIDE-601`, `PROOF-502`, `PROOF-503-ECONOMIC`, `PROOF-503-INVARIANT`, `PROOF-503-MAP`, `PROOF-503-TRACE`, `PROOF-503-VALUE`, `PROOF-507` | 8 |
| `solguard-protocol-model.v1` / `v1` | `MODEL-401` | `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 4 |
| `solguard-review-envelope.v1` / `v1` | `DECIDE-604` | `EVAL-908`, `PLAT-801`, `PLAT-804` | 3 |
| `solguard-review-envelope.v1` / `v1` | `TRUTH-105` | `DECIDE-604` | 1 |
| `solguard-run-manifest.v1` / `v1` | `RUN-208` | `CANARY-909`, `PLAT-801`, `PLAT-803-BACKEND` | 3 |
| `solguard-run-spec.v1` / `v1` | `RUN-202` | `PLAT-803-BACKEND`, `RUN-203`, `RUN-207-DEPLOY`, `RUN-207-DIFF`, `RUN-207-DISCOVER`, `RUN-207-E2E`, `RUN-207-ECONOMIC`, `RUN-207-FILTER`, `RUN-207-INVARIANT`, `RUN-207-MAP`, `RUN-207-TRACE`, `RUN-207-VALIDATE`, `RUN-207-VALUE` | 13 |
| `solguard-run-telemetry.v1` / `v1` | `PLAT-803-CORE` | `EVAL-908`, `PLAT-803-BACKEND`, `PLAT-803-E2E` | 3 |
| `solguard-scope-proof.v1` / `v1` | `ISO-904` | `FINAL-005`, `FINAL-006` | 2 |
| `solguard-scope-proof.v1` / `v1` | `SCOPE-900` | `ISO-904` | 1 |
| `solguard-scope-proof.v1` / `v1` | `VERTICAL-EVM-SCOPE-001` | `VERTICAL-EVM-ISO-001` | 1 |
| `solguard-semantic-ir.v1` / `v1` | `IR-301` | `DECIDE-601`, `IR-303`, `IR-305`, `MODEL-401`, `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 8 |
| `solguard-source-authority.v1` / `v1` | `RUN-202` | `DECIDE-601`, `IR-301`, `IR-303`, `IR-305`, `MODEL-401`, `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 9 |
| `solguard-task-evidence.v1` / `v1` | `GOV-004` | `LEDGER-001` | 1 |
| `solguard-technical-verdict.v1` / `v1` | `DECIDE-601` | `DECIDE-602`, `DECIDE-604`, `PLAT-801`, `PLAT-803-BACKEND`, `PLAT-804` | 5 |
| `solguard-technical-verdict.v1` / `v1` | `TRUTH-101` | `TRUTH-103`, `TRUTH-105`, `TRUTH-108`, `TRUTH-109`, `TRUTH-110` | 5 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-DIFF` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-DISCOVER` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-ECONOMIC` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-FILTER` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-INVARIANT` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-MAP` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-TRACE` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-VALIDATE` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-tool-phase.v1` / `v1` | `RUN-207-VALUE` | `PLAT-803-BACKEND`, `PLAT-803-E2E`, `RUN-207-CORE-CUTOVER` | 3 |
| `solguard-trace-graph.v1` / `v1` | `IR-303` | `DECIDE-601`, `MODEL-401`, `MODEL-403`, `MODEL-405`, `MODEL-407`, `PROOF-501` | 6 |
| `solguard-truth-item.v1` / `v1` | `CORPUS-905` | `KNOWN-910` | 1 |
| `solguard-truth-item.v1` / `v1` | `MEASURE-901` | `CORPUS-905`, `DB-CAP-902`, `NOVEL-907` | 3 |
| `solguard-truth-item.v1` / `v1` | `NOVEL-907` | `NOVELRUN-912` | 1 |

La expansión contribution→contract permanece machine-readable en `contributions[].dependencies`.

<!-- GENERATED:ASSURANCE-PROFILES:BEGIN -->
### 4.0 Perfil de assurance y custodia

El par `assurance_mode`/`assurance_level` es obligatorio en ledger, event, lease, authoritative head, derived evaluation y commit receipt; debe coincidir durante toda la cadena.

| Modo | Nivel | Claves Ed25519 | Custodios | Claim permitido |
|---|---|---:|---:|---|
| `production` | `independent-custodians` | 4 distintas | 4 distintos | independencia de custodia |
| `development` | `single-custodian` | 4 distintas | exactamente 1 declarado | sólo ejecución single-custodian; independencia prohibida |

Ambos modos rechazan key IDs, human identities o material público Ed25519 duplicado. Cambiar el perfil tras genesis exige nueva versión de programa y nueva genesis. El modo development no satisface gates ni claims que exigen custodios, holdouts, evaluadores o adjudicadores humanos independientes.

En el snapshot activo development, cada `verifier_descriptor` se rotula `single_custodian_verification` (o su variante de contribution) y separa rol, contexto, credencial y clave bajo el mismo custodio declarado; no usa etiquetas de verificación independiente. El perfil production conserva los descriptores independientes.
<!-- GENERATED:ASSURANCE-PROFILES:END -->

## 4. Schema `solguard-acceptance-ledger.v1`

<!-- GENERATED:LEDGER-CONFORMANCE:BEGIN -->
### 4.0A Snapshot de conformidad solguard-detection-maturity-2026-07-25.4

La autoridad machine-readable contiene 1671 ítems. Eventos y receipts usan JCS, CAS, lease/fencing y timestamp 2-of-2.

| Candidate | Evaluation | Release | Required pass | Claims | Observations | Tooling |
|---|---:|---:|---:|---:|---:|---:|
| `RC-V-EVM-1` | 537 | 538 | 536 | 1 | 26 | 409 |
| `RC-FULL-1` | 1633 | 1644 | 1627 | 6 | 144 | 1103 |

Candidate set root = SHA-256(UTF8(domain) || 0x00 || RFC8785_JCS(payload cerrado)); cada closure member fija kind, ID y version.
<!-- GENERATED:LEDGER-CONFORMANCE:END -->

El JSON es el contrato ejecutable seed. Contiene 568 nodos (440 primary y 128 derived), 1103 contributions owner-únicas y 1671 ítems contados. Los tres hashes congelados son:

| Set | SHA-256 |
|---|---|
| nodes | `5a863f9b9321d38d25e8c7a8722cab7bba3b7d2d2d0acbf0979fda99fcdbeab6` |
| contributions | `c8ea62ea5c4b1c794fa9c39a732ff068f615a03bb249f52e98dd621831c3d37c` |
| closure type-prefixed | `02af08df9cd4acd7f09a8171806b8baccc4fb6ebff335afd86cea2ccb34b78b6` |

`kind` de nodo es `primary|derived`; contribution es una colección top-level distinta y nunca se disfraza de nodo. Todo primary tiene `operational=false`, `evidence_mode`, `required_contribution_ids[]`, predicate cerrado y descriptor de evidencia compatible con el modo. Todo derived tiene owner null, no tiene `evidence_mode`, y sus dependencies hard coinciden byte por byte con `formula.operands`.

Cada contribution declara `contribution_id`, `parent_primary_id`, `declared_parent_id`, `owner_repo`, state/version, node/contract dependencies, `hard_contribution_dependencies[]`, source row, expected commit o receipt, predicate, evidence, verifier y acceptance roots. `acceptance.accepted_implementation_ref` es una union cerrada: `commit_sha` liga commit, repository tree y publication receipt; `absence_tree_receipt` liga tree digest, bounded inventory y absence receipt. Empieza en null, se materializa al aceptar y entra en `dependency_state_hash` y reopen history. El Task ID, branch y footer son el contribution ID; el parent no puede usarse como branch multi-repo.

### 4.1 Event log, snapshot y dispatcher cerrado

El objeto autoritativo de cada evento se crea una sola vez en
`ledger/events/<zero-padded-sequence>-<event_id>.json`. JSONL vive bajo
`ledger/indexes/<ledger_revision>-<index_root>.jsonl` y es sólo una vista
regenerada no autoritativa. Después del freeze, snapshot y checklist viven
create-once en el evidence store externo:

`ledger/snapshots/<ledger_revision>-<ledger_root>.json` y
`ledger/checklists/<ledger_revision>-<checklist_root>.md`.

`acceptance-ledger.v1.json` y `07_CHECKLIST_MAESTRA.md` dentro del repo son seed/spec baseline y no se escriben postfreeze. Cada revisión externa liga program/version, los tres ID-set hashes, previous snapshot root, event object set root, signer role/key/signature y timestamp receipts. Un commit receipt create-once liga refs+digests del event object, snapshot y checklist, la revision, previous/new ledger root y firma. El receipt no pertenece a ninguna preimagen que él mismo liga.

La union de operaciones es exactamente:

`genesis_batch | accept_contribution | reopen_contribution | accept_primary | reopen_primary | record_validation | record_freeze_attestation | record_campaign | record_measurement | record_database_cutover | record_final_evidence | accept_release_pre_tag | accept_post_tag_terminal | materialize_derived`.

| Operación | Target/perfil | Regla bloqueante |
|---|---|---|
| `genesis_batch` | 9 contributions + GOV-001/GOV-003/GOV-004/LEDGER-001 | un tentative post-state atómico en el orden intercalado exacto de JSON; fallo deja ledger ausente |
| `accept_contribution` | contribution implementation/absence receipt | owner exacto, deps contribution accepted, SHA/receipt publicado, evidence root único y verifier independiente; genesis members prohibidos |
| `reopen_contribution` | contribution accepted | conserva roots/version anterior; reabre parent y todo dependiente/derived/claim transitivo |
| `accept_primary` | implementation | required contribution set exacto accepted + integration E2E; missing/extra/reused evidence falla |
| `record_validation` | validation | validation_context; ningún campo campaign/Git |
| `record_freeze_attestation` | freeze | liga los 7 eventos OP-PREFREEZE exactos y el mismo SHA/tree/manifest candidate |
| `record_campaign` | campaign subtype | corpus snapshot, H-GEN/H-NOVEL pair seal o bounty-vertical preregistration |
| `record_measurement` | measurement subtype | cardinalidad exacta por subtype; C5A/B son 60 eventos distintos |
| `record_database_cutover` | DB-902 | state machine operational, create-once, shadow/rollback/guards; jamás commits de tooling |
| `record_final_evidence` | FINAL-001..005 | una transición por owner/verifier; sin DSSE/tag |
| `accept_release_pre_tag` | FINAL-006 | RELEASE-914, dossier release_pre_tag, DSSE threshold y ausencia de tags |
| `accept_post_tag_terminal` | FINAL-007 | tentative post-state dinámico, receipt 15/15, cero pending/reopened y CLAIM-007 true |
| `materialize_derived` | derived operacional | receipt de formula/operands/verifier; nunca escribe state derived |

Evidence mode primary exacto:

`bootstrap | implementation | validation | freeze_attestation | campaign | measurement | database_cutover | final_evidence | release_pre_tag | post_tag_terminal`.

Measurement subtype exacto:

`canary_validation | known_campaign | h_gen_scope_replica | h_gen_pair_aggregate | h_novel_pair_aggregate | live_auth_campaign | chaos_validation`.

Cada descriptor es `closed=true`. Sólo implementation/contribution commit permite Git fields. Ceremony, absence receipt y derived los prohíben. Campos no aplicables deben estar ausentes; null, placeholder o payload de otro branch falla schema.

Genesis exacto:

`C0-001 -> GOV-001 -> C0-003 -> GOV-003 -> C0-004 -> GOV-004 -> C0-012 -> C0-013/C0-014 -> C0-015 -> C0-016 -> C0-017 -> LEDGER-001`.

Las dependencias intra-batch se evalúan sobre el mismo tentative post-state. No se exige estado preexistente dentro del evento, no se persiste un prefijo y no se permite `accept_contribution` previo al genesis.


### 4.2 Manifest del dossier de aceptación

El dossier se resuelve por
`schema_version=solguard-acceptance-dossier-manifest.v1`, nunca por una lista de
filenames. Su field set canónico es `dossier_id`, `dossier_revision`,
`revision_role`, `previous_dossier_manifest_id?`,
`previous_dossier_manifest_root?`, `release_id`, `campaign_ids[]`,
`candidate_root`, `entries[]`, `cumulative_entry_count`,
`cumulative_entries_root`, `signatures[]`,
`external_timestamp_receipts[]` y `self_hash`. `revision_role` es el enum top-level
hasheado `evidence_revision | release_pre_tag | post_tag_terminal`.

Cada entry usa `artifact_id`, `artifact_role`, `payload_contract_id`,
`payload_contract_version`, `role_schema_digest`, `media_type`, `producer`,
`parent_artifact_ids[]`, `content_digest`, `byte_size`, `confidentiality`,
`signature_refs[]`, `timestamp_refs[]`, `locator` y
`supersedes_artifact_id?`. Contract ID/version aplican a payload contractual;
`role_schema_digest` aplica al role interno. `locator` sólo localiza bytes y no
participa en identidad. Rename, swap, duplicate ID/role, missing required role,
unknown role, digest mismatch y payload interrepo sin contrato registrado son
negativos obligatorios.

Los dos roots no son intercambiables:

```text
cumulative_entries_root =
  SHA256(UTF8("solguard/dossier-entries/v1") || 0x00 ||
         RFC8785_JCS(entries sorted ascending by artifact_id))

self_hash = SHA256(
  UTF8("solguard/self-hash/" ||
       "solguard-acceptance-dossier-manifest.v1") || 0x00 ||
  RFC8785_JCS(manifest omitting exactly top-level self_hash,
             signatures and external_timestamp_receipts)
)
```

Durante la preimagen los tres campos top-level omitidos están ausentes —no
`null`, vacíos o placeholders—; `entries[].signature_refs[]` y
`entries[].timestamp_refs[]` sí forman parte de la preimagen.
El cálculo cubre también `entries=[]`. Cada elemento top-level de
`signatures[]` y `external_timestamp_receipts[]` liga explícitamente el
`self_hash`; cambiarlo, reutilizarlo en otra revisión o firmar otro domain
falla.
`previous_dossier_manifest_root` referencia exactamente el `self_hash` del
predecessor; no su entries root ni bytes con otra canonicalización. El DSSE
cubre los bytes canónicos finales que ya contienen `self_hash`. Incluir el hash
en su preimagen, usar canonicalización alternativa, cambiar orden semántico,
inyectar null o confundir ambos roots falla cerrado.

Sólo genesis omite ambos campos `previous_*`. Cada revisión es create-only y su
conjunto acumulado de entries debe ser un superset byte-exact del anterior: no
se borra, sustituye ni reordena evidencia. Una corrección crea una entry nueva
con `supersedes_artifact_id`; «latest filename» jamás da autoridad.
Delete/replace/reorder, predecessor ID/root incorrecto o caída de count falla.
El dossier `evidence_revision` de `FINAL-001` establece el `self_hash`
pre-release que toda revisión posterior debe encadenar y conservar, incluidos
fallos y riesgos.

No existe un segundo contrato ad hoc para el manifest de release. La instancia
con `revision_role=release_pre_tag` usa este mismo
`solguard-acceptance-dossier-manifest.v1`, se emite después de que
`RELEASE-914` sea true y queda envuelta por DSSE. Sus entries obligatorias
incluyen los quince repo SHAs y targets/nombres de tags a realizar, release BOM/closures,
`pre_promotion_ledger_root`, campaign/report roots, límites y el receipt de
rollback; encadena exactamente el dossier `self_hash` de `FINAL-001`. `FINAL-006`
consume esa instancia exacta; un dossier pre-release, un tag mutable o una
envoltura DSSE inválida no la sustituye.

La envoltura DSSE admite exactamente
`payloadType=application/vnd.solguard.acceptance-dossier-manifest.v1+jcs` y
`payload` es base64 estándar de los bytes RFC8785/JCS finales de la revisión
`release_pre_tag`, ya con `self_hash`. Cada firma cubre el PAE exacto:

```text
DSSEv1 SP len(payloadType) SP payloadType SP
len(payload_bytes) SP payload_bytes
```

Key IDs, algoritmos, roles, thresholds, vigencia y revocación proceden del key
map firmado y preregistrado. Alias o type vacío, digest-only, unknown/duplicate
o revoked key, threshold incompleto, reserialización del payload o firma válida
bajo otro payloadType falla cerrado.

Tras FINAL-006 se crean los tags firmados. El verificador emite
`artifact_role=tag_realization_receipt` como entry interna del dossier con
`role_schema_digest` congelado: release ID, los 15 tag names, tag object IDs,
target commit IDs y signatures, digest del release manifest/DSSE,
`final_006_event_id`, `final_006_event_self_hash` y el ledger root exacto,
identidad/firma del verifier y timestamps externos. Un precondition receipt
demuestra que todos los tag names/refs estaban ausentes antes de FINAL-006;
cada tag conserva creation receipt y audit receipt timestamped externamente
después de ese evento. Tag preexistente, recreated, borrado, target cambiado o
timestamp Git backdated falla. Todo intento parcial se preserva; cualquier
valor distinto de 15/15 falla el release. El dossier builder añade una nueva
revision `post_tag_terminal` create-only que conserva todo lo anterior y
`FINAL-007` consume esa
revision mediante `solguard-acceptance-dossier-manifest.v1`; no existe otro
contract ID para el receipt.

## 5. Reapertura y versionado

`reopen_primary` y `reopen_contribution` son transacciones create-once. Conservan state/version/evidence/verifier/dependency/context roots históricos, motivo tipado, invalidation artifact y signer autorizado. Después incrementan versión y marcan `reopened` al target mutable y al parent si el target es contribution. Para derived/claims invalida el evaluation/materialization receipt y recalcula `computed_state=unsatisfied`; nunca les escribe `reopened`. La invalidación alcanza todos los consumidores hard/contract, integration gates y release gates transitivos antes de persistir; partial reopen falla entero.

Una contribution reabierta no puede ser sustituida por otra repo/commit ni borrarse del required set. Para reaceptarla se repiten deps, publicación exacta, evidence/verifier independientes y luego el parent integra E2E otra vez. Old roots permanecen auditables; un evento nuevo nunca reescribe un objeto anterior.

Cambiar ID-set, formula, owner, parent, contract edge, predicate, evidence branch o cardinalidad requiere nueva versión congelada, no una aceptación ordinaria.

## 6. Identidad, counts y cierre

Snapshot exacto: **440 primary**, **128 derived**, **1103 contributions** = **1671 ítems contados**.

Completitud global: implementation primaries accepted; contributions accepted; primary terminalizables terminales; derived materializados; cero pending/reopened dentro del release train; `RC-FULL-1-CLOSE=closed_pass`; `FINAL-007` accepted; y `CLAIM-007=true` en el mismo tentative post-state.

`FINAL-007` cuantifica exclusivamente sobre el release train versionado de `RC-FULL-1`; no reinterpreta epochs históricos.

## 7. Umbrellas multi-repo y children de owner único

Los siguientes IDs padre son derived. Cada child es primary, tiene un único
owner y produce su propio evidence root. El child `*-E2E` es una verificación
real entre repositorios, no una suma de unit tests.

### 7.1 RUN-207

| Primary child | Owner | Hard dependencies |
|---|---|---|
| `RUN-207-MAP` | `solguard-map` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-TRACE` | `solguard-trace` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-DISCOVER` | `solguard-discover` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-ECONOMIC` | `solguard-economic` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-INVARIANT` | `solguard-invariant` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-VALUE` | `solguard-value` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-VALIDATE` | `solguard-validate` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-FILTER` | `solguard-filter` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-DIFF` | `solguard-diff` | `RUN-201`, `RUN-203`, `RUN-207-DEPLOY` reader gate |
| `RUN-207-CORE-READER` | `solguard-core` | `RUN-201`, `RUN-203`; se publica antes que writers nuevos |
| `RUN-207-CORE-CUTOVER` | `solguard-core` | los nueve tool children, readers compatibles y telemetría legacy a cero |
| `RUN-207-DATABASE` | `solguard-database` | `RUN-207-CORE-READER` |
| `RUN-207-BACKEND` | `solguard-backend` | `RUN-207-CORE-READER`, `RUN-207-DATABASE` |
| `RUN-207-DEPLOY` | `solguard-deploy` | `RUN-207-CORE-READER`, `RUN-207-DATABASE`, `RUN-207-BACKEND` |
| `RUN-207-E2E` | `solguard-deploy` | los catorce owner children anteriores |

```text
RUN-207 = AND(
  RUN-207-MAP, RUN-207-TRACE, RUN-207-DISCOVER, RUN-207-ECONOMIC,
  RUN-207-INVARIANT, RUN-207-VALUE, RUN-207-VALIDATE, RUN-207-FILTER,
  RUN-207-DIFF, RUN-207-CORE-READER, RUN-207-CORE-CUTOVER,
  RUN-207-DATABASE, RUN-207-BACKEND, RUN-207-DEPLOY, RUN-207-E2E
)
```

DISCOVER publica `solguard-protocol-model.v1` y
`solguard-hypothesis-envelope.v1`. Sólo CORE publica
`solguard-canonical-candidate.v1`.

`RUN-208` tiene dependencia hard de `RUN-207`, `RUN-202`, `RUN-203` y
`RUN-206`: el manifest final se construye después de cerrar la publicación
tool-owned, nunca al revés.

### 7.2 MODEL-408

| Primary child | Owner | Hard dependencies |
|---|---|---|
| `MODEL-408-TRACE` | `solguard-trace` | `IR-303`, `MODEL-401` |
| `MODEL-408-DISCOVER` | `solguard-discover` | `MODEL-401`, `MODEL-408-TRACE` |
| `MODEL-408-ECONOMIC` | `solguard-economic` | `MODEL-403`, `MODEL-408-TRACE` |
| `MODEL-408-E2E` | `solguard-deploy` | los tres children anteriores |

```text
MODEL-408 = AND(
  MODEL-408-TRACE, MODEL-408-DISCOVER,
  MODEL-408-ECONOMIC, MODEL-408-E2E
)
```

### 7.3 PROOF-503

| Primary child | Owner | Hard dependencies |
|---|---|---|
| `PROOF-503-MAP` | `solguard-map` | `PROOF-502`, `IR-301` |
| `PROOF-503-TRACE` | `solguard-trace` | `PROOF-502`, `IR-303` |
| `PROOF-503-ECONOMIC` | `solguard-economic` | `PROOF-502`, `MODEL-403` |
| `PROOF-503-VALUE` | `solguard-value` | `PROOF-501`, `PROOF-502` |
| `PROOF-503-INVARIANT` | `solguard-invariant` | `PROOF-502`, `MODEL-405` |
| `PROOF-503-E2E` | `solguard-deploy` | los cinco provider children, `RUN-204` |

```text
PROOF-503 = AND(
  PROOF-503-MAP, PROOF-503-TRACE, PROOF-503-ECONOMIC,
  PROOF-503-VALUE, PROOF-503-INVARIANT, PROOF-503-E2E
)
```

### 7.4 DECIDE-603

| Primary child | Owner | Hard dependencies |
|---|---|---|
| `DECIDE-603-CORE` | `solguard-core` | `DECIDE-601`, `DECIDE-602` |
| `DECIDE-603-VALIDATE` | `solguard-validate` | `DECIDE-601`, `TRUTH-101` |
| `DECIDE-603-DEPLOY` | `solguard-deploy` | `TRUTH-106`, `MEASURE-901` |
| `DECIDE-603-E2E` | `solguard-deploy` | los tres children anteriores, `ISO-904` |

```text
DECIDE-603 = AND(
  DECIDE-603-CORE, DECIDE-603-VALIDATE,
  DECIDE-603-DEPLOY, DECIDE-603-E2E
)
```

### 7.5 PLAT-803

| Primary child | Owner | Hard dependencies |
|---|---|---|
| `PLAT-803-CORE` | `solguard-core` | `RUN-202..208` aceptados |
| `PLAT-803-BACKEND` | `solguard-backend` | `PLAT-803-CORE`, `TRUTH-108` |
| `PLAT-803-E2E` | `solguard-deploy` | los dos children anteriores |

```text
PLAT-803 = AND(PLAT-803-CORE, PLAT-803-BACKEND, PLAT-803-E2E)
```

## 8. Primary adicionales que no eran WPs completos en `02`

Esta tabla clasifica explícitamente los IDs adicionales de `07`. `Predicate`
significa que el bundle debe demostrar literalmente el resultado descrito en
la checklist y los negativos correspondientes; no basta un commit.

| ID | Kind | Owner | Hard dependencies |
|---|---|---|---|
| `GOV-005` | primary | `solguard-docs` | `GOV-001` |
| `GOV-006` | primary | `solguard-agents` | `GOV-004` |
| `GOV-007` | primary | `solguard-agents` | `GOV-004` |
| `GOV-008` | primary | `solguard-agents` | `GOV-003`; preregistro/freeze temprano del scope, sin attestation tardía |
| `TRUTH-109` | primary | `solguard-database` | `TRUTH-105`, `PLAT-801` |
| `TRUTH-110` | primary | `solguard-deploy` | `TRUTH-101..109` |
| `RUN-209` | primary | `solguard-core` | `RUN-207`, `RUN-208` |
| `RUN-210` | primary | `solguard-core` | `RUN-203`, `RUN-208` |
| `IR-306` | primary | `solguard-diff` | `IR-301`, `IR-305` |
| `IR-307` | primary | `solguard-map` | `IR-301`, `IR-304` |
| `IR-308` | primary | `solguard-trace` | `IR-303`, `IR-304`; emite el receipt causal TRACE separado |
| `MODEL-409` | primary | `solguard-deploy` | `MODEL-401..408` |
| `MODEL-410` | primary | `solguard-economic` | `MODEL-403` |
| `PROOF-505` | primary | `solguard-value` | `MODEL-403`, `PROOF-501`, `MODEL-410` |
| `PROOF-509` | primary | `solguard-core` | `PROOF-504` |
| `PROOF-510` | primary | `solguard-deploy` | `PROOF-507`, `DECIDE-601` |
| `DECIDE-606` | primary | `solguard-validate` | `DECIDE-601` |
| `DECIDE-607` | primary | `solguard-core` | `TRUTH-103`, `DECIDE-604` |
| `DECIDE-608` | primary | `solguard-filter` | `TRUTH-102`, `DECIDE-602` |
| `PLAT-807` | primary | `solguard-backend` | `PLAT-803` |
| `PLAT-808` | primary | `solguard-backend` | `PLAT-803`, `RUN-205` |
| `PLAT-809` | primary | `solguard-database` | `PLAT-802` |
| `PLAT-810` | primary | `solguard-backend` | `PLAT-804`, `TRUTH-106` |
| `LEDGER-001` | primary | `solguard-agents`; verificador independiente `solguard-deploy` | `GOV-003`, `GOV-004`; schemas/readers/event writer tempranos |

`LEDGER-001` implementa el verificador del DAG, el cálculo de ID-set y
dependency-state hashes, descriptors de evidencia, firmas autorizadas,
reapertura transitiva y regeneración de `07`. Su verificador independiente es
AGENTS/governance y debe probar ciclos, alias, owner ausente, firma no
autorizada, evidencia mutable y drift de versión.

## 9. Cierre derivado por repositorio

Cada `REPO-*` es derived. Su fórmula no contiene un checkbox manual ni depende
de otro `REPO-*`.

| Derived ID | Fórmula exacta `AND(...)` |
|---|---|
| `REPO-VALUE` | `RUN-207-VALUE, PROOF-501, PROOF-503-VALUE, PROOF-505, PROOF-506, PROOF-507, PROOF-508, LANG-200, TEST-V0, TEST-V1, TEST-V2, TEST-NEG` |
| `REPO-VALIDATE` | `TRUTH-101, TRUTH-102, RUN-207-VALIDATE, PROOF-508, DECIDE-601, DECIDE-603-VALIDATE, DECIDE-606, LANG-080, LANG-200, TEST-V0, TEST-V1, TEST-NEG` |
| `REPO-TRACE` | `TRUTH-104, RUN-207-TRACE, IR-303, IR-308, MODEL-408-TRACE, PROOF-503-TRACE, LANG-040, LANG-200, TEST-V0, TEST-V1, TEST-META` |
| `REPO-MAP` | `RUN-207-MAP, IR-301, IR-302, IR-304, IR-307, PROOF-503-MAP, LANG-010, LANG-050A, LANG-200, TEST-V0, TEST-V1, TEST-META` |
| `REPO-INVARIANT` | `RUN-207-INVARIANT, MODEL-405, PROOF-503-INVARIANT, LANG-200, TEST-V0, TEST-V1, TEST-V2, TEST-NEG` |
| `REPO-FILTER` | `TRUTH-103, RUN-207-FILTER, DECIDE-602, DECIDE-605, DECIDE-608, LANG-080, LANG-200, TEST-V0, TEST-V1, TEST-NEG` |
| `REPO-ECONOMIC` | `RUN-207-ECONOMIC, MODEL-403, MODEL-404, MODEL-408-ECONOMIC, MODEL-410, PROOF-503-ECONOMIC, PROOF-505, LANG-060, LANG-200, TEST-V2, TEST-NEG` |
| `REPO-DOCS` | `GOV-002, GOV-005, PLAT-806, LANG-000, DECIDE-604, EVAL-908, LEDGER-001` |
| `REPO-DISCOVER` | `TRUTH-104, RUN-207-DISCOVER, MODEL-401, MODEL-402, MODEL-406, MODEL-408-DISCOVER, LANG-050B, LANG-200, TEST-V2, TEST-META` |
| `REPO-DIFF` | `RUN-207-DIFF, IR-305, IR-306, LANG-090, LANG-200, TEST-V0, TEST-META` |
| `REPO-DEPLOY` | `GOV-001, TRUTH-106, TRUTH-107, TRUTH-110, RUN-207-DEPLOY, RUN-207-E2E, MODEL-408-E2E, PROOF-503-E2E, DECIDE-603-DEPLOY, DECIDE-603-E2E, PLAT-803-E2E, LEDGER-001, SCOPE-900, MEASURE-901, BOM-903, ISO-904, TEST-V0..V8, TEST-NEG, TEST-META, TEST-CHAOS, RUN-208, DECIDE-604, DECIDE-601, DECIDE-602` |
| `REPO-DATABASE` | `TRUTH-109, RUN-207-DATABASE, PLAT-801, PLAT-802, PLAT-809, DB-902, MEASURE-901, TEST-V0, TEST-CHAOS, RUN-208, DECIDE-604, DECIDE-601, DECIDE-602` |
| `REPO-CORE` | `TRUTH-105, RUN-201..210, MODEL-406, MODEL-407, PROOF-502, PROOF-504, PROOF-509, DECIDE-603-CORE, DECIDE-604, DECIDE-607, PLAT-803-CORE, SCOPE-900, TEST-V0, TEST-V1, TEST-CHAOS` |
| `REPO-BACKEND` | `TRUTH-108, RUN-206, RUN-208, RUN-207-BACKEND, PLAT-803-BACKEND, PLAT-804, PLAT-807, PLAT-808, PLAT-810, TEST-V0, TEST-CHAOS, DECIDE-604, DECIDE-602` |
| `REPO-AGENTS` | `GOV-003, GOV-004, GOV-006, GOV-007, GOV-008, PLAT-805, LEDGER-001, ISO-904` |

En las fórmulas, un rango como `TEST-V0..V8` es expandido por el JSON real a
operandos individuales; el runtime del ledger no admite rangos.

## 10. Ledger de lenguaje

### 10.1 Infraestructura: primary y derived

| ID | Kind | Owner o fórmula exacta |
|---|---|---|
| `LANG-000` | primary | owner `solguard-docs`; hard `GOV-002` |
| `LANG-010-HARNESS` | primary | owner `solguard-map`; hard `IR-301` |
| `LANG-010` | derived | `AND(LANG-010-HARNESS, EVERY_SCOPE(C1))` |
| `LANG-020-HARNESS` | primary | owner `solguard-deploy`; schema/goldens reader-first, sin dependencia de BOM tardío |
| `LANG-020` | derived | `AND(LANG-020-HARNESS, EVERY_SCOPE(C0))` |
| `LANG-030-HARNESS` | primary | owner `solguard-deploy`; hard `RUN-208` |
| `LANG-030` | derived | `AND(LANG-030-HARNESS, EVERY_SCOPE(C1), TEST-V3)` |
| `LANG-040-HARNESS` | primary | owner `solguard-trace`; hard `IR-303` |
| `LANG-040` | derived | `AND(LANG-040-HARNESS, EVERY_SCOPE(C3))` |
| `LANG-050A` | primary | owner `solguard-map`; hard `LANG-010` |
| `LANG-050B` | primary | owner `solguard-discover`; hard `LANG-050A`, `MODEL-401` |
| `LANG-050C` | primary | owner `solguard-core`; hard `LANG-050A`, `LANG-050B`, `MODEL-407` |
| `LANG-050` | derived | `AND(LANG-050A, LANG-050B, LANG-050C, EVERY_SCOPE(C4), TEST-V4)` |
| `LANG-060` | primary | owner `solguard-economic`; hard `MODEL-404`, `LANG-050A`, `LANG-050B`, `LANG-050C` |
| `LANG-070` | primary | owner `solguard-core`; hard `PROOF-502`, `PROOF-503`, `LANG-040` |
| `LANG-080-VALIDATE` | primary | owner `solguard-validate`; hard `DECIDE-601`, `LANG-070` |
| `LANG-080-FILTER` | primary | owner `solguard-filter`; hard `DECIDE-602`, `LANG-080-VALIDATE` |
| `LANG-080` | derived | `AND(LANG-080-VALIDATE, LANG-080-FILTER, EVERY_SCOPE(C4), TEST-NEG)` |
| `LANG-090-HARNESS` | primary | owner `solguard-diff`; hard `IR-305` |
| `LANG-090` | derived | `AND(LANG-090-HARNESS, EVERY_SCOPE(C4), TEST-META)` |
| `LANG-190-HARNESS` | primary | owner `solguard-deploy`; hard `MODEL-409` |
| `LANG-190` | derived | `AND(LANG-190-HARNESS, EVERY_SCOPE(C4), TEST-NEG, TEST-META)` |
| `LANG-200-HARNESS` | primary | owner `solguard-deploy`; contratos `IR-307`, `IR-308`, `LANG-020-HARNESS`; certifier prefreeze probado con fixtures, sin artefactos C7 |

Los IDs `LANG-100..200` son gates derived y nunca aparecen en un commit. Un
commit de harness usa exclusivamente su ID `*-HARNESS`; una certificación usa
`solguard-language-certification.v1` post-scan.

### 10.2 Paquetes de lenguaje derivados e integración owner-única

Los 39 IDs `LANG-(SOL|VYP|RUST|GO|C|CPP|JS|TS|X)-*` que no son harness son **derived**, no branches ni work packages. Cada uno es `AND(<ID>-INTEGRATION)`. Su `<ID>-INTEGRATION` es el primary owner del cierre E2E y enumera todas las contributions exactas de `06`. Esto elimina el antiguo owner ficticio deploy sobre commits de MAP/TRACE/DISCOVER/ECONOMIC/etc.

Cada contribution tiene branch/footer propio y deps contribution. El integrador no puede aceptar el package hasta que el conjunto exacto esté accepted y haya replay E2E. Reopen de una contribution reabre integration, package y consumidores. La tabla exacta de 39 pares está en §16.2.

Los 30 scopes mantienen C0 owner deploy, C1/C2 owner map, C3 owner trace y C4 owner deploy-integrator. C4 exige las contribuciones MODEL, ECONOMIC, INVARIANT, CORE, VALUE, VALIDATE, FILTER, DIFF, REPLAY, CANDIDATE y SCOPE. El DAG C6 exacto es PROFILE → FRONTEND → LOCAL-IR → TRACE → C4 providers → REPLAY → CANDIDATE → SCOPE; cada publicación se liga a SHA/receipt y evidence root.

### 10.3 Gates explícitos de los 30 scopes

`SCOPES` es exactamente este conjunto cerrado:

```text
SOL-EVM-DEFI
VYP-EVM-DEFI
RST-SOLANA-ANCHOR
RST-COSMWASM
RST-NEAR
RST-SUBSTRATE-FRAME
RST-NATIVE-CLIENT
GO-COSMOS-SDK
GO-GETH-CLIENT
GO-RELAYER-ORACLE
C-UTXO-CONSENSUS
C-BRIDGE-FINALITY
C-WALLET-CUSTODY
CPP-UTXO-CONSENSUS
CPP-BRIDGE-FINALITY
CPP-WALLET-CUSTODY
JS-NODE-RELAYER
JS-NODE-KEEPER-ORACLE
JS-NODE-TX-BUILDER
TS-NODE-RELAYER-SDK
TS-NODE-KEEPER-ORACLE
TS-NODE-TX-BUILDER
X-SOL-TS-RELAYER
X-VYP-JS-KEEPER
X-SOLANA-TS-CLIENT
X-COSMWASM-GO-RELAYER
X-NEAR-JS-CLIENT
X-GO-C-FFI
X-GO-CPP-FFI
X-TS-DATA-SOL-TX
```

Para cada `S` existen ocho IDs, sin excepción:

| ID template | Kind | Owner | Hard dependencies/predicate |
|---|---|---|---|
| `S-C0` | primary | `solguard-deploy` | `LANG-020-HARNESS`; scope manifest, source/build/toolchain/SBOM/sandbox congelados |
| `S-C1` | primary | `solguard-map` | `S-C0`, `LANG-010-HARNESS`, `LANG-030-HARNESS`; frontend manifest, goldens, malformed y replay exactos |
| `S-C2` | primary | `solguard-map` | `S-C1`; CFG/data/state/numeric/boundary coverage y precisión |
| `S-C3` | primary | `solguard-trace` | `S-C2`, `LANG-040-HARNESS`; cierre interprocedural/async/atomicidad y deuda blocking |
| `S-C4` | primary | `solguard-deploy` | `S-C3`, `LANG-050A/B/C`, `LANG-060`, `LANG-070`, `LANG-080-VALIDATE/FILTER`, `LANG-090-HARNESS`; slice económico completo |
| `S-C5A` | primary operativo | `solguard-deploy/evaluator` | `S-C4`, instancias H-GEN-A de `HOLDOUT-906`/`EVAL-908`, `ISO-904`; campaign/report/materiality, `target_policy_openings_root` y `finding_materiality_assessments_root`, cohort/scope sellados |
| `S-C5B` | primary operativo | `solguard-deploy/evaluator` | `S-C4`, instancias contractuales H-GEN-B de `HOLDOUT-906` y del reporte de `EVAL-908`, `ISO-904`; colección policy abierta post-seal, lineage-disjoint y cero retuning |
| `S-CERT` | derived | null | fórmula siguiente y certificado firmado |

```text
S-CERT = AND(S-C0, S-C1, S-C2, S-C3, S-C4, S-C5A, S-C5B, LANG-200-HARNESS)
```

El predicate de `S-CERT` exige además un
`solguard-language-certification.v1` firmado, binding al release BOM, límites,
exclusiones y reproducción independiente. Esos requisitos forman parte de la
evaluación del derived receipt; no son checkboxes ocultos.

`EVERY_SCOPE(Cn)` se expande a los 30 IDs `<S>-Cn` del conjunto anterior. La
expansión real se encuentra enumerada, sin ranges, en
`acceptance-ledger.v1.json`.

### 10.4 Certificados de lenguaje derived

| Derived ID | Fórmula exacta `AND(...)` |
|---|---|
| `LANG-100` | `SOL-EVM-DEFI-CERT` |
| `LANG-110` | `VYP-EVM-DEFI-CERT` |
| `LANG-120` | `RST-SOLANA-ANCHOR-CERT, RST-COSMWASM-CERT, RST-NEAR-CERT, RST-SUBSTRATE-FRAME-CERT, RST-NATIVE-CLIENT-CERT` |
| `LANG-130` | `GO-COSMOS-SDK-CERT, GO-GETH-CLIENT-CERT, GO-RELAYER-ORACLE-CERT` |
| `LANG-140` | `C-UTXO-CONSENSUS-CERT, C-BRIDGE-FINALITY-CERT, C-WALLET-CUSTODY-CERT` |
| `LANG-150` | `CPP-UTXO-CONSENSUS-CERT, CPP-BRIDGE-FINALITY-CERT, CPP-WALLET-CUSTODY-CERT` |
| `LANG-160` | `JS-NODE-RELAYER-CERT, JS-NODE-KEEPER-ORACLE-CERT, JS-NODE-TX-BUILDER-CERT` |
| `LANG-170` | `TS-NODE-RELAYER-SDK-CERT, TS-NODE-KEEPER-ORACLE-CERT, TS-NODE-TX-BUILDER-CERT` |
| `LANG-180` | `X-SOL-TS-RELAYER-CERT, X-VYP-JS-KEEPER-CERT, X-SOLANA-TS-CLIENT-CERT, X-COSMWASM-GO-RELAYER-CERT, X-NEAR-JS-CLIENT-CERT, X-GO-C-FFI-CERT, X-GO-CPP-FFI-CERT, X-TS-DATA-SOL-TX-CERT` |
| `LANG-200` | `LANG-200-HARNESS, LANG-100, LANG-110, LANG-120, LANG-130, LANG-140, LANG-150, LANG-160, LANG-170, LANG-180, LANG-190` |

El JSON enumera cada operando. Cada certificado incluye scope exacto; nunca
generaliza a todo el lenguaje fuera de las filas aceptadas en `10`.

## 11. Tests, medición y release candidate

### 11.1 Test nodes primary

`TEST-V0`, `TEST-V1`, `TEST-V2`, `TEST-V3`, `TEST-V4`, `TEST-V5`, `TEST-V6`,
`TEST-V7`, `TEST-V8`, `TEST-NEG`, `TEST-META` y `TEST-CHAOS` son primary,
owner `solguard-deploy`. Cada uno conserva manifest de casos comprometidos,
denominador, comando, entorno, outputs, fallos, exclusiones pre-scan y firma del
verificador. No se acepta un test node con `not-run`, flaky, exclusión post-hoc
o denominador abierto.

| Test ID | Criterio normativo resumido | Fuente de aceptación exacta |
|---|---|---|
| `TEST-V0` | contratos, schemas, goldens y old/new readers pasan; tamper y versión incorrecta fallan | `OP-PREFREEZE-000` ejecuta el manifest y un verifier emite el evento V0 separado |
| `TEST-V1` | pipeline vertical single-language conserva lineage, autoridad y evidencia hasta FILTER | `OP-PREFREEZE-000`, evento V1 separado |
| `TEST-V2` | modelo económico, invariantes y proof obligations cierran positivos y negativos | `OP-PREFREEZE-000`, evento V2 separado |
| `TEST-V3` | lifecycle, upgrade, async y multi-step mantienen causalidad y límites declarados | `OP-PREFREEZE-000`, evento V3 separado |
| `TEST-V4` | boundary cross-language resiste fallos parciales, retry, unidades e identidad de asset | `OP-PREFREEZE-000`, evento V4 separado |
| `TEST-V5` | regresión conocida cierra manifests, truth, denominadores y burden sin claim blind | `OP-KNOWN-004` sella outputs; `OP-TEST-V5-004A` emite V5; `KNOWN-910` lo consume después |
| `TEST-V6` | H-GEN-A/B cierra gates por scope, completion, métricas anti-gaming y no-retuning | `OP-REVEAL-009` materializa evidencia; `OP-TEST-V6-009A` emite V6 |
| `TEST-V7` | H-NOVEL-A/B cierra novelty, causas independientes, adjudicación y thresholds | `OP-REVEAL-009` materializa evidencia; `OP-TEST-V7-009B` emite V7 |
| `TEST-V8` | LIVE-AUTH cierra autorización, intentos, materialidad post-seal y no explotación | `OP-LIVE-EVAL-012A` materializa evidencia; `OP-TEST-V8-012B` emite V8; `LIVE-913` lo consume después |
| `TEST-NEG` | patched/safe/near-miss no producen false Pass ni Review no-TP | `OP-PREFREEZE-000`, evento NEG separado |
| `TEST-META` | transformaciones conservadoras preservan y las causales cambian sólo lo esperado | `OP-PREFREEZE-000`, evento META separado |
| `TEST-CHAOS` | crash, source/preflight failure, timeout, OOM, cancel y budget cierran sin omitir denominadores | `OP-CHAOS-012D`, evento CHAOS agregado final separado |

La operación fuente produce bytes; el verifier posterior acepta exclusivamente
el test node indicado. El nodo operacional consumidor se acepta en otra
transacción y referencia el evento de test. Queda prohibido que una misma
operación «cierre ambos», porque crearía autojustificación o un ciclo oculto.

### 11.2 Medición y operación

| ID | Kind | Owner | Hard dependencies principales |
|---|---|---|---|
| `SCOPE-900` | primary | `solguard-deploy` | `GOV-001`, `GOV-003` |
| `MEASURE-901` | primary | `solguard-deploy/evaluator` | `TRUTH-106`, `SCOPE-900` |
| `DB-902` | primary | `solguard-database` | `PLAT-801`, `PLAT-802`, `MEASURE-901` |
| `BOM-903` | primary | `solguard-deploy` | `SCOPE-900`, `PLAT-805` |
| `ISO-904` | primary | `solguard-deploy` | `SCOPE-900`, `BOM-903` |
| `CORPUS-905` | primary | `solguard-deploy/evaluator` | `MEASURE-901`, `DB-902` |
| `HOLDOUT-906` | primary | `solguard-deploy/custodian` | `MEASURE-901`, `ISO-904` |
| `NOVEL-907` | primary | `solguard-deploy/custodian` | `HOLDOUT-906` |
| `EVAL-908` | primary | `solguard-deploy/evaluator` | `MEASURE-901`, `DB-902`, `ISO-904` |
| `CANARY-909` | primary | `solguard-deploy` | `TEST-V3`, `RUN-208`, `DB-902` |
| `KNOWN-910` | primary | `solguard-deploy/evaluator` | `CORPUS-905`, `EVAL-908`, `TEST-V5` |
| `BLIND-911` | derived | null; `AND(EVERY_SCOPE(C5A), EVERY_SCOPE(C5B), HOLDOUT-906, EVAL-908, ISO-904, TEST-V6)` | fórmula global, no commit |
| `NOVELRUN-912` | primary | `solguard-deploy/evaluator` | `NOVEL-907`, `EVAL-908`, `ISO-904`, `TEST-V7` |
| `LIVE-913` | primary | `solguard-deploy/operator` | `NOVELRUN-912`, `TEST-V8`; evaluator y confirmador externo separados |
| `RELEASE-914` | derived | null; fórmula en sección 14 | no es ID de commit |

`HOLDOUT-906` pertenece al custodio: su verifier no puede ser custodio,
scanner operator ni product maintainer. `LIVE-913` pertenece al scanner
operator; su verifier es el evaluator post-scan y tampoco puede coincidir con
operator, maintainer o selector del objetivo. Separar GPTs sin separar a la
persona, credenciales y claves no satisface ninguno de los dos nodos.

La independencia fuerte es humana, no sólo lógica. Antes de congelar H-GEN,
product maintainer/scanner operator, custodio externo y adjudicador final deben
ser personas distintas. LIVE requiere además selector/attestor del objetivo y
confirmador externo independientes del maintainer/operator. Si Roger cubre dos
o más de esos roles, la única etiqueta honesta es
`self_administered_isolated_evaluation`: puede sostener aislamiento técnico,
regresión conocida y una release piloto, pero bloquea
`sealed_blind_generalization`, `sealed_novel_detection`,
`bounty_detection_ready`, C5 completo y `product_release`. GPTs, sesiones,
worktrees, cuentas o VMs distintas no convierten a una persona en dos
autoridades independientes.

La segunda barrera no negociable es potencia. Cada scope × cohort preregistra
estimand, alpha/multiplicidad, efecto mínimo, potencia >=80 %, clusters,
no-response, `N` y `n_eff`; C5 falla si cualquier endpoint carece de muestra.
Los ~220 protocolos y 90 labs actuales no certifican por sí solos 30 scopes ×
dos cohorts y, por la aritmética de los ceilings de controles, el orden de
magnitud esperable es de varios miles de observaciones independientes. El
número final lo determina el power analysis firmado, nunca esta estimación. Si
no alcanza, sólo son válidos ampliar holdouts, declarar `partial_scope` antes
de medir o publicar piloto; relajar gates, reciclar known o reducir scope
post-resultado está prohibido.

## 12. Trenes derived

| Derived ID | Fórmula exacta `AND(...)` |
|---|---|
| `TRAIN-C0` | `GOV-001, GOV-002, GOV-003, GOV-004, GOV-005, GOV-006, GOV-007, GOV-008` |
| `TRAIN-C1` | `TRUTH-101, TRUTH-102, TRUTH-103, TRUTH-104, TRUTH-105, TRUTH-106, TRUTH-107, TRUTH-108, TRUTH-109, TRUTH-110` |
| `TRAIN-C2` | `RUN-201, RUN-202, RUN-203, RUN-204, RUN-205, RUN-206, RUN-207, RUN-208, RUN-209, RUN-210` |
| `TRAIN-C3` | `IR-301..308, MODEL-401..410` |
| `TRAIN-C4` | `PROOF-501..510, DECIDE-601..608` |
| `TRAIN-C5` | `PLAT-801..810` |
| `TRAIN-C6` | infraestructura `LANG-000..090`, `LANG-190`, harnesses 010/020/030/040/090/190/200, todos los packages `LANG-SOL-*` a `LANG-X-*`, `TEST-V0..V4`, `TEST-NEG`, `TEST-META`; sólo C0-C4 y candidatos C5 |
| `TRAIN-C7` | `SCOPE-900, DB-902, BOM-903, ISO-904, LEDGER-001, MEASURE-901, CORPUS-905, HOLDOUT-906, NOVEL-907, EVAL-908, CANARY-909, KNOWN-910, BLIND-911, LANG-200, NOVELRUN-912, LIVE-913, TEST-V5..V8, TEST-CHAOS` |

`TRAIN-C7` significa «evidencia pre-release cerrada» y no depende de
`RELEASE-914`; así se elimina el ciclo release→train→release.
`TRAIN-C6` no depende de `LANG-100..180` ni de `LANG-200`: C6 implementa y
congela candidatos; C7 incorpora los certificados post-H-GEN mediante
`LANG-200`. El JSON enumera literalmente todos los operandos abreviados aquí.

## 13. Claims y denominadores

### 13.1 Definición de detección publicada

```text
detected(f) :=
  f.verdict.validate_decision == supported
  AND f.verdict.filter_decision == pass
  AND f.verdict.publication_eligibility == eligible
  AND f.presentation.presentation_role IN {unique, representative}
  AND f.proof.status == complete
```

`publication_eligibility` pertenece a FILTER y sólo permite publicación. No
expresa explotación, PoC, report readiness ni probabilidad de bounty.

### 13.2 Denominadores inmutables

| Medida | Denominador canónico |
|---|---|
| cierre conocido | todos los targets y truth items `committed=true` del `corpus-manifest` firmado |
| `all_committed_strict_recall` | todos los truth items comprometidos; fallos post-seal son misses |
| `predeclared_scoreable_strict_recall` | sólo truth items declarados scoreable antes del scan; se publica junto al recall completo y nunca lo sustituye |
| `strict_precision` | todos los `PublishedFinding`; numerador: los adjudicados true positive |
| `raw_pass_support_precision` | todos los `FindingEnvelope` con admission `pass`, incluidos ineligible/duplicate; numerador: TP únicos más duplicates cuyo `canonical_parent_id` válido, same-target/same-revision/same-cause está adjudicado TP |
| `presented_actionable_precision` | unión anti-dedupe de todos los Pass y `ReviewEnvelope`; numerador: sujetos TP con materiality assessment `outcome=material` al threshold prefreeze; non-TP, medium bajo threshold high, non-material, unclassified, unverifiable y needs_context penalizan |
| `publication_suppression_rate` | todos los Pass; numerador: Pass no publicados |
| `non_duplicate_suppression_rate` | todos los Pass con role no-duplicate; numerador: los ineligible no-duplicate |
| `negative_target_false_alert_rate` | todos los controles comprometidos, no sólo los ejecutados con éxito |
| `negative_control_review_rate` | todos los controles comprometidos; numerador: controles con al menos un `ReviewEnvelope` que no sea simultáneamente TP **y** material, con patched/safe/near-miss desglosados; un TP inmaterial sí penaliza y todo bug novel material se adjudica antes de computar false alert |
| `successful_target_completion` | todos los targets positivos y controles comprometidos, particionados por role y scope; sólo cuenta cuando todas las fases obligatorias terminan `complete`, sin source/preflight failure, crash, timeout, OOM, cancel ni budget exhaustion |
| review burden | `PublishedFinding + ReviewEnvelope` presentados por target comprometido |
| `raw_pass_burden` | todos los Pass por target comprometido, publicados o suprimidos |
| `finding_recall_at_10` | todos los truth items comprometidos |
| `positive_target_hit_rate_at_10` | todos los targets positivos comprometidos |
| novedad | todos los targets/clusters de H-NOVEL-A y H-NOVEL-B comprometidos antes del scan |
| live | todos los objetivos e intentos comprometidos en la campaña LIVE-AUTH, incluidos misses/fallos |

Los valores 254 targets y 630 truth items son una expectativa histórica, no el
denominador normativo. El gate usa el manifest firmado, registra drift y falla
si un cambio no está explicado antes del run.

`target_closure` no sustituye ejecución válida. Cada reporte publica
`successful_target_completion` por positivo/control/scope. Un fallo de source,
preflight, crash, timeout, OOM, cancel o budget exhaustion en un control
contractual bloquea C5 del scope;
un positivo incompleto permanece en el denominador y nunca se descarta como
«no ejecutado».

El matching usa una asignación bipartita determinista preregistrada, con
capacidad uno incondicional tanto por `PublishedFinding` como por canonical
root-cause cluster, tie-break estable y matriz completa publicada. No existe
excepción de multiplicidad: causas distintas exigen findings distintos y los
truth items de una misma raíz se colapsan antes del matching en un único
cluster canónico. Un truth cluster unmatched es miss; un duplicate no añade
recall. Split/merge, cambio de orden o un finding amplio que intenta cubrir
múltiples truth clusters son negativos. Un duplicate sin parent válido/TP
cuenta no-TP en precisión raw.

La unión anti-dedupe de métricas sólo colapsa un child cuando existe una
adjudicación terminal que confirma `canonical_parent_id`, mismo target/revision
y misma causa raíz que el parent. Una relación falsa, unknown, unverifiable o
sin decisión terminal deja al child como sujeto separado en denominador raw y
presented-actionable. Ni el flag de FILTER ni proximidad textual bastan.

### 13.3 Claim profiles exactos

| Derived claim | Fórmula/gate | Claim máximo autorizado |
|---|---|---|
| `CLAIM-001` | `AND(CANARY-909, RUN-208, PLAT-804, SCOPE-900)` | `operational_canary` |
| `CLAIM-002` | `AND(BLIND-911, EVAL-908, TEST-V6)` y thresholds H-GEN de `05 §13.5/13.8` | `reviewer_useful` |
| `CLAIM-003` | `AND(HOLDOUT-906, ISO-904, BLIND-911)` | `sealed_blind_generalization` dentro de scopes |
| `CLAIM-004` | `AND(NOVEL-907, NOVELRUN-912)` y thresholds H-NOVEL de `05 §13.6` | `sealed_novel_detection` |
| `CLAIM-005` | `AND(LANG-200, LANG-200-HARNESS)`; cada `S-CERT` incluye el harness y exige receipt operacional `solguard-language-certification.v1` | certificación C5 en los 30 scopes publicados de los ocho lenguajes |
| `CLAIM-006` | `AND(CLAIM-003, CLAIM-004, CLAIM-005, LIVE-913, TEST-V8)`; full-product, 30 scopes certificados, blind+novel y LIVE autorizado/high/material | `bounty_detection_ready` global, no explotación |
| `CLAIM-007` | `AND(RELEASE-914, FINAL-006, FINAL-007)` | `product_release` |
| `CLAIM-VERTICAL-EVM-001` | `AND(VERTICAL-EVM-PROFILE-001, VERTICAL-EVM-BLIND-001, VERTICAL-EVM-NOVEL-001, VERTICAL-EVM-LIVE-001)` | sólo `bounty_detection_ready dentro del frame SOL-EVM-DEFI medido`; prohíbe full-product/ocho lenguajes/release |
| `CLAIM-008` | `AND(FINAL-004)` | límites residuales publicados; sin universalidad ni bounty garantizado |

Para CLAIM-002, ambos H-GEN deben superar por lenguaje/scope: `strict_precision`
de `PublishedFinding` ≥90 % y LCB ≥80 %; `raw_pass_support_precision` ≥90 % y
LCB ≥80 %; `presented_actionable_precision` ≥90 % y LCB ≥80 %;
`all_committed_strict_recall`,
`predeclared_scoreable_strict_recall` y macro-recall ≥70 % con LCB ≥55 %;
`finding_recall_at_10` ≥80 %; `negative_target_false_alert_rate` ≤2 % y UCB
≤5 %; `negative_control_review_rate` ≤2 % y UCB ≤5 %, con cero Review que no
sea simultáneamente TP y material en patched/safe/near-miss después de
adjudicar cualquier bug novel material; un TP inmaterial sigue penalizando;
`conservative_negative_control_failure_rate` ≤2 % y UCB ≤5 %, cuyo numerador
incluye todo control comprometido con Pass incorrecto, Review no-TP/no-material
o non-completion; un crash selectivo nunca reduce el false-alert ceiling;
adjudication y evidence completion 100 %; review burden mediana ≤10 y
P95 ≤25; raw pass burden mediana ≤15 y P95 ≤40;
`non_duplicate_suppression_rate` ≤10 % y UCB ≤20 % por scope/cohort;
distribución y razones de suppression/dedupe publicadas, con cero false Pass
ocultos como ineligible/duplicate; cero high/critical falsos en controles. Se publica
`positive_target_hit_rate_at_10` por separado y no tiene floor de aprobación.

Para CLAIM-004, cada H-NOVEL debe superar por separado
`all_committed_strict_recall` ≥30 % y
`predeclared_scoreable_strict_recall` ≥30 %, ambos con límite inferior
simultáneo 95 % >5 % y publicación de `N` y `n_eff`; además exige
`strict_precision` ≥90 %, LCB precision ≥80 %,
`raw_pass_support_precision` ≥90 % y LCB ≥80 %, 100 % de adjudicación, todos
los gates H-GEN de `presented_actionable_precision`, completion,
negative-control review, review/raw-pass burden, suppression y false-alert —incluidos
los caps 15/40 y 10/20 y cero false Pass ocultos—, al menos un TP externo por
cohort y dos raíces/familias
independientes en total. Muestra insuficiente es `insufficient_evidence`, nunca
pass.

## 14. Dossier, release y metaestado final

`FINAL-001..007` son primary con estos owners y dependencias:

| ID | Owner | Dependencias principales hard/contract |
|---|---|---|
| `FINAL-001` | `solguard-docs` | `TRAIN-C0..C7`, `REPO-*`; consume la instancia dossier `evidence_revision` emitida por EVAL/builder |
| `FINAL-002` | `solguard-agents` | `FINAL-001`, `LEDGER-001` |
| `FINAL-003` | `solguard-deploy/clean-room-reproducer` | `FINAL-001`, `FINAL-002`; acceptance verifier B distinto |
| `FINAL-004` | `solguard-docs` | `FINAL-001`, resultados y riesgos completos |
| `FINAL-005` | `solguard-deploy/isolation-tester` | `SCOPE-900`, `ISO-904`, `FINAL-003`; acceptance verifier B distinto |
| `FINAL-006` | `solguard-deploy/release-dossier-builder` | `RELEASE-914`; acceptance verifier B distinto |
| `FINAL-007` | `solguard-agents` | `RELEASE-914`, `FINAL-006`, `LEDGER-001`; consume la instancia dossier `post_tag_terminal` posterior a FINAL-006 |

La aceptación de estos siete IDs es normativa y no se deduce de la checklist
generada:

| ID | Resultado y evidencia terminal | Negativos que deben fallar cerrado |
|---|---|---|
| `FINAL-001` | Docs prepara entries y acepta la instancia EVAL/builder `revision_role=evidence_revision`: revision create-only con previous dossier ID/self-hash, cumulative entries root/count y roles para scope, build, contratos, aislamiento, corpus/campaigns, raw outputs, evaluación, métricas, risks y reproducer | writer Docs paralelo, entry/role ausente, delete/replace/reorder, previous root/count stale, lineage o self-hash roto |
| `FINAL-002` | El validador read-only implementado por AGENTS en C7-015A/B resuelve todos los links, IDs, schemas/versiones, tamaños, hashes, firmas, ledger, language receipts, reports y la revisión dossier exacta; OP-FINAL-002 emite graph receipt reproducible | validator inexistente o sólo documental, link roto, ID/schema desconocido, firma inválida, root stale, report/dossier intercambiado |
| `FINAL-003` | Clean-room reproducer A recompone ledger/derived, matching 1:1, adjudicación, métricas, roles y conteos desde bytes sellados; acceptance verifier B con identidad/credencial distinta lo reproduce y acepta | autoaceptación A=B, cache mutable, acceso de red/oracle, tamper, reorder, replay o swap cambia/permite el resultado |
| `FINAL-004` | Publica sin omisiones fallos, exclusions, unknowns, unscoreable, denominadores/intervalos, límites de scope/claim y riesgos residuales ligados a provenance | omitir el peor resultado, mover denominador, suavizar límite o afirmar claim no autorizado |
| `FINAL-005` | Isolation tester A firma la prueba final de closure de repos, imágenes, SBOM, secretos y reachability; acceptance verifier B distinto la reproduce y demuestra que scanner runtime no alcanza truth, matches, adjudication ni evaluator | autoaceptación A=B, inyección de secreto/oracle/ground truth, dependencia oculta o canal de red pasa inadvertido |
| `FINAL-006` | Release dossier builder A crea la instancia `revision_role=release_pre_tag`, encadena byte-exact el dossier self-hash de FINAL-001 y fija repo SHAs, tag targets, release decision/pre-promotion roots, reports y rollback; acceptance verifier B distinto valida DSSE sobre los bytes canónicos finales | A acepta su propia evidencia, evidencia previa omitida, dirty tree, target divergente, dependencia mutable, root/evento cambiado, self-hash o DSSE inválida |
| `FINAL-007` | Tras FINAL-006 se crean tags firmados; la instancia dossier distinta `revision_role=post_tag_terminal` añade `tag_realization_receipt` 15/15 y el integrador regenera 440 primary accepted/128 derived satisfied y 1103 contributions accepted/cero reopened/PENDING; root final sólo en transparency posterior | reutilizar `release_pre_tag`, tag parcial/incorrecto, receipt sin role digest/campo, evidence deletion, root en propia preimagen o estado mutable |

```text
RELEASE-914 = AND(
  TRAIN-C0, TRAIN-C1, TRAIN-C2, TRAIN-C3,
  TRAIN-C4, TRAIN-C5, TRAIN-C6, TRAIN-C7,
  CLAIM-001, CLAIM-002, CLAIM-003, CLAIM-004, CLAIM-005, CLAIM-006,
  CLAIM-008,
  FINAL-001, FINAL-002, FINAL-003, FINAL-004, FINAL-005
)
```

Los owners/verificadores de `OP-FINAL-001..005` aceptan cada nodo por separado.
`OP-AUDIT` es read-only: únicamente verifica esos cinco eventos y que comparten
la revisión/raíces correctas; no acepta nodos ajenos. Sólo entonces el evaluador
determinista puede satisfacer la fórmula. El receipt de `RELEASE-914` fija
`release_decision_event_id`, su hash y `pre_promotion_ledger_root`; no es un
manifest DSSE ni un tag. Después, `OP-DSSE` usa exactamente esa preimagen para
crear el `release_product_manifest` y la evidencia de FINAL-006. Un verificador
independiente acepta FINAL-006; entonces se crean los quince tags firmados y un
segundo verifier produce `tag_realization_receipt`. Sólo una revision del dossier
que preserve ese receipt 15/15 permite al integrador aceptar FINAL-007 y derivar
CLAIM-007. Un fallo parcial se conserva y el release falla. El ledger root
posterior a FINAL-007 sólo aparece en un
receipt/transparency log final: nunca se exige dentro de la preimagen que lo
produce. OP-DSSE no produce ni vuelve a aceptar `RELEASE-914`.
`RELEASE-914` tampoco es ID de commit; los commits operativos referencian su
task primary del tren C7.

`FINAL-008` es meta, no aparece en `nodes`, no tiene checkbox, owner ni
evidencia propia:

```text
FINAL-008 := READY iff
  primary_accepted == primary_total
  AND derived_satisfied == derived_total
  AND computed_id_set_sha256 == ledger.id_set_sha256
  AND dependency_dag_is_acyclic
  AND reopened_nodes == 0
```

## 15. Linter y generador obligatorios

LEDGER-001 debe fallar cerrado si:

- existe un ID de `07` no presente en el JSON o viceversa;
- `FINAL-008` aparece como nodo contable;
- el ID-set hash no coincide;
- un ID o contract ID está duplicado;
- aparece un alias prohibido;
- un primary carece de owner único, predicate, evidence descriptor o verifier;
- un predicate primary referencia `07`, otro generated view, un archivo
  inexistente, un `criteria_id` no resoluble o un composite scope/gate inválido;
- un derived tiene owner de implementación, estado manual, fórmula vacía,
  operandos inexistentes o un operador distinto de `AND`;
- un derived contiene una dependencia `contract`, o sus dependencias `hard` no
  coinciden exactamente y en el mismo orden con los operandos de `formula`;
- una dependencia no declara `hard` o `contract`;
- existe un ciclo;
- una aceptación usa evidencia mutable, firma no autorizada, dependencia
  reabierta o versión distinta;
- measurement/oracle es alcanzable desde scanner runtime;
- un producer nuevo precede a lectores compatibles;
- una instancia contractual carece de artifact/root/role/cohort/scope binding
  o permite swap/reuse entre instancias;
- una retirada legacy carece de telemetría a cero y rollback probado;
- un derived gate aparece en branch o commit como si fuese tarea primaria.

La regeneración es transaccional:

1. validar ledger actual e ID-set;
2. validar la propuesta y evidence roots;
3. aplicar aceptación/reapertura en una nueva `ledger_revision`;
4. recalcular derived y dependency-state hashes;
5. escribir JSON canónico;
6. generar `07` desde esa misma revisión;
7. verificar que JSON y Markdown muestran los mismos estados;
8. firmar ambos roots.

Una edición directa de `07` debe ser detectada como drift y revertida por
regeneración; nunca se importa como autoridad al ledger.

## 16. Registry generado de capacidades, integración y contribuciones

Esta sección es normativa y generada desde el JSON. Hace resoluble cada `criteria_id`; una fila ausente bloquea dispatch.

### 16.1 Capacidades, cutover y perfil vertical

| Criteria ID | Kind/mode | Owner | Required contributions | Must hold exacto |
|---|---|---|---:|---|
| `BOM-CAP-903` | primary/implementation | `solguard-deploy` | 2 | `bom_builder_and_verifier_implemented`, `full_sha_tree_and_image_digests_enforced`, `missing_extra_and_mutated_component_rejected`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `CANARY-CAP-909` | primary/implementation | `solguard-deploy` | 1 | `canary_runner_and_report_verifier_implemented`, `fixed_denominator_and_failure_predicates`, `writer_off_until_operational_event`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `CLAIM-VERTICAL-EVM-001` | derived/derived | `null` | 0 | `wording_exact_bounty_detection_ready_within_measured_SOL_EVM_DEFI_frame`, `forbid_eight_language_full_product_product_release_or_universal_claim`, `claim_profile_and_all_operands_same_revision` |
| `CORPUS-CAP-905` | primary/implementation | `solguard-deploy/evaluator` | 2 | `corpus_manifest_and_contamination_tooling_writer_off`, `truth_item_import_validation`, `tamper_and_lineage_tests`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `DB-902` | primary/database_cutover | `solguard-database` | 0 | `legacy_backup_path_digest_and_read_only_freeze`, `create_once_new_benchmarks_sqlite`, `migration_counts_roots_and_provenance`, `shadow_equivalence_and_zero_legacy_writers`, `atomic_cutover_event_and_retention_guards`, `restore_and_forward_rollback_proved`, `partial_failure_matrix_fails_closed` |
| `DB-CAP-902` | primary/implementation | `solguard-database` | 5 | `migration_schema_and_create_once_tooling`, `dry_run_shadow_and_rollback_tooling`, `legacy_writer_guard_implemented`, `no_real_cutover_receipt`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `FINAL-002-CAP` | primary/implementation | `solguard-agents` | 2 | `dossier_graph_link_schema_and_read_only_validator_implemented`, `tamper_replay_signature_and_root_failures_rejected`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `FINAL-003-CAP` | primary/implementation | `solguard-deploy/clean-room-reproducer` | 1 | `clean_room_reproduction_tooling_implemented`, `independent_identity_and_credentials_enforced`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `HOLDOUT-CAP-906` | primary/implementation | `solguard-deploy/custodian` | 2 | `holdout_generation_and_custody_tooling_writer_off`, `human_custodian_role_policy_enforced`, `leakage_probes_and_negative_tests`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `ISO-CAP-904` | primary/implementation | `solguard-deploy` | 3 | `clean_room_isolation_harness_implemented`, `forbidden_oracle_and_network_probes_fail_closed`, `snapshot_reproduction_verified`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `KNOWN-CAP-910` | primary/implementation | `solguard-deploy/evaluator` | 1 | `known_corpus_runner_and_evaluator_implemented`, `known_labeling_cannot_be_published_as_blind`, `writer_off_until_operational_event`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `LANG-C-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-C-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-C-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 4 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-C-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-C-05-INTEGRATION` | primary/implementation | `solguard-deploy` | 3 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-CPP-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 3 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-CPP-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 6 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-CPP-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 3 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-GO-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-GO-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-GO-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-GO-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-GO-05-INTEGRATION` | primary/implementation | `solguard-deploy` | 7 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-JS-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 3 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-JS-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 7 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-JS-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 4 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-03A-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-03B-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-05-INTEGRATION` | primary/implementation | `solguard-deploy` | 9 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-RUST-06-INTEGRATION` | primary/implementation | `solguard-deploy` | 4 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-SOL-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-SOL-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-SOL-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 6 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-SOL-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-SOL-05-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-TS-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 3 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-TS-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 7 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-TS-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-VYP-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 2 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-VYP-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-VYP-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-VYP-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 8 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-X-01-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-X-02-INTEGRATION` | primary/implementation | `solguard-deploy` | 1 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-X-03-INTEGRATION` | primary/implementation | `solguard-deploy` | 4 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LANG-X-04-INTEGRATION` | primary/implementation | `solguard-deploy` | 5 | `all_exact_owner_unique_contributions_accepted`, `language_package_integration_e2e_passed`, `scope_and_toolchain_bindings_complete`, `missing_extra_or_reused_contribution_rejected` |
| `LIVE-CAP-913` | primary/implementation | `solguard-deploy/operator` | 4 | `authorized_live_manifest_and_fixed_frame_runner_implemented`, `per_attempt_authorization_and_retry_lineage`, `writer_off_until_operational_event`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `NOVEL-CAP-907` | primary/implementation | `solguard-deploy/custodian` | 2 | `novelty_attestation_and_collision_tooling_writer_off`, `post_reveal_contamination_accounting`, `no_blind_credit_for_postseal_collision`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `SCOPE-CAP-900` | primary/implementation | `solguard-deploy` | 4 | `detection_only_closure_implementation`, `scope_manifest_verifiers_writer_off`, `negative_process_and_file_reachability`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `VALIDATION-CAP-900` | primary/implementation | `solguard-agents` | 2 | `record_validation_event_union_implemented`, `candidate_and_environment_binding_enforced`, `replay_swap_stale_and_reorder_rejected`, `all_required_contributions_accepted`, `integration_e2e_passed` |
| `VERTICAL-EVM-BLIND-001` | derived/derived_operational | `null` | 0 | `exact_hgen_A_and_B_measurement_event_ids_and_roots`, `same_preregistered_thresholds_and_power`, `complete_fixed_denominators`, `independent_materialization_receipt`, `no_scope_or_claim_expansion` |
| `VERTICAL-EVM-LIVE-001` | primary/measurement | `solguard-deploy/operator` | 0 | `authorization_nested_content_addressed_and_signed`, `authorization_binds_issuer_key_signature_subject_target_revision_program_set_validity_actions_probes_rate_resources_prohibitions_and_revocation_status`, `authorization_checked_before_every_attempt_with_trusted_timestamp`, `mismatch_expired_revoked_stale_or_out_of_scope_aborts`, `fixed_frame_and_all_retry_attempts_preserved`, `program_severity_at_least_high_and_materiality_confirmed_independently`, `target_policy_opening_and_materiality_assessment_exact`, `maximum_claim_limited_to_measured_SOL_EVM_DEFI_frame`, `live_authorization_nested_artifact_exact_fields_and_content_roots`, `per_attempt_trusted_timestamp_status_and_revocation_check`, `authorization_mismatch_expired_revoked_stale_out_of_scope_fails_closed`, `external_timestamp_receipt_v1_base_and_union_valid`, `external_timestamp_trust_policy_and_quorum_2_of_2`, `timestamp_receipts_bind_exact_artifact_digest_and_role` |
| `VERTICAL-EVM-NOVEL-001` | primary/measurement | `solguard-deploy/evaluator` | 0 | `exact_hnovel_A_and_B_report_ids`, `both_reports_pass_independently`, `post_reveal_contamination_root_bound`, `postseal_collision_gets_no_blind_credit`, `same_preregistered_thresholds_and_power`, `partial_pair_failure_remains_pending`, `external_timestamp_receipt_v1_base_and_union_valid`, `external_timestamp_trust_policy_and_quorum_2_of_2`, `timestamp_receipts_bind_exact_artifact_digest_and_role` |
| `VERTICAL-EVM-PROFILE-001` | primary/campaign | `solguard-deploy/custodian` | 0 | `profile_type_exact_bounty_vertical`, `scope_set_exact_SOL_EVM_DEFI_only`, `candidate_sha_tree_and_manifest_frozen`, `hgen_pair_ids_exact_VERTICAL_EVM_HGEN_A_001_and_B_001`, `hnovel_pair_ids_exact_VERTICAL_EVM_HNOVEL_A_001_and_B_001`, `power_analysis_thresholds_limits_and_max_claim_frozen_before_results`, `same_global_thresholds_without_relaxation`, `external_human_custodian_and_adjudicator`, `no_post_result_profile_creation_or_scope_edit`, `live_authorization_nested_artifact_exact_fields_and_content_roots`, `per_attempt_trusted_timestamp_status_and_revocation_check`, `authorization_mismatch_expired_revoked_stale_out_of_scope_fails_closed`, `external_timestamp_receipt_v1_base_and_union_valid`, `external_timestamp_trust_policy_and_quorum_2_of_2`, `timestamp_receipts_bind_exact_artifact_digest_and_role` |

### 16.2 Paquetes LANG derived e integration

| Derived criteria ID | Formula | Integration primary | Contributions |
|---|---|---|---:|
| `LANG-C-01` | `AND(LANG-C-01-INTEGRATION)` | `LANG-C-01-INTEGRATION` | 1 |
| `LANG-C-02` | `AND(LANG-C-02-INTEGRATION)` | `LANG-C-02-INTEGRATION` | 2 |
| `LANG-C-03` | `AND(LANG-C-03-INTEGRATION)` | `LANG-C-03-INTEGRATION` | 4 |
| `LANG-C-04` | `AND(LANG-C-04-INTEGRATION)` | `LANG-C-04-INTEGRATION` | 2 |
| `LANG-C-05` | `AND(LANG-C-05-INTEGRATION)` | `LANG-C-05-INTEGRATION` | 3 |
| `LANG-CPP-01` | `AND(LANG-CPP-01-INTEGRATION)` | `LANG-CPP-01-INTEGRATION` | 3 |
| `LANG-CPP-02` | `AND(LANG-CPP-02-INTEGRATION)` | `LANG-CPP-02-INTEGRATION` | 6 |
| `LANG-CPP-03` | `AND(LANG-CPP-03-INTEGRATION)` | `LANG-CPP-03-INTEGRATION` | 3 |
| `LANG-GO-01` | `AND(LANG-GO-01-INTEGRATION)` | `LANG-GO-01-INTEGRATION` | 1 |
| `LANG-GO-02` | `AND(LANG-GO-02-INTEGRATION)` | `LANG-GO-02-INTEGRATION` | 9 |
| `LANG-GO-03` | `AND(LANG-GO-03-INTEGRATION)` | `LANG-GO-03-INTEGRATION` | 9 |
| `LANG-GO-04` | `AND(LANG-GO-04-INTEGRATION)` | `LANG-GO-04-INTEGRATION` | 9 |
| `LANG-GO-05` | `AND(LANG-GO-05-INTEGRATION)` | `LANG-GO-05-INTEGRATION` | 7 |
| `LANG-JS-01` | `AND(LANG-JS-01-INTEGRATION)` | `LANG-JS-01-INTEGRATION` | 3 |
| `LANG-JS-02` | `AND(LANG-JS-02-INTEGRATION)` | `LANG-JS-02-INTEGRATION` | 7 |
| `LANG-JS-03` | `AND(LANG-JS-03-INTEGRATION)` | `LANG-JS-03-INTEGRATION` | 4 |
| `LANG-RUST-01` | `AND(LANG-RUST-01-INTEGRATION)` | `LANG-RUST-01-INTEGRATION` | 1 |
| `LANG-RUST-02` | `AND(LANG-RUST-02-INTEGRATION)` | `LANG-RUST-02-INTEGRATION` | 9 |
| `LANG-RUST-03A` | `AND(LANG-RUST-03A-INTEGRATION)` | `LANG-RUST-03A-INTEGRATION` | 9 |
| `LANG-RUST-03B` | `AND(LANG-RUST-03B-INTEGRATION)` | `LANG-RUST-03B-INTEGRATION` | 9 |
| `LANG-RUST-04` | `AND(LANG-RUST-04-INTEGRATION)` | `LANG-RUST-04-INTEGRATION` | 9 |
| `LANG-RUST-05` | `AND(LANG-RUST-05-INTEGRATION)` | `LANG-RUST-05-INTEGRATION` | 9 |
| `LANG-RUST-06` | `AND(LANG-RUST-06-INTEGRATION)` | `LANG-RUST-06-INTEGRATION` | 4 |
| `LANG-SOL-01` | `AND(LANG-SOL-01-INTEGRATION)` | `LANG-SOL-01-INTEGRATION` | 1 |
| `LANG-SOL-02` | `AND(LANG-SOL-02-INTEGRATION)` | `LANG-SOL-02-INTEGRATION` | 2 |
| `LANG-SOL-03` | `AND(LANG-SOL-03-INTEGRATION)` | `LANG-SOL-03-INTEGRATION` | 6 |
| `LANG-SOL-04` | `AND(LANG-SOL-04-INTEGRATION)` | `LANG-SOL-04-INTEGRATION` | 2 |
| `LANG-SOL-05` | `AND(LANG-SOL-05-INTEGRATION)` | `LANG-SOL-05-INTEGRATION` | 2 |
| `LANG-TS-01` | `AND(LANG-TS-01-INTEGRATION)` | `LANG-TS-01-INTEGRATION` | 3 |
| `LANG-TS-02` | `AND(LANG-TS-02-INTEGRATION)` | `LANG-TS-02-INTEGRATION` | 7 |
| `LANG-TS-03` | `AND(LANG-TS-03-INTEGRATION)` | `LANG-TS-03-INTEGRATION` | 2 |
| `LANG-VYP-01` | `AND(LANG-VYP-01-INTEGRATION)` | `LANG-VYP-01-INTEGRATION` | 2 |
| `LANG-VYP-02` | `AND(LANG-VYP-02-INTEGRATION)` | `LANG-VYP-02-INTEGRATION` | 1 |
| `LANG-VYP-03` | `AND(LANG-VYP-03-INTEGRATION)` | `LANG-VYP-03-INTEGRATION` | 1 |
| `LANG-VYP-04` | `AND(LANG-VYP-04-INTEGRATION)` | `LANG-VYP-04-INTEGRATION` | 8 |
| `LANG-X-01` | `AND(LANG-X-01-INTEGRATION)` | `LANG-X-01-INTEGRATION` | 1 |
| `LANG-X-02` | `AND(LANG-X-02-INTEGRATION)` | `LANG-X-02-INTEGRATION` | 1 |
| `LANG-X-03` | `AND(LANG-X-03-INTEGRATION)` | `LANG-X-03-INTEGRATION` | 4 |
| `LANG-X-04` | `AND(LANG-X-04-INTEGRATION)` | `LANG-X-04-INTEGRATION` | 5 |

### 16.3 Measurement subtype y cardinalidad

| Criteria ID | Subtype | Cardinalidad/roots |
|---|---|---|
| `BLIND-911` | `h_gen_pair_aggregate` | `{"campaign_manifest_roots":2,"scope_replica_events":60,"campaign_pair_set_roots":1}` |
| `C-BRIDGE-FINALITY-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `C-BRIDGE-FINALITY-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `C-UTXO-CONSENSUS-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `C-UTXO-CONSENSUS-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `C-WALLET-CUSTODY-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `C-WALLET-CUSTODY-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CANARY-909` | `canary_validation` | `{"campaign_manifest_roots":0,"measurement_report_roots":0,"canary_run_manifest_roots":1}` |
| `CPP-BRIDGE-FINALITY-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CPP-BRIDGE-FINALITY-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CPP-UTXO-CONSENSUS-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CPP-UTXO-CONSENSUS-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CPP-WALLET-CUSTODY-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `CPP-WALLET-CUSTODY-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-COSMOS-SDK-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-COSMOS-SDK-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-GETH-CLIENT-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-GETH-CLIENT-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-RELAYER-ORACLE-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `GO-RELAYER-ORACLE-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-KEEPER-ORACLE-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-KEEPER-ORACLE-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-RELAYER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-RELAYER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-TX-BUILDER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `JS-NODE-TX-BUILDER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `KNOWN-910` | `known_campaign` | `{"known_run_manifest_roots":1,"measurement_report_roots":1}` |
| `LIVE-913` | `live_auth_campaign` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"live_authorization_artifact_roots":1}` |
| `NOVELRUN-912` | `h_novel_pair_aggregate` | `{"campaign_manifest_roots":2,"measurement_report_roots":2,"campaign_pair_set_roots":1}` |
| `RST-COSMWASM-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-COSMWASM-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-NATIVE-CLIENT-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-NATIVE-CLIENT-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-NEAR-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-NEAR-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-SOLANA-ANCHOR-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-SOLANA-ANCHOR-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-SUBSTRATE-FRAME-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `RST-SUBSTRATE-FRAME-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `SOL-EVM-DEFI-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `SOL-EVM-DEFI-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TEST-CHAOS` | `chaos_validation` | `{"campaign_references":"exact_declared_set_may_be_empty","run_manifest_roots":"exact_preregistered_count"}` |
| `TEST-V5` | `known_campaign` | `{"known_run_manifest_roots":1,"measurement_report_roots":0}` |
| `TEST-V6` | `h_gen_pair_aggregate` | `{"campaign_manifest_roots":2,"scope_replica_events":60,"campaign_pair_set_roots":1}` |
| `TEST-V7` | `h_novel_pair_aggregate` | `{"campaign_manifest_roots":2,"measurement_report_roots":2,"campaign_pair_set_roots":1}` |
| `TEST-V8` | `live_auth_campaign` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"live_authorization_artifact_roots":1}` |
| `TS-NODE-KEEPER-ORACLE-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TS-NODE-KEEPER-ORACLE-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TS-NODE-RELAYER-SDK-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TS-NODE-RELAYER-SDK-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TS-NODE-TX-BUILDER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `TS-NODE-TX-BUILDER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `VERTICAL-EVM-BLIND-001` | `h_gen_pair_aggregate` | `{"campaign_manifest_roots":2,"scope_replica_events":2,"campaign_pair_set_roots":1}` |
| `VERTICAL-EVM-LIVE-001` | `live_auth_campaign` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"live_authorization_artifact_roots":1}` |
| `VERTICAL-EVM-NOVEL-001` | `h_novel_pair_aggregate` | `{"campaign_manifest_roots":2,"measurement_report_roots":2,"campaign_pair_set_roots":1}` |
| `VYP-EVM-DEFI-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `VYP-EVM-DEFI-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-COSMWASM-GO-RELAYER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-COSMWASM-GO-RELAYER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-GO-C-FFI-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-GO-C-FFI-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-GO-CPP-FFI-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-GO-CPP-FFI-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-NEAR-JS-CLIENT-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-NEAR-JS-CLIENT-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-SOL-TS-RELAYER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-SOL-TS-RELAYER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-SOLANA-TS-CLIENT-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-SOLANA-TS-CLIENT-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-TS-DATA-SOL-TX-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-TS-DATA-SOL-TX-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-VYP-JS-KEEPER-C5A` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |
| `X-VYP-JS-KEEPER-C5B` | `h_gen_scope_replica` | `{"campaign_manifest_roots":1,"measurement_report_roots":1,"counterpart_campaign_id":1,"campaign_pair_set_root":1}` |

### 16.4 Registry exacto de contributions

Tabla generada desde `acceptance-ledger.v1.json`; cada ID aparece exactamente una vez.

| Contribution criteria ID | Type | Owner repo | Parent primary | Declared gate | Hard contribution deps | Source/expected artifact |
|---|---|---|---|---|---:|---|
| `C0-001` | `genesis_contribution_implementation` | `solguard-deploy` | `GOV-001` | `GOV-001` | 0 | `feat(manifest): capture immutable maturity baseline [C0-001]` |
| `C0-001A` | `contribution_implementation` | `solguard-deploy` | `BASELINE-009` | `BASELINE-009` | 1 | `feat(baseline-replay): run pinned current-state v1-v8 and 90-lab manifests without product mutation [C0-001A]` |
| `C0-001B` | `contribution_implementation` | `solguard-deploy` | `BASELINE-009` | `BASELINE-009` | 1 | `feat(loss-ledger): reconstruct first observable stage loss and baseline metrics [C0-001B]` |
| `C0-002` | `contribution_implementation` | `solguard-docs` | `GOV-002` | `GOV-002` | 0 | `docs(vocabulary): publish canonical product claim dictionary [C0-002]` |
| `C0-003` | `genesis_contribution_implementation` | `solguard-agents` | `GOV-003` | `GOV-003` | 1 | `feat(contracts): register contract owners producers consumers and versions [C0-003]` |
| `C0-004` | `genesis_contribution_implementation` | `solguard-agents` | `GOV-004` | `GOV-004` | 1 | `feat(workers): enforce disjoint ownership and independent review [C0-004]` |
| `C0-005` | `contribution_implementation` | `solguard-core` | `SCOPE-CAP-900` | `SCOPE-CAP-900` | 0 | `fix(profile): make exploit phase unreachable in detection [C0-005]` |
| `C0-006` | `contribution_implementation` | `solguard-deploy` | `SCOPE-CAP-900` | `SCOPE-CAP-900` | 1 | `fix(profile): remove exploit from detection setup and runtime [C0-006]` |
| `C0-007` | `contribution_implementation` | `solguard-agents` | `GOV-008` | `GOV-008` | 0 | `feat(registry): preregister runtime tcb and governance scopes [C0-007]` |
| `C0-008` | `contribution_implementation` | `solguard-docs` | `GOV-002` | `GOV-002` | 1 | `docs(program): publish architecture decisions and evidence rules [C0-008]` |
| `C0-009` | `contribution_implementation` | `solguard-agents` | `GOV-006` | `GOV-006` | 0 | `feat(tasks): generate executable briefs with disjoint ownership [C0-009]` |
| `C0-010` | `contribution_implementation` | `solguard-agents` | `GOV-007` | `GOV-007` | 0 | `feat(acceptance): enforce implementer verifier identity separation [C0-010]` |
| `C0-011` | `contribution_implementation` | `solguard-agents` | `GOV-008` | `GOV-008` | 1 | `feat(scope): reject work outside detection only allowlist [C0-011]` |
| `C0-012` | `genesis_contribution_implementation` | `solguard-agents` | `LEDGER-001` | `LEDGER-001` | 1 | `feat(ledger-schema): publish acceptance ledger event and transition schemas goldens and deterministic evaluator with writer off [C0-012]` |
| `C0-013` | `genesis_contribution_implementation` | `solguard-deploy` | `LEDGER-001` | `LEDGER-001` | 1 | `feat(ledger-reader): validate acceptance ledger events and dependency state [C0-013]` |
| `C0-014` | `genesis_contribution_implementation` | `solguard-docs` | `LEDGER-001` | `LEDGER-001` | 2 | `feat(ledger-reader): render ledger state without inferring acceptance [C0-014]` |
| `C0-015` | `genesis_contribution_implementation` | `solguard-deploy` | `LEDGER-001` | `LEDGER-001` | 2 | `test(ledger-contract): verify readers against valid tampered replay and future fixtures [C0-015]` |
| `C0-016` | `genesis_contribution_implementation` | `solguard-agents` | `LEDGER-001` | `LEDGER-001` | 1 | `feat(ledger-writer): activate create-only signed acceptance and reopen events after every reader is ready [C0-016]` |
| `C0-017` | `genesis_contribution_implementation` | `solguard-deploy` | `LEDGER-001` | `LEDGER-001` | 1 | `test(ledger-new-new): feed real writer output replay tamper stale dependency and reopen cases to every reader [C0-017]` |
| `C0-101` | `contribution_implementation` | `solguard-value` | `GOV-005` | `GOV-005` | 0 | `docs(changelog): start structural maturity ledger [C0-101]` |
| `C0-102` | `contribution_implementation` | `solguard-validate` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-102]` |
| `C0-103` | `contribution_implementation` | `solguard-trace` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-103]` |
| `C0-104` | `contribution_implementation` | `solguard-map` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-104]` |
| `C0-105` | `contribution_implementation` | `solguard-invariant` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-105]` |
| `C0-106` | `contribution_implementation` | `solguard-filter` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-106]` |
| `C0-107` | `contribution_implementation` | `solguard-economic` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-107]` |
| `C0-108` | `contribution_implementation` | `solguard-docs` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-108]` |
| `C0-109` | `contribution_implementation` | `solguard-discover` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-109]` |
| `C0-110` | `contribution_implementation` | `solguard-diff` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-110]` |
| `C0-111` | `contribution_implementation` | `solguard-deploy` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-111]` |
| `C0-112` | `contribution_implementation` | `solguard-database` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-112]` |
| `C0-113` | `contribution_implementation` | `solguard-core` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-113]` |
| `C0-114` | `contribution_implementation` | `solguard-backend` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-114]` |
| `C0-115` | `contribution_implementation` | `solguard-agents` | `GOV-005` | `GOV-005` | 1 | `docs(changelog): start structural maturity ledger [C0-115]` |
| `C1-000V` | `contribution_implementation` | `solguard-validate` | `TRUTH-101` | `TRUTH-101` | 0 | `feat(verdict-schema): publish technical verdict schema and goldens with writer off [C1-000V]` |
| `C1-000VA` | `contribution_implementation` | `solguard-filter` | `TRUTH-101` | `TRUTH-101` | 1 | `feat(verdict-reader): dual-read technical verdicts [C1-000VA]` |
| `C1-000VB` | `contribution_implementation` | `solguard-core` | `TRUTH-101` | `TRUTH-101` | 2 | `feat(verdict-reader): dual-read technical verdicts [C1-000VB]` |
| `C1-000VC` | `contribution_implementation` | `solguard-backend` | `TRUTH-101` | `TRUTH-101` | 2 | `feat(verdict-reader): expose technical verdicts unchanged [C1-000VC]` |
| `C1-000VD` | `contribution_implementation` | `solguard-database` | `TRUTH-101` | `TRUTH-101` | 2 | `feat(verdict-reader): persist technical verdicts without reinterpretation [C1-000VD]` |
| `C1-000VE` | `contribution_implementation` | `solguard-deploy` | `TRUTH-101` | `TRUTH-101` | 2 | `feat(verdict-reader): verify technical verdicts in evaluator and replay [C1-000VE]` |
| `C1-000VF` | `contribution_implementation` | `solguard-deploy` | `TRUTH-101` | `TRUTH-101` | 1 | `test(verdict-contract): verify every old-new and new-new consumer [C1-000VF]` |
| `C1-001` | `contribution_implementation` | `solguard-validate` | `TRUTH-101` | `TRUTH-101` | 1 | `fix(verdict-writer): require complete economic break for supported [C1-001]` |
| `C1-002` | `contribution_implementation` | `solguard-validate` | `TRUTH-101` | `TRUTH-101` | 1 | `test(verdict): reject rule-backed incomplete proofs [C1-002]` |
| `C1-003` | `contribution_implementation` | `solguard-validate` | `TRUTH-102` | `TRUTH-102` | 1 | `test(verdict): prove dedupe and presentation cannot mutate verdict bytes [C1-003]` |
| `C1-003A` | `contribution_implementation` | `solguard-filter` | `TRUTH-103` | `TRUTH-103` | 1 | `feat(admission-schema): publish admission result schema and goldens with writer off [C1-003A]` |
| `C1-003B` | `contribution_implementation` | `solguard-core` | `TRUTH-103` | `TRUTH-103` | 1 | `feat(admission-reader): dual-read admission results [C1-003B]` |
| `C1-003C` | `contribution_implementation` | `solguard-backend` | `TRUTH-103` | `TRUTH-103` | 2 | `feat(admission-reader): expose admission results unchanged [C1-003C]` |
| `C1-003D` | `contribution_implementation` | `solguard-database` | `TRUTH-103` | `TRUTH-103` | 2 | `feat(admission-reader): persist admission results without reinterpretation [C1-003D]` |
| `C1-003E` | `contribution_implementation` | `solguard-deploy` | `TRUTH-103` | `TRUTH-103` | 2 | `feat(admission-reader): verify admission results in evaluator and replay [C1-003E]` |
| `C1-003F` | `contribution_implementation` | `solguard-deploy` | `TRUTH-103` | `TRUTH-103` | 2 | `test(admission-contract): verify every old-new and new-new consumer [C1-003F]` |
| `C1-004` | `contribution_implementation` | `solguard-filter` | `TRUTH-103` | `TRUTH-103` | 1 | `feat(admission-writer): own pass review reject invalid-upstream dedupe and presentation [C1-004]` |
| `C1-005` | `contribution_implementation` | `solguard-filter` | `TRUTH-103` | `TRUTH-103` | 1 | `fix(evidence): require independent corroboration groups [C1-005]` |
| `C1-006` | `contribution_implementation` | `solguard-trace` | `TRUTH-104` | `TRUTH-104` | 1 | `fix(blind): label origin on every scoreable channel [C1-006]` |
| `C1-007` | `contribution_implementation` | `solguard-discover` | `TRUTH-104` | `TRUTH-104` | 1 | `fix(blind): reject known-pattern evidence in generic blind [C1-007]` |
| `C1-008` | `contribution_implementation` | `solguard-core` | `TRUTH-104` | `TRUTH-104` | 1 | `fix(blind): enforce origin policy at canonicalization [C1-008]` |
| `C1-009` | `contribution_implementation` | `solguard-core` | `TRUTH-105` | `TRUTH-105` | 2 | `feat(findings-schema): publish canonical finding review schemas and goldens [C1-009]` |
| `C1-009A` | `contribution_implementation` | `solguard-backend` | `TRUTH-105` | `TRUTH-105` | 1 | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009A]` |
| `C1-009B` | `contribution_implementation` | `solguard-database` | `TRUTH-105` | `TRUTH-105` | 2 | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009B]` |
| `C1-009C` | `contribution_implementation` | `solguard-deploy` | `TRUTH-105` | `TRUTH-105` | 2 | `feat(findings-reader): dual-read canonical finding and review bundles [C1-009C]` |
| `C1-009D` | `contribution_implementation` | `solguard-docs` | `TRUTH-105` | `TRUTH-105` | 2 | `test(findings-reader): validate docs and ui projection from canonical schemas [C1-009D]` |
| `C1-009E` | `contribution_implementation` | `solguard-deploy` | `TRUTH-105` | `TRUTH-105` | 2 | `feat(review-reader): consume product review envelopes in reviewer package [C1-009E]` |
| `C1-009F` | `contribution_implementation` | `solguard-deploy` | `TRUTH-105` | `TRUTH-105` | 2 | `test(findings-contract): verify every old-new and new-new consumer [C1-009F]` |
| `C1-009G` | `contribution_implementation` | `solguard-core` | `TRUTH-105` | `TRUTH-105` | 1 | `feat(findings-projector): implement pure admission to envelopes projection behind writer off [C1-009G]` |
| `C1-010` | `contribution_implementation` | `solguard-backend` | `TRUTH-105` | `TRUTH-105` | 1 | `test(findings-reader): expose synthetic canonical collections and projections unchanged [C1-010]` |
| `C1-011` | `contribution_implementation` | `solguard-database` | `TRUTH-105` | `TRUTH-105` | 2 | `test(findings-reader): round trip every synthetic canonical envelope and role [C1-011]` |
| `C1-012` | `contribution_implementation` | `solguard-deploy` | `TRUTH-106` | `TRUTH-106` | 2 | `refactor(metrics): define oracle-free lineage mapping with canonical writer off [C1-012]` |
| `C1-013` | `contribution_implementation` | `solguard-database` | `TRUTH-106` | `TRUTH-106` | 1 | `fix(metrics): reject ambiguous legacy csv mappings [C1-013]` |
| `C1-014` | `contribution_implementation` | `solguard-deploy` | `TRUTH-107` | `TRUTH-107` | 1 | `fix(gates): split integrity health truth and blind eligibility [C1-014]` |
| `C1-015` | `contribution_implementation` | `solguard-backend` | `TRUTH-108` | `TRUTH-108` | 1 | `fix(integration): pin compatible database and safe defaults [C1-015]` |
| `C1-016` | `contribution_implementation` | `solguard-deploy` | `TRUTH-107` | `TRUTH-107` | 15 | `test(truth): exercise complete authority chain end to end [C1-016]` |
| `C1-017` | `contribution_implementation` | `solguard-agents` | `TRUTH-108` | `TRUTH-108` | 2 | `docs(contracts): route truth work and dependency pins [C1-017]` |
| `C1-018` | `contribution_implementation` | `solguard-docs` | `TRUTH-108` | `TRUTH-108` | 2 | `docs(truth): publish verdict admission metrics and defaults [C1-018]` |
| `C1-020` | `contribution_implementation` | `solguard-core` | `TRUTH-105` | `TRUTH-105` | 1 | `test(findings-projector): reject validation-only publication input [C1-020]` |
| `C1-021` | `contribution_implementation` | `solguard-deploy` | `TRUTH-107` | `TRUTH-107` | 1 | `refactor(gates): remove legacy eligibility aliases [C1-021]` |
| `C1-022` | `contribution_implementation` | `solguard-backend` | `TRUTH-108` | `TRUTH-108` | 1 | `refactor(defaults): remove compatibility release default [C1-022]` |
| `C2-003` | `contribution_implementation` | `solguard-core` | `RUN-202` | `RUN-202` | 1 | `feat(run): activate immutable run specification and source authority writers [C2-003]` |
| `C2-004` | `contribution_implementation` | `solguard-core` | `RUN-202` | `RUN-202` | 1 | `feat(run): validate budgets capabilities and stage dag [C2-004]` |
| `C2-005` | `contribution_implementation` | `solguard-core` | `RUN-203` | `RUN-203` | 0 | `feat(artifacts): add append-only artifact store [C2-005]` |
| `C2-006` | `contribution_implementation` | `solguard-core` | `RUN-204` | `RUN-204` | 0 | `feat(journal): record attempts lineage budgets and monotonic time [C2-006]` |
| `C2-007` | `contribution_implementation` | `solguard-core` | `RUN-205` | `RUN-205` | 0 | `feat(resume): bind cache retry and resume to complete inputs [C2-007]` |
| `C2-008` | `contribution_implementation` | `solguard-core` | `RUN-206` | `RUN-206` | 0 | `feat(supervision): add cancellation deadline and process cleanup [C2-008]` |
| `C2-009` | `contribution_implementation` | `solguard-backend` | `RUN-206` | `RUN-206` | 1 | `feat(control): propagate cancellation and terminal receipts [C2-009]` |
| `C2-009A` | `contribution_implementation` | `solguard-core` | `RUN-207-CORE-READER` | `RUN-207-CORE-READER` | 0 | `feat(publication): dual-read tool-owned output manifests [C2-009A]` |
| `C2-009B` | `contribution_implementation` | `solguard-database` | `RUN-207-DATABASE` | `RUN-207-DATABASE` | 0 | `feat(publication): dual-read sealed output manifests [C2-009B]` |
| `C2-009C` | `contribution_implementation` | `solguard-backend` | `RUN-207-BACKEND` | `RUN-207-BACKEND` | 0 | `feat(publication): expose sealed outputs without rewriting [C2-009C]` |
| `C2-009D` | `contribution_implementation` | `solguard-deploy` | `RUN-207-DEPLOY` | `RUN-207-DEPLOY` | 0 | `feat(publication): verify old and new output matrices [C2-009D]` |
| `C2-010` | `contribution_implementation` | `solguard-map` | `RUN-207-MAP` | `RUN-207-MAP` | 0 | `feat(publication): own and seal map outputs [C2-010]` |
| `C2-011` | `contribution_implementation` | `solguard-trace` | `RUN-207-TRACE` | `RUN-207-TRACE` | 0 | `feat(publication): own and seal trace outputs [C2-011]` |
| `C2-012` | `contribution_implementation` | `solguard-discover` | `RUN-207-DISCOVER` | `RUN-207-DISCOVER` | 0 | `feat(publication): own and seal model and hypothesis outputs [C2-012]` |
| `C2-013` | `contribution_implementation` | `solguard-economic` | `RUN-207-ECONOMIC` | `RUN-207-ECONOMIC` | 0 | `feat(publication): own and seal economic outputs [C2-013]` |
| `C2-014` | `contribution_implementation` | `solguard-invariant` | `RUN-207-INVARIANT` | `RUN-207-INVARIANT` | 0 | `feat(publication): own and seal invariant outputs [C2-014]` |
| `C2-015` | `contribution_implementation` | `solguard-value` | `RUN-207-VALUE` | `RUN-207-VALUE` | 0 | `feat(publication): own and seal proof outputs [C2-015]` |
| `C2-016` | `contribution_implementation` | `solguard-validate` | `RUN-207-VALIDATE` | `RUN-207-VALIDATE` | 0 | `feat(publication): own and seal verdict outputs [C2-016]` |
| `C2-017` | `contribution_implementation` | `solguard-filter` | `RUN-207-FILTER` | `RUN-207-FILTER` | 0 | `feat(publication): own and seal admission outputs [C2-017]` |
| `C2-018` | `contribution_implementation` | `solguard-diff` | `RUN-207-DIFF` | `RUN-207-DIFF` | 0 | `feat(publication): own and seal diff outputs [C2-018]` |
| `C2-019` | `contribution_implementation` | `solguard-core` | `RUN-207-CORE-CUTOVER` | `RUN-207-CORE-CUTOVER` | 0 | `feat(publication): bind hypotheses into canonical candidates [C2-019]` |
| `C2-019A` | `contribution_implementation` | `solguard-deploy` | `RUN-207-E2E` | `RUN-207-E2E` | 0 | `test(publication): prove reader-first tool-owned publication end to end [C2-019A]` |
| `C2-020` | `contribution_implementation` | `solguard-core` | `RUN-208` | `RUN-208` | 0 | `feat(manifest-schema): publish run and product artifact schemas with writer off [C2-020]` |
| `C2-020A` | `contribution_implementation` | `solguard-database` | `RUN-208` | `RUN-208` | 1 | `feat(manifest-reader): dual-read and persist immutable run artifact manifests [C2-020A]` |
| `C2-020B` | `contribution_implementation` | `solguard-backend` | `RUN-208` | `RUN-208` | 1 | `feat(manifest-reader): dual-read run artifacts by identity and role [C2-020B]` |
| `C2-020C` | `contribution_implementation` | `solguard-deploy` | `RUN-208` | `RUN-208` | 1 | `feat(manifest-reader): verify portable manifests without filename authority [C2-020C]` |
| `C2-020D` | `contribution_implementation` | `solguard-deploy` | `RUN-208` | `RUN-208` | 1 | `test(manifest-contract): verify all old-new and new-new consumers [C2-020D]` |
| `C2-021` | `contribution_implementation` | `solguard-core` | `RUN-208` | `RUN-208` | 1 | `feat(manifest-writer): close portable run and product manifests [C2-021]` |
| `C2-022` | `contribution_implementation` | `solguard-backend` | `RUN-208` | `RUN-208` | 1 | `feat(runs): expose manifests artifacts and terminal states [C2-022]` |
| `C2-023` | `contribution_implementation` | `solguard-deploy` | `RUN-208` | `RUN-208` | 1 | `test(runtime): replay portable run and reject tampering [C2-023]` |
| `C2-024` | `contribution_implementation` | `solguard-docs` | `RUN-208` | `RUN-208` | 1 | `docs(runtime): publish contracts resume cancel and recovery [C2-024]` |
| `C2-025` | `contribution_implementation` | `solguard-core` | `RUN-209` | `RUN-209` | 0 | `refactor(handoffs): replace implicit temp paths with artifact identities [C2-025]` |
| `C2-026` | `contribution_implementation` | `solguard-deploy` | `RUN-209` | `RUN-209` | 1 | `test(handoffs): prove concurrent runs cannot consume implicit files [C2-026]` |
| `C2-027` | `contribution_implementation` | `solguard-core` | `RUN-210` | `RUN-210` | 0 | `fix(artifacts): reject corrupt foreign partial and incompatible roots [C2-027]` |
| `C2-028` | `contribution_implementation` | `solguard-deploy` | `RUN-210` | `RUN-210` | 1 | `test(artifacts): execute tamper and foreign-root chaos matrix [C2-028]` |
| `C2-030` | `contribution_implementation` | `solguard-core` | `RUN-207-CORE-CUTOVER` | `RUN-207-CORE-CUTOVER` | 1 | `refactor(runtime): remove implicit shared tool outputs [C2-030]` |
| `C2-CON-01` | `contribution_implementation` | `solguard-agents` | `RUN-201` | `RUN-201` | 0 | `feat(contracts): inventory every vendored contract copy [C2-CON-01]` |
| `C2-CON-02` | `contribution_implementation` | `solguard-core` | `RUN-201` | `RUN-201` | 1 | `feat(contracts): publish neutral crate schemas and goldens [C2-CON-02]` |
| `C2-CON-03` | `contribution_implementation` | `solguard-map` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-03]` |
| `C2-CON-04` | `contribution_implementation` | `solguard-trace` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-04]` |
| `C2-CON-05` | `contribution_implementation` | `solguard-discover` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-05]` |
| `C2-CON-06` | `contribution_implementation` | `solguard-economic` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-06]` |
| `C2-CON-07` | `contribution_implementation` | `solguard-invariant` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-07]` |
| `C2-CON-08` | `contribution_implementation` | `solguard-value` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-08]` |
| `C2-CON-09` | `contribution_implementation` | `solguard-validate` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-09]` |
| `C2-CON-10` | `contribution_implementation` | `solguard-filter` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-10]` |
| `C2-CON-11` | `contribution_implementation` | `solguard-diff` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): dual-read canonical shared types [C2-CON-11]` |
| `C2-CON-12` | `contribution_implementation` | `solguard-database` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): consume generated canonical schemas [C2-CON-12]` |
| `C2-CON-13` | `contribution_implementation` | `solguard-backend` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): consume generated canonical schemas [C2-CON-13]` |
| `C2-CON-14` | `contribution_implementation` | `solguard-deploy` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): verify canonical schemas and goldens [C2-CON-14]` |
| `C2-CON-15` | `contribution_implementation` | `solguard-agents` | `RUN-201` | `RUN-201` | 1 | `feat(contracts): bind every consumer to canonical source [C2-CON-15]` |
| `C2-CON-RM-01` | `contribution_implementation` | `solguard-core` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-01]` |
| `C2-CON-RM-02` | `contribution_implementation` | `solguard-map` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-02]` |
| `C2-CON-RM-03` | `contribution_implementation` | `solguard-trace` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-03]` |
| `C2-CON-RM-04` | `contribution_implementation` | `solguard-discover` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-04]` |
| `C2-CON-RM-05` | `contribution_implementation` | `solguard-economic` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-05]` |
| `C2-CON-RM-06` | `contribution_implementation` | `solguard-invariant` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-06]` |
| `C2-CON-RM-07` | `contribution_implementation` | `solguard-value` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-07]` |
| `C2-CON-RM-08` | `contribution_implementation` | `solguard-validate` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-08]` |
| `C2-CON-RM-09` | `contribution_implementation` | `solguard-filter` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-09]` |
| `C2-CON-RM-10` | `contribution_implementation` | `solguard-diff` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-10]` |
| `C2-CON-RM-11` | `contribution_implementation` | `solguard-database` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-11]` |
| `C2-CON-RM-12` | `contribution_implementation` | `solguard-backend` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-12]` |
| `C2-CON-RM-13` | `contribution_implementation` | `solguard-deploy` | `RUN-201` | `RUN-201` | 1 | `refactor(contracts): remove vendored authoritative copies [C2-CON-RM-13]` |
| `C2-CON-RM-14` | `absence_receipt_contribution` | `solguard-docs` | `RUN-201` | `RUN-201` | 1 | `receipt de ausencia [C2-CON-RM-14]` |
| `C2-CON-RM-15` | `absence_receipt_contribution` | `solguard-agents` | `RUN-201` | `RUN-201` | 1 | `receipt de ausencia [C2-CON-RM-15]` |
| `C2-CON-RM-16` | `contribution_implementation` | `solguard-agents` | `RUN-201` | `RUN-201` | 1 | `ci(contracts): reject authoritative contract copies [C2-CON-RM-16]` |
| `C2-RUN-01` | `contribution_implementation` | `solguard-core` | `RUN-202` | `RUN-202` | 0 | `feat(run-contracts): publish run spec source authority and generic materiality schemas with writers off [C2-RUN-01]` |
| `C2-RUN-02` | `contribution_implementation` | `solguard-map` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-02]` |
| `C2-RUN-03` | `contribution_implementation` | `solguard-trace` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-03]` |
| `C2-RUN-04` | `contribution_implementation` | `solguard-discover` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-04]` |
| `C2-RUN-05` | `contribution_implementation` | `solguard-economic` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read generic materiality profile [C2-RUN-05]` |
| `C2-RUN-06` | `contribution_implementation` | `solguard-invariant` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-06]` |
| `C2-RUN-07` | `contribution_implementation` | `solguard-value` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec materiality and source authority [C2-RUN-07]` |
| `C2-RUN-08` | `contribution_implementation` | `solguard-validate` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): verify generic materiality commitment and source bindings [C2-RUN-08]` |
| `C2-RUN-09` | `contribution_implementation` | `solguard-filter` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): verify immutable generic run profile before admission [C2-RUN-09]` |
| `C2-RUN-10` | `contribution_implementation` | `solguard-diff` | `RUN-202` | `RUN-202` | 1 | `refactor(run-reader): dual-read run spec and source authority [C2-RUN-10]` |
| `C2-RUN-11` | `contribution_implementation` | `solguard-backend` | `RUN-202` | `RUN-202` | 1 | `feat(run-reader): expose canonical run spec without reinterpretation [C2-RUN-11]` |
| `C2-RUN-12` | `contribution_implementation` | `solguard-deploy` | `RUN-202` | `RUN-202` | 1 | `feat(run-verifier): verify run source generic materiality and hiding commitment contracts [C2-RUN-12]` |
| `C2-RUN-13` | `contribution_implementation` | `solguard-deploy` | `RUN-202` | `RUN-202` | 1 | `test(run-prewriter): execute old-new tamper dictionary fingerprint and leak matrix with writers off [C2-RUN-13]` |
| `C2-SCOPE-01` | `contribution_implementation` | `solguard-deploy` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 0 | `build(languages): publish scope-manifest schema goldens and toolchain profile harness [C2-SCOPE-01]` |
| `C2-SCOPE-02` | `contribution_implementation` | `solguard-map` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-02]` |
| `C2-SCOPE-03` | `contribution_implementation` | `solguard-trace` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-03]` |
| `C2-SCOPE-04` | `contribution_implementation` | `solguard-discover` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-04]` |
| `C2-SCOPE-05` | `contribution_implementation` | `solguard-economic` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-05]` |
| `C2-SCOPE-06` | `contribution_implementation` | `solguard-invariant` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-06]` |
| `C2-SCOPE-07` | `contribution_implementation` | `solguard-value` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-07]` |
| `C2-SCOPE-08` | `contribution_implementation` | `solguard-validate` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-08]` |
| `C2-SCOPE-09` | `contribution_implementation` | `solguard-filter` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-09]` |
| `C2-SCOPE-10` | `contribution_implementation` | `solguard-diff` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): consume exact language scope manifests [C2-SCOPE-10]` |
| `C2-SCOPE-11` | `contribution_implementation` | `solguard-core` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): validate scope manifests before scheduling [C2-SCOPE-11]` |
| `C2-SCOPE-12` | `contribution_implementation` | `solguard-deploy` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `feat(scope-reader): validate manifests for qualification and certification [C2-SCOPE-12]` |
| `C2-SCOPE-13` | `contribution_implementation` | `solguard-deploy` | `LANG-020-HARNESS` | `LANG-020-HARNESS` | 1 | `test(scope-contract): verify every reader with profile writers off [C2-SCOPE-13]` |
| `C3-001` | `contribution_implementation` | `solguard-map` | `IR-301` | `IR-301` | 0 | `feat(ir-schema): publish semantic ir schema and goldens [C3-001]` |
| `C3-001A` | `contribution_implementation` | `solguard-trace` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001A]` |
| `C3-001B` | `contribution_implementation` | `solguard-discover` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001B]` |
| `C3-001C` | `contribution_implementation` | `solguard-diff` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001C]` |
| `C3-001D` | `contribution_implementation` | `solguard-economic` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001D]` |
| `C3-001E` | `contribution_implementation` | `solguard-invariant` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001E]` |
| `C3-001F` | `contribution_implementation` | `solguard-value` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001F]` |
| `C3-001G` | `contribution_implementation` | `solguard-validate` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): dual-read canonical semantic ir [C3-001G]` |
| `C3-001H` | `contribution_implementation` | `solguard-core` | `IR-301` | `IR-301` | 1 | `feat(ir-reader): verify canonical semantic ir envelopes [C3-001H]` |
| `C3-001I` | `contribution_implementation` | `solguard-deploy` | `IR-301` | `IR-301` | 1 | `test(ir-contract): verify old-old new-old and old-new with writer off [C3-001I]` |
| `C3-002` | `contribution_implementation` | `solguard-map` | `IR-301` | `IR-301` | 1 | `feat(ir-writer): emit versioned semantic ir [C3-002]` |
| `C3-002A` | `contribution_implementation` | `solguard-deploy` | `IR-301` | `IR-301` | 1 | `test(ir-contract): run new-new failure reorder and tamper matrix [C3-002A]` |
| `C3-003` | `contribution_implementation` | `solguard-map` | `IR-302` | `IR-302` | 0 | `feat(identity): define canonical callable state flow and route ids [C3-003]` |
| `C3-004` | `contribution_implementation` | `solguard-core` | `IR-302` | `IR-302` | 1 | `feat(identity): reject ambiguous cross-domain bindings [C3-004]` |
| `C3-004A` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 0 | `feat(trace-schema): publish trace graph schema and goldens with writer off [C3-004A]` |
| `C3-004B` | `contribution_implementation` | `solguard-discover` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004B]` |
| `C3-004C` | `contribution_implementation` | `solguard-economic` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004C]` |
| `C3-004D` | `contribution_implementation` | `solguard-value` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004D]` |
| `C3-004E` | `contribution_implementation` | `solguard-invariant` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004E]` |
| `C3-004F` | `contribution_implementation` | `solguard-validate` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004F]` |
| `C3-004G` | `contribution_implementation` | `solguard-core` | `IR-303` | `IR-303` | 1 | `feat(trace-reader): dual-read trace graphs [C3-004G]` |
| `C3-004H` | `contribution_implementation` | `solguard-deploy` | `IR-303` | `IR-303` | 1 | `test(trace-contract): verify old-old new-old and old-new readers [C3-004H]` |
| `C3-005` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-writer): derive typed control data and state paths [C3-005]` |
| `C3-005A` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-summaries): build bounded interprocedural effect summaries [C3-005A]` |
| `C3-005B` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-scc): collapse recursion and cyclic call components without losing debt [C3-005B]` |
| `C3-005C` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-slices): emit backward and forward causal slices [C3-005C]` |
| `C3-005D` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-dominance): compute dominators postdominators and control dependence [C3-005D]` |
| `C3-005E` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-feasibility): prune infeasible paths with typed constraints and explicit unknown [C3-005E]` |
| `C3-005F` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-continuations): checkpoint and resume bounded graph exploration [C3-005F]` |
| `C3-005G` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-cache): isolate content-addressed summaries slices and feasibility caches [C3-005G]` |
| `C3-005H` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 1 | `feat(trace-priority): prioritize economic risk without deleting reachable evidence [C3-005H]` |
| `C3-006` | `contribution_implementation` | `solguard-trace` | `IR-303` | `IR-303` | 2 | `fix(binding): preserve unresolved and candidate sets [C3-006]` |
| `C3-006A` | `contribution_implementation` | `solguard-deploy` | `IR-303` | `IR-303` | 1 | `test(trace-contract): verify new-new failure reorder and tamper matrix [C3-006A]` |
| `C3-006B` | `contribution_implementation` | `solguard-trace` | `IR-308` | `IR-308` | 0 | `feat(causal-capabilities): emit measured TRACE capability receipts [C3-006B]` |
| `C3-006C` | `contribution_implementation` | `solguard-deploy` | `IR-308` | `IR-308` | 1 | `test(causal-capabilities): verify TRACE producer through every reader [C3-006C]` |
| `C3-007` | `contribution_implementation` | `solguard-map` | `IR-304` | `IR-304` | 0 | `feat(capability-schema): publish receipt schema and goldens with writers off [C3-007]` |
| `C3-007A` | `contribution_implementation` | `solguard-core` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): dual-read measured capability receipts [C3-007A]` |
| `C3-007B` | `contribution_implementation` | `solguard-trace` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume map frontend capability receipts [C3-007B]` |
| `C3-007C` | `contribution_implementation` | `solguard-discover` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007C]` |
| `C3-007D` | `contribution_implementation` | `solguard-diff` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007D]` |
| `C3-007E` | `contribution_implementation` | `solguard-economic` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007E]` |
| `C3-007F` | `contribution_implementation` | `solguard-invariant` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007F]` |
| `C3-007G` | `contribution_implementation` | `solguard-value` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007G]` |
| `C3-007H` | `contribution_implementation` | `solguard-validate` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): consume semantic capability receipts [C3-007H]` |
| `C3-007I` | `contribution_implementation` | `solguard-deploy` | `IR-304` | `IR-304` | 1 | `feat(capability-reader): verify receipt schemas and denominators [C3-007I]` |
| `C3-007IA` | `contribution_implementation` | `solguard-deploy` | `IR-304` | `IR-304` | 1 | `test(capability-contract): verify every reader with writers off [C3-007IA]` |
| `C3-007J` | `contribution_implementation` | `solguard-map` | `IR-304` | `IR-304` | 1 | `feat(frontend-capabilities): emit measured frontend capability receipts [C3-007J]` |
| `C3-007L` | `contribution_implementation` | `solguard-deploy` | `IR-304` | `IR-304` | 1 | `test(frontend-capabilities): verify MAP producer through every reader [C3-007L]` |
| `C3-008` | `contribution_implementation` | `solguard-core` | `IR-308` | `IR-308` | 1 | `feat(capabilities): gate consumers on accepted MAP and TRACE receipts [C3-008]` |
| `C3-009` | `contribution_implementation` | `solguard-diff` | `IR-305` | `IR-305` | 0 | `feat(ir): compare semantic ir and build profiles [C3-009]` |
| `C3-009A` | `contribution_implementation` | `solguard-diff` | `IR-306` | `IR-306` | 0 | `test(metamorphic): preserve causal identities across equivalent transforms [C3-009A]` |
| `C3-009AA` | `contribution_implementation` | `solguard-map` | `IR-307` | `IR-307` | 0 | `feat(frontend-manifest-schema): publish frontend manifest schema and goldens with writer off [C3-009AA]` |
| `C3-009AB` | `contribution_implementation` | `solguard-trace` | `IR-307` | `IR-307` | 1 | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AB]` |
| `C3-009AC` | `contribution_implementation` | `solguard-discover` | `IR-307` | `IR-307` | 1 | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AC]` |
| `C3-009AD` | `contribution_implementation` | `solguard-diff` | `IR-307` | `IR-307` | 1 | `feat(frontend-manifest-reader): consume exact frontend manifests [C3-009AD]` |
| `C3-009AE` | `contribution_implementation` | `solguard-core` | `IR-307` | `IR-307` | 1 | `feat(frontend-manifest-reader): verify exact frontend manifests [C3-009AE]` |
| `C3-009AF` | `contribution_implementation` | `solguard-deploy` | `IR-307` | `IR-307` | 1 | `test(frontend-manifest-contract): verify all readers before writer [C3-009AF]` |
| `C3-009B` | `contribution_implementation` | `solguard-map` | `IR-307` | `IR-307` | 1 | `fix(frontend-writer): emit manifest and unsupported instead of fabricated facts [C3-009B]` |
| `C3-009C` | `contribution_implementation` | `solguard-deploy` | `IR-307` | `IR-307` | 1 | `test(frontend): propagate unsupported through the vertical slice [C3-009C]` |
| `C3-010` | `contribution_implementation` | `solguard-discover` | `MODEL-401` | `MODEL-401` | 0 | `feat(model-schema): publish protocol model schema and goldens [C3-010]` |
| `C3-010A` | `contribution_implementation` | `solguard-economic` | `MODEL-401` | `MODEL-401` | 1 | `feat(model-reader): dual-read protocol model [C3-010A]` |
| `C3-010B` | `contribution_implementation` | `solguard-invariant` | `MODEL-401` | `MODEL-401` | 1 | `feat(model-reader): dual-read protocol model [C3-010B]` |
| `C3-010C` | `contribution_implementation` | `solguard-value` | `MODEL-401` | `MODEL-401` | 1 | `feat(model-reader): dual-read protocol model [C3-010C]` |
| `C3-010D` | `contribution_implementation` | `solguard-core` | `MODEL-401` | `MODEL-401` | 1 | `feat(model-reader): dual-read protocol model [C3-010D]` |
| `C3-010DA` | `contribution_implementation` | `solguard-deploy` | `MODEL-401` | `MODEL-401` | 1 | `test(model-contract): verify every reader with writer off [C3-010DA]` |
| `C3-010E` | `contribution_implementation` | `solguard-discover` | `MODEL-401` | `MODEL-401` | 1 | `feat(model-writer): emit actors assets states and boundaries [C3-010E]` |
| `C3-010F` | `contribution_implementation` | `solguard-deploy` | `MODEL-401` | `MODEL-401` | 1 | `test(model-contract): run new-new failure and tamper matrix [C3-010F]` |
| `C3-011` | `contribution_implementation` | `solguard-discover` | `MODEL-402` | `MODEL-402` | 0 | `fix(reasoning): require coverage before absence claims [C3-011]` |
| `C3-012` | `contribution_implementation` | `solguard-economic` | `MODEL-403` | `MODEL-403` | 0 | `feat(transition-schema): publish economic transition schema and goldens [C3-012]` |
| `C3-012A` | `contribution_implementation` | `solguard-invariant` | `MODEL-403` | `MODEL-403` | 1 | `feat(transition-reader): dual-read economic transitions [C3-012A]` |
| `C3-012B` | `contribution_implementation` | `solguard-value` | `MODEL-403` | `MODEL-403` | 1 | `feat(transition-reader): dual-read economic transitions [C3-012B]` |
| `C3-012C` | `contribution_implementation` | `solguard-validate` | `MODEL-403` | `MODEL-403` | 1 | `feat(transition-reader): dual-read economic transitions [C3-012C]` |
| `C3-012D` | `contribution_implementation` | `solguard-core` | `MODEL-403` | `MODEL-403` | 1 | `feat(transition-reader): dual-read economic transitions [C3-012D]` |
| `C3-012DA` | `contribution_implementation` | `solguard-deploy` | `MODEL-403` | `MODEL-403` | 1 | `test(transition-contract): verify every reader with writer off [C3-012DA]` |
| `C3-012E` | `contribution_implementation` | `solguard-economic` | `MODEL-403` | `MODEL-403` | 1 | `feat(transition-writer): emit typed economic state transitions [C3-012E]` |
| `C3-012F` | `contribution_implementation` | `solguard-deploy` | `MODEL-403` | `MODEL-403` | 1 | `test(transition-contract): run new-new failure and tamper matrix [C3-012F]` |
| `C3-013` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 0 | `feat(kernel-registry): publish typed economic kernel interfaces and applicability [C3-013]` |
| `C3-013A` | `contribution_implementation` | `solguard-economic` | `MODEL-410` | `MODEL-410` | 0 | `feat(units): type assets scales prices periods and numeric domains [C3-013A]` |
| `C3-013B` | `contribution_implementation` | `solguard-deploy` | `MODEL-410` | `MODEL-410` | 1 | `test(units): verify dimensional metamorphic and adversarial matrix [C3-013B]` |
| `C3-013C` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 2 | `feat(kernels-conservation): implement conservation backing and bounded-supply laws [C3-013C]` |
| `C3-013D` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-vault): implement shares assets first-depositor and requested-received laws [C3-013D]` |
| `C3-013E` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-credit): implement debt collateral liquidation and solvency laws [C3-013E]` |
| `C3-013F` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-fees): implement fee rebase rounding and precision laws [C3-013F]` |
| `C3-013G` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-oracle): implement oracle twap staleness and manipulation laws [C3-013G]` |
| `C3-013H` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-distributed): implement cross-component and distributed-accounting laws [C3-013H]` |
| `C3-013I` | `contribution_implementation` | `solguard-economic` | `MODEL-404` | `MODEL-404` | 1 | `feat(kernels-order): implement atomicity callback ordering and finality laws [C3-013I]` |
| `C3-013J` | `contribution_implementation` | `solguard-economic` | `MODEL-411` | `MODEL-411` | 0 | `feat(adversary-schema): publish economic adversary model schema and goldens with writer off [C3-013J]` |
| `C3-013K` | `contribution_implementation` | `solguard-value` | `MODEL-411` | `MODEL-411` | 1 | `feat(adversary-reader): rederive feasibility and conservative net delta [C3-013K]` |
| `C3-013L` | `contribution_implementation` | `solguard-validate` | `MODEL-411` | `MODEL-411` | 1 | `feat(adversary-reader): verify feasibility bounds actor and external preconditions [C3-013L]` |
| `C3-013M` | `contribution_implementation` | `solguard-core` | `MODEL-411` | `MODEL-411` | 1 | `feat(adversary-reader): bind adversary model into proof obligations and evidence waves [C3-013M]` |
| `C3-013N` | `contribution_implementation` | `solguard-deploy` | `MODEL-411` | `MODEL-411` | 3 | `test(adversary-contract): verify all readers with writer off [C3-013N]` |
| `C3-013O` | `contribution_implementation` | `solguard-economic` | `MODEL-411` | `MODEL-411` | 1 | `feat(adversary-writer): emit bounded satisfiable unsat or unknown strategies [C3-013O]` |
| `C3-013P` | `contribution_implementation` | `solguard-deploy` | `MODEL-411` | `MODEL-411` | 1 | `test(adversary-e2e): prove net impact under realistic capital market and ordering constraints [C3-013P]` |
| `C3-014` | `contribution_implementation` | `solguard-invariant` | `MODEL-405` | `MODEL-405` | 0 | `feat(invariant-schema): publish invariant set schema and goldens [C3-014]` |
| `C3-014A` | `contribution_implementation` | `solguard-value` | `MODEL-405` | `MODEL-405` | 1 | `feat(invariant-reader): dual-read invariant sets [C3-014A]` |
| `C3-014B` | `contribution_implementation` | `solguard-validate` | `MODEL-405` | `MODEL-405` | 1 | `feat(invariant-reader): dual-read invariant sets [C3-014B]` |
| `C3-014C` | `contribution_implementation` | `solguard-core` | `MODEL-405` | `MODEL-405` | 1 | `feat(invariant-reader): dual-read invariant sets [C3-014C]` |
| `C3-014D` | `contribution_implementation` | `solguard-discover` | `MODEL-405` | `MODEL-405` | 1 | `feat(invariant-reader): dual-read invariant sets [C3-014D]` |
| `C3-014DA` | `contribution_implementation` | `solguard-deploy` | `MODEL-405` | `MODEL-405` | 1 | `test(invariant-contract): verify every reader with writer off [C3-014DA]` |
| `C3-014E` | `contribution_implementation` | `solguard-invariant` | `MODEL-405` | `MODEL-405` | 1 | `feat(invariant-writer): emit independent scoped base properties [C3-014E]` |
| `C3-014F` | `contribution_implementation` | `solguard-deploy` | `MODEL-405` | `MODEL-405` | 1 | `test(invariant-contract): run new-new failure and tamper matrix [C3-014F]` |
| `C3-015` | `contribution_implementation` | `solguard-discover` | `MODEL-406` | `MODEL-406` | 0 | `feat(hypothesis-schema): publish hypothesis envelope schema and goldens [C3-015]` |
| `C3-015A` | `contribution_implementation` | `solguard-core` | `MODEL-406` | `MODEL-406` | 1 | `feat(hypothesis-reader): dual-read hypothesis envelopes [C3-015A]` |
| `C3-015AA` | `contribution_implementation` | `solguard-deploy` | `MODEL-406` | `MODEL-406` | 1 | `test(hypothesis-contract): verify CORE reader with writer off [C3-015AA]` |
| `C3-015B` | `contribution_implementation` | `solguard-discover` | `MODEL-406` | `MODEL-406` | 1 | `feat(hypothesis-writer): emit separate known and open world hypotheses [C3-015B]` |
| `C3-015C` | `contribution_implementation` | `solguard-deploy` | `MODEL-406` | `MODEL-406` | 1 | `test(hypothesis-contract): run new-new failure and tamper matrix [C3-015C]` |
| `C3-015D` | `contribution_implementation` | `solguard-core` | `MODEL-407` | `MODEL-407` | 0 | `feat(candidate-schema): publish canonical candidate schema and goldens with writer off [C3-015D]` |
| `C3-015E` | `contribution_implementation` | `solguard-value` | `MODEL-407` | `MODEL-407` | 1 | `feat(candidate-reader): dual-read canonical candidates [C3-015E]` |
| `C3-015F` | `contribution_implementation` | `solguard-validate` | `MODEL-407` | `MODEL-407` | 1 | `feat(candidate-reader): dual-read canonical candidates [C3-015F]` |
| `C3-015G` | `contribution_implementation` | `solguard-filter` | `MODEL-407` | `MODEL-407` | 1 | `feat(candidate-reader): dual-read canonical candidates [C3-015G]` |
| `C3-015H` | `contribution_implementation` | `solguard-deploy` | `MODEL-407` | `MODEL-407` | 1 | `test(candidate-contract): verify every reader before writer [C3-015H]` |
| `C3-016` | `contribution_implementation` | `solguard-core` | `MODEL-406` | `MODEL-406` | 1 | `feat(hypotheses): enforce known and open track isolation [C3-016]` |
| `C3-016A` | `contribution_implementation` | `solguard-discover` | `MODEL-406` | `MODEL-406` | 2 | `refactor(origins): separate semantic model rule-pack retrieval and direct-tool producers [C3-016A]` |
| `C3-016B` | `contribution_implementation` | `solguard-core` | `MODEL-406` | `MODEL-406` | 2 | `feat(origin-policy): preserve origin sets taint and forbid post-merge relabeling [C3-016B]` |
| `C3-016C` | `contribution_implementation` | `solguard-deploy` | `MODEL-406` | `MODEL-406` | 2 | `test(ablations): compare generic model rule-pack full and known-retrieval profiles [C3-016C]` |
| `C3-016D` | `contribution_implementation` | `solguard-core` | `MODEL-406` | `MODEL-406` | 1 | `feat(model-gateway): enforce structured context channels and untrusted-source boundaries [C3-016D]` |
| `C3-016E` | `contribution_implementation` | `solguard-discover` | `MODEL-406` | `MODEL-406` | 1 | `feat(prompt-boundary): emit proposals through typed schema with provenance and no instruction execution [C3-016E]` |
| `C3-016F` | `contribution_implementation` | `solguard-deploy` | `MODEL-406` | `MODEL-406` | 1 | `test(prompt-injection): mutate source comments manifests tool output and retrieved text [C3-016F]` |
| `C3-017` | `contribution_implementation` | `solguard-core` | `MODEL-407` | `MODEL-407` | 1 | `fix(candidate-writer): bind candidate root trigger impact and route exactly [C3-017]` |
| `C3-017A` | `contribution_implementation` | `solguard-deploy` | `MODEL-407` | `MODEL-407` | 1 | `test(candidate-contract): verify new-new tamper and cross-binding matrix [C3-017A]` |
| `C3-018` | `contribution_implementation` | `solguard-trace` | `MODEL-408-TRACE` | `MODEL-408-TRACE` | 0 | `feat(sequence): preserve state across transactions [C3-018]` |
| `C3-019` | `contribution_implementation` | `solguard-discover` | `MODEL-408-DISCOVER` | `MODEL-408-DISCOVER` | 0 | `feat(counterfactual): propose multi-step causal hypotheses [C3-019]` |
| `C3-020` | `contribution_implementation` | `solguard-economic` | `MODEL-408-ECONOMIC` | `MODEL-408-ECONOMIC` | 0 | `feat(counterfactual): evaluate multi-transaction economic paths [C3-020]` |
| `C3-021` | `contribution_implementation` | `solguard-deploy` | `MODEL-408-E2E` | `MODEL-408-E2E` | 0 | `test(world): validate multi-transaction composition and near-misses [C3-021]` |
| `C3-022` | `contribution_implementation` | `solguard-deploy` | `MODEL-409` | `MODEL-409` | 0 | `test(causal-matrix): seal vulnerable patch safe near-miss and mutants [C3-022]` |
| `C3-023` | `contribution_implementation` | `solguard-deploy` | `MODEL-409` | `MODEL-409` | 1 | `test(causal-matrix): verify restored property and oracle separation [C3-023]` |
| `C3-030` | `contribution_implementation` | `solguard-discover` | `MODEL-402` | `MODEL-402` | 1 | `refactor(reasoning): remove lexical absence authority [C3-030]` |
| `C4-000A` | `contribution_implementation` | `solguard-value` | `PROOF-501` | `PROOF-501` | 0 | `feat(obligation-schema): publish proof obligation schema and goldens with writer off [C4-000A]` |
| `C4-000B` | `contribution_implementation` | `solguard-core` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): dual-read proof obligations [C4-000B]` |
| `C4-000C` | `contribution_implementation` | `solguard-validate` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): dual-read proof obligations [C4-000C]` |
| `C4-000D` | `contribution_implementation` | `solguard-map` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): consume directed obligations [C4-000D]` |
| `C4-000E` | `contribution_implementation` | `solguard-trace` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): consume directed obligations [C4-000E]` |
| `C4-000F` | `contribution_implementation` | `solguard-economic` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): consume directed obligations [C4-000F]` |
| `C4-000G` | `contribution_implementation` | `solguard-invariant` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): consume directed obligations [C4-000G]` |
| `C4-000H` | `contribution_implementation` | `solguard-value` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-reader): consume directed obligations [C4-000H]` |
| `C4-000I` | `contribution_implementation` | `solguard-deploy` | `PROOF-501` | `PROOF-501` | 1 | `test(obligation-contract): verify all readers before writer [C4-000I]` |
| `C4-001` | `contribution_implementation` | `solguard-value` | `PROOF-501` | `PROOF-501` | 1 | `feat(obligation-writer): compile mandatory proof obligations by claim [C4-001]` |
| `C4-001A` | `contribution_implementation` | `solguard-deploy` | `PROOF-501` | `PROOF-501` | 1 | `test(obligation-contract): verify new-new failure and tamper matrix [C4-001A]` |
| `C4-002` | `contribution_implementation` | `solguard-core` | `PROOF-502` | `PROOF-502` | 0 | `feat(evidence-schema): publish request and response schemas and goldens with writers off [C4-002]` |
| `C4-002A` | `contribution_implementation` | `solguard-map` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-request-reader): dual-read directed requests [C4-002A]` |
| `C4-002B` | `contribution_implementation` | `solguard-trace` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-request-reader): dual-read directed requests [C4-002B]` |
| `C4-002C` | `contribution_implementation` | `solguard-economic` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-request-reader): dual-read directed requests [C4-002C]` |
| `C4-002D` | `contribution_implementation` | `solguard-value` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-request-reader): dual-read directed requests [C4-002D]` |
| `C4-002E` | `contribution_implementation` | `solguard-invariant` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-request-reader): dual-read directed requests [C4-002E]` |
| `C4-002F` | `contribution_implementation` | `solguard-core` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-response-reader): dual-read provider responses [C4-002F]` |
| `C4-002G` | `contribution_implementation` | `solguard-value` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-response-reader): dual-read provider responses [C4-002G]` |
| `C4-002H` | `contribution_implementation` | `solguard-validate` | `PROOF-502` | `PROOF-502` | 1 | `feat(evidence-response-reader): dual-read provider responses [C4-002H]` |
| `C4-002I` | `contribution_implementation` | `solguard-deploy` | `PROOF-502` | `PROOF-502` | 1 | `test(evidence-contract): verify request and response readers with inert writers [C4-002I]` |
| `C4-003` | `contribution_implementation` | `solguard-map` | `PROOF-503-MAP` | `PROOF-503-MAP` | 0 | `feat(provider): answer directed structural requests [C4-003]` |
| `C4-004` | `contribution_implementation` | `solguard-trace` | `PROOF-503-TRACE` | `PROOF-503-TRACE` | 0 | `feat(provider): answer directed reachability requests [C4-004]` |
| `C4-005` | `contribution_implementation` | `solguard-economic` | `PROOF-503-ECONOMIC` | `PROOF-503-ECONOMIC` | 0 | `feat(provider): answer directed transition requests [C4-005]` |
| `C4-006` | `contribution_implementation` | `solguard-value` | `PROOF-503-VALUE` | `PROOF-503-VALUE` | 0 | `feat(provider): answer directed impact requests [C4-006]` |
| `C4-007` | `contribution_implementation` | `solguard-invariant` | `PROOF-503-INVARIANT` | `PROOF-503-INVARIANT` | 0 | `feat(provider): answer directed invariant requests [C4-007]` |
| `C4-007A` | `contribution_implementation` | `solguard-deploy` | `PROOF-503-E2E` | `PROOF-503-E2E` | 0 | `test(provider): exercise directed request response chain [C4-007A]` |
| `C4-008` | `contribution_implementation` | `solguard-core` | `PROOF-504` | `PROOF-504` | 0 | `feat(scheduler): orchestrate bounded evidence waves [C4-008]` |
| `C4-008A` | `contribution_implementation` | `solguard-core` | `PROOF-509` | `PROOF-509` | 0 | `fix(budgets): propagate exhaustion cancellation and unknown as debt [C4-008A]` |
| `C4-008B` | `contribution_implementation` | `solguard-deploy` | `PROOF-509` | `PROOF-509` | 1 | `test(budgets): exhaust every proof resource dimension [C4-008B]` |
| `C4-008C` | `contribution_implementation` | `solguard-deploy` | `PROOF-504` | `PROOF-504` | 1 | `test(evidence-contract): verify new-new reorder tamper and partial-response matrix [C4-008C]` |
| `C4-009` | `contribution_implementation` | `solguard-value` | `PROOF-505` | `PROOF-505` | 0 | `feat(solver): add typed constraints and dimensional analysis [C4-009]` |
| `C4-010` | `contribution_implementation` | `solguard-economic` | `PROOF-505` | `PROOF-505` | 1 | `feat(solver): verify numeric domains and economic equations [C4-010]` |
| `C4-011` | `contribution_implementation` | `solguard-value` | `PROOF-506` | `PROOF-506` | 0 | `feat(probe): run bounded offline semantic assertions [C4-011]` |
| `C4-011A` | `contribution_implementation` | `solguard-value` | `PROOF-506` | `PROOF-506` | 1 | `feat(probe-symbolic): add typed SMT and symbolic execution adapter [C4-011A]` |
| `C4-011B` | `contribution_implementation` | `solguard-value` | `PROOF-506` | `PROOF-506` | 1 | `feat(probe-property): add property-based fuzzing adapter with deterministic replay [C4-011B]` |
| `C4-011C` | `contribution_implementation` | `solguard-value` | `PROOF-506` | `PROOF-506` | 1 | `feat(probe-concolic): add bounded concolic path exploration adapter [C4-011C]` |
| `C4-011D` | `contribution_implementation` | `solguard-value` | `PROOF-506` | `PROOF-506` | 1 | `feat(probe-snapshot): simulate bounded stateful transaction sequences on pinned snapshots [C4-011D]` |
| `C4-011E` | `contribution_implementation` | `solguard-deploy` | `PROOF-506` | `PROOF-506` | 4 | `test(probe-matrix): verify deterministic adapter receipts isolation and causal agreement [C4-011E]` |
| `C4-012` | `contribution_implementation` | `solguard-deploy` | `PROOF-506` | `PROOF-506` | 2 | `feat(probe): isolate and attest semantic probes [C4-012]` |
| `C4-013` | `contribution_implementation` | `solguard-value` | `PROOF-507` | `PROOF-507` | 0 | `feat(certificate-schema): publish proof certificate schema and goldens with writer off [C4-013]` |
| `C4-014` | `contribution_implementation` | `solguard-validate` | `DECIDE-601` | `DECIDE-601` | 0 | `feat(certificate): dual-read and verify new certificates [C4-014]` |
| `C4-014A` | `contribution_implementation` | `solguard-filter` | `PROOF-507` | `PROOF-507` | 1 | `feat(certificate-reader): dual-read proof certificates for admission [C4-014A]` |
| `C4-014B` | `contribution_implementation` | `solguard-core` | `PROOF-507` | `PROOF-507` | 1 | `feat(certificate-reader): dual-read proof certificates for envelopes [C4-014B]` |
| `C4-014C` | `contribution_implementation` | `solguard-deploy` | `PROOF-507` | `PROOF-507` | 1 | `test(certificate-contract): verify all proof certificate consumers [C4-014C]` |
| `C4-015` | `contribution_implementation` | `solguard-value` | `PROOF-507` | `PROOF-507` | 1 | `feat(certificate): emit complete proof certificates [C4-015]` |
| `C4-016` | `contribution_implementation` | `solguard-validate` | `DECIDE-601` | `DECIDE-601` | 1 | `feat(verdict-writer): emit v1 technical verdict from new certificate and primaries [C4-016]` |
| `C4-017` | `contribution_implementation` | `solguard-value` | `PROOF-508` | `PROOF-508` | 0 | `feat(refutation): emit terminal causal refutations [C4-017]` |
| `C4-018` | `contribution_implementation` | `solguard-validate` | `PROOF-508` | `PROOF-508` | 1 | `feat(refutation): verify protection and impossible-path proofs [C4-018]` |
| `C4-019` | `contribution_implementation` | `solguard-filter` | `DECIDE-602` | `DECIDE-602` | 0 | `feat(checkers): register generic kernel and framework checkers [C4-019]` |
| `C4-019A` | `contribution_implementation` | `solguard-filter` | `DECIDE-602` | `DECIDE-602` | 1 | `feat(admission-writer): emit v1 admission from immutable verdict and checker evidence [C4-019A]` |
| `C4-019B` | `contribution_implementation` | `solguard-deploy` | `DECIDE-602` | `DECIDE-602` | 1 | `test(decision-contract): replay v1 verdict and admission through every consumer [C4-019B]` |
| `C4-020` | `contribution_implementation` | `solguard-core` | `DECIDE-603-CORE` | `DECIDE-603-CORE` | 0 | `feat(ranking): separate product ranking from truth [C4-020]` |
| `C4-021` | `contribution_implementation` | `solguard-validate` | `DECIDE-603-VALIDATE` | `DECIDE-603-VALIDATE` | 0 | `feat(calibration): calibrate by origin language and family [C4-021]` |
| `C4-022` | `contribution_implementation` | `solguard-deploy` | `DECIDE-603-DEPLOY` | `DECIDE-603-DEPLOY` | 0 | `feat(calibration): freeze and evaluate ranking pre-oracle [C4-022]` |
| `C4-022A` | `contribution_implementation` | `solguard-deploy` | `DECIDE-603-E2E` | `DECIDE-603-E2E` | 0 | `test(calibration): prove ranking truth and evaluation separation [C4-022A]` |
| `C4-023` | `contribution_implementation` | `solguard-core` | `DECIDE-604` | `DECIDE-604` | 0 | `feat(product-writer): cut over once to verdict pass review coverage and published sarif products [C4-023]` |
| `C4-023A` | `contribution_implementation` | `solguard-deploy` | `DECIDE-604` | `DECIDE-604` | 1 | `test(product-writer): verify every role and reader new-new retry tamper and partial failure [C4-023A]` |
| `C4-023B` | `contribution_implementation` | `solguard-core` | `DECIDE-604` | `DECIDE-604` | 1 | `refactor(product-writer): remove validation-only runtime path after zero-use receipt [C4-023B]` |
| `C4-024` | `contribution_implementation` | `solguard-filter` | `DECIDE-605` | `DECIDE-605` | 0 | `test(threat): reject forged stale and cross-run evidence [C4-024]` |
| `C4-025` | `contribution_implementation` | `solguard-docs` | `DECIDE-605` | `DECIDE-605` | 1 | `docs(threat): publish finding threat model [C4-025]` |
| `C4-026` | `contribution_implementation` | `solguard-deploy` | `PROOF-508` | `PROOF-508` | 1 | `test(proof): exercise multi-wave proof loop end to end [C4-026]` |
| `C4-027` | `contribution_implementation` | `solguard-deploy` | `PROOF-510` | `PROOF-510` | 0 | `feat(replay): build self-contained causal reproduction packages [C4-027]` |
| `C4-028` | `contribution_implementation` | `solguard-deploy` | `PROOF-510` | `PROOF-510` | 1 | `test(replay): reproduce route delta contradiction and verdict cleanly [C4-028]` |
| `C4-029` | `contribution_implementation` | `solguard-validate` | `DECIDE-606` | `DECIDE-606` | 0 | `fix(scores): keep incomplete evidence outside pass at any score [C4-029]` |
| `C4-029A` | `contribution_implementation` | `solguard-core` | `DECIDE-607` | `DECIDE-607` | 0 | `fix(filter-failure): preserve upstream in typed failure receipts without forged review [C4-029A]` |
| `C4-029B` | `contribution_implementation` | `solguard-filter` | `DECIDE-608` | `DECIDE-608` | 0 | `fix(dedupe): preserve causal groups without metric inflation [C4-029B]` |
| `C4-029C` | `contribution_implementation` | `solguard-deploy` | `DECIDE-606` | `DECIDE-606` | 1 | `test(decision): verify score filter-failure and dedupe invariants [C4-029C]` |
| `C4-030` | `contribution_implementation` | `solguard-validate` | `DECIDE-601` | `DECIDE-601` | 1 | `fix(validation): fail closed on incomplete certificates [C4-030]` |
| `C5-001` | `contribution_implementation` | `solguard-database` | `PLAT-801` | `PLAT-801` | 0 | `feat(schema): publish benchmark database v2 schemas and goldens with writer off [C5-001]` |
| `C5-001A` | `contribution_implementation` | `solguard-backend` | `PLAT-801` | `PLAT-801` | 1 | `feat(database-reader): dual-read benchmark database v1 and v2 [C5-001A]` |
| `C5-001B` | `contribution_implementation` | `solguard-deploy` | `PLAT-801` | `PLAT-801` | 1 | `feat(database-reader): dual-read benchmark database v1 and v2 [C5-001B]` |
| `C5-001C` | `contribution_implementation` | `solguard-deploy` | `PLAT-801` | `PLAT-801` | 1 | `test(database-contract): verify old-old new-old old-new and new-new [C5-001C]` |
| `C5-002` | `contribution_implementation` | `solguard-database` | `PLAT-801` | `PLAT-801` | 1 | `feat(database-writer): implement append-only v2 writes behind disabled flag [C5-002]` |
| `C5-003` | `contribution_implementation` | `solguard-database` | `PLAT-802` | `PLAT-802` | 0 | `feat(migration): implement versioned v2 migration tooling without authority cutover [C5-003]` |
| `C5-004` | `contribution_implementation` | `solguard-database` | `PLAT-802` | `PLAT-802` | 1 | `feat(migration): quarantine and reconcile a legacy database copy [C5-004]` |
| `C5-004A` | `contribution_implementation` | `solguard-deploy` | `PLAT-802` | `PLAT-802` | 1 | `test(migration): reconcile ephemeral v2 through both consumers [C5-004A]` |
| `C5-004B` | `contribution_implementation` | `solguard-database` | `TRUTH-109` | `TRUTH-109` | 0 | `feat(legacy-guard): implement write rejection behind disabled cutover flag [C5-004B]` |
| `C5-004C` | `contribution_implementation` | `solguard-deploy` | `TRUTH-109` | `TRUTH-109` | 1 | `test(legacy-guard): rehearse zero-use cutover restore and stale writer rejection on replicas [C5-004C]` |
| `C5-004F` | `contribution_implementation` | `solguard-deploy` | `TRUTH-110` | `TRUTH-110` | 0 | `test(truth): execute global zero-bypass mutation suite [C5-004F]` |
| `C5-005` | `contribution_implementation` | `solguard-core` | `PLAT-803-CORE` | `PLAT-803-CORE` | 0 | `feat(jobs): expose durable async job control [C5-005]` |
| `C5-005A` | `contribution_implementation` | `solguard-backend` | `PLAT-803-BACKEND` | `PLAT-803-BACKEND` | 0 | `feat(job-api-schema): publish job API schema clients and goldens with server off [C5-005A]` |
| `C5-005B` | `contribution_implementation` | `solguard-deploy` | `PLAT-803-E2E` | `PLAT-803-E2E` | 0 | `feat(job-api-reader): consume versioned job API and event stream [C5-005B]` |
| `C5-005C` | `contribution_implementation` | `solguard-deploy` | `PLAT-803-E2E` | `PLAT-803-E2E` | 1 | `test(job-api-contract): verify old-new and synthetic new-new before server cutover [C5-005C]` |
| `C5-006` | `contribution_implementation` | `solguard-backend` | `PLAT-803-BACKEND` | `PLAT-803-BACKEND` | 1 | `feat(job-api-writer): add create status events cancel and result endpoints [C5-006]` |
| `C5-006A` | `contribution_implementation` | `solguard-deploy` | `PLAT-803-E2E` | `PLAT-803-E2E` | 1 | `test(jobs): verify idempotency reconnect cancel and replay [C5-006A]` |
| `C5-007` | `contribution_implementation` | `solguard-backend` | `PLAT-804` | `PLAT-804` | 0 | `feat(readiness): verify core tools model database and bom [C5-007]` |
| `C5-008` | `contribution_implementation` | `solguard-backend` | `PLAT-804` | `PLAT-804` | 1 | `feat(observability): expose bounded authenticated job telemetry [C5-008]` |
| `C5-009` | `contribution_implementation` | `solguard-agents` | `PLAT-805` | `PLAT-805` | 0 | `feat(dependencies): validate exact producer consumer pins [C5-009]` |
| `C5-010` | `contribution_implementation` | `solguard-deploy` | `PLAT-805` | `PLAT-805` | 1 | `ci(dependencies): test clean checkout compatibility matrix [C5-010]` |
| `C5-011` | `contribution_implementation` | `solguard-docs` | `PLAT-806` | `PLAT-806` | 0 | `docs(contracts): publish api schemas defaults db and runbooks [C5-011]` |
| `C5-012` | `contribution_implementation` | `solguard-docs` | `PLAT-806` | `PLAT-806` | 1 | `docs(recovery): publish backup restore rollback and limits [C5-012]` |
| `C5-013` | `contribution_implementation` | `solguard-deploy` | `BOM-CAP-903` | `BOM-CAP-903` | 0 | `build(release): implement hermetic image provenance builder [C5-013]` |
| `C5-014` | `contribution_implementation` | `solguard-deploy` | `ISO-CAP-904` | `ISO-CAP-904` | 0 | `feat(isolation): implement vm oci and cas boundary [C5-014]` |
| `C5-015` | `contribution_implementation` | `solguard-deploy` | `PLAT-806` | `PLAT-806` | 1 | `test(platform): verify migration recovery and dependency train [C5-015]` |
| `C5-016` | `contribution_implementation` | `solguard-backend` | `PLAT-807` | `PLAT-807` | 0 | `feat(api): add stable cursor pagination and snapshot filters [C5-016]` |
| `C5-017` | `contribution_implementation` | `solguard-backend` | `PLAT-808` | `PLAT-808` | 0 | `fix(isolation): namespace concurrent run state cache logs and decisions [C5-017]` |
| `C5-018` | `contribution_implementation` | `solguard-database` | `PLAT-809` | `PLAT-809` | 0 | `fix(migrations): enforce forward-only production and tested restore [C5-018]` |
| `C5-019` | `contribution_implementation` | `solguard-backend` | `PLAT-810` | `PLAT-810` | 0 | `feat(observability): reconcile evidence closure at every stage [C5-019]` |
| `C5-020` | `contribution_implementation` | `solguard-deploy` | `PLAT-810` | `PLAT-810` | 1 | `test(platform): verify pagination concurrency restore and evidence loss [C5-020]` |
| `C6-C-01` | `contribution_implementation` | `solguard-map` | `LANG-C-01-INTEGRATION` | `LANG-C-01` | 0 | `feat(c): build compile-database semantic frontend [C6-C-01]` |
| `C6-C-02` | `contribution_implementation` | `solguard-map` | `LANG-C-02-INTEGRATION` | `LANG-C-02` | 1 | `feat(c): model preprocessor aliases memory and integer domains [C6-C-02]` |
| `C6-C-03` | `contribution_implementation` | `solguard-trace` | `LANG-C-02-INTEGRATION` | `LANG-C-02` | 1 | `feat(c): bind native memory io and syscall observations [C6-C-03]` |
| `C6-C-04` | `contribution_implementation` | `solguard-discover` | `LANG-C-03-INTEGRATION` | `LANG-C-03` | 1 | `feat(c): normalize native state io and ownership facts [C6-C-04]` |
| `C6-C-04A` | `contribution_implementation` | `solguard-economic` | `LANG-C-03-INTEGRATION` | `LANG-C-03` | 1 | `feat(c): model resource ledger integer and lifecycle transitions [C6-C-04A]` |
| `C6-C-05` | `contribution_implementation` | `solguard-invariant` | `LANG-C-03-INTEGRATION` | `LANG-C-03` | 1 | `feat(c): add independent bounds and conservation invariants [C6-C-05]` |
| `C6-C-05A` | `contribution_implementation` | `solguard-value` | `LANG-C-03-INTEGRATION` | `LANG-C-03` | 1 | `feat(c): prove signed deltas inside a concrete non-ub domain [C6-C-05A]` |
| `C6-C-05B` | `contribution_implementation` | `solguard-value` | `LANG-C-03-INTEGRATION` | `LANG-C-03` | 1 | `feat(c-memory): prove bounds lifetime alias and use-after-free obligations [C6-C-05B]` |
| `C6-C-06` | `contribution_implementation` | `solguard-validate` | `LANG-C-04-INTEGRATION` | `LANG-C-04` | 2 | `feat(c): validate overflow alias lifetime and state paths [C6-C-06]` |
| `C6-C-06A` | `contribution_implementation` | `solguard-validate` | `LANG-C-04-INTEGRATION` | `LANG-C-04` | 1 | `feat(c-memory): require a causal memory-safety to economic-impact bridge [C6-C-06A]` |
| `C6-C-07` | `contribution_implementation` | `solguard-filter` | `LANG-C-04-INTEGRATION` | `LANG-C-04` | 2 | `test(c): reject ub-dependent or partial proof inputs and review only complete-proof admission debt [C6-C-07]` |
| `C6-C-07A` | `contribution_implementation` | `solguard-diff` | `LANG-C-05-INTEGRATION` | `LANG-C-05` | 1 | `feat(c): compare preprocessor layout integer and state effects [C6-C-07A]` |
| `C6-C-08` | `contribution_implementation` | `solguard-deploy` | `LANG-C-05-INTEGRATION` | `LANG-C-05` | 2 | `test(c): qualify c0 through c4 and freeze c5 candidate [C6-C-08]` |
| `C6-C-08A` | `contribution_implementation` | `solguard-deploy` | `LANG-C-05-INTEGRATION` | `LANG-C-05` | 1 | `test(c-memory): run sanitizer static symbolic and metamorphic qualification matrix [C6-C-08A]` |
| `C6-C-09` | `contribution_implementation` | `solguard-docs` | `LANG-C-05-INTEGRATION` | `LANG-C-05` | 1 | `docs(c): publish candidate toolchains and exclusions [C6-C-09]` |
| `C6-COM-01` | `contribution_implementation` | `solguard-docs` | `LANG-000` | `LANG-000` | 0 | `docs(languages): define scoped c0 through c5 claims [C6-COM-01]` |
| `C6-COM-02` | `contribution_implementation` | `solguard-map` | `LANG-010-HARNESS` | `LANG-010-HARNESS` | 0 | `feat(languages): publish semantic ir conformance harness [C6-COM-02]` |
| `C6-COM-04` | `contribution_implementation` | `solguard-deploy` | `LANG-030-HARNESS` | `LANG-030-HARNESS` | 0 | `feat(replay): provide clean-input replay harness [C6-COM-04]` |
| `C6-COM-05` | `contribution_implementation` | `solguard-trace` | `LANG-040-HARNESS` | `LANG-040-HARNESS` | 0 | `feat(languages): provide semantic trace conformance harness [C6-COM-05]` |
| `C6-COM-06A` | `contribution_implementation` | `solguard-map` | `LANG-050A` | `LANG-050A` | 0 | `feat(boundaries): emit typed boundary observations [C6-COM-06A]` |
| `C6-COM-06B` | `contribution_implementation` | `solguard-discover` | `LANG-050B` | `LANG-050B` | 0 | `feat(boundaries): derive protocol and boundary model [C6-COM-06B]` |
| `C6-COM-06C` | `contribution_implementation` | `solguard-core` | `LANG-050C` | `LANG-050C` | 0 | `feat(boundaries): verify observation model and producer binding [C6-COM-06C]` |
| `C6-COM-07` | `contribution_implementation` | `solguard-economic` | `LANG-060` | `LANG-060` | 0 | `feat(kernels): expose language-neutral economic kernels [C6-COM-07]` |
| `C6-COM-08` | `contribution_implementation` | `solguard-core` | `LANG-070` | `LANG-070` | 0 | `feat(evidence): run language-neutral request fixpoint [C6-COM-08]` |
| `C6-COM-09` | `contribution_implementation` | `solguard-validate` | `LANG-080-VALIDATE` | `LANG-080-VALIDATE` | 0 | `feat(verdicts): verify language-neutral proof contracts [C6-COM-09]` |
| `C6-COM-10` | `contribution_implementation` | `solguard-filter` | `LANG-080-FILTER` | `LANG-080-FILTER` | 0 | `feat(admission): apply language-neutral admission contracts [C6-COM-10]` |
| `C6-COM-11` | `contribution_implementation` | `solguard-diff` | `LANG-090-HARNESS` | `LANG-090-HARNESS` | 0 | `feat(languages): provide semantic diff conformance harness [C6-COM-11]` |
| `C6-COM-12` | `contribution_implementation` | `solguard-deploy` | `LANG-190-HARNESS` | `LANG-190-HARNESS` | 0 | `test(corpus): provide metamorphic and near-miss harness [C6-COM-12]` |
| `C6-COM-13` | `contribution_implementation` | `solguard-deploy` | `LANG-200-HARNESS` | `LANG-200-HARNESS` | 0 | `build(certification): provide blind certification harness [C6-COM-13]` |
| `C6-CPP-01` | `contribution_implementation` | `solguard-map` | `LANG-CPP-01-INTEGRATION` | `LANG-CPP-01` | 0 | `feat(cpp): build compile-database semantic frontend [C6-CPP-01]` |
| `C6-CPP-02` | `contribution_implementation` | `solguard-map` | `LANG-CPP-01-INTEGRATION` | `LANG-CPP-01` | 1 | `feat(cpp): model templates raii dispatch and integer domains [C6-CPP-02]` |
| `C6-CPP-03` | `contribution_implementation` | `solguard-trace` | `LANG-CPP-01-INTEGRATION` | `LANG-CPP-01` | 1 | `feat(cpp): bind native memory concurrency and io observations [C6-CPP-03]` |
| `C6-CPP-04` | `contribution_implementation` | `solguard-discover` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp): normalize lifecycle dispatch and accounting facts [C6-CPP-04]` |
| `C6-CPP-04A` | `contribution_implementation` | `solguard-economic` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp): model resource ledger integer and lifecycle transitions [C6-CPP-04A]` |
| `C6-CPP-05` | `contribution_implementation` | `solguard-invariant` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp): add independent state and conservation invariants [C6-CPP-05]` |
| `C6-CPP-05A` | `contribution_implementation` | `solguard-value` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp): prove signed deltas inside a concrete non-ub domain [C6-CPP-05A]` |
| `C6-CPP-05B` | `contribution_implementation` | `solguard-value` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp-memory): prove lifetime ownership dispatch and object-model obligations [C6-CPP-05B]` |
| `C6-CPP-06` | `contribution_implementation` | `solguard-validate` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 2 | `feat(cpp): validate lifetime dispatch race and overflow paths [C6-CPP-06]` |
| `C6-CPP-06A` | `contribution_implementation` | `solguard-validate` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 1 | `feat(cpp-memory): require a causal memory or race to economic-impact bridge [C6-CPP-06A]` |
| `C6-CPP-07` | `contribution_implementation` | `solguard-filter` | `LANG-CPP-02-INTEGRATION` | `LANG-CPP-02` | 2 | `test(cpp): reject ub-dependent or partial proof inputs and review only complete-proof admission debt [C6-CPP-07]` |
| `C6-CPP-08` | `contribution_implementation` | `solguard-diff` | `LANG-CPP-03-INTEGRATION` | `LANG-CPP-03` | 1 | `feat(cpp): compare templates dispatch layout and exceptions [C6-CPP-08]` |
| `C6-CPP-09` | `contribution_implementation` | `solguard-deploy` | `LANG-CPP-03-INTEGRATION` | `LANG-CPP-03` | 2 | `test(cpp): qualify c0 through c4 and freeze c5 candidate [C6-CPP-09]` |
| `C6-CPP-09A` | `contribution_implementation` | `solguard-deploy` | `LANG-CPP-03-INTEGRATION` | `LANG-CPP-03` | 1 | `test(cpp-memory): run sanitizer static symbolic race and metamorphic matrix [C6-CPP-09A]` |
| `C6-CPP-10` | `contribution_implementation` | `solguard-docs` | `LANG-CPP-03-INTEGRATION` | `LANG-CPP-03` | 1 | `docs(cpp): publish candidate standards and exclusions [C6-CPP-10]` |
| `C6-GO-01` | `contribution_implementation` | `solguard-map` | `LANG-GO-01-INTEGRATION` | `LANG-GO-01` | 0 | `feat(go): build module and build-tag-aware semantic frontend [C6-GO-01]` |
| `C6-GO-02` | `contribution_implementation` | `solguard-map` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): model stores keepers messages and coins [C6-GO-02]` |
| `C6-GO-03` | `contribution_implementation` | `solguard-trace` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): bind ante handlers state and decimal flows [C6-GO-03]` |
| `C6-GO-04` | `contribution_implementation` | `solguard-discover` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): normalize module authority and ledger facts [C6-GO-04]` |
| `C6-GO-04A` | `contribution_implementation` | `solguard-economic` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): model coin supply fee and keeper transitions [C6-GO-04A]` |
| `C6-GO-05` | `contribution_implementation` | `solguard-invariant` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): add supply balance and authority oracles [C6-GO-05]` |
| `C6-GO-05A` | `contribution_implementation` | `solguard-value` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): prove signed coin supply and fee deltas [C6-GO-05A]` |
| `C6-GO-05B` | `contribution_implementation` | `solguard-validate` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): validate keeper authority and ante proof paths [C6-GO-05B]` |
| `C6-GO-05C` | `contribution_implementation` | `solguard-filter` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): calibrate admission on patched keeper controls [C6-GO-05C]` |
| `C6-GO-05D` | `contribution_implementation` | `solguard-diff` | `LANG-GO-02-INTEGRATION` | `LANG-GO-02` | 1 | `feat(go-cosmos): compare stores messages coins and authority effects [C6-GO-05D]` |
| `C6-GO-06` | `contribution_implementation` | `solguard-map` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): model geth state consensus rpc and mempool [C6-GO-06]` |
| `C6-GO-07` | `contribution_implementation` | `solguard-trace` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): bind reorg persistence and concurrency [C6-GO-07]` |
| `C6-GO-08` | `contribution_implementation` | `solguard-discover` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): normalize consensus persistence and state facts [C6-GO-08]` |
| `C6-GO-08A` | `contribution_implementation` | `solguard-economic` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): model fee ledger reorg and mempool transitions [C6-GO-08A]` |
| `C6-GO-09` | `contribution_implementation` | `solguard-invariant` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): add fork and ledger consistency oracles [C6-GO-09]` |
| `C6-GO-09A` | `contribution_implementation` | `solguard-value` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): prove signed ledger deltas under reorg and replacement [C6-GO-09A]` |
| `C6-GO-09B` | `contribution_implementation` | `solguard-validate` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): validate reorg persistence and concurrency proofs [C6-GO-09B]` |
| `C6-GO-09C` | `contribution_implementation` | `solguard-filter` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): calibrate admission on fork and rpc near-misses [C6-GO-09C]` |
| `C6-GO-09D` | `contribution_implementation` | `solguard-diff` | `LANG-GO-03-INTEGRATION` | `LANG-GO-03` | 1 | `feat(go-client): compare fork state fee and mempool effects [C6-GO-09D]` |
| `C6-GO-10` | `contribution_implementation` | `solguard-map` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): model rpc oracle and cross-chain boundaries [C6-GO-10]` |
| `C6-GO-11` | `contribution_implementation` | `solguard-trace` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): bind retries latency ordering and stale data [C6-GO-11]` |
| `C6-GO-12` | `contribution_implementation` | `solguard-discover` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): normalize idempotency ordering and oracle facts [C6-GO-12]` |
| `C6-GO-12A` | `contribution_implementation` | `solguard-economic` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): model escrow fee retry and finality transitions [C6-GO-12A]` |
| `C6-GO-12B` | `contribution_implementation` | `solguard-invariant` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): add exactly-once escrow and ordering oracles [C6-GO-12B]` |
| `C6-GO-12C` | `contribution_implementation` | `solguard-value` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): prove signed deltas across retries and finality [C6-GO-12C]` |
| `C6-GO-12D` | `contribution_implementation` | `solguard-validate` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): validate ordering oracle and provenance proofs [C6-GO-12D]` |
| `C6-GO-12E` | `contribution_implementation` | `solguard-filter` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): calibrate admission on stale-data near-misses [C6-GO-12E]` |
| `C6-GO-12F` | `contribution_implementation` | `solguard-diff` | `LANG-GO-04-INTEGRATION` | `LANG-GO-04` | 1 | `feat(go-relayer): compare rpc finality retries and asset effects [C6-GO-12F]` |
| `C6-GO-13` | `contribution_implementation` | `solguard-trace` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `fix(go-blind): isolate corpus-shaped extractors [C6-GO-13]` |
| `C6-GO-14` | `contribution_implementation` | `solguard-discover` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `fix(go-blind): reject rule-assisted origin as blind evidence [C6-GO-14]` |
| `C6-GO-15` | `contribution_implementation` | `solguard-core` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `fix(go-blind): enforce origin on every scoreable channel [C6-GO-15]` |
| `C6-GO-16` | `contribution_implementation` | `solguard-validate` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `test(go): enforce proof conformance independently per ecosystem [C6-GO-16]` |
| `C6-GO-17` | `contribution_implementation` | `solguard-filter` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `test(go): enforce admission conformance independently per ecosystem [C6-GO-17]` |
| `C6-GO-18` | `contribution_implementation` | `solguard-deploy` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `test(go): qualify ecosystems and freeze c5 candidates [C6-GO-18]` |
| `C6-GO-19` | `contribution_implementation` | `solguard-docs` | `LANG-GO-05-INTEGRATION` | `LANG-GO-05` | 1 | `docs(go): publish candidate ecosystems and exclusions [C6-GO-19]` |
| `C6-JS-01` | `contribution_implementation` | `solguard-map` | `LANG-JS-01-INTEGRATION` | `LANG-JS-01` | 0 | `feat(javascript): build module and runtime-aware semantic frontend [C6-JS-01]` |
| `C6-JS-02` | `contribution_implementation` | `solguard-map` | `LANG-JS-01-INTEGRATION` | `LANG-JS-01` | 1 | `feat(javascript): model prototypes coercion promises and numbers [C6-JS-02]` |
| `C6-JS-03` | `contribution_implementation` | `solguard-trace` | `LANG-JS-01-INTEGRATION` | `LANG-JS-01` | 1 | `feat(javascript): bind async rpc storage and event observations [C6-JS-03]` |
| `C6-JS-04` | `contribution_implementation` | `solguard-discover` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): normalize async rpc numeric and state facts [C6-JS-04]` |
| `C6-JS-04A` | `contribution_implementation` | `solguard-economic` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): model retries precision and actor deltas [C6-JS-04A]` |
| `C6-JS-05` | `contribution_implementation` | `solguard-invariant` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): add independent state and precision invariants [C6-JS-05]` |
| `C6-JS-05A` | `contribution_implementation` | `solguard-value` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): prove signed deltas across bigint and number domains [C6-JS-05A]` |
| `C6-JS-06` | `contribution_implementation` | `solguard-validate` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): validate coercion retry and race paths [C6-JS-06]` |
| `C6-JS-07` | `contribution_implementation` | `solguard-filter` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): calibrate admission across runtimes [C6-JS-07]` |
| `C6-JS-07A` | `contribution_implementation` | `solguard-diff` | `LANG-JS-02-INTEGRATION` | `LANG-JS-02` | 1 | `feat(javascript): compare modules guards async paths and numeric effects [C6-JS-07A]` |
| `C6-JS-08` | `contribution_implementation` | `solguard-deploy` | `LANG-JS-03-INTEGRATION` | `LANG-JS-03` | 1 | `test(javascript): prove rule-assisted node isolation [C6-JS-08]` |
| `C6-JS-08A` | `contribution_implementation` | `solguard-trace` | `LANG-JS-03-INTEGRATION` | `LANG-JS-03` | 1 | `test(javascript): reject missing provenance on guards state calls and paths [C6-JS-08A]` |
| `C6-JS-09` | `contribution_implementation` | `solguard-deploy` | `LANG-JS-03-INTEGRATION` | `LANG-JS-03` | 1 | `test(javascript): qualify c0 through c4 and freeze c5 candidate [C6-JS-09]` |
| `C6-JS-10` | `contribution_implementation` | `solguard-docs` | `LANG-JS-03-INTEGRATION` | `LANG-JS-03` | 1 | `docs(javascript): publish candidate runtimes and exclusions [C6-JS-10]` |
| `C6-RST-01` | `contribution_implementation` | `solguard-map` | `LANG-RUST-01-INTEGRATION` | `LANG-RUST-01` | 0 | `feat(rust): build cargo and macro-aware semantic frontend [C6-RST-01]` |
| `C6-RST-02` | `contribution_implementation` | `solguard-map` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): model anchor accounts pda and cpi [C6-RST-02]` |
| `C6-RST-03` | `contribution_implementation` | `solguard-trace` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): bind signer owner constraints and cpi [C6-RST-03]` |
| `C6-RST-04` | `contribution_implementation` | `solguard-discover` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): normalize account authority and lifecycle facts [C6-RST-04]` |
| `C6-RST-04A` | `contribution_implementation` | `solguard-economic` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): model lamport token authority and cpi transitions [C6-RST-04A]` |
| `C6-RST-05` | `contribution_implementation` | `solguard-invariant` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): add account ownership and ledger oracles [C6-RST-05]` |
| `C6-RST-05A` | `contribution_implementation` | `solguard-value` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): prove signed asset deltas across cpi paths [C6-RST-05A]` |
| `C6-RST-05B` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): validate ownership signer and cpi proof paths [C6-RST-05B]` |
| `C6-RST-05C` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): calibrate admission on patched account controls [C6-RST-05C]` |
| `C6-RST-05D` | `contribution_implementation` | `solguard-diff` | `LANG-RUST-02-INTEGRATION` | `LANG-RUST-02` | 1 | `feat(rust-solana): compare account constraints authorities and cpi effects [C6-RST-05D]` |
| `C6-RST-06` | `contribution_implementation` | `solguard-map` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): model messages submessages replies and storage [C6-RST-06]` |
| `C6-RST-07` | `contribution_implementation` | `solguard-trace` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): bind funds callbacks replies and persistent state [C6-RST-07]` |
| `C6-RST-08` | `contribution_implementation` | `solguard-discover` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): normalize callback funds and accounting facts [C6-RST-08]` |
| `C6-RST-08A` | `contribution_implementation` | `solguard-economic` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): model coins submessage rollback and actor deltas [C6-RST-08A]` |
| `C6-RST-09` | `contribution_implementation` | `solguard-invariant` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): add funds storage and reply oracles [C6-RST-09]` |
| `C6-RST-09A` | `contribution_implementation` | `solguard-value` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): prove signed deltas across execute reply chains [C6-RST-09A]` |
| `C6-RST-09B` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): validate funds callback and rollback proofs [C6-RST-09B]` |
| `C6-RST-09C` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): calibrate admission on reply near-misses [C6-RST-09C]` |
| `C6-RST-09D` | `contribution_implementation` | `solguard-diff` | `LANG-RUST-03A-INTEGRATION` | `LANG-RUST-03A` | 1 | `feat(rust-cosmwasm): compare messages storage funds and reply effects [C6-RST-09D]` |
| `C6-RST-09E` | `contribution_implementation` | `solguard-map` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): model promises callbacks receipts and storage [C6-RST-09E]` |
| `C6-RST-09F` | `contribution_implementation` | `solguard-trace` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): bind promise graph deposits gas and persistent state [C6-RST-09F]` |
| `C6-RST-09G` | `contribution_implementation` | `solguard-discover` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): normalize receipt callback and accounting facts [C6-RST-09G]` |
| `C6-RST-09H` | `contribution_implementation` | `solguard-economic` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): model deposits receipts rollback and actor deltas [C6-RST-09H]` |
| `C6-RST-09I` | `contribution_implementation` | `solguard-invariant` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): add deposit storage and callback oracles [C6-RST-09I]` |
| `C6-RST-09J` | `contribution_implementation` | `solguard-value` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): prove signed deltas across promise chains [C6-RST-09J]` |
| `C6-RST-09K` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): validate promise callback and storage proofs [C6-RST-09K]` |
| `C6-RST-09L` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): calibrate admission on promise near-misses [C6-RST-09L]` |
| `C6-RST-09M` | `contribution_implementation` | `solguard-diff` | `LANG-RUST-03B-INTEGRATION` | `LANG-RUST-03B` | 1 | `feat(rust-near): compare receipts deposits callbacks and state [C6-RST-09M]` |
| `C6-RST-10` | `contribution_implementation` | `solguard-map` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): model frame macros origins and storage [C6-RST-10]` |
| `C6-RST-11` | `contribution_implementation` | `solguard-trace` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): bind extrinsics dispatch and weights [C6-RST-11]` |
| `C6-RST-11A` | `contribution_implementation` | `solguard-discover` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): normalize origin dispatch and lifecycle facts [C6-RST-11A]` |
| `C6-RST-11B` | `contribution_implementation` | `solguard-economic` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): model balances holds fees and issuance transitions [C6-RST-11B]` |
| `C6-RST-12` | `contribution_implementation` | `solguard-invariant` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): add origin balance and lifecycle oracles [C6-RST-12]` |
| `C6-RST-12A` | `contribution_implementation` | `solguard-value` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): prove signed balance issuance and fee deltas [C6-RST-12A]` |
| `C6-RST-12B` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): validate origin dispatch and storage proofs [C6-RST-12B]` |
| `C6-RST-12C` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): calibrate admission on origin near-misses [C6-RST-12C]` |
| `C6-RST-12D` | `contribution_implementation` | `solguard-diff` | `LANG-RUST-04-INTEGRATION` | `LANG-RUST-04` | 1 | `feat(rust-substrate): compare origins storage weights and balance effects [C6-RST-12D]` |
| `C6-RST-13` | `contribution_implementation` | `solguard-map` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): model async unsafe persistence and network state [C6-RST-13]` |
| `C6-RST-14` | `contribution_implementation` | `solguard-trace` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): bind fork choice retries and partial failure [C6-RST-14]` |
| `C6-RST-15` | `contribution_implementation` | `solguard-discover` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): normalize consensus persistence and state facts [C6-RST-15]` |
| `C6-RST-15A` | `contribution_implementation` | `solguard-economic` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): model reorg fee ledger and partial-failure transitions [C6-RST-15A]` |
| `C6-RST-15B` | `contribution_implementation` | `solguard-invariant` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): add fork ledger persistence and supply oracles [C6-RST-15B]` |
| `C6-RST-15C` | `contribution_implementation` | `solguard-value` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): prove signed ledger deltas under reorg and retry [C6-RST-15C]` |
| `C6-RST-15D` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): validate consensus persistence and non-ub proofs [C6-RST-15D]` |
| `C6-RST-15E` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `test(rust-client): reject partial unsafe or ffi proof inputs and review only complete-proof admission debt [C6-RST-15E]` |
| `C6-RST-15F` | `contribution_implementation` | `solguard-diff` | `LANG-RUST-05-INTEGRATION` | `LANG-RUST-05` | 1 | `feat(rust-client): compare fork persistence retry and ledger effects [C6-RST-15F]` |
| `C6-RST-16` | `contribution_implementation` | `solguard-validate` | `LANG-RUST-06-INTEGRATION` | `LANG-RUST-06` | 1 | `test(rust): enforce proof conformance independently per ecosystem [C6-RST-16]` |
| `C6-RST-17` | `contribution_implementation` | `solguard-filter` | `LANG-RUST-06-INTEGRATION` | `LANG-RUST-06` | 1 | `test(rust): enforce admission conformance independently per ecosystem [C6-RST-17]` |
| `C6-RST-18` | `contribution_implementation` | `solguard-deploy` | `LANG-RUST-06-INTEGRATION` | `LANG-RUST-06` | 1 | `test(rust): qualify every ecosystem and freeze c5 candidates [C6-RST-18]` |
| `C6-RST-19` | `contribution_implementation` | `solguard-docs` | `LANG-RUST-06-INTEGRATION` | `LANG-RUST-06` | 1 | `docs(rust): publish candidate ecosystems and exclusions [C6-RST-19]` |
| `C6-SCP-01-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 1 | `test(SOL-EVM-DEFI): freeze c0-c4 evidence and c5 candidate [C6-SCP-01-CANDIDATE]` |
| `C6-SCP-01-CORE` | `contribution_implementation` | `solguard-core` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 3 | `feat(SOL-EVM-DEFI): bind canonical candidates and evidence waves [C6-SCP-01-CORE]` |
| `C6-SCP-01-DIFF` | `contribution_implementation` | `solguard-diff` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 2 | `feat(SOL-EVM-DEFI): compare semantic guards units state and effects [C6-SCP-01-DIFF]` |
| `C6-SCP-01-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 1 | `feat(SOL-EVM-DEFI): instantiate units actors transitions and kernels [C6-SCP-01-ECONOMIC]` |
| `C6-SCP-01-FILTER` | `contribution_implementation` | `solguard-filter` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 1 | `feat(SOL-EVM-DEFI): enforce publication eligibility and review routing [C6-SCP-01-FILTER]` |
| `C6-SCP-01-FRONTEND` | `contribution_implementation` | `solguard-map` | `SOL-EVM-DEFI-C1` | `SOL-EVM-DEFI-C1` | 1 | `feat(SOL-EVM-DEFI): bind compiler parser symbols and spans [C6-SCP-01-FRONTEND]` |
| `C6-SCP-01-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 2 | `feat(SOL-EVM-DEFI): provide independent economic oracles [C6-SCP-01-INVARIANT]` |
| `C6-SCP-01-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `SOL-EVM-DEFI-C2` | `SOL-EVM-DEFI-C2` | 1 | `feat(SOL-EVM-DEFI): emit source-authoritative cfg state calls and effects [C6-SCP-01-LOCAL-IR]` |
| `C6-SCP-01-MODEL` | `contribution_implementation` | `solguard-discover` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 1 | `feat(SOL-EVM-DEFI): normalize facts into the shared protocol model [C6-SCP-01-MODEL]` |
| `C6-SCP-01-PROFILE` | `contribution_implementation` | `solguard-deploy` | `SOL-EVM-DEFI-C0` | `SOL-EVM-DEFI-C0` | 0 | `build(SOL-EVM-DEFI): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-01-PROFILE]` |
| `C6-SCP-01-REPLAY` | `contribution_implementation` | `solguard-deploy` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 8 | `test(SOL-EVM-DEFI): replay clean-input conformance and negative corpus [C6-SCP-01-REPLAY]` |
| `C6-SCP-01-SCOPE` | `contribution_implementation` | `solguard-docs` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 1 | `docs(SOL-EVM-DEFI): publish exact scope exclusions and residual debt [C6-SCP-01-SCOPE]` |
| `C6-SCP-01-TRACE` | `contribution_implementation` | `solguard-trace` | `SOL-EVM-DEFI-C3` | `SOL-EVM-DEFI-C3` | 1 | `feat(SOL-EVM-DEFI): bind interprocedural async and atomic provenance [C6-SCP-01-TRACE]` |
| `C6-SCP-01-VALIDATE` | `contribution_implementation` | `solguard-validate` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 2 | `feat(SOL-EVM-DEFI): reopen evidence and verify proof independently [C6-SCP-01-VALIDATE]` |
| `C6-SCP-01-VALUE` | `contribution_implementation` | `solguard-value` | `SOL-EVM-DEFI-C4` | `SOL-EVM-DEFI-C4` | 2 | `feat(SOL-EVM-DEFI): compile obligations and prove signed nonzero deltas [C6-SCP-01-VALUE]` |
| `C6-SCP-02-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 1 | `test(VYP-EVM-DEFI): freeze c0-c4 evidence and c5 candidate [C6-SCP-02-CANDIDATE]` |
| `C6-SCP-02-CORE` | `contribution_implementation` | `solguard-core` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 3 | `feat(VYP-EVM-DEFI): bind canonical candidates and evidence waves [C6-SCP-02-CORE]` |
| `C6-SCP-02-DIFF` | `contribution_implementation` | `solguard-diff` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 2 | `feat(VYP-EVM-DEFI): compare semantic guards units state and effects [C6-SCP-02-DIFF]` |
| `C6-SCP-02-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 1 | `feat(VYP-EVM-DEFI): instantiate units actors transitions and kernels [C6-SCP-02-ECONOMIC]` |
| `C6-SCP-02-FILTER` | `contribution_implementation` | `solguard-filter` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 1 | `feat(VYP-EVM-DEFI): enforce publication eligibility and review routing [C6-SCP-02-FILTER]` |
| `C6-SCP-02-FRONTEND` | `contribution_implementation` | `solguard-map` | `VYP-EVM-DEFI-C1` | `VYP-EVM-DEFI-C1` | 1 | `feat(VYP-EVM-DEFI): bind compiler parser symbols and spans [C6-SCP-02-FRONTEND]` |
| `C6-SCP-02-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 2 | `feat(VYP-EVM-DEFI): provide independent economic oracles [C6-SCP-02-INVARIANT]` |
| `C6-SCP-02-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `VYP-EVM-DEFI-C2` | `VYP-EVM-DEFI-C2` | 1 | `feat(VYP-EVM-DEFI): emit source-authoritative cfg state calls and effects [C6-SCP-02-LOCAL-IR]` |
| `C6-SCP-02-MODEL` | `contribution_implementation` | `solguard-discover` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 1 | `feat(VYP-EVM-DEFI): normalize facts into the shared protocol model [C6-SCP-02-MODEL]` |
| `C6-SCP-02-PROFILE` | `contribution_implementation` | `solguard-deploy` | `VYP-EVM-DEFI-C0` | `VYP-EVM-DEFI-C0` | 0 | `build(VYP-EVM-DEFI): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-02-PROFILE]` |
| `C6-SCP-02-REPLAY` | `contribution_implementation` | `solguard-deploy` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 8 | `test(VYP-EVM-DEFI): replay clean-input conformance and negative corpus [C6-SCP-02-REPLAY]` |
| `C6-SCP-02-SCOPE` | `contribution_implementation` | `solguard-docs` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 1 | `docs(VYP-EVM-DEFI): publish exact scope exclusions and residual debt [C6-SCP-02-SCOPE]` |
| `C6-SCP-02-TRACE` | `contribution_implementation` | `solguard-trace` | `VYP-EVM-DEFI-C3` | `VYP-EVM-DEFI-C3` | 1 | `feat(VYP-EVM-DEFI): bind interprocedural async and atomic provenance [C6-SCP-02-TRACE]` |
| `C6-SCP-02-VALIDATE` | `contribution_implementation` | `solguard-validate` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 2 | `feat(VYP-EVM-DEFI): reopen evidence and verify proof independently [C6-SCP-02-VALIDATE]` |
| `C6-SCP-02-VALUE` | `contribution_implementation` | `solguard-value` | `VYP-EVM-DEFI-C4` | `VYP-EVM-DEFI-C4` | 2 | `feat(VYP-EVM-DEFI): compile obligations and prove signed nonzero deltas [C6-SCP-02-VALUE]` |
| `C6-SCP-03-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 1 | `test(RST-SOLANA-ANCHOR): freeze c0-c4 evidence and c5 candidate [C6-SCP-03-CANDIDATE]` |
| `C6-SCP-03-CORE` | `contribution_implementation` | `solguard-core` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 3 | `feat(RST-SOLANA-ANCHOR): bind canonical candidates and evidence waves [C6-SCP-03-CORE]` |
| `C6-SCP-03-DIFF` | `contribution_implementation` | `solguard-diff` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 2 | `feat(RST-SOLANA-ANCHOR): compare semantic guards units state and effects [C6-SCP-03-DIFF]` |
| `C6-SCP-03-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 1 | `feat(RST-SOLANA-ANCHOR): instantiate units actors transitions and kernels [C6-SCP-03-ECONOMIC]` |
| `C6-SCP-03-FILTER` | `contribution_implementation` | `solguard-filter` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 1 | `feat(RST-SOLANA-ANCHOR): enforce publication eligibility and review routing [C6-SCP-03-FILTER]` |
| `C6-SCP-03-FRONTEND` | `contribution_implementation` | `solguard-map` | `RST-SOLANA-ANCHOR-C1` | `RST-SOLANA-ANCHOR-C1` | 1 | `feat(RST-SOLANA-ANCHOR): bind compiler parser symbols and spans [C6-SCP-03-FRONTEND]` |
| `C6-SCP-03-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 2 | `feat(RST-SOLANA-ANCHOR): provide independent economic oracles [C6-SCP-03-INVARIANT]` |
| `C6-SCP-03-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `RST-SOLANA-ANCHOR-C2` | `RST-SOLANA-ANCHOR-C2` | 1 | `feat(RST-SOLANA-ANCHOR): emit source-authoritative cfg state calls and effects [C6-SCP-03-LOCAL-IR]` |
| `C6-SCP-03-MODEL` | `contribution_implementation` | `solguard-discover` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 1 | `feat(RST-SOLANA-ANCHOR): normalize facts into the shared protocol model [C6-SCP-03-MODEL]` |
| `C6-SCP-03-PROFILE` | `contribution_implementation` | `solguard-deploy` | `RST-SOLANA-ANCHOR-C0` | `RST-SOLANA-ANCHOR-C0` | 0 | `build(RST-SOLANA-ANCHOR): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-03-PROFILE]` |
| `C6-SCP-03-REPLAY` | `contribution_implementation` | `solguard-deploy` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 8 | `test(RST-SOLANA-ANCHOR): replay clean-input conformance and negative corpus [C6-SCP-03-REPLAY]` |
| `C6-SCP-03-SCOPE` | `contribution_implementation` | `solguard-docs` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 1 | `docs(RST-SOLANA-ANCHOR): publish exact scope exclusions and residual debt [C6-SCP-03-SCOPE]` |
| `C6-SCP-03-TRACE` | `contribution_implementation` | `solguard-trace` | `RST-SOLANA-ANCHOR-C3` | `RST-SOLANA-ANCHOR-C3` | 1 | `feat(RST-SOLANA-ANCHOR): bind interprocedural async and atomic provenance [C6-SCP-03-TRACE]` |
| `C6-SCP-03-VALIDATE` | `contribution_implementation` | `solguard-validate` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 2 | `feat(RST-SOLANA-ANCHOR): reopen evidence and verify proof independently [C6-SCP-03-VALIDATE]` |
| `C6-SCP-03-VALUE` | `contribution_implementation` | `solguard-value` | `RST-SOLANA-ANCHOR-C4` | `RST-SOLANA-ANCHOR-C4` | 2 | `feat(RST-SOLANA-ANCHOR): compile obligations and prove signed nonzero deltas [C6-SCP-03-VALUE]` |
| `C6-SCP-04-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 1 | `test(RST-COSMWASM): freeze c0-c4 evidence and c5 candidate [C6-SCP-04-CANDIDATE]` |
| `C6-SCP-04-CORE` | `contribution_implementation` | `solguard-core` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 3 | `feat(RST-COSMWASM): bind canonical candidates and evidence waves [C6-SCP-04-CORE]` |
| `C6-SCP-04-DIFF` | `contribution_implementation` | `solguard-diff` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 2 | `feat(RST-COSMWASM): compare semantic guards units state and effects [C6-SCP-04-DIFF]` |
| `C6-SCP-04-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 1 | `feat(RST-COSMWASM): instantiate units actors transitions and kernels [C6-SCP-04-ECONOMIC]` |
| `C6-SCP-04-FILTER` | `contribution_implementation` | `solguard-filter` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 1 | `feat(RST-COSMWASM): enforce publication eligibility and review routing [C6-SCP-04-FILTER]` |
| `C6-SCP-04-FRONTEND` | `contribution_implementation` | `solguard-map` | `RST-COSMWASM-C1` | `RST-COSMWASM-C1` | 1 | `feat(RST-COSMWASM): bind compiler parser symbols and spans [C6-SCP-04-FRONTEND]` |
| `C6-SCP-04-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 2 | `feat(RST-COSMWASM): provide independent economic oracles [C6-SCP-04-INVARIANT]` |
| `C6-SCP-04-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `RST-COSMWASM-C2` | `RST-COSMWASM-C2` | 1 | `feat(RST-COSMWASM): emit source-authoritative cfg state calls and effects [C6-SCP-04-LOCAL-IR]` |
| `C6-SCP-04-MODEL` | `contribution_implementation` | `solguard-discover` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 1 | `feat(RST-COSMWASM): normalize facts into the shared protocol model [C6-SCP-04-MODEL]` |
| `C6-SCP-04-PROFILE` | `contribution_implementation` | `solguard-deploy` | `RST-COSMWASM-C0` | `RST-COSMWASM-C0` | 0 | `build(RST-COSMWASM): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-04-PROFILE]` |
| `C6-SCP-04-REPLAY` | `contribution_implementation` | `solguard-deploy` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 8 | `test(RST-COSMWASM): replay clean-input conformance and negative corpus [C6-SCP-04-REPLAY]` |
| `C6-SCP-04-SCOPE` | `contribution_implementation` | `solguard-docs` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 1 | `docs(RST-COSMWASM): publish exact scope exclusions and residual debt [C6-SCP-04-SCOPE]` |
| `C6-SCP-04-TRACE` | `contribution_implementation` | `solguard-trace` | `RST-COSMWASM-C3` | `RST-COSMWASM-C3` | 1 | `feat(RST-COSMWASM): bind interprocedural async and atomic provenance [C6-SCP-04-TRACE]` |
| `C6-SCP-04-VALIDATE` | `contribution_implementation` | `solguard-validate` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 2 | `feat(RST-COSMWASM): reopen evidence and verify proof independently [C6-SCP-04-VALIDATE]` |
| `C6-SCP-04-VALUE` | `contribution_implementation` | `solguard-value` | `RST-COSMWASM-C4` | `RST-COSMWASM-C4` | 2 | `feat(RST-COSMWASM): compile obligations and prove signed nonzero deltas [C6-SCP-04-VALUE]` |
| `C6-SCP-05-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `RST-NEAR-C4` | `RST-NEAR-C4` | 1 | `test(RST-NEAR): freeze c0-c4 evidence and c5 candidate [C6-SCP-05-CANDIDATE]` |
| `C6-SCP-05-CORE` | `contribution_implementation` | `solguard-core` | `RST-NEAR-C4` | `RST-NEAR-C4` | 3 | `feat(RST-NEAR): bind canonical candidates and evidence waves [C6-SCP-05-CORE]` |
| `C6-SCP-05-DIFF` | `contribution_implementation` | `solguard-diff` | `RST-NEAR-C4` | `RST-NEAR-C4` | 2 | `feat(RST-NEAR): compare semantic guards units state and effects [C6-SCP-05-DIFF]` |
| `C6-SCP-05-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `RST-NEAR-C4` | `RST-NEAR-C4` | 1 | `feat(RST-NEAR): instantiate units actors transitions and kernels [C6-SCP-05-ECONOMIC]` |
| `C6-SCP-05-FILTER` | `contribution_implementation` | `solguard-filter` | `RST-NEAR-C4` | `RST-NEAR-C4` | 1 | `feat(RST-NEAR): enforce publication eligibility and review routing [C6-SCP-05-FILTER]` |
| `C6-SCP-05-FRONTEND` | `contribution_implementation` | `solguard-map` | `RST-NEAR-C1` | `RST-NEAR-C1` | 1 | `feat(RST-NEAR): bind compiler parser symbols and spans [C6-SCP-05-FRONTEND]` |
| `C6-SCP-05-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `RST-NEAR-C4` | `RST-NEAR-C4` | 2 | `feat(RST-NEAR): provide independent economic oracles [C6-SCP-05-INVARIANT]` |
| `C6-SCP-05-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `RST-NEAR-C2` | `RST-NEAR-C2` | 1 | `feat(RST-NEAR): emit source-authoritative cfg state calls and effects [C6-SCP-05-LOCAL-IR]` |
| `C6-SCP-05-MODEL` | `contribution_implementation` | `solguard-discover` | `RST-NEAR-C4` | `RST-NEAR-C4` | 1 | `feat(RST-NEAR): normalize facts into the shared protocol model [C6-SCP-05-MODEL]` |
| `C6-SCP-05-PROFILE` | `contribution_implementation` | `solguard-deploy` | `RST-NEAR-C0` | `RST-NEAR-C0` | 0 | `build(RST-NEAR): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-05-PROFILE]` |
| `C6-SCP-05-REPLAY` | `contribution_implementation` | `solguard-deploy` | `RST-NEAR-C4` | `RST-NEAR-C4` | 8 | `test(RST-NEAR): replay clean-input conformance and negative corpus [C6-SCP-05-REPLAY]` |
| `C6-SCP-05-SCOPE` | `contribution_implementation` | `solguard-docs` | `RST-NEAR-C4` | `RST-NEAR-C4` | 1 | `docs(RST-NEAR): publish exact scope exclusions and residual debt [C6-SCP-05-SCOPE]` |
| `C6-SCP-05-TRACE` | `contribution_implementation` | `solguard-trace` | `RST-NEAR-C3` | `RST-NEAR-C3` | 1 | `feat(RST-NEAR): bind interprocedural async and atomic provenance [C6-SCP-05-TRACE]` |
| `C6-SCP-05-VALIDATE` | `contribution_implementation` | `solguard-validate` | `RST-NEAR-C4` | `RST-NEAR-C4` | 2 | `feat(RST-NEAR): reopen evidence and verify proof independently [C6-SCP-05-VALIDATE]` |
| `C6-SCP-05-VALUE` | `contribution_implementation` | `solguard-value` | `RST-NEAR-C4` | `RST-NEAR-C4` | 2 | `feat(RST-NEAR): compile obligations and prove signed nonzero deltas [C6-SCP-05-VALUE]` |
| `C6-SCP-06-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 1 | `test(RST-SUBSTRATE-FRAME): freeze c0-c4 evidence and c5 candidate [C6-SCP-06-CANDIDATE]` |
| `C6-SCP-06-CORE` | `contribution_implementation` | `solguard-core` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 3 | `feat(RST-SUBSTRATE-FRAME): bind canonical candidates and evidence waves [C6-SCP-06-CORE]` |
| `C6-SCP-06-DIFF` | `contribution_implementation` | `solguard-diff` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 2 | `feat(RST-SUBSTRATE-FRAME): compare semantic guards units state and effects [C6-SCP-06-DIFF]` |
| `C6-SCP-06-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 1 | `feat(RST-SUBSTRATE-FRAME): instantiate units actors transitions and kernels [C6-SCP-06-ECONOMIC]` |
| `C6-SCP-06-FILTER` | `contribution_implementation` | `solguard-filter` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 1 | `feat(RST-SUBSTRATE-FRAME): enforce publication eligibility and review routing [C6-SCP-06-FILTER]` |
| `C6-SCP-06-FRONTEND` | `contribution_implementation` | `solguard-map` | `RST-SUBSTRATE-FRAME-C1` | `RST-SUBSTRATE-FRAME-C1` | 1 | `feat(RST-SUBSTRATE-FRAME): bind compiler parser symbols and spans [C6-SCP-06-FRONTEND]` |
| `C6-SCP-06-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 2 | `feat(RST-SUBSTRATE-FRAME): provide independent economic oracles [C6-SCP-06-INVARIANT]` |
| `C6-SCP-06-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `RST-SUBSTRATE-FRAME-C2` | `RST-SUBSTRATE-FRAME-C2` | 1 | `feat(RST-SUBSTRATE-FRAME): emit source-authoritative cfg state calls and effects [C6-SCP-06-LOCAL-IR]` |
| `C6-SCP-06-MODEL` | `contribution_implementation` | `solguard-discover` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 1 | `feat(RST-SUBSTRATE-FRAME): normalize facts into the shared protocol model [C6-SCP-06-MODEL]` |
| `C6-SCP-06-PROFILE` | `contribution_implementation` | `solguard-deploy` | `RST-SUBSTRATE-FRAME-C0` | `RST-SUBSTRATE-FRAME-C0` | 0 | `build(RST-SUBSTRATE-FRAME): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-06-PROFILE]` |
| `C6-SCP-06-REPLAY` | `contribution_implementation` | `solguard-deploy` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 8 | `test(RST-SUBSTRATE-FRAME): replay clean-input conformance and negative corpus [C6-SCP-06-REPLAY]` |
| `C6-SCP-06-SCOPE` | `contribution_implementation` | `solguard-docs` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 1 | `docs(RST-SUBSTRATE-FRAME): publish exact scope exclusions and residual debt [C6-SCP-06-SCOPE]` |
| `C6-SCP-06-TRACE` | `contribution_implementation` | `solguard-trace` | `RST-SUBSTRATE-FRAME-C3` | `RST-SUBSTRATE-FRAME-C3` | 1 | `feat(RST-SUBSTRATE-FRAME): bind interprocedural async and atomic provenance [C6-SCP-06-TRACE]` |
| `C6-SCP-06-VALIDATE` | `contribution_implementation` | `solguard-validate` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 2 | `feat(RST-SUBSTRATE-FRAME): reopen evidence and verify proof independently [C6-SCP-06-VALIDATE]` |
| `C6-SCP-06-VALUE` | `contribution_implementation` | `solguard-value` | `RST-SUBSTRATE-FRAME-C4` | `RST-SUBSTRATE-FRAME-C4` | 2 | `feat(RST-SUBSTRATE-FRAME): compile obligations and prove signed nonzero deltas [C6-SCP-06-VALUE]` |
| `C6-SCP-07-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 1 | `test(RST-NATIVE-CLIENT): freeze c0-c4 evidence and c5 candidate [C6-SCP-07-CANDIDATE]` |
| `C6-SCP-07-CORE` | `contribution_implementation` | `solguard-core` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 3 | `feat(RST-NATIVE-CLIENT): bind canonical candidates and evidence waves [C6-SCP-07-CORE]` |
| `C6-SCP-07-DIFF` | `contribution_implementation` | `solguard-diff` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 2 | `feat(RST-NATIVE-CLIENT): compare semantic guards units state and effects [C6-SCP-07-DIFF]` |
| `C6-SCP-07-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 1 | `feat(RST-NATIVE-CLIENT): instantiate units actors transitions and kernels [C6-SCP-07-ECONOMIC]` |
| `C6-SCP-07-FILTER` | `contribution_implementation` | `solguard-filter` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 1 | `feat(RST-NATIVE-CLIENT): enforce publication eligibility and review routing [C6-SCP-07-FILTER]` |
| `C6-SCP-07-FRONTEND` | `contribution_implementation` | `solguard-map` | `RST-NATIVE-CLIENT-C1` | `RST-NATIVE-CLIENT-C1` | 1 | `feat(RST-NATIVE-CLIENT): bind compiler parser symbols and spans [C6-SCP-07-FRONTEND]` |
| `C6-SCP-07-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 2 | `feat(RST-NATIVE-CLIENT): provide independent economic oracles [C6-SCP-07-INVARIANT]` |
| `C6-SCP-07-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `RST-NATIVE-CLIENT-C2` | `RST-NATIVE-CLIENT-C2` | 1 | `feat(RST-NATIVE-CLIENT): emit source-authoritative cfg state calls and effects [C6-SCP-07-LOCAL-IR]` |
| `C6-SCP-07-MODEL` | `contribution_implementation` | `solguard-discover` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 1 | `feat(RST-NATIVE-CLIENT): normalize facts into the shared protocol model [C6-SCP-07-MODEL]` |
| `C6-SCP-07-PROFILE` | `contribution_implementation` | `solguard-deploy` | `RST-NATIVE-CLIENT-C0` | `RST-NATIVE-CLIENT-C0` | 0 | `build(RST-NATIVE-CLIENT): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-07-PROFILE]` |
| `C6-SCP-07-REPLAY` | `contribution_implementation` | `solguard-deploy` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 8 | `test(RST-NATIVE-CLIENT): replay clean-input conformance and negative corpus [C6-SCP-07-REPLAY]` |
| `C6-SCP-07-SCOPE` | `contribution_implementation` | `solguard-docs` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 1 | `docs(RST-NATIVE-CLIENT): publish exact scope exclusions and residual debt [C6-SCP-07-SCOPE]` |
| `C6-SCP-07-TRACE` | `contribution_implementation` | `solguard-trace` | `RST-NATIVE-CLIENT-C3` | `RST-NATIVE-CLIENT-C3` | 1 | `feat(RST-NATIVE-CLIENT): bind interprocedural async and atomic provenance [C6-SCP-07-TRACE]` |
| `C6-SCP-07-VALIDATE` | `contribution_implementation` | `solguard-validate` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 2 | `feat(RST-NATIVE-CLIENT): reopen evidence and verify proof independently [C6-SCP-07-VALIDATE]` |
| `C6-SCP-07-VALUE` | `contribution_implementation` | `solguard-value` | `RST-NATIVE-CLIENT-C4` | `RST-NATIVE-CLIENT-C4` | 2 | `feat(RST-NATIVE-CLIENT): compile obligations and prove signed nonzero deltas [C6-SCP-07-VALUE]` |
| `C6-SCP-08-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 1 | `test(GO-COSMOS-SDK): freeze c0-c4 evidence and c5 candidate [C6-SCP-08-CANDIDATE]` |
| `C6-SCP-08-CORE` | `contribution_implementation` | `solguard-core` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 3 | `feat(GO-COSMOS-SDK): bind canonical candidates and evidence waves [C6-SCP-08-CORE]` |
| `C6-SCP-08-DIFF` | `contribution_implementation` | `solguard-diff` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 2 | `feat(GO-COSMOS-SDK): compare semantic guards units state and effects [C6-SCP-08-DIFF]` |
| `C6-SCP-08-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 1 | `feat(GO-COSMOS-SDK): instantiate units actors transitions and kernels [C6-SCP-08-ECONOMIC]` |
| `C6-SCP-08-FILTER` | `contribution_implementation` | `solguard-filter` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 1 | `feat(GO-COSMOS-SDK): enforce publication eligibility and review routing [C6-SCP-08-FILTER]` |
| `C6-SCP-08-FRONTEND` | `contribution_implementation` | `solguard-map` | `GO-COSMOS-SDK-C1` | `GO-COSMOS-SDK-C1` | 1 | `feat(GO-COSMOS-SDK): bind compiler parser symbols and spans [C6-SCP-08-FRONTEND]` |
| `C6-SCP-08-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 2 | `feat(GO-COSMOS-SDK): provide independent economic oracles [C6-SCP-08-INVARIANT]` |
| `C6-SCP-08-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `GO-COSMOS-SDK-C2` | `GO-COSMOS-SDK-C2` | 1 | `feat(GO-COSMOS-SDK): emit source-authoritative cfg state calls and effects [C6-SCP-08-LOCAL-IR]` |
| `C6-SCP-08-MODEL` | `contribution_implementation` | `solguard-discover` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 1 | `feat(GO-COSMOS-SDK): normalize facts into the shared protocol model [C6-SCP-08-MODEL]` |
| `C6-SCP-08-PROFILE` | `contribution_implementation` | `solguard-deploy` | `GO-COSMOS-SDK-C0` | `GO-COSMOS-SDK-C0` | 0 | `build(GO-COSMOS-SDK): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-08-PROFILE]` |
| `C6-SCP-08-REPLAY` | `contribution_implementation` | `solguard-deploy` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 8 | `test(GO-COSMOS-SDK): replay clean-input conformance and negative corpus [C6-SCP-08-REPLAY]` |
| `C6-SCP-08-SCOPE` | `contribution_implementation` | `solguard-docs` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 1 | `docs(GO-COSMOS-SDK): publish exact scope exclusions and residual debt [C6-SCP-08-SCOPE]` |
| `C6-SCP-08-TRACE` | `contribution_implementation` | `solguard-trace` | `GO-COSMOS-SDK-C3` | `GO-COSMOS-SDK-C3` | 1 | `feat(GO-COSMOS-SDK): bind interprocedural async and atomic provenance [C6-SCP-08-TRACE]` |
| `C6-SCP-08-VALIDATE` | `contribution_implementation` | `solguard-validate` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 2 | `feat(GO-COSMOS-SDK): reopen evidence and verify proof independently [C6-SCP-08-VALIDATE]` |
| `C6-SCP-08-VALUE` | `contribution_implementation` | `solguard-value` | `GO-COSMOS-SDK-C4` | `GO-COSMOS-SDK-C4` | 2 | `feat(GO-COSMOS-SDK): compile obligations and prove signed nonzero deltas [C6-SCP-08-VALUE]` |
| `C6-SCP-09-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 1 | `test(GO-GETH-CLIENT): freeze c0-c4 evidence and c5 candidate [C6-SCP-09-CANDIDATE]` |
| `C6-SCP-09-CORE` | `contribution_implementation` | `solguard-core` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 3 | `feat(GO-GETH-CLIENT): bind canonical candidates and evidence waves [C6-SCP-09-CORE]` |
| `C6-SCP-09-DIFF` | `contribution_implementation` | `solguard-diff` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 2 | `feat(GO-GETH-CLIENT): compare semantic guards units state and effects [C6-SCP-09-DIFF]` |
| `C6-SCP-09-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 1 | `feat(GO-GETH-CLIENT): instantiate units actors transitions and kernels [C6-SCP-09-ECONOMIC]` |
| `C6-SCP-09-FILTER` | `contribution_implementation` | `solguard-filter` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 1 | `feat(GO-GETH-CLIENT): enforce publication eligibility and review routing [C6-SCP-09-FILTER]` |
| `C6-SCP-09-FRONTEND` | `contribution_implementation` | `solguard-map` | `GO-GETH-CLIENT-C1` | `GO-GETH-CLIENT-C1` | 1 | `feat(GO-GETH-CLIENT): bind compiler parser symbols and spans [C6-SCP-09-FRONTEND]` |
| `C6-SCP-09-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 2 | `feat(GO-GETH-CLIENT): provide independent economic oracles [C6-SCP-09-INVARIANT]` |
| `C6-SCP-09-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `GO-GETH-CLIENT-C2` | `GO-GETH-CLIENT-C2` | 1 | `feat(GO-GETH-CLIENT): emit source-authoritative cfg state calls and effects [C6-SCP-09-LOCAL-IR]` |
| `C6-SCP-09-MODEL` | `contribution_implementation` | `solguard-discover` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 1 | `feat(GO-GETH-CLIENT): normalize facts into the shared protocol model [C6-SCP-09-MODEL]` |
| `C6-SCP-09-PROFILE` | `contribution_implementation` | `solguard-deploy` | `GO-GETH-CLIENT-C0` | `GO-GETH-CLIENT-C0` | 0 | `build(GO-GETH-CLIENT): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-09-PROFILE]` |
| `C6-SCP-09-REPLAY` | `contribution_implementation` | `solguard-deploy` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 8 | `test(GO-GETH-CLIENT): replay clean-input conformance and negative corpus [C6-SCP-09-REPLAY]` |
| `C6-SCP-09-SCOPE` | `contribution_implementation` | `solguard-docs` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 1 | `docs(GO-GETH-CLIENT): publish exact scope exclusions and residual debt [C6-SCP-09-SCOPE]` |
| `C6-SCP-09-TRACE` | `contribution_implementation` | `solguard-trace` | `GO-GETH-CLIENT-C3` | `GO-GETH-CLIENT-C3` | 1 | `feat(GO-GETH-CLIENT): bind interprocedural async and atomic provenance [C6-SCP-09-TRACE]` |
| `C6-SCP-09-VALIDATE` | `contribution_implementation` | `solguard-validate` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 2 | `feat(GO-GETH-CLIENT): reopen evidence and verify proof independently [C6-SCP-09-VALIDATE]` |
| `C6-SCP-09-VALUE` | `contribution_implementation` | `solguard-value` | `GO-GETH-CLIENT-C4` | `GO-GETH-CLIENT-C4` | 2 | `feat(GO-GETH-CLIENT): compile obligations and prove signed nonzero deltas [C6-SCP-09-VALUE]` |
| `C6-SCP-10-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 1 | `test(GO-RELAYER-ORACLE): freeze c0-c4 evidence and c5 candidate [C6-SCP-10-CANDIDATE]` |
| `C6-SCP-10-CORE` | `contribution_implementation` | `solguard-core` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 3 | `feat(GO-RELAYER-ORACLE): bind canonical candidates and evidence waves [C6-SCP-10-CORE]` |
| `C6-SCP-10-DIFF` | `contribution_implementation` | `solguard-diff` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 2 | `feat(GO-RELAYER-ORACLE): compare semantic guards units state and effects [C6-SCP-10-DIFF]` |
| `C6-SCP-10-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 1 | `feat(GO-RELAYER-ORACLE): instantiate units actors transitions and kernels [C6-SCP-10-ECONOMIC]` |
| `C6-SCP-10-FILTER` | `contribution_implementation` | `solguard-filter` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 1 | `feat(GO-RELAYER-ORACLE): enforce publication eligibility and review routing [C6-SCP-10-FILTER]` |
| `C6-SCP-10-FRONTEND` | `contribution_implementation` | `solguard-map` | `GO-RELAYER-ORACLE-C1` | `GO-RELAYER-ORACLE-C1` | 1 | `feat(GO-RELAYER-ORACLE): bind compiler parser symbols and spans [C6-SCP-10-FRONTEND]` |
| `C6-SCP-10-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 2 | `feat(GO-RELAYER-ORACLE): provide independent economic oracles [C6-SCP-10-INVARIANT]` |
| `C6-SCP-10-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `GO-RELAYER-ORACLE-C2` | `GO-RELAYER-ORACLE-C2` | 1 | `feat(GO-RELAYER-ORACLE): emit source-authoritative cfg state calls and effects [C6-SCP-10-LOCAL-IR]` |
| `C6-SCP-10-MODEL` | `contribution_implementation` | `solguard-discover` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 1 | `feat(GO-RELAYER-ORACLE): normalize facts into the shared protocol model [C6-SCP-10-MODEL]` |
| `C6-SCP-10-PROFILE` | `contribution_implementation` | `solguard-deploy` | `GO-RELAYER-ORACLE-C0` | `GO-RELAYER-ORACLE-C0` | 0 | `build(GO-RELAYER-ORACLE): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-10-PROFILE]` |
| `C6-SCP-10-REPLAY` | `contribution_implementation` | `solguard-deploy` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 8 | `test(GO-RELAYER-ORACLE): replay clean-input conformance and negative corpus [C6-SCP-10-REPLAY]` |
| `C6-SCP-10-SCOPE` | `contribution_implementation` | `solguard-docs` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 1 | `docs(GO-RELAYER-ORACLE): publish exact scope exclusions and residual debt [C6-SCP-10-SCOPE]` |
| `C6-SCP-10-TRACE` | `contribution_implementation` | `solguard-trace` | `GO-RELAYER-ORACLE-C3` | `GO-RELAYER-ORACLE-C3` | 1 | `feat(GO-RELAYER-ORACLE): bind interprocedural async and atomic provenance [C6-SCP-10-TRACE]` |
| `C6-SCP-10-VALIDATE` | `contribution_implementation` | `solguard-validate` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 2 | `feat(GO-RELAYER-ORACLE): reopen evidence and verify proof independently [C6-SCP-10-VALIDATE]` |
| `C6-SCP-10-VALUE` | `contribution_implementation` | `solguard-value` | `GO-RELAYER-ORACLE-C4` | `GO-RELAYER-ORACLE-C4` | 2 | `feat(GO-RELAYER-ORACLE): compile obligations and prove signed nonzero deltas [C6-SCP-10-VALUE]` |
| `C6-SCP-11-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 1 | `test(C-UTXO-CONSENSUS): freeze c0-c4 evidence and c5 candidate [C6-SCP-11-CANDIDATE]` |
| `C6-SCP-11-CORE` | `contribution_implementation` | `solguard-core` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 3 | `feat(C-UTXO-CONSENSUS): bind canonical candidates and evidence waves [C6-SCP-11-CORE]` |
| `C6-SCP-11-DIFF` | `contribution_implementation` | `solguard-diff` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 2 | `feat(C-UTXO-CONSENSUS): compare semantic guards units state and effects [C6-SCP-11-DIFF]` |
| `C6-SCP-11-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 1 | `feat(C-UTXO-CONSENSUS): instantiate units actors transitions and kernels [C6-SCP-11-ECONOMIC]` |
| `C6-SCP-11-FILTER` | `contribution_implementation` | `solguard-filter` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 1 | `feat(C-UTXO-CONSENSUS): enforce publication eligibility and review routing [C6-SCP-11-FILTER]` |
| `C6-SCP-11-FRONTEND` | `contribution_implementation` | `solguard-map` | `C-UTXO-CONSENSUS-C1` | `C-UTXO-CONSENSUS-C1` | 1 | `feat(C-UTXO-CONSENSUS): bind compiler parser symbols and spans [C6-SCP-11-FRONTEND]` |
| `C6-SCP-11-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 2 | `feat(C-UTXO-CONSENSUS): provide independent economic oracles [C6-SCP-11-INVARIANT]` |
| `C6-SCP-11-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `C-UTXO-CONSENSUS-C2` | `C-UTXO-CONSENSUS-C2` | 1 | `feat(C-UTXO-CONSENSUS): emit source-authoritative cfg state calls and effects [C6-SCP-11-LOCAL-IR]` |
| `C6-SCP-11-MODEL` | `contribution_implementation` | `solguard-discover` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 1 | `feat(C-UTXO-CONSENSUS): normalize facts into the shared protocol model [C6-SCP-11-MODEL]` |
| `C6-SCP-11-PROFILE` | `contribution_implementation` | `solguard-deploy` | `C-UTXO-CONSENSUS-C0` | `C-UTXO-CONSENSUS-C0` | 0 | `build(C-UTXO-CONSENSUS): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-11-PROFILE]` |
| `C6-SCP-11-REPLAY` | `contribution_implementation` | `solguard-deploy` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 8 | `test(C-UTXO-CONSENSUS): replay clean-input conformance and negative corpus [C6-SCP-11-REPLAY]` |
| `C6-SCP-11-SCOPE` | `contribution_implementation` | `solguard-docs` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 1 | `docs(C-UTXO-CONSENSUS): publish exact scope exclusions and residual debt [C6-SCP-11-SCOPE]` |
| `C6-SCP-11-TRACE` | `contribution_implementation` | `solguard-trace` | `C-UTXO-CONSENSUS-C3` | `C-UTXO-CONSENSUS-C3` | 1 | `feat(C-UTXO-CONSENSUS): bind interprocedural async and atomic provenance [C6-SCP-11-TRACE]` |
| `C6-SCP-11-VALIDATE` | `contribution_implementation` | `solguard-validate` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 2 | `feat(C-UTXO-CONSENSUS): reopen evidence and verify proof independently [C6-SCP-11-VALIDATE]` |
| `C6-SCP-11-VALUE` | `contribution_implementation` | `solguard-value` | `C-UTXO-CONSENSUS-C4` | `C-UTXO-CONSENSUS-C4` | 2 | `feat(C-UTXO-CONSENSUS): compile obligations and prove signed nonzero deltas [C6-SCP-11-VALUE]` |
| `C6-SCP-12-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 1 | `test(C-BRIDGE-FINALITY): freeze c0-c4 evidence and c5 candidate [C6-SCP-12-CANDIDATE]` |
| `C6-SCP-12-CORE` | `contribution_implementation` | `solguard-core` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 3 | `feat(C-BRIDGE-FINALITY): bind canonical candidates and evidence waves [C6-SCP-12-CORE]` |
| `C6-SCP-12-DIFF` | `contribution_implementation` | `solguard-diff` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 2 | `feat(C-BRIDGE-FINALITY): compare semantic guards units state and effects [C6-SCP-12-DIFF]` |
| `C6-SCP-12-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 1 | `feat(C-BRIDGE-FINALITY): instantiate units actors transitions and kernels [C6-SCP-12-ECONOMIC]` |
| `C6-SCP-12-FILTER` | `contribution_implementation` | `solguard-filter` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 1 | `feat(C-BRIDGE-FINALITY): enforce publication eligibility and review routing [C6-SCP-12-FILTER]` |
| `C6-SCP-12-FRONTEND` | `contribution_implementation` | `solguard-map` | `C-BRIDGE-FINALITY-C1` | `C-BRIDGE-FINALITY-C1` | 1 | `feat(C-BRIDGE-FINALITY): bind compiler parser symbols and spans [C6-SCP-12-FRONTEND]` |
| `C6-SCP-12-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 2 | `feat(C-BRIDGE-FINALITY): provide independent economic oracles [C6-SCP-12-INVARIANT]` |
| `C6-SCP-12-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `C-BRIDGE-FINALITY-C2` | `C-BRIDGE-FINALITY-C2` | 1 | `feat(C-BRIDGE-FINALITY): emit source-authoritative cfg state calls and effects [C6-SCP-12-LOCAL-IR]` |
| `C6-SCP-12-MODEL` | `contribution_implementation` | `solguard-discover` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 1 | `feat(C-BRIDGE-FINALITY): normalize facts into the shared protocol model [C6-SCP-12-MODEL]` |
| `C6-SCP-12-PROFILE` | `contribution_implementation` | `solguard-deploy` | `C-BRIDGE-FINALITY-C0` | `C-BRIDGE-FINALITY-C0` | 0 | `build(C-BRIDGE-FINALITY): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-12-PROFILE]` |
| `C6-SCP-12-REPLAY` | `contribution_implementation` | `solguard-deploy` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 8 | `test(C-BRIDGE-FINALITY): replay clean-input conformance and negative corpus [C6-SCP-12-REPLAY]` |
| `C6-SCP-12-SCOPE` | `contribution_implementation` | `solguard-docs` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 1 | `docs(C-BRIDGE-FINALITY): publish exact scope exclusions and residual debt [C6-SCP-12-SCOPE]` |
| `C6-SCP-12-TRACE` | `contribution_implementation` | `solguard-trace` | `C-BRIDGE-FINALITY-C3` | `C-BRIDGE-FINALITY-C3` | 1 | `feat(C-BRIDGE-FINALITY): bind interprocedural async and atomic provenance [C6-SCP-12-TRACE]` |
| `C6-SCP-12-VALIDATE` | `contribution_implementation` | `solguard-validate` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 2 | `feat(C-BRIDGE-FINALITY): reopen evidence and verify proof independently [C6-SCP-12-VALIDATE]` |
| `C6-SCP-12-VALUE` | `contribution_implementation` | `solguard-value` | `C-BRIDGE-FINALITY-C4` | `C-BRIDGE-FINALITY-C4` | 2 | `feat(C-BRIDGE-FINALITY): compile obligations and prove signed nonzero deltas [C6-SCP-12-VALUE]` |
| `C6-SCP-13-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 1 | `test(C-WALLET-CUSTODY): freeze c0-c4 evidence and c5 candidate [C6-SCP-13-CANDIDATE]` |
| `C6-SCP-13-CORE` | `contribution_implementation` | `solguard-core` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 3 | `feat(C-WALLET-CUSTODY): bind canonical candidates and evidence waves [C6-SCP-13-CORE]` |
| `C6-SCP-13-DIFF` | `contribution_implementation` | `solguard-diff` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 2 | `feat(C-WALLET-CUSTODY): compare semantic guards units state and effects [C6-SCP-13-DIFF]` |
| `C6-SCP-13-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 1 | `feat(C-WALLET-CUSTODY): instantiate units actors transitions and kernels [C6-SCP-13-ECONOMIC]` |
| `C6-SCP-13-FILTER` | `contribution_implementation` | `solguard-filter` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 1 | `feat(C-WALLET-CUSTODY): enforce publication eligibility and review routing [C6-SCP-13-FILTER]` |
| `C6-SCP-13-FRONTEND` | `contribution_implementation` | `solguard-map` | `C-WALLET-CUSTODY-C1` | `C-WALLET-CUSTODY-C1` | 1 | `feat(C-WALLET-CUSTODY): bind compiler parser symbols and spans [C6-SCP-13-FRONTEND]` |
| `C6-SCP-13-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 2 | `feat(C-WALLET-CUSTODY): provide independent economic oracles [C6-SCP-13-INVARIANT]` |
| `C6-SCP-13-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `C-WALLET-CUSTODY-C2` | `C-WALLET-CUSTODY-C2` | 1 | `feat(C-WALLET-CUSTODY): emit source-authoritative cfg state calls and effects [C6-SCP-13-LOCAL-IR]` |
| `C6-SCP-13-MODEL` | `contribution_implementation` | `solguard-discover` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 1 | `feat(C-WALLET-CUSTODY): normalize facts into the shared protocol model [C6-SCP-13-MODEL]` |
| `C6-SCP-13-PROFILE` | `contribution_implementation` | `solguard-deploy` | `C-WALLET-CUSTODY-C0` | `C-WALLET-CUSTODY-C0` | 0 | `build(C-WALLET-CUSTODY): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-13-PROFILE]` |
| `C6-SCP-13-REPLAY` | `contribution_implementation` | `solguard-deploy` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 8 | `test(C-WALLET-CUSTODY): replay clean-input conformance and negative corpus [C6-SCP-13-REPLAY]` |
| `C6-SCP-13-SCOPE` | `contribution_implementation` | `solguard-docs` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 1 | `docs(C-WALLET-CUSTODY): publish exact scope exclusions and residual debt [C6-SCP-13-SCOPE]` |
| `C6-SCP-13-TRACE` | `contribution_implementation` | `solguard-trace` | `C-WALLET-CUSTODY-C3` | `C-WALLET-CUSTODY-C3` | 1 | `feat(C-WALLET-CUSTODY): bind interprocedural async and atomic provenance [C6-SCP-13-TRACE]` |
| `C6-SCP-13-VALIDATE` | `contribution_implementation` | `solguard-validate` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 2 | `feat(C-WALLET-CUSTODY): reopen evidence and verify proof independently [C6-SCP-13-VALIDATE]` |
| `C6-SCP-13-VALUE` | `contribution_implementation` | `solguard-value` | `C-WALLET-CUSTODY-C4` | `C-WALLET-CUSTODY-C4` | 2 | `feat(C-WALLET-CUSTODY): compile obligations and prove signed nonzero deltas [C6-SCP-13-VALUE]` |
| `C6-SCP-14-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 1 | `test(CPP-UTXO-CONSENSUS): freeze c0-c4 evidence and c5 candidate [C6-SCP-14-CANDIDATE]` |
| `C6-SCP-14-CORE` | `contribution_implementation` | `solguard-core` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 3 | `feat(CPP-UTXO-CONSENSUS): bind canonical candidates and evidence waves [C6-SCP-14-CORE]` |
| `C6-SCP-14-DIFF` | `contribution_implementation` | `solguard-diff` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 2 | `feat(CPP-UTXO-CONSENSUS): compare semantic guards units state and effects [C6-SCP-14-DIFF]` |
| `C6-SCP-14-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 1 | `feat(CPP-UTXO-CONSENSUS): instantiate units actors transitions and kernels [C6-SCP-14-ECONOMIC]` |
| `C6-SCP-14-FILTER` | `contribution_implementation` | `solguard-filter` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 1 | `feat(CPP-UTXO-CONSENSUS): enforce publication eligibility and review routing [C6-SCP-14-FILTER]` |
| `C6-SCP-14-FRONTEND` | `contribution_implementation` | `solguard-map` | `CPP-UTXO-CONSENSUS-C1` | `CPP-UTXO-CONSENSUS-C1` | 1 | `feat(CPP-UTXO-CONSENSUS): bind compiler parser symbols and spans [C6-SCP-14-FRONTEND]` |
| `C6-SCP-14-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 2 | `feat(CPP-UTXO-CONSENSUS): provide independent economic oracles [C6-SCP-14-INVARIANT]` |
| `C6-SCP-14-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `CPP-UTXO-CONSENSUS-C2` | `CPP-UTXO-CONSENSUS-C2` | 1 | `feat(CPP-UTXO-CONSENSUS): emit source-authoritative cfg state calls and effects [C6-SCP-14-LOCAL-IR]` |
| `C6-SCP-14-MODEL` | `contribution_implementation` | `solguard-discover` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 1 | `feat(CPP-UTXO-CONSENSUS): normalize facts into the shared protocol model [C6-SCP-14-MODEL]` |
| `C6-SCP-14-PROFILE` | `contribution_implementation` | `solguard-deploy` | `CPP-UTXO-CONSENSUS-C0` | `CPP-UTXO-CONSENSUS-C0` | 0 | `build(CPP-UTXO-CONSENSUS): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-14-PROFILE]` |
| `C6-SCP-14-REPLAY` | `contribution_implementation` | `solguard-deploy` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 8 | `test(CPP-UTXO-CONSENSUS): replay clean-input conformance and negative corpus [C6-SCP-14-REPLAY]` |
| `C6-SCP-14-SCOPE` | `contribution_implementation` | `solguard-docs` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 1 | `docs(CPP-UTXO-CONSENSUS): publish exact scope exclusions and residual debt [C6-SCP-14-SCOPE]` |
| `C6-SCP-14-TRACE` | `contribution_implementation` | `solguard-trace` | `CPP-UTXO-CONSENSUS-C3` | `CPP-UTXO-CONSENSUS-C3` | 1 | `feat(CPP-UTXO-CONSENSUS): bind interprocedural async and atomic provenance [C6-SCP-14-TRACE]` |
| `C6-SCP-14-VALIDATE` | `contribution_implementation` | `solguard-validate` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 2 | `feat(CPP-UTXO-CONSENSUS): reopen evidence and verify proof independently [C6-SCP-14-VALIDATE]` |
| `C6-SCP-14-VALUE` | `contribution_implementation` | `solguard-value` | `CPP-UTXO-CONSENSUS-C4` | `CPP-UTXO-CONSENSUS-C4` | 2 | `feat(CPP-UTXO-CONSENSUS): compile obligations and prove signed nonzero deltas [C6-SCP-14-VALUE]` |
| `C6-SCP-15-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 1 | `test(CPP-BRIDGE-FINALITY): freeze c0-c4 evidence and c5 candidate [C6-SCP-15-CANDIDATE]` |
| `C6-SCP-15-CORE` | `contribution_implementation` | `solguard-core` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 3 | `feat(CPP-BRIDGE-FINALITY): bind canonical candidates and evidence waves [C6-SCP-15-CORE]` |
| `C6-SCP-15-DIFF` | `contribution_implementation` | `solguard-diff` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 2 | `feat(CPP-BRIDGE-FINALITY): compare semantic guards units state and effects [C6-SCP-15-DIFF]` |
| `C6-SCP-15-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 1 | `feat(CPP-BRIDGE-FINALITY): instantiate units actors transitions and kernels [C6-SCP-15-ECONOMIC]` |
| `C6-SCP-15-FILTER` | `contribution_implementation` | `solguard-filter` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 1 | `feat(CPP-BRIDGE-FINALITY): enforce publication eligibility and review routing [C6-SCP-15-FILTER]` |
| `C6-SCP-15-FRONTEND` | `contribution_implementation` | `solguard-map` | `CPP-BRIDGE-FINALITY-C1` | `CPP-BRIDGE-FINALITY-C1` | 1 | `feat(CPP-BRIDGE-FINALITY): bind compiler parser symbols and spans [C6-SCP-15-FRONTEND]` |
| `C6-SCP-15-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 2 | `feat(CPP-BRIDGE-FINALITY): provide independent economic oracles [C6-SCP-15-INVARIANT]` |
| `C6-SCP-15-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `CPP-BRIDGE-FINALITY-C2` | `CPP-BRIDGE-FINALITY-C2` | 1 | `feat(CPP-BRIDGE-FINALITY): emit source-authoritative cfg state calls and effects [C6-SCP-15-LOCAL-IR]` |
| `C6-SCP-15-MODEL` | `contribution_implementation` | `solguard-discover` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 1 | `feat(CPP-BRIDGE-FINALITY): normalize facts into the shared protocol model [C6-SCP-15-MODEL]` |
| `C6-SCP-15-PROFILE` | `contribution_implementation` | `solguard-deploy` | `CPP-BRIDGE-FINALITY-C0` | `CPP-BRIDGE-FINALITY-C0` | 0 | `build(CPP-BRIDGE-FINALITY): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-15-PROFILE]` |
| `C6-SCP-15-REPLAY` | `contribution_implementation` | `solguard-deploy` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 8 | `test(CPP-BRIDGE-FINALITY): replay clean-input conformance and negative corpus [C6-SCP-15-REPLAY]` |
| `C6-SCP-15-SCOPE` | `contribution_implementation` | `solguard-docs` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 1 | `docs(CPP-BRIDGE-FINALITY): publish exact scope exclusions and residual debt [C6-SCP-15-SCOPE]` |
| `C6-SCP-15-TRACE` | `contribution_implementation` | `solguard-trace` | `CPP-BRIDGE-FINALITY-C3` | `CPP-BRIDGE-FINALITY-C3` | 1 | `feat(CPP-BRIDGE-FINALITY): bind interprocedural async and atomic provenance [C6-SCP-15-TRACE]` |
| `C6-SCP-15-VALIDATE` | `contribution_implementation` | `solguard-validate` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 2 | `feat(CPP-BRIDGE-FINALITY): reopen evidence and verify proof independently [C6-SCP-15-VALIDATE]` |
| `C6-SCP-15-VALUE` | `contribution_implementation` | `solguard-value` | `CPP-BRIDGE-FINALITY-C4` | `CPP-BRIDGE-FINALITY-C4` | 2 | `feat(CPP-BRIDGE-FINALITY): compile obligations and prove signed nonzero deltas [C6-SCP-15-VALUE]` |
| `C6-SCP-16-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 1 | `test(CPP-WALLET-CUSTODY): freeze c0-c4 evidence and c5 candidate [C6-SCP-16-CANDIDATE]` |
| `C6-SCP-16-CORE` | `contribution_implementation` | `solguard-core` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 3 | `feat(CPP-WALLET-CUSTODY): bind canonical candidates and evidence waves [C6-SCP-16-CORE]` |
| `C6-SCP-16-DIFF` | `contribution_implementation` | `solguard-diff` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 2 | `feat(CPP-WALLET-CUSTODY): compare semantic guards units state and effects [C6-SCP-16-DIFF]` |
| `C6-SCP-16-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 1 | `feat(CPP-WALLET-CUSTODY): instantiate units actors transitions and kernels [C6-SCP-16-ECONOMIC]` |
| `C6-SCP-16-FILTER` | `contribution_implementation` | `solguard-filter` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 1 | `feat(CPP-WALLET-CUSTODY): enforce publication eligibility and review routing [C6-SCP-16-FILTER]` |
| `C6-SCP-16-FRONTEND` | `contribution_implementation` | `solguard-map` | `CPP-WALLET-CUSTODY-C1` | `CPP-WALLET-CUSTODY-C1` | 1 | `feat(CPP-WALLET-CUSTODY): bind compiler parser symbols and spans [C6-SCP-16-FRONTEND]` |
| `C6-SCP-16-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 2 | `feat(CPP-WALLET-CUSTODY): provide independent economic oracles [C6-SCP-16-INVARIANT]` |
| `C6-SCP-16-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `CPP-WALLET-CUSTODY-C2` | `CPP-WALLET-CUSTODY-C2` | 1 | `feat(CPP-WALLET-CUSTODY): emit source-authoritative cfg state calls and effects [C6-SCP-16-LOCAL-IR]` |
| `C6-SCP-16-MODEL` | `contribution_implementation` | `solguard-discover` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 1 | `feat(CPP-WALLET-CUSTODY): normalize facts into the shared protocol model [C6-SCP-16-MODEL]` |
| `C6-SCP-16-PROFILE` | `contribution_implementation` | `solguard-deploy` | `CPP-WALLET-CUSTODY-C0` | `CPP-WALLET-CUSTODY-C0` | 0 | `build(CPP-WALLET-CUSTODY): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-16-PROFILE]` |
| `C6-SCP-16-REPLAY` | `contribution_implementation` | `solguard-deploy` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 8 | `test(CPP-WALLET-CUSTODY): replay clean-input conformance and negative corpus [C6-SCP-16-REPLAY]` |
| `C6-SCP-16-SCOPE` | `contribution_implementation` | `solguard-docs` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 1 | `docs(CPP-WALLET-CUSTODY): publish exact scope exclusions and residual debt [C6-SCP-16-SCOPE]` |
| `C6-SCP-16-TRACE` | `contribution_implementation` | `solguard-trace` | `CPP-WALLET-CUSTODY-C3` | `CPP-WALLET-CUSTODY-C3` | 1 | `feat(CPP-WALLET-CUSTODY): bind interprocedural async and atomic provenance [C6-SCP-16-TRACE]` |
| `C6-SCP-16-VALIDATE` | `contribution_implementation` | `solguard-validate` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 2 | `feat(CPP-WALLET-CUSTODY): reopen evidence and verify proof independently [C6-SCP-16-VALIDATE]` |
| `C6-SCP-16-VALUE` | `contribution_implementation` | `solguard-value` | `CPP-WALLET-CUSTODY-C4` | `CPP-WALLET-CUSTODY-C4` | 2 | `feat(CPP-WALLET-CUSTODY): compile obligations and prove signed nonzero deltas [C6-SCP-16-VALUE]` |
| `C6-SCP-17-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 1 | `test(JS-NODE-RELAYER): freeze c0-c4 evidence and c5 candidate [C6-SCP-17-CANDIDATE]` |
| `C6-SCP-17-CORE` | `contribution_implementation` | `solguard-core` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 3 | `feat(JS-NODE-RELAYER): bind canonical candidates and evidence waves [C6-SCP-17-CORE]` |
| `C6-SCP-17-DIFF` | `contribution_implementation` | `solguard-diff` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 2 | `feat(JS-NODE-RELAYER): compare semantic guards units state and effects [C6-SCP-17-DIFF]` |
| `C6-SCP-17-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 1 | `feat(JS-NODE-RELAYER): instantiate units actors transitions and kernels [C6-SCP-17-ECONOMIC]` |
| `C6-SCP-17-FILTER` | `contribution_implementation` | `solguard-filter` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 1 | `feat(JS-NODE-RELAYER): enforce publication eligibility and review routing [C6-SCP-17-FILTER]` |
| `C6-SCP-17-FRONTEND` | `contribution_implementation` | `solguard-map` | `JS-NODE-RELAYER-C1` | `JS-NODE-RELAYER-C1` | 1 | `feat(JS-NODE-RELAYER): bind compiler parser symbols and spans [C6-SCP-17-FRONTEND]` |
| `C6-SCP-17-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 2 | `feat(JS-NODE-RELAYER): provide independent economic oracles [C6-SCP-17-INVARIANT]` |
| `C6-SCP-17-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `JS-NODE-RELAYER-C2` | `JS-NODE-RELAYER-C2` | 1 | `feat(JS-NODE-RELAYER): emit source-authoritative cfg state calls and effects [C6-SCP-17-LOCAL-IR]` |
| `C6-SCP-17-MODEL` | `contribution_implementation` | `solguard-discover` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 1 | `feat(JS-NODE-RELAYER): normalize facts into the shared protocol model [C6-SCP-17-MODEL]` |
| `C6-SCP-17-PROFILE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-RELAYER-C0` | `JS-NODE-RELAYER-C0` | 0 | `build(JS-NODE-RELAYER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-17-PROFILE]` |
| `C6-SCP-17-REPLAY` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 8 | `test(JS-NODE-RELAYER): replay clean-input conformance and negative corpus [C6-SCP-17-REPLAY]` |
| `C6-SCP-17-SCOPE` | `contribution_implementation` | `solguard-docs` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 1 | `docs(JS-NODE-RELAYER): publish exact scope exclusions and residual debt [C6-SCP-17-SCOPE]` |
| `C6-SCP-17-TRACE` | `contribution_implementation` | `solguard-trace` | `JS-NODE-RELAYER-C3` | `JS-NODE-RELAYER-C3` | 1 | `feat(JS-NODE-RELAYER): bind interprocedural async and atomic provenance [C6-SCP-17-TRACE]` |
| `C6-SCP-17-VALIDATE` | `contribution_implementation` | `solguard-validate` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 2 | `feat(JS-NODE-RELAYER): reopen evidence and verify proof independently [C6-SCP-17-VALIDATE]` |
| `C6-SCP-17-VALUE` | `contribution_implementation` | `solguard-value` | `JS-NODE-RELAYER-C4` | `JS-NODE-RELAYER-C4` | 2 | `feat(JS-NODE-RELAYER): compile obligations and prove signed nonzero deltas [C6-SCP-17-VALUE]` |
| `C6-SCP-18-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 1 | `test(JS-NODE-KEEPER-ORACLE): freeze c0-c4 evidence and c5 candidate [C6-SCP-18-CANDIDATE]` |
| `C6-SCP-18-CORE` | `contribution_implementation` | `solguard-core` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 3 | `feat(JS-NODE-KEEPER-ORACLE): bind canonical candidates and evidence waves [C6-SCP-18-CORE]` |
| `C6-SCP-18-DIFF` | `contribution_implementation` | `solguard-diff` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(JS-NODE-KEEPER-ORACLE): compare semantic guards units state and effects [C6-SCP-18-DIFF]` |
| `C6-SCP-18-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(JS-NODE-KEEPER-ORACLE): instantiate units actors transitions and kernels [C6-SCP-18-ECONOMIC]` |
| `C6-SCP-18-FILTER` | `contribution_implementation` | `solguard-filter` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(JS-NODE-KEEPER-ORACLE): enforce publication eligibility and review routing [C6-SCP-18-FILTER]` |
| `C6-SCP-18-FRONTEND` | `contribution_implementation` | `solguard-map` | `JS-NODE-KEEPER-ORACLE-C1` | `JS-NODE-KEEPER-ORACLE-C1` | 1 | `feat(JS-NODE-KEEPER-ORACLE): bind compiler parser symbols and spans [C6-SCP-18-FRONTEND]` |
| `C6-SCP-18-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(JS-NODE-KEEPER-ORACLE): provide independent economic oracles [C6-SCP-18-INVARIANT]` |
| `C6-SCP-18-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `JS-NODE-KEEPER-ORACLE-C2` | `JS-NODE-KEEPER-ORACLE-C2` | 1 | `feat(JS-NODE-KEEPER-ORACLE): emit source-authoritative cfg state calls and effects [C6-SCP-18-LOCAL-IR]` |
| `C6-SCP-18-MODEL` | `contribution_implementation` | `solguard-discover` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(JS-NODE-KEEPER-ORACLE): normalize facts into the shared protocol model [C6-SCP-18-MODEL]` |
| `C6-SCP-18-PROFILE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-KEEPER-ORACLE-C0` | `JS-NODE-KEEPER-ORACLE-C0` | 0 | `build(JS-NODE-KEEPER-ORACLE): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-18-PROFILE]` |
| `C6-SCP-18-REPLAY` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 8 | `test(JS-NODE-KEEPER-ORACLE): replay clean-input conformance and negative corpus [C6-SCP-18-REPLAY]` |
| `C6-SCP-18-SCOPE` | `contribution_implementation` | `solguard-docs` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 1 | `docs(JS-NODE-KEEPER-ORACLE): publish exact scope exclusions and residual debt [C6-SCP-18-SCOPE]` |
| `C6-SCP-18-TRACE` | `contribution_implementation` | `solguard-trace` | `JS-NODE-KEEPER-ORACLE-C3` | `JS-NODE-KEEPER-ORACLE-C3` | 1 | `feat(JS-NODE-KEEPER-ORACLE): bind interprocedural async and atomic provenance [C6-SCP-18-TRACE]` |
| `C6-SCP-18-VALIDATE` | `contribution_implementation` | `solguard-validate` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(JS-NODE-KEEPER-ORACLE): reopen evidence and verify proof independently [C6-SCP-18-VALIDATE]` |
| `C6-SCP-18-VALUE` | `contribution_implementation` | `solguard-value` | `JS-NODE-KEEPER-ORACLE-C4` | `JS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(JS-NODE-KEEPER-ORACLE): compile obligations and prove signed nonzero deltas [C6-SCP-18-VALUE]` |
| `C6-SCP-19-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 1 | `test(JS-NODE-TX-BUILDER): freeze c0-c4 evidence and c5 candidate [C6-SCP-19-CANDIDATE]` |
| `C6-SCP-19-CORE` | `contribution_implementation` | `solguard-core` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 3 | `feat(JS-NODE-TX-BUILDER): bind canonical candidates and evidence waves [C6-SCP-19-CORE]` |
| `C6-SCP-19-DIFF` | `contribution_implementation` | `solguard-diff` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 2 | `feat(JS-NODE-TX-BUILDER): compare semantic guards units state and effects [C6-SCP-19-DIFF]` |
| `C6-SCP-19-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 1 | `feat(JS-NODE-TX-BUILDER): instantiate units actors transitions and kernels [C6-SCP-19-ECONOMIC]` |
| `C6-SCP-19-FILTER` | `contribution_implementation` | `solguard-filter` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 1 | `feat(JS-NODE-TX-BUILDER): enforce publication eligibility and review routing [C6-SCP-19-FILTER]` |
| `C6-SCP-19-FRONTEND` | `contribution_implementation` | `solguard-map` | `JS-NODE-TX-BUILDER-C1` | `JS-NODE-TX-BUILDER-C1` | 1 | `feat(JS-NODE-TX-BUILDER): bind compiler parser symbols and spans [C6-SCP-19-FRONTEND]` |
| `C6-SCP-19-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 2 | `feat(JS-NODE-TX-BUILDER): provide independent economic oracles [C6-SCP-19-INVARIANT]` |
| `C6-SCP-19-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `JS-NODE-TX-BUILDER-C2` | `JS-NODE-TX-BUILDER-C2` | 1 | `feat(JS-NODE-TX-BUILDER): emit source-authoritative cfg state calls and effects [C6-SCP-19-LOCAL-IR]` |
| `C6-SCP-19-MODEL` | `contribution_implementation` | `solguard-discover` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 1 | `feat(JS-NODE-TX-BUILDER): normalize facts into the shared protocol model [C6-SCP-19-MODEL]` |
| `C6-SCP-19-PROFILE` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-TX-BUILDER-C0` | `JS-NODE-TX-BUILDER-C0` | 0 | `build(JS-NODE-TX-BUILDER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-19-PROFILE]` |
| `C6-SCP-19-REPLAY` | `contribution_implementation` | `solguard-deploy` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 8 | `test(JS-NODE-TX-BUILDER): replay clean-input conformance and negative corpus [C6-SCP-19-REPLAY]` |
| `C6-SCP-19-SCOPE` | `contribution_implementation` | `solguard-docs` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 1 | `docs(JS-NODE-TX-BUILDER): publish exact scope exclusions and residual debt [C6-SCP-19-SCOPE]` |
| `C6-SCP-19-TRACE` | `contribution_implementation` | `solguard-trace` | `JS-NODE-TX-BUILDER-C3` | `JS-NODE-TX-BUILDER-C3` | 1 | `feat(JS-NODE-TX-BUILDER): bind interprocedural async and atomic provenance [C6-SCP-19-TRACE]` |
| `C6-SCP-19-VALIDATE` | `contribution_implementation` | `solguard-validate` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 2 | `feat(JS-NODE-TX-BUILDER): reopen evidence and verify proof independently [C6-SCP-19-VALIDATE]` |
| `C6-SCP-19-VALUE` | `contribution_implementation` | `solguard-value` | `JS-NODE-TX-BUILDER-C4` | `JS-NODE-TX-BUILDER-C4` | 2 | `feat(JS-NODE-TX-BUILDER): compile obligations and prove signed nonzero deltas [C6-SCP-19-VALUE]` |
| `C6-SCP-20-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 1 | `test(TS-NODE-RELAYER-SDK): freeze c0-c4 evidence and c5 candidate [C6-SCP-20-CANDIDATE]` |
| `C6-SCP-20-CORE` | `contribution_implementation` | `solguard-core` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 3 | `feat(TS-NODE-RELAYER-SDK): bind canonical candidates and evidence waves [C6-SCP-20-CORE]` |
| `C6-SCP-20-DIFF` | `contribution_implementation` | `solguard-diff` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 2 | `feat(TS-NODE-RELAYER-SDK): compare semantic guards units state and effects [C6-SCP-20-DIFF]` |
| `C6-SCP-20-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 1 | `feat(TS-NODE-RELAYER-SDK): instantiate units actors transitions and kernels [C6-SCP-20-ECONOMIC]` |
| `C6-SCP-20-FILTER` | `contribution_implementation` | `solguard-filter` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 1 | `feat(TS-NODE-RELAYER-SDK): enforce publication eligibility and review routing [C6-SCP-20-FILTER]` |
| `C6-SCP-20-FRONTEND` | `contribution_implementation` | `solguard-map` | `TS-NODE-RELAYER-SDK-C1` | `TS-NODE-RELAYER-SDK-C1` | 1 | `feat(TS-NODE-RELAYER-SDK): bind compiler parser symbols and spans [C6-SCP-20-FRONTEND]` |
| `C6-SCP-20-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 2 | `feat(TS-NODE-RELAYER-SDK): provide independent economic oracles [C6-SCP-20-INVARIANT]` |
| `C6-SCP-20-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `TS-NODE-RELAYER-SDK-C2` | `TS-NODE-RELAYER-SDK-C2` | 1 | `feat(TS-NODE-RELAYER-SDK): emit source-authoritative cfg state calls and effects [C6-SCP-20-LOCAL-IR]` |
| `C6-SCP-20-MODEL` | `contribution_implementation` | `solguard-discover` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 1 | `feat(TS-NODE-RELAYER-SDK): normalize facts into the shared protocol model [C6-SCP-20-MODEL]` |
| `C6-SCP-20-PROFILE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-RELAYER-SDK-C0` | `TS-NODE-RELAYER-SDK-C0` | 0 | `build(TS-NODE-RELAYER-SDK): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-20-PROFILE]` |
| `C6-SCP-20-REPLAY` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 8 | `test(TS-NODE-RELAYER-SDK): replay clean-input conformance and negative corpus [C6-SCP-20-REPLAY]` |
| `C6-SCP-20-SCOPE` | `contribution_implementation` | `solguard-docs` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 1 | `docs(TS-NODE-RELAYER-SDK): publish exact scope exclusions and residual debt [C6-SCP-20-SCOPE]` |
| `C6-SCP-20-TRACE` | `contribution_implementation` | `solguard-trace` | `TS-NODE-RELAYER-SDK-C3` | `TS-NODE-RELAYER-SDK-C3` | 1 | `feat(TS-NODE-RELAYER-SDK): bind interprocedural async and atomic provenance [C6-SCP-20-TRACE]` |
| `C6-SCP-20-VALIDATE` | `contribution_implementation` | `solguard-validate` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 2 | `feat(TS-NODE-RELAYER-SDK): reopen evidence and verify proof independently [C6-SCP-20-VALIDATE]` |
| `C6-SCP-20-VALUE` | `contribution_implementation` | `solguard-value` | `TS-NODE-RELAYER-SDK-C4` | `TS-NODE-RELAYER-SDK-C4` | 2 | `feat(TS-NODE-RELAYER-SDK): compile obligations and prove signed nonzero deltas [C6-SCP-20-VALUE]` |
| `C6-SCP-21-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 1 | `test(TS-NODE-KEEPER-ORACLE): freeze c0-c4 evidence and c5 candidate [C6-SCP-21-CANDIDATE]` |
| `C6-SCP-21-CORE` | `contribution_implementation` | `solguard-core` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 3 | `feat(TS-NODE-KEEPER-ORACLE): bind canonical candidates and evidence waves [C6-SCP-21-CORE]` |
| `C6-SCP-21-DIFF` | `contribution_implementation` | `solguard-diff` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(TS-NODE-KEEPER-ORACLE): compare semantic guards units state and effects [C6-SCP-21-DIFF]` |
| `C6-SCP-21-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(TS-NODE-KEEPER-ORACLE): instantiate units actors transitions and kernels [C6-SCP-21-ECONOMIC]` |
| `C6-SCP-21-FILTER` | `contribution_implementation` | `solguard-filter` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(TS-NODE-KEEPER-ORACLE): enforce publication eligibility and review routing [C6-SCP-21-FILTER]` |
| `C6-SCP-21-FRONTEND` | `contribution_implementation` | `solguard-map` | `TS-NODE-KEEPER-ORACLE-C1` | `TS-NODE-KEEPER-ORACLE-C1` | 1 | `feat(TS-NODE-KEEPER-ORACLE): bind compiler parser symbols and spans [C6-SCP-21-FRONTEND]` |
| `C6-SCP-21-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(TS-NODE-KEEPER-ORACLE): provide independent economic oracles [C6-SCP-21-INVARIANT]` |
| `C6-SCP-21-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `TS-NODE-KEEPER-ORACLE-C2` | `TS-NODE-KEEPER-ORACLE-C2` | 1 | `feat(TS-NODE-KEEPER-ORACLE): emit source-authoritative cfg state calls and effects [C6-SCP-21-LOCAL-IR]` |
| `C6-SCP-21-MODEL` | `contribution_implementation` | `solguard-discover` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 1 | `feat(TS-NODE-KEEPER-ORACLE): normalize facts into the shared protocol model [C6-SCP-21-MODEL]` |
| `C6-SCP-21-PROFILE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-KEEPER-ORACLE-C0` | `TS-NODE-KEEPER-ORACLE-C0` | 0 | `build(TS-NODE-KEEPER-ORACLE): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-21-PROFILE]` |
| `C6-SCP-21-REPLAY` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 8 | `test(TS-NODE-KEEPER-ORACLE): replay clean-input conformance and negative corpus [C6-SCP-21-REPLAY]` |
| `C6-SCP-21-SCOPE` | `contribution_implementation` | `solguard-docs` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 1 | `docs(TS-NODE-KEEPER-ORACLE): publish exact scope exclusions and residual debt [C6-SCP-21-SCOPE]` |
| `C6-SCP-21-TRACE` | `contribution_implementation` | `solguard-trace` | `TS-NODE-KEEPER-ORACLE-C3` | `TS-NODE-KEEPER-ORACLE-C3` | 1 | `feat(TS-NODE-KEEPER-ORACLE): bind interprocedural async and atomic provenance [C6-SCP-21-TRACE]` |
| `C6-SCP-21-VALIDATE` | `contribution_implementation` | `solguard-validate` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(TS-NODE-KEEPER-ORACLE): reopen evidence and verify proof independently [C6-SCP-21-VALIDATE]` |
| `C6-SCP-21-VALUE` | `contribution_implementation` | `solguard-value` | `TS-NODE-KEEPER-ORACLE-C4` | `TS-NODE-KEEPER-ORACLE-C4` | 2 | `feat(TS-NODE-KEEPER-ORACLE): compile obligations and prove signed nonzero deltas [C6-SCP-21-VALUE]` |
| `C6-SCP-22-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 1 | `test(TS-NODE-TX-BUILDER): freeze c0-c4 evidence and c5 candidate [C6-SCP-22-CANDIDATE]` |
| `C6-SCP-22-CORE` | `contribution_implementation` | `solguard-core` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 3 | `feat(TS-NODE-TX-BUILDER): bind canonical candidates and evidence waves [C6-SCP-22-CORE]` |
| `C6-SCP-22-DIFF` | `contribution_implementation` | `solguard-diff` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 2 | `feat(TS-NODE-TX-BUILDER): compare semantic guards units state and effects [C6-SCP-22-DIFF]` |
| `C6-SCP-22-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 1 | `feat(TS-NODE-TX-BUILDER): instantiate units actors transitions and kernels [C6-SCP-22-ECONOMIC]` |
| `C6-SCP-22-FILTER` | `contribution_implementation` | `solguard-filter` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 1 | `feat(TS-NODE-TX-BUILDER): enforce publication eligibility and review routing [C6-SCP-22-FILTER]` |
| `C6-SCP-22-FRONTEND` | `contribution_implementation` | `solguard-map` | `TS-NODE-TX-BUILDER-C1` | `TS-NODE-TX-BUILDER-C1` | 1 | `feat(TS-NODE-TX-BUILDER): bind compiler parser symbols and spans [C6-SCP-22-FRONTEND]` |
| `C6-SCP-22-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 2 | `feat(TS-NODE-TX-BUILDER): provide independent economic oracles [C6-SCP-22-INVARIANT]` |
| `C6-SCP-22-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `TS-NODE-TX-BUILDER-C2` | `TS-NODE-TX-BUILDER-C2` | 1 | `feat(TS-NODE-TX-BUILDER): emit source-authoritative cfg state calls and effects [C6-SCP-22-LOCAL-IR]` |
| `C6-SCP-22-MODEL` | `contribution_implementation` | `solguard-discover` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 1 | `feat(TS-NODE-TX-BUILDER): normalize facts into the shared protocol model [C6-SCP-22-MODEL]` |
| `C6-SCP-22-PROFILE` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-TX-BUILDER-C0` | `TS-NODE-TX-BUILDER-C0` | 0 | `build(TS-NODE-TX-BUILDER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-22-PROFILE]` |
| `C6-SCP-22-REPLAY` | `contribution_implementation` | `solguard-deploy` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 8 | `test(TS-NODE-TX-BUILDER): replay clean-input conformance and negative corpus [C6-SCP-22-REPLAY]` |
| `C6-SCP-22-SCOPE` | `contribution_implementation` | `solguard-docs` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 1 | `docs(TS-NODE-TX-BUILDER): publish exact scope exclusions and residual debt [C6-SCP-22-SCOPE]` |
| `C6-SCP-22-TRACE` | `contribution_implementation` | `solguard-trace` | `TS-NODE-TX-BUILDER-C3` | `TS-NODE-TX-BUILDER-C3` | 1 | `feat(TS-NODE-TX-BUILDER): bind interprocedural async and atomic provenance [C6-SCP-22-TRACE]` |
| `C6-SCP-22-VALIDATE` | `contribution_implementation` | `solguard-validate` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 2 | `feat(TS-NODE-TX-BUILDER): reopen evidence and verify proof independently [C6-SCP-22-VALIDATE]` |
| `C6-SCP-22-VALUE` | `contribution_implementation` | `solguard-value` | `TS-NODE-TX-BUILDER-C4` | `TS-NODE-TX-BUILDER-C4` | 2 | `feat(TS-NODE-TX-BUILDER): compile obligations and prove signed nonzero deltas [C6-SCP-22-VALUE]` |
| `C6-SCP-23-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 1 | `test(X-SOL-TS-RELAYER): freeze c0-c4 evidence and c5 candidate [C6-SCP-23-CANDIDATE]` |
| `C6-SCP-23-CORE` | `contribution_implementation` | `solguard-core` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 3 | `feat(X-SOL-TS-RELAYER): bind canonical candidates and evidence waves [C6-SCP-23-CORE]` |
| `C6-SCP-23-DIFF` | `contribution_implementation` | `solguard-diff` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 2 | `feat(X-SOL-TS-RELAYER): compare semantic guards units state and effects [C6-SCP-23-DIFF]` |
| `C6-SCP-23-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 1 | `feat(X-SOL-TS-RELAYER): instantiate units actors transitions and kernels [C6-SCP-23-ECONOMIC]` |
| `C6-SCP-23-FILTER` | `contribution_implementation` | `solguard-filter` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 1 | `feat(X-SOL-TS-RELAYER): enforce publication eligibility and review routing [C6-SCP-23-FILTER]` |
| `C6-SCP-23-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-SOL-TS-RELAYER-C1` | `X-SOL-TS-RELAYER-C1` | 1 | `feat(X-SOL-TS-RELAYER): bind compiler parser symbols and spans [C6-SCP-23-FRONTEND]` |
| `C6-SCP-23-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 2 | `feat(X-SOL-TS-RELAYER): provide independent economic oracles [C6-SCP-23-INVARIANT]` |
| `C6-SCP-23-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-SOL-TS-RELAYER-C2` | `X-SOL-TS-RELAYER-C2` | 1 | `feat(X-SOL-TS-RELAYER): emit source-authoritative cfg state calls and effects [C6-SCP-23-LOCAL-IR]` |
| `C6-SCP-23-MODEL` | `contribution_implementation` | `solguard-discover` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 1 | `feat(X-SOL-TS-RELAYER): normalize facts into the shared protocol model [C6-SCP-23-MODEL]` |
| `C6-SCP-23-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-SOL-TS-RELAYER-C0` | `X-SOL-TS-RELAYER-C0` | 0 | `build(X-SOL-TS-RELAYER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-23-PROFILE]` |
| `C6-SCP-23-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 8 | `test(X-SOL-TS-RELAYER): replay clean-input conformance and negative corpus [C6-SCP-23-REPLAY]` |
| `C6-SCP-23-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 1 | `docs(X-SOL-TS-RELAYER): publish exact scope exclusions and residual debt [C6-SCP-23-SCOPE]` |
| `C6-SCP-23-TRACE` | `contribution_implementation` | `solguard-trace` | `X-SOL-TS-RELAYER-C3` | `X-SOL-TS-RELAYER-C3` | 1 | `feat(X-SOL-TS-RELAYER): bind interprocedural async and atomic provenance [C6-SCP-23-TRACE]` |
| `C6-SCP-23-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 2 | `feat(X-SOL-TS-RELAYER): reopen evidence and verify proof independently [C6-SCP-23-VALIDATE]` |
| `C6-SCP-23-VALUE` | `contribution_implementation` | `solguard-value` | `X-SOL-TS-RELAYER-C4` | `X-SOL-TS-RELAYER-C4` | 2 | `feat(X-SOL-TS-RELAYER): compile obligations and prove signed nonzero deltas [C6-SCP-23-VALUE]` |
| `C6-SCP-24-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 1 | `test(X-VYP-JS-KEEPER): freeze c0-c4 evidence and c5 candidate [C6-SCP-24-CANDIDATE]` |
| `C6-SCP-24-CORE` | `contribution_implementation` | `solguard-core` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 3 | `feat(X-VYP-JS-KEEPER): bind canonical candidates and evidence waves [C6-SCP-24-CORE]` |
| `C6-SCP-24-DIFF` | `contribution_implementation` | `solguard-diff` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 2 | `feat(X-VYP-JS-KEEPER): compare semantic guards units state and effects [C6-SCP-24-DIFF]` |
| `C6-SCP-24-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 1 | `feat(X-VYP-JS-KEEPER): instantiate units actors transitions and kernels [C6-SCP-24-ECONOMIC]` |
| `C6-SCP-24-FILTER` | `contribution_implementation` | `solguard-filter` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 1 | `feat(X-VYP-JS-KEEPER): enforce publication eligibility and review routing [C6-SCP-24-FILTER]` |
| `C6-SCP-24-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-VYP-JS-KEEPER-C1` | `X-VYP-JS-KEEPER-C1` | 1 | `feat(X-VYP-JS-KEEPER): bind compiler parser symbols and spans [C6-SCP-24-FRONTEND]` |
| `C6-SCP-24-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 2 | `feat(X-VYP-JS-KEEPER): provide independent economic oracles [C6-SCP-24-INVARIANT]` |
| `C6-SCP-24-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-VYP-JS-KEEPER-C2` | `X-VYP-JS-KEEPER-C2` | 1 | `feat(X-VYP-JS-KEEPER): emit source-authoritative cfg state calls and effects [C6-SCP-24-LOCAL-IR]` |
| `C6-SCP-24-MODEL` | `contribution_implementation` | `solguard-discover` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 1 | `feat(X-VYP-JS-KEEPER): normalize facts into the shared protocol model [C6-SCP-24-MODEL]` |
| `C6-SCP-24-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-VYP-JS-KEEPER-C0` | `X-VYP-JS-KEEPER-C0` | 0 | `build(X-VYP-JS-KEEPER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-24-PROFILE]` |
| `C6-SCP-24-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 8 | `test(X-VYP-JS-KEEPER): replay clean-input conformance and negative corpus [C6-SCP-24-REPLAY]` |
| `C6-SCP-24-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 1 | `docs(X-VYP-JS-KEEPER): publish exact scope exclusions and residual debt [C6-SCP-24-SCOPE]` |
| `C6-SCP-24-TRACE` | `contribution_implementation` | `solguard-trace` | `X-VYP-JS-KEEPER-C3` | `X-VYP-JS-KEEPER-C3` | 1 | `feat(X-VYP-JS-KEEPER): bind interprocedural async and atomic provenance [C6-SCP-24-TRACE]` |
| `C6-SCP-24-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 2 | `feat(X-VYP-JS-KEEPER): reopen evidence and verify proof independently [C6-SCP-24-VALIDATE]` |
| `C6-SCP-24-VALUE` | `contribution_implementation` | `solguard-value` | `X-VYP-JS-KEEPER-C4` | `X-VYP-JS-KEEPER-C4` | 2 | `feat(X-VYP-JS-KEEPER): compile obligations and prove signed nonzero deltas [C6-SCP-24-VALUE]` |
| `C6-SCP-25-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 1 | `test(X-SOLANA-TS-CLIENT): freeze c0-c4 evidence and c5 candidate [C6-SCP-25-CANDIDATE]` |
| `C6-SCP-25-CORE` | `contribution_implementation` | `solguard-core` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 3 | `feat(X-SOLANA-TS-CLIENT): bind canonical candidates and evidence waves [C6-SCP-25-CORE]` |
| `C6-SCP-25-DIFF` | `contribution_implementation` | `solguard-diff` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 2 | `feat(X-SOLANA-TS-CLIENT): compare semantic guards units state and effects [C6-SCP-25-DIFF]` |
| `C6-SCP-25-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 1 | `feat(X-SOLANA-TS-CLIENT): instantiate units actors transitions and kernels [C6-SCP-25-ECONOMIC]` |
| `C6-SCP-25-FILTER` | `contribution_implementation` | `solguard-filter` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 1 | `feat(X-SOLANA-TS-CLIENT): enforce publication eligibility and review routing [C6-SCP-25-FILTER]` |
| `C6-SCP-25-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-SOLANA-TS-CLIENT-C1` | `X-SOLANA-TS-CLIENT-C1` | 1 | `feat(X-SOLANA-TS-CLIENT): bind compiler parser symbols and spans [C6-SCP-25-FRONTEND]` |
| `C6-SCP-25-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 2 | `feat(X-SOLANA-TS-CLIENT): provide independent economic oracles [C6-SCP-25-INVARIANT]` |
| `C6-SCP-25-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-SOLANA-TS-CLIENT-C2` | `X-SOLANA-TS-CLIENT-C2` | 1 | `feat(X-SOLANA-TS-CLIENT): emit source-authoritative cfg state calls and effects [C6-SCP-25-LOCAL-IR]` |
| `C6-SCP-25-MODEL` | `contribution_implementation` | `solguard-discover` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 1 | `feat(X-SOLANA-TS-CLIENT): normalize facts into the shared protocol model [C6-SCP-25-MODEL]` |
| `C6-SCP-25-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-SOLANA-TS-CLIENT-C0` | `X-SOLANA-TS-CLIENT-C0` | 0 | `build(X-SOLANA-TS-CLIENT): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-25-PROFILE]` |
| `C6-SCP-25-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 8 | `test(X-SOLANA-TS-CLIENT): replay clean-input conformance and negative corpus [C6-SCP-25-REPLAY]` |
| `C6-SCP-25-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 1 | `docs(X-SOLANA-TS-CLIENT): publish exact scope exclusions and residual debt [C6-SCP-25-SCOPE]` |
| `C6-SCP-25-TRACE` | `contribution_implementation` | `solguard-trace` | `X-SOLANA-TS-CLIENT-C3` | `X-SOLANA-TS-CLIENT-C3` | 1 | `feat(X-SOLANA-TS-CLIENT): bind interprocedural async and atomic provenance [C6-SCP-25-TRACE]` |
| `C6-SCP-25-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 2 | `feat(X-SOLANA-TS-CLIENT): reopen evidence and verify proof independently [C6-SCP-25-VALIDATE]` |
| `C6-SCP-25-VALUE` | `contribution_implementation` | `solguard-value` | `X-SOLANA-TS-CLIENT-C4` | `X-SOLANA-TS-CLIENT-C4` | 2 | `feat(X-SOLANA-TS-CLIENT): compile obligations and prove signed nonzero deltas [C6-SCP-25-VALUE]` |
| `C6-SCP-26-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 1 | `test(X-COSMWASM-GO-RELAYER): freeze c0-c4 evidence and c5 candidate [C6-SCP-26-CANDIDATE]` |
| `C6-SCP-26-CORE` | `contribution_implementation` | `solguard-core` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 3 | `feat(X-COSMWASM-GO-RELAYER): bind canonical candidates and evidence waves [C6-SCP-26-CORE]` |
| `C6-SCP-26-DIFF` | `contribution_implementation` | `solguard-diff` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 2 | `feat(X-COSMWASM-GO-RELAYER): compare semantic guards units state and effects [C6-SCP-26-DIFF]` |
| `C6-SCP-26-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 1 | `feat(X-COSMWASM-GO-RELAYER): instantiate units actors transitions and kernels [C6-SCP-26-ECONOMIC]` |
| `C6-SCP-26-FILTER` | `contribution_implementation` | `solguard-filter` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 1 | `feat(X-COSMWASM-GO-RELAYER): enforce publication eligibility and review routing [C6-SCP-26-FILTER]` |
| `C6-SCP-26-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-COSMWASM-GO-RELAYER-C1` | `X-COSMWASM-GO-RELAYER-C1` | 1 | `feat(X-COSMWASM-GO-RELAYER): bind compiler parser symbols and spans [C6-SCP-26-FRONTEND]` |
| `C6-SCP-26-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 2 | `feat(X-COSMWASM-GO-RELAYER): provide independent economic oracles [C6-SCP-26-INVARIANT]` |
| `C6-SCP-26-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-COSMWASM-GO-RELAYER-C2` | `X-COSMWASM-GO-RELAYER-C2` | 1 | `feat(X-COSMWASM-GO-RELAYER): emit source-authoritative cfg state calls and effects [C6-SCP-26-LOCAL-IR]` |
| `C6-SCP-26-MODEL` | `contribution_implementation` | `solguard-discover` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 1 | `feat(X-COSMWASM-GO-RELAYER): normalize facts into the shared protocol model [C6-SCP-26-MODEL]` |
| `C6-SCP-26-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-COSMWASM-GO-RELAYER-C0` | `X-COSMWASM-GO-RELAYER-C0` | 0 | `build(X-COSMWASM-GO-RELAYER): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-26-PROFILE]` |
| `C6-SCP-26-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 8 | `test(X-COSMWASM-GO-RELAYER): replay clean-input conformance and negative corpus [C6-SCP-26-REPLAY]` |
| `C6-SCP-26-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 1 | `docs(X-COSMWASM-GO-RELAYER): publish exact scope exclusions and residual debt [C6-SCP-26-SCOPE]` |
| `C6-SCP-26-TRACE` | `contribution_implementation` | `solguard-trace` | `X-COSMWASM-GO-RELAYER-C3` | `X-COSMWASM-GO-RELAYER-C3` | 1 | `feat(X-COSMWASM-GO-RELAYER): bind interprocedural async and atomic provenance [C6-SCP-26-TRACE]` |
| `C6-SCP-26-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 2 | `feat(X-COSMWASM-GO-RELAYER): reopen evidence and verify proof independently [C6-SCP-26-VALIDATE]` |
| `C6-SCP-26-VALUE` | `contribution_implementation` | `solguard-value` | `X-COSMWASM-GO-RELAYER-C4` | `X-COSMWASM-GO-RELAYER-C4` | 2 | `feat(X-COSMWASM-GO-RELAYER): compile obligations and prove signed nonzero deltas [C6-SCP-26-VALUE]` |
| `C6-SCP-27-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 1 | `test(X-NEAR-JS-CLIENT): freeze c0-c4 evidence and c5 candidate [C6-SCP-27-CANDIDATE]` |
| `C6-SCP-27-CORE` | `contribution_implementation` | `solguard-core` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 3 | `feat(X-NEAR-JS-CLIENT): bind canonical candidates and evidence waves [C6-SCP-27-CORE]` |
| `C6-SCP-27-DIFF` | `contribution_implementation` | `solguard-diff` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 2 | `feat(X-NEAR-JS-CLIENT): compare semantic guards units state and effects [C6-SCP-27-DIFF]` |
| `C6-SCP-27-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 1 | `feat(X-NEAR-JS-CLIENT): instantiate units actors transitions and kernels [C6-SCP-27-ECONOMIC]` |
| `C6-SCP-27-FILTER` | `contribution_implementation` | `solguard-filter` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 1 | `feat(X-NEAR-JS-CLIENT): enforce publication eligibility and review routing [C6-SCP-27-FILTER]` |
| `C6-SCP-27-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-NEAR-JS-CLIENT-C1` | `X-NEAR-JS-CLIENT-C1` | 1 | `feat(X-NEAR-JS-CLIENT): bind compiler parser symbols and spans [C6-SCP-27-FRONTEND]` |
| `C6-SCP-27-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 2 | `feat(X-NEAR-JS-CLIENT): provide independent economic oracles [C6-SCP-27-INVARIANT]` |
| `C6-SCP-27-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-NEAR-JS-CLIENT-C2` | `X-NEAR-JS-CLIENT-C2` | 1 | `feat(X-NEAR-JS-CLIENT): emit source-authoritative cfg state calls and effects [C6-SCP-27-LOCAL-IR]` |
| `C6-SCP-27-MODEL` | `contribution_implementation` | `solguard-discover` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 1 | `feat(X-NEAR-JS-CLIENT): normalize facts into the shared protocol model [C6-SCP-27-MODEL]` |
| `C6-SCP-27-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-NEAR-JS-CLIENT-C0` | `X-NEAR-JS-CLIENT-C0` | 0 | `build(X-NEAR-JS-CLIENT): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-27-PROFILE]` |
| `C6-SCP-27-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 8 | `test(X-NEAR-JS-CLIENT): replay clean-input conformance and negative corpus [C6-SCP-27-REPLAY]` |
| `C6-SCP-27-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 1 | `docs(X-NEAR-JS-CLIENT): publish exact scope exclusions and residual debt [C6-SCP-27-SCOPE]` |
| `C6-SCP-27-TRACE` | `contribution_implementation` | `solguard-trace` | `X-NEAR-JS-CLIENT-C3` | `X-NEAR-JS-CLIENT-C3` | 1 | `feat(X-NEAR-JS-CLIENT): bind interprocedural async and atomic provenance [C6-SCP-27-TRACE]` |
| `C6-SCP-27-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 2 | `feat(X-NEAR-JS-CLIENT): reopen evidence and verify proof independently [C6-SCP-27-VALIDATE]` |
| `C6-SCP-27-VALUE` | `contribution_implementation` | `solguard-value` | `X-NEAR-JS-CLIENT-C4` | `X-NEAR-JS-CLIENT-C4` | 2 | `feat(X-NEAR-JS-CLIENT): compile obligations and prove signed nonzero deltas [C6-SCP-27-VALUE]` |
| `C6-SCP-28-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 1 | `test(X-GO-C-FFI): freeze c0-c4 evidence and c5 candidate [C6-SCP-28-CANDIDATE]` |
| `C6-SCP-28-CORE` | `contribution_implementation` | `solguard-core` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 3 | `feat(X-GO-C-FFI): bind canonical candidates and evidence waves [C6-SCP-28-CORE]` |
| `C6-SCP-28-DIFF` | `contribution_implementation` | `solguard-diff` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 2 | `feat(X-GO-C-FFI): compare semantic guards units state and effects [C6-SCP-28-DIFF]` |
| `C6-SCP-28-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 1 | `feat(X-GO-C-FFI): instantiate units actors transitions and kernels [C6-SCP-28-ECONOMIC]` |
| `C6-SCP-28-FILTER` | `contribution_implementation` | `solguard-filter` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 1 | `feat(X-GO-C-FFI): enforce publication eligibility and review routing [C6-SCP-28-FILTER]` |
| `C6-SCP-28-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-GO-C-FFI-C1` | `X-GO-C-FFI-C1` | 1 | `feat(X-GO-C-FFI): bind compiler parser symbols and spans [C6-SCP-28-FRONTEND]` |
| `C6-SCP-28-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 2 | `feat(X-GO-C-FFI): provide independent economic oracles [C6-SCP-28-INVARIANT]` |
| `C6-SCP-28-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-GO-C-FFI-C2` | `X-GO-C-FFI-C2` | 1 | `feat(X-GO-C-FFI): emit source-authoritative cfg state calls and effects [C6-SCP-28-LOCAL-IR]` |
| `C6-SCP-28-MODEL` | `contribution_implementation` | `solguard-discover` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 1 | `feat(X-GO-C-FFI): normalize facts into the shared protocol model [C6-SCP-28-MODEL]` |
| `C6-SCP-28-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-GO-C-FFI-C0` | `X-GO-C-FFI-C0` | 0 | `build(X-GO-C-FFI): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-28-PROFILE]` |
| `C6-SCP-28-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 8 | `test(X-GO-C-FFI): replay clean-input conformance and negative corpus [C6-SCP-28-REPLAY]` |
| `C6-SCP-28-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 1 | `docs(X-GO-C-FFI): publish exact scope exclusions and residual debt [C6-SCP-28-SCOPE]` |
| `C6-SCP-28-TRACE` | `contribution_implementation` | `solguard-trace` | `X-GO-C-FFI-C3` | `X-GO-C-FFI-C3` | 1 | `feat(X-GO-C-FFI): bind interprocedural async and atomic provenance [C6-SCP-28-TRACE]` |
| `C6-SCP-28-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 2 | `feat(X-GO-C-FFI): reopen evidence and verify proof independently [C6-SCP-28-VALIDATE]` |
| `C6-SCP-28-VALUE` | `contribution_implementation` | `solguard-value` | `X-GO-C-FFI-C4` | `X-GO-C-FFI-C4` | 2 | `feat(X-GO-C-FFI): compile obligations and prove signed nonzero deltas [C6-SCP-28-VALUE]` |
| `C6-SCP-29-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 1 | `test(X-GO-CPP-FFI): freeze c0-c4 evidence and c5 candidate [C6-SCP-29-CANDIDATE]` |
| `C6-SCP-29-CORE` | `contribution_implementation` | `solguard-core` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 3 | `feat(X-GO-CPP-FFI): bind canonical candidates and evidence waves [C6-SCP-29-CORE]` |
| `C6-SCP-29-DIFF` | `contribution_implementation` | `solguard-diff` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 2 | `feat(X-GO-CPP-FFI): compare semantic guards units state and effects [C6-SCP-29-DIFF]` |
| `C6-SCP-29-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 1 | `feat(X-GO-CPP-FFI): instantiate units actors transitions and kernels [C6-SCP-29-ECONOMIC]` |
| `C6-SCP-29-FILTER` | `contribution_implementation` | `solguard-filter` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 1 | `feat(X-GO-CPP-FFI): enforce publication eligibility and review routing [C6-SCP-29-FILTER]` |
| `C6-SCP-29-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-GO-CPP-FFI-C1` | `X-GO-CPP-FFI-C1` | 1 | `feat(X-GO-CPP-FFI): bind compiler parser symbols and spans [C6-SCP-29-FRONTEND]` |
| `C6-SCP-29-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 2 | `feat(X-GO-CPP-FFI): provide independent economic oracles [C6-SCP-29-INVARIANT]` |
| `C6-SCP-29-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-GO-CPP-FFI-C2` | `X-GO-CPP-FFI-C2` | 1 | `feat(X-GO-CPP-FFI): emit source-authoritative cfg state calls and effects [C6-SCP-29-LOCAL-IR]` |
| `C6-SCP-29-MODEL` | `contribution_implementation` | `solguard-discover` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 1 | `feat(X-GO-CPP-FFI): normalize facts into the shared protocol model [C6-SCP-29-MODEL]` |
| `C6-SCP-29-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-GO-CPP-FFI-C0` | `X-GO-CPP-FFI-C0` | 0 | `build(X-GO-CPP-FFI): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-29-PROFILE]` |
| `C6-SCP-29-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 8 | `test(X-GO-CPP-FFI): replay clean-input conformance and negative corpus [C6-SCP-29-REPLAY]` |
| `C6-SCP-29-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 1 | `docs(X-GO-CPP-FFI): publish exact scope exclusions and residual debt [C6-SCP-29-SCOPE]` |
| `C6-SCP-29-TRACE` | `contribution_implementation` | `solguard-trace` | `X-GO-CPP-FFI-C3` | `X-GO-CPP-FFI-C3` | 1 | `feat(X-GO-CPP-FFI): bind interprocedural async and atomic provenance [C6-SCP-29-TRACE]` |
| `C6-SCP-29-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 2 | `feat(X-GO-CPP-FFI): reopen evidence and verify proof independently [C6-SCP-29-VALIDATE]` |
| `C6-SCP-29-VALUE` | `contribution_implementation` | `solguard-value` | `X-GO-CPP-FFI-C4` | `X-GO-CPP-FFI-C4` | 2 | `feat(X-GO-CPP-FFI): compile obligations and prove signed nonzero deltas [C6-SCP-29-VALUE]` |
| `C6-SCP-30-CANDIDATE` | `contribution_implementation` | `solguard-deploy` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 1 | `test(X-TS-DATA-SOL-TX): freeze c0-c4 evidence and c5 candidate [C6-SCP-30-CANDIDATE]` |
| `C6-SCP-30-CORE` | `contribution_implementation` | `solguard-core` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 3 | `feat(X-TS-DATA-SOL-TX): bind canonical candidates and evidence waves [C6-SCP-30-CORE]` |
| `C6-SCP-30-DIFF` | `contribution_implementation` | `solguard-diff` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 2 | `feat(X-TS-DATA-SOL-TX): compare semantic guards units state and effects [C6-SCP-30-DIFF]` |
| `C6-SCP-30-ECONOMIC` | `contribution_implementation` | `solguard-economic` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 1 | `feat(X-TS-DATA-SOL-TX): instantiate units actors transitions and kernels [C6-SCP-30-ECONOMIC]` |
| `C6-SCP-30-FILTER` | `contribution_implementation` | `solguard-filter` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 1 | `feat(X-TS-DATA-SOL-TX): enforce publication eligibility and review routing [C6-SCP-30-FILTER]` |
| `C6-SCP-30-FRONTEND` | `contribution_implementation` | `solguard-map` | `X-TS-DATA-SOL-TX-C1` | `X-TS-DATA-SOL-TX-C1` | 1 | `feat(X-TS-DATA-SOL-TX): bind compiler parser symbols and spans [C6-SCP-30-FRONTEND]` |
| `C6-SCP-30-INVARIANT` | `contribution_implementation` | `solguard-invariant` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 2 | `feat(X-TS-DATA-SOL-TX): provide independent economic oracles [C6-SCP-30-INVARIANT]` |
| `C6-SCP-30-LOCAL-IR` | `contribution_implementation` | `solguard-map` | `X-TS-DATA-SOL-TX-C2` | `X-TS-DATA-SOL-TX-C2` | 1 | `feat(X-TS-DATA-SOL-TX): emit source-authoritative cfg state calls and effects [C6-SCP-30-LOCAL-IR]` |
| `C6-SCP-30-MODEL` | `contribution_implementation` | `solguard-discover` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 1 | `feat(X-TS-DATA-SOL-TX): normalize facts into the shared protocol model [C6-SCP-30-MODEL]` |
| `C6-SCP-30-PROFILE` | `contribution_implementation` | `solguard-deploy` | `X-TS-DATA-SOL-TX-C0` | `X-TS-DATA-SOL-TX-C0` | 0 | `build(X-TS-DATA-SOL-TX): preregister scope manifest and pin exact toolchain framework and image digests [C6-SCP-30-PROFILE]` |
| `C6-SCP-30-REPLAY` | `contribution_implementation` | `solguard-deploy` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 8 | `test(X-TS-DATA-SOL-TX): replay clean-input conformance and negative corpus [C6-SCP-30-REPLAY]` |
| `C6-SCP-30-SCOPE` | `contribution_implementation` | `solguard-docs` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 1 | `docs(X-TS-DATA-SOL-TX): publish exact scope exclusions and residual debt [C6-SCP-30-SCOPE]` |
| `C6-SCP-30-TRACE` | `contribution_implementation` | `solguard-trace` | `X-TS-DATA-SOL-TX-C3` | `X-TS-DATA-SOL-TX-C3` | 1 | `feat(X-TS-DATA-SOL-TX): bind interprocedural async and atomic provenance [C6-SCP-30-TRACE]` |
| `C6-SCP-30-VALIDATE` | `contribution_implementation` | `solguard-validate` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 2 | `feat(X-TS-DATA-SOL-TX): reopen evidence and verify proof independently [C6-SCP-30-VALIDATE]` |
| `C6-SCP-30-VALUE` | `contribution_implementation` | `solguard-value` | `X-TS-DATA-SOL-TX-C4` | `X-TS-DATA-SOL-TX-C4` | 2 | `feat(X-TS-DATA-SOL-TX): compile obligations and prove signed nonzero deltas [C6-SCP-30-VALUE]` |
| `C6-SOL-01` | `contribution_implementation` | `solguard-map` | `LANG-SOL-01-INTEGRATION` | `LANG-SOL-01` | 0 | `feat(solidity): build compiler-aware semantic frontend [C6-SOL-01]` |
| `C6-SOL-02` | `contribution_implementation` | `solguard-map` | `LANG-SOL-02-INTEGRATION` | `LANG-SOL-02` | 1 | `feat(solidity): resolve storage inheritance proxies and abi [C6-SOL-02]` |
| `C6-SOL-03` | `contribution_implementation` | `solguard-trace` | `LANG-SOL-02-INTEGRATION` | `LANG-SOL-02` | 1 | `feat(solidity): bind evm calls logs storage and reverts [C6-SOL-03]` |
| `C6-SOL-04` | `contribution_implementation` | `solguard-discover` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 1 | `feat(solidity): normalize protocol facts for common economic kernels [C6-SOL-04]` |
| `C6-SOL-04A` | `contribution_implementation` | `solguard-economic` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 1 | `feat(solidity): model units transitions and actor deltas [C6-SOL-04A]` |
| `C6-SOL-05` | `contribution_implementation` | `solguard-invariant` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 1 | `feat(solidity): add independent defi invariant pack [C6-SOL-05]` |
| `C6-SOL-05A` | `contribution_implementation` | `solguard-value` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 1 | `feat(solidity): prove signed economic deltas with native numeric domains [C6-SOL-05A]` |
| `C6-SOL-06` | `contribution_implementation` | `solguard-diff` | `LANG-SOL-04-INTEGRATION` | `LANG-SOL-04` | 1 | `feat(solidity): compare abi storage guards units and proxies [C6-SOL-06]` |
| `C6-SOL-07` | `contribution_implementation` | `solguard-deploy` | `LANG-SOL-04-INTEGRATION` | `LANG-SOL-04` | 1 | `test(solidity): replay compiler and semantic diffs [C6-SOL-07]` |
| `C6-SOL-08` | `contribution_implementation` | `solguard-validate` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 2 | `feat(solidity): validate proxy callback oracle and accounting paths [C6-SOL-08]` |
| `C6-SOL-09` | `contribution_implementation` | `solguard-filter` | `LANG-SOL-03-INTEGRATION` | `LANG-SOL-03` | 1 | `feat(solidity): calibrate admission on safe near-misses [C6-SOL-09]` |
| `C6-SOL-10` | `contribution_implementation` | `solguard-deploy` | `LANG-SOL-05-INTEGRATION` | `LANG-SOL-05` | 1 | `test(solidity): qualify c0 through c4 and freeze c5 candidate [C6-SOL-10]` |
| `C6-SOL-11` | `contribution_implementation` | `solguard-docs` | `LANG-SOL-05-INTEGRATION` | `LANG-SOL-05` | 1 | `docs(solidity): publish candidate scope and exclusions [C6-SOL-11]` |
| `C6-TS-01` | `contribution_implementation` | `solguard-map` | `LANG-TS-01-INTEGRATION` | `LANG-TS-01` | 0 | `feat(typescript): build tsconfig and declaration-aware frontend [C6-TS-01]` |
| `C6-TS-02` | `contribution_implementation` | `solguard-map` | `LANG-TS-01-INTEGRATION` | `LANG-TS-01` | 1 | `feat(typescript): model erasure narrowing generics and numbers [C6-TS-02]` |
| `C6-TS-03` | `contribution_implementation` | `solguard-trace` | `LANG-TS-01-INTEGRATION` | `LANG-TS-01` | 1 | `feat(typescript): bind emitted javascript to source semantics [C6-TS-03]` |
| `C6-TS-04` | `contribution_implementation` | `solguard-discover` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): normalize erased runtime numeric and state facts [C6-TS-04]` |
| `C6-TS-04A` | `contribution_implementation` | `solguard-economic` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): model erasure precision retry and actor deltas [C6-TS-04A]` |
| `C6-TS-05` | `contribution_implementation` | `solguard-invariant` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): add independent precision and state invariants [C6-TS-05]` |
| `C6-TS-05A` | `contribution_implementation` | `solguard-value` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): prove signed deltas across declared and runtime domains [C6-TS-05A]` |
| `C6-TS-06` | `contribution_implementation` | `solguard-validate` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): validate erasure async and boundary paths [C6-TS-06]` |
| `C6-TS-07` | `contribution_implementation` | `solguard-filter` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): calibrate admission across compiler modes [C6-TS-07]` |
| `C6-TS-07A` | `contribution_implementation` | `solguard-diff` | `LANG-TS-02-INTEGRATION` | `LANG-TS-02` | 1 | `feat(typescript): compare declarations output guards and numeric effects [C6-TS-07A]` |
| `C6-TS-08` | `contribution_implementation` | `solguard-deploy` | `LANG-TS-03-INTEGRATION` | `LANG-TS-03` | 1 | `test(typescript): qualify c0 through c4 and freeze c5 candidate [C6-TS-08]` |
| `C6-TS-09` | `contribution_implementation` | `solguard-docs` | `LANG-TS-03-INTEGRATION` | `LANG-TS-03` | 1 | `docs(typescript): publish candidate compiler scope [C6-TS-09]` |
| `C6-VYP-01` | `contribution_implementation` | `solguard-map` | `LANG-VYP-01-INTEGRATION` | `LANG-VYP-01` | 0 | `feat(vyper): build versioned semantic frontend [C6-VYP-01]` |
| `C6-VYP-02` | `contribution_implementation` | `solguard-map` | `LANG-VYP-01-INTEGRATION` | `LANG-VYP-01` | 1 | `feat(vyper): model storage interfaces and decimal semantics [C6-VYP-02]` |
| `C6-VYP-03` | `contribution_implementation` | `solguard-trace` | `LANG-VYP-03-INTEGRATION` | `LANG-VYP-03` | 1 | `feat(vyper): bind evm observations to vyper source [C6-VYP-03]` |
| `C6-VYP-04` | `contribution_implementation` | `solguard-discover` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `feat(vyper): normalize protocol facts for common economic kernels [C6-VYP-04]` |
| `C6-VYP-04A` | `contribution_implementation` | `solguard-economic` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `feat(vyper): model units transitions callbacks and actor deltas [C6-VYP-04A]` |
| `C6-VYP-05` | `contribution_implementation` | `solguard-invariant` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `feat(vyper): add independent accounting invariant pack [C6-VYP-05]` |
| `C6-VYP-05A` | `contribution_implementation` | `solguard-value` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `feat(vyper): prove signed deltas under decimal and integer semantics [C6-VYP-05A]` |
| `C6-VYP-06` | `contribution_implementation` | `solguard-validate` | `LANG-VYP-02-INTEGRATION` | `LANG-VYP-02` | 1 | `feat(vyper): validate external call and arithmetic paths [C6-VYP-06]` |
| `C6-VYP-07` | `contribution_implementation` | `solguard-filter` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 2 | `feat(vyper): calibrate admission on safe near-misses [C6-VYP-07]` |
| `C6-VYP-07A` | `contribution_implementation` | `solguard-diff` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `feat(vyper): compare storage guards units interfaces and compiler modes [C6-VYP-07A]` |
| `C6-VYP-08` | `contribution_implementation` | `solguard-deploy` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `test(vyper): qualify c0 through c4 and freeze c5 candidate [C6-VYP-08]` |
| `C6-VYP-09` | `contribution_implementation` | `solguard-docs` | `LANG-VYP-04-INTEGRATION` | `LANG-VYP-04` | 1 | `docs(vyper): publish candidate scope and exclusions [C6-VYP-09]` |
| `C6-X-01` | `contribution_implementation` | `solguard-map` | `LANG-X-01-INTEGRATION` | `LANG-X-01` | 0 | `feat(polyglot): link abi ffi rpc and serialization identities [C6-X-01]` |
| `C6-X-02` | `contribution_implementation` | `solguard-trace` | `LANG-X-02-INTEGRATION` | `LANG-X-02` | 1 | `feat(polyglot): propagate causal context across boundaries [C6-X-02]` |
| `C6-X-03` | `contribution_implementation` | `solguard-economic` | `LANG-X-03-INTEGRATION` | `LANG-X-03` | 1 | `feat(polyglot): preserve units across component boundaries [C6-X-03]` |
| `C6-X-04` | `contribution_implementation` | `solguard-discover` | `LANG-X-03-INTEGRATION` | `LANG-X-03` | 1 | `feat(polyglot): compose normalized cross-component protocol facts [C6-X-04]` |
| `C6-X-05` | `contribution_implementation` | `solguard-invariant` | `LANG-X-03-INTEGRATION` | `LANG-X-03` | 1 | `feat(polyglot): evaluate end-to-end conservation laws [C6-X-05]` |
| `C6-X-06` | `contribution_implementation` | `solguard-value` | `LANG-X-03-INTEGRATION` | `LANG-X-03` | 1 | `feat(polyglot): prove signed deltas across component and unit domains [C6-X-06]` |
| `C6-X-07` | `contribution_implementation` | `solguard-validate` | `LANG-X-04-INTEGRATION` | `LANG-X-04` | 1 | `feat(polyglot): reopen and verify every cross-component proof edge [C6-X-07]` |
| `C6-X-08` | `contribution_implementation` | `solguard-filter` | `LANG-X-04-INTEGRATION` | `LANG-X-04` | 1 | `feat(polyglot): admit only complete eligible cross-boundary findings [C6-X-08]` |
| `C6-X-09` | `contribution_implementation` | `solguard-diff` | `LANG-X-04-INTEGRATION` | `LANG-X-04` | 1 | `feat(polyglot): compare boundary identity units guards and effects [C6-X-09]` |
| `C6-X-10` | `contribution_implementation` | `solguard-deploy` | `LANG-X-04-INTEGRATION` | `LANG-X-04` | 1 | `test(polyglot): qualify abi ffi rpc serialization bridge and oracle slices [C6-X-10]` |
| `C6-X-11` | `contribution_implementation` | `solguard-docs` | `LANG-X-04-INTEGRATION` | `LANG-X-04` | 1 | `docs(polyglot): publish candidate boundaries and exclusions [C6-X-11]` |
| `C7-001` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 0 | `feat(measurement): publish campaign truth match adjudication metric report corpus contamination and dossier schemas with writers off [C7-001]` |
| `C7-001A` | `contribution_implementation` | `solguard-agents` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(claim-reader): validate evaluator output against preregistered ledger claim IDs [C7-001A]` |
| `C7-001B` | `contribution_implementation` | `solguard-docs` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(measurement-reader): render reports certifications and dossier by schema and role [C7-001B]` |
| `C7-001C` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(measurement-readers): verify custodian operator evaluator docs and release packages [C7-001C]` |
| `C7-001D` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(bounty-vertical-schema): publish preregistration pair-seal replica aggregate chaos live and claim contracts with writers off [C7-001D]` |
| `C7-001E` | `contribution_implementation` | `solguard-agents` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(bounty-vertical-policy): dispatch only exact profile scope pair frame and wording bindings [C7-001E]` |
| `C7-001F` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(bounty-vertical-contract): reject global singleton reuse cross-profile roots posthoc downgrade and missing operand [C7-001F]` |
| `C7-001G` | `contribution_implementation` | `solguard-agents` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(timestamp-contract): register rfc3161 transparency-log and quorum receipt union [C7-001G]` |
| `C7-001H` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(timestamp-contract): reject nonce replay stale revoked split-view bad inclusion consistency and single-authority receipts [C7-001H]` |
| `C7-001I` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(resource-workload-schema): publish candidate resource profile workload metrics and provenance contracts with writers off [C7-001I]` |
| `C7-002` | `contribution_implementation` | `solguard-database` | `MEASURE-901` | `MEASURE-901` | 2 | `feat(measurement-reader): consume campaign truth corpus contamination match adjudication metric-provenance and measurement-report contracts [C7-002]` |
| `C7-002A` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(measurement-contract): verify old-new and synthetic new-new for every persisted contract [C7-002A]` |
| `C7-002B` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(custodian-reader): validate campaign corpus contamination and truth contracts with every writer off [C7-002B]` |
| `C7-002C` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(operator-reader): validate sealed campaign and execution authority with every writer off [C7-002C]` |
| `C7-002D` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(holdout-reader): validate campaign corpus and contamination inputs with every writer off [C7-002D]` |
| `C7-002E` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(novelty-reader): validate campaign corpus contamination and truth inputs with every writer off [C7-002E]` |
| `C7-002F` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(evaluator-reader): validate campaign truth corpus contamination and product artifact manifests with every writer off [C7-002F]` |
| `C7-002G` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(known-reader): validate corpus truth and match contracts with every writer off [C7-002G]` |
| `C7-002H` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(release-verifier-reader): validate reports language certifications dossier and attestations with every writer off [C7-002H]` |
| `C7-002I` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(measurement-prewriter): run every role reader against old synthetic and invalid fixtures before activation [C7-002I]` |
| `C7-002J` | `contribution_implementation` | `solguard-deploy` | `VALIDATION-CAP-900` | `VALIDATION-CAP-900` | 0 | `feat(validation-runner): implement typed prefreeze validation manifests and terminal suite runner [C7-002J]` |
| `C7-002K` | `contribution_implementation` | `solguard-deploy` | `VALIDATION-CAP-900` | `VALIDATION-CAP-900` | 1 | `test(validation-runner): reject candidate drift missing denominator stale event and synthetic bom input [C7-002K]` |
| `C7-002L` | `contribution_implementation` | `solguard-deploy` | `VALIDATION-CAP-900` | `VALIDATION-CAP-900` | 1 | `feat(chaos-runner): implement frozen global and bounty-vertical chaos manifests injections and terminal emitters [C7-002L]` |
| `C7-002M` | `contribution_implementation` | `solguard-deploy` | `VALIDATION-CAP-900` | `VALIDATION-CAP-900` | 1 | `test(chaos-runner): reject missing failures source-run drift cross-profile reuse and mutated campaign inputs [C7-002M]` |
| `C7-002N` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `feat(bounty-vertical-reader): validate profile pair-seal replica chaos live and claim artifacts with writers off [C7-002N]` |
| `C7-002O` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(bounty-vertical-reader): exercise valid tampered future and global-reuse fixtures across every consumer [C7-002O]` |
| `C7-002P` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 2 | `feat(workload-evaluator): compute burdens and resource rates per target scope origin profile and cohort [C7-002P]` |
| `C7-002Q` | `contribution_implementation` | `solguard-deploy` | `MEASURE-901` | `MEASURE-901` | 1 | `test(workload-antigaming): reject hidden queues profile cache reuse omitted failures and resource truncation [C7-002Q]` |
| `C7-003` | `contribution_implementation` | `solguard-database` | `DB-CAP-902` | `DB-CAP-902` | 0 | `feat(database-cutover): implement create-once bootstrap legacy freeze and receipt tooling with operational writes off [C7-003]` |
| `C7-003A` | `contribution_implementation` | `solguard-database` | `DB-CAP-902` | `DB-CAP-902` | 1 | `feat(migration): implement classified migration shadow and reconciliation tooling with writes off [C7-003A]` |
| `C7-003B` | `contribution_implementation` | `solguard-deploy` | `DB-CAP-902` | `DB-CAP-902` | 1 | `test(migration): verify shadow equivalence restore zero-writer and partial-failure receipts [C7-003B]` |
| `C7-003C` | `contribution_implementation` | `solguard-database` | `DB-CAP-902` | `DB-CAP-902` | 1 | `feat(cutover): implement one-shot authority switch and stale-writer guard with activation off [C7-003C]` |
| `C7-003D` | `contribution_implementation` | `solguard-database` | `DB-CAP-902` | `DB-CAP-902` | 1 | `test(legacy-retention): prove benckmarks sqlite retention read-only and reject downgrade [C7-003D]` |
| `C7-004` | `contribution_implementation` | `solguard-deploy` | `SCOPE-CAP-900` | `SCOPE-CAP-900` | 1 | `feat(scope): implement detection-only dependency closure verifier [C7-004]` |
| `C7-005` | `contribution_implementation` | `solguard-deploy` | `BOM-CAP-903` | `BOM-CAP-903` | 1 | `build(release): implement reproducible runtime bom tcb and provenance emitters [C7-005]` |
| `C7-006` | `contribution_implementation` | `solguard-deploy` | `ISO-CAP-904` | `ISO-CAP-904` | 1 | `feat(ceremony): implement sealed one-shot campaign runner [C7-006]` |
| `C7-007` | `contribution_implementation` | `solguard-deploy` | `CORPUS-CAP-905` | `CORPUS-CAP-905` | 0 | `feat(corpus-writer): implement signed corpus truth and contamination emitters with operational writes off [C7-007]` |
| `C7-007A` | `contribution_implementation` | `solguard-deploy` | `CORPUS-CAP-905` | `CORPUS-CAP-905` | 1 | `test(corpus-new-new): feed signed and tampered corpus truth and contamination outputs to every declared consumer [C7-007A]` |
| `C7-008` | `contribution_implementation` | `solguard-deploy` | `HOLDOUT-CAP-906` | `HOLDOUT-CAP-906` | 0 | `feat(holdout-writer): implement h-gen pair manifest and opaque-bundle emitters with operational writes off [C7-008]` |
| `C7-008A` | `contribution_implementation` | `solguard-deploy` | `HOLDOUT-CAP-906` | `HOLDOUT-CAP-906` | 1 | `test(holdout-new-new): feed both campaign manifests opaque commitments exclusions and tampered variants to every consumer [C7-008A]` |
| `C7-008B` | `contribution_implementation` | `solguard-deploy` | `HOLDOUT-CAP-906` | `HOLDOUT-CAP-906` | 1 | `feat(bounty-vertical-hgen): implement profile-bound pair seal and separate A B replica emitters with writes off [C7-008B]` |
| `C7-008C` | `contribution_implementation` | `solguard-deploy` | `HOLDOUT-CAP-906` | `HOLDOUT-CAP-906` | 1 | `test(bounty-vertical-hgen): reject singleton global c5 reuse pair mismatch retuning and same-lineage replicas [C7-008C]` |
| `C7-009` | `contribution_implementation` | `solguard-deploy` | `NOVEL-CAP-907` | `NOVEL-CAP-907` | 0 | `feat(novelty-writer): implement h-novel pair manifests and verifier inputs with operational writes off [C7-009]` |
| `C7-009A` | `contribution_implementation` | `solguard-deploy` | `NOVEL-CAP-907` | `NOVEL-CAP-907` | 1 | `test(novelty-new-new): feed both campaign manifests novelty authorities contamination events truth reveal and rejection paths to every consumer [C7-009A]` |
| `C7-009B` | `contribution_implementation` | `solguard-deploy` | `NOVEL-CAP-907` | `NOVEL-CAP-907` | 1 | `feat(bounty-vertical-hnovel): implement profile-bound novel pair seal and separate A B replica emitters with writes off [C7-009B]` |
| `C7-009C` | `contribution_implementation` | `solguard-deploy` | `NOVEL-CAP-907` | `NOVEL-CAP-907` | 1 | `test(bounty-vertical-hnovel): reject known-only substitution posthoc novelty global reuse and pair drift [C7-009C]` |
| `C7-010` | `contribution_implementation` | `solguard-deploy` | `EVAL-908` | `EVAL-908` | 0 | `feat(evaluation-writer): implement reveal match provenance report and dossier emitters with campaign writes off [C7-010]` |
| `C7-010A` | `contribution_implementation` | `solguard-deploy` | `EVAL-908` | `EVAL-908` | 1 | `test(evaluation-new-new): feed signed and tampered evaluator outputs to database docs agents and release verifier [C7-010A]` |
| `C7-010B` | `contribution_implementation` | `solguard-deploy` | `EVAL-908` | `EVAL-908` | 1 | `feat(bounty-vertical-evaluator): implement separate hgen hnovel replica acceptance and derived aggregate receipts [C7-010B]` |
| `C7-010C` | `contribution_implementation` | `solguard-deploy` | `EVAL-908` | `EVAL-908` | 1 | `test(bounty-vertical-evaluator): reject missing replica cross-campaign evidence double-count and claim wording expansion [C7-010C]` |
| `C7-011` | `contribution_implementation` | `solguard-deploy` | `EVAL-908` | `EVAL-908` | 1 | `feat(evaluator-review): implement isolated terminal adjudication workflow [C7-011]` |
| `C7-012` | `contribution_implementation` | `solguard-agents` | `ISO-CAP-904` | `ISO-CAP-904` | 1 | `docs(ceremony): separate human custodian operator and adjudicator [C7-012]` |
| `C7-013` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 0 | `feat(live-writer): implement authorized live manifest and fixed-frame runner with operational execution off [C7-013]` |
| `C7-013A` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 1 | `test(live-new-new): reject missing expired revoked stale target action and rate authorization drift [C7-013A]` |
| `C7-013B` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 1 | `feat(live-evaluation): bind live attempts policy openings subject assessments confirmation and materiality into append-only outputs [C7-013B]` |
| `C7-013C` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 1 | `test(live-evaluation): reject pre-live report reuse root drift post-hoc severity and missing attempts [C7-013C]` |
| `C7-013D` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 1 | `feat(bounty-vertical-live): implement profile-bound sol-evm-defi authorization runner confirmation and report path [C7-013D]` |
| `C7-013E` | `contribution_implementation` | `solguard-deploy` | `LIVE-CAP-913` | `LIVE-CAP-913` | 1 | `test(bounty-vertical-live): reject global reuse wrong scope stale auth nonmaterial confirmation and missing attempt [C7-013E]` |
| `C7-014A` | `contribution_implementation` | `solguard-deploy` | `CANARY-CAP-909` | `CANARY-CAP-909` | 0 | `test(canary): implement vertical-slice evaluator [C7-014A]` |
| `C7-014B` | `contribution_implementation` | `solguard-deploy` | `KNOWN-CAP-910` | `KNOWN-CAP-910` | 0 | `test(known): implement signed canonical regression evaluator [C7-014B]` |
| `C7-015` | `contribution_implementation` | `solguard-deploy` | `SCOPE-CAP-900` | `SCOPE-CAP-900` | 1 | `test(closure): prove scanner cannot import or reach evaluator truth and adjudication review [C7-015]` |
| `C7-015A` | `contribution_implementation` | `solguard-agents` | `FINAL-002-CAP` | `FINAL-002-CAP` | 0 | `feat(dossier-validator): implement read-only graph link schema ledger and dossier validator [C7-015A]` |
| `C7-015B` | `contribution_implementation` | `solguard-agents` | `FINAL-002-CAP` | `FINAL-002-CAP` | 1 | `test(dossier-validator): reject graph link schema signature root replay and tamper failures [C7-015B]` |
| `C7-016` | `contribution_implementation` | `solguard-deploy` | `FINAL-003-CAP` | `FINAL-003-CAP` | 0 | `feat(release-verifier): implement independent ledger and dossier reproduction before freeze [C7-016]` |
| `C7-016A` | `contribution_implementation` | `solguard-deploy` | `FINAL-003-CAP` | `FINAL-003-CAP` | 1 | `feat(tag-realization): implement frozen-plan signed local and canonical-remote nonforce publisher with writes off [C7-016A]` |
| `C7-016B` | `contribution_implementation` | `solguard-deploy` | `FINAL-003-CAP` | `FINAL-003-CAP` | 1 | `test(tag-realization): reject preexisting local remote backdated local-only moved recreated force partial and wrong-target tags [C7-016B]` |
| `C7-016C` | `contribution_implementation` | `solguard-deploy` | `FINAL-003-CAP` | `FINAL-003-CAP` | 1 | `feat(release-transparency): implement dsse tag receipt terminal dossier and post-promotion binding [C7-016C]` |

Registry cerrado: **653** filas explícitas de `06` + **450** expansiones C6 (30 scopes × 15 sufijos) = **1103 contributions**.

### 16.5 Política, materialidad, autorización y timestamps

- Único commitment: `policy_commitment_scheme=solguard-policy-set-commitment.v1`; salt CSPRNG 32 bytes, target index y membership proof bottom-up. Alternate/legacy scheme falla.
- `TargetPolicyOpeningSet` y `FindingMaterialityAssessmentSet` son sets distintos. Cada entry del dossier referencia `artifact_id + JSON Pointer`, role schema digest, content digest y locator.
- `solguard-live-authorization.v1` exige artifact/content/root, issuer authority chain, trust policy, ownership binding e independent attestor además de issuer/subject/target/ventana/actions/rate/status/revocation. Se verifica antes de cada intento.
- `solguard-external-timestamp-receipt.v1` exige base + RFC3161/transparency union, trust policy y quorum 2-of-2 para freeze, commitments, output seals, reveal, DSSE/tags y promotion.
