# 09. SolGuard Value

`solguard-value` modela activos, flujos, autoridad, estado, secuencia y deltas
economicos desde artefactos semanticos. Sus salidas son hipotesis y evidencia;
no emite veredictos de vulnerabilidad.

## Ejecucion base

Inputs obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`
- `--protocol <protocol_model.json>`
- `--economic <economic_model.json>`
- `--synthesized <synthesized_invariants.json>`
- `--out <output directory>`

Ejemplo:

```powershell
cargo run --release -- `
  --map project/tool-outputs/map/audit_map.json `
  --trace project/tool-outputs/trace `
  --protocol project/tool-outputs/discover/protocol_model.json `
  --economic project/tool-outputs/economic/economic_model.json `
  --synthesized project/tool-outputs/economic/synthesized_invariants.json `
  --out project/tool-outputs/value
```

La ejecucion base escribe:

- `value_model.json` con `solguard-value-model.v1`;
- `attack_paths.json` con `solguard-attack-paths.v1`;
- `payability_candidates.json` con `solguard-payability-candidates.v1`;
- `value_diagnostics.json` con `solguard-value-diagnostics.v1`;
- `summary.txt`.

Un `value_proof` completo sigue siendo evidencia para VALIDATE, no un finding
`supported`.

## Ensamblado exacto de flujos

VALUE construye un índice de autoridad sobre MAP antes de combinar fragmentos.
El índice exige unicidad de flow, operación, value, value link y graph edge. Si
MAP declara `economic_flow_identity.v2`, VALUE:

- recomputa el framing fuerte de MAP y deriva de nuevo amounts y accounting
  targets desde las autoridades MAP, en vez de confiar en arrays autocontenidos;
- conserva el `value_flow_id` upstream en vez de rehashearlo;
- conserva referencias `upstream_flow_id:{id}` y
  `route_digest:{route_digest}`;
- resuelve cada step por `operation_id` y recupera su symbol, fichero, línea,
  value roles y evidencia exacta;
- adjunta ECONOMIC y TRACE solo cuando flow ID y digest coinciden de forma
  autoritativa;
- conserva `operation_ids`, causal edges, value links y asset legs como
  referencias de ruta.

Dos fragmentos con el mismo ID solo se fusionan si no contradicen source, sink,
asset, amount o secuencia. Un conflicto se registra como
`assembly_conflict:*` y deja el flujo no consumible. Un flow legacy se conserva
como diagnóstico con `legacy_flow_identity_unbound`, pero no satisface
same-flow ni un proof completo.

VALUE no rellena huecos con semejanza de nombre, componente o asset. Tampoco
fabrica before/after state, delta o relación de invariante desde el propio path.
Esos campos solo aparecen cuando proceden de valores o attachments exactos.
Cuando una request exige `invariant_relation`, VALUE conserva el
`invariant_id` upstream y solo satisface la obligación si ese ID aparece
exactamente en `request.invariant_ids` y existe una única autoridad sintetizada
cuyo scope liga ese invariant al mismo `{flow_id,route_digest}` del path; una
expresión equivalente, substring, ID concatenado, invariant de otra ruta o un
hash local de relación no sustituyen al invariant solicitado.

La compatibilidad es aditiva: los schemas `solguard-value-*.v1` no cambian de
nombre y los lectores legacy pueden ignorar las nuevas source refs y
capabilities. Los consumidores v2 deben exigir
`economic_flow_identity.v2`, digest y referencias exactas para aceptar una ruta.
La herramienta anuncia soporte para esta semántica mediante
`economic_flow_identity.v2`, `exact_flow_assembly` y
`candidate_directed_pre_ranking_search`.

Una observacion economica MAP `partial` no cambia el ID/digest de una ruta
estructuralmente exacta. VALUE conserva esa identidad, pero anade
`economic_value_unresolved:<id>` a `missing_evidence`; por ello la ruta sigue
siendo trazable y ensamblable, pero no puede cerrar una prueba `complete`.

## Modo candidate-directed

La opcion aditiva `--proof-requests` ejecuta una segunda consulta sobre
candidatos ya construidos por core:

```powershell
cargo run --release -- `
  --map project/tool-outputs/map/audit_map.json `
  --trace project/tool-outputs/trace `
  --protocol project/tool-outputs/discover/protocol_model.json `
  --economic project/tool-outputs/economic/economic_model.json `
  --synthesized project/tool-outputs/economic/synthesized_invariants.json `
  --proof-requests project/tool-outputs/candidates/value_proof_requests.json `
  --out project/tool-outputs/candidates/value-evidence
```

El input usa `solguard-value-proof-requests.v1`. La herramienta exige:

- un maximo de 128 requests;
- IDs de request unicos;
- `candidate_id` y `canonical_issue_key` no vacios;
- `query_only=true`;
- obligaciones no vacias y sin duplicados;
- como maximo 64 `evidence_refs` por request;
- superficies, hints y referencias con el formato tipado del schema.

VALUE no trata el request como prueba. Resuelve las requests contra el conjunto
completo de attack paths generado antes del ranking y del top-50, y solo después
materializa la salida base acotada. Una `flow_hint` v2 permite seleccionar una
única ruta exacta aunque no hubiese sobrevivido el truncado inicial. VALUE
vuelve a comprobar superficies, digest y evidencia contra MAP y TRACE de esa
ejecución; una hint legacy, desconocida o ambigua no abre la búsqueda.

## Respuestas y autoridad

Con `--proof-requests`, la herramienta anade:

```text
proof_responses.json
schema: solguard-value-proof-responses.v1
```

Cada respuesta conserva la identidad exacta del request y puede ser:

- `complete`: una unica ruta coincide, todo el binding fue revalidado, no quedan
  obligaciones y el proof es consumible por VALIDATE;
- `partial`: existe una ruta candidata, pero falta binding u otra obligacion;
- `unmatched`: ninguna ruta coincide exactamente;
- `ambiguous`: mas de una ruta coincide.

Todas las respuestas declaran:

```text
request_is_evidence=false
evidence_authority=map_trace_reverified
self_corroboration=false
```

Cuando la respuesta parte de un attack path base, conserva íntegros su ruta y
claim económico. Cuando procede de la búsqueda pre-ranking, el path debe ligar
el upstream flow ID, route digest y ordered sequence v2 exactos. En ambos casos
solo se recomputa el cierre permitido del proof, y el campo `proof` debe ser
idéntico a `attack_path.value_proof`.

La declaracion de autoridad no basta por si sola. Core vuelve a comprobar
schema, identidades, path base o ruta v2 autoritativa, superficies, obligaciones,
referencias independientes, readiness e invariant binding antes de aplicar una respuesta.
Solo `complete` con `validation_readiness.validate_consumable=true` y binding
exacto puede actualizar la vista efectiva de attack paths. Los estados
`partial`, `unmatched` y `ambiguous` permanecen fuera de VALIDATE.
Un `evidence_id` que exista en MAP conserva origen MAP aunque TRACE lo copie a
otra superficie o línea, y no puede aportar la mitad TRACE-native de
`map_trace_reverified`.

La integracion completa, sus artefactos y los campos de `AnalyzeOutputs` se
documentan en
[DISCOVER v2 y cierre candidate-directed VALUE](../solguard-core/discovery-v2-y-candidate-value.md).

## Limites

- VALUE no consume ground truth ni resultados del evaluator.
- Una request no puede funcionar como evidencia de su propia conclusion.
- Una respuesta partial no se convierte en candidato validable por completar
  texto o IDs desde el request.
- Una búsqueda pre-ranking no relaja el matching: exige una única identidad v2
  compartida por MAP, TRACE, candidato y VALUE.
- VALUE no sustituye el binding de invariantes, las protecciones ni el veredicto
  de VALIDATE.
- Estos contratos no demuestran una mejora de recall. Esa afirmacion requiere
  un rerun medido de los 90 labs y los holdouts independientes.
