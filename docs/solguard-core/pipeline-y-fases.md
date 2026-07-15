# Pipeline, fases y artefactos

Cada analisis crea o reutiliza un proyecto, resuelve el target y avanza mediante
`PipelineJournal` en el orden exacto de `pipeline.v0.10`:

```text
map -> diff -> trace -> discover -> economic -> value -> invariant
    -> candidates -> validate -> filter -> historical-enrichment
    -> impact -> poc-plan -> exploit -> report
```

El journal global vive en `tool-outputs/pipeline.json`. Cada entrada usa
`pipeline_phase.v0.10`; una herramienta puede conservar su receipt propio como
`tool_phase.json` mientras `phase.json` representa la orquestacion.

## Estados

- `completed`: ejecucion y outputs requeridos coherentes.
- `degraded`: salida util con una degradacion registrada.
- `completed_with_errors`: termino con errores conservados para diagnostico.
- `fallback`: core escribio un contrato tipado de contingencia.
- `skipped`: la politica de ejecucion omitio la fase.

Estos estados no son veredictos de seguridad. La autoridad de findings es
`validation_results.json`.

## Fases de evidencia

### MAP

Ejecuta `solguard-map` y genera el mapa del codigo. A partir de 150 archivos
fuente soportados usa el modo rapido; si el modo profundo excede su ventana,
reintenta de forma acotada y registra la degradacion.

### DIFF

Obtiene contexto de cambios cuando el target conserva historia Git. Un ZIP sin
historia puede omitir la fase sin invalidar el resto del analisis.

### TRACE

Prioriza flujos de estado desde MAP. Sus limites publicos son
`SOLGUARD_TRACE_MAX_TARGETS` y `SOLGUARD_TRACE_MAX_DEPTH`.

### DISCOVER

Genera `protocol_model.json` e `index.json` con superficies, capacidades,
rutas, gaps e hipotesis estructuradas. Una hipotesis no llega a VALIDATE sin la
evidencia y el binding exigidos por candidatos.

### ECONOMIC

Modela activos, shares, deuda, collateral, rewards, fees, oraculos y reservas.
Produce `economic_model.json`, `synthesized_invariants.json` e `index.json`.
Tras candidatos puede ejecutar el pase aditivo y acotado de evidencia economica
sin reemplazar el modelo inicial cuando ese pase falla.

### VALUE

Construye `value_model.json`, `attack_paths.json` y evidencia de rutas de valor.
Sus proofs pueden reforzar causalidad economica, pero no confirmar por si solos
un finding.

### INVARIANT

Combina MAP, TRACE, modelos economicos y VALUE para producir
`tool-outputs/invariant/invariants.json`. Si la herramienta no completa un
contrato valido, core conserva un fallback explicito para que las fases
siguientes expliquen la carencia.

## Candidatos y autoridades

### CANDIDATES

Fusiona signals de herramientas, seeds deterministas y model discovery acotado.
Escribe, entre otros:

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

Los candidatos incompletos se conservan como leads con etapa, razon, requisitos
faltantes y evidencia; no se eliminan silenciosamente.

### VALIDATE

Emite `validation_results.json` y Markdown con tres veredictos:

- `supported`
- `refuted`
- `inconclusive`

`findings.md` refleja `supported_finding`; `review_queue.md` conserva resultados
inconclusos y leads. Ninguna fase posterior puede mutar el hash de este
artefacto autoritativo.

### FILTER

Consume source, VALIDATE, candidatos exactos, invariantes, MAP, policy y output.
Verifica `filter.v0.1` de forma fail-closed. TRACE, DISCOVER, ECONOMIC y VALUE no
se anaden como inputs suplementarios sin un contrato de consumo semantico nuevo
y medido.

## Fases posteriores

### HISTORICAL-ENRICHMENT

Consulta conocimiento historico despues de VALIDATE y vuelve a comprobar que el
artefacto autoritativo no cambio. Escribe el enriquecimiento bajo
`tool-outputs/historical-enrichment/` y `knowledge/`.

### IMPACT

Procesa findings soportados y escribe `impact_escalation.json` y Markdown. Un
fallback conserva diagnostico sin elevar un candidato ni alterar su veredicto.

### POC-PLAN

Escribe el plan reproducible y la seleccion de harness en
`tool-outputs/poc-plan/`. No ejecuta el exploit.

### EXPLOIT

Solo se admite despues de FILTER `pass` y elegibilidad coherente. Core entrega
los artefactos hash-bound a `solguard-exploit` y valida el contrato
`exploit.v0.2`; una compilacion aislada no se presenta automaticamente como
reproduccion.

### REPORT

Renderiza `reports/<candidate_id>.md`, `report_manifest.json` y el receipt de
fase para findings soportados. Los inconclusos o refutados no se presentan como
bugs confirmados.

## Modos de ejecucion

`full` recorre las quince fases sujeto a los gates de FILTER y EXPLOIT.

`audit_only` completa hasta FILTER. Las cinco fases siguientes se escriben como
`skipped`, duracion cero y razon `skipped_by_audit_only_mode`, sin materializar
sus artefactos:

```text
historical-enrichment, impact, poc-plan, exploit, report
```

## Replays operativos

Desde un checkout hermano del core:

```powershell
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- replay-candidates "<project-dir>" --raw-candidates "<raw.json>" --invariants "<invariants.json>" --out "<out-dir>"
```

Los replays deben usar artefactos congelados y compararse por contenido, IDs,
bindings y hashes. La compilacion y los tests por si solos no prueban paridad de
deteccion.
