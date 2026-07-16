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
rutas, gaps e hipotesis estructuradas. Durante CANDIDATES, core construye
ademas `model_discovery_packs.v2`: capsulas source-grounded, open-world y
target-scoped con hasta doce aristas resueltas conectadas al target. El modelo
responde con `model_discovery_candidate.v2`, que solo contiene semantica e IDs
de superficies.

El presupuesto de aristas preserva ambos lados causales: intercala relaciones
directas entrantes hacia el root/target y salientes hacia el impact antes de
expandir el resto del grafo conectado. Si TRACE no ofrece ningun target
source-backed utilizable, core crea un pool acotado desde simbolos function-like
de MAP, prioriza entrypoints externos/de valor y excluye tests, mocks, fixtures,
vendor y `node_modules`. Este fallback se identifica como
`trace.model_discovery_map_fallback.v1` con
`coverage_gap=trace_targets_unavailable`.

Core reconstruye ubicaciones, ruta y evidencia desde el pack; el modelo no es
autoridad para esos campos. Una hipotesis sin invariant tipado y ruta
autoritativa con evidencia permanece como lead exploratorio y no llega a
VALIDATE. La misma regla se aplica a toda capsula MAP-fallback: es degradada y
open-world, nunca autoridad de validacion.

### ECONOMIC

Modela activos, shares, deuda, collateral, rewards, fees, oraculos y reservas.
Produce `economic_model.json`, `synthesized_invariants.json` e `index.json`.
Tras candidatos puede ejecutar el pase aditivo y acotado de evidencia economica
sin reemplazar el modelo inicial cuando ese pase falla.

Cuando MAP/TRACE declaran `economic_flow_identity.v2`, ECONOMIC conserva flow
ID, route digest, operaciones, aristas y asset legs en sus transitions, y
publica el mismo par singleton en `flow_route_bindings` de equations y scopes
de invariantes. Un flow ID explícito solo se resuelve por coincidencia exacta;
una ruta legacy o un binding fuzzy no se presenta como transition concreta.

### VALUE

Construye `value_model.json`, `attack_paths.json` y evidencia de rutas de valor.
Sus proofs pueden reforzar causalidad economica, pero no confirmar por si solos
un finding. VALUE no consume ground truth ni calcula overlap. El productor y
los fallbacks v1 de core siguen serializando
`top20_ground_truth_overlap=0` solo como placeholder deprecated de
compatibilidad. Core no lo consume, no lo usa como metrica y lo excluye de
`analysis_funnel.json`; se eliminara en v2. Las metricas reales del evaluator
permanecen fuera del pipeline de producto.

VALUE puede ejecutarse una segunda vez dentro del cierre de candidatos como
`candidate_value`. Esa pasada consume `solguard-value-proof-requests.v1`
`query_only`, con un maximo de 128 consultas y referencias independientes
MAP/TRACE, y produce `solguard-value-proof-responses.v1`. Solo una respuesta
`complete`, `map_trace_reverified`, sin autocorroboracion, con todas las
identidades y obligaciones exactas y proof `validate_consumable` puede aplicarse
a la vista efectiva. Las respuestas parciales permanecen fuera de VALIDATE.
La independencia excluye cualquier evidence ID MAP relabelado por TRACE, y la
obligacion de invariante exige un ID exacto cuyo scope autoritativo este ligado
al mismo flow ID y route digest.

El ensamblado `economic_flow_identity.v2` conserva el ID content-addressed
creado por MAP y une TRACE/ECONOMIC mediante ID y digest exactos. Una request
puede señalar una ruta v2 única MAP+TRACE aunque no exista en el top-50 base;
VALUE busca sobre sus paths pre-ranking. Core solo acepta el path nuevo si
revalida atómicamente flow ID, digest, ordered sequence, superficies, claims y
evidence refs sin duplicados. Los flows legacy y los conflictos de ensamblado
permanecen no consumibles.

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
tool-outputs/candidates/value_proof_requests.json
tool-outputs/candidates/value-evidence/proof_responses.json
tool-outputs/candidates/value-evidence/effective_attack_paths.json
tool-outputs/candidates/value-evidence/proof_closure_diagnostics.json
tool-outputs/candidates/candidate_lifecycle.json
canonical_candidates.json
analysis_funnel.json
```

Los candidatos incompletos se conservan como leads con etapa, razon, requisitos
faltantes y evidencia; no se eliminan silenciosamente.

`effective_attack_paths.json` no sustituye ni modifica el
`tool-outputs/value/attack_paths.json` original. Es una copia efectiva que
reemplaza un path base revalidado o añade un path v2 exacto encontrado antes del
ranking, siempre que su respuesta supere el cierre. Los diagnosticos
`solguard-value-proof-closure-diagnostics.v1` conservan requests, responses,
aplicaciones, rechazos y sus razones.

El resultado Rust `AnalyzeOutputs` expone `candidate_value_dir`,
`value_proof_requests_json`, `value_proof_responses_json`,
`effective_attack_paths_json` y
`value_proof_closure_diagnostics_json` como campos aditivos.

La especificacion detallada de ambas fronteras esta en
[DISCOVER v2 y cierre candidate-directed VALUE](./discovery-v2-y-candidate-value.md).

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
`tool-outputs/poc-plan/`. No ejecuta el exploit y solo puede usar fixtures
source/test-linked presentes en el proyecto, nunca fixtures sintetizadas desde
ground truth.

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

Del mismo modo, los contratos v2 y `candidate_value` no prueban una mejora de
recall. Esa conclusion requiere un nuevo rerun congelado de los 90 labs y de los
holdouts independientes frente a la baseline anterior.
