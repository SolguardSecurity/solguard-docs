# Veredictos, admisión, métricas y defaults v1

## Estado de esta publicación

C1-018 documenta la cadena preparada de verdad de `TRUTH-108`. Su estado de
dependencias es `prepared_drafts_pending_independent_acceptance`: no acepta
ninguna contribución y no activa writers. No cierra `TRUTH-108` y no establece capacidad medida.
Los ejemplos de esta página son fixtures contractuales, no resultados de una
ejecución real.

Las dos dependencias directas se reabren por identidad inmutable:

- C1-016: `solguard-deploy@8d8e1e432989ceb697e9beaa54cd1fc2973856ad`,
  árbol `0787487bf8a7ea52fdfc2b643144352ea461129a` y evidence root
  `sha256:3adb7498fd95ee04ee4217297fe02dbd761c8240ae955e8d3f5c610d6f822b7c`.
- C1-017: `solguard-agents@2986e2e73ef9be1c41e35e65a232f36ff2fab0f3`,
  árbol `0efa887690ff041259a42af5da041f2a1f5929d7` y evidence root
  `sha256:28b107a47bf12cf8471e9133bc8244045feb6e4d6017ac0bdf67d3bcf9decea7`.

El contrato comprobable de esta página vive en
`changelogs/25-26-jul-2026/tasks/readers/truth-docs-contract.v1.json`. Es una
vista documental `authoritative=false`, `writer_enabled=false`,
`acceptance_enabled=false` y `measured_capability=null`.

## TechnicalVerdict: verdad técnica de VALIDATE

`solguard-technical-verdict.v1` pertenece a VALIDATE. La fuente exacta es
`solguard-validate@af485547440e63042b3ee696b0eb92bca63055b6`, árbol
`b8a0a5711a5b2ebf235128ae13b57dc2e5eb580f`, ruta
`schemas/technical-verdict.v1.schema.json` y SHA-256
`50090bef6e5b0e26a45b80eb8c9d6c61d4f8c892b16fae06e4ff5145c0a078be`.
El schema fue publicado reader-first con su writer desactivado.

Las únicas decisiones son `supported`, `refuted` e `inconclusive`:

| Decisión | Condición cerrada | Reason codes permitidos |
| --- | --- | --- |
| `supported` | Proof `complete` y ninguna obligación `refuted` o `unresolved`. | `supported_complete_economic_break`, `supported_complete_non_economic_break` |
| `refuted` | Proof `complete` y al menos una obligación `refuted`. | `refuted_route_unreachable`, `refuted_invariant_holds`, `refuted_effect_absent`, `refuted_effective_protection` |
| `inconclusive` | Al menos una obligación `unresolved`; un proof parcial, inválido o ausente nunca se promociona. | `inconclusive_scope_unresolved`, `inconclusive_reachability_unresolved`, `inconclusive_state_transition_unresolved`, `inconclusive_invariant_unresolved`, `inconclusive_contradiction_unresolved`, `inconclusive_effect_unresolved`, `inconclusive_economic_delta_unresolved`, `inconclusive_same_flow_unresolved`, `inconclusive_same_asset_unresolved`, `inconclusive_protection_analysis_unresolved`, `inconclusive_evidence_lineage_unresolved`, `inconclusive_coverage_debt`, `inconclusive_counterevidence_unresolved`, `inconclusive_run_binding_unresolved`, `inconclusive_proof_certificate_incomplete`, `inconclusive_legacy_contract_unresolved` |

Cada verdict evalúa exactamente 14 obligaciones, en este orden:
`scope`, `reachability`, `state_transition`, `invariant`, `contradiction`,
`effect`, `economic_delta`, `same_flow`, `same_asset`,
`protection_analysis`, `evidence_lineage`, `coverage`, `counterevidence` y
`run_binding`. Sus estados cerrados son `satisfied`, `refuted`, `unresolved` y
`not_applicable`. Una claim económica exige identidad de flow/asset/unit; una
claim no económica mantiene `economic_delta=not_applicable`.

Los goldens publicados fijan tres cortes representativos:

| Fixture | Decisión | Motivo primario | Proof |
| --- | --- | --- | --- |
| `supported-economic.valid.json` | `supported` | `supported_complete_economic_break` | `complete` |
| `refuted-protection.valid.json` | `refuted` | `refuted_effective_protection` | `complete` |
| `inconclusive-missing-proof.valid.json` | `inconclusive` | `inconclusive_proof_certificate_incomplete` | `missing` |

FILTER, dedupe, ranking y presentación pueden referenciar estos bytes, pero no
reescribir su decisión, reason code, causal identity, proof u obligaciones.

## AdmissionResult: admisión y presentación de FILTER

`solguard-admission-result.v1` pertenece a FILTER. La fuente exacta es
`solguard-filter@22a08ca01ac027127e9b1cfd14a7c82d0a2ce0d5`, árbol
`4dc55518305277b0e82ec267d02fd9276453f6d0`, ruta
`schemas/admission-result.v1.schema.json` y SHA-256
`f13ef0f47c06654bddc49b83342f8069a7681b97c50d521d30799362bd94e1ec`.
Su writer también permanece desactivado.

Las decisiones cerradas son `pass`, `review`, `reject` e `invalid_upstream`:

| Decisión | Binding técnico y estado | Reason codes permitidos |
| --- | --- | --- |
| `pass` | Technical status `valid`, verdict `supported`, checker `passed` y evidencia `complete`. | `pass_complete_admission` |
| `review` | Technical status `valid`, verdict `supported`, checker `missing` o `inconclusive`, evidencia `incomplete` y publicación `ineligible`. | `review_checker_missing`, `review_proof_inconclusive`, `review_probe_required`, `review_trace_authority_incomplete` |
| `reject` | Technical status `valid`, verdict `supported`, checker y evidencia `contradicted`, publicación `ineligible`. | `reject_semantic_contradiction`, `reject_effective_protection`, `reject_tampered_input`, `reject_unsafe_source_reference`, `reject_proven_duplicate` |
| `invalid_upstream` | Technical status `invalid`, checker/evidencia `invalid`, verdict ID y decisión nulos, publicación `ineligible`. | `invalid_upstream_technical_verdict`, `invalid_upstream_contract_mismatch` |

Los estados de checker son `passed`, `contradicted`, `inconclusive`, `missing`
e `invalid`. Los estados de evidencia son `complete`, `incomplete`,
`contradicted` e `invalid`. La elegibilidad es `eligible|ineligible`; sus
motivos cerrados son `admission_not_pass`, `duplicate_non_representative`,
`policy_suppression`, `policy_exclusion` e `invalid_upstream`.

La presentación usa `unique`, `representative` o `duplicate`. `duplicate` no
es una decisión de `AdmissionResult`: es un `presentation_role`. Un duplicate
requiere padre canónico y queda ineligible con
`duplicate_non_representative`. Del mismo modo, `pass` no debe confundirse con
publicación automática: la elegibilidad y el rol de presentación siguen siendo
campos separados.

Los goldens fijan estas combinaciones sin cambiar el verdict técnico:

| Fixture | Admission | TechnicalVerdict | Checker | Evidencia | Elegibilidad | Rol |
| --- | --- | --- | --- | --- | --- | --- |
| `pass-unique.valid.json` | `pass` | `supported` | `passed` | `complete` | `eligible` | `unique` |
| `review-checker-missing.valid.json` | `review` | `supported` | `missing` | `incomplete` | `ineligible` | `unique` |
| `reject-protection.valid.json` | `reject` | `supported` | `contradicted` | `contradicted` | `ineligible` | `unique` |
| `invalid-upstream.valid.json` | `invalid_upstream` | `null` | `invalid` | `invalid` | `ineligible` | `unique` |

En la cadena preparada, FILTER solo recibe el conjunto exacto de verdicts
`supported`. Un `refuted` o `inconclusive` no se transforma en AdmissionResult,
review ni finding. Si FILTER falla antes de producir un set válido, Core no
sintetiza resultados ni inicia EXPLOIT.

## Linaje de métricas sin oráculo

El mapa `solguard-oracle-free-metric-lineage-map.v1` está fijado a
`solguard-deploy@f934991f041de4c8d71b8d7c07aa0930506e293f`, árbol
`27c6e0d5d78988aa25ae2fc4a199de840983b0c0` y evidence root
`sha256:92a1c96471e8167e4c1530ed0791e2212ca52aa257fad98f0b4916b4fccd736c`.
El checker es `solguard-oracle-free-metric-lineage-check.v1`. La autoridad de
publicación futura es `MEASURE-901`, la de writer runtime futuro es `EVAL-908`,
pero `writer_enabled=false` y `post_scan_contract_emission=false`.

Las métricas de verdad y publicación quedan cerradas así:

| Métrica | Artefacto primario | Derivación | Denominador | Autoridad actual |
| --- | --- | --- | --- | --- |
| `canonical_candidates` | `canonical_candidates.json` | `array_length` | `null` | `oracle_free_primary` |
| `validation_candidates` | `tool-outputs/candidates/validation_candidates.json` | `array_length` | `canonical_candidates` | `oracle_free_primary` |
| `supported` | `tool-outputs/validate/validation_results.json` | `count:result=supported` | `validation_candidates` | `oracle_free_primary` |
| `refuted` | `tool-outputs/validate/validation_results.json` | `count:result=refuted` | `validation_candidates` | `oracle_free_primary` |
| `inconclusive` | `tool-outputs/validate/validation_results.json` | `count:result=inconclusive` | `validation_candidates` | `oracle_free_primary` |
| `supported_findings` | `tool-outputs/validate/validation_results.json` | `count:finding_class=supported_finding` | `validation_candidates` | `oracle_free_primary` |
| `validation_review_queue` | `tool-outputs/validate/validation_results.json` | `count:finding_class=review_queue` | `validation_candidates` | `oracle_free_primary` |
| `validation_reviewable_leads` | `tool-outputs/validate/validation_results.json` | `count:finding_class=reviewable_lead` | `validation_candidates` | `oracle_free_primary` |
| `validation_non_findings` | `tool-outputs/validate/validation_results.json` | `count:finding_class=non_finding` | `validation_candidates` | `oracle_free_primary` |
| `admission_input_supported` | `tool-outputs/filter/filter_results.json` | `array_length` | `supported` | `oracle_free_primary` |
| `admission_pass` | `tool-outputs/filter/filter_results.json` | `count:decision=pass` | `admission_input_supported` | `oracle_free_primary` |
| `admission_review` | `tool-outputs/filter/filter_results.json` | `count:decision=review` | `admission_input_supported` | `oracle_free_primary` |
| `admission_reject` | `tool-outputs/filter/filter_results.json` | `count:decision=reject` | `admission_input_supported` | `oracle_free_primary` |
| `admission_duplicate` | `tool-outputs/filter/filter_results.json` | `count:decision=duplicate` | `admission_input_supported` | `legacy_filter_runtime_only` |
| `finding_envelopes_all` | `finding_envelopes.json` | `array_length` | `null` | `runtime_writer_disabled` |
| `published_findings` | `findings.json` | `array_length` | `finding_envelopes_all` | `runtime_writer_disabled` |
| `review_envelopes` | `review_queue.json` | `array_length` | `null` | `runtime_writer_disabled` |
| `matched_findings` | `match decisions` | `count:decision=matched` | `predeclared_scoreable_truth_items` | `post_scan_excluded` |

`admission_duplicate` conserva una métrica del runtime legacy
`filter_results.json`; su autoridad es `legacy_filter_runtime_only`. No añade
`duplicate` al enum v1 de AdmissionResult. Los tres conteos de envelopes están
declarados, pero no disponibles hasta que el writer `DECIDE-604` se active y
acepte por separado.

Todos los valores son `non_negative_integer_or_null`. La semántica cerrada es
`unavailable_never_zero`: `null` significa no disponible; nunca se convierte en
cero. Una fuente primaria ausente no se rellena desde un summary o CSV. Si hay
primario y cross-check, ambos deben coincidir; los IDs de
`validation_candidates` y resultados VALIDATE deben ser exactos, igual que los
IDs de `supported` entregados a FILTER. `matched_findings` es post-scan y queda
`post_scan_excluded`; no puede entrar en el producto ni en su ranking.

## Defaults seguros del runtime preparado

Los defaults se fijan a
`solguard-backend@320014d411cb8896ca58cbee9f147c5415be77c8`, árbol
`d53b82012f6c2c5f36b2d16765e589320beea4b1` y evidence root
`sha256:2f0e9f8056d7120d3cbb4856b65fd6a9c22546912397bf01b09e68822f45188e`.

| Campo | Default/contrato preparado |
| --- | --- |
| `mode` | `audit_only` |
| `analysis_profile` en `audit_only` | `generic_blind` |
| `analysis_profile` en `full` | `generic_blind` |
| `run_exploit` | `false`; requiere `full` y un `true` explícito |
| Perfil de release administrada | `generic_blind`; rechaza `compatibility` antes de Core |
| Desarrollo no administrado | admite `compatibility` o `generic_blind` si se solicitan explícitamente |
| Fallo FILTER | `synthetic_result=false`, `downstream_exploit=false` |

`audit_only` ejecuta el producto hasta FILTER y omite las fases posteriores. El
nombre `generic_blind` sella la procedencia/origen exigidos por el contrato; por
sí solo no demuestra aislamiento de oráculo ni generalización blind.

## Gates separados y matriz preparada

La separación de gates viene de
`solguard-deploy@a8adabd194602f5c79371f00a6d2eed25b5caa50`, árbol
`1b61588562c00d3d1e5f3273605528299cf539fe` y evidence root
`sha256:a289527e79a2b2eb4b31fb1bec41bf6ec7f6cc62a5d4bed8b5397f454a133ee1`.
Publica cuatro decisiones independientes: `measurement_integrity`,
`verdict_truth_integrity`, `product_health` y
`blind_evaluation_eligibility`.

La política de cero detecciones es
`measurement_may_pass_but_product_health_must_fail_when_claimed_closure_is_missing`:
un set coherente de ceros puede conservar integridad de medición, pero cero
proofs o cero Pass no autoriza health cuando falta el cierre declarado. La
elegibilidad blind permanece por defecto `ineligible`.

La matriz C1-016 `solguard-truth-authority-chain-matrix.v1` describe cuatro
escenarios sintéticos. Sus columnas son: escenario, TechnicalVerdict,
AdmissionResult, findings publicados, reviews, integridad de medición, verdad
del verdict, product health y elegibilidad blind.

| Escenario | Verdict | Admission | Findings | Reviews | Measurement | Verdict truth | Product health | Blind |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| `positive` | `supported` | `pass` | 1 | 0 | `passed` | `passed` | `passed` | `ineligible` |
| `patch` | `refuted` | `null` | 0 | 0 | `passed` | `passed` | `passed` | `ineligible` |
| `near_miss` | `inconclusive` | `null` | 0 | 0 | `passed` | `passed` | `passed` | `ineligible` |
| `filter_failure` | `supported` | `null` | 0 | 0 | `passed_with_observations` | `failed` | `failed` | `ineligible` |

`positive` prueba coherencia de fixtures, no una detección real. `patch` no
publica. `near_miss` no entra en FILTER ni en review. `filter_failure` conserva
el verdict técnico pero no fabrica AdmissionResult, finding ni review; falla
`verdict_truth_integrity` y `product_health`. En los cuatro casos la matriz es
`authoritative=false`, su writer/acceptance están desactivados y la capacidad
medida sigue siendo `null`.

## Verificación documental

Desde la raíz de `solguard-docs`:

```powershell
node changelogs/25-26-jul-2026/tasks/readers/truth-docs-contract.mjs
node --test changelogs/25-26-jul-2026/tasks/readers/truth-docs-contract.test.mjs
```

El verificador reabre el contrato local cerrado, fija commits, trees, hashes,
enums, linaje, defaults y matriz, y comprueba que esta página publica todos los
tokens normativos. No acepta argumentos, modo writer, transición de ledger ni
claims de rendimiento, recall, precisión o generalización.
