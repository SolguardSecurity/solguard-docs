# 07. Motor de Analisis y Orquestacion

El analisis se ejecuta desde `services/analyzer/runtime.rs`. Cada ejecucion crea
o reutiliza el proyecto, resuelve el target, limpia directorios generados de
fases, crea un `PipelineJournal` y avanza en orden estricto.

## Orden de fases

El orden esta fijado en `services/pipeline.rs`:

```text
map
diff
trace
discover
economic
invariant
candidates
validate
historical-enrichment
impact
poc-plan
report
```

`PipelineJournal::begin` rechaza fases fuera de orden. Cada fase escribe un
`phase.json` y el resumen global queda en:

```text
<project>/tool-outputs/pipeline.json
```

## Estados de fase

Estados posibles:

- `completed`: fase ejecutada y outputs esperados presentes.
- `degraded`: ejecucion exitosa pero salida detectada como degradada.
- `completed_with_errors`: ejecucion termino con error registrable.
- `fallback`: el backend genero salida fallback para mantener trazabilidad.
- `skipped`: fase no ejecutada o marcada como omitida.

Estos estados son diagnostico, no finding. El veredicto de seguridad vive en
`validation_results.json`.

## Fases

### `map`

Construye mapa de codigo. Usa `solguard-map` con `--graph --no-color`. Para
repos grandes de mas de `150` archivos fuente soportados usa `--fast`; si
`--deep` excede su ventana acotada, reintenta `--fast` y registra degradacion.

### `diff`

Construye contexto de cambios cuando aplica. Sus salidas alimentan candidatos,
pero no son requisito suficiente para validar un finding.

### `trace`

Ejecuta `solguard-trace` sobre targets priorizados. Los limites se configuran con
`SOLGUARD_TRACE_MAX_TARGETS` y `SOLGUARD_TRACE_MAX_DEPTH`.

### `discover`

Ejecuta `solguard-discover` y produce:

```text
tool-outputs/discover/protocol_model.json
tool-outputs/discover/index.json
```

Modela superficies, rutas, gaps, capacidades y hipotesis blind del protocolo.
Sus hipotesis pueden entrar en candidatos con
`primary_evidence_source = protocol_invariant_discovery` si tienen evidencia
estructurada suficiente.

### `economic`

Ejecuta `solguard-economic` y produce:

```text
tool-outputs/economic/economic_model.json
tool-outputs/economic/synthesized_invariants.json
tool-outputs/economic/index.json
```

Modela activos, shares, deuda, collateral, rewards, fees, oraculos y reservas.
Puede producir hipotesis con
`primary_evidence_source = economic_state_discovery`.

### `invariant`

Ejecuta `solguard-invariant` y genera invariantes runtime. Si no hay salida
completa, el backend crea contratos fallback suficientes para que candidatos y
VALIDATE expliquen lo que falta.

### `candidates`

Fusiona senales de map, trace, discover, economic, invariant, seeds
deterministas y model discovery acotado. Escribe:

```text
tool-outputs/candidates/raw_candidates.json
tool-outputs/candidates/validation_candidates.json
tool-outputs/candidates/rejected_candidates.json
tool-outputs/candidates/model_discovery_packs.json
tool-outputs/candidates/model_discovery_diagnostics.json
tool-outputs/candidates/candidate_lifecycle.json
canonical_candidates.json
analysis_funnel.json
```

Reglas importantes:

- Los candidatos con binding incompleto no se borran silenciosamente.
- Los rechazos conservan etapa, razon, requisitos faltantes y evidencias.
- `candidate_lifecycle.json` traza la senal fuente hasta admision,
  canonicalizacion, binding y veredicto.
- `analysis_funnel.json` resume cobertura, senales, invariantes, candidatos,
  rechazos y resultados.

### `validate`

Ejecuta `solguard-validate` o genera inconclusiones fallback cuando el runtime de
validacion no esta disponible. Produce:

```text
tool-outputs/validate/validation_results.json
tool-outputs/validate/validation_results.md
```

Este es el contrato autoritativo. Resultados:

- `supported`
- `refuted`
- `inconclusive`

Clases de finding:

- `supported_finding`
- `review_queue`
- `reviewable_lead`
- `non_finding`

`findings.md` solo refleja `supported_finding`. `review_queue.md` refleja
inconclusos y leads.

### `historical-enrichment`

Despues de validar, consulta la base historica con las solicitudes generadas para
candidatos y veredictos. Escribe:

```text
tool-outputs/historical-enrichment/historical_enrichment.json
knowledge/post_candidate_retrieval.json
```

El runtime calcula el hash de `validation_results.json` antes y comprueba que no
cambia despues.

### `impact`

Analiza impacto de candidatos validados. Escribe:

```text
tool-outputs/impact/impact_escalation.json
tool-outputs/impact/impact_escalation.md
```

Si falla, crea reporte fallback y marca la fase como `fallback`; no modifica
veredictos.

### `poc-plan`

Genera planes de PoC y seleccion de harness:

```text
tool-outputs/poc-plan/poc_plan.json
tool-outputs/poc-plan/poc_plan.md
```

Es planificacion, no ejecucion de PoC.

### `report`

Renderiza informes tecnicos para findings soportados:

```text
reports/<candidate_id>.md
reports/report_manifest.json
tool-outputs/report/phase.json
```

## Salidas raiz del proyecto

Archivos principales en la raiz del proyecto:

- `canonical_candidates.json`
- `analysis_funnel.json`
- `hypothesis.md`
- `rejected_hypotheses.md`
- `findings.md`
- `review_queue.md`
- `validation_plan.md`
- `analysis_log.md`
- `profile.json`

## Model discovery

Cuando `SOLGUARD_MODEL_DISCOVERY_BATCHES > 0`, el backend prepara paquetes
acotados desde evidencia estructurada y llama al servicio interno. Los limites
actuales incluyen packs compactados y quotas por tipo de evidencia. Los rechazos
del modelo quedan en `model_discovery_diagnostics.json`; no se pierden.

## Reconstruccion de candidatos

Para depurar sin repetir todo el analisis:

```powershell
cargo run --bin solguard-backend -- rebuild-candidates "<project-dir>"
```

Este comando reconstruye candidatos desde artefactos existentes. Es util cuando
se corrige logica de candidate generation, binding, canonicalizacion o
diagnosticos.
