# 09. Artefactos y Contratos de Salida

Esta pagina es la referencia practica de outputs. Sirve para saber que archivo
abrir cuando una ejecucion termina con recall bajo, muchos inconclusos o una
fase degradada.

## Raiz del proyecto

Cada proyecto vive bajo `SOLGUARD_PROJECTS_DIR` y contiene:

| Archivo                     | Funcion                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `program.json`              | Metadata del proyecto.                                            |
| `program.md`                | Descripcion humana del proyecto.                                  |
| `canonical_candidates.json` | Candidatos canonicos despues de fusionar senales.                 |
| `analysis_funnel.json`      | Resumen de cobertura, senales, rechazos, candidatos y veredictos. |
| `hypothesis.md`             | Vista humana de hipotesis/candidatos.                             |
| `rejected_hypotheses.md`    | Nota de compatibilidad y referencia a resultados de validacion.   |
| `findings.md`               | Solo findings soportados.                                         |
| `review_queue.md`           | Candidatos inconclusos y leads revisables.                        |
| `validation_plan.md`        | Guia operativa de validacion.                                     |
| `analysis_log.md`           | Log humano de ejecucion.                                          |
| `profile.json`              | Duraciones, contadores y perfil de runtime.                       |

## `tool-outputs/`

El directorio `tool-outputs/` contiene una carpeta por fase y un journal global.

| Ruta                                                       | Funcion                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pipeline.json`                                            | Orden, estado, duracion, inputs y outputs de cada fase.                                   |
| `source/source_authority.json`                             | Receipt `solguard-source-authority-receipt.v1` del ZIP y arbol materializado.             |
| `source/map.source_integrity.json`                         | Input cerrado de integridad entregado a MAP.                                              |
| `source/map.source_integrity.core.json`                    | Verificacion independiente de Core sobre el receipt y artefacto MAP.                      |
| `source/trace.source_integrity.json`                       | Input cerrado de integridad entregado a TRACE.                                            |
| `source/trace.source_integrity.core.json`                  | Verificacion independiente de Core sobre MAP -> TRACE.                                    |
| `source/filter.source_integrity.json`                      | Input cerrado de integridad entregado a FILTER.                                           |
| `source/filter.source_integrity.core.json`                 | Verificacion independiente de Core sobre TRACE -> FILTER.                                 |
| `map/`                                                     | Salidas de `solguard-map`.                                                                |
| `diff/`                                                    | Salidas de `solguard-diff`.                                                               |
| `trace/`                                                   | Salidas de `solguard-trace`.                                                              |
| `trace/evidence_verification.json`                         | Receipt fisico create-only `trace.evidence_verification.v1`: obligatorio y verificado de nuevo para TRACE v3; opcional, historico y solo diagnostico en v2. |
| `discover/protocol_model.json`                             | Modelo semantico del protocolo.                                                           |
| `discover/index.json`                                      | Indice/capacidades de discover.                                                           |
| `economic/economic_model.json`                             | Modelo economico.                                                                         |
| `economic/synthesized_invariants.json`                     | Invariantes economicas sintetizadas.                                                      |
| `economic/index.json`                                      | Indice/capacidades de economic.                                                           |
| `value/value_model.json`                                   | Modelo de activos, autoridad, estado y deltas.                                            |
| `value/attack_paths.json`                                  | Rutas de ataque y value proof packs opcionales.                                           |
| `candidates/value_proof_requests.json`                     | Consultas `query_only` candidate-directed VALUE.                                          |
| `candidates/value-evidence/proof_responses.json`           | Respuestas revalidadas por VALUE contra MAP/TRACE.                                        |
| `candidates/value-evidence/effective_attack_paths.json`    | Vista aditiva con solo los cierres aceptados por core.                                    |
| `candidates/value-evidence/proof_closure_diagnostics.json` | Conteos y razones del cierre candidate-directed.                                          |
| `invariant/`                                               | Reporte de invariantes runtime.                                                           |
| `candidates/`                                              | Raw candidates, rechazos, lifecycle y validacion.                                         |
| `validate/validation_results.json`                         | Contrato autoritativo de veredictos.                                                      |
| `validate/validation_results.md`                           | Render humano del contrato de validacion.                                                 |
| `filter/filter_results.json`                               | Decision independiente y fail-closed `filter.v0.1`.                                       |
| `historical-enrichment/historical_enrichment.json`         | Enriquecimiento historico post-validacion.                                                |
| `impact/impact_escalation.json`                            | Analisis de impacto post-validacion.                                                      |
| `impact/impact_escalation.md`                              | Render humano de impacto.                                                                 |
| `poc-plan/poc_plan.json`                                   | Planes de PoC y harnesses recomendados.                                                   |
| `poc-plan/poc_plan.md`                                     | Render humano de PoC plan.                                                                |
| `exploit/exploit_results.json`                             | Resultado `exploit.v0.2` para candidatos admitidos.                                       |
| `report/phase.json`                                        | Registro de la fase de report.                                                            |

Cada carpeta de fase debe contener `phase.json` cuando la fase ha sido
registrada por el journal de `solguard-core`. Si una herramienta escribio su
propio receipt, el core lo preserva como `tool_phase.json` antes de escribir el
journal de orquestacion.

En `audit_only`, FILTER debe completarse y las cinco fases posteriores deben
figurar como `skipped_by_audit_only_mode` sin sus artefactos de resultado.

Para un ZIP autoritativo, `map/source_integrity.json`,
`trace/source_integrity.json` y `filter/source_integrity.json` son receipts de
las herramientas, no duplicados de los receipts Core de la tabla. Cada uno
liga el tree hash pre/post, su input y el artefacto exacto de la fase; TRACE liga
ademas el receipt MAP y FILTER el receipt TRACE. La ausencia o divergencia de
cualquiera impide un estado limpio. El contrato completo esta en
[Integridad de fuentes](../solguard-core/integridad-de-fuentes.md).

## Candidatos

Archivos principales:

| Archivo                                                                 | Funcion                                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `tool-outputs/candidates/raw_candidates.json`                           | Candidatos antes de canonicalizacion final.                                         |
| `tool-outputs/candidates/validation_candidates.json`                    | Candidatos emitidos a VALIDATE.                                                     |
| `tool-outputs/candidates/rejected_candidates.json`                      | Rechazos con etapa, razon y requisitos faltantes.                                   |
| `tool-outputs/candidates/model_discovery_packs.json`                    | Packs target-scoped `model_discovery_packs.v2` enviados al modelo.                  |
| `tool-outputs/candidates/model_discovery_diagnostics.json`              | Aceptaciones, rechazos, reparaciones y deduplicacion del modelo.                    |
| `tool-outputs/candidates/value_proof_requests.json`                     | Requests `solguard-value-proof-requests.v1`, `query_only` y acotadas a 128.         |
| `tool-outputs/candidates/value-evidence/proof_responses.json`           | Responses `solguard-value-proof-responses.v1`.                                      |
| `tool-outputs/candidates/value-evidence/effective_attack_paths.json`    | Copia efectiva sin mutar el `attack_paths.json` base.                               |
| `tool-outputs/candidates/value-evidence/proof_closure_diagnostics.json` | Requests, responses, aplicaciones, rechazos y razones.                              |
| `tool-outputs/candidates/candidate_lifecycle.json`                      | Trazabilidad desde senal fuente hasta candidato y verdict.                          |
| `tool-outputs/candidates/review_projection.json`                        | Proyeccion `candidate_review_projection.v1` no autoritativa de cortes pre-VALIDATE. |
| `tool-outputs/candidates/review_projection.md`                          | Render manual, tambien no autoritativo, de esos cortes.                             |
| `canonical_candidates.json`                                             | Vista canonica estable en raiz de proyecto.                                         |

Un candidato puede ser util aunque no sea finding. Si no tiene binding completo,
debe quedar como `reviewable_lead` o `review_queue`, no desaparecer.

La vista canonica se finaliza antes de separar cohortes.
`validation_candidates.json` debe ser un subconjunto exacto por ID y cuerpo con
estado `ready_for_validation`, `lead_promoted_exact` o
`lead_promoted_partial`. Cada candidato canonico que no entra necesita una sola
fila retenida `pre_validation_noise_gate` en `rejected_candidates.json`. La
proyeccion manual y lifecycle conservan esos leads, pero nunca se mezclan con
los resultados, hashes, summaries o findings de VALIDATE/FILTER.

Los packs v2 declaran `OPEN_WORLD=true` y `VALIDATION_AUTHORITY=false`. Core
reconstruye file/line, ruta y evidence IDs; una hipotesis exploratoria nunca se
emite a VALIDATE. Del mismo modo, solo una respuesta VALUE `complete`,
`map_trace_reverified`, sin autocorroboracion y `validate_consumable` puede
aplicarse. Las respuestas partial permanecen fuera.

Vease
[DISCOVER v2 y cierre candidate-directed VALUE](../solguard-core/discovery-v2-y-candidate-value.md)
para el contrato completo.

## Validacion

`tool-outputs/validate/validation_results.json` es el contrato autoritativo.

Resultados:

- `supported`
- `refuted`
- `inconclusive`

Clases:

- `supported_finding`: puede aparecer en `findings.md` e informes.
- `review_queue`: requiere revision humana o mas evidencia.
- `reviewable_lead`: todavia no esta listo para validacion completa.
- `non_finding`: refutado o no accionable.

Regla operativa dentro de SolGuard:

```text
finding soportado por contrato estatico = result supported + finding_class supported_finding
```

No basta con que exista en `canonical_candidates.json`.

Tampoco basta con reutilizar el mismo `candidate_id`: la fila que entra en
VALIDATE debe ser semanticamente identica a la canonica, y
`validation_results.json` contiene exactamente un resultado por input, sin
faltantes ni adicionales. Los contadores del summary se recomputan desde esa
cohorte real.

El summary autoritativo contiene los verdictos `total`, `supported`, `refuted`
e `inconclusive` y las clases secundarias `supported_findings`, `review_queue`,
`reviewable_leads` y `non_findings`. Los informes de protocolo y suite no son
otra autoridad: el gate de medicion vuelve a derivar esos campos desde las filas
fisicas, exige `supported_candidates == supported` y mantiene
`candidate_findings` separado como cardinalidad del inventario canonico.

Los cuatro artefactos del join —canonical, input VALIDATE, ledger de cortes y
resultados— deben ser ficheros regulares, unicos, confinados al project root y
fisicamente estables durante la lectura. Links, junctions/reparse points,
hardlinks, escapes o swaps TOCTOU no se convierten en missing ni en cero:
invalidan la medicion. Superar 100 MiB no es por si solo un error: los
artefactos grandes admitidos se leen por streaming, con JSON estricto, SHA-256
del fichero completo y una proyeccion cerrada que conserva exactamente los
campos consumidos. El camino inline y el camino streaming deben producir la
misma autoridad; cualquier campo requerido omitido, duplicado o fuera del cap
especifico falla cerrado.

## FILTER y EXPLOIT

`validation_results.json` no se reescribe despues de VALIDATE. FILTER vuelve a
resolver sus inputs minimos y emite una decision `pass`, `review`, `reject` o
`duplicate`. Solo un candidato VALIDATE-supported, con FILTER `pass`,
`exploit_eligibility=true` y dedupe compatible puede llegar a EXPLOIT.

Los inputs minimos incluyen el conjunto TRACE exacto consumido por VALIDATE.
Cada miembro queda identificado como `trace:<ruta-relativa-normalizada>` y por
el SHA-256 de sus bytes. Un subset, un miembro adicional, una sustitucion de
ruta, bytes stale, un symlink o una resolucion de componente ambigua hacen que
FILTER falle cerrado.

Para un indice `trace.batch_selection.v3`, el conjunto incluye obligatoriamente
`trace:evidence_verification.json`. Este receipt no se confia por presencia:
Core crea con `create_new` una copia privada single-link del binario congelado
`solguard-trace-evidence-verify`; TRACE y FILTER usan exactamente esa copia y
hash. FILTER la reejecuta contra MAP y source fisicos, exige igualdad byte a
byte con el receipt adyacente y publica tambien el hash
`tool:trace_evidence_verifier`. Receipt y stdout tienen un cap inclusivo de 64
MiB comprobado antes de leer o hashear. Missing, timeout, hardlink,
symlink/junction/reparse, binario stale, multiset TRACE distinto, TOCTOU o
receipt autosellado pero fisicamente falso bloquean FILTER y product health.

Los `dedupe_group_id` no vacios emitidos por VALIDATE son namespaces
autoritativos, tambien cuando son singleton. FILTER puede agrupar miembros del
mismo ID, pero nunca colapsar dos IDs distintos mediante su fallback semantico.

EXPLOIT debe verificar el hash congelado de FILTER. La compilacion de un harness
no equivale a reproduccion runtime.

## Knowledge

Archivos bajo `knowledge/`:

| Archivo                         | Funcion                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `historical_evidence.json`      | Placeholder pre-validacion; declara que historical retrieval se difiere. |
| `post_candidate_retrieval.json` | Enriquecimiento historico post-validacion.                               |
| `retrieved_patterns.json`       | Alias de compatibilidad del reporte post-candidate.                      |
| `similar_findings.md`           | Hallazgos historicos parecidos.                                          |
| `similar_exploit_paths.md`      | Caminos de explotacion parecidos.                                        |
| `similar_fixes.md`              | Fixes parecidos.                                                         |
| `similar_impact_escalations.md` | Escalados de impacto parecidos.                                          |
| `similar_triage_results.md`     | Resultados de triage parecidos.                                          |

Estos archivos ayudan a explicar y comparar. No cambian los verdictos.

## Reports

`reports/` contiene:

- `report_manifest.json`
- un markdown por finding soportado, normalmente asociado al `candidate_id`.

La fase de report solo debe renderizar findings soportados. No debe crear
informes finales para `review_queue` o `reviewable_lead`.

## Lectura recomendada por caso

Si no hay findings soportados:

1. `tool-outputs/validate/validation_results.json`
2. `analysis_funnel.json`
3. `tool-outputs/candidates/rejected_candidates.json`
4. `tool-outputs/candidates/candidate_lifecycle.json`
5. `analysis_log.md`

Si una fase tardo demasiado:

1. `profile.json`
2. `tool-outputs/pipeline.json`
3. `analysis_log.md`
4. `tool_runs` de la respuesta HTTP, si se conserva.

Si aparece un supported finding inesperado:

1. `validation_results.json`
2. `validation_candidates.json`
3. `canonical_candidates.json`
4. artefactos de map/trace/invariant referenciados por evidencia.
