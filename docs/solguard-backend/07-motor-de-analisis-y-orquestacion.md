# 07. Motor de Analisis y Orquestacion

El motor se ejecuta en `solguard-core/src/services/analyzer/runtime.rs`. El
backend entra por la fachada del core y no implementa fases propias.

## Orden contractual

`solguard-core/src/services/pipeline.rs` conserva el orden de
`pipeline.v0.10`:

```text
map
diff
trace
discover
economic
value
invariant
candidates
validate
filter
historical-enrichment
impact
poc-plan
exploit
report
```

El journal rechaza fases fuera de orden. Cada herramienta conserva su receipt
como `tool_phase.json` cuando el core escribe el `phase.json` de orquestacion.
El manifiesto global sigue en `tool-outputs/pipeline.json`.

## Autoridades

- MAP, DIFF, TRACE, DISCOVER, ECONOMIC, VALUE e INVARIANT producen modelos y
  evidencia; no confirman findings.
- CANDIDATES normaliza hipotesis, IDs, superficies y bindings.
- VALIDATE emite `supported`, `refuted` o `inconclusive`.
- FILTER consume solo sus inputs minimos, emite `filter.v0.1` y decide admision
  de forma independiente y fail-closed.
- EXPLOIT verifica el hash congelado de FILTER y emite `exploit.v0.2` solo para
  candidatos admitidos.
- Las fases posteriores no reescriben el veredicto de VALIDATE.

## Modos

### `full`

Recorre las quince fases. `run_exploit` solo puede habilitar ejecucion dentro de
las reglas de admision e aislamiento ya existentes.

### `audit_only`

Recorre MAP hasta FILTER. Las cinco fases posteriores quedan en el journal con
estado `skipped`, duracion cero y razon `skipped_by_audit_only_mode`; no se
materializan sus artefactos. Este comportamiento es necesario para labs ciegos.

## Estados

`completed`, `degraded`, `completed_with_errors`, `fallback` y `skipped` son
diagnosticos de ejecucion, no veredictos de seguridad. Core mantiene los mismos
fallbacks y reglas de preservacion de artefactos que existian antes del
traslado.

## Replays offline

Las operaciones que reutilizan candidate generation y binding se ejecutan con
el binario del core:

```powershell
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- rebuild-candidates "<project-dir>"
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- replay-raw-candidates "<project-dir>" --base "<raw.json>" --out "<out.json>"
cargo run --locked --manifest-path "../solguard-core/Cargo.toml" --bin solguard-core -- replay-candidates "<project-dir>" --raw-candidates "<raw.json>" --invariants "<invariants.json>" --out "<dir>"
```

`replay-raw-candidates` y `replay-candidates` escriben en el destino indicado.
`rebuild-candidates`, en cambio, actualiza los candidatos canonicos y
`tool-outputs/candidates` dentro del proyecto recibido; debe usarse sobre una
copia o con cambios versionados. Ninguno lanza un release completo.

El detalle de cada fase y artefacto se mantiene en
[Pipeline, fases y artefactos de core](../solguard-core/pipeline-y-fases.md).
