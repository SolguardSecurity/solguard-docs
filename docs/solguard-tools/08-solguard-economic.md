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
```

Archivos:

- `economic_model.json`
- `synthesized_invariants.json`
- `index.json`
- `economic_model.md`
- `summary.txt`

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

## Limites

- No ejecuta simulaciones economicas.
- No prueba exploitability.
- Una equation o invariant sintetizada es una hipotesis tipada, no un finding.
- VALIDATE sigue siendo quien decide `supported`, `refuted` o `inconclusive`.
