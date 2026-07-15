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

VALUE no trata el request como prueba. Lo usa para localizar un attack path ya
derivado y vuelve a comprobar superficies y evidencia contra los inputs MAP y
TRACE de esa ejecucion.

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

La declaracion de autoridad no basta por si sola. Core vuelve a comprobar
schema, identidades, path base, superficies, obligaciones, referencias
independientes, readiness e invariant binding antes de aplicar una respuesta.
Solo `complete` con `validation_readiness.validate_consumable=true` y binding
exacto puede actualizar la vista efectiva de attack paths. Los estados
`partial`, `unmatched` y `ambiguous` permanecen fuera de VALIDATE.

La integracion completa, sus artefactos y los campos de `AnalyzeOutputs` se
documentan en
[DISCOVER v2 y cierre candidate-directed VALUE](../solguard-core/discovery-v2-y-candidate-value.md).

## Limites

- VALUE no consume ground truth ni resultados del evaluator.
- Una request no puede funcionar como evidencia de su propia conclusion.
- Una respuesta partial no se convierte en candidato validable por completar
  texto o IDs desde el request.
- VALUE no sustituye el binding de invariantes, las protecciones ni el veredicto
  de VALIDATE.
- Estos contratos no demuestran una mejora de recall. Esa afirmacion requiere
  un rerun medido de los 90 labs y los holdouts independientes.
