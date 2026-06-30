# 09. Artefactos y Contratos de Salida

Esta pagina es la referencia practica de outputs. Sirve para saber que archivo
abrir cuando una ejecucion termina con recall bajo, muchos inconclusos o una
fase degradada.

## Raiz del proyecto

Cada proyecto vive bajo `SOLGUARD_PROJECTS_DIR` y contiene:

| Archivo | Funcion |
| --- | --- |
| `program.json` | Metadata del proyecto. |
| `program.md` | Descripcion humana del proyecto. |
| `canonical_candidates.json` | Candidatos canonicos despues de fusionar senales. |
| `analysis_funnel.json` | Resumen de cobertura, senales, rechazos, candidatos y veredictos. |
| `hypothesis.md` | Vista humana de hipotesis/candidatos. |
| `rejected_hypotheses.md` | Nota de compatibilidad y referencia a resultados de validacion. |
| `findings.md` | Solo findings soportados. |
| `review_queue.md` | Candidatos inconclusos y leads revisables. |
| `validation_plan.md` | Guia operativa de validacion. |
| `analysis_log.md` | Log humano de ejecucion. |
| `profile.json` | Duraciones, contadores y perfil de runtime. |

## `tool-outputs/`

El directorio `tool-outputs/` contiene una carpeta por fase y un journal global.

| Ruta | Funcion |
| --- | --- |
| `pipeline.json` | Orden, estado, duracion, inputs y outputs de cada fase. |
| `map/` | Salidas de `solguard-map`. |
| `diff/` | Salidas de `solguard-diff`. |
| `trace/` | Salidas de `solguard-trace`. |
| `discover/protocol_model.json` | Modelo semantico del protocolo. |
| `discover/index.json` | Indice/capacidades de discover. |
| `economic/economic_model.json` | Modelo economico. |
| `economic/synthesized_invariants.json` | Invariantes economicas sintetizadas. |
| `economic/index.json` | Indice/capacidades de economic. |
| `invariant/` | Reporte de invariantes runtime. |
| `candidates/` | Raw candidates, rechazos, lifecycle y validacion. |
| `validate/validation_results.json` | Contrato autoritativo de veredictos. |
| `validate/validation_results.md` | Render humano del contrato de validacion. |
| `historical-enrichment/historical_enrichment.json` | Enriquecimiento historico post-validacion. |
| `impact/impact_escalation.json` | Analisis de impacto post-validacion. |
| `impact/impact_escalation.md` | Render humano de impacto. |
| `poc-plan/poc_plan.json` | Planes de PoC y harnesses recomendados. |
| `poc-plan/poc_plan.md` | Render humano de PoC plan. |
| `report/phase.json` | Registro de la fase de report. |

Cada carpeta de fase debe contener `phase.json` cuando la fase ha sido
registrada por `PipelineJournal`.

## Candidatos

Archivos principales:

| Archivo | Funcion |
| --- | --- |
| `tool-outputs/candidates/raw_candidates.json` | Candidatos antes de canonicalizacion final. |
| `tool-outputs/candidates/validation_candidates.json` | Candidatos emitidos a VALIDATE. |
| `tool-outputs/candidates/rejected_candidates.json` | Rechazos con etapa, razon y requisitos faltantes. |
| `tool-outputs/candidates/model_discovery_packs.json` | Packs enviados al modelo para discovery acotado. |
| `tool-outputs/candidates/model_discovery_diagnostics.json` | Aceptaciones, rechazos, reparaciones y deduplicacion del modelo. |
| `tool-outputs/candidates/candidate_lifecycle.json` | Trazabilidad desde senal fuente hasta candidato y verdict. |
| `canonical_candidates.json` | Vista canonica estable en raiz de proyecto. |

Un candidato puede ser util aunque no sea finding. Si no tiene binding completo,
debe quedar como `reviewable_lead` o `review_queue`, no desaparecer.

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

Regla operativa:

```text
finding real = result supported + finding_class supported_finding
```

No basta con que exista en `canonical_candidates.json`.

## Knowledge

Archivos bajo `knowledge/`:

| Archivo | Funcion |
| --- | --- |
| `historical_evidence.json` | Placeholder pre-validacion; declara que historical retrieval se difiere. |
| `post_candidate_retrieval.json` | Enriquecimiento historico post-validacion. |
| `retrieved_patterns.json` | Alias de compatibilidad del reporte post-candidate. |
| `similar_findings.md` | Hallazgos historicos parecidos. |
| `similar_exploit_paths.md` | Caminos de explotacion parecidos. |
| `similar_fixes.md` | Fixes parecidos. |
| `similar_impact_escalations.md` | Escalados de impacto parecidos. |
| `similar_triage_results.md` | Resultados de triage parecidos. |

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
