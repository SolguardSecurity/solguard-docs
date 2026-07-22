# 07. SolGuard Discover

`solguard-discover` infiere un modelo semantico de protocolo desde MAP, TRACE y
opcionalmente el source tree. Es una fase de descubrimiento ciego de reglas,
objetos de ciclo de vida, rutas, gaps e hipotesis.

No confirma vulnerabilidades. Produce senales backend-ready para candidatos.

## Inputs

Obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcional:

- `--source <source dir>`

## CLI actual

```powershell
cargo run --release -- `
  --map project/tool-outputs/map/audit_map.json `
  --trace project/tool-outputs/trace `
  --source project/source `
  --out project/tool-outputs/discover
```

Opciones de limites:

- `--max-duration-ms`
- `--max-json-file-bytes`
- `--max-required-map-bytes`
- `--max-trace-files`
- `--max-trace-raw-bytes-total`
- `--max-trace-integrity-duration-ms`
- `--trace-integrity-min-bytes-per-second`
- `--trace-integrity-per-file-overhead-ms`
- `--max-trace-bytes-total`
- `--max-source-files`
- `--max-source-file-bytes`
- `--max-source-bytes-total`
- `--max-source-lines-total`
- `--max-corpus-bytes`
- `--max-intent-signals`
- `--max-working-set-bytes`

Tambien existen variables equivalentes:

- `SOLGUARD_DISCOVER_MAX_DURATION_MS`
- `SOLGUARD_DISCOVER_MAX_JSON_FILE_BYTES`
- `SOLGUARD_DISCOVER_MAX_REQUIRED_MAP_BYTES`
- `SOLGUARD_DISCOVER_MAX_TRACE_FILES`
- `SOLGUARD_DISCOVER_MAX_TRACE_RAW_BYTES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_TRACE_INTEGRITY_DURATION_MS`
- `SOLGUARD_DISCOVER_TRACE_INTEGRITY_MIN_BYTES_PER_SECOND`
- `SOLGUARD_DISCOVER_TRACE_INTEGRITY_PER_FILE_OVERHEAD_MS`
- `SOLGUARD_DISCOVER_MAX_TRACE_BYTES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_SOURCE_FILES`
- `SOLGUARD_DISCOVER_MAX_SOURCE_FILE_BYTES`
- `SOLGUARD_DISCOVER_MAX_SOURCE_BYTES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_SOURCE_LINES_TOTAL`
- `SOLGUARD_DISCOVER_MAX_CORPUS_BYTES`
- `SOLGUARD_DISCOVER_MAX_INTENT_SIGNALS`
- `SOLGUARD_DISCOVER_MAX_WORKING_SET_BYTES`

## Salidas

Schemas:

```text
protocol_model.v0.1
discover_index.v0.1
discover_coverage_contract.v2
```

Archivos:

- `protocol_model.json`
- `coverage_contract.json`
- `index.json`
- `protocol_model.md`
- `summary.txt`

`coverage_contract.json` es el contrato de salud compacto, cerrado y obligatorio
de DISCOVER. Liga `protocol_model.json` por basename, schema, bytes y SHA-256, y
proyecta exactamente `tool_version`, `summary`, `degraded`, los 16 limites de
recursos, los 36 contadores de uso, los diagnosticos y el recibo
`economic_route_graph_consumption.v1`. Se emite incluso cuando el modelo
cabe bajo el limite de parseo: no es un fallback opcional para archivos grandes.
El index lo anuncia con schema y capability explicitos
`discover_coverage_contract.v2`; el alias generico no concede autoridad de
version. Un contrato v1 es diagnostico legacy y nunca puede representar salud
limpia actual.

`coverage_reasons` es un enum ordenado y recomputable, no texto libre. Distingue
deuda o cobertura desconocida de los dos ledgers MAP, TRACE o fuentes omitidas,
items semanticos omitidos, etapas cuya observacion no fue `exact` y degradacion
por recursos sin otra causa. Los contadores de admision y cada recibo
`semantic_coverage.v2` deben reconciliarse exactamente con esos motivos. Core y
el gate fallan cerrados ante ausencia, shape no canonico, hash divergente,
contadores incoherentes, cobertura `unknown`, deuda u observacion incompleta.

Los valores cerrados de `kind` son:

```text
upstream_map_collection_coverage_debt
upstream_map_collection_coverage_unknown
upstream_economic_flow_coverage_debt
upstream_economic_flow_coverage_unknown
trace_files_skipped
source_files_skipped
semantic_items_omitted
semantic_observation_incomplete
resource_limit_degradation
```

El gate no busca palabras en `diagnostics`: reconstruye este array desde
`resource_usage`, ledgers y receipts, lo ordena y exige igualdad exacta con el
contrato. Un enum desconocido o una causa omitida bloquea product health.

La integridad fisica del batch TRACE tiene un presupuesto separado del reloj
semantico de 180000 ms. Antes de leer, DISCOVER calcula dos pasadas obligatorias
sobre todos los primarios declarados:

```text
required_bytes = trace_raw_bytes * 2
budget_ms = ceil(required_bytes * 1000 / min_bytes_per_second)
          + trace_primary_count * 2 * per_file_overhead_ms
```

El contrato publica bytes declarados y procesados, primarios, pasadas requeridas
y completadas, budget y elapsed fisico. Deben reconciliarse exactamente con el
modelo primario. Una lectura parcial, presupuesto imposible, exceso del limite
fisico, overflow o discrepancia falla cerrado; verificar artefactos grandes no
consume silenciosamente el tiempo destinado a inferencia semantica.

El total raw y el payload semantico retenido son presupuestos distintos. Cada
primary fisico individual puede llegar al cap producer inclusivo de 4 GiB y se
prevalida por metadata/descriptor antes de dos pasadas streaming; DISCOVER no
lo materializa entero ni confunde su limite de proyeccion semantica con el wire.
Cero, N+1, mismatch, overflow o drift fisico fallan cerrados.

Cuando TRACE es un directorio batch, DISCOVER valida ademas el
`trace.contract_manifest.v2` all-target: membresia/orden, bytes y SHA-256 de
cada primario, digest canonico de su coverage ledger, receipt de route graph y
agregados. El `trace.materialization_manifest.v2`, cuando aplica, debe ser el
subset exacto ligado a esos mismos primarios. Ningun resumen del indice puede
lavar deuda, sustituir un target o aportar evidencia semantica por si solo. Un
receipt `over_approximation` completo puede acreditar cobertura MAY del subset,
pero no exactitud, MUST ni ausencia. "Cuando aplica" significa exactamente
`diagnostics_count > 0`: con cero diagnosticos el manifiesto debe estar ausente
o ser `null`, y con uno o mas es obligatorio.

Si un primario declara target-route, DISCOVER exige como unidad indivisible
`trace.target_route_closure.v2`, dos evaluaciones v2 causal/economic y
`trace.claim_authority.v2`, y recalcula sus digests, inventarios, fixpoints y
flags. La deuda o incompletitud de representacion se mide y conserva
review-only; nunca se eleva a evidencia negativa. La familia producer v1 es
solo diagnostica.

## Proyeccion semantica del MAP

El MAP requerido se ingiere mediante `map.semantic_projection.v1`. DISCOVER
lee y hashea el archivo completo en streaming, pero solo retiene los 35 campos
top-level que consume semanticamente:

```text
schema_version, repository, source_capabilities, language_capabilities,
components, functions, roles, states, state_machines, state_transitions,
economic_values, economic_operations, economic_value_links, economic_flows,
economic_route_graph,
accrual_checkpoints, dependencies, external_dependency_contracts,
dependency_assumptions, flows, call_edges, graph_symbols, graph_edges,
cross_component_paths, semantic_contexts, context_couplings, identity_schemas,
state_slot_uniqueness, context_freshness, atomicity_boundaries,
trust_boundaries, critical_surfaces, review_targets,
map_collection_coverage, economic_flow_coverage
```

DISCOVER valida el grafo factorado, lo recorre como world model sin expandir
productos cartesianos y publica un recibo full-graph ligado al `graph_digest`
de MAP. La cobertura upstream y las omisiones locales permanecen separadas;
una region over-approximated genera hipotesis may y evidencia requerida, nunca
un binding exacto ni una afirmacion de ausencia. El receipt se repite
literalmente en `coverage_contract.json`, ligado por bytes y SHA-256 al modelo.

Los campos no consumidos tambien se parsean y entran en el SHA-256 del archivo,
pero no se conservan en memoria. Sus nombres quedan en un diagnostico
determinista. La dependencia MAP y `metadata.source_hashes.map` usan el hash del
archivo completo, nunca el hash de la proyeccion.

`metadata.resource_usage` hace observable esta frontera mediante
`map_input_bytes`, `map_projection_bytes`,
`map_top_level_fields_seen`, `map_top_level_fields_retained`,
`map_top_level_fields_ignored`, `estimated_working_set_bytes`,
`map_collection_coverage_debt` y
`map_economic_flow_coverage_debt`. DISCOVER conserva los recibos
`map_collection_coverage.v1` y `economic_flow_coverage.v1`; copia cada deuda a
diagnosticos y publica por separado sus cardinalidades. Proyectar un campo que
DISCOVER no consume no borra ni convierte en cobertura completa una omision
upstream.

Los estados `map_collection_coverage_status` y
`map_economic_flow_coverage_status` se calculan de forma independiente. Valen
`complete` cuando el ledger correspondiente esta presente y no declara deuda,
`coverage_debt` cuando esta presente con al menos una deuda, y `unknown` cuando
el ledger esta ausente. `complete` describe exclusivamente ese recibo upstream;
no afirma que el modelo DISCOVER completo sea saludable ni que exista cobertura
de bugs.

El MAP requerido tiene un hard cap independiente de 268435456 bytes (256 MiB).
La estimacion estructural admitida por defecto es 1073741824 bytes (1 GiB).
`max_working_set_bytes` estima la memoria necesaria para las estructuras
retenidas; no es un limite de RSS/private memory impuesto por el sistema
operativo. Un limite real de proceso requiere un job o sandbox externo.

La frontera MAP falla cerrada, con exit no cero y sin fallback metadata-only,
ante JSON invalido o truncado, datos trailing, campos duplicados, tipos
semanticos incompatibles, mutacion concurrente del archivo, exceso del hard cap
raw o de la estimacion estructural. `max_json_file_bytes` sigue siendo el limite
por archivo para inputs JSON/TRACE opcionales, que pueden producir degradacion
observable en vez de invalidar el MAP requerido.

## Que infiere

El modelo puede incluir:

- actores;
- protocol assets;
- lifecycle objects;
- trust boundaries;
- attack surfaces;
- reconstructed call routes;
- intent signals;
- implicit protocol rules;
- counterexample templates;
- scenario trace hypotheses;
- invariant gaps;
- blind vulnerability hypotheses;
- negative evidence signals.

## Hipotesis backend-ready

Las hipotesis blind se emiten con lineas/evidencia para que el core pueda
convertirlas en candidatos:

- `canonical_issue_key`
- `semantic_rule`
- `root_cause_surface`
- `trigger_surface`
- `impact_surface`
- `chain[i]`
- `target_location`
- `fingerprint`
- `missing_evidence`

En el core pueden aparecer con
`primary_evidence_source = protocol_invariant_discovery`.

Los bindings TRACE tipados y resueltos se procesan antes del cap final de
hipotesis para que una relacion causal exacta no quede expulsada por el volumen
de reglas heuristicas. Para `trace.actor_authorization_binding.v1`, solo un
status `violated` abre una call route, implicit rule, invariant gap e hipotesis
con la regla
`authorization.caller_must_match_subject_or_allowance_spender`. Un binding
`satisfied` no abre ninguna de esas superficies.

La mineria de intent excluye documentos explicitamente answer-bearing como
`KNOWN_ISSUES.md`, nombres basados en `vulnerability`, `finding`, `solution` o
`exploit` —tambien en plural y sin prefijo— y equivalentes, y tambien excluye la
linea concreta de otro documento que los cite. La regla se aplica por stem de
nombre normalizado, no solo a dos nombres reservados. El resto de documentacion
funcional puede seguir aportando intent. Esta frontera evita usar una respuesta
conocida como evidencia de descubrimiento sin convertir toda la documentacion
en inutilizable.

## Integracion con model discovery v2 de core

El `protocol_model.json` de esta herramienta y los model packs construidos por
core son contratos distintos. `solguard-discover` posee el modelo de protocolo;
`solguard-pipeline-core` posee
`tool-outputs/candidates/model_discovery_packs.json` con
`model_discovery_packs.v2`.

Para cada target seleccionado, core forma una capsula source-grounded y
open-world. Incluye como maximo doce aristas resueltas conectadas al target y no
permite que aristas globales no relacionadas consuman ese cupo. Un target no se
descarta solo por carecer de aristas o invariantes previos. Cada pack declara
`OPEN_WORLD=true`, `VALIDATION_AUTHORITY=false` y exige la salida compacta
`model_discovery_candidate.v2`.

Dentro de esas doce aristas, core intercala primero las conexiones directas
entrantes del lado root-cause y las salientes del lado impact; asi un fan-out
grande no elimina la otra mitad causal. Si TRACE no entrega ningun target
source-backed utilizable, core usa un fallback MAP acotado: selecciona simbolos
function-like, prioriza superficies `public`/`external` y de valor, y excluye
tests, mocks, fixtures, vendor y `node_modules`. El contexto declara
`trace.model_discovery_map_fallback.v1` y
`coverage_gap=trace_targets_unavailable`.

El modelo solo propone semantica y los IDs exactos de las tres superficies.
Core resuelve file/line, invariantes, ruta y evidencia desde el propio pack. No
confia en `chain` ni `evidence_ids` aportados por el modelo. Si no puede
reconstruir invariant tipado y ruta con evidencia, conserva la hipotesis como
lead exploratorio y la excluye de VALIDATE.

El fallback MAP no cambia esa regla: su capsula es degradada, open-world y sin
autoridad de validacion.

El contrato completo se describe en
[DISCOVER v2 y cierre candidate-directed VALUE](../solguard-core/discovery-v2-y-candidate-value.md).

## Capabilities

`protocol_model.json` e `index.json` registran:

- upstream dependencies;
- input capabilities;
- consumed capabilities;
- output capabilities.

Esto permite saber que datos ofrecian MAP/TRACE y que parte fue realmente usada.

## Admision semantica y prioridad de producto

DISCOVER deduplica los `RuleDraft` por identidad semantica antes de enriquecerlos
con rutas, protecciones, counterexamples o escenarios. Las procedencias
duplicadas se fusionan, pero una regla normativa especifica o una ruta causal
ordenada distinta conserva su propia identidad. Este orden evita que el
enriquecimiento multiplique de forma cartesiana una misma regla antes de
consumir el presupuesto final.

Los productores resuelven localizacion de evidencia y simbolo cualificado a una
identidad de ruta; el binding final exige ese ID explicito y nunca vuelve a
adivinar por similitud lexica. Para proyectar el scope de
una ruta, lifecycle objects, assets y trust boundaries necesitan un anchor
exacto de estado, flow, simbolo o endpoint. Compartir componente, tipo o
vocabulario de una familia de reglas solo aporta contexto; nunca autoriza por
si solo un binding ni una expansion sobre todas las rutas del componente.

El orden critico de materializacion es `rules -> gaps -> hypotheses`. Solo
despues se generan los counterexamples y scenario traces opcionales. Un deadline
no puede permitir que el enriquecimiento opcional deje sin ejecutar las salidas
principales de deteccion.

## Degradacion

En repos grandes o con limites agotados, DISCOVER escribe un modelo degradado en
vez de ejecutar sin limite. La degradacion queda visible en metadata,
`protocol_model.md`, `summary.txt` y diagnosticos.

El deadline por defecto es cooperativo y vale 180000 ms. Se comprueba dentro de
los recorridos grandes de inferencia MAP/TRACE y entre subfases; no es un kill
duro del proceso, por lo que el elapsed puede superar el limite hasta el
siguiente checkpoint. El cierre de rutas es BFS por estado semantico y conserva
el testigo canonico mas corto; alternativas dominadas y ciclos se contabilizan
como redundancia, mientras un edge ambiguo termina en una ruta parcial y no se
encadena como causalidad inventada. Las rutas se emiten de forma incremental
hacia colecciones deduplicadas y acotadas por bytes e items; no se materializa
primero el espacio cartesiano completo. Llegar exactamente a un limite no crea deuda:
solo una omision observada, una busqueda incompleta o una etapa no iniciada
degrada el modelo y queda cuantificada en el ledger.

Cada coleccion acotada publica un recibo `semantic_coverage.v2`. Su campo
`unit` es obligatorio y usa el enum cerrado `items`, `files`, `targets`,
`contracts` o `debt_entries`. Solo los recibos `unit=items` contribuyen a
`semantic_items_omitted`; las demas dimensiones conservan contadores separados.
`source_files` usa `files`; seleccion TRACE y colapso de duplicados usan
`targets`; disponibilidad/autoridad y admision contractual usan `contracts`;
deuda de grafo upstream usa `debt_entries`; las etapas semanticas ordinarias
usan `items`. Unit ausente/desconocida, aritmetica incoherente u overflow checked
fallan cerrados. Un recibo v1 es incompatible, se rechaza y no se reinterpreta
como v2; un artefacto pre-contract sin receipt solo puede ser diagnostico.

Cuando la busqueda demuestra al menos una omision pero el presupuesto impide enumerar
todo el espacio restante, `observation=lower_bound` evita fingir un total
exacto. Si el deadline impide iniciar una etapa, se registra
`observation=not_started`, el modelo queda degradado y cero elementos no se
presentan como cobertura completa. `observation` es un enum cerrado en el
productor y en el gate: solo admite `exact`, `lower_bound` o `not_started`;
cualquier valor desconocido falla cerrado aunque el artefacto se haya
autosellado.

### Evidencia diagnostica de Phase 1

La ejecucion dirigida final de Optimism esta sellada en
`D:\SolguardDiagnostics\phase1-discover-optimism-ledger-runtime-20260718-final-r2`.
Uso el MAP byte-exacto de 119.784.018 bytes con SHA-256
`e4c290b3ccd7925ab1316b7979489d309d3a28fa250739a8716d669b575b70b6`
y el binario DISCOVER con SHA-256
`DE3C09078ACF8822800EFE51919F07609BA72CE7255BAB01F5BFD7E46BFED363`.
Los outputs quedaron ligados por los hashes
`EE0B843CC92C7611EAE3B510CB35B3BB0937980E8F557DC0DE1F4A098D42206C`
para `protocol_model.json` y
`2D616D703C06B9E70B2022EBB61C3D8665B71319E00C9FEE09BF578A14B62A3A`
para `index.json`.

DISCOVER termino en 23.882 ms, frente a los 180.303 ms del diagnostico
original, sin interrupciones por deadline. Retuvo 450 reglas de 4.206
observadas, 300 gaps de 445 y 120 hipotesis de 300. Los estados fueron
`map_collection_coverage_status=coverage_debt` con 19 deudas y
`map_economic_flow_coverage_status=complete` con cero deudas. El resultado
siguio correctamente degradado: el ledger registro 113.594 omisiones
semanticas, incluida deuda upstream de MAP y colecciones que demostraron
overflow.

Estos numeros y la comparacion de runtime son evidencia diagnostica de ingestion,
deduplicacion, orden de etapas y contabilidad fail-closed para este caso
dirigido. No miden precision y no establecen una mejora de recall o
generalizacion; esas afirmaciones requieren reruns comparables de los corpus
conocidos y un holdout independiente sellado.

## Frontera operacional actual

El MAP requerido se consume mediante una proyeccion streaming que hashea y
valida el fichero completo; duplicate keys, truncado, drift o overflow fallan
sin publicar un modelo. Source opcional se recorre con limites de profundidad,
entradas, bytes, paths y working set, rechazando links, reparse points,
hardlinks y sustitucion fisica.

TRACE se adquiere manifest-first desde `index.json`. DISCOVER verifica todos
los primarios declarados en dos pasadas fisicas bounded y conserva por separado
el reloj de integridad y el de inferencia. El perfil `generic_blind` exige
`trace.signal_origins.v1` y prohíbe `known_pattern` en todos los canales
puntuados; `compatibility` no puede introducir origins que su batch no sello.

El output se publica create-only y transaccionalmente. Deuda coherente queda
visible como cobertura; input malformado o fisicamente ambiguo es fallo, no
fallback silencioso.

## Limites

- No valida reachability completa.
- No confirma impacto.
- Las reglas implicitas son hipotesis hasta pasar por INVARIANT/VALIDATE.
- El source opcional ayuda a minar intenciones, pero no sustituye evidencia
  estructurada.
- Los packs v2 mejoran la disciplina de grounding; no prueban por si solos una
  mejora de recall ni de generalizacion.
