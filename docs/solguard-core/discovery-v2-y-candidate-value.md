# DISCOVER v2 y cierre candidate-directed VALUE

Esta pagina documenta dos contratos internos del pipeline que amplian la
busqueda sin rebajar la autoridad de VALIDATE:

- los packs de model discovery v2, target-scoped y open-world;
- la segunda pasada `candidate_value`, dirigida por obligaciones de evidencia.

Ambos contratos producen hipotesis o evidencia. Ninguno emite por si mismo un
finding `supported`.

La identidad compartida que habilita la búsqueda exacta fuera del top-50 se
documenta en
[Identidad económica de flujo v2](./economic-flow-identity-v2.md).

## Model discovery packs v2

Core construye `tool-outputs/candidates/model_discovery_packs.json` con schema
`model_discovery_packs.v2`. Cada pack declara:

```text
BLIND_SOURCE_ONLY=true
GROUNDING_REQUIRED=true
OPEN_WORLD=true
VALIDATION_AUTHORITY=false
JSON_SCHEMA_STRICT=model_discovery_candidate.v2
```

La seleccion de contexto es target-scoped:

- parte del target concreto de TRACE;
- admite como maximo doce `graph_edges` con `resolution=resolved` conectados a
  ese target;
- intercala primero aristas directas entrantes del lado root-cause y salientes
  del lado impact, evitando que el fan-out de un solo lado agote todo el
  presupuesto;
- solo despues expande de forma determinista el vecindario conectado restante;
- es determinista y las aristas globales no conectadas no consumen el cupo;
- no descarta un target solo porque no existan aristas o invariantes previos;
- conserva source, ubicacion y simbolo del target como capsula open-world.

El numero final de packs sigue sujeto al limite global de batches y a la
seleccion de targets del analisis. Open-world significa que la ausencia de una
regla previa no cierra la busqueda; no significa que una conjetura quede
validada.

### Fallback MAP cuando TRACE no aporta targets

Despues de validar los targets de `trace/index.json`, core puede quedarse sin
ninguno utilizable: por ejemplo, si faltan traces legibles, la ubicacion no
resuelve a source soportado o el target pertenece a contenido excluido. En ese
caso aplica un fallback determinista y acotado desde `audit_map.graph_symbols`
en vez de emitir cero packs.

El fallback:

- admite solo simbolos function-like (`function`, `method`, `instruction`,
  `entrypoint` o `handler`) con fichero y linea existentes;
- prioriza visibilidad `public`/`external` y nombres asociados a superficies
  externas o de valor, como `deposit`, `withdraw`, `transfer`, `borrow`,
  `liquidate`, `mint`, `redeem`, `swap`, `bridge`, `execute` o `settle`;
- excluye rutas bajo `test`, `tests`, `mock`, `mocks`, `fixture`, `fixtures`,
  `vendor` y `node_modules`;
- limita el pool segun el presupuesto de batches y conserva el limite final de
  packs;
- reutiliza solo aristas resueltas de MAP conectadas al simbolo seleccionado.

El contexto sintetico declara:

```json
{
    "schema_version": "trace.model_discovery_map_fallback.v1",
    "coverage_gap": "trace_targets_unavailable"
}
```

El pack resultante conserva `OPEN_WORLD=true` y
`VALIDATION_AUTHORITY=false`.

Este camino es una degradacion explicita. Permite investigar source productivo
cuando TRACE no pudo proponer targets, pero no convierte MAP ni el modelo en
autoridad. Sin invariant, ruta y evidencia cerrados por core, la propuesta
permanece exploratoria y no entra en VALIDATE.

### Salida compacta del modelo

El modelo devuelve como maximo tres propuestas por pack. La forma v2 contiene
solo semantica y referencias a IDs exactos de `SYMBOL_LOCATION`:

```json
{
    "candidates": [
        {
            "title": "...",
            "semantic_rule_id": "regla exacta del pack o vacio",
            "family": "...",
            "condition": "...",
            "broken_invariant": "...",
            "exploit_sketch": "...",
            "validation_test": "...",
            "root": { "symbol": "id exacto" },
            "trigger": { "symbol": "id exacto" },
            "impact": { "symbol": "id exacto" }
        }
    ]
}
```

El modelo no es autoridad para `file`, `line`, `chain` ni `evidence_ids`. Core
resuelve las tres superficies desde `SYMBOL_LOCATION`, enlaza la regla contra
`TYPED_INVARIANT` y reconstruye una ruta causal acotada desde
`RESOLVED_EDGE`. Si una respuesta heredada aporta rutas o evidencia, esas
anotaciones se ignoran y se reconstruyen desde el pack.

Una propuesta con invariant tipado y ruta autoritativa, ambos con evidencia
valida del pack, puede continuar al binding determinista. Cuando falta ese
grounding, core la conserva como `model_exploratory_source`, registra las
obligaciones pendientes y la excluye de `validation_candidates.json`. Un lead
exploratorio nunca entra en VALIDATE.

Los diagnosticos de esta frontera se escriben en
`model_discovery_diagnostics.json` con `model_discovery_diagnostics.v2`;
distinguen propuestas grounded,
exploratorias, rutas autoritativas reconstruidas, reparaciones de schema y
rechazos.

## Segunda pasada `candidate_value`

La primera ejecucion de VALUE sigue produciendo el modelo y los attack paths
generales. Despues de construir candidatos canonicos, core puede iniciar una
segunda ejecucion de la misma herramienta con consultas dirigidas por
candidato. Esta ejecucion aparece como tool run `candidate_value`.

### Requests

Core escribe:

```text
tool-outputs/candidates/value_proof_requests.json
schema: solguard-value-proof-requests.v1
```

El contrato es fail-closed:

- `query_only` debe ser `true`;
- hay como maximo 128 requests;
- el candidato debe tener root, trigger e impact concretos y localizados;
- las tres superficies deben estar grounded por simbolo, fichero y linea en el
  indice MAP/TRACE actual;
- core resuelve cada `evidence_id` candidato contra ese indice y serializa el
  origin, fichero y linea autoritativos, no la tupla derivada del candidato;
- las referencias no resolubles se eliminan y debe quedar al menos una
  referencia independiente MAP/TRACE situada en una de las tres superficies;
- un `evidence_id` presente en MAP no se convierte en TRACE-native si TRACE lo
  copia, incluso cuando lo proyecta sobre otra localización;
- debe existir exactamente un attack path VALUE base con el mismo triple
  root/trigger/impact, o una única ruta `economic_flow_identity.v2` de MAP que
  coincide con las superficies y posee un binding TRACE autoritativo;
- el binding TRACE debe proceder de `economic_checks[].evidence`, contener
  exactamente un `flow_route_bindings[{flow_id,route_digest}]`, arrays singleton
  `flow_ids[]`/`flow_route_digests[]` con el mismo par, la secuencia completa y
  exacta de `operation_ids[]` y una copia completa `resolved` de la ruta en
  `solguard_map_context.economic_flows[]`;
- el segundo camino añade ese ID exacto a `flow_hints`; ausencia, identidad
  legacy o ambigüedad en ambos caminos evita emitir la request;
- un candidato cuyo origen primario ya es `value_proof` no se consulta de
  nuevo;
- cada request fija `request_id`, `candidate_id`, `canonical_issue_key`, las
  tres superficies, hints de asset/flow, invariantes y obligaciones.

Las trece obligaciones son:

```text
asset_at_risk, candidate_link, causal_surfaces, causal_sequence,
concrete_value_source, concrete_value_sink, file_line_evidence,
same_flow_binding, same_asset_binding, before_after_state,
economic_delta, missing_protection, invariant_relation
```

El request orienta una busqueda. `request_is_evidence` debe permanecer `false`:
el payload no puede corroborarse a si mismo.

### Responses

VALUE consume las requests junto con MAP, TRACE, DISCOVER, ECONOMIC e
invariantes sintetizados, revalida superficies y referencias contra MAP/TRACE y
escribe:

```text
tool-outputs/candidates/value-evidence/proof_responses.json
schema: solguard-value-proof-responses.v1
```

Una respuesta puede tener estado `complete`, `partial`, `unmatched` o
`ambiguous`. La autoridad admitida es exactamente:

```text
evidence_authority=map_trace_reverified
self_corroboration=false
request_is_evidence=false
```

Core solo aplica una respuesta cuando se cumplen todas estas condiciones:

1. schema y version de herramienta validos;
2. request conocido y una sola respuesta por `request_id`;
3. estado `complete` y todas las obligaciones satisfechas;
4. coincidencia exacta de `candidate_id` y `canonical_issue_key`;
5. si `matched_attack_path_id` está en `attack_paths.json`, preservación exacta
   de su ruta y claim económico;
6. si no está en el base, un único `flow_hint` v2 y exactamente una source ref
   directa, un upstream flow ID y un route digest exactos;
7. coincidencia exacta de símbolo, fichero y línea en root, trigger e impact y,
   para un path nuevo, de la ordered sequence autoritativa;
8. proof `complete` y `validation_readiness.validate_consumable=true`;
9. referencias independientes MAP/TRACE, nunca derivadas del request ni
   relabeladas desde MAP;
10. un único `invariant_id` exacto con scope autoritativo al mismo flow ID y
    route digest, además del enlace al candidato canónico.

Además, Core reconstruye de nuevo el índice MAP/TRACE durante el cierre: todos
los refs del proof deben existir con el origin, evidence id, fichero y línea
exactos. Core rechaza respuestas repetidas y refs de identidad de ruta
repetidas, pero actualmente normaliza las refs probatorias de proof/delta en vez
de rechazar una repetición idéntica. El gate estricto de ensamblaje sí exige su
unicidad; trasladar esa misma condición al runtime es una deuda P1. El proof
suelto debe ser idéntico al embebido y el path debe conservar
la ruta y el claim económico VALUE originales; solo pueden cambiar identidad,
readiness, blockers y refs mediante el cierre determinista permitido.

Una respuesta partial, unmatched, ambiguous, autocorroborada o con cualquier
mismatch se registra como rechazada y permanece fuera de VALIDATE. Un error al
ejecutar `candidate_value` tampoco promueve candidatos: las obligaciones quedan
abiertas.

El conjunto de `request_id` y el de respuestas debe coincidir exactamente. Una
respuesta ausente, desconocida o duplicada degrada `candidate_value` aunque el
proceso de VALUE termine con exit code cero.

## Artefactos efectivos y API Rust

La segunda pasada no sobrescribe
`tool-outputs/value/attack_paths.json`. Core materializa una vista aditiva:

```text
tool-outputs/candidates/value-evidence/effective_attack_paths.json
tool-outputs/candidates/value-evidence/proof_closure_diagnostics.json
```

`effective_attack_paths.json` parte del output VALUE original. Reemplaza un
path base revalidado o añade un path v2 encontrado en la búsqueda pre-ranking
solo cuando la respuesta supera el cierre; después conserva orden determinista.
Los diagnosticos usan
`solguard-value-proof-closure-diagnostics.v1` y cuentan requests, responses,
aplicaciones, rechazos y razones de rechazo.

`AnalyzeOutputs` expone estas rutas mediante:

```text
candidate_value_dir
value_proof_requests_json
value_proof_responses_json
effective_attack_paths_json
value_proof_closure_diagnostics_json
```

Son campos aditivos del resultado de core. Backend puede transportarlos, pero
no interpreta ni cambia su autoridad.

## Limite de la mejora

Los tests de contrato de esta frontera deben verificar schemas, límites,
reconstrucción autoritativa, ausencia de autocorroboración, exclusión de
respuestas parciales y rutas v2 candidate-directed fuera del top-50. Incluso
cuando esos tests pasen, no prueban una mejora de recall ni de generalización.

No debe afirmarse que esta ola mejora la deteccion hasta ejecutar de nuevo los
90 labs y los holdouts independientes, congelar los artefactos de producto y
compararlos con la baseline anterior. Hasta entonces, el resultado demostrado
es una frontera de evidencia mas solida, no un incremento medido de bugs
detectados.
