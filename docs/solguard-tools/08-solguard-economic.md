# 08. SolGuard Economic

`solguard-economic` modela estado economico y sintetiza invariantes tipadas
desde MAP, TRACE y opcionalmente DISCOVER.

No confirma vulnerabilidades. Produce modelos economicos, invariantes
sintetizadas e hipotesis para candidate generation.

## Inputs

Obligatorios:

- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcional:

- `--protocol <protocol_model.json>`

## CLI actual

```powershell
cargo run --release -- `
  --map project/tool-outputs/map/audit_map.json `
  --trace project/tool-outputs/trace `
  --protocol project/tool-outputs/discover/protocol_model.json `
  --out project/tool-outputs/economic
```

## Salidas

Schemas:

```text
economic_model.v0.1
synthesized_invariants.v0.1
economic_index.v0.1
economic_collection_coverage.v1
economic_route_graph_coverage.v1
economic_route_graph_consumption.v1
economic_route_graph_reasoning.v1
solguard-coverage-manifest.v1
```

Archivos:

- `economic_model.json`
- `economic_model.coverage.json`
- `synthesized_invariants.json`
- `synthesized_invariants.coverage.json`
- `index.json`
- `economic_model.md`
- `summary.txt`

## Cobertura de colecciones y artefactos grandes

Los dos primarios incorporan `economic_collection_coverage.v1`. Cada budget se
identifica de forma unica por `producer + collection`, se ordena de forma
canonica y contabiliza por separado:

- items observados y duplicados semanticos colapsados;
- identidades unicas totales, retenidas y omitidas;
- bytes compactos totales, retenidos y omitidos;
- limite de cardinalidad, limite de bytes y politica de seleccion.

La deduplicacion semantica ocurre antes del presupuesto. Alcanzar exactamente
un limite sin omitir una identidad sigue siendo `complete`; una omision produce
`status=degraded` y una entrada de deuda reconstruible desde los contadores. El
ledger de `synthesized_invariants.json` debe conservar sin cambios todos los
budgets del modelo y anadir el de la sintesis. Una divergencia aritmetica, deuda
oculta, identidad duplicada o budget del modelo ausente falla cerrada.

Los techos son barreras de seguridad generales, no objetivos de calidad:
20.000 relaciones/128 MiB, 4.096 escenarios/128 MiB, 4.096 invariantes
concretas o sintetizadas/256 MiB y 4.096 hipotesis/128 MiB. Los bindings
anidados tienen presupuestos propios y publican la misma contabilidad exacta.

Los sidecars ligan basename, schema, bytes y SHA-256 streaming del primario y
proyectan el ledger exacto junto a un resumen operacional acotado. Core y el
gate de release solo usan esa proyeccion cuando el primario excede su limite de
parseo; por debajo manda el documento completo. Un sidecar ausente, stale,
symlinked, sustituido o incoherente no convierte el artefacto en sano.

El umbral de observabilidad de Core es 96 MiB; el gate independiente de Deploy
mantiene su lectura inline hasta 100 MiB. Ambos rehashean el primario completo y
leen el sidecar con un maximo de 100 MiB antes de aceptar su proyeccion. La
diferencia de umbrales no cambia la autoridad: siempre mandan los mismos bytes,
schema y ledger ligados por el productor.

ECONOMIC parsea y hashea cada input desde un unico descriptor regular bajo un
techo explicito, comprueba de nuevo identidad y path al terminar y confina el
arbol TRACE a su root canonico sin symlinks. Los primarios y sidecars se escriben
streaming, mediante temporales exclusivos e instalacion create-only. Core y el
gate anaden confinamiento fisico del root y rechazo de reparse/path swaps. Un
cambio durante el EOF, destino preexistente o descriptor divergente falla
cerrado; no se recupera con metadata o un resumen stale.

## Razonamiento graph-native

Si MAP incluye `economic_route_graph.v1`, ECONOMIC valida su shape cerrado,
IDs/digests, referencias y cobertura, y calcula hechos may/must directamente
sobre roots y fragments. No convierte elecciones independientes en una lista
cartesiana de rutas. Un must solo existe si todas las alternativas aplicables
lo conservan; una region `over_approximation` no se eleva a transicion concreta
ni proof exacto.

Ambos primarios copian literalmente `economic_route_graph_coverage.v1` y
publican el mismo `economic_route_graph_consumption.v1` full-graph. Ambos
sidecars proyectan coverage y receipt dentro de su summary hash-bound. El
ledger sintetizado debe preservar los dos contratos exactamente igual que los
budgets del modelo; digest drift, deuda escondida u omision local fallan
cerrado.

## Que modela

ECONOMIC clasifica y relaciona:

- assets;
- shares;
- debt;
- collateral;
- rewards;
- fees;
- reserves;
- liabilities;
- oracle prices;
- precision;
- nonces;
- domains;
- timers.

Tambien construye:

- economic relation graph;
- equations;
- concrete economic invariants;
- economic scenarios;
- underprotected hypotheses;
- coverage gaps;
- negative evidence.

## Invariantes sintetizadas

`synthesized_invariants.json` contiene invariantes tipadas compatibles con
`solguard-invariant --synthesized`. INVARIANT las mezcla y deduplica con sus
invariantes nativas antes de emitir `invariants.json`.

## Hipotesis backend-ready

`economic_attack_hypotheses` puede incluir:

- `canonical_issue_key`
- `semantic_rule`
- root/trigger/impact surfaces
- `chain[i]`
- target location
- fingerprint
- missing evidence

En el core pueden aparecer con
`primary_evidence_source = economic_state_discovery`.

## Capabilities

Los tres outputs registran:

- upstream dependencies;
- input capabilities;
- consumed capabilities;
- output capabilities.

Si se pasa `--protocol`, la dependencia de DISCOVER queda explicita.

### Binding exacto de rutas económicas

Cuando MAP/TRACE aportan `economic_flow_identity.v2`, ECONOMIC conserva en cada
transición ligada:

- `flow_id`, `identity_version` y `route_digest`;
- source/sink symbol IDs;
- `operation_ids`, `causal_edge_ids` y `asset_leg_ids`.

Además, cada equation y cada scope de invariante sintetizado que declara una
ruta publica exactamente un
`flow_route_bindings[{flow_id,route_digest}]`. El par, `flows[]` y cualquier
campo singular deben designar la misma ruta singleton. ECONOMIC recomputa el
framing fuerte, `missing_stages`, confidence/evidence y la metadata de
entrypoint/lineage contra la función MAP seleccionada por `symbol_id` antes de
emitir ese binding; una lista parcial, duplicada o contradictoria queda no
autoritativa.

Si una equation declara `flows`, esos IDs son una restricción autoritativa: la
transición solo se liga a una coincidencia exacta. Un ID explícito ausente no
puede recuperarse mediante componente, substring del entrypoint o similitud de
asset. Esto evita atribuir a una ruta hechos económicos observados en otra.

Una transición solo puede representar un binding `concrete` de ruta cuando la
identidad es v2, el digest existe, la ruta MAP está topológicamente `resolved`,
sus observaciones económicas están resueltas y también existen bindings de
estado. `flow_bound` conserva una identidad v2 exacta y `resolved` cuando aún
falta estado u observaciones resueltas; una ruta MAP `partial` permanece como
diagnóstico sin binding autoritativo. La lectura compatible de una ruta antigua queda marcada
`legacy_flow_bound`; sirve para diagnóstico, pero no para cerrar una prueba
exacta. Una identidad que declara v2 pero cuyo ID/digest no es autoconsistente
queda `invalid_flow_identity` y nunca `concrete`. Los outputs anuncian
`economic_flow_identity.v2` y
`exact_economic_route_binding` cuando existe al menos un binding v2.

La ecuación `actual_received_covers_credited_amount` solo es aplicable cuando
la ruta contiene un target acreditado y una transferencia o recepción real.
Una actualización contable aislada no crea por sí sola una observación de
recepción ni un binding `concrete`.

Para valor no nativo, ECONOMIC reabre la ruta y exige una operación de
transferencia resuelta, localizada y un productor de receipt compatible en la
misma identidad exacta. El array `actual_received_amounts` no es autoridad por
sí mismo, `internal_token` representa movimiento del ledger propio y no ingreso
externo, y cualquier `missing_stages` mantiene la transición `flow_bound`.

ECONOMIC únicamente puede usar valor nativo como ancla conservadora cuando hay
una sola función `payable`, el step resuelto pertenece exactamente a esa
función y la observación localizada identifica `msg.value`. Para Vyper se
admite `value` solo en su forma nativa y se rechaza si existe un parámetro local
homónimo. Coincidencias por fichero ajeno, símbolo distinto, nombre genérico o
línea fuera de la función permanecen no autoritativas.

## Frontera operacional actual

Un directorio TRACE se consume manifest-first: `index.json` fija membresia y
orden, y cada primario se verifica por identidad, bytes, SHA-256 y contrato v2
antes de aportar autoridad. `generic_blind` exige signal origins completos y
rechaza `known_pattern`. Un `trace.v0.9` directo solo entra como compatibilidad
standalone degradada: puede aportar diagnostico positivo, nunca completitud,
evidencia negativa o claim terminal.

MAP, DISCOVER y TRACE conservan paths fisicos bounded y los outputs ECONOMIC se
publican create-only despues de validar primario, sidecar y digests. El motor no
convierte deuda upstream en una ecuacion exacta ni una ecuacion en veredicto.

## Limites

- No ejecuta simulaciones economicas.
- No prueba exploitability.
- Una equation o invariant sintetizada es una hipotesis tipada, no un finding.
- VALIDATE sigue siendo quien decide `supported`, `refuted` o `inconclusive`.
