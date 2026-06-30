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

En el backend pueden aparecer con
`primary_evidence_source = economic_state_discovery`.

## Capabilities

Los tres outputs registran:

- upstream dependencies;
- input capabilities;
- consumed capabilities;
- output capabilities.

Si se pasa `--protocol`, la dependencia de DISCOVER queda explicita.

## Limites

- No ejecuta simulaciones economicas.
- No prueba exploitability.
- Una equation o invariant sintetizada es una hipotesis tipada, no un finding.
- VALIDATE sigue siendo quien decide `supported`, `refuted` o `inconclusive`.
