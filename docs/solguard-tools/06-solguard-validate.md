# 06. SolGuard Validate

`solguard-validate` evalua candidatos canonicos contra invariantes tipadas y
evidencia estatica de MAP/TRACE/DISCOVER/ECONOMIC.

Es la primera herramienta que produce veredictos estaticos autoritativos, pero
no confirma explotabilidad ni impacto material por ejecucion.

## Inputs

Obligatorios:

- `--candidates <canonical_candidates.json | validation_candidates.json>`
- `--invariants <invariants.json>`
- `--map <audit_map.json>`
- `--trace <trace.json | trace directory>`

Opcionales:

- `--discover <discover output dir | protocol_model.json>`
- `--economic <economic output dir | economic_model.json>`
- `--evidence-artifact <json>` repetible

## CLI actual

```powershell
cargo run --locked -- `
  --candidates canonical_candidates.json `
  --invariants solguard-invariant-output/invariants.json `
  --map solguard-output/audit_map.json `
  --trace solguard-trace-output `
  --discover solguard-discover-output `
  --economic solguard-economic-output `
  --out solguard-validate-output
```

## Salidas

Schema:

```text
validation.v0.8
```

Archivos:

- `validation_results.json`
- `validation_results.md`
- `summary.txt`

## Veredictos

`result` puede ser:

- `supported`
- `refuted`
- `inconclusive`

`finding_class` puede ser:

- `supported_finding`
- `review_queue`
- `reviewable_lead`
- `non_finding`

Regla operativa:

```text
finding publicable = result supported + finding_class supported_finding
```

## Criterio de `supported`

Requiere evidencia estatica positiva:

- invariante aplicable;
- break condition tipada;
- root cause, trigger e impact en flujo compatible;
- aristas criticas resueltas;
- state transition o delta economico demostrable;
- target externo/callback/proxy resuelto cuando aplica;
- token semantics resuelta si afecta al path economico.

## Criterio de `refuted`

Requiere proteccion positiva, resuelta y en scope exacto:

- guard;
- invalidacion;
- rollback;
- compensacion;
- proteccion antes del impacto.

La ausencia de ruta no basta para refutar.

## Inconclusos

Todo lo que no tiene soporte/refutacion suficiente queda `inconclusive`.
Cada resultado incluye diagnosticos como:

- `missing_interprocedural_edge`
- `unresolved_external_target`
- `unknown_callback_path`
- `missing_state_transition`
- `missing_balance_delta`
- `unknown_token_semantics`
- `unknown_proxy_implementation`
- `protection_order_unresolved`
- `impact_not_reached`
- `scope_not_resolved`
- `unresolved_preconditions`
- `missing_multi_call_sequence`
- `missing_state_before_after`
- `invariant_break_not_demonstrated`

## Dedupe/ranking

VALIDATE puede deduplicar supported findings exact-scope. Un duplicado soportado
puede degradarse a `review_queue` con razon `deduplicated_supported_finding` para
no publicar el mismo finding varias veces.

## Limites

- No genera PoCs.
- No ejecuta tests ni symbolic execution.
- `supported` significa soporte estatico, no explotabilidad confirmada.
